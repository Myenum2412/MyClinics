import { prescriptionHtml } from "@/lib/print-documents";
import type { Prescription } from "@/components/prescriptions-table";

export function printPrescription(p: Prescription) {
  const html = prescriptionHtml(p);

  const w = window.open("", "_blank", "width=720,height=900");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}
