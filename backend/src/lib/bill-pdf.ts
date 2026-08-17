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

const MARGIN = 28;

// Premium print palette — slate ink with soft surfaces and restrained status tints
const C = {
  ink: "#0F172A",
  muted: "#475569",
  faint: "#64748B",
  ghost: "#94A3B8",
  band: "#F8FAFC",
  hairline: "#E2E8F0",
  grid: "#CBD5E1",
  white: "#FFFFFF",
};

const STATUS_STYLES: Record<string, { fill: string; text: string }> = {
  paid: { fill: "#DCFCE7", text: "#166534" },
  pending: { fill: "#FEF3C7", text: "#92400E" },
  cancelled: { fill: "#FEE2E2", text: "#991B1B" },
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

/** Muted micro-label above a value (e.g. DATE / DOCTOR / PAYMENT). */
function metaLabel(doc: PDFKit.PDFDocument, label: string, x: number, y: number) {
  doc.font("Helvetica-Bold").fontSize(6.5).fillColor(C.ghost).text(label.toUpperCase(), x, y, {
    characterSpacing: 1,
  });
}

/** Muted section label with a hairline rule running to the content edge. */
function sectionHeading(doc: PDFKit.PDFDocument, text: string, x: number, y: number, lineTo: number) {
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.faint).text(text.toUpperCase(), x, y, {
    characterSpacing: 1.5,
  });
  const labelEnd = x + doc.widthOfString(text.toUpperCase(), { characterSpacing: 1.5 });
  doc.moveTo(labelEnd + 10, y + 9)
    .lineTo(lineTo, y + 9)
    .lineWidth(0.75)
    .strokeColor(C.hairline)
    .stroke();
  return y + 24;
}

function drawMetaRows(doc: PDFKit.PDFDocument, rows: [string, string][], startX: number, y: number, gap = 24) {
  for (const [l, v] of rows) {
    metaLabel(doc, l, startX, y);
    doc.font("Helvetica").fontSize(10).fillColor(C.ink).text(v, startX, y + 11, { width: 200 });
    y += gap;
  }
  return y;
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
 * Table with a soft gray header and hairline horizontal rules — no vertical
 * grid, no zebra stripes. Row heights grow with the tallest wrapped cell so
 * content never overflows the row or the page.
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
  const headerH = lineHeight + 12;

  // Header — soft gray fill, muted uppercase micro-labels
  doc.rect(startX, startY, totalW, headerH).fill(C.band);
  doc.font("Helvetica-Bold").fontSize(6.5).fillColor(C.faint);
  let x = startX;
  headers.forEach((h, i) => {
    const align = rightAlignCols.includes(i) ? "right" : "left";
    doc.text(h.toUpperCase(), x + 9, startY + 5.5, {
      width: colWidths[i] - 18,
      align,
      characterSpacing: 0.8,
    });
    x += colWidths[i];
  });

  // Compute per-row heights from wrapped cell content
  const rowHeights = rows.map((row) => {
    doc.font("Helvetica").fontSize(8.5);
    const maxLines = Math.max(
      1,
      ...row.map((cell, i) => cellLines(doc, cell, colWidths[i] - 18))
    );
    return maxLines * lineHeight;
  });

  // Rows — ink text, hairline rules between rows only
  let y = startY + headerH;
  rows.forEach((row, ri) => {
    const h = rowHeights[ri];
    doc.font("Helvetica").fontSize(8.5).fillColor(C.ink);
    x = startX;
    row.forEach((cell, i) => {
      const align = rightAlignCols.includes(i) ? "right" : "left";
      doc.text(cell, x + 9, y + 3.5, { width: colWidths[i] - 18, align, lineBreak: true });
      x += colWidths[i];
    });
    y += h;
    doc.moveTo(startX, y).lineTo(startX + totalW, y).lineWidth(0.5).strokeColor(C.hairline).stroke();
  });

  doc.moveTo(startX, startY).lineTo(startX + totalW, startY).lineWidth(0.5).strokeColor(C.grid).stroke();
  doc.moveTo(startX, startY + headerH).lineTo(startX + totalW, startY + headerH).lineWidth(0.75).strokeColor(C.grid).stroke();
  return y;
}

