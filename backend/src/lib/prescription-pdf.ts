import PDFDocument from "pdfkit";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { KOLKATA_TZ } from "@/clinic/core/datetime";
import type { OrganizationRecord } from "@/services/customer/customer-context.service";
import type { MedicineEntry } from "@/clinic/modules/prescriptions/prescriptions.schema";

const LOGO_CANDIDATES = [
  fileURLToPath(new URL("../assets/logo.png", import.meta.url)),
  fileURLToPath(new URL("./assets/logo.png", import.meta.url)),
];

const FONT_CANDIDATES = {
  regular: [
    fileURLToPath(new URL("../assets/fonts/DejaVuSans.ttf", import.meta.url)),
    fileURLToPath(new URL("./assets/fonts/DejaVuSans.ttf", import.meta.url)),
  ],
  bold: [
    fileURLToPath(new URL("../assets/fonts/DejaVuSans-Bold.ttf", import.meta.url)),
    fileURLToPath(new URL("./assets/fonts/DejaVuSans-Bold.ttf", import.meta.url)),
  ],
};

function loadFirst(paths: string[]): Buffer | null {
  for (const candidate of paths) {
    try {
      return readFileSync(candidate);
    } catch {
      // try next candidate
    }
  }
  return null;
}

export interface PrescriptionPdfData {
  prescriptionId: string;
  visitDate: string | null;
  diagnosis: string | null;
  notes: string | null;
  medicines: MedicineEntry[];
  patientName: string | null;
  patientPhone: string | null;
  patientGender: string | null;
  patientAge: string | number | null;
  patientAddress: string | null;
  doctorName: string | null;
  doctorSpecialization: string | null;
  doctorQualification: string | null;
  doctorRegistrationNo: string | null;
  generatedBy: string | null;
  createdAt: string | null;
}

const MARGIN = 40;
const CONTENT_WIDTH = 595.28 - MARGIN * 2;
const CONTENT_BOTTOM = 750;
const OUTLINE_INSET = 24;

const C = {
  navy: "#1E3A8A",
  blue: "#2563EB",
  teal: "#0E7490",
  border: "#B7C6DE",
  rule: "#D7E0F0",
  ink: "#111827",
  muted: "#4B5563",
  faint: "#6B7280",
  band: "#F4F7FD",
  rxBand: "#EFF6FF",
  white: "#FFFFFF",
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: KOLKATA_TZ,
  }).format(parsed);
}

function cellLines(doc: PDFKit.PDFDocument, text: string, width: number): number {
  const w = Math.max(width, 10);
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 1;
  let lines = 1;
  let current = "";
  for (const word of words) {
    const candidate = current ? current + " " + word : word;
    if (doc.widthOfString(candidate) > w) {
      lines += 1;
      current = word;
    } else {
      current = candidate;
    }
  }
  return lines;
}

function box(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number) {
  doc.rect(x, y, w, h).lineWidth(0.75).strokeColor(C.border).stroke();
}

function drawPageOutline(doc: PDFKit.PDFDocument) {
  doc
    .rect(OUTLINE_INSET, OUTLINE_INSET, 595.28 - OUTLINE_INSET * 2, 841.89 - OUTLINE_INSET * 2)
    .lineWidth(0.75)
    .strokeColor(C.rule)
    .stroke();
}

