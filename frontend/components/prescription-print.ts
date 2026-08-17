import { prescriptionHtml } from "@/lib/print-documents";
import { fetchClinicName } from "@/lib/clinic-name-client";
import type { Prescription } from "@/components/prescriptions-table";

export async function printPrescription(p: Prescription) {
  const html = prescriptionHtml(p, await fetchClinicName());

  const w = window.open("", "_blank", "width=720,height=900");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}
