import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";
import { randomUUID } from "node:crypto";
import PDFDocument from "pdfkit";
import { uploadToR2 } from "../lib/r2";
dotenv.config({ path: ".env.local" });

const DOCTOR_ID = "6a7a08b7f0e37634f638aad8";
const DOCTOR_NAME = "Amarnath Mk";
const FOLDER_LAB_REPORTS = "6a7a1c0932ce396e36d455ca";
const FOLDER_SCANS = "6a7a1c0932ce396e36d455cb";

function daysFromToday(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const inr = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function billTotals(items: { qty: number; price: number }[], discount: number, taxRate: number) {
  const subtotal = inr(items.reduce((s, i) => s + i.qty * i.price, 0));
  const safeDiscount = inr(Math.max(0, discount));
  const taxable = Math.max(0, subtotal - safeDiscount);
  const tax = inr((taxable * taxRate) / 100);
  const total = inr(taxable + tax);
  return { subtotal, discount: safeDiscount, taxRate, tax, total };
}

async function makeReportPdf(title: string, lines: string[]): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));
  doc.font("Helvetica-Bold").fontSize(18).fillColor("#0f172a").text(title, 50, 50);
  doc.moveTo(50, 80).lineTo(545, 80).lineWidth(1).strokeColor("#cbd5e1").stroke();
  let y = 110;
  doc.font("Helvetica").fontSize(10.5).fillColor("#334155");
  for (const line of lines) {
    doc.text(line, 50, y, { width: 495 });
    y += 16;
  }
  doc.end();
  return done;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI missing");
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db("myclinic");

  const doctorId: string = DOCTOR_ID;

  const patients = [
    { fullName: "Ramesh Kumar", mobile: "+919845001201", secondaryMobile: null, age: 45, gender: "Male", email: "ramesh.kumar@example.com", whatsapp: "+919845001201" },
    { fullName: "Sita Nair", mobile: "+919845001202", secondaryMobile: null, age: 38, gender: "Female", email: "sita.nair@example.com", whatsapp: "+919845001202" },
    { fullName: "Arjun Menon", mobile: "+919845001203", secondaryMobile: null, age: 52, gender: "Male", email: "arjun.menon@example.com", whatsapp: "+919845001203" },
    { fullName: "Lakshmi Iyer", mobile: "+919845001204", secondaryMobile: null, age: 34, gender: "Female", email: "lakshmi.iyer@example.com", whatsapp: "+919845001204" },
    { fullName: "Vikram Singh", mobile: "+919845001205", secondaryMobile: null, age: 60, gender: "Male", email: "vikram.singh@example.com", whatsapp: "+919845001205" },
    { fullName: "Meena Pillai", mobile: "+919845001206", secondaryMobile: null, age: 29, gender: "Female", email: "meena.pillai@example.com", whatsapp: "+919845001206" },
  ];

  const patientIds: Record<string, string> = {};
  const patientColl = db.collection("patients");
  for (const p of patients) {
    let existing = await patientColl.findOne({ email: p.email });
    if (!existing) existing = await patientColl.findOne({ mobile: p.mobile });
    if (existing) {
      patientIds[p.email] = existing._id.toString();
      continue;
    }
    const res = await patientColl.insertOne({ ...p, createdAt: new Date(), updatedAt: new Date() });
    patientIds[p.email] = res.insertedId.toString();
  }
  console.log("patients:", await patientColl.countDocuments());

  const patientColl2 = patientColl;
  const amarnath = await patientColl2.findOne({ email: "myenumam@gmail.com" });
  if (amarnath) {
    const amarnathBills = await db.collection("bills").countDocuments({ patientName: "Amarnath Mk" });
    if (amarnathBills === 0) {
      const items = [
        { name: "General Consultation", qty: 1, price: 500 },
        { name: "ECG", qty: 1, price: 400 },
      ].map((i) => ({ ...i, amount: inr(i.qty * i.price) }));
      const totals = billTotals(items, 0, 0);
      await db.collection("bills").insertOne({
        billNumber: "INV-0007",
        patientName: "Amarnath Mk",
        patientPhone: "+916374984055",
        doctorId: DOCTOR_ID,
        doctorName: DOCTOR_NAME,
        date: daysFromToday(-1),
        items,
        ...totals,
        paymentMethod: "UPI",
        status: "paid",
        notes: null,
        createdAt: new Date(),
      });
    }
    const amarnathRx = await db.collection("prescriptions").countDocuments({ patientName: "Amarnath Mk" });
    if (amarnathRx === 0) {
      await db.collection("prescriptions").insertOne({
        patientName: "Amarnath Mk",
        age: 14,
        gender: "Male",
        phone: "+916374984055",
        visitDate: daysFromToday(-1),
        diagnosis: "General health checkup",
        medicines: [
          { name: "Multivitamin", frequency: "Once daily", duration: "15 days", beforeAfterFood: "After food", specialInstructions: "" },
        ],
        symptoms: "Fatigue",
        testsRecommended: "ECG",
        followUpDate: daysFromToday(14),
        doctorName: DOCTOR_NAME,
        createdAt: new Date(),
      });
    }
  }

  const apptColl = db.collection("appointments");
  const apptCount = await apptColl.countDocuments();
  if (apptCount <= 1) {
    const appointments = [
      { fullName: "Ramesh Kumar", mobile: "+919845001201", age: 45, gender: "Male", email: "ramesh.kumar@example.com", date: daysFromToday(0), time: "09:30", type: "in-person", reason: "Fever and body pain", status: "confirmed", department: "General Medicine", counter: 1 },
      { fullName: "Sita Nair", mobile: "+919845001202", age: 38, gender: "Female", email: "sita.nair@example.com", date: daysFromToday(0), time: "10:15", type: "in-person", reason: "Migraine follow-up", status: "pending", department: "General Medicine", counter: 2 },
      { fullName: "Arjun Menon", mobile: "+919845001203", age: 52, gender: "Male", email: "arjun.menon@example.com", date: daysFromToday(0), time: "11:00", type: "video", reason: "Diabetes review", status: "confirmed", department: "General Medicine", counter: 3 },
      { fullName: "Lakshmi Iyer", mobile: "+919845001204", age: 34, gender: "Female", email: "lakshmi.iyer@example.com", date: daysFromToday(-1), time: "16:00", type: "in-person", reason: "Thyroid test results", status: "completed", department: "General Medicine" },
      { fullName: "Vikram Singh", mobile: "+919845001205", age: 60, gender: "Male", email: "vikram.singh@example.com", date: daysFromToday(-3), time: "12:30", type: "in-person", reason: "Blood pressure check", status: "completed", department: "General Medicine" },
      { fullName: "Meena Pillai", mobile: "+919845001206", age: 29, gender: "Female", email: "meena.pillai@example.com", date: daysFromToday(2), time: "14:30", type: "video", reason: "Skin rash", status: "confirmed", department: "General Medicine" },
      { fullName: "Ramesh Kumar", mobile: "+919845001201", age: 45, gender: "Male", email: "ramesh.kumar@example.com", date: daysFromToday(-7), time: "09:00", type: "in-person", reason: "Annual checkup", status: "completed", department: "General Medicine" },
      { fullName: "Sita Nair", mobile: "+919845001202", age: 38, gender: "Female", email: "sita.nair@example.com", date: daysFromToday(5), time: "10:00", type: "in-person", reason: "Consultation", status: "pending", department: "General Medicine" },
      { fullName: "Arjun Menon", mobile: "+919845001203", age: 52, gender: "Male", email: "arjun.menon@example.com", date: daysFromToday(-14), time: "11:30", type: "in-person", reason: "Sugar levels high", status: "completed", department: "General Medicine" },
    ];
    for (const a of appointments) {
      await apptColl.insertOne({
        ...a,
        secondaryMobile: null,
        whatsapp: a.mobile,
        doctorId: doctorId,
        doctorName: DOCTOR_NAME,
        type: a.type,
        status: a.status,
        bookingSource: "manual",
        notes: null,
        whatsappConversationId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }
  console.log("appointments:", await apptColl.countDocuments());

  const billColl = db.collection("bills");
  const billCount = await billColl.countDocuments();
  if (billCount === 0) {
    const billDefs = [
      { patientName: "Ramesh Kumar", patientPhone: "+919845001201", date: daysFromToday(0), items: [{ name: "Consultation", qty: 1, price: 400 }, { name: "Paracetamol 500mg", qty: 10, price: 30 }], discount: 0, taxRate: 0, paymentMethod: "UPI", status: "paid", notes: null },
      { patientName: "Sita Nair", patientPhone: "+919845001202", date: daysFromToday(0), items: [{ name: "Consultation", qty: 1, price: 400 }, { name: "Complete Blood Count", qty: 1, price: 600 }], discount: 50, taxRate: 0, paymentMethod: "Cash", status: "pending", notes: "Discount applied on lab package." },
      { patientName: "Arjun Menon", patientPhone: "+919845001203", date: daysFromToday(0), items: [{ name: "Video Consultation", qty: 1, price: 500 }, { name: "HbA1c Test", qty: 1, price: 700 }, { name: "Metformin 500mg", qty: 30, price: 90 }], discount: 0, taxRate: 0, paymentMethod: "UPI", status: "paid", notes: null },
      { patientName: "Lakshmi Iyer", patientPhone: "+919845001204", date: daysFromToday(-1), items: [{ name: "Consultation", qty: 1, price: 400 }, { name: "Thyroid Profile", qty: 1, price: 500 }], discount: 0, taxRate: 0, paymentMethod: "Card", status: "paid", notes: null },
      { patientName: "Vikram Singh", patientPhone: "+919845001205", date: daysFromToday(-3), items: [{ name: "Consultation", qty: 1, price: 400 }, { name: "Amlodipine 5mg", qty: 30, price: 60 }], discount: 0, taxRate: 0, paymentMethod: "Cash", status: "pending", notes: null },
      { patientName: "Meena Pillai", patientPhone: "+919845001206", date: daysFromToday(0), items: [{ name: "Video Consultation", qty: 1, price: 500 }, { name: "Cetirizine 10mg", qty: 10, price: 25 }], discount: 0, taxRate: 0, paymentMethod: "UPI", status: "pending", notes: null },
    ];
    let seq = 1;
    for (const b of billDefs) {
      const items = b.items.map((i) => ({ ...i, amount: inr(i.qty * i.price) }));
      const totals = billTotals(items, b.discount, b.taxRate);
      await billColl.insertOne({
        billNumber: `INV-${String(seq).padStart(4, "0")}`,
        patientName: b.patientName,
        patientPhone: b.patientPhone,
        doctorId: doctorId,
        doctorName: DOCTOR_NAME,
        date: b.date,
        items,
        ...totals,
        paymentMethod: b.paymentMethod,
        status: b.status,
        notes: b.notes,
        createdAt: new Date(),
      });
      seq += 1;
    }
  }
  console.log("bills:", await billColl.countDocuments());

  const rxColl = db.collection("prescriptions");
  const rxCount = await rxColl.countDocuments();
  if (rxCount === 0) {
    const prescriptions = [
      { patientName: "Ramesh Kumar", age: 45, gender: "Male", phone: "+919845001201", visitDate: daysFromToday(0), diagnosis: "Viral fever", medicines: [{ name: "Paracetamol 500mg", frequency: "Thrice a day", duration: "3 days", beforeAfterFood: "After food", specialInstructions: "Take with water" }], symptoms: "Fever, body ache", testsRecommended: null, followUpDate: daysFromToday(3), doctorName: DOCTOR_NAME },
      { patientName: "Sita Nair", age: 38, gender: "Female", phone: "+919845001202", visitDate: daysFromToday(0), diagnosis: "Migraine", medicines: [{ name: "Sumatriptan 50mg", frequency: "As needed", duration: "5 days", beforeAfterFood: "At onset of headache", specialInstructions: "Avoid driving after dose" }], symptoms: "Throbbing headache", testsRecommended: "CBC", followUpDate: daysFromToday(7), doctorName: DOCTOR_NAME },
      { patientName: "Arjun Menon", age: 52, gender: "Male", phone: "+919845001203", visitDate: daysFromToday(0), diagnosis: "Type 2 Diabetes", medicines: [{ name: "Metformin 500mg", frequency: "Twice a day", duration: "30 days", beforeAfterFood: "After food", specialInstructions: "" }], symptoms: "Fatigue, increased thirst", testsRecommended: "HbA1c", followUpDate: daysFromToday(30), doctorName: DOCTOR_NAME },
      { patientName: "Lakshmi Iyer", age: 34, gender: "Female", phone: "+919845001204", visitDate: daysFromToday(-1), diagnosis: "Hypothyroidism", medicines: [{ name: "Thyroxine 50mcg", frequency: "Once daily", duration: "30 days", beforeAfterFood: "Empty stomach", specialInstructions: "30 min before breakfast" }], symptoms: null, testsRecommended: "Thyroid Profile", followUpDate: daysFromToday(30), doctorName: DOCTOR_NAME },
      { patientName: "Vikram Singh", age: 60, gender: "Male", phone: "+919845001205", visitDate: daysFromToday(-3), diagnosis: "Hypertension", medicines: [{ name: "Amlodipine 5mg", frequency: "Once daily", duration: "30 days", beforeAfterFood: "After food", specialInstructions: "" }], symptoms: "Occasional dizziness", testsRecommended: "BP monitoring", followUpDate: daysFromToday(14), doctorName: DOCTOR_NAME },
    ];
    for (const p of prescriptions) {
      await rxColl.insertOne({ ...p, createdAt: new Date() });
    }
  }
  console.log("prescriptions:", await rxColl.countDocuments());

  const medColl = db.collection("medicines");
  const medCount = await medColl.countDocuments();
  if (medCount === 0) {
    const medicines = [
      { name: "Paracetamol 500mg", category: "Tablet", notes: "Fever and pain relief. Max 4/day." },
      { name: "Metformin 500mg", category: "Tablet", notes: "Type 2 diabetes. Take after meals." },
      { name: "Amlodipine 5mg", category: "Tablet", notes: "Blood pressure. Once daily." },
      { name: "Cetirizine 10mg", category: "Tablet", notes: "Allergy relief. Once daily." },
      { name: "Sumatriptan 50mg", category: "Tablet", notes: "Acute migraine." },
      { name: "Thyroxine 50mcg", category: "Tablet", notes: "Empty stomach, 30 min before breakfast." },
      { name: "Cough Syrup", category: "Syrup", notes: "10ml twice daily after food." },
      { name: "ORS Powder", category: "Other", notes: "Rehydration. One sachet per liter water." },
      { name: "Vitamin D3 60K", category: "Capsule", notes: "Weekly, after food." },
      { name: "Omeprazole 20mg", category: "Capsule", notes: "Acidity. Before breakfast." },
    ];
    for (const m of medicines) {
      await medColl.insertOne({ ...m, createdAt: new Date(), updatedAt: new Date() });
    }
  }
  console.log("medicines:", await medColl.countDocuments());

  const reportColl = db.collection("reports");
  const reportCount = await reportColl.countDocuments();
  if (reportCount === 0) {
    const reports = [
      { name: "Complete Blood Count - Ramesh Kumar.pdf", patientName: "Ramesh Kumar", patientEmail: "ramesh.kumar@example.com", folderId: FOLDER_LAB_REPORTS, category: "prescription", title: "Complete Blood Count", lines: ["Patient: Ramesh Kumar", "Date: " + daysFromToday(0), "", "Hemoglobin: 13.8 g/dL", "WBC: 7,200 /uL", "Platelets: 2,40,000 /uL", "", "Result: Within normal limits."] },
      { name: "HbA1c - Arjun Menon.pdf", patientName: "Arjun Menon", patientEmail: "arjun.menon@example.com", folderId: FOLDER_LAB_REPORTS, category: "prescription", title: "HbA1c Report", lines: ["Patient: Arjun Menon", "Date: " + daysFromToday(0), "", "HbA1c: 7.2%", "", "Interpretation: Borderline. Continue medication and monitor."] },
      { name: "Chest X-Ray - Vikram Singh.pdf", patientName: "Vikram Singh", patientEmail: "vikram.singh@example.com", folderId: FOLDER_SCANS, category: "upload", title: "Chest X-Ray (PA View)", lines: ["Patient: Vikram Singh", "Date: " + daysFromToday(-3), "", "Findings: No active lung pathology.", "Heart size within normal limits.", "", "Impression: Normal study."] },
    ];
    for (const r of reports) {
      const patient = await db.collection("patients").findOne({ email: r.patientEmail });
      const pdf = await makeReportPdf(r.title, r.lines);
      const key = `reports/${randomUUID()}-${r.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      try {
        await uploadToR2(key, pdf, "application/pdf");
      } catch (err) {
        console.warn("SKIPPED R2 upload for", r.name, "-", err instanceof Error ? err.message : err);
        continue;
      }
      await reportColl.insertOne({
        name: r.name,
        key,
        size: pdf.length,
        type: "application/pdf",
        extension: "pdf",
        folderId: r.folderId,
        category: r.category,
        patientId: patient?._id.toString() ?? null,
        patientName: r.patientName,
        prescriptionId: null,
        prescriptionLabel: null,
        uploadedBy: DOCTOR_NAME,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }
  console.log("reports:", await reportColl.countDocuments());

  await client.close();
  console.log("DONE");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
