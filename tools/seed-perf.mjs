// Seeds a synthetic "perf" clinic with realistic volume into the local MongoDB.
// Safe: writes only to a dedicated clinicId (clc_PERFTEST...) and never touches
// existing clinics. Re-runnable (drops the perf clinic's own docs first).
//
// Usage: node tools/seed-perf.mjs
import { MongoClient } from "mongodb";

const CLINIC_ID = "clc_PERFTEST0000000000";
const ADMIN_ID = "usr_perfadmin00000001";
const URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const DBNAME = process.env.MONGODB_DB || "myclinic";

const c = new MongoClient(URI);
await c.connect();
const db = c.db(DBNAME);

// Deterministic PRNG
let seed = 42;
function rnd() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const int = (min, max) => min + Math.floor(rnd() * (max - min + 1));

const CLINIC_COLLECTIONS = [
  "clc_doctors","clc_patients","clc_appointments","clc_bills","clc_prescriptions",
  "clc_medicine","clc_investigations","clc_examinations","clc_labs","clc_leads",
  "clc_notifications","clc_medical_record_folders","clc_medical_record_files",
  "clc_pharmacy_medicines","clc_pharmacy_inventory","clc_pharmacy_suppliers",
  "clc_pharmacy_purchases","clc_pharmacy_sales","clc_pharmacy_stock_movements",
  "clc_clinics","clc_users","clc_settings",
];

// Drop only this clinic's docs
for (const col of CLINIC_COLLECTIONS) {
  await db.collection(col).deleteMany({ clinicId: CLINIC_ID });
}

const now = new Date();
const daysAgo = (d) => new Date(now.getTime() - d * 86400000);
const iso = (d) => d.toISOString().slice(0, 10);

// ---- clinic + admin ----
await db.collection("clc_clinics").insertOne({
  clinicId: CLINIC_ID, slug: "perf-clinic", name: "Perf Test Clinic",
  phone: "9999999999", email: "perf@clinic.test", address: "1 Test Rd",
  website: null, description: "synthetic perf clinic", status: "active",
  settings: { workingHours: { open: "09:00", close: "18:00" }, slotMinutes: 15, currency: "INR", timezone: "Asia/Kolkata" },
  createdAt: daysAgo(120), updatedAt: now,
});
await db.collection("clc_users").insertOne({
  clinicId: CLINIC_ID, userId: ADMIN_ID, name: "Perf Admin", email: "perf-admin@clinic.test",
  passwordHash: "$2b$12$v9WeS.vkXqfx36BzVOtW8.OEqzeG.zeO/iS0vOXmNRSXP8lpTznoC",
  role: "clinic_admin", doctorId: null, staffId: null, patientId: null,
  phone: null, status: "active", createdAt: daysAgo(120), updatedAt: now,
});
await db.collection("clc_settings").insertOne({
  clinicId: CLINIC_ID, organizationId: null, createdAt: daysAgo(120), updatedAt: now,
});

// ---- doctors ----
const specs = ["General Physician","Dentist","Dermatologist","Pediatrician","Orthopedic","ENT","Gynecologist","Cardiologist"];
const doctors = [];
for (let i = 0; i < 12; i++) {
  doctors.push({
    clinicId: CLINIC_ID, doctorId: `doc_PERF${String(i).padStart(6, "0")}`,
    userId: null, name: `Dr Perf ${i}`, specialization: specs[i % specs.length],
    licenseNo: `LIC-${1000 + i}`, qualification: "MBBS", phone: `90000000${String(i).padStart(2, "0")}`,
    whatsapp: null, email: `doc${i}@perf.test`, fee: 300 + i * 10,
    schedule: [{ day: "mon", start: "09:00", end: "13:00" }], status: "active",
    createdBy: ADMIN_ID, createdAt: daysAgo(100), updatedAt: now,
  });
}
await db.collection("clc_doctors").insertMany(doctors);

