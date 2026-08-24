import type { Db } from "mongodb";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import { KOLKATA_TZ } from "@/clinic/core/datetime";
import {
  enqueueClinicNotification,
  type NotificationMedia,
} from "@/services/whatsapp/notification.service";
import { generateBillPdf, type Bill as PdfBill } from "@/lib/bill-pdf";
import type { OrganizationRecord } from "@/services/customer/customer-context.service";
import type { BillDoc } from "@/clinic/modules/billing/billing.schema";
import { logger } from "@/lib/logger";

interface QueueParams {
  clinicId: string;
  bill: BillDoc;
  /** Patient document as stored in Mongo (loose shape by design). */
  patient: Record<string, unknown> | null;
}

function patientString(patient: Record<string, unknown> | null, key: string): string | null {
  const value = patient?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function inr(value: number): string {
  const n = Number.isFinite(value) ? value : 0;
  return `₹${n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function shortDate(value: Date | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date && !Number.isNaN(value.getTime()) ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: KOLKATA_TZ,
  }).format(d);
}

/**
 * Sends the patient their bill on WhatsApp when the bill was created with
 * `sendMethod: "whatsapp"`. Delivers the invoice PDF through the clinic's own
 * WhatsApp connection (falls back to the central one), with a summary caption.
 *
 * NEVER throws — a failed notification must not break bill creation.
 */
export async function queueBillWhatsAppNotification(
  db: Db,
  params: QueueParams
): Promise<{ queued: boolean }> {
  try {
    const { clinicId, bill, patient } = params;
    if (bill.sendMethod !== "whatsapp") return { queued: false };

    // Same preference order as prescriptions/appointments notifications.
    const phone = patientString(patient, "whatsapp") ?? patientString(patient, "mobile");
    if (!phone) {
      logger.warn("bill whatsapp skipped: patient has no phone number", {
        clinicId,
        billId: bill.billId,
      });
      return { queued: false };
    }

    const [clinic, settings, doctor] = await Promise.all([
      db.collection(CLINIC_COLLECTIONS.clinics).findOne({ clinicId, status: { $ne: "deleted" } }),
      db.collection(CLINIC_COLLECTIONS.settings).findOne({ clinicId }),
      bill.doctorId
        ? db
            .collection(CLINIC_COLLECTIONS.doctors)
            .findOne({ clinicId, doctorId: bill.doctorId, status: { $ne: "deleted" } })
        : Promise.resolve(null),
    ]);
    const clinicName = clinic?.name || "My Clinic";

    const firstName =
      (patientString(patient, "fullName") ?? "there").split(" ")[0] || "there";
    const lines = [
      `Hi ${firstName}, here is your invoice ${bill.billNumber} from ${clinicName}.`,
      "",
      `Invoice Date: ${shortDate(bill.invoiceDate ?? bill.createdAt)}`,
      `Invoice Total: ${inr(bill.total)}`,
      `Amount Paid: ${inr(bill.amountPaid ?? 0)}`,
      `Balance Due: ${inr(bill.balanceDue ?? bill.total)}`,
    ];
    if (bill.dueDate && bill.paymentStatus !== "paid") {
      lines.push(`Due Date: ${shortDate(bill.dueDate)}`);
    }
    if (settings?.upiId) {
      lines.push("", `Pay instantly via UPI: ${settings.upiId}`);
    }
    lines.push("", "Thank you for choosing us!");
    const message = lines.join("\n");

    // Attach the actual invoice PDF when it can be generated; otherwise the
    // summary text alone is still useful.
    let media: NotificationMedia | undefined;
    try {
      const pdfCompany: OrganizationRecord = {
        id: clinicId,
        name: clinicName,
        whatsappNumber: null,
        settings: {
          open: clinic?.settings?.workingHours?.open ?? "09:00",
          close: clinic?.settings?.workingHours?.close ?? "17:00",
          slotMinutes: clinic?.settings?.slotMinutes ?? 30,
        },
        phone: clinic?.phone ?? null,
        email: clinic?.email ?? null,
        address: clinic?.address ?? null,
        website: clinic?.website ?? null,
        description: clinic?.description ?? null,
      };
      const pdfData: PdfBill = {
        billNumber: bill.billNumber,
        patientId: bill.patientId,
        patientName: patientString(patient, "fullName") ?? null,
        patientAddress: patientString(patient, "address") ?? null,
        doctorName: doctor?.name ?? null,
        date: bill.createdAt.toISOString(),
        invoiceDate: (bill.invoiceDate ?? bill.createdAt).toISOString(),
        dueDate: bill.dueDate ? bill.dueDate.toISOString() : null,
        paidAt: bill.paidAt ? bill.paidAt.toISOString() : null,
        reference: bill.reference,
        gstin: settings?.gstin ?? clinic?.profile?.gstNumber ?? null,
        udyam: settings?.udyam ?? clinic?.profile?.taxBusinessId ?? null,
        terms: settings?.termsAndConditions ?? null,
        upiId: settings?.upiId ?? null,
        qrCodeUrl: settings?.qrCodeUrl ?? null,
        items: bill.items.map((item) => ({
          name: item.description,
          qty: item.quantity,
          price: item.unitPrice,
          amount: item.lineTotal,
          discount: item.discount,
          taxPercent: item.taxPercent,
        })),
        subtotal: bill.subtotal,
        discount: bill.discount,
        taxRate: bill.taxPercent,
        tax: bill.taxAmount,
        total: bill.total,
        amountPaid: bill.amountPaid ?? 0,
        balanceDue: bill.balanceDue ?? bill.total ?? 0,
        paymentMethod: bill.paymentType ?? bill.paymentMethod,
        paymentStatus: bill.paymentStatus ?? (bill.status === "paid" ? "paid" : "unpaid"),
        status: bill.status,
        notes: bill.notes,
        currency: clinic?.settings?.currency ?? "₹",
      };

      const pdf = await generateBillPdf(pdfData, pdfCompany);
      media = {
        filename: `invoice-${bill.billNumber.replace(/[^A-Za-z0-9-]+/g, "_")}.pdf`,
        mimetype: "application/pdf",
        data: pdf.toString("base64"),
      };
    } catch (pdfErr) {
      logger.warn("bill whatsapp: invoice PDF unavailable, sending text only", {
        clinicId,
        billId: bill.billId,
        err: pdfErr instanceof Error ? pdfErr.message : String(pdfErr),
      });
    }

    const result = await enqueueClinicNotification(
      db,
      phone,
      message,
      "bill_notification",
      media,
      clinicId
    );
    if (!result.queued) {
      logger.warn("bill whatsapp not queued (unusable phone number)", {
        clinicId,
        billId: bill.billId,
      });
    }
    return result;
  } catch (err) {
    // The save already succeeded — a failed notification must not break it.
    logger.error("bill whatsapp notification failed", {
      clinicId: params.clinicId,
      billId: params.bill.billId,
      err: err instanceof Error ? err.message : String(err),
    });
    return { queued: false };
  }
}
