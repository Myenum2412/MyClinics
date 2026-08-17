import PDFDocument from "pdfkit";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { OrganizationRecord } from "@/services/customer/customer-context.service";

const LOGO_CANDIDATES = [
  fileURLToPath(new URL("../assets/logo.png", import.meta.url)),
  fileURLToPath(new URL("./assets/logo.png", import.meta.url)),
];

function loadLogo(): Buffer | null {
  for (const candidate of LOGO_CANDIDATES) {
    try {
      return readFileSync(candidate);
    } catch {
      // try next candidate
    }
  }
  return null;
}

interface BillItem {
  name?: string;
  qty?: number;
  price?: number;
  amount?: number;
}

export interface Bill {
  billNumber?: string | null;
  patientName?: string | null;
  patientPhone?: string | null;
  doctorId?: string | null;
  doctorName?: string | null;
  date?: string | null;
  items?: BillItem[];
  subtotal?: number;
  discount?: number;
  taxRate?: number;
  tax?: number;
  total?: number;
  paymentMethod?: string | null;
  status?: string | null;
  notes?: string | null;
}

export interface BillAppointment {
  id?: string | null;
  fullName?: string | null;
  mobile?: string | null;
  age?: number | null;
  gender?: string | null;
  email?: string | null;
  doctorName?: string | null;
  department?: string | null;
  date?: string | null;
  time?: string | null;
  type?: string | null;
  status?: string | null;
  reason?: string | null;
  notes?: string | null;
  counter?: number | null;
  bookingSource?: string | null;
}

export interface BillMedicine {
  name?: string | null;
  frequency?: string | null;
  duration?: string | null;
  beforeAfterFood?: string | null;
  specialInstructions?: string | null;
}

export interface BillPrescription {
  id?: string | null;
  patientName?: string | null;
  doctorName?: string | null;
  visitDate?: string | null;
  diagnosis?: string | null;
  medicines?: BillMedicine[];
  symptoms?: string | null;
  testsRecommended?: string | null;
  followUpDate?: string | null;
}

export interface BillPatient {
  id?: string | null;
  fullName?: string | null;
  age?: number | null;
  gender?: string | null;
  email?: string | null;
  mobile?: string | null;
}

export interface BillVisit {
  appointment?: BillAppointment | null;
  prescriptions?: BillPrescription[];
  doctors?: { id?: string | null; name?: string | null }[];
  patient?: BillPatient | null;
}

const MARGIN = 24;
const BORDER_INSET = 10;

// Premium palette — navy, royal blue, white and subtle teal/green
const C = {
  navy: "#0B2447",
  royal: "#1D4ED8",
  teal: "#0D9488",
  green: "#16A34A",
  ink: "#101828",
  muted: "#4B5563",
  faint: "#6B7280",
  grid: "#C9D4E4",
  hairline: "#DFE6F0",
  band: "#EEF3FA",
  white: "#FFFFFF",
};

const STATUS_STYLES: Record<string, { fill: string; text: string }> = {
  paid: { fill: "#16A34A", text: "#FFFFFF" },
  pending: { fill: "#F59E0B", text: "#FFFFFF" },
  cancelled: { fill: "#EF4444", text: "#FFFFFF" },
};

function inr(value: number) {
  const n = Number.isFinite(value) ? value : 0;
  return "Rs. " + n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy",
  "Eighty", "Ninety",
];

function numberToWords(num: number): string {
  if (num === 0) return "";
  if (num < 20) return ONES[num];
  if (num < 100)
    return TENS[Math.floor(num / 10)] + (num % 10 ? " " + ONES[num % 10] : "");
  if (num < 1000)
    return (
      ONES[Math.floor(num / 100)] +
      " Hundred" +
      (num % 100 ? " " + numberToWords(num % 100) : "")
    );
  if (num < 100000)
    return (
      numberToWords(Math.floor(num / 1000)) +
      " Thousand" +
      (num % 1000 ? " " + numberToWords(num % 1000) : "")
    );
  if (num < 10000000)
    return (
      numberToWords(Math.floor(num / 100000)) +
      " Lakh" +
      (num % 100000 ? " " + numberToWords(num % 100000) : "")
    );
  return (
    numberToWords(Math.floor(num / 10000000)) +
    " Crore" +
    (num % 10000000 ? " " + numberToWords(num % 10000000) : "")
  );
}