function decoratePage(
  doc: PDFKit.PDFDocument,
  pageNumber: number,
  company: OrganizationRecord,
  rx: PrescriptionPdfData
) {
  const companyName = company.name || "My Clinic";
  drawPageOutline(doc);

  if (pageNumber > 1) {
    doc.font("bold").fontSize(10).fillColor(C.navy).text(companyName, MARGIN, 20);
    doc.font("regular").fontSize(7.5).fillColor(C.faint).text(
      `Prescription ${rx.prescriptionId.slice(0, 8).toUpperCase()}  ·  ${formatDate(rx.visitDate)}`,
      MARGIN, 33
    );
    doc.font("bold").fontSize(12).fillColor(C.navy).text("PRESCRIPTION", MARGIN, 22, {
      width: CONTENT_WIDTH,
      align: "right",
    });
    doc.moveTo(MARGIN, 48).lineTo(MARGIN + CONTENT_WIDTH, 48).lineWidth(0.75).strokeColor(C.navy).stroke();
    return;
  }

  const logo = loadFirst(LOGO_CANDIDATES);
  let textX = MARGIN;
  if (logo) {
    try {
      doc.image(logo, MARGIN, 52, { width: 46, height: 46 });
      textX = MARGIN + 58;
    } catch {
      textX = MARGIN;
    }
  }

  doc.font("bold").fontSize(16).fillColor(C.navy).text(companyName.toUpperCase(), textX, 54);
  const contactLine = [company.phone, company.email].filter(Boolean).join("  ·  ");
  if (contactLine) {
    doc.font("regular").fontSize(8).fillColor(C.muted).text(contactLine, textX, 78);
  }
  if (company.address) {
    doc.font("regular").fontSize(8).fillColor(C.muted).text(String(company.address), textX, 90, {
      width: 300,
    });
  }

  doc.font("bold").fontSize(22).fillColor(C.navy).text("PRESCRIPTION", MARGIN, 54, {
    width: CONTENT_WIDTH,
    align: "right",
  });
  doc.font("bold").fontSize(16).fillColor(C.teal).text("Rx", MARGIN, 80, {
    width: CONTENT_WIDTH,
    align: "right",
  });

  doc.moveTo(MARGIN, 118).lineTo(MARGIN + CONTENT_WIDTH, 118).lineWidth(0.75).strokeColor(C.border).stroke();
}

function drawPatientDoctor(
  doc: PDFKit.PDFDocument,
  y: number,
  rx: PrescriptionPdfData
): number {
  const colW = (CONTENT_WIDTH - 1) / 2;
  const leftLines = 5;
  const rightLines = 5;
  const h = Math.max(leftLines, rightLines) * 20 + 34;
  const top = y;

  box(doc, MARGIN, top, CONTENT_WIDTH, h);
  doc.moveTo(MARGIN + colW, top + 1).lineTo(MARGIN + colW, top + h - 1)
    .lineWidth(0.75).strokeColor(C.border).stroke();

  // Left — patient
  doc.font("bold").fontSize(7.5).fillColor(C.navy).text("PATIENT", MARGIN + 16, top + 10);
  doc.font("bold").fontSize(12).fillColor(C.ink).text(rx.patientName || "—", MARGIN + 16, top + 26, {
    width: colW - 32,
  });
  const meta: string[] = [];
  if (rx.patientPhone) meta.push(`Phone: ${rx.patientPhone}`);
  const demo = [rx.patientAge ? `Age: ${rx.patientAge}` : null, rx.patientGender ? String(rx.patientGender) : null].filter(Boolean).join(" / ");
  if (demo) meta.push(demo);
  if (rx.patientAddress) meta.push(String(rx.patientAddress));
  meta.push(`Visit: ${formatDate(rx.visitDate)}`);
  meta.forEach((line, i) => {
    doc.font("regular").fontSize(8.5).fillColor(C.muted).text(line, MARGIN + 16, top + 46 + i * 15, {
      width: colW - 32,
    });
  });

  // Right — doctor
  doc.font("bold").fontSize(7.5).fillColor(C.navy).text("PRESCRIBED BY", MARGIN + colW + 16, top + 10);
  doc.font("bold").fontSize(12).fillColor(C.ink).text(rx.doctorName ? `Dr. ${rx.doctorName}` : "—", MARGIN + colW + 16, top + 26, {
    width: colW - 32,
  });
  const docMeta: string[] = [];
  if (rx.doctorSpecialization) docMeta.push(String(rx.doctorSpecialization));
  if (rx.doctorQualification) docMeta.push(String(rx.doctorQualification));
  if (rx.doctorRegistrationNo) docMeta.push(`Reg: ${rx.doctorRegistrationNo}`);
  docMeta.forEach((line, i) => {
    doc.font("regular").fontSize(8.5).fillColor(C.muted).text(line, MARGIN + colW + 16, top + 46 + i * 15, {
      width: colW - 32,
    });
  });

  return top + h;
}

