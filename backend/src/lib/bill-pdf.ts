import PDFDocument from "pdfkit";
import type { OrganizationRecord } from "@/services/customer/customer-context.service";

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
  fullName?: string | null;
  mobile?: string | null;
  doctorName?: string | null;
  department?: string | null;
  date?: string | null;
  time?: string | null;
  type?: string | null;
  status?: string | null;
  reason?: string | null;
  notes?: string | null;
}

export interface BillMedicine {
  name?: string | null;
  frequency?: string | null;
  duration?: string | null;
  beforeAfterFood?: string | null;
  specialInstructions?: string | null;
}

export interface BillPrescription {
  patientName?: string | null;
  doctorName?: string | null;
  visitDate?: string | null;
  diagnosis?: string | null;
  medicines?: BillMedicine[];
  followUpDate?: string | null;
}

export interface BillVisit {
  appointment?: BillAppointment | null;
  prescriptions?: BillPrescription[];
  doctors?: { id?: string | null; name?: string | null }[];
}

const MARGIN = 48;
const BORDER_INSET = 10;

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

function drawMetaRows(doc: PDFKit.PDFDocument, rows: [string, string][], startX: number, y: number, gap = 20) {
  for (const [l, v] of rows) {
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#64748b").text(l, startX, y);
    doc.font("Helvetica").fontSize(10).fillColor("#0f172a").text(v, startX, y + 11, { width: 240 });
    y += gap;
  }
  return y;
}