function amountInWords(value: number): string {
  const n = Math.round((Number.isFinite(value) ? value : 0) * 100);
  const rupees = Math.floor(n / 100);
  const paise = n % 100;
  let words = rupees ? numberToWords(rupees) + " Rupees" : "";
  if (paise) words += (words ? " and " : "") + numberToWords(paise) + " Paise";
  return (words || "Zero") + " Only";
}

/** Bold navy section label with a royal blue rule running to the content edge. */
function sectionHeading(doc: PDFKit.PDFDocument, text: string, x: number, y: number, lineTo: number) {
  doc.font("Helvetica-Bold").fontSize(9).fillColor(C.navy).text(text.toUpperCase(), x, y);
  const labelEnd = x + doc.widthOfString(text.toUpperCase());
  doc.moveTo(labelEnd + 12, y + 10)
    .lineTo(lineTo, y + 10)
    .lineWidth(1)
    .strokeColor(C.royal)
    .stroke();
  return y + 22;
}

/** Uppercase royal blue micro-label above a value (e.g. DATE / DOCTOR / PAYMENT). */
function metaLabel(doc: PDFKit.PDFDocument, label: string, x: number, y: number) {
  doc.font("Helvetica-Bold").fontSize(7).fillColor(C.royal).text(label.toUpperCase(), x, y);
}

/** Rounded information panel — soft blue-gray surface, thin border, navy title. */
function panelShell(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string
) {
  doc.roundedRect(x, y, w, h, 6).fill(C.band).lineWidth(0.75).strokeColor(C.hairline).stroke();
  doc.font("Helvetica-Bold").fontSize(8).fillColor(C.navy).text(label, x + 12, y + 11);
  doc.moveTo(x + 12, y + 22).lineTo(x + 36, y + 22).lineWidth(1.5).strokeColor(C.royal).stroke();
}

/** Number of wrapped lines a cell needs at the current font for the given width. */
function cellLines(doc: PDFKit.PDFDocument, text: string, width: number): number {
  const w = Math.max(width, 10);
  const words = text.split(/\s+/).filter(Boolean);
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

/**
 * Table with a navy header and thin light grid. Row heights grow with the
 * tallest wrapped cell so content never overflows the row or the page.
 */
function drawSimpleTable(
  doc: PDFKit.PDFDocument,
  headers: string[],
  rows: string[][],
  colWidths: number[],
  startX: number,
  startY: number,
  lineHeight: number,
  rightAlignCols: number[] = []
): number {
  const totalW = colWidths.reduce((s, w) => s + w, 0);
  const headerBottom = startY + lineHeight + 8;

  // Header — navy fill, white bold text
  doc.rect(startX, startY, totalW, lineHeight + 8).fill(C.navy);
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.white);
  let x = startX;
  headers.forEach((h, i) => {
    const align = rightAlignCols.includes(i) ? "right" : "left";
    doc.text(h, x + 8, startY + 5, { width: colWidths[i] - 14, align });
    x += colWidths[i];
  });

  // Compute per-row heights from wrapped cell content
  const rowHeights = rows.map((row) => {
    doc.font("Helvetica").fontSize(8.5);
    const maxLines = Math.max(
      1,
      ...row.map((cell, i) => cellLines(doc, cell, colWidths[i] - 14))
    );
    return maxLines * lineHeight;
  });

  // Rows — black text, gray grid
  let y = headerBottom;
  rows.forEach((row, ri) => {
    const h = rowHeights[ri];
    if (ri % 2 === 1) {
      doc.rect(startX, y, totalW, h).fill(C.band);
    }
    doc.font("Helvetica").fontSize(8.5).fillColor(C.ink);
    x = startX;
    row.forEach((cell, i) => {
      const align = rightAlignCols.includes(i) ? "right" : "left";
      doc.text(cell, x + 8, y + 3.5, { width: colWidths[i] - 14, align, lineBreak: true });
      x += colWidths[i];
    });
    y += h;
  });

  doc.lineWidth(0.5).strokeColor(C.grid);
  doc.moveTo(startX, startY).lineTo(startX + totalW, startY).stroke();
  doc.moveTo(startX, headerBottom).lineTo(startX + totalW, headerBottom).stroke();
  doc.moveTo(startX, y).lineTo(startX + totalW, y).stroke();
  let yy = headerBottom;
  rowHeights.forEach((h) => {
    yy += h;
    doc.moveTo(startX, yy).lineTo(startX + totalW, yy).stroke();
  });
  let vx = startX;
  for (const w of colWidths) {
    vx += w;
    doc.moveTo(vx, startY).lineTo(vx, y).stroke();
  }
  return y;
}

