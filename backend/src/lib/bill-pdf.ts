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
  discount?: number;
  taxPercent?: number;
}

export interface Bill {
  billNumber?: string | null;
  patientId?: string | null;
  patientName?: string | null;
  patientPhone?: string | null;
  patientEmail?: string | null;
  patientAge?: number | null;
  patientGender?: string | null;
  patientAddress?: string | null;
  patientBloodGroup?: string | null;
  doctorId?: string | null;
  doctorName?: string | null;
  date?: string | null;
  invoiceDate?: string | null;
  dueDate?: string | null;
  paidAt?: string | null;
  reference?: string | null;
  items?: BillItem[];
  subtotal?: number;
  discount?: number;
  taxRate?: number;
  tax?: number;
  total?: number;
  amountPaid?: number;
  balanceDue?: number;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  status?: string | null;
  notes?: string | null;
  terms?: string | null;
  generatedBy?: string | null;
  currency?: string | null;
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

// Premium executive palette — deep navy, royal blue, gold accents
const C = {
  navy: "#0A1F44",
  royal: "#1D4ED8",
  gold: "#C9A227",
  goldSoft: "#E6D08A",
  green: "#16A34A",
  amber: "#B45309",
  red: "#DC2626",
  ink: "#101828",
  muted: "#4B5563",
  faint: "#6B7280",
  grid: "#C7D2E4",
  hairline: "#E2E8F0",
  band: "#F4F7FC",
  white: "#FFFFFF",
  frost: "#AEBFD9",
};

const STATUS_STYLES: Record<string, { fill: string; text: string }> = {
  paid: { fill: "#16A34A", text: "#FFFFFF" },
  partial: { fill: "#D97706", text: "#FFFFFF" },
  unpaid: { fill: "#DC2626", text: "#FFFFFF" },
  draft: { fill: "#64748B", text: "#FFFFFF" },
  issued: { fill: "#1D4ED8", text: "#FFFFFF" },
  void: { fill: "#475569", text: "#FFFFFF" },
  cancelled: { fill: "#EF4444", text: "#FFFFFF" },
  pending: { fill: "#F59E0B", text: "#FFFFFF" },
};

function inr(value: number, currency = "Rs.") {
  const n = Number.isFinite(value) ? value : 0;
  return (
    currency +
    " " +
    n.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
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

/** Section label with a gold rule running to the content edge. */
function sectionHeading(doc: PDFKit.PDFDocument, text: string, x: number, y: number, lineTo: number) {
  doc.font("Helvetica-Bold").fontSize(9).fillColor(C.navy).text(text.toUpperCase(), x, y);
  const labelEnd = x + doc.widthOfString(text.toUpperCase());
  doc.moveTo(labelEnd + 12, y + 10)
    .lineTo(lineTo, y + 10)
    .lineWidth(1.2)
    .strokeColor(C.gold)
    .stroke();
  return y + 22;
}

/** Uppercase gold micro-label above a value. */
function metaLabel(doc: PDFKit.PDFDocument, label: string, x: number, y: number) {
  doc.font("Helvetica-Bold").fontSize(6.5).fillColor(C.gold).text(label.toUpperCase(), x, y);
}

/** Rounded info panel — soft blue-gray surface, thin border, navy title. */
function panelShell(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string
) {
  doc.roundedRect(x, y, w, h, 7).fill(C.band).lineWidth(0.75).strokeColor(C.grid).stroke();
  doc.font("Helvetica-Bold").fontSize(8).fillColor(C.navy).text(label, x + 12, y + 10);
  doc.moveTo(x + 12, y + 21).lineTo(x + 38, y + 21).lineWidth(1.5).strokeColor(C.gold).stroke();
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

/** Status pill — green paid, amber partial, red unpaid, slate otherwise. */
function drawStatusPill(doc: PDFKit.PDFDocument, text: string, x: number, y: number, align: "left" | "right" = "left") {
  const style = STATUS_STYLES[text] ?? { fill: C.band, text: C.ink };
  doc.font("Helvetica-Bold").fontSize(8.5);
  const w = doc.widthOfString(text.toUpperCase()) + 22;
  const px = align === "right" ? x - w : x;
  doc.roundedRect(px, y, w, 18, 9).fill(style.fill);
  doc.fillColor(style.text).text(text.toUpperCase(), px + 11, y + 5, { width: w - 22, align: "center" });
}

/** Dotted leader line between a label and its value. */
function dotLeader(doc: PDFKit.PDFDocument, x1: number, x2: number, y: number) {
  doc.lineWidth(0.6).strokeColor(C.grid);
  for (let x = x1; x < x2 - 4; x += 7) {
    doc.moveTo(x, y).lineTo(x + 3, y).stroke();
  }
}

/**
 * Premium items table — navy header with gold separators, zebra rows, and
 * row-level page breaking (the header repeats on a new page).
 */
function drawItemsTable(
  doc: PDFKit.PDFDocument,
  headers: string[],
  rows: { cells: string[]; right: number[] }[],
  colWidths: number[],
  startX: number,
  startY: number,
  ensureSpace: (n: number) => void
): number {
  const totalW = colWidths.reduce((s, w) => s + w, 0);
  const headerH = 22;
  let y = startY;

  const drawHeader = () => {
    doc.rect(startX, y, totalW, headerH).fill(C.navy);
    let x = startX;
    headers.forEach((h, i) => {
      const w = colWidths[i];
      if (w <= 0) return;
      const align = rows[0]?.right.includes(i) ? "right" : "left";
      doc.font("Helvetica-Bold").fontSize(7).fillColor(i === 1 ? C.goldSoft : C.white);
      const pad = i === 0 ? 6 : 4;
      doc.text(h, x + pad, y + 7, { width: w - pad * 2, align });
      x += w;
    });
    // Gold separators between columns
    doc.lineWidth(0.6);
    let sx = startX;
    for (let i = 1; i < colWidths.length - 1; i++) {
      const w = colWidths[i - 1];
      if (w <= 0) continue;
      sx += w;
      doc.moveTo(sx, y + 3).lineTo(sx, y + headerH - 3).strokeColor(C.royal).stroke();
    }
    doc.moveTo(startX, y + headerH).lineTo(startX + totalW, y + headerH).lineWidth(1).strokeColor(C.gold).stroke();
  };

  drawHeader();
  y += headerH;

  rows.forEach((row, ri) => {
    doc.font("Helvetica").fontSize(8.5);
    const heights = row.cells.map((cell, i) =>
      Math.max(1, cellLines(doc, cell, colWidths[i] - 10))
    );
    const maxLines = Math.max(...heights, 1);
    const rowH = Math.max(16, maxLines * 10.5 + 4);
    if (y + rowH > 730) {
      ensureSpace(headerH + rowH + 4);
      y += 8;
      drawHeader();
      y += headerH;
    }
    if (ri % 2 === 1) {
      doc.rect(startX, y, totalW, rowH).fill(C.band);
    }
    doc.font("Helvetica").fontSize(8.5).fillColor(C.ink);
    let x = startX;
    row.cells.forEach((cell, i) => {
      const align = row.right.includes(i) ? "right" : "left";
      const pad = i === 0 ? 6 : 4;
      doc.text(cell, x + pad, y + 2.5, { width: colWidths[i] - pad * 2, align, lineBreak: true });
      x += colWidths[i];
    });
    y += rowH;
  });

  // Bottom rule + column rules
  doc.lineWidth(0.6).strokeColor(C.grid);
  doc.moveTo(startX, y).lineTo(startX + totalW, y).stroke();
  doc.moveTo(startX, startY).lineTo(startX + totalW, startY).stroke();
  let vx = startX;
  for (const w of colWidths) {
    vx += w;
    doc.moveTo(vx, startY).lineTo(vx, y).stroke();
  }
  return y;
}

/**
 * Border + header. The frame repeats on every page; continuation pages get a
 * compact branded header.
 */
function decoratePage(
  doc: PDFKit.PDFDocument,
  pageWidth: number,
  pageHeight: number,
  pageNumber: number,
  company: OrganizationRecord,
  bill: Bill
) {
  // Outer navy frame
  doc.rect(BORDER_INSET, BORDER_INSET, pageWidth - BORDER_INSET * 2, pageHeight - BORDER_INSET * 2)
    .lineWidth(1.5)
    .strokeColor(C.navy)
    .stroke();
  // Inner gold hairline frame
  doc.rect(BORDER_INSET + 2.5, BORDER_INSET + 2.5, pageWidth - BORDER_INSET * 2 - 5, pageHeight - BORDER_INSET * 2 - 5)
    .lineWidth(0.5)
    .strokeColor(C.gold)
    .stroke();

  if (pageNumber > 1) {
    // Continuation header — compact branded band
    doc.rect(BORDER_INSET, 14, pageWidth - BORDER_INSET * 2, 34).fill(C.navy);
    doc.rect(BORDER_INSET, 48, pageWidth - BORDER_INSET * 2, 2).fill(C.gold);
    const tag = `INVOICE · ${bill.billNumber || "—"} · Page ${pageNumber}`;
    doc.font("Helvetica-Bold").fontSize(8).fillColor(C.goldSoft);
    doc.text(tag, MARGIN, 25, { width: pageWidth - MARGIN * 2, align: "right" });
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(C.white);
    doc.text(company.name || "My Clinic", MARGIN, 25, { width: pageWidth - MARGIN * 2 - 150 });
    return;
  }

  const bandX = BORDER_INSET;
  const bandY = 14;
  const bandW = pageWidth - BORDER_INSET * 2;
  const bandH = 74;

  // Header band — deep navy with a gold accent rule on top
  doc.rect(bandX, bandY, bandW, 2).fill(C.gold);
  doc.rect(bandX, bandY + 2, bandW, bandH - 2).fill(C.navy);

  // Logo chip
  const logo = loadLogo();
  const chipX = 24;
  const chipY = bandY + 15;
  const chipSize = 44;
  doc.roundedRect(chipX, chipY, chipSize, chipSize, 9).fill(C.white);
  const companyName = company.name || "My Clinic";
  let headerX = chipX + chipSize + 14;
  if (logo) {
    try {
      doc.image(logo, chipX + 2, chipY + 2, { width: chipSize - 4, height: chipSize - 4 });
    } catch {
      headerX = chipX + chipSize + 14;
      drawInitial(doc, companyName, chipX, chipY, chipSize);
    }
  } else {
    drawInitial(doc, companyName, chipX, chipY, chipSize);
  }

  // Company identity
  const headerTextWidth = pageWidth - headerX - 190;
  doc.font("Helvetica-Bold").fontSize(15).fillColor(C.white);
  doc.text(companyName, headerX, bandY + 10, { width: headerTextWidth });
  const contactBits: string[] = [];
  if (company.phone) contactBits.push(`Ph: ${company.phone}`);
  if (company.email) contactBits.push(company.email);
  if (company.website) contactBits.push(company.website);
  doc.font("Helvetica").fontSize(7.5).fillColor(C.frost);
  if (company.address) doc.text(company.address, headerX, bandY + 28, { width: headerTextWidth });
  if (contactBits.length) {
    doc.text(contactBits.join("  ·  "), headerX, bandY + 39, { width: headerTextWidth });
  }

  // Invoice title — gold, right side
  doc.font("Helvetica-Bold").fontSize(21).fillColor(C.gold);
  const title = "TAX INVOICE";
  const titleW = doc.widthOfString(title);
  doc.text(title, pageWidth - MARGIN - titleW, bandY + 8);

  // Invoice number chip
  const billNo = bill.billNumber || "—";
  doc.font("Helvetica-Bold").fontSize(9);
  const bnW = doc.widthOfString(billNo);
  doc.roundedRect(pageWidth - MARGIN - bnW - 20, bandY + 34, bnW + 20, 18, 9).fill(C.royal);
  doc.fillColor(C.white).text(billNo, pageWidth - MARGIN - bnW - 10, bandY + 39);

  // Payment status pill
  const statusText = bill.paymentStatus ?? bill.status ?? "";
  if (statusText) {
    drawStatusPill(doc, statusText, pageWidth - MARGIN, bandY + 56, "right");
  }

  // Accent stripe under the band
  doc.rect(bandX, bandY + bandH, bandW, 3).fill(C.royal);
  doc.rect(bandX, bandY + bandH + 3, bandW, 0.75).fill(C.gold);
}

function drawInitial(
  doc: PDFKit.PDFDocument,
  name: string,
  x: number,
  y: number,
  size: number
) {
  const initial = (name.trim().charAt(0) || "M").toUpperCase();
  doc.circle(x + size / 2, y + size / 2, size / 2 - 2).fill(C.gold);
  doc.fillColor(C.navy).font("Helvetica-Bold").fontSize(20);
  doc.text(initial, x + size / 2 - 6, y + size / 2 - 10, { width: 12, align: "center" });
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
  const currency = bill.currency ?? "Rs.";

  let pageNo = 1;
  let y = 0;

  function ensureSpace(needed: number) {
    if (y + needed <= pageHeight - 84) return;
    doc.addPage();
    pageNo += 1;
    decoratePage(doc, pageWidth, pageHeight, pageNo, company, bill);
    y = 52;
  }

  decoratePage(doc, pageWidth, pageHeight, 1, company, bill);

  y = 14 + 74 + 11;

  // ── Billed To panel ──────────────────────────────────────────────────────
  const patient = visit.patient;
  const patientAgeGender = [
    bill.patientAge ?? patient?.age ?? "",
    bill.patientGender ?? patient?.gender ?? "",
  ]
    .filter(Boolean)
    .join(" / ");

  const billedToLines: string[] = [];
  if (bill.patientPhone) billedToLines.push(String(bill.patientPhone));
  if (patientAgeGender) billedToLines.push(patientAgeGender);
  if (bill.patientEmail ?? patient?.email) billedToLines.push(String(bill.patientEmail ?? patient?.email));
  if (bill.patientAddress) billedToLines.push(String(bill.patientAddress));
  if (bill.patientId) billedToLines.push(`Patient ID: ${bill.patientId.slice(-8).toUpperCase()}`);

  const leftW = 300;
  const rightW = contentWidth - leftW - 8;
  const panelY = y;
  const avatarSize = 28;

  doc.font("Helvetica").fontSize(8.5);
  const metaRows = billedToLines.map((l) => Math.max(1, cellLines(doc, l, leftW - 78)));
  const leftH =
    40 +
    metaRows.reduce((s, n) => s + n * 11.5, 0) +
    (bill.patientBloodGroup ? 18 : 0) +
    12;
  const rightRows: [string, string][] = [
    ["INVOICE NO.", bill.billNumber || "—"],
    ["DATE", formatDate(bill.invoiceDate ?? bill.date)],
    ["DUE DATE", formatDate(bill.dueDate)],
  ];
  if (bill.paidAt) rightRows.push(["PAID ON", formatDate(bill.paidAt)]);
  if (bill.reference) rightRows.push(["REFERENCE", String(bill.reference)]);
  if (bill.doctorName) rightRows.push(["DOCTOR", String(bill.doctorName)]);
  if (bill.paymentMethod) rightRows.push(["PAYMENT", String(bill.paymentMethod)]);
  const rightH = 32 + rightRows.length * 20 - 4 + 6;

  panelShell(doc, MARGIN, panelY, leftW, leftH, "BILLED TO");
  // Avatar circle with initial
  const initial = ((bill.patientName ?? "").trim().charAt(0) || "P").toUpperCase();
  doc.circle(MARGIN + 22, panelY + 42, avatarSize / 2).fill(C.navy);
  doc.fillColor(C.gold).font("Helvetica-Bold").fontSize(13);
  doc.text(initial, MARGIN + 22 - 4.5, panelY + 34, { width: 9, align: "center" });
  doc.font("Helvetica-Bold").fontSize(11.5).fillColor(C.ink);
  doc.text(bill.patientName || "—", MARGIN + 44, panelY + 34, { width: leftW - 60 });
  let leftY = panelY + 52;
  doc.font("Helvetica").fontSize(8.5).fillColor(C.muted);
  for (const line of billedToLines) {
    doc.text(line, MARGIN + 44, leftY, { width: leftW - 60 });
    leftY += Math.max(1, cellLines(doc, line, leftW - 60)) * 11.5;
  }
  if (bill.patientBloodGroup) {
    const bg = String(bill.patientBloodGroup).toUpperCase();
    doc.font("Helvetica-Bold").fontSize(7.5);
    const bgW = doc.widthOfString(bg) + 14;
    doc.roundedRect(MARGIN + 44, leftY + 2, bgW, 14, 7).fill(C.white).lineWidth(0.75).strokeColor(C.red).stroke();
    doc.fillColor(C.red).text(bg, MARGIN + 44 + 7, leftY + 4, { width: bgW - 14, align: "center" });
  }

  panelShell(doc, pageWidth - MARGIN - rightW, panelY, rightW, rightH, "INVOICE & PAYMENT");
  let rightY = panelY + 30;
  for (const [l, v] of rightRows) {
    metaLabel(doc, l, pageWidth - MARGIN - rightW + 12, rightY);
    doc.font("Helvetica").fontSize(9).fillColor(C.ink).text(v, pageWidth - MARGIN - rightW + 12, rightY + 9, { width: rightW - 24 });
    rightY += 20;
  }

  // ── Payment summary strip ────────────────────────────────────────────────
  y = Math.max(panelY + leftH, panelY + rightH) + 10;
  const paymentStatus = bill.paymentStatus ?? "unpaid";
  const balanceDue = bill.balanceDue ?? Math.max(0, (bill.total ?? 0) - (bill.amountPaid ?? 0));
  const amountPaid = bill.amountPaid ?? 0;
  const boxes: {
    label: string;
    value: string;
    fill: string;
    text: string;
    accent: string;
  }[] = [
    {
      label: "TOTAL AMOUNT",
      value: inr(bill.total ?? 0, currency),
      fill: C.navy,
      text: C.white,
      accent: C.gold,
    },
    {
      label: "AMOUNT PAID",
      value: inr(amountPaid, currency),
      fill: paymentStatus === "paid" ? C.green : C.band,
      text: paymentStatus === "paid" ? C.white : C.ink,
      accent: paymentStatus === "paid" ? C.white : C.gold,
    },
    {
      label: "BALANCE DUE",
      value:
        paymentStatus === "paid"
          ? inr(0, currency)
          : inr(balanceDue, currency),
      fill: paymentStatus === "paid" ? C.green : paymentStatus === "partial" ? C.amber : C.red,
      text: C.white,
      accent: C.white,
    },
  ];
  const boxW = (contentWidth - 16) / 3;
  boxes.forEach((box, i) => {
    const bx = MARGIN + i * (boxW + 8);
    ensureSpace(52);
    doc.roundedRect(bx, y, boxW, 44, 6).fill(box.fill);
    doc.rect(bx, y, boxW, 2.5).fill(box.accent);
    doc.font("Helvetica-Bold").fontSize(6.5).fillColor(box.text);
    doc.text(box.label, bx + 12, y + 9, { width: boxW - 24 });
    doc.font("Helvetica-Bold").fontSize(13).fillColor(box.text);
    doc.text(box.value, bx + 12, y + 21, { width: boxW - 24 });
  });
  y += 44 + 10;

  // ── Appointment details ──────────────────────────────────────────────────
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

  // ── Prescriptions & medicines ────────────────────────────────────────────
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
        const headers = ["Medicine", "Frequency", "Duration", "Before / After Food", "Instructions"];
        const colWidths = [150, 80, 70, 100, 94];
        const rows = medicines.map((m) => ({
          cells: [
            String(m.name ?? "—"),
            String(m.frequency ?? "—"),
            String(m.duration ?? "—"),
            String(m.beforeAfterFood ?? "—"),
            String(m.specialInstructions ?? "—"),
          ],
          right: [],
        }));
        ensureSpace(28 + rows.length * 14);
        y = drawItemsTable(doc, ["Medicine", "Frequency", "Duration", "Before / After Food", "Instructions"], rows, colWidths, MARGIN, y, ensureSpace);
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
    y = drawItemsTable(
      doc,
      ["#", "Doctor"],
      doctors.map((d, i) => ({ cells: [String(i + 1), String(d.name ?? "—")], right: [] })),
      [40, contentWidth - 40],
      MARGIN,
      y,
      ensureSpace
    );
    y += 4;
  }

  // ── Bill items table ─────────────────────────────────────────────────────
  const items = Array.isArray(bill.items) ? bill.items : [];
  ensureSpace(18 + 22 + Math.max(1, items.length) * 16 + 8);
  y = sectionHeading(doc, "Bill Items", MARGIN, y, pageWidth - MARGIN);
  const fixed = 24 + 46 + 70 + 52 + 36 + 76;
  const itemCols = [24, contentWidth - fixed, 46, 70, 52, 36, 76];
  const itemRows = items.map((item, i) => ({
    cells: [
      String(i + 1),
      item.name || "—",
      String(item.qty ?? 0),
      inr(item.price ?? 0, currency),
      (item.discount ?? 0) > 0 ? `- ${inr(item.discount ?? 0, currency)}` : "—",
      (item.taxPercent ?? 0) > 0 ? `${item.taxPercent}%` : "—",
      inr(item.amount ?? 0, currency),
    ],
    right: [2, 3, 4, 5, 6],
  }));
  if (!itemRows.length) {
    itemRows.push({ cells: ["", "No items", "", "", "", "", ""], right: [] });
  }
  y = drawItemsTable(
    doc,
    ["#", "ITEM / SERVICE", "QTY", "PRICE", "DISC", "TAX", "AMOUNT"],
    itemRows,
    itemCols,
    MARGIN,
    y,
    ensureSpace
  );
  y += 5;

  // ── Totals panel + amount in words ───────────────────────────────────────
  const totalsX = pageWidth - MARGIN - 300;
  const totalsW = 300;
  const padX = 12;
  let tY = y + 4;
  const totalRows: [string, string, string][] = [
    ["Subtotal", inr(bill.subtotal ?? 0, currency), C.muted],
  ];
  if ((bill.discount ?? 0) > 0)
    totalRows.push(["Discount", `- ${inr(bill.discount ?? 0, currency)}`, C.red]);
  if ((bill.tax ?? 0) > 0)
    totalRows.push([`Tax (${bill.taxRate ?? 0}%)`, inr(bill.tax ?? 0, currency), C.muted]);
  if ((bill.amountPaid ?? 0) > 0 && paymentStatus !== "paid")
    totalRows.push(["Paid", inr(bill.amountPaid ?? 0, currency), C.green]);
  if (paymentStatus !== "paid" && balanceDue > 0)
    totalRows.push(["Balance Due", inr(balanceDue, currency), C.red]);

  const totalsBlockH = 12 + totalRows.length * 17 + 6 + 30 + 8;
  ensureSpace(totalsBlockH + 34 + 26 + 8);
  tY = y + 4;
  doc.roundedRect(totalsX, tY, totalsW, 12 + totalRows.length * 17 + 6 + 30 + 8, 7)
    .fill(C.band)
    .lineWidth(0.75)
    .strokeColor(C.grid)
    .stroke();
  tY += 12;
  for (const [l, v, color] of totalRows) {
    doc.font("Helvetica").fontSize(9.5).fillColor(C.muted);
    const lw = doc.widthOfString(l);
    doc.text(l, totalsX + padX, tY, { width: 120 });
    doc.font("Helvetica-Bold").fontSize(9.5);
    const vw = doc.widthOfString(v);
    const valueX = totalsX + totalsW - padX - vw;
    dotLeader(doc, totalsX + padX + lw + 4, valueX - 4, tY + 6);
    doc.fillColor(color).text(v, valueX, tY, { width: vw + 2 });
    tY += 17;
  }

  // Grand total — navy bar with gold label
  tY += 6;
  doc.roundedRect(totalsX + 4, tY, totalsW - 8, 30, 6).fill(C.navy);
  doc.rect(totalsX + 4, tY, totalsW - 8, 2).fill(C.gold);
  doc.font("Helvetica-Bold").fontSize(10.5).fillColor(C.gold);
  doc.text("GRAND TOTAL", totalsX + padX + 6, tY + 10, { width: 140 });
  doc.font("Helvetica-Bold").fontSize(13).fillColor(C.white);
  const gtW = doc.widthOfString(inr(bill.total ?? 0, currency));
  doc.text(inr(bill.total ?? 0, currency), totalsX + totalsW - padX - 8 - gtW, tY + 8, { width: gtW + 4, align: "right" });
  tY += 30 + 8;

  // Amount in words — gold-bordered band
  doc.roundedRect(MARGIN, tY, contentWidth, 26, 5).fill(C.white).lineWidth(1).strokeColor(C.gold).stroke();
  metaLabel(doc, "AMOUNT IN WORDS", MARGIN + 14, tY + 3);
  doc.font("Helvetica").fontSize(9).fillColor(C.ink).text(
    amountInWords(bill.total ?? 0),
    MARGIN + 14,
    tY + 13,
    { width: contentWidth - 28 }
  );
  tY += 26;

  y = tY + 2;

  // ── Notes ────────────────────────────────────────────────────────────────
  if (bill.notes) {
    ensureSpace(18 + 13 + 16);
    y = sectionHeading(doc, "Notes", MARGIN, y, pageWidth - MARGIN);
    doc.font("Helvetica").fontSize(9.5).fillColor(C.muted).text(bill.notes, MARGIN, y, { width: contentWidth });
    y += 18;
  } else {
    y += 14;
  }

  // ── Terms ────────────────────────────────────────────────────────────────
  const terms = bill.terms ?? `Payment is due within 7 days of the invoice date. This invoice is computer-generated and is valid without a physical signature. For queries, contact ${companyName}${company.phone ? ` at ${company.phone}` : ""}.`;
  ensureSpace(16 + 26 + 8);
  y = sectionHeading(doc, "Terms & Conditions", MARGIN, y, pageWidth - MARGIN);
  doc.font("Helvetica").fontSize(8).fillColor(C.faint).text(terms, MARGIN, y, { width: contentWidth });
  y += 24;

  // ── Signatures ───────────────────────────────────────────────────────────
  const footY = pageHeight - 66;
  if (y + 48 > footY - 6) {
    ensureSpace(56);
  }
  const sigW = 210;
  const sigY = Math.min(y + 16, footY - 44);
  doc.lineWidth(0.75).strokeColor(C.navy);
  doc.moveTo(MARGIN, sigY).lineTo(MARGIN + sigW, sigY).stroke();
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.navy).text("PATIENT SIGNATURE", MARGIN, sigY + 6, { width: sigW, align: "center" });
  doc.font("Helvetica").fontSize(7.5).fillColor(C.faint).text(bill.patientName || "Patient", MARGIN, sigY + 15, { width: sigW, align: "center" });
  const sigRight = pageWidth - MARGIN - sigW;
  doc.moveTo(sigRight, sigY).lineTo(sigRight + sigW, sigY).stroke();
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.navy).text("AUTHORIZED SIGNATORY", sigRight, sigY + 6, { width: sigW, align: "center" });
  doc.font("Helvetica").fontSize(7.5).fillColor(C.faint).text(companyName, sigRight, sigY + 15, { width: sigW, align: "center" });
  if (bill.generatedBy) {
    doc.font("Helvetica").fontSize(6.5).fillColor(C.faint).text(
      `Prepared by ${bill.generatedBy}`,
      MARGIN, sigY + 28, { width: contentWidth, align: "right" }
    );
  }

  // ── Footer band (every page) ─────────────────────────────────────────────
  const range = doc.bufferedPageRange();
  const totalPages = range.count;
  for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(i);
    const fTop = pageHeight - 56;
    doc.rect(MARGIN, fTop, contentWidth, 36).fill(C.navy);
    doc.rect(MARGIN, fTop, contentWidth, 2).fill(C.gold);
    doc.font("Helvetica-Bold").fontSize(9).fillColor(C.gold);
    doc.text(`Thank you for visiting ${companyName}`, MARGIN, fTop + 8, { width: contentWidth, align: "center" });
    doc.font("Helvetica").fontSize(7).fillColor(C.frost);
    doc.text(`Page ${i + 1} of ${totalPages}`, MARGIN + 8, fTop + 23);
    doc.text(`Generated on ${formatDate(new Date().toISOString())}`, MARGIN, fTop + 23, { width: contentWidth - 16, align: "center" });
    doc.text("This is a computer-generated invoice", MARGIN, fTop + 23, { width: contentWidth - 16, align: "right" });
  }

  doc.end();
  return done;
}