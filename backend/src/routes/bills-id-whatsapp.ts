import type { FastifyInstance } from "fastify";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { requireBilling } from "@/plugins/auth";
import { DB_COLLECTIONS } from "@/lib/constants";
import { mapBill } from "@/routes/bills";
import { ensureDefaultOrganization } from "@/services/customer/customer-context.service";
import { findBillVisitData } from "@/lib/bill-visit";
import { generateBillPdf } from "@/lib/bill-pdf";
import { enqueueClinicNotification } from "@/services/whatsapp/notification.service";
import { handleError } from "@/lib/http";

export function registerBillWhatsAppRoutes(app: FastifyInstance): void {
  app.post("/api/bills/:id/send-whatsapp", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      if (!ObjectId.isValid(id)) {
        return reply.code(400).send({ error: "Invalid bill id" });
      }

      if (!(await requireBilling(request, reply))) return;

      const db = await getDb();
      const doc = await db
        .collection(DB_COLLECTIONS.bills)
        .findOne({ _id: new ObjectId(id) });
      if (!doc) {
        return reply.code(404).send({ error: "Bill not found" });
      }

      const bill = mapBill(doc);
      const company = await ensureDefaultOrganization(db);
      const visit = await findBillVisitData(db, bill);

      const phone =
        bill.patientPhone?.trim() || visit.patient?.mobile?.trim() || "";
      if (!phone) {
        return reply
          .code(400)
          .send({ error: "No patient phone number available to send the bill." });
      }

      const pdf = await generateBillPdf(bill, company, visit);
      const safeName = (bill.billNumber || "invoice").replace(
        /[^a-zA-Z0-9-_]+/g,
        "-"
      );

      const queued = await enqueueClinicNotification(
        db,
        phone,
        `Hi ${bill.patientName}, here is your invoice ${bill.billNumber} from ${company.name}. ` +
          `Total: Rs. ${(bill.total ?? 0).toLocaleString("en-IN")}. Thank you for visiting us!`,
        "bill_pdf",
        {
          filename: `${safeName}.pdf`,
          mimetype: "application/pdf",
          data: pdf.toString("base64"),
        }
      );

      if (!queued.queued) {
        return reply
          .code(400)
          .send({ error: "Could not prepare the phone number for WhatsApp." });
      }

      return reply.send({ queued: true, remoteId: queued.remoteId });
    } catch (error) {
      handleError(reply, error, "Send bill via WhatsApp");
    }
  });
}