function drawDiagnosis(
  doc: PDFKit.PDFDocument,
  y: number,
  rx: PrescriptionPdfData
): number {
  const text = (rx.diagnosis || "").trim();
  if (!text) return y;
  const lines = Math.max(1, cellLines(doc, text, CONTENT_WIDTH - 32));
  const h = 30 + lines * 12 + 12;
  box(doc, MARGIN, y, CONTENT_WIDTH, h);
  doc.font("bold").fontSize(7.5).fillColor(C.navy).text("DIAGNOSIS", MARGIN + 16, y + 10);
  doc.font("regular").fontSize(9).fillColor(C.ink).text(text, MARGIN + 16, y + 26, {
    width: CONTENT_WIDTH - 32,
  });
  return y + h;
}

function drawMedicines(
  doc: PDFKit.PDFDocument,
  rx: PrescriptionPdfData,
  startY: number,
  ensureSpace: (n: number) => void
): number {
  const headers = ["#", "MEDICINE", "DOSAGE", "FREQUENCY", "DURATION", "INSTRUCTIONS"];
  const fracs = [0.05, 0.28, 0.14, 0.15, 0.12, 0.26];
  const colWidths = fracs.map((f) => Math.round(f * CONTENT_WIDTH));
  colWidths[colWidths.length - 1] += CONTENT_WIDTH - colWidths.reduce((a, b) => a + b, 0);
  const headerH = 26;
  let y = startY;

  const rows = (Array.isArray(rx.medicines) ? rx.medicines : []).map((m, idx) => ({
    cells: [
      String(idx + 1),
      m.name || "—",
      m.dosage || "—",
      m.frequency || "—",
      m.duration || "—",
      m.instructions || "—",
    ],
  }));

  const drawHeader = () => {
    doc.rect(MARGIN, y, CONTENT_WIDTH, headerH).fill(C.navy);
    let x = MARGIN;
    headers.forEach((h, i) => {
      doc.font("bold").fontSize(6.5).fillColor(C.white);
      doc.text(h, x + 5, y + 9.5, { width: colWidths[i] - 10, align: i === 0 ? "center" : "left" });
      x += colWidths[i];
    });
    y += headerH;
  };

  const rowHeight = (row: { cells: string[] }) => {
    doc.font("regular").fontSize(8.5);
    const lines = row.cells.map((cell, i) =>
      Math.max(1, cellLines(doc, cell, colWidths[i] - 10))
    );
    return Math.max(28, Math.max(...lines) * 11 + 12);
  };

  drawHeader();
  if (rows.length === 0) {
    const rh = 30;
    if (y + rh > CONTENT_BOTTOM) {
      ensureSpace(headerH + rh + 6);
      y += 6;
      drawHeader();
    }
    doc.font("regular").fontSize(8.5).fillColor(C.muted).text("No medicines prescribed.", MARGIN + 12, y + 9);
    y += rh;
  } else {
    rows.forEach((row, rIdx) => {
      const rh = rowHeight(row);
      if (y + rh > CONTENT_BOTTOM) {
        ensureSpace(headerH + rh + 6);
        y += 6;
        drawHeader();
      }
      if (rIdx % 2 === 1) {
        doc.rect(MARGIN, y, CONTENT_WIDTH, rh).fill(C.band);
      }
      doc.moveTo(MARGIN, y).lineTo(MARGIN + CONTENT_WIDTH, y).lineWidth(0.5).strokeColor(C.rule).stroke();
      let x = MARGIN;
      row.cells.forEach((cell, i) => {
        doc.font(i === 1 ? "bold" : "regular").fontSize(8.5).fillColor(C.ink);
        doc.text(cell, x + 5, y + 8, { width: colWidths[i] - 10, align: i === 0 ? "center" : "left" });
        x += colWidths[i];
      });
      y += rh;
    });
  }
  doc.moveTo(MARGIN, y).lineTo(MARGIN + CONTENT_WIDTH, y).lineWidth(1).strokeColor(C.navy).stroke();

  return y;
}