/** Status pill — green for paid, amber for pending, red for cancelled. */
function drawStatusPill(doc: PDFKit.PDFDocument, status: string, x: number, y: number) {
  const text = status.charAt(0).toUpperCase() + status.slice(1);
  const style = STATUS_STYLES[status] ?? { fill: C.band, text: C.ink };
  doc.font("Helvetica-Bold").fontSize(8.5);
  const w = doc.widthOfString(text) + 22;
  doc.roundedRect(x - w, y, w, 18, 9).fill(style.fill);
  doc.fillColor(style.text).text(text, x - w + 11, y + 5, { width: w - 22, align: "center" });
}

/** Border + header. Border repeats on every page. */
function decoratePage(
  doc: PDFKit.PDFDocument,
  pageWidth: number,
  pageHeight: number,
  pageNumber: number,
  company: OrganizationRecord,
  bill: Bill
) {
  // Full A4 sheet border
  doc.rect(BORDER_INSET, BORDER_INSET, pageWidth - BORDER_INSET * 2, pageHeight - BORDER_INSET * 2)
    .lineWidth(1.5)
    .strokeColor(C.navy)
    .stroke();

  if (pageNumber > 1) {
    // Continuation header — compact, keeps the document branded
    const tag = `INVOICE · ${bill.billNumber || "—"}`;
    doc.font("Helvetica-Bold").fontSize(8).fillColor(C.navy);
    const tagW = doc.widthOfString(tag);
    doc.roundedRect(pageWidth - MARGIN - tagW - 12, 22, tagW + 24, 16, 8).fill(C.band);
    doc.text(tag, pageWidth - MARGIN - tagW - 6, 26);
    doc.moveTo(MARGIN, 46).lineTo(pageWidth - MARGIN, 46).lineWidth(0.75).strokeColor(C.grid).stroke();
    return;
  }

  const bandX = BORDER_INSET;
  const bandY = 14;
  const bandW = pageWidth - BORDER_INSET * 2;
  const bandH = 58;

  // Logo (top-left corner of the band)
  const logo = loadLogo();
  const logoSize = 36;
  const logoRight = logo ? bandX + 16 + logoSize + 12 : bandX + 20;
  if (logo) {
    try {
      doc.image(logo, bandX + 16, bandY + 10, { width: logoSize, height: logoSize });
    } catch {
      // Ignore broken logo bytes and fall back to text-only header.
    }
  }

  const headerX = logoRight;
  const headerTextWidth = pageWidth - headerX - 170;

  const companyName = company.name || "My Clinic";
  doc.font("Helvetica-Bold").fontSize(14).fillColor(C.navy);
  doc.text(companyName, headerX, bandY + 6, { width: headerTextWidth });

  const clinicLines: string[] = [];
  if (company.address) clinicLines.push(company.address);
  const contactBits: string[] = [];
  if (company.phone) contactBits.push(`Ph: ${company.phone}`);
  if (company.email) contactBits.push(company.email);
  if (company.website) contactBits.push(company.website);

  let cy = bandY + 20;
  doc.font("Helvetica").fontSize(7.5).fillColor(C.muted);
  for (const line of clinicLines) {
    doc.text(line, headerX, cy, { width: headerTextWidth });
    cy += 8.5;
  }
  if (contactBits.length) {
    doc.text(contactBits.join("  ·  "), headerX, cy, { width: headerTextWidth });
  }

  // Invoice title (right of band)
  const title = "INVOICE";
  doc.font("Helvetica-Bold").fontSize(19).fillColor(C.navy);
  const titleW = doc.widthOfString(title);
  doc.text(title, pageWidth - MARGIN - titleW, bandY + 5);

  const billNo = bill.billNumber || "—";
  doc.font("Helvetica-Bold").fontSize(10).fillColor(C.royal);
  const bnW = doc.widthOfString(billNo);
  doc.text(billNo, pageWidth - MARGIN - bnW, bandY + 26);

  if (bill.status) {
    drawStatusPill(doc, bill.status, pageWidth - MARGIN, bandY + 39);
  }

  // Bottom rule under the header band
  doc.moveTo(bandX, bandY + bandH).lineTo(bandX + bandW, bandY + bandH)
    .lineWidth(2)
    .strokeColor(C.navy)
    .stroke();
}

