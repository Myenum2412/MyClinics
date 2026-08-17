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

const MARGIN = 48;
const BORDER_INSET = 10;

// Modern medical palette — teal accent on soft white
const C = {
  teal: "#0d9488",
  tealDark: "#134e4a",
  tealSoft: "#ccfbf1",
  band: "#f0fdfa",
  ink: "#0f172a",
  muted: "#475569",
  faint: "#94a3b8",
  grid: "#dbeae6",
  hairline: "#e2e8f0",
  zebra: "#f8fafc",
  paid: "#15803d",
  paidBg: "#dcfce7",
  pending: "#b45309",
  pendingBg: "#fef3c7",
  danger: "#b91c1c",
  dangerBg: "#fee2e2",
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

/** Uppercase small label with a teal chip — used for sections and fields. */
function sectionHeading(doc: PDFKit.PDFDocument, text: string, x: number, y: number, lineTo: number) {
  doc.rect(x, y + 3, 4, 12).fill(C.teal);
  doc.font("Helvetica-Bold").fontSize(9).fillColor(C.tealDark).text(text.toUpperCase(), x + 12, y);
  const labelEnd = x + 12 + doc.widthOfString(text.toUpperCase());
  doc.moveTo(labelEnd + 10, y + 9)
    .lineTo(lineTo, y + 9)
    .lineWidth(0.75)
    .strokeColor(C.grid)
    .stroke();
  return y + 20;
}

/** Uppercase micro-label above a value (e.g. DATE / DOCTOR / PAYMENT). */
function metaLabel(doc: PDFKit.PDFDocument, label: string, x: number, y: number) {
  doc.font("Helvetica-Bold").fontSize(7).fillColor(C.faint).text(label.toUpperCase(), x, y);
}

function drawMetaRows(doc: PDFKit.PDFDocument, rows: [string, string][], startX: number, y: number, gap = 19) {
  for (const [l, v] of rows) {
    metaLabel(doc, l, startX, y);
    doc.font("Helvetica").fontSize(10).fillColor(C.ink).text(v, startX, y + 10, { width: 240 });
    y += gap;
  }
  return y;
}

function drawSimpleTable(
  doc: PDFKit.PDFDocument,
  headers: string[],
  rows: string[][],
  colWidths: number[],
  startX: number,
  startY: number,
  rowHeight: number,
  rightAlignCols: number[] = []
): number {
  const totalW = colWidths.reduce((s, w) => s + w, 0);
  const headerBottom = startY + rowHeight;

  // Header
  doc.rect(startX, startY, totalW, rowHeight).fill(C.tealSoft);
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.tealDark);
  let x = startX;
  headers.forEach((h, i) => {
    const align = rightAlignCols.includes(i) ? "right" : "left";
    doc.text(h, x + 6, startY + 5, { width: colWidths[i] - 10, align });
    x += colWidths[i];
  });

  // Rows
  let y = headerBottom;
  for (const row of rows) {
    doc.font("Helvetica").fontSize(8.5).fillColor(C.ink);
    x = startX;
    row.forEach((cell, i) => {
      const align = rightAlignCols.includes(i) ? "right" : "left";
      doc.text(cell, x + 6, y + 4, { width: colWidths[i] - 10, align });
      x += colWidths[i];
    });
    y += rowHeight;
  }

  // Grid: outer box, row separators and column separators
  doc.lineWidth(0.5).strokeColor(C.grid);
  doc.moveTo(startX, startY).lineTo(startX + totalW, startY).stroke();
  doc.moveTo(startX, headerBottom).lineTo(startX + totalW, headerBottom).stroke();
  doc.moveTo(startX, y).lineTo(startX + totalW, y).stroke();
  let vx = startX;
  for (const w of colWidths) {
    vx += w;
    doc.moveTo(vx, startY).lineTo(vx, y).stroke();
  }
  return y;
}