function drawNotes(
  doc: PDFKit.PDFDocument,
  y: number,
  rx: PrescriptionPdfData,
  ensureSpace: (n: number) => void
): number {
  const text = (rx.notes || "").trim();
  if (!text) return y;
  const lines = Math.max(1, cellLines(doc, text, CONTENT_WIDTH - 32));
  const h = 30 + lines * 12 + 12;
  ensureSpace(h + 8);
  box(doc, MARGIN, y, CONTENT_WIDTH, h);
  doc.font("bold").fontSize(7.5).fillColor(C.navy).text("ADVICE / NOTES", MARGIN + 16, y + 10);
  doc.font("regular").fontSize(9).fillColor(C.ink).text(text, MARGIN + 16, y + 26, {
    width: CONTENT_WIDTH - 32,
  });
  return y + h;
}

export async function generatePrescriptionPdf(
  rx: PrescriptionPdfData,
  company: OrganizationRecord
): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: MARGIN, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const regularFont = loadFirst(FONT_CANDIDATES.regular);
  const boldFont = loadFirst(FONT_CANDIDATES.bold);
  if (regularFont) doc.registerFont("regular", regularFont);
  if (boldFont) doc.registerFont("bold", boldFont);
  if (!regularFont) doc.font("Helvetica");
  if (!boldFont) doc.font("Helvetica-Bold");

  let pageNo = 1;
  let y = 0;

  function ensureSpace(needed: number) {
    if (y + needed <= CONTENT_BOTTOM) return;
    doc.addPage();
    pageNo += 1;
    decoratePage(doc, pageNo, company, rx);
    y = 68;
  }

  decoratePage(doc, 1, company, rx);

  y = 136;
  y = drawPatientDoctor(doc, y, rx) + 16;
  const diagEnd = drawDiagnosis(doc, y, rx);
  if (diagEnd !== y) y = diagEnd + 16;

  // Medicines label
  ensureSpace(60);
  doc.font("bold").fontSize(7.5).fillColor(C.navy).text("MEDICINES (Rx)", MARGIN, y);
  doc.font("regular").fontSize(7.5).fillColor(C.faint).text(
    `Prescription ID: ${rx.prescriptionId.slice(0, 8).toUpperCase()}`,
    MARGIN, y,
    { width: CONTENT_WIDTH, align: "right" }
  );
  y += 16;
  y = drawMedicines(doc, rx, y, ensureSpace) + 16;
  const notesEnd = drawNotes(doc, y, rx, ensureSpace);
  if (notesEnd !== y) y = notesEnd + 16;

  // Signature block
  ensureSpace(90);
  const sigY = y + 10;
  doc.font("regular").fontSize(8).fillColor(C.muted).text(
    rx.generatedBy ? `Generated by ${rx.generatedBy}` : "Computer-generated prescription",
    MARGIN, sigY,
    { width: 260 }
  );
  doc.font("regular").fontSize(8).fillColor(C.muted).text(
    "Doctor's signature & seal",
    MARGIN, sigY,
    { width: CONTENT_WIDTH, align: "right" }
  );
  doc.moveTo(MARGIN + CONTENT_WIDTH - 190, sigY + 30)
    .lineTo(MARGIN + CONTENT_WIDTH, sigY + 30)
    .lineWidth(0.75).strokeColor(C.faint).stroke();

  const range = doc.bufferedPageRange();
  const totalPages = range.count;
  for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(i);
    doc.moveTo(MARGIN, 780).lineTo(MARGIN + CONTENT_WIDTH, 780)
      .lineWidth(0.75).strokeColor(C.rule).stroke();
    doc.font("regular").fontSize(7.5).fillColor(C.faint).text(
      "This is a computer-generated prescription. Follow your doctor's advice; consult in case of side effects.",
      MARGIN,
      788,
      { width: CONTENT_WIDTH, align: "center", lineBreak: false }
    );
    doc.font("regular").fontSize(7).fillColor(C.faint).text(
      `Page ${i + 1} of ${totalPages}`,
      MARGIN,
      789,
      { width: CONTENT_WIDTH, align: "right", lineBreak: false }
    );
  }

  doc.end();
  return done;
}
