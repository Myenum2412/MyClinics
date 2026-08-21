import PDFDocument from "pdfkit";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { OrganizationRecord } from "@/services/customer/customer-context.service";

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

const loadLogo = (paths: string[]): Buffer | null => loadFirst(paths);

/** Business identity details from the reference invoice. */
const BUSINESS = {
  gstin: "33LEFPK7682L1ZR",
  udyam: "UDYAM-TN-20-0172636",
  email: "myenumam@gmail.com",
  placeOfSupply: "Tamil Nadu (33)",
  paymentTerms: "Due on Receipt",
  notes: "Thanks for your business.",
  terms: [
    "Payment to be settled only on bank modes using Cheque, NEFT, RTGS & IMPS.",
    "TDS for service charges on taxable value should follow the stated applicable requirements.",
    "Delayed payment may attract a late fee of ₹500 + GST 18%.",
    "E & OE.",
    "Subject to Salem Jurisdiction.",
  ],
};

interface BillItem {
  name?: string;
  qty?: number;
  price?: number;
  amount?: number;
  discount?: number;
  taxPercent?: number;
  hsnSac?: string;
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
  patientGstin?: string | null;
  doctorId?: string | null;
  doctorName?: string | null;
  date?: string | null;
  invoiceDate?: string | null;
  dueDate?: string | null;
  paidAt?: string | null;
  reference?: string | null;
  poNumber?: string | null;
  paymentTerms?: string | null;
  placeOfSupply?: string | null;
  gstin?: string | null;
  udyam?: string | null;
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
  upiId?: string | null;
  qrCodeUrl?: string | null;
  generatedBy?: string | null;
  currency?: string | null;
}

const MARGIN = 24;
const contentWidth = 595.28 - MARGIN * 2;

// Clean corporate palette — white, navy/blue accents, thin blue borders
const C = {
  navy: "#1E3A8A",
  blue: "#2563EB",
  border: "#B7C6DE",
  rule: "#D7E0F0",
  ink: "#111827",
  muted: "#4B5563",
  faint: "#6B7280",
  band: "#F4F7FD",
  white: "#FFFFFF",
};

function symbolOf(currency: string | null | undefined): string {
  const c = (currency ?? "").trim();
  // Indian rupee is always rendered with the ₹ symbol, never the ISO code.
  if (!c || c === "INR" || c === "Rs." || c === "Rs" || c === "₹") return "₹";
  return c;
}