/** Status pill with tinted background and matching text color. */
function drawStatusPill(doc: PDFKit.PDFDocument, status: string, x: number, y: number) {
  const cfg =
    status === "paid"
      ? { bg: C.paidBg, fg: C.paid }
      : status === "pending"
        ? { bg: C.pendingBg, fg: C.pending }
        : { bg: C.dangerBg, fg: C.danger };
  const text = status.charAt(0).toUpperCase() + status.slice(1);
  doc.font("Helvetica-Bold").fontSize(8.5);
  const w = doc.widthOfString(text) + 20;
  doc.roundedRect(x - w, y, w, 18, 9).fill(cfg.bg);
  doc.fillColor(cfg.fg).text(text, x - w + 10, y + 5, { width: w - 20, align: "center" });
}

/** Border + header band decoration. Border repeats on every page. */
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
    .strokeColor("#e2e8f0")
    .stroke();

  // Teal accent bar on the left edge of the border
  doc.rect(BORDER_INSET, BORDER_INSET, 4, pageHeight - BORDER_INSET * 2).fill(C.teal);

  if (pageNumber > 1) {
    // Continuation header — compact, keeps the document branded
    const tag = `INVOICE · ${bill.billNumber || "—"}`;
    doc.font("Helvetica-Bold").fontSize(8).fillColor(C.tealDark);
    const tagW = doc.widthOfString(tag);
    doc.roundedRect(pageWidth - MARGIN - tagW - 12, 22, tagW + 24, 16, 8).fill(C.tealSoft);
    doc.text(tag, pageWidth - MARGIN - tagW - 6, 26);
    doc.moveTo(MARGIN, 46).lineTo(pageWidth - MARGIN, 46).lineWidth(0.75).strokeColor(C.grid).stroke();
    return;
  }

  const bandX = BORDER_INSET;
  const bandY = 14;
  const bandW = pageWidth - BORDER_INSET * 2;
  const bandH = 76;

  // Header band card
  doc.roundedRect(bandX, bandY, bandW, bandH, 10).fill(C.band);
  doc.moveTo(bandX, bandY + bandH).lineTo(bandX + bandW, bandY + bandH)
    .lineWidth(2)
    .strokeColor(C.teal)
    .stroke();

  // Logo (top-left corner of the band)
  const logo = loadLogo();
  const logoSize = 40;
  const logoRight = logo ? bandX + 20 + logoSize + 12 : bandX + 20;
  if (logo) {
    try {
      doc.image(logo, bandX + 20, bandY + 16, { width: logoSize, height: logoSize });
    } catch {
      // Ignore broken logo bytes and fall back to text-only header.
    }
  }

  const headerX = logoRight;
  const headerTextWidth = pageWidth - headerX - 190;

  const companyName = company.name || "My Clinic";
  doc.font("Helvetica-Bold").fontSize(15).fillColor(C.tealDark);
  doc.text(companyName, headerX, bandY + 10, { width: headerTextWidth });

  const clinicLines: string[] = [];
  if (company.address) clinicLines.push(company.address);
  const contactBits: string[] = [];
  if (company.phone) contactBits.push(`Ph: ${company.phone}`);
  if (company.email) contactBits.push(company.email);
  if (company.website) contactBits.push(company.website);

  let cy = bandY + 27;
  doc.font("Helvetica").fontSize(8).fillColor(C.muted);
  for (const line of clinicLines) {
    doc.text(line, headerX, cy, { width: headerTextWidth });
    cy += 10;
  }
  if (contactBits.length) {
    doc.text(contactBits.join("  ·  "), headerX, cy, { width: headerTextWidth });
  }

  // Invoice title (right of band)
  const title = "INVOICE";
  doc.font("Helvetica-Bold").fontSize(21).fillColor(C.teal);
  const titleW = doc.widthOfString(title);
  doc.text(title, pageWidth - MARGIN - titleW, bandY + 8);

  const billNo = bill.billNumber || "—";
  doc.font("Helvetica").fontSize(10.5).fillColor(C.muted);
  const bnW = doc.widthOfString(billNo);
  doc.text(billNo, pageWidth - MARGIN - bnW, bandY + 33);

  if (bill.status) {
    drawStatusPill(doc, bill.status, pageWidth - MARGIN, bandY + 50);
  }
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
    if (y + needed <= pageHeight - 80) return;
    doc.addPage();
    pageNo += 1;
    decoratePage(doc, pageWidth, pageHeight, pageNo, company, bill);
    y = 54;
  }

  decoratePage(doc, pageWidth, pageHeight, 1, company, bill);

  y = 14 + 76 + 16;

  // Billed To (left) — patient details
  const patient = visit.patient;
  const patientAgeGender = [
    patient?.age ? `${patient.age} yrs` : "",
    patient?.gender ? String(patient.gender) : "",
  ]
    .filter(Boolean)
    .join(" / ");

  metaLabel(doc, "BILLED TO", MARGIN, y);
  y += 12;
  doc.font("Helvetica-Bold").fontSize(12).fillColor(C.ink);
  doc.text(bill.patientName || "—", MARGIN, y);
  y += 14;
  const billedToLines: string[] = [];
  if (bill.patientPhone) billedToLines.push(bill.patientPhone);
  if (patientAgeGender) billedToLines.push(patientAgeGender);
  if (patient?.email) billedToLines.push(String(patient.email));
  for (const line of billedToLines) {
    doc.font("Helvetica").fontSize(9.5).fillColor(C.muted).text(line, MARGIN, y);
    y += 12;
  }
  y -= 2;

  // Meta (right) — DATE / DOCTOR / PAYMENT
  const metaRightX = pageWidth - MARGIN - 170;
  const metaEnd = drawMetaRows(doc, [
    ["DATE", formatDate(bill.date)],
    ["DOCTOR", bill.doctorName || "—"],
    ["PAYMENT", bill.paymentMethod || "—"],
  ], metaRightX, 14 + 76 + 16 - 12, 19);

  y = Math.max(y, metaEnd) + 7;

  const appointment = visit.appointment;
  if (appointment) {
    ensureSpace(21 + 13 * 10);
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
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.muted).text(l.toUpperCase(), MARGIN, apptY, { width: 110 });
      doc.font("Helvetica").fontSize(9).fillColor(C.ink).text(v, MARGIN + 118, apptY, { width: 320 });
      apptY += 13;
    }
    y = apptY + 4;
  }

  const prescriptions = Array.isArray(visit.prescriptions) ? visit.prescriptions : [];
  if (prescriptions.length) {
    ensureSpace(100);
    y = sectionHeading(doc, "Prescription & Medicines", MARGIN, y, pageWidth - MARGIN);
    for (const p of prescriptions) {
      ensureSpace(80);
      doc.font("Helvetica-Bold").fontSize(9.5).fillColor(C.tealDark).text(
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
        doc.font("Helvetica-Bold").fontSize(8).fillColor(C.muted).text("Symptoms / Notes:", MARGIN, y, { width: 110 });
        doc.font("Helvetica").fontSize(9).fillColor(C.ink).text(String(p.symptoms), MARGIN + 115, y, { width: contentWidth - 115 });
        y += 13;
      }
      if (p.testsRecommended) {
        doc.font("Helvetica-Bold").fontSize(8).fillColor(C.muted).text("Tests Recommended:", MARGIN, y, { width: 110 });
        doc.font("Helvetica").fontSize(9).fillColor(C.ink).text(String(p.testsRecommended), MARGIN + 115, y, { width: contentWidth - 115 });
        y += 13;
      }

      const medicines = Array.isArray(p.medicines) ? p.medicines.filter((m) => m?.name) : [];
      if (medicines.length) {
        ensureSpace(34 + medicines.length * 16);
        const headers = ["Medicine", "Frequency", "Duration", "Before / After Food", "Instructions"];
        const colWidths = [160, 90, 80, 110, 190];
        const rows = medicines.map((m) => [
          String(m.name ?? "—"),
          String(m.frequency ?? "—"),
          String(m.duration ?? "—"),
          String(m.beforeAfterFood ?? "—"),
          String(m.specialInstructions ?? "—"),
        ]);
        y = drawSimpleTable(doc, headers, rows, colWidths, MARGIN, y, 16, []);
        y += 6;
      } else {
        doc.font("Helvetica").fontSize(9).fillColor(C.muted).text("No medicines listed.", MARGIN, y, { width: contentWidth });
        y += 15;
      }
    }
  }

  const doctors = Array.isArray(visit.doctors) ? visit.doctors.filter((d) => d?.name) : [];
  if (doctors.length) {
    ensureSpace(21 + 16 + 16 * doctors.length);
    y = sectionHeading(doc, "Doctors", MARGIN, y, pageWidth - MARGIN);
    y = drawSimpleTable(
      doc,
      ["#", "Doctor"],
      doctors.map((d, i) => [String(i + 1), String(d.name ?? "—")]),
      [40, 400],
      MARGIN,
      y,
      16,
      []
    );
    y += 6;
  }

  // Items table
  const items = Array.isArray(bill.items) ? bill.items : [];
  const itemsRowHeight = 17;
  ensureSpace(21 + 20 + itemsRowHeight * Math.max(items.length, 1) + 10);
  y = sectionHeading(doc, "Bill Items", MARGIN, y, pageWidth - MARGIN);
  const cols = {
    idx: { x: MARGIN, w: 30 },
    item: { x: MARGIN + 30, w: contentWidth * 0.42 },
    qty: { x: MARGIN + 30 + contentWidth * 0.42, w: 60 },
    price: { x: pageWidth - MARGIN - 150, w: 70 },
    amount: { x: pageWidth - MARGIN - 75, w: 75 },
  };

  doc.rect(MARGIN, y, contentWidth, 20).fill(C.tealSoft);
  doc.font("Helvetica-Bold").fontSize(8).fillColor(C.tealDark);
  doc.text("#", cols.idx.x + 8, y + 6);
  doc.text("ITEM / SERVICE", cols.item.x + 8, y + 6, { width: cols.item.w - 8 });
  doc.text("QTY", cols.qty.x + 8, y + 6, { width: cols.qty.w - 8, align: "center" });
  doc.text("PRICE", cols.price.x + 8, y + 6, { width: cols.price.w - 8, align: "right" });
  doc.text("AMOUNT", cols.amount.x + 8, y + 6, { width: cols.amount.w - 8, align: "right" });

  let itemRowY = y + 20;
  const itemTableBottom = itemRowY + items.length * itemsRowHeight;

  if (!items.length) {
    doc.font("Helvetica").fontSize(9).fillColor(C.muted).text("No items", MARGIN + 8, itemRowY + 6);
    itemRowY += 20;
  } else {
    items.forEach((item, i) => {
      const rowBottom = itemRowY + itemsRowHeight;
      if (i % 2 === 1) {
        doc.rect(MARGIN, itemRowY, contentWidth, itemsRowHeight).fill(C.zebra);
      }
      doc.font("Helvetica").fontSize(9).fillColor(C.ink);
      doc.text(String(i + 1), cols.idx.x + 8, itemRowY + 5, { width: cols.idx.w - 8, align: "center" });
      doc.text(item.name || "—", cols.item.x + 8, itemRowY + 5, { width: cols.item.w - 8 });
      doc.text(String(item.qty ?? 0), cols.qty.x + 8, itemRowY + 5, { width: cols.qty.w - 8, align: "center" });
      doc.text(inr(item.price ?? 0), cols.price.x + 8, itemRowY + 5, { width: cols.price.w - 8, align: "right" });
      doc.font("Helvetica-Bold").text(inr(item.amount ?? 0), cols.amount.x + 8, itemRowY + 5, { width: cols.amount.w - 8, align: "right" });
      itemRowY = rowBottom;
    });
  }

  // Items table grid: outer box, row separators and column separators
  doc.lineWidth(0.5).strokeColor(C.grid);
  doc.moveTo(MARGIN, y).lineTo(MARGIN + contentWidth, y).stroke();
  doc.moveTo(MARGIN, y + 20).lineTo(MARGIN + contentWidth, y + 20).stroke();
  doc.moveTo(MARGIN, itemTableBottom).lineTo(MARGIN + contentWidth, itemTableBottom).stroke();
  for (const col of [cols.idx, cols.item, cols.qty, cols.price]) {
    doc.moveTo(col.x + col.w, y).lineTo(col.x + col.w, itemTableBottom).stroke();
  }

  // Totals
  const totalsX = pageWidth - MARGIN - 240;
  const totalsW = 240;
  let tY = itemRowY + 10;
  const totalRows: [string, string][] = [
    ["Subtotal", inr(bill.subtotal ?? 0)],
  ];
  if ((bill.discount ?? 0) > 0)
    totalRows.push(["Discount", `− ${inr(bill.discount ?? 0)}`]);
  if ((bill.tax ?? 0) > 0)
    totalRows.push([`Tax (${bill.taxRate ?? 0}%)`, inr(bill.tax ?? 0)]);

  ensureSpace(14 * totalRows.length + 28 + 8 + 26 + 24);
  for (const [l, v] of totalRows) {
    doc.font("Helvetica").fontSize(9.5).fillColor(C.muted).text(l, totalsX, tY, { width: totalsW - 90 });
    doc.font("Helvetica").fontSize(9.5).fillColor(C.ink).text(v, totalsX + totalsW - 90, tY, { width: 86, align: "right" });
    tY += 14;
  }

  // Grand total — teal filled rounded box
  const grandH = 28;
  doc.roundedRect(totalsX - 10, tY, totalsW + 20, grandH, 6).fill(C.teal);
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#ffffff");
  doc.text("GRAND TOTAL", totalsX - 10 + 16, tY + 8, { width: totalsW - 60 });
  doc.text(inr(bill.total ?? 0), totalsX + 10 + 14, tY + 8, { width: totalsW - 40, align: "right" });
  tY += grandH + 8;

  // Amount in words — tinted band across the width
  doc.roundedRect(MARGIN, tY, contentWidth, 26, 6).fill(C.band).lineWidth(0.75).strokeColor(C.grid).stroke();
  metaLabel(doc, "AMOUNT IN WORDS", MARGIN + 14, tY + 3);
  doc.font("Helvetica").fontSize(9).fillColor(C.tealDark).text(
    amountInWords(bill.total ?? 0),
    MARGIN + 14,
    tY + 14,
    { width: contentWidth - 28 }
  );
  tY += 26;

  y = tY + 3;

  // Notes
  if (bill.notes) {
    ensureSpace(20 + 14 + 18);
    y = sectionHeading(doc, "Notes", MARGIN, y, pageWidth - MARGIN);
    doc.font("Helvetica").fontSize(9.5).fillColor(C.muted).text(bill.notes, MARGIN, y, { width: contentWidth });
    y += 20;
  } else {
    y += 16;
  }

  // Footer (inside border)
  const footer = `Thank you for visiting ${companyName} · Generated on ${formatDate(new Date().toISOString())}`;
  if (y > pageHeight - 90) {
    ensureSpace(80);
  }
  doc.moveTo(MARGIN, pageHeight - 70).lineTo(pageWidth - MARGIN, pageHeight - 70)
    .lineWidth(0.5)
    .strokeColor(C.hairline)
    .stroke();
  doc.font("Helvetica").fontSize(8).fillColor(C.faint).text(
    footer,
    MARGIN,
    pageHeight - 60,
    { width: contentWidth, align: "center" }
  );

  doc.end();
  return done;
}