// ---- patients ----
const firstNames = ["Asha","Ravi","Meena","Suresh","Lakshmi","Arjun","Divya","Karthik","Priya","Anil","Neha","Vijay"];
const lastNames = ["Nair","Menon","Kumar","Iyer","Pillai","Reddy","Sharma","Das","Gupta","Rao"];
const patients = [];
for (let i = 0; i < 1500; i++) {
  const name = `${pick(firstNames)} ${pick(lastNames)} ${i}`;
  patients.push({
    clinicId: CLINIC_ID, patientId: `pat_PERF${String(i).padStart(7, "0")}`,
    doctorId: rnd() < 0.8 ? doctors[i % doctors.length].doctorId : null,
    userId: null, fullName: name, mobile: `98${String(10000000 + i).slice(0, 8)}`,
    whatsapp: null, email: rnd() < 0.4 ? `p${i}@mail.test` : null,
    gender: pick(["male","female","other"]), dateOfBirth: "1990-01-01", bloodGroup: pick(["A+","B+","O+","AB+"]),
    address: `${i} Street`, city: pick(["Kochi","Chennai","Bengaluru","Mumbai"]), state: "Kerala", pincode: "682001",
    height: "170", weight: "65", bloodPressure: null, temperature: null, pulse: null,
    respiratoryRate: null, spo2: null, occupation: null, maritalStatus: null,
    emergencyContactName: null, emergencyContactRelationship: null, emergencyContactMobile: null,
    allergies: [], medicalConditions: null, previousSurgeries: null, currentMedications: null,
    familyHistory: null, patientHistory: null, habits: null, idType: null, idNumber: null,
    insuranceProvider: null, insurancePolicyNumber: null, insurancePolicyHolderName: null,
    insuranceValidTill: null, referredBy: null, howDidYouHear: null, notes: null,
    status: "active", createdBy: ADMIN_ID, createdAt: daysAgo(int(0, 90)), updatedAt: now,
  });
}
await db.collection("clc_patients").insertMany(patients);

// ---- appointments (last 45 days + next 10) ----
const apptStatuses = ["scheduled","confirmed","completed","cancelled","no_show","rescheduled"];
const appointments = [];
for (let i = 0; i < 8000; i++) {
  const doctorIdx = i % doctors.length;
  const d = doctors[doctorIdx];
  const p = patients[i % patients.length];
  // Guarantee a unique (doctor, date, time) slot — matches the DB's
  // no-double-booking unique partial index.
  const slot = Math.floor(i / doctors.length);
  const dayOffset = slot % 55;            // 0..54 -> -45..+9 days
  const slotIdx = Math.floor(slot / 55) % 32; // 32 x 15-min slots/day
  const day = dayOffset - 45;
  const startMinutes = 9 * 60 + slotIdx * 15;
  const status = day < 0 ? pick(["completed","completed","completed","cancelled","no_show"]) : pick(["scheduled","confirmed"]);
  appointments.push({
    clinicId: CLINIC_ID, appointmentId: `apt_PERF${String(i).padStart(7, "0")}`,
    patientId: p.patientId, doctorId: d.doctorId,
    date: iso(daysAgo(-day)), time: `${String(Math.floor(startMinutes / 60)).padStart(2, "0")}:${String(startMinutes % 60).padStart(2, "0")}`,
    status, reason: pick(["Fever","Checkup","Tooth pain","Follow-up","Headache","Routine"]),
    notes: null, createdBy: ADMIN_ID, createdAt: daysAgo(int(0, 60)), updatedAt: now,
    queueStatus: status === "completed" ? "completed" : null,
    tokenNumber: i % 40 + 1, session: pick(["morning","afternoon","evening"]),
    priority: false, checkedInAt: null, calledAt: null, completedAt: null,
    notifiedStages: [], queueHistory: [],
  });
}
await db.collection("clc_appointments").insertMany(appointments);

// ---- bills ----
const bills = [];
for (let i = 0; i < 3000; i++) {
  const p = patients[i % patients.length];
  const subtotal = int(200, 5000);
  const total = subtotal;
  const paid = pick(["paid","paid","unpaid","partial"]);
  bills.push({
    clinicId: CLINIC_ID, billId: `bil_PERF${String(i).padStart(7, "0")}`,
    billNumber: `B-2026-${String(i).padStart(5, "0")}`, patientId: p.patientId,
    doctorId: doctors[i % doctors.length].doctorId,
    items: [{ description: "Consultation", quantity: 1, unitPrice: subtotal, discount: 0, taxPercent: 0, lineTotal: subtotal }],
    subtotal, discount: 0, taxPercent: 0, taxAmount: 0, total,
    status: paid === "paid" ? "paid" : "issued", paymentType: paid === "paid" ? "cash" : null,
    amountPaid: paid === "paid" ? total : paid === "partial" ? Math.round(total / 2) : 0,
    balanceDue: paid === "paid" ? 0 : paid === "partial" ? total - Math.round(total / 2) : total,
    paymentStatus: paid === "paid" ? "paid" : paid === "partial" ? "partial" : "unpaid",
    paymentMethod: null, invoiceDate: daysAgo(int(0, 60)), dueDate: null, paidAt: paid === "paid" ? daysAgo(int(0, 60)) : null,
    notes: null, internalNotes: null, reference: null, sendMethod: "none",
    createdBy: ADMIN_ID, createdAt: daysAgo(int(0, 60)), updatedAt: now,
  });
}
await db.collection("clc_bills").insertMany(bills);

