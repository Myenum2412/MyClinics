import type { Bill, BillVisit } from "@/components/billing-table";
import { billingHtml } from "@/lib/print-documents";
import { DEFAULT_CLINIC_NAME, fetchClinicName } from "@/lib/clinic-name-client";

async function fetchVisitData(id: string): Promise<BillVisit | null> {
  try {
    const res = await fetch(`/api/bills/${id}/print-data`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      clinic?: BillVisit["clinic"];
      appointment?: BillVisit["appointment"];
      prescriptions?: BillVisit["prescriptions"];
      doctors?: BillVisit["doctors"];
      patient?: BillVisit["patient"];
    };
    return {
      clinic: data.clinic ?? null,
      appointment: data.appointment ?? null,
      prescriptions: data.prescriptions ?? [],
      doctors: data.doctors ?? [],
      patient: data.patient ?? null,
    };
  } catch {
    return null;
  }
}

export async function printBill(
  bill: Bill,
  clinicName: string = DEFAULT_CLINIC_NAME
) {
  let visit = bill.visit ?? null;

  if (bill.id && !visit) {
    visit = await fetchVisitData(bill.id);
  }

  const resolvedName =
    visit?.clinic?.name?.trim() || (clinicName === DEFAULT_CLINIC_NAME ? await fetchClinicName() : clinicName);

  const logoUrl = new URL("/logo.png", window.location.origin).href;

  const html = billingHtml(bill, resolvedName, visit, { autoPrint: true, logoUrl });

  const w = window.open("", "_blank", "width=800,height=900");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}
