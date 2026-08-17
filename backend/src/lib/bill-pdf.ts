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

// Simple blue palette — only these shades + black text
const C = {
  blueLight: "#E3F2FD",
  blueMid: "#90CAF9",
  blue: "#2196F3",
  blueDark: "#0D47A1",
  ink: "#000000",
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

/** Bold dark-blue section label with a light blue underline. */
function sectionHeading(doc: PDFKit.PDFDocument, text: string, x: number, y: number, lineTo: number) {
  doc.font("Helvetica-Bold").fontSize(9).fillColor(C.blueDark).text(text.toUpperCase(), x, y);
  const labelEnd = x + doc.widthOfString(text.toUpperCase());
  doc.moveTo(labelEnd + 10, y + 9)
    .lineTo(lineTo, y + 9)
    .lineWidth(1)
    .strokeColor(C.blueMid)
    .stroke();
  return y + 19;
}

/** Uppercase micro-label above a value (e.g. DATE / DOCTOR / PAYMENT). */
function metaLabel(doc: PDFKit.PDFDocument, label: string, x: number, y: number) {
  doc.font("Helvetica-Bold").fontSize(7).fillColor(C.blueDark).text(label.toUpperCase(), x, y);
}

function drawMetaRows(doc: PDFKit.PDFDocument, rows: [string, string][], startX: number, y: number, gap = 17) {
  for (const [l, v] of rows) {
    metaLabel(doc, l, startX, y);
    doc.font("Helvetica").fontSize(10).fillColor(C.ink).text(v, startX, y + 10, { width: 230 });
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

  // Header — light blue fill, dark blue text
  doc.rect(startX, startY, totalW, rowHeight).fill(C.blueLight);
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.blueDark);
  let x = startX;
  headers.forEach((h, i) => {
    const align = rightAlignCols.includes(i) ? "right" : "left";
    doc.text(h, x + 6, startY + 4, { width: colWidths[i] - 10, align });
    x += colWidths[i];
  });

  // Rows — black text
  let y = headerBottom;
  for (const row of rows) {
    doc.font("Helvetica").fontSize(8.5).fillColor(C.ink);
    x = startX;
    row.forEach((cell, i) => {
      const align = rightAlignCols.includes(i) ? "right" : "left";
      doc.text(cell, x + 6, y + 3, { width: colWidths[i] - 10, align });
      x += colWidths[i];
    });
    y += rowHeight;
  }

  // Grid — medium blue
  doc.lineWidth(0.5).strokeColor(C.blueMid);
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

/** Status pill — light blue background, dark blue text. */
function drawStatusPill(doc: PDFKit.PDFDocument, status: string, x: number, y: number) {
  const text = status.charAt(0).toUpperCase() + status.slice(1);
  doc.font("Helvetica-Bold").fontSize(8.5);
  const w = doc.widthOfString(text) + 20;
  doc.roundedRect(x - w, y, w, 18, 9).fill(C.blueLight);
  doc.fillColor(C.blueDark).text(text, x - w + 10, y + 5, { width: w - 20, align: "center" });
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
    .strokeColor(C.blueMid)
    .stroke();

  if (pageNumber > 1) {
    // Continuation header — compact, keeps the document branded
    const tag = `INVOICE · ${bill.billNumber || "—"}`;
    doc.font("Helvetica-Bold").fontSize(8).fillColor(C.blueDark);
    const tagW = doc.widthOfString(tag);
    doc.roundedRect(pageWidth - MARGIN - tagW - 12, 22, tagW + 24, 16, 8).fill(C.blueLight);
    doc.text(tag, pageWidth - MARGIN - tagW - 6, 26);
    doc.moveTo(MARGIN, 46).lineTo(pageWidth - MARGIN, 46).lineWidth(0.75).strokeColor(C.blueMid).stroke();
    return;
  }

  const bandX = BORDER_INSET;
  const bandY = 14;
  const bandW = pageWidth - BORDER_INSET * 2;
  const bandH = 58;

  // Header band — light blue card with a medium blue bottom edge
  doc.roundedRect(bandX, bandY, bandW, bandH, 8).fill(C.blueLight);
  doc.moveTo(bandX, bandY + bandH).lineTo(bandX + bandW, bandY + bandH)
    .lineWidth(2)
    .strokeColor(C.blue)
    .stroke();

  // Logo (top-left corner of the band)
  const logo = loadLogo();
  const logoSize = 36;
  const logoRight = logo ? bandX + 16 + logoSize + 12 : bandX + 20;
  if (logo) {
    try {
      doc.image(logo, bandX + 16, bandY + 13, { width: logoSize, height: logoSize });
    } catch {
      // Ignore broken logo bytes and fall back to text-only header.
    }
  }

  const headerX = logoRight;
  const headerTextWidth = pageWidth - headerX - 170;

  const companyName = company.name || "My Clinic";
  doc.font("Helvetica-Bold").fontSize(14).fillColor(C.blueDark);
  doc.text(companyName, headerX, bandY + 7, { width: headerTextWidth });

  const clinicLines: string[] = [];
  if (company.address) clinicLines.push(company.address);
  const contactBits: string[] = [];
  if (company.phone) contactBits.push(`Ph: ${company.phone}`);
  if (company.email) contactBits.push(company.email);
  if (company.website) contactBits.push(company.website);

  let cy = bandY + 21;
  doc.font("Helvetica").fontSize(7.5).fillColor(C.ink);
  for (const line of clinicLines) {
    doc.text(line, headerX, cy, { width: headerTextWidth });
    cy += 8.5;
  }
  if (contactBits.length) {
    doc.text(contactBits.join("  ·  "), headerX, cy, { width: headerTextWidth });
  }

  // Invoice title (right of band)
  const title = "INVOICE";
  doc.font("Helvetica-Bold").fontSize(19).fillColor(C.blue);
  const titleW = doc.widthOfString(title);
  doc.text(title, pageWidth - MARGIN - titleW, bandY + 5);

  const billNo = bill.billNumber || "—";
  doc.font("Helvetica").fontSize(10).fillColor(C.ink);
  const bnW = doc.widthOfString(billNo);
  doc.text(billNo, pageWidth - MARGIN - bnW, bandY + 26);

  if (bill.status) {
    drawStatusPill(doc, bill.status, pageWidth - MARGIN, bandY + 39);
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
    if (y + needed <= pageHeight - 84) return;
    doc.addPage();
    pageNo += 1;
    decoratePage(doc, pageWidth, pageHeight, pageNo, company, bill);
    y = 52;
  }

  decoratePage(doc, pageWidth, pageHeight, 1, company, bill);

  y = 14 + 58 + 11;

  // Billed To (left) — patient details
  const patient = visit.patient;
  const patientAgeGender = [
    patient?.age ? `${patient.age} yrs` : "",
    patient?.gender ? String(patient.gender) : "",
  ]
    .filter(Boolean)
    .join(" / ");

  metaLabel(doc, "BILLED TO", MARGIN, y);
  y += 11;
  doc.font("Helvetica-Bold").fontSize(11.5).fillColor(C.ink);
  doc.text(bill.patientName || "—", MARGIN, y);
  y += 13;
  const billedToLines: string[] = [];
  if (bill.patientPhone) billedToLines.push(bill.patientPhone);
  if (patientAgeGender) billedToLines.push(patientAgeGender);
  if (patient?.email) billedToLines.push(String(patient.email));
  for (const line of billedToLines) {
    doc.font("Helvetica").fontSize(9.5).fillColor(C.ink).text(line, MARGIN, y);
    y += 11;
  }
  y -= 1;

  // Meta (right) — DATE / DOCTOR / PAYMENT
  const metaRightX = pageWidth - MARGIN - 170;
  const metaEnd = drawMetaRows(doc, [
    ["DATE", formatDate(bill.date)],
    ["DOCTOR", bill.doctorName || "—"],
    ["PAYMENT", bill.paymentMethod || "—"],
  ], metaRightX, 14 + 58 + 11 - 11, 17);

  y = Math.max(y, metaEnd) + 5;

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
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.blueDark).text(l.toUpperCase(), MARGIN, apptY, { width: 110 });
      doc.font("Helvetica").fontSize(9).fillColor(C.ink).text(v, MARGIN + 118, apptY, { width: 320 });
      apptY += 11;
    }
    y = apptY + 3;
  }

  const prescriptions = Array.isArray(visit.prescriptions) ? visit.prescriptions : [];
  if (prescriptions.length) {
    ensureSpace(80);
    y = sectionHeading(doc, "Prescription & Medicines", MARGIN, y, pageWidth - MARGIN);
    for (const p of prescriptions) {
      ensureSpace(70);
      doc.font("Helvetica-Bold").fontSize(9.5).fillColor(C.blueDark).text(
        p.diagnosis ? `Diagnosis: ${p.diagnosis}` : "Prescription",
        MARGIN, y
      );
      y += 11;
      const metaBits: string[] = [];
      if (p.visitDate) metaBits.push(`Visit: ${formatDate(String(p.visitDate))}`);
      if (p.doctorName) metaBits.push(`Doctor: ${p.doctorName}`);
      if (p.followUpDate) metaBits.push(`Follow-up: ${formatDate(String(p.followUpDate))}`);
      if (metaBits.length) {
        doc.font("Helvetica").fontSize(8).fillColor(C.ink).text(metaBits.join("  ·  "), MARGIN, y, { width: contentWidth });
        y += 10;
      }
      if (p.symptoms) {
        doc.font("Helvetica-Bold").fontSize(8).fillColor(C.blueDark).text("Symptoms / Notes:", MARGIN, y, { width: 110 });
        doc.font("Helvetica").fontSize(9).fillColor(C.ink).text(String(p.symptoms), MARGIN + 115, y, { width: contentWidth - 115 });
        y += 12;
      }
      if (p.testsRecommended) {
        doc.font("Helvetica-Bold").fontSize(8).fillColor(C.blueDark).text("Tests Recommended:", MARGIN, y, { width: 110 });
        doc.font("Helvetica").fontSize(9).fillColor(C.ink).text(String(p.testsRecommended), MARGIN + 115, y, { width: contentWidth - 115 });
        y += 12;
      }

      const medicines = Array.isArray(p.medicines) ? p.medicines.filter((m) => m?.name) : [];
      if (medicines.length) {
        ensureSpace(28 + medicines.length * 14);
        const headers = ["Medicine", "Frequency", "Duration", "Before / After Food", "Instructions"];
        const colWidths = [160, 90, 80, 110, 190];
        const rows = medicines.map((m) => [
          String(m.name ?? "—"),
          String(m.frequency ?? "—"),
          String(m.duration ?? "—"),
          String(m.beforeAfterFood ?? "—"),
          String(m.specialInstructions ?? "—"),
        ]);
        y = drawSimpleTable(doc, headers, rows, colWidths, MARGIN, y, 14, []);
        y += 4;
      } else {
        doc.font("Helvetica").fontSize(9).fillColor(C.ink).text("No medicines listed.", MARGIN, y, { width: contentWidth });
        y += 14;
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
      15,
      []
    );
    y += 5;
  }

  // Items table
  const items = Array.isArray(bill.items) ? bill.items : [];
  const itemsRowHeight = 14;
  ensureSpace(18 + 17 + itemsRowHeight * Math.max(items.length, 1) + 8);
  y = sectionHeading(doc, "Bill Items", MARGIN, y, pageWidth - MARGIN);
  const cols = {
    idx: { x: MARGIN, w: 28 },
    item: { x: MARGIN + 28, w: contentWidth - 28 - 44 - 66 - 70 },
    qty: { x: pageWidth - MARGIN - 180, w: 44 },
    price: { x: pageWidth - MARGIN - 136, w: 66 },
    amount: { x: pageWidth - MARGIN - 70, w: 70 },
  };

  doc.rect(MARGIN, y, contentWidth, 17).fill(C.blueLight);
  doc.font("Helvetica-Bold").fontSize(8).fillColor(C.blueDark);
  doc.text("#", cols.idx.x + 8, y + 4.5);
  doc.text("ITEM / SERVICE", cols.item.x + 8, y + 4.5, { width: cols.item.w - 8 });
  doc.text("QTY", cols.qty.x + 8, y + 4.5, { width: cols.qty.w - 8, align: "center" });
  doc.text("PRICE", cols.price.x + 8, y + 4.5, { width: cols.price.w - 8, align: "right" });
  doc.text("AMOUNT", cols.amount.x + 8, y + 4.5, { width: cols.amount.w - 8, align: "right" });

  let itemRowY = y + 17;
  const itemTableBottom = itemRowY + items.length * itemsRowHeight;

  if (!items.length) {
    doc.font("Helvetica").fontSize(9).fillColor(C.ink).text("No items", MARGIN + 8, itemRowY + 4);
    itemRowY += 17;
  } else {
    items.forEach((item, i) => {
      const rowBottom = itemRowY + itemsRowHeight;
      if (i % 2 === 1) {
        doc.rect(MARGIN, itemRowY, contentWidth, itemsRowHeight).fill(C.blueLight);
      }
      doc.font("Helvetica").fontSize(8.5).fillColor(C.ink);
      doc.text(String(i + 1), cols.idx.x + 8, itemRowY + 3.5, { width: cols.idx.w - 8, align: "center" });
      doc.text(item.name || "—", cols.item.x + 8, itemRowY + 3.5, { width: cols.item.w - 8 });
      doc.text(String(item.qty ?? 0), cols.qty.x + 8, itemRowY + 3.5, { width: cols.qty.w - 8, align: "center" });
      doc.text(inr(item.price ?? 0), cols.price.x + 8, itemRowY + 3.5, { width: cols.price.w - 8, align: "right" });
      doc.font("Helvetica-Bold").text(inr(item.amount ?? 0), cols.amount.x + 8, itemRowY + 3.5, { width: cols.amount.w - 8, align: "right" });
      itemRowY = rowBottom;
    });
  }

  // Items table grid — medium blue
  doc.lineWidth(0.5).strokeColor(C.blueMid);
  doc.moveTo(MARGIN, y).lineTo(MARGIN + contentWidth, y).stroke();
  doc.moveTo(MARGIN, y + 17).lineTo(MARGIN + contentWidth, y + 17).stroke();
  doc.moveTo(MARGIN, itemTableBottom).lineTo(MARGIN + contentWidth, itemTableBottom).stroke();
  for (const col of [cols.idx, cols.item, cols.qty, cols.price]) {
    doc.moveTo(col.x + col.w, y).lineTo(col.x + col.w, itemTableBottom).stroke();
  }

  // Totals — keep the whole block (rows + grand total + words + notes) with
  // the footer: if it can't fit above the footer line, flow it to the next page.
  const totalsX = pageWidth - MARGIN - 230;
  const totalsW = 230;
  let tY = itemRowY + 7;
  const totalRows: [string, string][] = [
    ["Subtotal", inr(bill.subtotal ?? 0)],
  ];
  if ((bill.discount ?? 0) > 0)
    totalRows.push(["Discount", `− ${inr(bill.discount ?? 0)}`]);
  if ((bill.tax ?? 0) > 0)
    totalRows.push([`Tax (${bill.taxRate ?? 0}%)`, inr(bill.tax ?? 0)]);

  const totalsBlockH = 12 * totalRows.length + 24 + 5 + 22 + 2 + 16 + 12 + 6;
  y = tY;
  ensureSpace(totalsBlockH);
  tY = y;
  for (const [l, v] of totalRows) {
    doc.font("Helvetica").fontSize(9.5).fillColor(C.ink).text(l, totalsX, tY, { width: totalsW - 90 });
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(C.ink).text(v, totalsX + totalsW - 90, tY, { width: 86, align: "right" });
    tY += 12;
  }

  // Grand total — filled blue box, white text
  const grandH = 24;
  doc.roundedRect(totalsX - 10, tY, totalsW + 20, grandH, 5).fill(C.blue);
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#ffffff");
  doc.text("GRAND TOTAL", totalsX - 10 + 16, tY + 6.5, { width: totalsW - 60 });
  doc.text(inr(bill.total ?? 0), totalsX + 10 + 14, tY + 6.5, { width: totalsW - 40, align: "right" });
  tY += grandH + 5;

  // Amount in words — light blue band
  doc.roundedRect(MARGIN, tY, contentWidth, 22, 5).fill(C.blueLight).lineWidth(0.75).strokeColor(C.blueMid).stroke();
  metaLabel(doc, "AMOUNT IN WORDS", MARGIN + 14, tY + 2);
  doc.font("Helvetica").fontSize(9).fillColor(C.ink).text(
    amountInWords(bill.total ?? 0),
    MARGIN + 14,
    tY + 12,
    { width: contentWidth - 28 }
  );
  tY += 22;

  y = tY + 2;

  // Notes
  if (bill.notes) {
    ensureSpace(18 + 13 + 16);
    y = sectionHeading(doc, "Notes", MARGIN, y, pageWidth - MARGIN);
    doc.font("Helvetica").fontSize(9.5).fillColor(C.ink).text(bill.notes, MARGIN, y, { width: contentWidth });
    y += 16;
  } else {
    y += 12;
  }

  // Footer (inside border)
  const footer = `Thank you for visiting ${companyName} · Generated on ${formatDate(new Date().toISOString())}`;
  if (y > pageHeight - 90) {
    ensureSpace(80);
  }
  doc.moveTo(MARGIN, pageHeight - 68).lineTo(pageWidth - MARGIN, pageHeight - 68)
    .lineWidth(0.5)
    .strokeColor(C.blueMid)
    .stroke();
  doc.font("Helvetica").fontSize(8).fillColor(C.ink).text(
    footer,
    MARGIN,
    pageHeight - 58,
    { width: contentWidth, align: "center" }
  );

  doc.end();
  return done;
}