// ---- prescriptions ----
const presc = [];
for (let i = 0; i < 2000; i++) {
  const p = patients[i % patients.length];
  presc.push({
    clinicId: CLINIC_ID, prescriptionId: `prc_PERF${String(i).padStart(7, "0")}`,
    patientId: p.patientId, doctorId: doctors[i % doctors.length].doctorId,
    visitDate: iso(daysAgo(int(0, 60))), diagnosis: pick(["Viral fever","Gastritis","Dental caries","Hypertension"]),
    medicines: [{ name: "Paracetamol", dosage: "500mg", frequency: "TID", duration: "3d", instructions: null }],
    notes: null, createdBy: ADMIN_ID, createdAt: daysAgo(int(0, 60)), updatedAt: now,
  });
}
await db.collection("clc_prescriptions").insertMany(presc);

// ---- medicine records ----
const medRecs = [];
for (let i = 0; i < 1000; i++) {
  const p = patients[i % patients.length];
  medRecs.push({
    clinicId: CLINIC_ID, recordId: `med_PERF${String(i).padStart(7, "0")}`,
    patientId: p.patientId, doctorId: doctors[i % doctors.length].doctorId,
    diagnosis: pick(["Fever","Caries","Gingivitis","Pulpitis"]), symptoms: "pain",
    treatment: "rest", notes: null, visitDate: iso(daysAgo(int(0, 60))),
    attachments: [], createdBy: ADMIN_ID, createdAt: daysAgo(int(0, 60)), updatedAt: now,
  });
}
await db.collection("clc_medicine").insertMany(medRecs);

// ---- investigations ----
const invs = [];
for (let i = 0; i < 1200; i++) {
  const p = patients[i % patients.length];
  invs.push({
    clinicId: CLINIC_ID, investigationId: `inv_PERF${String(i).padStart(7, "0")}`,
    patientId: p.patientId, patientName: p.fullName, doctorId: doctors[i % doctors.length].doctorId,
    title: pick(["CBC","X-Ray","Blood sugar","Biopsy","Urine"]), notes: null,
    category: pick(["vital-test","x-ray","blood-report","biopsy","other"]),
    details: null, visitDate: iso(daysAgo(int(0, 60))), status: pick(["pending","completed","in-progress"]),
    chartData: null, medicalRecordId: null, createdBy: ADMIN_ID, createdByName: "Perf Admin",
    createdAt: daysAgo(int(0, 60)), updatedAt: now,
  });
}
await db.collection("clc_investigations").insertMany(invs);

// ---- examinations ----
const exams = [];
for (let i = 0; i < 1200; i++) {
  const p = patients[i % patients.length];
  exams.push({
    clinicId: CLINIC_ID, examinationId: `exm_PERF${String(i).padStart(7, "0")}`,
    patientId: p.patientId, patientName: p.fullName, doctorId: doctors[i % doctors.length].doctorId,
    visitDate: iso(daysAgo(int(0, 60))), status: pick(["pending","completed","in-progress"]),
    issueType: pick(["hard","soft"]), investigationId: null, oralFindings: "normal",
    notes: null, allergies: null, medicalConditions: null, previousSurgeries: null,
    currentMedications: null, patientHistory: null, familyHistory: null, habits: null,
    hpi: null, chiefComplaints: null, bloodPressure: null, temperature: null, pulse: null,
    respiratoryRate: null, spo2: null, createdBy: ADMIN_ID, createdByName: "Perf Admin",
    createdAt: daysAgo(int(0, 60)), updatedAt: now,
  });
}
await db.collection("clc_examinations").insertMany(exams);

// ---- labs ----
const labs = [];
for (let i = 0; i < 150; i++) {
  labs.push({
    clinicId: CLINIC_ID, labId: `lab_PERF${String(i).padStart(7, "0")}`,
    labName: `Perf Lab ${i}`, contactPerson: "Manager", phone: "9000000000",
    email: null, address: "Road", city: "Kochi", state: "Kerala", pincode: "682001",
    licenseNo: null, labType: "pathology", userId: null, status: "active",
    createdBy: ADMIN_ID, createdAt: daysAgo(int(0, 90)), updatedAt: now,
  });
}
await db.collection("clc_labs").insertMany(labs);