export async function generateBillPdf(
  bill: Bill,
  company: OrganizationRecord,
  visit: BillVisit = {}
): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: MARGIN, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const contentWidth = pageWidth - MARGIN * 2;
  const companyName = company.name || "My Clinic";

  let pageNo = 1;
  let y = 0;

  // Adds a decorated continuation page when the remaining space is too small.
  function ensureSpace(needed: number) {
    if (y + needed <= pageHeight - 84) return;
    doc.addPage();
    pageNo += 1;
    decoratePage(doc, pageWidth, pageHeight, pageNo, company, bill);
    y = 52;
  }

  decoratePage(doc, pageWidth, pageHeight, 1, company, bill);

  y = 14 + 58 + 11;

  // Billed To (left) and Invoice & Payment (right) — elegant info panels
  const patient = visit.patient;
  const patientAgeGender = [
    patient?.age ? `${patient.age} yrs` : "",
    patient?.gender ? String(patient.gender) : "",
  ]
    .filter(Boolean)
    .join(" / ");

  const billedToLines: string[] = [];
  if (bill.patientPhone) billedToLines.push(bill.patientPhone);
  if (patientAgeGender) billedToLines.push(patientAgeGender);
  if (patient?.email) billedToLines.push(String(patient.email));

  const leftW = 260;
  const rightW = 260;
  const panelY = y;
  const leftH = 30 + 16 + billedToLines.length * 12.5 + 6;
  const rightRows: [string, string][] = [
    ["DATE", formatDate(bill.date)],
    ["INVOICE NO.", bill.billNumber || "—"],
    ["DOCTOR", bill.doctorName || "—"],
    ["PAYMENT", bill.paymentMethod || "—"],
  ];
  const rightH = 30 + rightRows.length * 22 - 4 + 6;

  panelShell(doc, MARGIN, panelY, leftW, leftH, "BILLED TO");
  let leftY = panelY + 30;
  doc.font("Helvetica-Bold").fontSize(11.5).fillColor(C.ink);
  doc.text(bill.patientName || "—", MARGIN + 12, leftY, { width: leftW - 24 });
  leftY += 16;
  doc.font("Helvetica").fontSize(9).fillColor(C.muted);
  for (const line of billedToLines) {
    doc.text(line, MARGIN + 12, leftY, { width: leftW - 24 });
    leftY += 12.5;
  }

  panelShell(doc, pageWidth - MARGIN - rightW, panelY, rightW, rightH, "INVOICE & PAYMENT");
  let rightY = panelY + 30;
  for (const [l, v] of rightRows) {
    metaLabel(doc, l, pageWidth - MARGIN - rightW + 12, rightY);
    doc.font("Helvetica").fontSize(9.5).fillColor(C.ink).text(v, pageWidth - MARGIN - rightW + 12, rightY + 10, { width: rightW - 24 });
    rightY += 22;
  }

  y = Math.max(panelY + leftH, panelY + rightH) + 8;

  const appointment = visit.appointment;
  if (appointment) {
    ensureSpace(18 + 11 * 10);
    y = sectionHeading(doc, "Appointment Details", MARGIN, y, pageWidth - MARGIN);
    const apptRows: [string, string][] = [
      ["Appointment ID", appointment.id ? String(appointment.id).slice(-6).toUpperCase() : "—"],
      ["Doctor", appointment.doctorName || "—"],
      ["Department", appointment.department || "—"],
      ["Date / Time", `${formatDate(appointment.date)}${appointment.time ? " · " + appointment.time : ""}`],
      ["Type", appointment.type === "video" ? "Video Consultation" : "In-person"],
      ["Status", appointment.status ? String(appointment.status).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—"],
      ["Booking Source", appointment.bookingSource === "whatsapp_ai" ? "WhatsApp AI" : "Manual"],
    ];
    if (appointment.counter != null) apptRows.push(["Counter #", String(appointment.counter)]);
    if (appointment.reason) apptRows.push(["Reason", String(appointment.reason)]);
    if (appointment.notes) apptRows.push(["Notes", String(appointment.notes)]);
    let apptY = y;
    for (const [l, v] of apptRows) {
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.navy).text(l.toUpperCase(), MARGIN, apptY, { width: 110 });
      doc.font("Helvetica").fontSize(9).fillColor(C.ink).text(v, MARGIN + 118, apptY, { width: 320 });
      apptY += 13;
    }
    y = apptY + 3;
  }

  const prescriptions = Array.isArray(visit.prescriptions) ? visit.prescriptions : [];
  if (prescriptions.length) {
    ensureSpace(80);
    y = sectionHeading(doc, "Prescription & Medicines", MARGIN, y, pageWidth - MARGIN);
    for (const p of prescriptions) {
      ensureSpace(70);
      doc.font("Helvetica-Bold").fontSize(9.5).fillColor(C.ink).text(
        p.diagnosis ? `Diagnosis: ${p.diagnosis}` : "Prescription",
        MARGIN, y
      );
      y += 12;
      const metaBits: string[] = [];
      if (p.visitDate) metaBits.push(`Visit: ${formatDate(String(p.visitDate))}`);
      if (p.doctorName) metaBits.push(`Doctor: ${p.doctorName}`);
      if (p.followUpDate) metaBits.push(`Follow-up: ${formatDate(String(p.followUpDate))}`);
      if (metaBits.length) {
        doc.font("Helvetica").fontSize(8).fillColor(C.muted).text(metaBits.join("  ·  "), MARGIN, y, { width: contentWidth });
        y += 11;
      }
      if (p.symptoms) {
        doc.font("Helvetica-Bold").fontSize(8).fillColor(C.ink).text("Symptoms / Notes:", MARGIN, y, { width: 110 });
        doc.font("Helvetica").fontSize(9).fillColor(C.muted).text(String(p.symptoms), MARGIN + 115, y, { width: contentWidth - 115 });
        y += 13;
      }
      if (p.testsRecommended) {
        doc.font("Helvetica-Bold").fontSize(8).fillColor(C.ink).text("Tests Recommended:", MARGIN, y, { width: 110 });
        doc.font("Helvetica").fontSize(9).fillColor(C.muted).text(String(p.testsRecommended), MARGIN + 115, y, { width: contentWidth - 115 });
        y += 13;
      }

      const medicines = Array.isArray(p.medicines) ? p.medicines.filter((m) => m?.name) : [];
      if (medicines.length) {
        // Columns must sum to the content width so the table never crosses the border
        const headers = ["Medicine", "Frequency", "Duration", "Before / After Food", "Instructions"];
        const colWidths = [150, 80, 70, 100, 94];
        const rows = medicines.map((m) => [
          String(m.name ?? "—"),
          String(m.frequency ?? "—"),
          String(m.duration ?? "—"),
          String(m.beforeAfterFood ?? "—"),
          String(m.specialInstructions ?? "—"),
        ]);
        ensureSpace(28 + rows.length * 14);
        y = drawSimpleTable(doc, headers, rows, colWidths, MARGIN, y, 14, []);
        y += 4;
      } else {
        doc.font("Helvetica").fontSize(9).fillColor(C.muted).text("No medicines listed.", MARGIN, y, { width: contentWidth });
        y += 16;
      }
    }
  }

  const doctors = Array.isArray(visit.doctors) ? visit.doctors.filter((d) => d?.name) : [];
  if (doctors.length) {
    ensureSpace(19 + 15 + 15 * doctors.length);
    y = sectionHeading(doc, "Doctors", MARGIN, y, pageWidth - MARGIN);
    y = drawSimpleTable(
      doc,
      ["#", "Doctor"],
      doctors.map((d, i) => [String(i + 1), String(d.name ?? "—")]),
      [40, 400],
      MARGIN,
      y,
      14,
      []
    );
    y += 4;
  }

  // Items table — widths sum to contentWidth
  const items = Array.isArray(bill.items) ? bill.items : [];
  ensureSpace(18 + 19 + items.length * 14 + 8);
  y = sectionHeading(doc, "Bill Items", MARGIN, y, pageWidth - MARGIN);
  const itemCols = [28, contentWidth - 28 - 44 - 66 - 70, 44, 66, 70];
  const itemRows = items.map((item, i) => [
    String(i + 1),
    item.name || "—",
    String(item.qty ?? 0),
    inr(item.price ?? 0),
    inr(item.amount ?? 0),
  ]);
  const noItems = !items.length;
  if (noItems) itemRows.push(["", "No items", "", "", ""]);
  y = drawSimpleTable(
    doc,
    ["#", "ITEM / SERVICE", "QTY", "PRICE", "AMOUNT"],
    itemRows,
    itemCols,
    MARGIN,
    y,
    14,
    [2, 3, 4]
  );
  y += 5;

