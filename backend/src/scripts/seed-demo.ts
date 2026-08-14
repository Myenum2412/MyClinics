import "./bootstrap-env";
import { getDb } from "@/lib/db";
import bcrypt from "bcryptjs";

// Demo seed data for the clinic. Safe to re-run: existing records are skipped.
// Seeds patients (with login accounts), medicines, appointments, bills,
// prescriptions and reports, all linked to the demo doctor e2e@clinic.local.

const DEMO_DOCTOR_EMAIL = "e2e@clinic.local";
const PATIENT_PASSWORD = "Patient@123";

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const addDays = (isoDate: string, days: number) => {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const demoPatients = [
  {
    fullName: "Lakshmi Nair",
    mobile: "+919812340001",
    email: "lakshmi.nair@demo.local",
    age: 29,
    gender: "Female",
    whatsapp: "+919812340001",
    bloodGroup: "O+",
    dateOfBirth: "1997-03-14",
    weight: 58,
    height: 158,
    guardianName: null,
    emergencyContactName: "Suresh Nair (Husband)",
    emergencyContactPhone: "+919812340011",
    maritalStatus: "Married",
    smoking: "No",
    alcohol: "No",
    address: "24 Rose Villa, Panampilly Nagar",
    city: "Kochi",
    pincode: "682036",
    occupation: "Housewife",
    medicalHistory: "Asthma since childhood",
    allergies: "Dust, pollen",
    currentMedications: "Salbutamol inhaler (as needed)",
    previousSurgeries: null,
    familyHistory: "Mother had asthma",
    notes: "Prefers video consultations",
  },
  {
    fullName: "Mohammed Farhan",
    mobile: "+919812340002",
    email: "mohammed.farhan@demo.local",
    age: 34,
    gender: "Male",
    whatsapp: "+919812340002",
    bloodGroup: "B+",
    dateOfBirth: "1992-08-22",
    weight: 82,
    height: 176,
    guardianName: null,
    emergencyContactName: "Aisha Farhan (Wife)",
    emergencyContactPhone: "+919812340012",
    maritalStatus: "Married",
    smoking: "No",
    alcohol: "Yes",
    address: "18 MG Road, Palarivattom",
    city: "Kochi",
    pincode: "682025",
    occupation: "Software Engineer",
    medicalHistory: "Hypertension (borderline)",
    allergies: null,
    currentMedications: null,
    previousSurgeries: null,
    familyHistory: "Father had hypertension",
    notes: "Frequent late-night work",
  },
  {
    fullName: "Devika Pillai",
    mobile: "+919812340003",
    email: "devika.pillai@demo.local",
    age: 52,
    gender: "Female",
    whatsapp: "+919812340003",
    bloodGroup: "A-",
    dateOfBirth: "1974-01-05",
    weight: 66,
    height: 160,
    guardianName: null,
    emergencyContactName: "Ramesh Pillai (Husband)",
    emergencyContactPhone: "+919812340013",
    maritalStatus: "Married",
    smoking: "No",
    alcohol: "No",
    address: "7 Krishna Nivas, Punkunnam",
    city: "Thrissur",
    pincode: "680002",
    occupation: "School Teacher",
    medicalHistory: "Type 2 diabetes, high cholesterol",
    allergies: "Penicillin",
    currentMedications: "Metformin 500mg, Atorvastatin 10mg",
    previousSurgeries: "C-section (2001)",
    familyHistory: "Mother had diabetes",
    notes: "Follow-up every 3 months",
  },
  {
    fullName: "Arun Kumar",
    mobile: "+919812340004",
    email: "arun.kumar@demo.local",
    age: 41,
    gender: "Male",
    whatsapp: null,
    bloodGroup: "O-",
    dateOfBirth: "1985-11-30",
    weight: 74,
    height: 170,
    guardianName: null,
    emergencyContactName: "Sindhu Arun (Wife)",
    emergencyContactPhone: "+919812340014",
    maritalStatus: "Married",
    smoking: "Yes",
    alcohol: "Yes",
    address: "33 Harbour View, Vypin",
    city: "Ernakulam",
    pincode: "682508",
    occupation: "Auto Driver",
    medicalHistory: null,
    allergies: "Peanuts",
    currentMedications: null,
    previousSurgeries: "Appendectomy (2015)",
    familyHistory: null,
    notes: "Smoker - advised to quit",
  },
  {
    fullName: "Sofia Thomas",
    mobile: "+919812340005",
    email: "sofia.thomas@demo.local",
    age: 7,
    gender: "Female",
    whatsapp: "+919812340005",
    bloodGroup: "A+",
    dateOfBirth: "2019-06-12",
    weight: 22,
    height: 120,
    guardianName: "Anitha Thomas (Mother)",
    emergencyContactName: "Anitha Thomas (Mother)",
    emergencyContactPhone: "+919812340015",
    maritalStatus: null,
    smoking: "No",
    alcohol: "No",
    address: "12 Green Park, Kakkanad",
    city: "Kochi",
    pincode: "682030",
    occupation: "Student",
    medicalHistory: null,
    allergies: null,
    currentMedications: null,
    previousSurgeries: null,
    familyHistory: null,
    notes: "Child patient - guardian is mother",
  },
  {
    fullName: "Rajesh Menon",
    mobile: "+919812340006",
    email: "rajesh.menon@demo.local",
    age: 58,
    gender: "Male",
    whatsapp: "+919812340006",
    bloodGroup: "AB+",
    dateOfBirth: "1968-04-19",
    weight: 71,
    height: 168,
    guardianName: null,
    emergencyContactName: "Meera Menon (Wife)",
    emergencyContactPhone: "+919812340016",
    maritalStatus: "Married",
    smoking: "No",
    alcohol: "No",
    address: "41 Lake Road, Kanjikuzhi",
    city: "Kottayam",
    pincode: "686001",
    occupation: "Retired Banker",
    medicalHistory: "Hypertension, knee arthritis",
    allergies: "Aspirin",
    currentMedications: "Amlodipine 5mg",
    previousSurgeries: "Knee replacement (2022)",
    familyHistory: "Father had heart disease",
    notes: "Needs quarterly BP review",
  },
];

const demoMedicines = [
  { name: "Paracetamol 500mg", category: "Pain Relief", notes: "Take after food" },
  { name: "Amoxicillin 250mg", category: "Antibiotics", notes: "Complete the course" },
  { name: "Cetirizine 10mg", category: "Antihistamine", notes: "Once daily at night" },
  { name: "Metformin 500mg", category: "Diabetes", notes: "With breakfast and dinner" },
  { name: "Amlodipine 5mg", category: "Cardiology", notes: "Once daily morning" },
  { name: "Azithromycin 500mg", category: "Antibiotics", notes: "One tablet daily for 3 days" },
  { name: "Pantoprazole 40mg", category: "Gastric", notes: "30 min before breakfast" },
  { name: "Vitamin D3 60K", category: "Supplements", notes: "Weekly once" },
];


async function main() {
  const db = await getDb();
  const doctor = await db.collection("users").findOne({ email: DEMO_DOCTOR_EMAIL });
  if (!doctor) {
    console.error(`Demo doctor ${DEMO_DOCTOR_EMAIL} not found. Register it first.`);
    process.exit(1);
  }
  const doctorId = doctor._id.toString();
  const doctorName = doctor.name;

  const stats: Record<string, number> = {
    patients: 0,
    medicines: 0,
    appointments: 0,
    bills: 0,
    prescriptions: 0,
    reports: 0,
  };

  // ---- patients (with login accounts) ----
  const patientsCollection = db.collection("patients");
  const usersCollection = db.collection("users");
  const patientIds: Record<string, string> = {};

  for (const p of demoPatients) {
    const existing = await patientsCollection.findOne({ mobile: p.mobile });
    if (existing) {
      patientIds[p.mobile] = existing._id.toString();
      continue;
    }
    const userResult = await usersCollection.insertOne({
      name: p.fullName,
      email: p.email.toLowerCase(),
      password: await bcrypt.hash(PATIENT_PASSWORD, 10),
      role: "patient",
      image: null,
      createdAt: new Date(),
    });
    const result = await patientsCollection.insertOne({
      fullName: p.fullName,
      mobile: p.mobile,
      secondaryMobile: null,
      age: p.age,
      gender: p.gender,
      email: p.email.toLowerCase(),
      whatsapp: p.whatsapp ?? null,
      bloodGroup: p.bloodGroup,
      address: p.address,
      city: p.city,
      occupation: p.occupation,
      medicalHistory: p.medicalHistory ?? null,
      allergies: p.allergies ?? null,
      notes: p.notes ?? null,
      userId: userResult.insertedId,
      createdAt: new Date(),
    });
    patientIds[p.mobile] = result.insertedId.toString();
    stats.patients += 1;
  }

  for (const p of demoPatients) {
    await patientsCollection.updateOne(
      { mobile: p.mobile },
      {
        $set: {
          bloodGroup: p.bloodGroup,
          dateOfBirth: p.dateOfBirth ?? null,
          weight: p.weight ?? null,
          height: p.height ?? null,
          guardianName: p.guardianName ?? null,
          emergencyContactName: p.emergencyContactName ?? null,
          emergencyContactPhone: p.emergencyContactPhone ?? null,
          maritalStatus: p.maritalStatus ?? null,
          smoking: p.smoking ?? null,
          alcohol: p.alcohol ?? null,
          address: p.address,
          city: p.city,
          pincode: p.pincode ?? null,
          occupation: p.occupation,
          medicalHistory: p.medicalHistory ?? null,
          allergies: p.allergies ?? null,
          currentMedications: p.currentMedications ?? null,
          previousSurgeries: p.previousSurgeries ?? null,
          familyHistory: p.familyHistory ?? null,
          notes: p.notes ?? null,
        },
      }
    );
  }

  // ---- medicines ----
  const medicinesCollection = db.collection("medicines");
  for (const m of demoMedicines) {
    const existing = await medicinesCollection.findOne({ name: m.name });
    if (existing) continue;
    await medicinesCollection.insertOne({
      name: m.name,
      category: m.category,
      notes: m.notes,
      createdAt: new Date(),
    });
    stats.medicines += 1;
  }

  // ---- appointments ----
  const t = today();
  const appointmentsCollection = db.collection("appointments");
  const getPatient = (mobile: string) =>
    demoPatients.find((p) => p.mobile === mobile)!;
  const demos = [
    { fullName: "Lakshmi Nair", mobile: "+919812340001", date: t, time: "09:30", type: "video", status: "confirmed", department: "General Medicine", reason: "Asthma review" },
    { fullName: "Mohammed Farhan", mobile: "+919812340002", date: t, time: "10:15", type: "in-person", status: "pending", department: "General Medicine", reason: "Blood pressure check" },
    { fullName: "Sofia Thomas", mobile: "+919812340005", date: t, time: "11:00", type: "in-person", status: "completed", department: "Pediatrics", reason: "Fever and cold" },
    { fullName: "Devika Pillai", mobile: "+919812340003", date: addDays(t, -3), time: "16:00", type: "in-person", status: "completed", department: "General Medicine", reason: "Diabetes follow-up" },
    { fullName: "Arun Kumar", mobile: "+919812340004", date: addDays(t, -5), time: "12:30", type: "in-person", status: "completed", department: "General Medicine", reason: "Chest pain" },
    { fullName: "Rajesh Menon", mobile: "+919812340006", date: addDays(t, -7), time: "15:15", type: "in-person", status: "completed", department: "Cardiology", reason: "BP review" },
    { fullName: "Arun Kumar", mobile: "+919812340004", date: addDays(t, -9), time: "10:45", type: "in-person", status: "no_show", department: "General Medicine", reason: "Follow-up" },
    { fullName: "Devika Pillai", mobile: "+919812340003", date: addDays(t, -12), time: "17:30", type: "video", status: "cancelled", department: "General Medicine", reason: "Rescheduled" },
    { fullName: "Mohammed Farhan", mobile: "+919812340002", date: addDays(t, 2), time: "09:45", type: "in-person", status: "confirmed", department: "General Medicine", reason: "Full body checkup" },
    { fullName: "Lakshmi Nair", mobile: "+919812340001", date: addDays(t, 4), time: "14:00", type: "in-person", status: "pending", department: "General Medicine", reason: "Allergy consultation" },
    { fullName: "Sofia Thomas", mobile: "+919812340005", date: addDays(t, 6), time: "10:30", type: "video", status: "pending", department: "Pediatrics", reason: "Vaccination review" },
  ];

  const counters: Record<string, number> = {};
  for (const a of demos) {
    const exists = await appointmentsCollection.findOne({
      mobile: a.mobile,
      date: a.date,
      time: a.time,
    });
    if (exists) continue;
    const p = getPatient(a.mobile);
    counters[a.date] = (counters[a.date] ?? 0) + 1;
    await appointmentsCollection.insertOne({
      fullName: a.fullName,
      mobile: a.mobile,
      secondaryMobile: null,
      age: p.age,
      gender: p.gender,
      email: p.email,
      whatsapp: p.whatsapp ?? null,
      doctorId,
      doctorName,
      department: a.department,
      date: a.date,
      time: a.time,
      type: a.type,
      reason: a.reason,
      status: a.status,
      bookingSource: "manual",
      notes: null,
      counter: counters[a.date],
      whatsappConversationId: null,
      createdAt: new Date(),
    });
    stats.appointments += 1;
  }

  // ---- bills ----
  const billsCollection = db.collection("bills");
  const billCount = await billsCollection.countDocuments({});
  const billDemos = [
    { fullName: "Sofia Thomas", mobile: "+919812340005", items: [{ name: "Consultation", qty: 1, price: 500 }, { name: "Paracetamol 500mg", qty: 10, price: 25 }], paymentMethod: "UPI", status: "paid", date: t },
    { fullName: "Devika Pillai", mobile: "+919812340003", items: [{ name: "Consultation", qty: 1, price: 500 }, { name: "Metformin 500mg", qty: 60, price: 12 }, { name: "Blood Sugar Test", qty: 1, price: 200 }], paymentMethod: "Card", status: "paid", date: addDays(t, -3) },
    { fullName: "Arun Kumar", mobile: "+919812340004", items: [{ name: "Consultation", qty: 1, price: 500 }, { name: "ECG", qty: 1, price: 400 }], paymentMethod: "Cash", status: "pending", date: addDays(t, -5) },
    { fullName: "Rajesh Menon", mobile: "+919812340006", items: [{ name: "Consultation", qty: 1, price: 600 }, { name: "Amlodipine 5mg", qty: 30, price: 18 }], paymentMethod: "Insurance", status: "paid", date: addDays(t, -7) },
    { fullName: "Mohammed Farhan", mobile: "+919812340002", items: [{ name: "Full Body Checkup", qty: 1, price: 2500 }], paymentMethod: "UPI", status: "pending", date: addDays(t, 2) },
  ];

  const computeTotals = (items: { qty: number; price: number }[]) => {
    const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
    return { subtotal, discount: 0, taxRate: 0, tax: 0, total: subtotal };
  };

  let billIndex = 0;
  for (const b of billDemos) {
    const exists = await billsCollection.findOne({
      patientPhone: b.mobile,
      date: b.date,
    });
    if (exists) continue;
    const number = `INV-${String(billCount + billIndex + 1).padStart(4, "0")}`;
    await billsCollection.insertOne({
      billNumber: number,
      patientName: b.fullName,
      patientPhone: b.mobile,
      doctorId,
      doctorName,
      date: b.date,
      items: b.items.map((i) => ({
        name: i.name,
        qty: i.qty,
        price: i.price,
        amount: i.qty * i.price,
      })),
      ...computeTotals(b.items),
      paymentMethod: b.paymentMethod,
      status: b.status,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    billIndex += 1;
    stats.bills += 1;
  }

  // ---- prescriptions ----
  const prescriptionsCollection = db.collection("prescriptions");
  const rxDemos = [
    {
      fullName: "Sofia Thomas", mobile: "+919812340005", age: 7, gender: "Female",
      visitDate: addDays(t, -1), diagnosis: "Viral fever with mild cold",
      symptoms: ["Fever 101F for 2 days", "Runny nose", "Body ache"],
      medicines: [
        { name: "Paracetamol 500mg", dosage: "125mg", frequency: "3x daily", duration: "3 days" },
        { name: "Cetirizine 10mg", dosage: "2.5mg", frequency: "Once at night", duration: "3 days" },
      ],
      testsRecommended: null,
      followUpDate: addDays(t, 3),
    },
    {
      fullName: "Devika Pillai", mobile: "+919812340003", age: 52, gender: "Female",
      visitDate: addDays(t, -3), diagnosis: "Type 2 diabetes - stable",
      symptoms: ["Routine follow-up", "Occasional tingling in feet"],
      medicines: [
        { name: "Metformin 500mg", dosage: "500mg", frequency: "2x daily with meals", duration: "3 months" },
        { name: "Vitamin D3 60K", dosage: "60K IU", frequency: "Weekly once", duration: "1 month" },
      ],
      testsRecommended: "HbA1c in 3 months",
      followUpDate: addDays(t, 90),
    },
    {
      fullName: "Arun Kumar", mobile: "+919812340004", age: 41, gender: "Male",
      visitDate: addDays(t, -5), diagnosis: "Gastritis and acid reflux",
      symptoms: ["Burning sensation", "Chest discomfort after meals"],
      medicines: [
        { name: "Pantoprazole 40mg", dosage: "40mg", frequency: "Once daily before breakfast", duration: "2 weeks" },
      ],
      testsRecommended: "Endoscopy if no improvement",
      followUpDate: addDays(t, 14),
    },
    {
      fullName: "Rajesh Menon", mobile: "+919812340006", age: 58, gender: "Male",
      visitDate: addDays(t, -7), diagnosis: "Hypertension - well controlled",
      symptoms: ["Routine BP check"],
      medicines: [
        { name: "Amlodipine 5mg", dosage: "5mg", frequency: "Once daily morning", duration: "6 months" },
      ],
      testsRecommended: "Lipid profile",
      followUpDate: addDays(t, 90),
    },
    {
      fullName: "Lakshmi Nair", mobile: "+919812340001", age: 29, gender: "Female",
      visitDate: t, diagnosis: "Allergic rhinitis",
      symptoms: ["Sneezing", "Watery eyes"],
      medicines: [
        { name: "Cetirizine 10mg", dosage: "10mg", frequency: "Once daily at night", duration: "1 week" },
      ],
      testsRecommended: null,
      followUpDate: addDays(t, 7),
    },
  ];

  for (const rx of rxDemos) {
    const exists = await prescriptionsCollection.findOne({
      patientName: rx.fullName,
      visitDate: rx.visitDate,
    });
    if (exists) continue;
    await prescriptionsCollection.insertOne({
      patientName: rx.fullName,
      age: rx.age,
      gender: rx.gender,
      phone: rx.mobile,
      visitDate: rx.visitDate,
      diagnosis: rx.diagnosis,
      symptoms: rx.symptoms,
      medicines: rx.medicines,
      testsRecommended: rx.testsRecommended,
      followUpDate: rx.followUpDate,
      doctorId,
      doctorName,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    stats.prescriptions += 1;
  }

  // ---- reports ----
  const reportsCollection = db.collection("reports");
  const reportDemos = [
    { name: "Blood Test Report", patientName: "Devika Pillai", mobile: "+919812340003", category: "lab" },
    { name: "Chest X-Ray", patientName: "Arun Kumar", mobile: "+919812340004", category: "imaging" },
    { name: "Lipid Profile", patientName: "Rajesh Menon", mobile: "+919812340006", category: "lab" },
  ];

  for (const r of reportDemos) {
    const patient = await patientsCollection.findOne({ mobile: r.mobile });
    if (!patient) continue;
    const exists = await reportsCollection.findOne({ name: r.name, patientId: patient._id });
    if (exists) continue;
    await reportsCollection.insertOne({
      name: r.name,
      key: `reports/demo-${r.name.replace(/[^a-zA-Z0-9._-]/g, "_").toLowerCase()}.pdf`,
      size: 1024 * 120,
      type: "application/pdf",
      extension: "pdf",
      folderId: null,
      category: r.category,
      patientId: patient._id,
      patientName: r.patientName,
      prescriptionId: null,
      prescriptionLabel: null,
      uploadedBy: doctorName,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    stats.reports += 1;
  }

  console.log("Demo data seeded:");
  for (const [key, value] of Object.entries(stats)) {
    console.log(`  ${key.padEnd(13)} +${value}`);
  }
  console.log(`\nPatient login password: ${PATIENT_PASSWORD}`);
  await db.client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