// ---- leads ----
const leads = [];
for (let i = 0; i < 3000; i++) {
  const receivedAt = daysAgo(int(0, 90));
  const responded = rnd() < 0.7;
  leads.push({
    clinicId: CLINIC_ID, leadId: `led_PERF${String(i).padStart(7, "0")}`,
    source: pick(["meta_facebook","meta_instagram","manual","other"]), sourceRef: null,
    name: `Lead ${i}`, phone: `97${String(10000000 + i).slice(0, 8)}`, email: null,
    formAnswers: {}, consent: null, status: pick(["new","contacted","qualified","appointment","converted","lost"]),
    priority: pick(["low","normal","high"]), department: null, service: null, team: null,
    assignedTo: null, assignedAt: null, receivedAt,
    firstResponseAt: responded ? new Date(receivedAt.getTime() + int(1, 120) * 60000) : null,
    firstContactAt: null, contactAttempts: 0, appointmentBookedAt: null, convertedAt: null,
    createdAt: receivedAt, updatedAt: now,
  });
}
await db.collection("clc_leads").insertMany(leads);

// ---- notifications ----
const notifs = [];
for (let i = 0; i < 1500; i++) {
  notifs.push({
    clinicId: CLINIC_ID, notificationId: `ntf_PERF${String(i).padStart(7, "0")}`,
    recipientUserId: ADMIN_ID, type: "info", title: `Notification ${i}`, body: "body",
    readAt: rnd() < 0.5 ? now : null, link: null, createdAt: daysAgo(int(0, 60)), updatedAt: now,
  });
}
await db.collection("clc_notifications").insertMany(notifs);

// ---- medical record folders + files ----
const folders = [];
for (let i = 0; i < 100; i++) {
  folders.push({
    clinicId: CLINIC_ID, folderId: `fld_PERF${String(i).padStart(7, "0")}`,
    patientId: patients[i % patients.length].patientId, name: `Folder ${i}`,
    isDefault: false, defaultKey: null, parentFolderId: null,
    createdBy: ADMIN_ID, createdByName: "Perf Admin", createdAt: daysAgo(int(0, 60)),
  });
}
await db.collection("clc_medical_record_folders").insertMany(folders);

const files = [];
for (let i = 0; i < 800; i++) {
  const p = patients[i % patients.length];
  files.push({
    clinicId: CLINIC_ID, fileId: `fil_PERF${String(i).padStart(7, "0")}`,
    patientId: p.patientId, patientName: p.fullName, patientPhone: p.mobile,
    fileName: `report-${i}.pdf`, r2Key: `reports/${CLINIC_ID}/${p.patientId}/report-${i}.pdf`,
    folder: folders[i % folders.length].folderId, mimeType: "application/pdf", size: 12345,
    version: 1, versions: [], downloadCount: 0, lastDownloadedAt: null,
    uploadedBy: ADMIN_ID, uploadedByName: "Perf Admin", createdAt: daysAgo(int(0, 60)),
  });
}
await db.collection("clc_medical_record_files").insertMany(files);

// ---- pharmacy ----
const suppliers = [];
for (let i = 0; i < 60; i++) {
  suppliers.push({
    clinicId: CLINIC_ID, supplierId: `sup_PERF${String(i).padStart(7, "0")}`,
    name: `Supplier ${i}`, contactPerson: "Rep", phone: "9000000000", email: null,
    gstNumber: null, address: null, city: null, state: null, pincode: null,
    status: "active", createdBy: ADMIN_ID, createdAt: daysAgo(90), updatedAt: now,
  });
}
await db.collection("clc_pharmacy_suppliers").insertMany(suppliers);

const meds = [];
for (let i = 0; i < 400; i++) {
  meds.push({
    clinicId: CLINIC_ID, medicineId: `pmed_PERF${String(i).padStart(6, "0")}`,
    name: `Medicine ${i}`, genericName: `Generic ${i}`, brand: `Brand ${i}`,
    category: pick(["tablet","syrup","injection"]), dosageForm: "tablet", strength: "500mg",
    unit: "strip", manufacturer: "Pharma", hsnCode: null, barcode: `BC${100000 + i}`,
    batchNumber: null, prescriptionRequired: false, reorderLevel: 10, minStockLevel: 5,
    maxStockLevel: null, purchasePrice: 10 + i, sellingPrice: 15 + i, taxPercent: 5,
    discount: 0, supplierId: suppliers[i % suppliers.length].supplierId,
    manufacturingDate: null, expiryDate: "2027-12-31", storageConditions: null,
    status: "active", createdAt: daysAgo(90), updatedAt: now,
  });
}
await db.collection("clc_pharmacy_medicines").insertMany(meds);