function sectionHeading(doc: PDFKit.PDFDocument, text: string, x: number, y: number) {
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#0f172a").text(text, x, y);
  const w = doc.widthOfString(text);
  doc.moveTo(x, y + 12).lineTo(x + Math.max(w, 120), y + 12).lineWidth(1).strokeColor("#cbd5e1").stroke();
  return y + 22;
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
  doc.rect(startX, startY, totalW, rowHeight).fill("#f1f5f9");
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#475569");
  let x = startX;
  headers.forEach((h, i) => {
    const align = rightAlignCols.includes(i) ? "right" : "left";
    doc.text(h, x + 6, startY + 6, { width: colWidths[i] - 10, align });
    x += colWidths[i];
  });

  let y = startY + rowHeight;
  for (const row of rows) {
    doc.rect(startX, y, totalW, rowHeight).lineWidth(0.4).strokeColor("#e2e8f0").stroke();
    doc.font("Helvetica").fontSize(8.5).fillColor("#0f172a");
    x = startX;
    row.forEach((cell, i) => {
      const align = rightAlignCols.includes(i) ? "right" : "left";
      doc.text(cell, x + 6, y + 5, { width: colWidths[i] - 10, align });
      x += colWidths[i];
    });
    y += rowHeight;
  }
  return y;
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

  // Full A4 sheet border
  doc.rect(BORDER_INSET, BORDER_INSET, pageWidth - BORDER_INSET * 2, pageHeight - BORDER_INSET * 2)
    .lineWidth(1.5)
    .strokeColor("#0f172a")
    .stroke();

  // Clinic details header (centered)
  let y = 40;
  const headerX = MARGIN;
  doc.font("Helvetica-Bold").fontSize(17).fillColor("#0f172a");
  doc.text(companyName, headerX, y, { width: contentWidth, align: "center" });
  y += 20;
  const clinicLines: string[] = [];
  if (company.address) clinicLines.push(company.address);
  const contactBits: string[] = [];
  if (company.phone) contactBits.push(`Ph: ${company.phone}`);
  if (company.email) contactBits.push(company.email);
  if (company.website) contactBits.push(company.website);
  if (clinicLines.length || contactBits.length) {
    doc.font("Helvetica").fontSize(8.5).fillColor("#475569");
    for (const line of clinicLines) {
      doc.text(line, headerX, y, { width: contentWidth, align: "center" });
      y += 12;
    }
    if (contactBits.length) {
      doc.text(contactBits.join(" · "), headerX, y, { width: contentWidth, align: "center" });
      y += 14;
    }
  }
  y += 6;

  // Invoice title (right) + bill number + status
  const title = "INVOICE";
  doc.font("Helvetica-Bold").fontSize(20);
  const titleW = doc.widthOfString(title);
  doc.fillColor("#0f172a").text(title, pageWidth - MARGIN - titleW, 40);

  const billNo = bill.billNumber || "—";
  doc.font("Helvetica").fontSize(10.5);
  const bnW = doc.widthOfString(billNo);
  doc.fillColor("#475569").text(billNo, pageWidth - MARGIN - bnW, 64);

  const status = bill.status ? bill.status.charAt(0).toUpperCase() + bill.status.slice(1) : "";
  const statusColor = bill.status === "paid" ? "#16a34a" : bill.status === "pending" ? "#d97706" : "#dc2626";
  doc.font("Helvetica-Bold").fontSize(10);
  const stW = doc.widthOfString(status);
  doc.fillColor(statusColor).text(status, pageWidth - MARGIN - stW, 80);

  // Divider under header
  const dividerY = y + 8;
  doc.moveTo(MARGIN, dividerY).lineTo(pageWidth - MARGIN, dividerY).lineWidth(1).strokeColor("#cbd5e1").stroke();

  let rowY = dividerY + 22;

  // Billed To (left)
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#64748b").text("BILLED TO", MARGIN, rowY);
  rowY += 14;
  doc.font("Helvetica").fontSize(11).fillColor("#0f172a").text(bill.patientName || "—", MARGIN, rowY);
  rowY += 15;
  if (bill.patientPhone) {
    doc.font("Helvetica").fontSize(9.5).fillColor("#475569").text(bill.patientPhone, MARGIN, rowY);
    rowY += 14;
  }

  // Meta (right)
  const metaRightX = pageWidth - MARGIN - 170;
  const metaEnd = drawMetaRows(doc, [
    ["DATE", formatDate(bill.date)],
    ["DOCTOR", bill.doctorName || "—"],
    ["PAYMENT", bill.paymentMethod || "—"],
  ], metaRightX, dividerY + 22, 22);

  rowY = Math.max(rowY, metaEnd) + 6;

  const appointment = visit.appointment;
  if (appointment) {
    rowY = sectionHeading(doc, "APPOINTMENT DETAILS", MARGIN, rowY);
    const apptRows: [string, string][] = [
      ["Doctor", appointment.doctorName || "—"],
      ["Department", appointment.department || "—"],
      ["Date / Time", `${formatDate(appointment.date)}${appointment.time ? " · " + appointment.time : ""}`],
      ["Type", appointment.type === "video" ? "Video Consultation" : "In-person"],
      ["Status", appointment.status ? String(appointment.status).replace("_", " ") : "—"],
    ];
    if (appointment.reason) apptRows.push(["Reason", String(appointment.reason)]);
    if (appointment.notes) apptRows.push(["Notes", String(appointment.notes)]);
    let apptY = rowY;
    for (const [l, v] of apptRows) {
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#64748b").text(l, MARGIN, apptY, { width: 90 });
      doc.font("Helvetica").fontSize(9).fillColor("#0f172a").text(v, MARGIN + 95, apptY, { width: 330 });
      apptY += 16;
    }
    rowY = apptY + 4;
  }

  const prescriptions = Array.isArray(visit.prescriptions) ? visit.prescriptions : [];
  if (prescriptions.length) {
    rowY = sectionHeading(doc, "PRESCRIPTION & MEDICINES", MARGIN, rowY);
    for (const p of prescriptions) {
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#0f172a").text(
        p.diagnosis ? `Diagnosis: ${p.diagnosis}` : "Prescription",
        MARGIN, rowY
      );
      rowY += 13;
      const metaBits: string[] = [];
      if (p.visitDate) metaBits.push(`Visit: ${formatDate(String(p.visitDate))}`);
      if (p.doctorName) metaBits.push(`Doctor: ${p.doctorName}`);
      if (p.followUpDate) metaBits.push(`Follow-up: ${formatDate(String(p.followUpDate))}`);
      if (metaBits.length) {
        doc.font("Helvetica").fontSize(8).fillColor("#64748b").text(metaBits.join("  ·  "), MARGIN, rowY, { width: contentWidth });
        rowY += 13;
      }

      const medicines = Array.isArray(p.medicines) ? p.medicines.filter((m) => m?.name) : [];
      if (medicines.length) {
        const headers = ["Medicine", "Frequency", "Duration", "Before / After Food", "Instructions"];
        const colWidths = [160, 90, 80, 110, 190];
        const rows = medicines.map((m) => [
          String(m.name ?? "—"),
          String(m.frequency ?? "—"),
          String(m.duration ?? "—"),
          String(m.beforeAfterFood ?? "—"),
          String(m.specialInstructions ?? "—"),
        ]);
        rowY = drawSimpleTable(doc, headers, rows, colWidths, MARGIN, rowY, 18, []);
        rowY += 10;
      } else {
        doc.font("Helvetica").fontSize(9).fillColor("#475569").text("No medicines listed.", MARGIN, rowY, { width: contentWidth });
        rowY += 18;
      }
    }
  }

  const doctors = Array.isArray(visit.doctors) ? visit.doctors.filter((d) => d?.name) : [];
  if (doctors.length) {
    rowY = sectionHeading(doc, "DOCTORS", MARGIN, rowY);
    rowY = drawSimpleTable(
      doc,
      ["#", "Doctor"],
      doctors.map((d, i) => [String(i + 1), String(d.name ?? "—")]),
      [40, 400],
      MARGIN,
      rowY,
      18,
      []
    );
    rowY += 10;
  }

  // Items table
  rowY = sectionHeading(doc, "BILL ITEMS", MARGIN, rowY);
  const cols = {
    idx: { x: MARGIN, w: 30 },
    item: { x: MARGIN + 30, w: contentWidth * 0.42 },
    qty: { x: MARGIN + 30 + contentWidth * 0.42, w: 60 },
    price: { x: pageWidth - MARGIN - 150, w: 70 },
    amount: { x: pageWidth - MARGIN - 75, w: 75 },
  };

  const headerFill = "#f1f5f9";
  doc.rect(MARGIN, rowY, contentWidth, 22).fill(headerFill);
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#475569");
  doc.text("#", cols.idx.x + 8, rowY + 7);
  doc.text("ITEM / SERVICE", cols.item.x + 8, rowY + 7, { width: cols.item.w - 8 });
  doc.text("QTY", cols.qty.x + 8, rowY + 7, { width: cols.qty.w - 8, align: "center" });
  doc.text("PRICE", cols.price.x + 8, rowY + 7, { width: cols.price.w - 8, align: "right" });
  doc.text("AMOUNT", cols.amount.x + 8, rowY + 7, { width: cols.amount.w - 8, align: "right" });

  let itemRowY = rowY + 22;
  const items = Array.isArray(bill.items) ? bill.items : [];

  if (!items.length) {
    doc.font("Helvetica").fontSize(9).fillColor("#475569").text("No items", MARGIN + 8, itemRowY + 7);
    itemRowY += 22;
  } else {
    items.forEach((item, i) => {
      const rowBottom = itemRowY + 20;
      if (i % 2 === 1) {
        doc.rect(MARGIN, itemRowY, contentWidth, 20).fill("#f8fafc");
      }
      doc.rect(MARGIN, itemRowY, contentWidth, 20).lineWidth(0.5).strokeColor("#e2e8f0").stroke();
      doc.font("Helvetica").fontSize(9).fillColor("#0f172a");
      doc.text(String(i + 1), cols.idx.x + 8, itemRowY + 6, { width: cols.idx.w - 8, align: "center" });
      doc.text(item.name || "—", cols.item.x + 8, itemRowY + 6, { width: cols.item.w - 8 });
      doc.text(String(item.qty ?? 0), cols.qty.x + 8, itemRowY + 6, { width: cols.qty.w - 8, align: "center" });
      doc.text(inr(item.price ?? 0), cols.price.x + 8, itemRowY + 6, { width: cols.price.w - 8, align: "right" });
      doc.font("Helvetica-Bold").text(inr(item.amount ?? 0), cols.amount.x + 8, itemRowY + 6, { width: cols.amount.w - 8, align: "right" });
      itemRowY = rowBottom;
    });
  }

  // Totals
  const totalsX = pageWidth - MARGIN - 220;
  const totalsW = 220;
  let tY = itemRowY + 16;
  const totalRows: [string, string][] = [
    ["Subtotal", inr(bill.subtotal ?? 0)],
  ];
  if ((bill.discount ?? 0) > 0)
    totalRows.push(["Discount", `− ${inr(bill.discount ?? 0)}`]);
  if ((bill.tax ?? 0) > 0)
    totalRows.push([`Tax (${bill.taxRate ?? 0}%)`, inr(bill.tax ?? 0)]);
  totalRows.push(["Grand Total", inr(bill.total ?? 0)]);

  for (const [l, v] of totalRows) {
    const isGrand = l === "Grand Total";
    const lineY = tY + (isGrand ? 4 : 0);
    if (isGrand) {
      doc.moveTo(totalsX, tY).lineTo(totalsX + totalsW, tY).lineWidth(1).strokeColor("#0f172a").stroke();
    }
    doc.font(isGrand ? "Helvetica-Bold" : "Helvetica").fontSize(10).fillColor("#0f172a");
    doc.text(l, totalsX + (isGrand ? 0 : 6), lineY, { width: totalsW - 90 });
    doc.font(isGrand ? "Helvetica-Bold" : "Helvetica").fontSize(10).fillColor("#0f172a");
    doc.text(v, totalsX + totalsW - 90, lineY, { width: 86, align: "right" });
    tY = lineY + (isGrand ? 26 : 18);
  }

  y = tY + 8;

  // Notes
  if (bill.notes) {
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#475569").text("NOTES", MARGIN, y);
    y += 14;
    doc.font("Helvetica").fontSize(9.5).fillColor("#334155").text(bill.notes, MARGIN, y, { width: contentWidth });
    y += 40;
  } else {
    y += 20;
  }

  // Footer (inside border)
  const footer = `Generated by ${companyName} · ${formatDate(new Date().toISOString())}`;
  if (y > pageHeight - 90) {
    doc.addPage();
    doc.rect(BORDER_INSET, BORDER_INSET, pageWidth - BORDER_INSET * 2, pageHeight - BORDER_INSET * 2)
      .lineWidth(1.5)
      .strokeColor("#0f172a")
      .stroke();
    y = MARGIN;
  }
  doc.font("Helvetica").fontSize(8).fillColor("#94a3b8").text(
    footer,
    MARGIN,
    pageHeight - 60,
    { width: contentWidth, align: "center" }
  );

  doc.end();
  return done;
}