// Totals — right-aligned panel with a navy grand total bar; the whole block
// (rows + grand total + words + notes) stays with the footer when possible.
  const totalsX = pageWidth - MARGIN - 270;
  const totalsW = 270;
  const padX = 12;
  let tY = y + 4;
  const totalRows: [string, string][] = [
    ["Subtotal", inr(bill.subtotal ?? 0)],
  ];
  if ((bill.discount ?? 0) > 0)
    totalRows.push(["Discount", `- ${inr(bill.discount ?? 0)}`]);
  if ((bill.tax ?? 0) > 0)
    totalRows.push([`Tax (${bill.taxRate ?? 0}%)`, inr(bill.tax ?? 0)]);

  // Keep totals panel + amount-in-words band together; re-anchor tY after any page break
  const totalsBlockH = 10 + totalRows.length * 17 + 6 + 28 + 8 + 6 + 26 + 4;
  ensureSpace(totalsBlockH + 34);
  tY = y + 4;
  doc.roundedRect(totalsX, tY, totalsW, 10 + totalRows.length * 17 + 6 + 28 + 8, 6).fill(C.band).lineWidth(0.75).strokeColor(C.hairline).stroke();
  tY += 10;
  for (const [l, v] of totalRows) {
    doc.font("Helvetica").fontSize(9.5).fillColor(C.muted).text(l, totalsX + padX, tY, { width: totalsW - 150 });
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(C.ink).text(v, totalsX + totalsW - padX - 100, tY, { width: 96, align: "right" });
    tY += 17;
  }

  // Grand total — navy bar with white bold text, the strongest element
  tY += 6;
  doc.roundedRect(totalsX + 4, tY, totalsW - 8, 28, 5).fill(C.navy);
  doc.font("Helvetica-Bold").fontSize(11).fillColor(C.white);
  doc.text("GRAND TOTAL", totalsX + padX + 4, tY + 9, { width: 150 });
  doc.text(inr(bill.total ?? 0), totalsX + totalsW - padX - 8 - 120, tY + 9, { width: 116, align: "right" });
  tY += 28 + 8;

  // Amount in words — royal-bordered band with royal micro-label
  doc.roundedRect(MARGIN, tY, contentWidth, 26, 5).fill(C.white).lineWidth(0.75).strokeColor(C.royal).stroke();
  metaLabel(doc, "AMOUNT IN WORDS", MARGIN + 14, tY + 3);
  doc.font("Helvetica").fontSize(9).fillColor(C.ink).text(
    amountInWords(bill.total ?? 0),
    MARGIN + 14,
    tY + 13,
    { width: contentWidth - 28 }
  );
  tY += 26;

  y = tY + 2;

  // Notes
  if (bill.notes) {
    ensureSpace(18 + 13 + 16);
    y = sectionHeading(doc, "Notes", MARGIN, y, pageWidth - MARGIN);
    doc.font("Helvetica").fontSize(9.5).fillColor(C.muted).text(bill.notes, MARGIN, y, { width: contentWidth });
    y += 18;
  } else {
    y += 14;
  }

  // Footer — dark navy band with thank-you message and branding (inside border)
  const footY = pageHeight - 72;
  if (y > footY - 34) {
    ensureSpace(80);
  }
  doc.rect(MARGIN, footY, contentWidth, 42).fill(C.navy);
  doc.font("Helvetica-Bold").fontSize(9).fillColor(C.white).text(
    `Thank you for visiting ${companyName}`,
    MARGIN,
    footY + 9,
    { width: contentWidth, align: "center" }
  );
  doc.font("Helvetica").fontSize(7.5).fillColor("#C7D2E0").text(
    `${companyName} · Generated on ${formatDate(new Date().toISOString())}`,
    MARGIN,
    footY + 24,
    { width: contentWidth, align: "center" }
  );

  doc.end();
  return done;
}