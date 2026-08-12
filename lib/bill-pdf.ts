import PDFDocument from "pdfkit";
import type { Bill } from "@/components/billing-table";
import type { OrganizationRecord } from "@/services/customer/customer-context.service";

const MARGIN = 48;

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

function drawRows(doc: PDFKit.PDFDocument, rows: [string, string][], startX: number, y: number, gap = 24) {
  let rowY = y;
  for (const [l, v] of rows) {
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#64748b").text(l, startX, rowY);
    const lh = doc.heightOfString(l);
    doc.font("Helvetica").fontSize(9.5).fillColor("#0f172a").text(v, startX, rowY + lh + 3);
    rowY += gap;
  }
  return rowY;
}

export async function generateBillPdf(
  bill: Bill,
  company: OrganizationRecord
): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: MARGIN });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const pageWidth = doc.page.width;
  const contentWidth = pageWidth - MARGIN * 2;
  const companyName = company.name || "My Clinic";

  // Header
  doc.font("Helvetica-Bold").fontSize(18).fillColor("#0f172a").text(companyName, MARGIN, 46);
  let subY = 46 + 22;
  const contactLines: string[] = [];
  if (company.address) contactLines.push(company.address);
  const phoneEmail: string[] = [];
  if (company.phone) phoneEmail.push(company.phone);
  if (company.email) phoneEmail.push(company.email);
  if (contactLines.length || phoneEmail.length) {
    doc.font("Helvetica").fontSize(9).fillColor("#475569");
    for (const line of contactLines) {
      doc.text(line, MARGIN, subY);
      subY += 13;
    }
    if (phoneEmail.length) {
      doc.text(phoneEmail.join(" · "), MARGIN, subY);
      subY += 13;
    }
  }

  // Invoice title (right)
  doc.font("Helvetica-Bold").fontSize(24);
  const title = "INVOICE";
  const titleW = doc.widthOfString(title);
  doc.fillColor("#0f172a").text(title, pageWidth - MARGIN - titleW, 46);

  doc.font("Helvetica").fontSize(12);
  const billNo = bill.billNumber || "—";
  const bnW = doc.widthOfString(billNo);
  doc.fillColor("#475569").text(billNo, pageWidth - MARGIN - bnW, 76);

  const status = bill.status ? bill.status.charAt(0).toUpperCase() + bill.status.slice(1) : "";
  const statusColor = bill.status === "paid" ? "#16a34a" : bill.status === "pending" ? "#d97706" : "#dc2626";
  doc.font("Helvetica-Bold").fontSize(11);
  const stW = doc.widthOfString(status);
  doc.fillColor(statusColor).text(status, pageWidth - MARGIN - stW, 96);

  // Divider
  const dividerY = subY + 8;
  doc.moveTo(MARGIN, dividerY).lineTo(pageWidth - MARGIN, dividerY).lineWidth(1).strokeColor("#cbd5e1").stroke();

  let y = dividerY + 24;

  // Billed To + meta
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#0f172a").text("BILLED TO", MARGIN, y);
  y += 16;
  doc.font("Helvetica").fontSize(10.5).fillColor("#0f172a").text(bill.patientName || "—", MARGIN, y);
  y += 15;
  if (bill.patientPhone) {
    doc.font("Helvetica").fontSize(9.5).fillColor("#475569").text(bill.patientPhone, MARGIN, y);
    y += 14;
  }

  const metaRightX = pageWidth - MARGIN - 170;
  let my = dividerY + 24;
  my = drawRows(doc, [
    ["DATE", formatDate(bill.date)],
    ["DOCTOR", bill.doctorName || "—"],
    ["PAYMENT", bill.paymentMethod || "—"],
  ], metaRightX, my, 24);

  y = Math.max(y, my) + 10;

  // Items table
  const tableTop = y;
  const cols = {
    idx: { x: MARGIN, w: 30 },
    item: { x: MARGIN + 30, w: contentWidth * 0.42 },
    qty: { x: MARGIN + 30 + contentWidth * 0.42, w: 60 },
    price: { x: pageWidth - MARGIN - 150, w: 70 },
    amount: { x: pageWidth - MARGIN - 75, w: 75 },
  };

  const headerFill = "#f1f5f9";
  doc.rect(MARGIN, tableTop, contentWidth, 22).fill(headerFill);
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#475569");
  doc.text("#", cols.idx.x + 8, tableTop + 7);
  doc.text("ITEM / SERVICE", cols.item.x + 8, tableTop + 7, { width: cols.item.w - 8 });
  doc.text("QTY", cols.qty.x + 8, tableTop + 7, { width: cols.qty.w - 8, align: "center" });
  doc.text("PRICE", cols.price.x + 8, tableTop + 7, { width: cols.price.w - 8, align: "right" });
  doc.text("AMOUNT", cols.amount.x + 8, tableTop + 7, { width: cols.amount.w - 8, align: "right" });

  let rowY = tableTop + 22;
  const items = Array.isArray(bill.items) ? bill.items : [];

  if (!items.length) {
    doc.font("Helvetica").fontSize(9).fillColor("#475569").text("No items", MARGIN + 8, rowY + 7);
    rowY += 22;
  } else {
    items.forEach((item, i) => {
      const rowBottom = rowY + 20;
      if (i % 2 === 1) {
        doc.rect(MARGIN, rowY, contentWidth, 20).fill("#f8fafc");
      }
      doc.rect(MARGIN, rowY, contentWidth, 20).lineWidth(0.5).strokeColor("#e2e8f0").stroke();
      doc.font("Helvetica").fontSize(9).fillColor("#0f172a");
      doc.text(String(i + 1), cols.idx.x + 8, rowY + 6, { width: cols.idx.w - 8, align: "center" });
      doc.text(item.name || "—", cols.item.x + 8, rowY + 6, { width: cols.item.w - 8 });
      doc.text(String(item.qty ?? 0), cols.qty.x + 8, rowY + 6, { width: cols.qty.w - 8, align: "center" });
      doc.text(inr(item.price ?? 0), cols.price.x + 8, rowY + 6, { width: cols.price.w - 8, align: "right" });
      doc.font("Helvetica-Bold").text(inr(item.amount ?? 0), cols.amount.x + 8, rowY + 6, { width: cols.amount.w - 8, align: "right" });
      rowY = rowBottom;
    });
  }

  // Totals
  const totalsX = pageWidth - MARGIN - 220;
  const totalsW = 220;
  let tY = rowY + 16;
  const totalRows: [string, string][] = [
    ["Subtotal", inr(bill.subtotal ?? 0)],
  ];
  if ((bill.discount ?? 0) > 0) totalRows.push(["Discount", `− ${inr(bill.discount)}`]);
  if ((bill.tax ?? 0) > 0) totalRows.push([`Tax (${bill.taxRate ?? 0}%)`, inr(bill.tax)]);
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

  // Footer
  const footer = `Generated by ${companyName} · ${formatDate(new Date().toISOString())}`;
  if (y > doc.page.height - 90) {
    doc.addPage();
    y = MARGIN;
  }
  doc.font("Helvetica").fontSize(8).fillColor("#94a3b8").text(
    footer,
    MARGIN,
    doc.page.height - 60,
    { width: contentWidth, align: "center" }
  );

  doc.end();
  return done;
}