/** Tinted status pill — soft fill, colored text, no border. */
function drawStatusPill(doc: PDFKit.PDFDocument, status: string, rightX: number, y: number) {
  const text = status.charAt(0).toUpperCase() + status.slice(1);
  const style = STATUS_STYLES[status] ?? { fill: C.band, text: C.muted };
  doc.font("Helvetica-Bold").fontSize(8);
  const w = doc.widthOfString(text) + 26;
  const h = 20;
  doc.roundedRect(rightX - w, y, w, h, h / 2).fill(style.fill);
  doc.fillColor(style.text).text(text, rightX - w, y + 6.5, { width: w, align: "center" });
}

/** Refined header. Repeats in compact form on every page. */
function decoratePage(
  doc: PDFKit.PDFDocument,
  pageWidth: number,
  pageHeight: number,
  pageNumber: number,
  company: OrganizationRecord,
  bill: Bill
) {
  const contentRight = pageWidth - MARGIN;

  if (pageNumber > 1) {
    // Continuation header — compact, keeps the document branded
    const tag = `INVOICE · ${bill.billNumber || "—"}`;
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.muted);
    const tagW = doc.widthOfString(tag);
    doc.roundedRect(contentRight - tagW - 24, 20, tagW + 28, 18, 9).fill(C.band);
    doc.text(tag, contentRight - tagW - 12, 25.5);
    doc.moveTo(MARGIN, 52).lineTo(contentRight, 52).lineWidth(0.75).strokeColor(C.hairline).stroke();
    return;
  }

  const bandY = 24;

  // Logo (top-left)
  const logo = loadLogo();
  const logoSize = 40;
  const headerX = logo ? MARGIN + logoSize + 14 : MARGIN;
  if (logo) {
    try {
      doc.image(logo, MARGIN, bandY, { width: logoSize, height: logoSize });
    } catch {
      // Ignore broken logo bytes and fall back to text-only header.
    }
  }

  const headerTextWidth = contentRight - 190 - headerX;

  const companyName = company.name || "My Clinic";
  doc.font("Helvetica-Bold").fontSize(15).fillColor(C.ink);
  doc.text(companyName, headerX, bandY - 2, { width: headerTextWidth });

  const clinicLines: string[] = [];
  if (company.address) clinicLines.push(company.address);
  const contactBits: string[] = [];
  if (company.phone) contactBits.push(`Ph: ${company.phone}`);
  if (company.email) contactBits.push(company.email);
  if (company.website) contactBits.push(company.website);

  let cy = bandY + 17;
  doc.font("Helvetica").fontSize(8).fillColor(C.muted);
  for (const line of clinicLines) {
    doc.text(line, headerX, cy, { width: headerTextWidth });
    cy += 10;
  }
  if (contactBits.length) {
    doc.text(contactBits.join("  ·  "), headerX, cy, { width: headerTextWidth });
  }

  // Invoice title (right)
  const title = "INVOICE";
  doc.font("Helvetica-Bold").fontSize(21).fillColor(C.ink);
  const titleW = doc.widthOfString(title, { characterSpacing: 2 });
  doc.text(title, contentRight - titleW, bandY - 4, { characterSpacing: 2 });

  const billNo = bill.billNumber || "—";
  doc.font("Helvetica").fontSize(9.5).fillColor(C.muted);
  const bnW = doc.widthOfString(billNo);
  doc.text(billNo, contentRight - bnW, bandY + 22);

  if (bill.status) {
    drawStatusPill(doc, bill.status, contentRight, bandY + 40);
  }

  // Bottom rule under the header band
  doc.moveTo(MARGIN, bandY + 66).lineTo(contentRight, bandY + 66)
    .lineWidth(0.75)
    .strokeColor(C.ink)
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
  const contentRight = pageWidth - MARGIN;
  const companyName = company.name || "My Clinic";

  let pageNo = 1;
  let y = 0;

  // Adds a decorated continuation page when the remaining space is too small.
  function ensureSpace(needed: number) {
    if (y + needed <= pageHeight - 78) return;
    doc.addPage();
    pageNo += 1;
    decoratePage(doc, pageWidth, pageHeight, pageNo, company, bill);
    y = 54;
  }

  decoratePage(doc, pageWidth, pageHeight, 1, company, bill);

  y = 24 + 66 + 14;

  // Billed To (left) — patient details
  const patient = visit.patient;
  const patientAgeGender = [
    patient?.age ? `${patient.age} yrs` : "",
    patient?.gender ? String(patient.gender) : "",
  ]
    .filter(Boolean)
    .join(" / ");

  metaLabel(doc, "BILLED TO", MARGIN, y);
  y += 13;
  doc.font("Helvetica-Bold").fontSize(12).fillColor(C.ink);
  doc.text(bill.patientName || "—", MARGIN, y);
  y += 15;
  const billedToLines: string[] = [];
  if (bill.patientPhone) billedToLines.push(bill.patientPhone);
  if (patientAgeGender) billedToLines.push(patientAgeGender);
  if (patient?.email) billedToLines.push(String(patient.email));
  for (const line of billedToLines) {
    doc.font("Helvetica").fontSize(9.5).fillColor(C.muted).text(line, MARGIN, y);
    y += 13;
  }
  y -= 1;

  // Meta (right) — DATE / DOCTOR / PAYMENT
  const metaRightX = contentRight - 190;
  const metaEnd = drawMetaRows(doc, [
    ["DATE", formatDate(bill.date)],
    ["DOCTOR", bill.doctorName || "—"],
    ["PAYMENT", bill.paymentMethod || "—"],
  ], metaRightX, 24 + 66 + 14 - 13, 24);

  y = Math.max(y, metaEnd) + 6;

  const appointment = visit.appointment;
  if (appointment) {
    ensureSpace(18 + 12 * 10);
    y = sectionHeading(doc, "Appointment Details", MARGIN, y, contentRight);
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
      doc.font("Helvetica-Bold").fontSize(6.5).fillColor(C.ghost).text(l.toUpperCase(), MARGIN, apptY, {
        width: 110,
        characterSpacing: 0.8,
      });
      doc.font("Helvetica").fontSize(9).fillColor(C.ink).text(v, MARGIN + 118, apptY, { width: 320 });
      apptY += 14;
    }
    y = apptY + 3;
  }

  const prescriptions = Array.isArray(visit.prescriptions) ? visit.prescriptions : [];
  if (prescriptions.length) {
    ensureSpace(80);
    y = sectionHeading(doc, "Prescription & Medicines", MARGIN, y, contentRight);
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
        doc.font("Helvetica-Bold").fontSize(8).fillColor(C.faint).text("Symptoms / Notes:", MARGIN, y, { width: 110 });
        doc.font("Helvetica").fontSize(9).fillColor(C.ink).text(String(p.symptoms), MARGIN + 115, y, { width: contentWidth - 115 });
        y += 13;
      }
      if (p.testsRecommended) {
        doc.font("Helvetica-Bold").fontSize(8).fillColor(C.faint).text("Tests Recommended:", MARGIN, y, { width: 110 });
        doc.font("Helvetica").fontSize(9).fillColor(C.ink).text(String(p.testsRecommended), MARGIN + 115, y, { width: contentWidth - 115 });
        y += 13;
      }

      const medicines = Array.isArray(p.medicines) ? p.medicines.filter((m) => m?.name) : [];
      if (medicines.length) {
        // Columns sum to the content width so the table never crosses the border
        const headers = ["Medicine", "Frequency", "Duration", "Before / After Food", "Instructions"];
        const colWidths = [164, 88, 76, 110, 101];
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
    y = sectionHeading(doc, "Doctors", MARGIN, y, contentRight);
    y = drawSimpleTable(
      doc,
      ["#", "Doctor"],
      doctors.map((d, i) => [String(i + 1), String(d.name ?? "—")]),
      [44, contentWidth - 44],
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
  y = sectionHeading(doc, "Bill Items", MARGIN, y, contentRight);
  const itemCols = [30, contentWidth - 30 - 48 - 72 - 80, 48, 72, 80];
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

  // Totals — keep the whole block (rows + grand total + words + notes) with
  // the footer: if it can't fit above the footer line, flow it to the next page.
  const totalsX = contentRight - 240;
  const totalsW = 240;
  let tY = y + 2;
  const totalRows: [string, string][] = [
    ["Subtotal", inr(bill.subtotal ?? 0)],
  ];
  if ((bill.discount ?? 0) > 0)
    totalRows.push(["Discount", `− ${inr(bill.discount ?? 0)}`]);
  if ((bill.tax ?? 0) > 0)
    totalRows.push([`Tax (${bill.taxRate ?? 0}%)`, inr(bill.tax ?? 0)]);

  const totalsBlockH = 16 * totalRows.length + 30 + 26 + 6;
  y = tY;
  ensureSpace(totalsBlockH);
  tY = y;
  for (const [l, v] of totalRows) {
    doc.font("Helvetica").fontSize(9.5).fillColor(C.muted).text(l, totalsX, tY, { width: totalsW - 100 });
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(C.ink).text(v, totalsX + totalsW - 100, tY, { width: 96, align: "right" });
    tY += 16;
  }

  // Grand total — emphasized on a strong separator rule
  doc.moveTo(totalsX - 8, tY).lineTo(totalsX + totalsW + 8, tY)
    .lineWidth(1.25)
    .strokeColor(C.ink)
    .stroke();
  doc.font("Helvetica-Bold").fontSize(9.5).fillColor(C.ink);
  doc.text("GRAND TOTAL", totalsX, tY + 9, { width: totalsW - 100 });
  doc.font("Helvetica-Bold").fontSize(14).fillColor(C.ink);
  doc.text(inr(bill.total ?? 0), totalsX + totalsW - 100, tY + 6, { width: 96, align: "right" });
  tY += 32;

  // Amount in words — soft rounded band
  doc.roundedRect(MARGIN, tY, contentWidth, 26, 6).fill(C.band);
  metaLabel(doc, "AMOUNT IN WORDS", MARGIN + 14, tY + 3);
  doc.font("Helvetica").fontSize(9).fillColor(C.ink).text(
    amountInWords(bill.total ?? 0),
    MARGIN + 14,
    tY + 13,
    { width: contentWidth - 28 }
  );
  tY += 26;

  y = tY + 6;

  // Notes
  if (bill.notes) {
    ensureSpace(18 + 13 + 16);
    y = sectionHeading(doc, "Notes", MARGIN, y, contentRight);
    doc.font("Helvetica").fontSize(9.5).fillColor(C.muted).text(bill.notes, MARGIN, y, { width: contentWidth });
    y += 18;
  } else {
    y += 14;
  }

  // Footer (inside margin)
  const footer = `Thank you for visiting ${companyName} · Generated on ${formatDate(new Date().toISOString())}`;
  if (y > pageHeight - 82) {
    ensureSpace(60);
  }
  doc.moveTo(MARGIN, pageHeight - 62).lineTo(contentRight, pageHeight - 62)
    .lineWidth(0.5)
    .strokeColor(C.hairline)
    .stroke();
  doc.font("Helvetica").fontSize(8).fillColor(C.muted).text(
    footer,
    MARGIN,
    pageHeight - 52,
    { width: contentWidth, align: "center" }
  );

  doc.end();
  return done;
}