const inventory = [];
for (let i = 0; i < 1200; i++) {
  const m = meds[i % meds.length];
  inventory.push({
    clinicId: CLINIC_ID, inventoryId: `pinv_PERF${String(i).padStart(6, "0")}`,
    medicineId: m.medicineId, name: m.name, genericName: m.genericName, category: m.category,
    batchNumber: `B${i}`, barcode: `BC${100000 + i}`, quantityAvailable: int(0, 200),
    quantityReserved: 0, quantityDamaged: 0, purchasePrice: m.purchasePrice,
    sellingPrice: m.sellingPrice, taxPercent: 5, expiryDate: "2027-12-31",
    manufacturingDate: null, supplierId: suppliers[i % suppliers.length].supplierId,
    storageLocation: `A${i % 20}`, reorderLevel: 10,
    status: int(0, 200) > 20 ? "in_stock" : "low_stock", reorderStatus: "ok",
    lastUpdated: daysAgo(int(0, 30)), createdAt: daysAgo(60), updatedAt: now,
  });
}
await db.collection("clc_pharmacy_inventory").insertMany(inventory);

const purchases = [];
for (let i = 0; i < 600; i++) {
  purchases.push({
    clinicId: CLINIC_ID, purchaseId: `ppur_PERF${String(i).padStart(6, "0")}`,
    invoiceNumber: `PI-${1000 + i}`, supplierId: suppliers[i % suppliers.length].supplierId,
    supplierName: `Supplier ${i % suppliers.length}`, purchaseDate: iso(daysAgo(int(0, 60))),
    items: [], subtotal: 1000, discount: 0, taxPercent: 5, taxAmount: 50, total: 1050,
    amountPaid: 1050, balanceDue: 0, paymentStatus: "paid", status: "received",
    notes: null, createdBy: ADMIN_ID, createdAt: daysAgo(int(0, 60)), updatedAt: now,
  });
}
await db.collection("clc_pharmacy_purchases").insertMany(purchases);

const sales = [];
for (let i = 0; i < 1500; i++) {
  sales.push({
    clinicId: CLINIC_ID, saleId: `psal_PERF${String(i).padStart(6, "0")}`,
    invoiceNumber: `PS-${2000 + i}`, patientId: patients[i % patients.length].patientId,
    customerName: `Customer ${i}`, saleDate: iso(daysAgo(int(0, 60))), items: [],
    subtotal: 500, discount: 0, taxPercent: 5, taxAmount: 25, total: 525,
    amountPaid: 525, balanceDue: 0, paymentStatus: "paid", paymentMethod: "cash",
    status: "completed", notes: null, createdBy: ADMIN_ID,
    createdAt: daysAgo(int(0, 60)), updatedAt: now,
  });
}
await db.collection("clc_pharmacy_sales").insertMany(sales);

const movements = [];
for (let i = 0; i < 4000; i++) {
  const m = meds[i % meds.length];
  movements.push({
    clinicId: CLINIC_ID, movementId: `pmov_PERF${String(i).padStart(6, "0")}`,
    transactionId: `txn-${i}`, medicineId: m.medicineId, batchNumber: `B${i % 1200}`,
    quantityBefore: 100, quantityChanged: -1, quantityAfter: 99,
    movementType: pick(["purchase","sale","return","adjustment","damaged","expired"]),
    referenceInvoice: null, party: null, performedBy: ADMIN_ID, reason: null, notes: null,
    createdAt: daysAgo(int(0, 60)),
  });
}
await db.collection("clc_pharmacy_stock_movements").insertMany(movements);

console.log("Seeded perf clinic", CLINIC_ID);
console.log("counts:", JSON.stringify({
  doctors: doctors.length, patients: patients.length, appointments: appointments.length,
  bills: bills.length, prescriptions: presc.length, medicine: medRecs.length,
  investigations: invs.length, examinations: exams.length, labs: labs.length,
  leads: leads.length, notifications: notifs.length, folders: folders.length, files: files.length,
  suppliers: suppliers.length, meds: meds.length, inventory: inventory.length,
  purchases: purchases.length, sales: sales.length, movements: movements.length,
}));

await c.close();