function money(value: number, symbol = "₹"): string {
  const n = Number.isFinite(value) ? value : 0;
  return `${symbol}${n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
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
  let words = rupees ? numberToWords(rupees) : "Zero";
  if (paise) words += " and " + numberToWords(paise) + " Paise";
  return "Indian Rupees " + words + " Only";
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

/** Thin blue bordered rectangle section. */
function box(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number) {
  doc.rect(x, y, w, h).lineWidth(0.75).strokeColor(C.border).stroke();
}

/**
 * Header — logo + business identity left, TAX INVOICE + number right,
 * thin blue rule underneath. Continuation pages get a compact version.
 */
function decoratePage(
  doc: PDFKit.PDFDocument,
  pageNumber: number,
  company: OrganizationRecord,
  bill: Bill,
  title = "TAX INVOICE"
) {
  const companyName = company.name || "My Clinic";
  const gstin = bill.gstin ?? BUSINESS.gstin;
  const udyam = bill.udyam ?? BUSINESS.udyam;
  const email = company.email ?? BUSINESS.email;
  const billNo = bill.billNumber || "—";

  if (pageNumber > 1) {
    doc.font("bold").fontSize(10).fillColor(C.navy).text(companyName, MARGIN, 20);
    doc.font("regular").fontSize(7.5).fillColor(C.faint).text(
      `GSTIN: ${gstin}  ·  UDYAM: ${udyam}`,
      MARGIN, 33
    );
    doc.font("bold").fontSize(12).fillColor(C.navy).text(title, MARGIN, 22, {
      width: contentWidth,
      align: "right",
    });
    doc.font("bold").fontSize(8).fillColor(C.blue).text(billNo, MARGIN, 36, {
      width: contentWidth,
      align: "right",
    });
    doc.moveTo(MARGIN, 48).lineTo(MARGIN + contentWidth, 48).lineWidth(0.75).strokeColor(C.border).stroke();
    return;
  }

  const logo = loadFirst(LOGO_CANDIDATES);
  let textX = MARGIN;

  if (logo) {
    try {
      doc.rect(MARGIN, 26, 44, 44).lineWidth(0.75).strokeColor(C.border).stroke();
      doc.image(logo, MARGIN + 2, 28, { width: 40, height: 40 });
      textX = MARGIN + 56;
    } catch {
      textX = MARGIN;
    }
  }

  doc.font("bold").fontSize(13).fillColor(C.navy).text(companyName.toUpperCase(), textX, 27);
  doc.font("regular").fontSize(8).fillColor(C.muted).text(email, textX, 45);
  doc.font("regular").fontSize(8).fillColor(C.muted).text(`GSTIN: ${gstin}`, textX, 57);
  doc.font("regular").fontSize(8).fillColor(C.muted).text(`UDYAM: ${udyam}`, textX, 69);

  doc.font("bold").fontSize(22).fillColor(C.navy).text("TAX INVOICE", MARGIN, 27, {
    width: contentWidth,
    align: "right",
  });
  doc.font("bold").fontSize(10.5).fillColor(C.blue).text(billNo, MARGIN, 55, {
    width: contentWidth,
    align: "right",
  });

  doc.moveTo(MARGIN, 86).lineTo(MARGIN + contentWidth, 86).lineWidth(0.75).strokeColor(C.border).stroke();
}

/** Bordered two-column invoice-details section. */
function drawInvoiceDetails(
  doc: PDFKit.PDFDocument,
  y: number,
  bill: Bill
): number {
  const cells: [string, string][] = [
    ["Invoice Date", formatDate(bill.invoiceDate ?? bill.date)],
    ["Terms", bill.paymentTerms ?? BUSINESS.paymentTerms],
    ["Due Date", formatDate(bill.dueDate ?? bill.invoiceDate ?? bill.date)],
    ["P.O.#", bill.poNumber ?? bill.reference ?? "—"],
    ["Place of Supply", bill.placeOfSupply ?? BUSINESS.placeOfSupply],
  ];
  const colW = (contentWidth - 1) / 2;
  const rowH = 34;
  const leftCells = cells.slice(0, 3);
  const rightCells = cells.slice(3);
  const h = Math.max(leftCells.length, rightCells.length) * rowH + 18;
  const top = y;

  box(doc, MARGIN, top, contentWidth, h);
  doc.moveTo(MARGIN + colW, top + 1).lineTo(MARGIN + colW, top + h - 1)
    .lineWidth(0.75).strokeColor(C.border).stroke();

  const drawCol = (rows: [string, string][], x: number) => {
    rows.forEach(([label, value], i) => {
      const cy = top + 14 + i * rowH;
      doc.font("regular").fontSize(6.5).fillColor(C.faint).text(label.toUpperCase(), x, cy);
      doc.font("regular").fontSize(10).fillColor(C.ink).text(value, x, cy + 10, {
        width: colW - 24,
      });
    });
  };
  drawCol(leftCells, MARGIN + 14);
  drawCol(rightCells, MARGIN + colW + 14);

  return top + h;
}

/** Full-width BILL TO section. */
function drawBillTo(doc: PDFKit.PDFDocument, y: number, bill: Bill): number {
  const top = y;
  const h = 80;
  box(doc, MARGIN, top, contentWidth, h);

  doc.font("bold").fontSize(7.5).fillColor(C.navy).text("BILL TO", MARGIN + 14, top + 11);

  const gstinValue = bill.patientGstin ?? "N/A";
  doc.font("regular").fontSize(8).fillColor(C.faint).text("GSTIN:", MARGIN + 14, top + 26, {
    width: 90,
  });
  doc.font("bold").fontSize(9).fillColor(C.ink).text(gstinValue, MARGIN + 14 + 90, top + 26, {
    width: contentWidth - 120,
  });

  const nameY = top + 28;
  doc.font("bold").fontSize(11.5).fillColor(C.ink).text(bill.patientName || "—", MARGIN + 14, nameY, {
    width: contentWidth - 28,
  });
  const addrY = nameY + 17;
  if (bill.patientAddress) {
    const lines = Math.max(1, cellLines(doc, String(bill.patientAddress), contentWidth - 28));
    doc.font("regular").fontSize(8.5).fillColor(C.muted).text(
      String(bill.patientAddress),
      MARGIN + 14,
      addrY,
      { width: contentWidth - 28 }
    );
    return top + h + (lines > 1 ? (lines - 1) * 10 : 0);
  }
  return top + h;
}

/** Items table — navy header, thin rules, per-item CGST/SGST + totals row. */
function drawItemsTable(
  doc: PDFKit.PDFDocument,
  bill: Bill,
  symbol: string,
  startY: number,
  ensureSpace: (n: number) => void
): number {
  const headers = ["#", "ITEM & DESCRIPTION", "HSN/SAC", "QTY", "RATE", "CGST", "SGST", "AMOUNT"];
  const colWidths = [20, 207, 46, 36, 56, 62, 62, 58];
  const headerH = 24;
  const rightCols = new Set([3, 4, 5, 6, 7]);
  let y = startY;

  const items = Array.isArray(bill.items) ? bill.items : [];
  const rate = bill.taxRate ?? 0;
  const halfRate = rate / 2;
  const rows = items.map((item) => {
    const taxPct = item.taxPercent ?? rate;
    const half = taxPct / 2;
    const taxAmt = Number.isFinite(item.amount ?? NaN)
      ? Math.round((item.amount ?? 0) * (taxPct / 100) * 100) / 100
      : 0;
    const cgstAmt = Math.round((taxAmt / 2) * 100) / 100;
    const sgstAmt = taxAmt - cgstAmt;
    return {
      cells: [
        "",
        item.name || "—",
        item.hsnSac ?? "—",
        String((item.qty ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })),
        money(item.price ?? 0, symbol),
        taxPct > 0 ? `${half}% — ${money(cgstAmt, symbol)}` : "—",
        taxPct > 0 ? `${half}% — ${money(sgstAmt, symbol)}` : "—",
        money(item.amount ?? (item.qty ?? 0) * (item.price ?? 0), symbol),
      ],
      height: 0,
    };
  });

  const drawHeader = () => {
    doc.rect(MARGIN, y, contentWidth, headerH).fill(C.navy);
    let x = MARGIN;
    headers.forEach((h, i) => {
      if (colWidths[i] <= 0) return;
      doc.font("bold").fontSize(6.5).fillColor(C.white);
      doc.text(h, x + 6, y + 8.5, { width: colWidths[i] - 12, align: rightCols.has(i) ? "right" : "left" });
      x += colWidths[i];
    });
    y += headerH;
  };

  const rowHeight = (row: { cells: string[] }) => {
    doc.font("regular").fontSize(8);
    const lines = row.cells.map((cell, i) =>
      Math.max(1, cellLines(doc, cell, colWidths[i] - 10))
    );
    return Math.max(24, Math.max(...lines) * 10 + 10);
  };

  drawHeader();
  rows.forEach((row) => {
    const rh = rowHeight(row);
    if (y + rh > 720) {
      ensureSpace(headerH + rh + 6);
      y += 6;
      drawHeader();
    }
    doc.moveTo(MARGIN, y).lineTo(MARGIN + contentWidth, y).lineWidth(0.5).strokeColor(C.rule).stroke();
    doc.font("regular").fontSize(8).fillColor(C.ink);
    let x = MARGIN;
    row.cells.forEach((cell, i) => {
      const align = rightCols.has(i) ? "right" : "left";
      const pad = i === 0 ? 6 : 4;
      if (i === 5 || i === 6) doc.font("regular").fontSize(7);
      else doc.font("regular").fontSize(8);
      doc.text(cell, x + pad, y + 7, { width: colWidths[i] - pad * 2, align });
      x += colWidths[i];
    });
    y += rh;
  });

  const taxTotal = Number.isFinite(bill.tax ?? NaN) ? Math.round((bill.tax ?? 0) * 100) / 100 : 0;
  const cgstTotal = Math.round((taxTotal / 2) * 100) / 100;
  const sgstTotal = taxTotal - cgstTotal;
  const totalsCells = [
    "",
    "Total",
    "",
    "",
    money(bill.subtotal ?? 0, symbol),
    taxTotal > 0 ? money(cgstTotal, symbol) : "—",
    taxTotal > 0 ? money(sgstTotal, symbol) : "—",
    taxTotal > 0 ? money(taxTotal, symbol) : "—",
  ];
  if (y + 26 > 720) {
    ensureSpace(headerH + 26 + 6);
    y += 6;
    drawHeader();
  }
  doc.moveTo(MARGIN, y).lineTo(MARGIN + contentWidth, y).lineWidth(1).strokeColor(C.navy).stroke();
  doc.font("bold").fontSize(8).fillColor(C.ink);
  let x = MARGIN;
  totalsCells.forEach((cell, i) => {
    const align = rightCols.has(i) ? "right" : "left";
    const pad = i === 0 ? 6 : 4;
    doc.text(cell, x + pad, y + 8, { width: colWidths[i] - pad * 2, align });
    x += colWidths[i];
  });
  y += 26;
  doc.moveTo(MARGIN, y).lineTo(MARGIN + contentWidth, y).lineWidth(0.75).strokeColor(C.border).stroke();

  return y;
}

/** Right-side totals panel with prominent Total and Balance Due. */
function drawTotals(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  bill: Bill,
  symbol: string
): number {
  const rate = bill.taxRate ?? 0;
  const halfRate = rate / 2;
  const tax = Number.isFinite(bill.tax ?? NaN) ? Math.round((bill.tax ?? 0) * 100) / 100 : 0;
  const cgst = Math.round((tax / 2) * 100) / 100;
  const sgst = tax - cgst;
  const taxable = (bill.subtotal ?? 0) - (bill.discount ?? 0);
  const balanceDue = bill.balanceDue ?? Math.max(0, (bill.total ?? 0) - (bill.amountPaid ?? 0));

  const rows: [string, string, boolean][] = [
    ["Sub Total", money(bill.subtotal ?? 0, symbol), false],
    ["Total Taxable Amount", money(taxable, symbol), false],
  ];
  if ((bill.discount ?? 0) > 0) {
    rows.push(["Discount", `- ${money(bill.discount ?? 0, symbol)}`, false]);
  }
  if (tax > 0) {
    rows.push([`CGST ${halfRate}%`, money(cgst, symbol), false]);
    rows.push([`SGST ${halfRate}%`, money(sgst, symbol), false]);
  }

  const rowH = 22;
  const padX = 14;
  const h = 18 + rows.length * rowH + 20 + 26 + 6;

  box(doc, x, y, w, h);
  rows.forEach(([label, value], i) => {
    const ry = y + 18 + i * rowH;
    doc.font("regular").fontSize(8.5).fillColor(C.muted).text(label, x + padX, ry, { width: w - padX * 2 - 110 });
    doc.font("bold").fontSize(8.5).fillColor(C.ink).text(value, x + padX + (w - padX * 2 - 110), ry, {
      width: 110 - 6,
      align: "right",
    });
  });

  const totalY = y + 18 + rows.length * rowH + 6;
  doc.rect(x + 8, totalY, w - 16, 20).fill(C.band);
  doc.moveTo(x, totalY).lineTo(x + w, totalY).lineWidth(0.75).strokeColor(C.border).stroke();
  doc.font("bold").fontSize(11).fillColor(C.navy).text("Total", x + padX, totalY + 5.5, { width: 90 });
  doc.font("bold").fontSize(11).fillColor(C.navy).text(money(bill.total ?? 0, symbol), x + w - padX - 110, totalY + 5.5, {
    width: 110,
    align: "right",
  });

  const dueY = totalY + 20 + 8;
  doc.rect(x + 8, dueY, w - 16, 20).fill(C.band);
  doc.moveTo(x, dueY).lineTo(x + w, dueY).lineWidth(0.75).strokeColor(C.border).stroke();
  doc.font("bold").fontSize(11).fillColor(C.navy).text("Balance Due", x + padX, dueY + 5.5, { width: 120 });
  doc.font("bold").fontSize(11).fillColor(C.navy).text(money(balanceDue, symbol), x + w - padX - 110, dueY + 5.5, {
    width: 110,
    align: "right",
  });

  return y + h;
}

/** Left column on the invoice page — amount in words and notes. */
function drawLeftDetails(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  bill: Bill,
  company: OrganizationRecord
): number {
  const companyName = company.name || "My Clinic";
  const notes = bill.notes ?? BUSINESS.notes;

  const rows: [string, string][] = [
    ["Total in Words", amountInWords(bill.total ?? 0)],
    ["Notes", notes],
    ["Billed By", companyName],
  ];

  let cy = y;
  for (const [label, value] of rows) {
    doc.font("bold").fontSize(7).fillColor(C.navy).text(label.toUpperCase(), x, cy);
    const lines = Math.max(1, cellLines(doc, value, w));
    doc.font("regular").fontSize(8.5).fillColor(C.ink).text(value, x, cy + 11, { width: w });
    cy += 11 + lines * 12 + 10;
  }

  return cy;
}

/**
 * Page 2 — PAYMENT DETAILS: payment summary, UPI ID + QR code,
 * and the numbered terms & conditions.
 */
function drawPaymentPage(doc: PDFKit.PDFDocument, company: OrganizationRecord, bill: Bill): void {
  const symbol = symbolOf(bill.currency);
  const companyName = company.name || "My Clinic";
  const balanceDue = bill.balanceDue ?? Math.max(0, (bill.total ?? 0) - (bill.amountPaid ?? 0));
  const terms = bill.terms
    ? String(bill.terms).split(/\r?\n/).map((t) => t.trim()).filter(Boolean)
    : BUSINESS.terms;

  let y = 64;

  // ── Payment summary ───────────────────────────────────────────────────────
  const summaryRows: [string, string][] = [
    ["Payment Status", (bill.paymentStatus ?? bill.status ?? "—").toUpperCase()],
    ["Payment Method", bill.paymentMethod ?? "—"],
    ["Payment Date", formatDate(bill.paidAt)],
    ["Invoice Total", money(bill.total ?? 0, symbol)],
    ["Amount Paid", money(bill.amountPaid ?? 0, symbol)],
    ["Balance Due", money(balanceDue, symbol)],
  ];
  const sumRowH = 24;
  const sumCols = 2;
  const sumRowsPerCol = Math.ceil(summaryRows.length / sumCols);
  const sumH = sumRowsPerCol * sumRowH + 14;
  box(doc, MARGIN, y, contentWidth, sumH);
  doc.font("bold").fontSize(8).fillColor(C.navy).text("PAYMENT SUMMARY", MARGIN + 12, y + 8);
  const colW = (contentWidth - 24) / 2;
  summaryRows.forEach(([label, value], i) => {
    const col = Math.floor(i / sumRowsPerCol);
    const row = i % sumRowsPerCol;
    const cx = MARGIN + 12 + col * colW;
    const cy = y + 26 + row * sumRowH;
    doc.font("regular").fontSize(7).fillColor(C.faint).text(label.toUpperCase(), cx, cy);
    doc.font("bold").fontSize(10).fillColor(label === "Balance Due" ? C.navy : C.ink).text(value, cx, cy + 9, {
      width: colW - 16,
    });
  });
  y += sumH + 12;

  // ── UPI payment (full width) ─────────────────────────────────────────────
  const upiH = 150;
  box(doc, MARGIN, y, contentWidth, upiH);
  doc.font("bold").fontSize(8).fillColor(C.navy).text("SCAN TO PAY (UPI)", MARGIN + 14, y + 10);
  let qrDrawn = false;
  if (bill.qrCodeUrl) {
    try {
      let qrBuffer: Buffer | null = null;
      if (bill.qrCodeUrl.startsWith("data:image/")) {
        const base64Data = bill.qrCodeUrl.split(",")[1];
        if (base64Data) qrBuffer = Buffer.from(base64Data, "base64");
      } else {
        qrBuffer = Buffer.from(bill.qrCodeUrl, "base64");
      }
      if (qrBuffer) {
        doc.image(qrBuffer, MARGIN + 16, y + 32, { width: 96, height: 96 });
        qrDrawn = true;
      }
    } catch (e) {
      console.error("Failed to render QR Code in PDF:", e);
    }
  }
  if (qrDrawn) {
    if (bill.upiId) {
      doc.font("regular").fontSize(7).fillColor(C.faint).text("UPI ID", MARGIN + 136, y + 40);
      doc.font("bold").fontSize(11).fillColor(C.ink).text(bill.upiId, MARGIN + 136, y + 51, {
        width: contentWidth - 160,
      });
    }
    doc.font("regular").fontSize(8.5).fillColor(C.muted).text(
      "Scan this QR with any UPI app to pay.",
      MARGIN + 136,
      y + (bill.upiId ? 76 : 44),
      { width: contentWidth - 160 }
    );
  } else {
    doc.font("regular").fontSize(8).fillColor(C.muted).text(
      bill.upiId
        ? `Pay to UPI ID: ${bill.upiId} using any UPI app.`
        : "No UPI payment details configured.",
      MARGIN + 14,
      y + 34,
      { width: contentWidth - 28 }
    );
  }
  y += upiH + 12;

  // ── Terms & conditions ───────────────────────────────────────────────────
  box(doc, MARGIN, y, contentWidth, 26);
  doc.font("bold").fontSize(8).fillColor(C.navy).text("TERMS & CONDITIONS", MARGIN + 12, y + 9);
  y += 32;
  terms.forEach((t, i) => {
    const lines = Math.max(1, cellLines(doc, t, contentWidth - 40));
    doc.font("regular").fontSize(8).fillColor(C.muted).text(`${i + 1}.  ${t}`, MARGIN + 12, y, {
      width: contentWidth - 24,
    });
    y += lines * 11 + 4;
  });

  // ── Signature line ───────────────────────────────────────────────────────
  const sigY = Math.max(y + 24, 700);
  doc.moveTo(MARGIN + contentWidth - 180, sigY).lineTo(MARGIN + contentWidth, sigY)
    .lineWidth(0.75).strokeColor(C.border).stroke();
  doc.font("bold").fontSize(8).fillColor(C.muted).text(
    `For ${companyName}`,
    MARGIN + contentWidth - 180,
    sigY + 5,
    { width: 180, align: "center" }
  );
}

export async function generateBillPdf(
  bill: Bill,
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

  const symbol = symbolOf(bill.currency);
  let pageNo = 1;
  let y = 0;

  function ensureSpace(needed: number) {
    if (y + needed <= 745) return;
    doc.addPage();
    pageNo += 1;
    decoratePage(doc, pageNo, company, bill);
    y = 56;
  }

  decoratePage(doc, 1, company, bill);

  // ── Page 1 — BILLING / INVOICE ──────────────────────────────────────────
  y = 106;
  y = drawInvoiceDetails(doc, y, bill) + 18;

  // ── Bill To ─────────────────────────────────────────────────────────────
  y = drawBillTo(doc, y, bill) + 18;

  // ── Items table ─────────────────────────────────────────────────────────
  const tableH = 24 + Math.max(1, (bill.items ?? []).length) * 24 + 26;
  ensureSpace(tableH + 8);
  y = drawItemsTable(doc, bill, symbol, y, ensureSpace) + 18;

  // ── Totals panel + words/notes ──────────────────────────────────────────
  const leftW = 300;
  const rightW = contentWidth - leftW - 12;
  const totalsH = 18 + 4 * 22 + 20 + 26 + 6;
  ensureSpace(Math.max(totalsH, 150));
  drawTotals(doc, MARGIN + leftW + 12, y, rightW, bill, symbol);
  drawLeftDetails(doc, MARGIN, y, leftW, bill, company);

  // ── Page 2 — PAYMENT DETAILS ────────────────────────────────────────────
  doc.addPage();
  pageNo += 1;
  decoratePage(doc, pageNo, company, bill, "PAYMENT DETAILS");
  drawPaymentPage(doc, company, bill);

  // ── Footer — subtle page number ─────────────────────────────────────────
  const range = doc.bufferedPageRange();
  const totalPages = range.count;
  for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(i);
    doc.font("regular").fontSize(7).fillColor(C.faint).text(
      `Page ${i + 1} of ${totalPages}`,
      MARGIN,
      804,
      { width: contentWidth, align: "right" }
    );
  }

  doc.end();
  return done;
}