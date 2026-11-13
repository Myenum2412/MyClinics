import { MongoClient, ObjectId } from "mongodb";

// Configuration for user: amarnathdemo2412@gmail.com
const TARGET_USER_EMAIL = "amarnathdemo2412@gmail.com";
const TARGET_CLINIC_ID = "clc_74l-VlfFCYQPCgZ8";
const TARGET_USER_ID = "usr_3E5UZwgjlVAcaJjp";

const ATLAS_URI = "mongodb+srv://amarnathkerala2003_db_user:0BTVmgwB5RM0zlk2@myclinic.wjlyxvi.mongodb.net/?appName=myclinic";
const LOCAL_URI = "mongodb://127.0.0.1:27017";
const DB_NAME = "myclinic";

// Deterministic Pseudo-Random Generator
let seedVal = 12345;
function rnd() {
  seedVal = (seedVal * 1664525 + 1013904223) % 4294967296;
  return seedVal / 4294967296;
}
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const intBetween = (min, max) => min + Math.floor(rnd() * (max - min + 1));

// Base date: Today is 2026-11-13
const TODAY_STR = "2026-11-13";
const NOW = new Date("2026-11-13T14:30:00.000Z");

function daysOffset(d) {
  return new Date(NOW.getTime() + d * 86400000);
}
function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

export async function seedClinicData(uri, dbName) {
  console.log(`Connecting to ${uri.startsWith("mongodb+srv") ? "MongoDB Atlas" : "Local MongoDB"}...`);
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  await client.connect();
  const db = client.db(dbName);

  // 1. Check & Ensure Target User exists
  let user = await db.collection("clc_users").findOne({ email: TARGET_USER_EMAIL });
  let clinicId = TARGET_CLINIC_ID;
  let userId = TARGET_USER_ID;

  if (user) {
    clinicId = user.clinicId || TARGET_CLINIC_ID;
    userId = user.userId || TARGET_USER_ID;
    console.log(`Found user: ${user.email} with clinicId: ${clinicId}, userId: ${userId}`);
  } else {
    console.log(`User ${TARGET_USER_EMAIL} not found, creating user and clinic record...`);
    await db.collection("clc_clinics").insertOne({
      clinicId,
      slug: "demo-clinic",
      name: "Demo Clinic - Multi-Speciality Healthcare",
      phone: "+91 98470 24120",
      email: TARGET_USER_EMAIL,
      address: "42/108 Sunrise Avenue, Medical District, Kochi, Kerala 682016",
      website: "https://myclinic.myenum.in/demo-clinic",
      description: "Premier multi-speciality healthcare facility offering personalized primary care, cardiology, pediatrics, and dental excellence.",
      status: "active",
      settings: {
        workingHours: { open: "08:30", close: "19:30" },
        slotMinutes: 15,
        currency: "INR",
        timezone: "Asia/Kolkata",
      },
      createdAt: NOW,
      updatedAt: NOW,
    });
    await db.collection("clc_users").insertOne({
      clinicId,
      userId,
      name: "Dr. Amarnath",
      email: TARGET_USER_EMAIL,
      passwordHash: "$2b$12$9omybG0/QeL2SLIfRPlfV.YrqQRf9ARkpfCtXtFF1MGz7xihuieoG",
      authProvider: "password",
      role: "clinic_admin",
      doctorId: "doc_74l_amar01",
      staffId: null,
      patientId: "pat_74l_demo01",
      phone: "+91 98470 24120",
      status: "active",
      lastLoginAt: NOW,
      createdAt: NOW,
      updatedAt: NOW,
    });
  }

  // Clear existing tenant-scoped data ONLY for this specific clinic
  console.log(`Cleaning previous data for clinicId: ${clinicId}...`);
  const collectionsToClean = [
    "clc_doctors",
    "clc_staff",
    "clc_patients",
    "clc_appointments",
    "clc_bills",
    "clc_prescriptions",
    "clc_medicine",
    "clc_investigations",
    "clc_examinations",
    "clc_labs",
    "clc_leads",
    "clc_notifications",
    "clc_medical_record_folders",
    "clc_medical_record_files",
    "clc_crm_contacts",
    "clc_crm_companies",
    "clc_crm_deals",
    "clc_crm_activities",
    "clc_audit_logs",
    "clc_pharmacy_suppliers",
    "clc_pharmacy_medicines",
    "clc_pharmacy_inventory",
    "clc_pharmacy_purchases",
    "clc_pharmacy_sales",
    "clc_pharmacy_stock_movements",
    "clc_queue_settings",
  ];

  for (const col of collectionsToClean) {
    await db.collection(col).deleteMany({ clinicId });
  }

  // 2. Update Clinic details
  await db.collection("clc_clinics").updateOne(
    { clinicId },
    {
      $set: {
        name: "Demo Clinic - Multi-Speciality Healthcare",
        slug: "demo-clinic",
        phone: "+91 98470 24120",
        email: TARGET_USER_EMAIL,
        address: "42/108 Sunrise Avenue, Medical District, Kochi, Kerala 682016",
        website: "https://myclinic.myenum.in/demo-clinic",
        description: "Premier multi-speciality healthcare facility offering personalized primary care, cardiology, pediatrics, and dental excellence.",
        status: "active",
        settings: {
          workingHours: { open: "08:30", close: "19:30" },
          slotMinutes: 15,
          currency: "INR",
          timezone: "Asia/Kolkata",
        },
        updatedAt: NOW,
      },
    },
    { upsert: true }
  );

  // 3. Update Settings
  await db.collection("clc_settings").updateOne(
    { clinicId },
    {
      $set: {
        workingHours: { open: "08:30", close: "19:30" },
        slotMinutes: 15,
        currency: "INR",
        timezone: "Asia/Kolkata",
        receiptFooter: "Thank you for choosing Demo Clinic. We wish you vibrant health and speedy recovery!",
        smsEnabled: true,
        emailNotifications: true,
        gstin: "32AAAAA0000A1Z5",
        udyam: "UDYAM-KL-07-0012345",
        upiId: "democlinic@okhdfcbank",
        qrCodeUrl: null,
        aiAgentEnabled: true,
        termsAndConditions: "1. Follow-up consultation is complimentary within 7 days.\n2. Please carry prior medical records and test reports on your visit.\n3. In medical emergencies, proceed immediately to the casualty ward.",
        lookups: {
          specialties: ["General Medicine", "Pediatrics", "Dental Surgery", "Dermatology", "Orthopedics", "Cardiology"],
          visitTypes: ["Consultation", "Follow-up", "Routine Checkup", "Procedure", "Emergency"],
        },
        createdAt: daysOffset(-90),
        updatedAt: NOW,
      },
    },
    { upsert: true }
  );

  // 4. Update Queue Settings
  await db.collection("clc_queue_settings").updateOne(
    { clinicId },
    {
      $set: {
        enabledStages: ["you_are_next", "please_be_ready", "token_called", "proceed_to_room"],
        channel: "whatsapp",
        templateOverrides: {
          you_are_next: "Hi {name}, you are next in the queue (Token #{token}) for {doctor}. Please be near Consultation Room 1.",
          please_be_ready: "Hi {name}, please be ready — you will be called in a few minutes (Token #{token}).",
          token_called: "Hi {name}, token #{token} with {doctor} is now called! Please proceed inside.",
          proceed_to_room: "Hi {name}, your turn is now active. Please proceed inside.",
        },
        createdAt: daysOffset(-90),
        updatedAt: NOW,
      },
    },
    { upsert: true }
  );

  // 5. Doctors
  console.log("Seeding doctors...");
  const primaryDocId = "doc_74l_amar01";
  const doctors = [
    {
      clinicId,
      doctorId: primaryDocId,
      userId: userId, // Linked to the demo user!
      name: "Dr. Amarnath, MBBS, MD",
      specialization: "General Medicine",
      licenseNo: "KMC-2015-84920",
      registrationNo: "REG-84920-IND",
      qualification: "MBBS (AIIMS), MD General Medicine (CMC)",
      experienceYears: 12,
      phone: "+91 98470 24120",
      whatsapp: "+91 98470 24120",
      email: TARGET_USER_EMAIL,
      gender: "male",
      dateOfBirth: "1988-06-15",
      fee: 500,
      department: "Internal Medicine",
      issuingAuthority: "Travancore-Cochin Medical Council",
      address: "Sunrise Apartments, Kadavanthra",
      city: "Kochi",
      state: "Kerala",
      pincode: "682020",
      languages: "English, Malayalam, Hindi",
      about: "Senior Consultant Physician specializing in chronic lifestyle disease management, preventive cardiology, hypertension, and diabetes care.",
      scheduleDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      schedule: [
        { day: "Mon", start: "09:00", end: "13:00" },
        { day: "Mon", start: "16:00", end: "19:00" },
        { day: "Tue", start: "09:00", end: "13:00" },
        { day: "Tue", start: "16:00", end: "19:00" },
        { day: "Wed", start: "09:00", end: "13:00" },
        { day: "Wed", start: "16:00", end: "19:00" },
        { day: "Thu", start: "09:00", end: "13:00" },
        { day: "Thu", start: "16:00", end: "19:00" },
        { day: "Fri", start: "09:00", end: "13:00" },
        { day: "Fri", start: "16:00", end: "19:00" },
        { day: "Sat", start: "09:00", end: "14:00" },
      ],
      status: "active",
      createdBy: userId,
      createdAt: daysOffset(-90),
      updatedAt: NOW,
    },
    {
      clinicId,
      doctorId: "doc_74l_priya02",
      userId: null,
      name: "Dr. Priya Nair, MBBS, DNB",
      specialization: "Pediatrics",
      licenseNo: "KMC-2018-91204",
      registrationNo: "REG-91204-IND",
      qualification: "MBBS, DNB Pediatrics (Amrita Institute)",
      experienceYears: 8,
      phone: "+91 98470 33441",
      whatsapp: "+91 98470 33441",
      email: "dr.priya@democlinic.org",
      gender: "female",
      dateOfBirth: "1991-03-22",
      fee: 450,
      department: "Pediatrics & Child Health",
      issuingAuthority: "National Board of Examinations",
      address: "Green Valley, Panampilly Nagar",
      city: "Kochi",
      state: "Kerala",
      pincode: "682036",
      languages: "English, Malayalam",
      about: "Child specialist passionate about neonatal care, developmental milestones, vaccination schedules, and pediatric nutrition.",
      scheduleDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      schedule: [
        { day: "Mon", start: "10:00", end: "14:00" },
        { day: "Tue", start: "10:00", end: "14:00" },
        { day: "Wed", start: "10:00", end: "14:00" },
        { day: "Thu", start: "10:00", end: "14:00" },
        { day: "Fri", start: "10:00", end: "14:00" },
      ],
      status: "active",
      createdBy: userId,
      createdAt: daysOffset(-85),
      updatedAt: NOW,
    },
    {
      clinicId,
      doctorId: "doc_74l_rohit03",
      userId: null,
      name: "Dr. Rohit Menon, BDS, MDS",
      specialization: "Dental Surgery",
      licenseNo: "KDC-2016-55102",
      registrationNo: "REG-55102-DEN",
      qualification: "BDS, MDS Conservative Dentistry & Endodontics",
      experienceYears: 10,
      phone: "+91 98470 55662",
      whatsapp: "+91 98470 55662",
      email: "dr.rohit@democlinic.org",
      gender: "male",
      dateOfBirth: "1989-11-04",
      fee: 400,
      department: "Dental Sciences",
      issuingAuthority: "Kerala Dental Council",
      address: "Seaport-Airport Road",
      city: "Kochi",
      state: "Kerala",
      pincode: "682024",
      languages: "English, Malayalam, Hindi",
      about: "Comprehensive dental surgeon specializing in painless root canals, cosmetic smile designs, crowns, bridges, and preventive dental care.",
      scheduleDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      schedule: [
        { day: "Mon", start: "09:30", end: "13:30" },
        { day: "Tue", start: "09:30", end: "13:30" },
        { day: "Wed", start: "09:30", end: "13:30" },
        { day: "Thu", start: "09:30", end: "13:30" },
        { day: "Fri", start: "09:30", end: "13:30" },
        { day: "Sat", start: "09:30", end: "13:30" },
      ],
      status: "active",
      createdBy: userId,
      createdAt: daysOffset(-80),
      updatedAt: NOW,
    },
    {
      clinicId,
      doctorId: "doc_74l_anjali04",
      userId: null,
      name: "Dr. Anjali Varma, MD (DVL)",
      specialization: "Dermatology",
      licenseNo: "KMC-2017-78219",
      registrationNo: "REG-78219-DERM",
      qualification: "MBBS, MD Dermatology, Venereology & Leprosy",
      experienceYears: 7,
      phone: "+91 98470 77883",
      whatsapp: "+91 98470 77883",
      email: "dr.anjali@democlinic.org",
      gender: "female",
      dateOfBirth: "1992-08-19",
      fee: 600,
      department: "Dermatology & Cosmetology",
      issuingAuthority: "Travancore-Cochin Medical Council",
      address: "Chittoor Road, Ernakulam",
      city: "Kochi",
      state: "Kerala",
      pincode: "682011",
      languages: "English, Malayalam",
      about: "Expert in clinical dermatology, acne treatments, eczema, psoriasis, laser therapy, and anti-aging skin health solutions.",
      scheduleDays: ["Tue", "Thu", "Sat"],
      schedule: [
        { day: "Tue", start: "14:00", end: "18:00" },
        { day: "Thu", start: "14:00", end: "18:00" },
        { day: "Sat", start: "14:00", end: "18:00" },
      ],
      status: "active",
      createdBy: userId,
      createdAt: daysOffset(-75),
      updatedAt: NOW,
    },
    {
      clinicId,
      doctorId: "doc_74l_arun05",
      userId: null,
      name: "Dr. Arun Kurian, MS (Ortho)",
      specialization: "Orthopedics",
      licenseNo: "KMC-2014-44190",
      registrationNo: "REG-44190-IND",
      qualification: "MBBS, MS Orthopedic Surgery, Fellowship in Joint Replacement",
      experienceYears: 13,
      phone: "+91 98470 99004",
      whatsapp: "+91 98470 99004",
      email: "dr.arun@democlinic.org",
      gender: "male",
      dateOfBirth: "1986-01-29",
      fee: 550,
      department: "Orthopedics & Joint Care",
      issuingAuthority: "Travancore-Cochin Medical Council",
      address: "Edappally Toll, Kochi",
      city: "Kochi",
      state: "Kerala",
      pincode: "682024",
      languages: "English, Malayalam, Tamil",
      about: "Senior Orthopedic Surgeon focusing on knee and hip arthritis, sports injuries, fracture management, and spine pain rehabilitation.",
      scheduleDays: ["Mon", "Wed", "Fri"],
      schedule: [
        { day: "Mon", start: "15:00", end: "19:00" },
        { day: "Wed", start: "15:00", end: "19:00" },
        { day: "Fri", start: "15:00", end: "19:00" },
      ],
      status: "active",
      createdBy: userId,
      createdAt: daysOffset(-70),
      updatedAt: NOW,
    },
  ];
  await db.collection("clc_doctors").insertMany(doctors);

  // Link doctorId and patientId to user doc
  const primaryPatientId = "pat_74l_demo01";
  await db.collection("clc_users").updateOne(
    { userId },
    {
      $set: {
        name: "Dr. Amarnath",
        phone: "+91 98470 24120",
        doctorId: primaryDocId,
        patientId: primaryPatientId,
        updatedAt: NOW,
      },
    }
  );

  // 6. Staff members
  console.log("Seeding staff...");
  const staffMembers = [
    {
      clinicId,
      staffId: "stf_74l_01",
      userId: null,
      name: "Saritha V.K.",
      position: "Senior Clinic Nurse",
      phone: "+91 98471 10001",
      email: "saritha@democlinic.org",
      joinedAt: "2024-02-01",
      status: "active",
      createdBy: userId,
      createdAt: daysOffset(-120),
      updatedAt: NOW,
    },
    {
      clinicId,
      staffId: "stf_74l_02",
      userId: null,
      name: "Deepak Mohan",
      position: "Front Desk & Patient Relations Lead",
      phone: "+91 98471 10002",
      email: "reception@democlinic.org",
      joinedAt: "2024-03-15",
      status: "active",
      createdBy: userId,
      createdAt: daysOffset(-110),
      updatedAt: NOW,
    },
    {
      clinicId,
      staffId: "stf_74l_03",
      userId: null,
      name: "Meera Krishnan",
      position: "Diagnostic Lab In-Charge",
      phone: "+91 98471 10003",
      email: "lab@democlinic.org",
      joinedAt: "2024-04-10",
      status: "active",
      createdBy: userId,
      createdAt: daysOffset(-100),
      updatedAt: NOW,
    },
    {
      clinicId,
      staffId: "stf_74l_04",
      userId: null,
      name: "Kavitha R.",
      position: "Billing & Insurance Coordinator",
      phone: "+91 98471 10004",
      email: "billing@democlinic.org",
      joinedAt: "2024-05-01",
      status: "active",
      createdBy: userId,
      createdAt: daysOffset(-90),
      updatedAt: NOW,
    },
  ];
  await db.collection("clc_staff").insertMany(staffMembers);

  // 7. Patients
  console.log("Seeding patients...");
  const patientProfiles = [
    {
      id: primaryPatientId,
      name: "Amarnath Sharma",
      phone: "+91 98470 24120",
      email: TARGET_USER_EMAIL,
      gender: "male",
      dob: "1992-04-18",
      blood: "O+",
      city: "Kochi",
      address: "Flat 4B, Palm Grove Heights, Marine Drive",
      allergies: ["Penicillin"],
      conditions: "Mild seasonal allergic rhinitis",
      vitals: { bp: "120/80", pulse: "74", temp: "98.4", spo2: "99", resp: "16", height: "176", weight: "72" },
    },
    {
      id: "pat_74l_02",
      name: "Karthik Menon",
      phone: "+91 98471 22002",
      email: "karthik.menon@example.com",
      gender: "male",
      dob: "1985-09-12",
      blood: "B+",
      city: "Ernakulam",
      address: "12/480 Giri Nagar, Kadavanthra",
      allergies: ["Sulfa drugs"],
      conditions: "Hypertension Stage 1",
      vitals: { bp: "135/88", pulse: "80", temp: "98.6", spo2: "98", resp: "18", height: "172", weight: "78" },
    },
    {
      id: "pat_74l_03",
      name: "Lakshmi Pillai",
      phone: "+91 98471 22003",
      email: "lakshmi.pillai@example.com",
      gender: "female",
      dob: "1978-12-05",
      blood: "A+",
      city: "Kochi",
      address: "A-203 Skyline City Park, Jawaharlal Nehru Stadium Link Rd",
      allergies: [],
      conditions: "Type 2 Diabetes Mellitus",
      vitals: { bp: "128/82", pulse: "76", temp: "98.2", spo2: "99", resp: "16", height: "160", weight: "64" },
    },
    {
      id: "pat_74l_04",
      name: "Ravi Shankar",
      phone: "+91 98471 22004",
      email: "ravi.shankar@example.com",
      gender: "male",
      dob: "1996-03-24",
      blood: "AB+",
      city: "Kakkanad",
      address: "Infopark Phase 1 Rd, Kusumagiri",
      allergies: ["Dust mites"],
      conditions: "Gastroesophageal Reflux Disease (GERD)",
      vitals: { bp: "118/76", pulse: "70", temp: "98.5", spo2: "99", resp: "15", height: "180", weight: "75" },
    },
    {
      id: "pat_74l_05",
      name: "Divya Nambiar",
      phone: "+91 98471 22005",
      email: "divya.nambiar@example.com",
      gender: "female",
      dob: "1999-07-14",
      blood: "O+",
      city: "Kochi",
      address: "Villa 8, Silver Woods, Thevara",
      allergies: ["Aspirin"],
      conditions: "Migraine with aura",
      vitals: { bp: "115/74", pulse: "72", temp: "98.4", spo2: "99", resp: "16", height: "165", weight: "55" },
    },
    {
      id: "pat_74l_06",
      name: "Anoop Thomas",
      phone: "+91 98471 22006",
      email: "anoop.thomas@example.com",
      gender: "male",
      dob: "1982-11-30",
      blood: "B-",
      city: "Aluva",
      address: "Railway Station Rd, Bank Junction",
      allergies: [],
      conditions: "Mild Lumbar Spondylosis",
      vitals: { bp: "124/80", pulse: "75", temp: "98.6", spo2: "98", resp: "16", height: "174", weight: "82" },
    },
    {
      id: "pat_74l_07",
      name: "Sneha Nair",
      phone: "+91 98471 22007",
      email: "sneha.nair@example.com",
      gender: "female",
      dob: "2018-05-10",
      blood: "O-",
      city: "Kochi",
      address: "Rose Gardens, Panampilly Nagar",
      allergies: ["Peanuts"],
      conditions: "Pediatric Allergic Bronchitis",
      vitals: { bp: "100/65", pulse: "92", temp: "99.1", spo2: "97", resp: "22", height: "115", weight: "21" },
    },
    {
      id: "pat_74l_08",
      name: "George Mathew",
      phone: "+91 98471 22008",
      email: "george.mathew@example.com",
      gender: "male",
      dob: "1965-08-19",
      blood: "A-",
      city: "Fort Kochi",
      address: "Princess Street, Near St. Francis Church",
      allergies: [],
      conditions: "Bilateral Knee Osteoarthritis",
      vitals: { bp: "138/84", pulse: "68", temp: "98.3", spo2: "97", resp: "16", height: "168", weight: "79" },
    },
    {
      id: "pat_74l_09",
      name: "Fathima Beevi",
      phone: "+91 98471 22009",
      email: "fathima.beevi@example.com",
      gender: "female",
      dob: "1972-02-14",
      blood: "B+",
      city: "Mattancherry",
      address: "Jew Town Road, Synagogue Lane",
      allergies: ["Ibuprofen"],
      conditions: "Hypothyroidism, Dyslipidemia",
      vitals: { bp: "130/85", pulse: "78", temp: "98.4", spo2: "98", resp: "17", height: "158", weight: "68" },
    },
    {
      id: "pat_74l_10",
      name: "Rahul Das",
      phone: "+91 98471 22010",
      email: "rahul.das@example.com",
      gender: "male",
      dob: "1994-10-28",
      blood: "O+",
      city: "Kochi",
      address: "33/1900 Subhash Nagar, Edappally",
      allergies: [],
      conditions: "Dental Caries & Gingivitis",
      vitals: { bp: "120/78", pulse: "74", temp: "98.6", spo2: "99", resp: "16", height: "178", weight: "70" },
    },
    {
      id: "pat_74l_11",
      name: "Gayatri Venkataraman",
      phone: "+91 98471 22011",
      email: "gayatri.v@example.com",
      gender: "female",
      dob: "1988-01-17",
      blood: "AB-",
      city: "Tripunithura",
      address: "Statue Junction, Hill Palace Road",
      allergies: [],
      conditions: "PCOS, Acne Vulgaris",
      vitals: { bp: "116/74", pulse: "76", temp: "98.4", spo2: "99", resp: "16", height: "162", weight: "61" },
    },
    {
      id: "pat_74l_12",
      name: "Harish Babu",
      phone: "+91 98471 22012",
      email: "harish.babu@example.com",
      gender: "male",
      dob: "1975-06-21",
      blood: "A+",
      city: "Kochi",
      address: "Near High Court, Banerjee Road",
      allergies: [],
      conditions: "Fatty Liver Grade 1",
      vitals: { bp: "132/86", pulse: "82", temp: "98.5", spo2: "98", resp: "18", height: "170", weight: "84" },
    },
    {
      id: "pat_74l_13",
      name: "Sandhya Suresh",
      phone: "+91 98471 22013",
      email: "sandhya.suresh@example.com",
      gender: "female",
      dob: "1993-12-09",
      blood: "O+",
      city: "Kakkanad",
      address: "Green Meadows, Vazhakkala",
      allergies: [],
      conditions: "Iron Deficiency Anemia",
      vitals: { bp: "110/70", pulse: "84", temp: "98.2", spo2: "99", resp: "16", height: "157", weight: "51" },
    },
    {
      id: "pat_74l_14",
      name: "Vivek Varma",
      phone: "+91 98471 22014",
      email: "vivek.varma@example.com",
      gender: "male",
      dob: "2001-04-03",
      blood: "B+",
      city: "Kochi",
      address: "St. Alberts College Road",
      allergies: [],
      conditions: "Sports injury (right ankle sprain)",
      vitals: { bp: "118/76", pulse: "68", temp: "98.6", spo2: "99", resp: "15", height: "182", weight: "74" },
    },
    {
      id: "pat_74l_15",
      name: "Sunita Nair",
      phone: "+91 98471 22015",
      email: "sunita.nair@example.com",
      gender: "female",
      dob: "1980-08-30",
      blood: "O+",
      city: "Cheranallur",
      address: "National Highway Bypass",
      allergies: ["Cephalosporins"],
      conditions: "Chronic Sinusitis",
      vitals: { bp: "122/80", pulse: "75", temp: "98.7", spo2: "98", resp: "17", height: "163", weight: "62" },
    },
    {
      id: "pat_74l_16",
      name: "Arjun K.",
      phone: "+91 98471 22016",
      email: "arjun.k@example.com",
      gender: "male",
      dob: "2015-09-08",
      blood: "A+",
      city: "Kochi",
      address: "Kaloor Stadium Link Rd",
      allergies: [],
      conditions: "Routine Pediatric Checkup",
      vitals: { bp: "105/68", pulse: "88", temp: "98.6", spo2: "99", resp: "20", height: "132", weight: "29" },
    },
    {
      id: "pat_74l_17",
      name: "Rekha Gopinath",
      phone: "+91 98471 22017",
      email: "rekha.g@example.com",
      gender: "female",
      dob: "1968-07-25",
      blood: "B+",
      city: "Thoppumpady",
      address: "Harbour View Road",
      allergies: [],
      conditions: "Cervical Spondylosis, Vertigo",
      vitals: { bp: "136/88", pulse: "74", temp: "98.4", spo2: "97", resp: "16", height: "155", weight: "66" },
    },
    {
      id: "pat_74l_18",
      name: "Manoj Kumar",
      phone: "+91 98471 22018",
      email: "manoj.kumar@example.com",
      gender: "male",
      dob: "1979-05-16",
      blood: "O-",
      city: "Kochi",
      address: "Palarivattom Pipeline Rd",
      allergies: [],
      conditions: "Pre-diabetes, Hyperuricemia (Gout)",
      vitals: { bp: "130/84", pulse: "78", temp: "98.5", spo2: "98", resp: "16", height: "171", weight: "80" },
    },
    {
      id: "pat_74l_19",
      name: "Bhavana V.",
      phone: "+91 98471 22019",
      email: "bhavana.v@example.com",
      gender: "female",
      dob: "1997-10-11",
      blood: "A+",
      city: "Kakkanad",
      address: "Smart City Road",
      allergies: [],
      conditions: "Contact dermatitis to cosmetics",
      vitals: { bp: "114/72", pulse: "73", temp: "98.4", spo2: "99", resp: "16", height: "161", weight: "54" },
    },
    {
      id: "pat_74l_20",
      name: "Kishore R.",
      phone: "+91 98471 22020",
      email: "kishore.r@example.com",
      gender: "male",
      dob: "1990-12-03",
      blood: "B+",
      city: "Kochi",
      address: "MG Road, Shenoys Junction",
      allergies: [],
      conditions: "Dental root canal restoration",
      vitals: { bp: "122/80", pulse: "72", temp: "98.6", spo2: "99", resp: "16", height: "175", weight: "71" },
    },
  ];

  const patients = patientProfiles.map((p, idx) => ({
    clinicId,
    patientId: p.id,
    doctorId: idx % 3 === 0 ? primaryDocId : doctors[idx % doctors.length].doctorId,
    userId: p.id === primaryPatientId ? userId : null,
    fullName: p.name,
    mobile: p.phone,
    whatsapp: p.phone,
    email: p.email,
    gender: p.gender,
    dateOfBirth: p.dob,
    bloodGroup: p.blood,
    address: p.address,
    city: p.city,
    state: "Kerala",
    pincode: "682016",
    height: p.vitals.height,
    weight: p.vitals.weight,
    bloodPressure: p.vitals.bp,
    temperature: p.vitals.temp,
    pulse: p.vitals.pulse,
    respiratoryRate: p.vitals.resp,
    spo2: p.vitals.spo2,
    occupation: idx % 2 === 0 ? "IT Professional" : "Business / Self-Employed",
    maritalStatus: idx > 4 ? "married" : "single",
    emergencyContactName: "Relative / Next of Kin",
    emergencyContactRelationship: idx % 2 === 0 ? "Spouse" : "Parent",
    emergencyContactMobile: "+91 98479 99888",
    allergies: p.allergies,
    medicalConditions: p.conditions,
    previousSurgeries: idx === 1 ? "Appendectomy (2019)" : null,
    currentMedications: idx === 2 ? "Metformin 500mg, Telmisartan 40mg" : null,
    familyHistory: idx % 3 === 0 ? "Family history of Type 2 Diabetes & Hypertension" : null,
    patientHistory: "Regular checkups at Demo Clinic.",
    habits: "Non-smoker, occasional tea/coffee.",
    idType: "Aadhaar Card",
    idNumber: `XXXX-XXXX-${String(1000 + idx)}`,
    insuranceProvider: idx % 2 === 0 ? "Star Health & Allied Insurance" : "HDFC ERGO Health",
    insurancePolicyNumber: `POL-SH-${String(700000 + idx)}`,
    insurancePolicyHolderName: p.name,
    insuranceValidTill: "2027-12-31",
    referredBy: idx % 4 === 0 ? "Google Search" : "Family Recommendation",
    howDidYouHear: "Online / Website",
    notes: "Patient is cooperative and responsive to treatment protocols.",
    status: "active",
    createdBy: userId,
    createdAt: daysOffset(-intBetween(10, 80)),
    updatedAt: NOW,
  }));
  await db.collection("clc_patients").insertMany(patients);

  // 8. Appointments & Live Queue
  console.log("Seeding appointments and queue...");
  const appointments = [];
  const reasons = [
    "Routine Health Checkup & Blood Pressure Monitoring",
    "Persistent Cough and Low Grade Fever",
    "Follow-up Consultation for Diabetes Management",
    "Severe Toothache in Upper Molar & Sensitivity",
    "Skin Rash, Itching, and Red Patches on Forearm",
    "Pediatric Fever, Vaccination Review & Growth Assessment",
    "Knee Joint Stiffness and Pain on Climbing Stairs",
    "Acid Reflux, Heartburn, and Post-meal Discomfort",
    "Recurrent Throbbing Headache with Nausea",
    "Annual Preventive Executive Health Screening",
    "Post-Extraction Dental Checkup & Dressing",
    "Hypertension Review & Medication Adjustment",
  ];

  // (A) TODAY'S APPOINTMENTS (15 items) -> Active Queue!
  const todaySlots = [
    { time: "09:00", token: 1, status: "completed", queueStatus: "completed" },
    { time: "09:30", token: 2, status: "completed", queueStatus: "completed" },
    { time: "10:00", token: 3, status: "completed", queueStatus: "completed" },
    { time: "10:30", token: 4, status: "completed", queueStatus: "completed" },
    { time: "11:15", token: 5, status: "completed", queueStatus: "completed" },
    { time: "11:45", token: 6, status: "completed", queueStatus: "completed" },
    { time: "14:15", token: 7, status: "confirmed", queueStatus: "in_progress" }, // Currently with doctor!
    { time: "14:45", token: 8, status: "confirmed", queueStatus: "called" },      // Token called!
    { time: "15:15", token: 9, status: "confirmed", queueStatus: "waiting" },     // Waiting in lounge
    { time: "15:45", token: 10, status: "scheduled", queueStatus: "waiting" },
    { time: "16:15", token: 11, status: "scheduled", queueStatus: "waiting" },
    { time: "16:45", token: 12, status: "scheduled", queueStatus: "waiting" },
    { time: "17:15", token: 13, status: "scheduled", queueStatus: null },
    { time: "17:45", token: 14, status: "scheduled", queueStatus: null },
    { time: "18:15", token: 15, status: "scheduled", queueStatus: null },
  ];

  todaySlots.forEach((slot, i) => {
    const p = patients[i % patients.length];
    const d = i % 2 === 0 ? doctors[0] : doctors[i % doctors.length];
    const hour = Number(slot.time.split(":")[0]);
    const sessionPeriod = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

    appointments.push({
      clinicId,
      appointmentId: `apt_74l_today_${String(i + 1).padStart(3, "0")}`,
      patientId: p.patientId,
      doctorId: d.doctorId,
      date: TODAY_STR,
      time: slot.time,
      status: slot.status,
      reason: reasons[i % reasons.length],
      notes: slot.queueStatus === "in_progress" ? "Patient inside Consultation Room 1 with Dr. Amarnath" : null,
      queueStatus: slot.queueStatus,
      tokenNumber: slot.token,
      session: sessionPeriod,
      priority: slot.token === 7, // Patient currently in consultation
      checkedInAt: slot.queueStatus ? daysOffset(0) : null,
      calledAt: slot.queueStatus === "called" || slot.queueStatus === "in_progress" || slot.queueStatus === "completed" ? daysOffset(0) : null,
      completedAt: slot.queueStatus === "completed" ? daysOffset(0) : null,
      notifiedStages: slot.queueStatus === "completed" ? ["you_are_next", "token_called", "proceed_to_room"] : ["you_are_next"],
      queueHistory: [],
      createdBy: userId,
      createdAt: daysOffset(-intBetween(1, 4)),
      updatedAt: NOW,
    });
  });

  // (B) PAST APPOINTMENTS (last 45 days: 35 appointments)
  for (let i = 0; i < 35; i++) {
    const day = -intBetween(1, 45);
    const p = patients[i % patients.length];
    const d = doctors[i % doctors.length];
    const hour = 9 + (i % 8);
    const minute = (i * 15) % 60;
    const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    const status = i % 7 === 0 ? "cancelled" : i % 11 === 0 ? "no_show" : "completed";

    appointments.push({
      clinicId,
      appointmentId: `apt_74l_past_${String(i + 1).padStart(3, "0")}`,
      patientId: p.patientId,
      doctorId: d.doctorId,
      date: isoDate(daysOffset(day)),
      time: timeStr,
      status,
      reason: reasons[(i + 3) % reasons.length],
      notes: status === "completed" ? "Consultation completed. Prescription and follow-up advice issued." : "Appointment rescheduled upon patient request.",
      queueStatus: status === "completed" ? "completed" : null,
      tokenNumber: (i % 20) + 1,
      session: hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening",
      priority: false,
      checkedInAt: daysOffset(day),
      calledAt: daysOffset(day),
      completedAt: status === "completed" ? daysOffset(day) : null,
      notifiedStages: ["you_are_next", "token_called", "proceed_to_room"],
      queueHistory: [],
      createdBy: userId,
      createdAt: daysOffset(day - 3),
      updatedAt: daysOffset(day),
    });
  }

  // (C) UPCOMING APPOINTMENTS (next 14 days: 12 appointments)
  for (let i = 0; i < 12; i++) {
    const day = intBetween(1, 14);
    const p = patients[(i + 5) % patients.length];
    const d = doctors[(i + 2) % doctors.length];
    const hour = 10 + (i % 6);
    const minute = (i * 20) % 60;
    const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

    appointments.push({
      clinicId,
      appointmentId: `apt_74l_fut_${String(i + 1).padStart(3, "0")}`,
      patientId: p.patientId,
      doctorId: d.doctorId,
      date: isoDate(daysOffset(day)),
      time: timeStr,
      status: i % 3 === 0 ? "confirmed" : "scheduled",
      reason: reasons[(i + 5) % reasons.length],
      notes: "Upcoming scheduled consultation.",
      queueStatus: null,
      tokenNumber: i + 1,
      session: hour < 12 ? "morning" : "afternoon",
      priority: false,
      checkedInAt: null,
      calledAt: null,
      completedAt: null,
      notifiedStages: [],
      queueHistory: [],
      createdBy: userId,
      createdAt: daysOffset(-intBetween(0, 3)),
      updatedAt: NOW,
    });
  }
  await db.collection("clc_appointments").insertMany(appointments);

  // 9. Prescriptions
  console.log("Seeding prescriptions...");
  const samplePrescriptions = [
    {
      diagnosis: "Essential Hypertension & Mild Dyslipidemia",
      medicines: [
        { name: "Telmisartan", dosage: "40 mg", frequency: "OD (Morning)", duration: "30 days", instructions: "Take after breakfast with water" },
        { name: "Rosuvastatin", dosage: "10 mg", frequency: "OD (Night)", duration: "30 days", instructions: "Take after dinner at bedtime" },
      ],
      notes: "Maintain low salt diet (<5g/day). Engage in 30 mins brisk walking daily. Review BP in 3 weeks.",
    },
    {
      diagnosis: "Type 2 Diabetes Mellitus - Good Glycemic Control",
      medicines: [
        { name: "Metformin ER", dosage: "500 mg", frequency: "BD", duration: "30 days", instructions: "Take immediately after breakfast & dinner" },
        { name: "Glimepiride", dosage: "1 mg", frequency: "OD (Morning)", duration: "30 days", instructions: "Take 15 minutes before breakfast" },
      ],
      notes: "Strict diabetic diet. Avoid refined sugar and bakery items. Check fasting blood glucose twice weekly.",
    },
    {
      diagnosis: "Acute Bronchitis & Allergic Rhinitis",
      medicines: [
        { name: "Amoxicillin + Clavulanic Acid", dosage: "625 mg", frequency: "BD", duration: "5 days", instructions: "Complete the full 5-day antibiotic course" },
        { name: "Montelukast + Levocetirizine", dosage: "10mg/5mg", frequency: "OD (Night)", duration: "10 days", instructions: "Take at bedtime" },
        { name: "Ambroxol Cough Syrup", dosage: "10 ml", frequency: "TID", duration: "5 days", instructions: "Take after meals" },
      ],
      notes: "Steam inhalation twice daily. Drink warm water. Avoid cold beverages and dust exposure.",
    },
    {
      diagnosis: "Dental Pulpitis - Tooth 16 & Gingivitis",
      medicines: [
        { name: "Amoxicillin", dosage: "500 mg", frequency: "TID", duration: "5 days", instructions: "Take after meals" },
        { name: "Ketorolac Tromethamine", dosage: "10 mg", frequency: "SOS", duration: "3 days", instructions: "Take only if severe pain persists (max 3/day)" },
        { name: "Chlorhexidine 0.2% Mouthwash", dosage: "10 ml", frequency: "BD", duration: "7 days", instructions: "Rinse mouth for 1 minute after brushing" },
      ],
      notes: "Scheduled for root canal treatment on Monday. Avoid chewing on right side.",
    },
    {
      diagnosis: "Gastroesophageal Reflux Disease (GERD) with Dyspepsia",
      medicines: [
        { name: "Pantoprazole + Domperidone", dosage: "40mg/30mg", frequency: "OD (Morning)", duration: "14 days", instructions: "Take 30 minutes before breakfast" },
        { name: "Sucralfate + Oxetacaine Suspension", dosage: "10 ml", frequency: "TID", duration: "7 days", instructions: "Take 1 hour before meals" },
      ],
      notes: "Elevate head of bed by 6 inches. Avoid spicy, oily, and caffeinated foods. Do not lie down within 2 hours of eating.",
    },
    {
      diagnosis: "Bilateral Knee Osteoarthritis (Mild to Moderate)",
      medicines: [
        { name: "Glucosamine Sulfate + Chondroitin", dosage: "1500mg/1200mg", frequency: "OD", duration: "60 days", instructions: "Take with food" },
        { name: "Aceclofenac + Paracetamol", dosage: "100mg/325mg", frequency: "BD (SOS)", duration: "5 days", instructions: "Take with food when pain occurs" },
      ],
      notes: "Quadriceps strengthening exercises recommended. Hot water fomentation twice daily. Avoid squatting and cross-legged sitting.",
    },
    {
      diagnosis: "Allergic Contact Dermatitis & Xerosis",
      medicines: [
        { name: "Mometasone Furoate 0.1% Cream", dosage: "External", frequency: "OD (Night)", duration: "7 days", instructions: "Apply thin layer to affected red areas only" },
        { name: "Cetirizine", dosage: "10 mg", frequency: "OD (Night)", duration: "10 days", instructions: "Take at bedtime" },
        { name: "Liquid Paraffin + White Soft Paraffin Emollient", dosage: "External", frequency: "TID", duration: "30 days", instructions: "Apply generously all over body after bathing" },
      ],
      notes: "Use mild soap-free body wash. Wear loose cotton clothes.",
    },
  ];

  const prescriptions = [];
  for (let i = 0; i < 28; i++) {
    const p = patients[i % patients.length];
    const d = i % 3 === 0 ? doctors[0] : doctors[i % doctors.length];
    const template = samplePrescriptions[i % samplePrescriptions.length];
    const day = -intBetween(0, 45);

    prescriptions.push({
      clinicId,
      prescriptionId: `prc_74l_${String(i + 1).padStart(3, "0")}`,
      patientId: p.patientId,
      doctorId: d.doctorId,
      visitDate: isoDate(daysOffset(day)),
      diagnosis: template.diagnosis,
      medicines: template.medicines,
      notes: template.notes,
      createdBy: userId,
      createdAt: daysOffset(day),
      updatedAt: daysOffset(day),
    });
  }
  await db.collection("clc_prescriptions").insertMany(prescriptions);

  // 10. Clinical Medicine Records (Consultations)
  console.log("Seeding medical records...");
  const medRecords = [];
  for (let i = 0; i < 25; i++) {
    const p = patients[i % patients.length];
    const d = i % 2 === 0 ? doctors[0] : doctors[i % doctors.length];
    const template = samplePrescriptions[i % samplePrescriptions.length];
    const day = -intBetween(0, 45);

    medRecords.push({
      clinicId,
      recordId: `med_74l_${String(i + 1).padStart(3, "0")}`,
      patientId: p.patientId,
      doctorId: d.doctorId,
      diagnosis: template.diagnosis,
      symptoms: i % 2 === 0 ? "Fatigue, mild headache, post-prandial discomfort" : "Localized discomfort, seasonal itching, mild cough",
      treatment: template.notes,
      notes: "Clinical examination reveals stable vitals, clear chest sounds, regular S1/S2 heart sounds. Advised routine follow-up.",
      visitDate: isoDate(daysOffset(day)),
      attachments: [
        {
          name: `Clinical_Assessment_${p.fullName.replace(/\s+/g, "_")}.pdf`,
          url: `/api/clinics/${clinicId}/files/assessment-${i + 1}.pdf`,
          mimeType: "application/pdf",
          fileId: `fil_74l_${String(i + 1).padStart(3, "0")}`,
        },
      ],
      createdBy: userId,
      createdAt: daysOffset(day),
      updatedAt: daysOffset(day),
    });
  }
  await db.collection("clc_medicine").insertMany(medRecords);

  // 11. Clinical Examinations
  console.log("Seeding examinations...");
  const examinations = [];
  for (let i = 0; i < 20; i++) {
    const p = patients[i % patients.length];
    const d = doctors[i % doctors.length];
    const day = -intBetween(0, 40);

    examinations.push({
      clinicId,
      examinationId: `exm_74l_${String(i + 1).padStart(3, "0")}`,
      patientId: p.patientId,
      patientName: p.fullName,
      doctorId: d.doctorId,
      visitDate: isoDate(daysOffset(day)),
      status: i % 5 === 0 ? "in-progress" : i % 8 === 0 ? "pending" : "completed",
      issueType: i % 2 === 0 ? "hard" : "soft",
      investigationId: `inv_74l_${String((i % 15) + 1).padStart(3, "0")}`,
      oralFindings: i % 2 === 0
        ? "Tooth 16: occlusal pit caries detected, no pulpal involvement. Mild supragingival calculus in lower anteriors."
        : "Healthy oral mucosa, mild marginal gingivitis around lower lingual surface. No soft tissue ulceration or tenderness.",
      notes: "General physical condition fair. Systemic review unremarkable. Follow proper oral hygiene regimen twice daily.",
      allergies: p.allergies.length ? p.allergies.join(", ") : "No known drug allergies",
      medicalConditions: p.medicalConditions,
      previousSurgeries: p.previousSurgeries,
      currentMedications: p.currentMedications,
      patientHistory: "Attending regular outpatient reviews.",
      familyHistory: "Non-contributory.",
      habits: "Non-smoker, balanced diet.",
      hpi: "Patient reports gradual onset of mild symptoms over the past 2 weeks without acute distress.",
      chiefComplaints: i % 2 === 0 ? "Mild tooth sensitivity with cold beverages" : "Generalized fatigue and mild body aches",
      bloodPressure: p.bloodPressure,
      temperature: p.temperature,
      pulse: p.pulse,
      respiratoryRate: p.respiratoryRate,
      spo2: p.spo2,
      createdBy: userId,
      createdByName: "Dr. Amarnath",
      createdAt: daysOffset(day),
      updatedAt: daysOffset(day),
    });
  }
  await db.collection("clc_examinations").insertMany(examinations);

  // 12. Investigations
  console.log("Seeding investigations...");
  const investigationTemplates = [
    { title: "Complete Blood Count (CBC) with Differential", category: "blood-report", details: { hb: "14.2 g/dL", wbc: "7,800 /mcL", platelets: "2.4 lakhs/mcL", esr: "12 mm/hr" } },
    { title: "Fasting Lipid Profile (Cardiovascular Risk Panel)", category: "blood-report", details: { totalCholesterol: "192 mg/dL", hdl: "48 mg/dL", ldl: "115 mg/dL", triglycerides: "145 mg/dL" } },
    { title: "Glycated Hemoglobin (HbA1c) & Fasting Plasma Glucose", category: "blood-report", details: { hba1c: "6.2%", fastingGlucose: "108 mg/dL", estimatedAvgGlucose: "131 mg/dL" } },
    { title: "Digital Full Mouth OPG Dental Panoramic X-Ray", category: "x-ray", details: { impression: "Adequate bone support. Minor periapical radiolucency tooth 16.", teethExamined: "11 to 48" } },
    { title: "Digital Chest X-Ray PA View", category: "x-ray", details: { impression: "Bilateral lung fields clear. Normal cardiothoracic ratio. No focal consolidation.", projection: "PA Erect" } },
    { title: "Ultrasensitive Thyroid Stimulating Hormone (TSH)", category: "blood-report", details: { tsh: "2.85 uIU/mL", referenceRange: "0.4 - 4.2 uIU/mL", interpretation: "Euthyroid state" } },
    { title: "Standard 12-Lead Electrocardiogram (ECG)", category: "vital-test", details: { rhythm: "Normal Sinus Rhythm", heartRate: "72 bpm", prInterval: "150 ms", qrsDuration: "84 ms", stChanges: "None" } },
    { title: "Urine Routine and Microscopic Examination", category: "vital-test", details: { appearance: "Pale yellow, clear", protein: "Nil", sugar: "Nil", pusCells: "1-2 /HPF", rbc: "Nil" } },
  ];

  const investigations = [];
  for (let i = 0; i < 20; i++) {
    const p = patients[i % patients.length];
    const d = doctors[i % doctors.length];
    const tmpl = investigationTemplates[i % investigationTemplates.length];
    const day = -intBetween(0, 45);
    const status = i % 4 === 0 ? "pending" : i % 6 === 0 ? "in-progress" : "completed";

    investigations.push({
      clinicId,
      investigationId: `inv_74l_${String(i + 1).padStart(3, "0")}`,
      patientId: p.patientId,
      patientName: p.fullName,
      doctorId: d.doctorId,
      title: tmpl.title,
      notes: status === "completed" ? "All test values within acceptable clinical biological limits." : "Sample received at laboratory; awaiting final pathologist verification.",
      category: tmpl.category,
      details: tmpl.details,
      visitDate: isoDate(daysOffset(day)),
      status,
      chartData: null,
      medicalRecordId: `med_74l_${String((i % 15) + 1).padStart(3, "0")}`,
      createdBy: userId,
      createdByName: "Dr. Amarnath",
      createdAt: daysOffset(day),
      updatedAt: daysOffset(day),
    });
  }
  await db.collection("clc_investigations").insertMany(investigations);

  // 13. Billing & Invoices
  console.log("Seeding billing...");
  const bills = [];
  const serviceItems = [
    { description: "General Physician Specialist Consultation", unitPrice: 500, taxPercent: 0 },
    { description: "Comprehensive Health Checkup Package", unitPrice: 2200, taxPercent: 5 },
    { description: "Complete Blood Count (CBC) & ESR", unitPrice: 400, taxPercent: 0 },
    { description: "Fasting Lipid Profile + HbA1c Panel", unitPrice: 850, taxPercent: 0 },
    { description: "Digital Panoramic OPG Dental Scan", unitPrice: 750, taxPercent: 0 },
    { description: "Dental Ultrasonic Scaling & Polishing", unitPrice: 1200, taxPercent: 5 },
    { description: "Standard 12-Lead Electrocardiogram (ECG)", unitPrice: 350, taxPercent: 0 },
    { description: "Digital Chest X-Ray (Single PA View)", unitPrice: 600, taxPercent: 0 },
    { description: "Pediatric Consultation & Immunization Check", unitPrice: 450, taxPercent: 0 },
    { description: "Minor Wound Dressing & Sterile Bandage", unitPrice: 300, taxPercent: 0 },
  ];

  for (let i = 0; i < 35; i++) {
    const p = patients[i % patients.length];
    const d = doctors[i % doctors.length];
    const day = -intBetween(0, 50);

    const item1 = serviceItems[i % serviceItems.length];
    const item2 = serviceItems[(i + 3) % serviceItems.length];
    const hasSecondItem = i % 2 === 0;

    const items = [
      { description: item1.description, quantity: 1, unitPrice: item1.unitPrice, discount: 0, taxPercent: item1.taxPercent, lineTotal: item1.unitPrice },
    ];
    if (hasSecondItem) {
      items.push({ description: item2.description, quantity: 1, unitPrice: item2.unitPrice, discount: 0, taxPercent: item2.taxPercent, lineTotal: item2.unitPrice });
    }

    const subtotal = items.reduce((sum, it) => sum + it.lineTotal, 0);
    const taxAmount = Math.round(items.reduce((sum, it) => sum + (it.lineTotal * it.taxPercent) / 100, 0));
    const discount = i % 5 === 0 ? 100 : 0;
    const total = subtotal + taxAmount - discount;

    const paymentState = i % 8 === 0 ? "unpaid" : i % 6 === 0 ? "partial" : "paid";
    const paymentType = paymentState === "unpaid" ? null : pick(["upi", "cash", "card"]);
    const amountPaid = paymentState === "paid" ? total : paymentState === "partial" ? Math.round(total / 2) : 0;
    const balanceDue = total - amountPaid;

    bills.push({
      clinicId,
      billId: `bil_74l_${String(i + 1).padStart(3, "0")}`,
      billNumber: `INV-2026-${String(i + 1).padStart(4, "0")}`,
      patientId: p.patientId,
      doctorId: d.doctorId,
      items,
      subtotal,
      discount,
      taxPercent: items.some(it => it.taxPercent > 0) ? 5 : 0,
      taxAmount,
      total,
      status: paymentState === "unpaid" ? "issued" : "paid",
      paymentType,
      amountPaid,
      balanceDue,
      paymentStatus: paymentState,
      paymentMethod: paymentType ? (paymentType === "upi" ? "Google Pay / PhonePe UPI" : paymentType === "card" ? "Visa / Mastercard" : "Cash at Counter") : null,
      invoiceDate: isoDate(daysOffset(day)),
      dueDate: paymentState === "unpaid" ? isoDate(daysOffset(day + 7)) : null,
      paidAt: paymentState !== "unpaid" ? daysOffset(day) : null,
      notes: "Computer generated medical invoice.",
      internalNotes: paymentState === "partial" ? "Balance promised on follow-up visit." : null,
      reference: `REF-2026-${String(9000 + i)}`,
      sendMethod: "none",
      createdBy: userId,
      createdAt: daysOffset(day),
      updatedAt: daysOffset(day),
    });
  }
  await db.collection("clc_bills").insertMany(bills);

  // 14. Partner Diagnostic Laboratories
  console.log("Seeding diagnostic labs...");
  const labs = [
    {
      clinicId,
      labId: "lab_74l_01",
      labName: "Metropolis Healthcare & Clinical Reference Lab",
      contactPerson: "Mr. Sunil Kumar (Center Manager)",
      phone: "+91 484 2390111",
      email: "metropolis.kochi@democlinic.org",
      address: "Ground Floor, Sunrise Medical Plaza, MG Road",
      city: "Kochi",
      state: "Kerala",
      pincode: "682016",
      licenseNo: "NABL-KL-2020-041",
      labType: "pathology",
      userId: null,
      status: "active",
      createdBy: userId,
      createdAt: daysOffset(-120),
      updatedAt: NOW,
    },
    {
      clinicId,
      labId: "lab_74l_02",
      labName: "Apex Advanced Imaging & Radiology Center",
      contactPerson: "Dr. Rachel Thomas (Chief Radiologist)",
      phone: "+91 484 2390222",
      email: "radiology@apexdiagnostics.org",
      address: "Near Medical Trust Hospital, Pallimukku",
      city: "Kochi",
      state: "Kerala",
      pincode: "682016",
      licenseNo: "AERB-RAD-2019-119",
      labType: "radiology",
      userId: null,
      status: "active",
      createdBy: userId,
      createdAt: daysOffset(-110),
      updatedAt: NOW,
    },
    {
      clinicId,
      labId: "lab_74l_03",
      labName: "Kerala Diagnostic & Automated Pathology Labs",
      contactPerson: "Mr. A.V. Namboodiri",
      phone: "+91 484 2390333",
      email: "info@keraladiagnostics.com",
      address: "Civil Line Road, Palarivattom",
      city: "Kochi",
      state: "Kerala",
      pincode: "682025",
      licenseNo: "NABL-KL-2021-089",
      labType: "pathology",
      userId: null,
      status: "active",
      createdBy: userId,
      createdAt: daysOffset(-100),
      updatedAt: NOW,
    },
    {
      clinicId,
      labId: "lab_74l_04",
      labName: "DentalScan 3D OPG & CBCT Diagnostic Center",
      contactPerson: "Praveen V. (Technical Lead)",
      phone: "+91 484 2390444",
      email: "scans@dentalscan3d.org",
      address: "Shop 4, Stadium Shopping Complex, Kaloor",
      city: "Kochi",
      state: "Kerala",
      pincode: "682017",
      licenseNo: "AERB-DEN-2022-014",
      labType: "dental",
      userId: null,
      status: "active",
      createdBy: userId,
      createdAt: daysOffset(-90),
      updatedAt: NOW,
    },
    {
      clinicId,
      labId: "lab_74l_05",
      labName: "Sun Biocare Blood Testing & Molecular Diagnostics",
      contactPerson: "Ms. Jisha George",
      phone: "+91 484 2390555",
      email: "contact@sunbiocare.in",
      address: "Seaport-Airport Road, Kakkanad",
      city: "Kochi",
      state: "Kerala",
      pincode: "682030",
      licenseNo: "NABL-KL-2023-156",
      labType: "pathology",
      userId: null,
      status: "active",
      createdBy: userId,
      createdAt: daysOffset(-80),
      updatedAt: NOW,
    },
    {
      clinicId,
      labId: "lab_74l_06",
      labName: "NeuraLab Specialty & Endocrine Testing",
      contactPerson: "Dr. Anand R.",
      phone: "+91 484 2390666",
      email: "reports@neuralab.org",
      address: "Edappally Toll Junction, NH 66",
      city: "Kochi",
      state: "Kerala",
      pincode: "682024",
      licenseNo: "NABL-KL-2022-310",
      labType: "pathology",
      userId: null,
      status: "active",
      createdBy: userId,
      createdAt: daysOffset(-70),
      updatedAt: NOW,
    },
  ];
  await db.collection("clc_labs").insertMany(labs);

  // 15. Medical Record Folders & Files
  console.log("Seeding medical record files & folders...");
  const folders = [];
  const folderCategories = [
    { key: "prescriptions", name: "Prescriptions" },
    { key: "lab-reports", name: "Lab Reports" },
    { key: "x-rays", name: "X-Rays & Scans" },
    { key: "medical-records", name: "Clinical Summaries" },
    { key: "bills", name: "Bills & Receipts" },
  ];

  for (const p of patients.slice(0, 10)) {
    for (const cat of folderCategories) {
      folders.push({
        clinicId,
        folderId: `fld_74l_${p.patientId}_${cat.key}`,
        patientId: p.patientId,
        name: cat.name,
        isDefault: true,
        defaultKey: cat.key,
        parentFolderId: null,
        createdBy: userId,
        createdByName: "Dr. Amarnath",
        createdAt: daysOffset(-60),
      });
    }
  }
  await db.collection("clc_medical_record_folders").insertMany(folders);

  const sampleFiles = [
    { name: "CBC_Complete_Blood_Count.pdf", type: "application/pdf", size: 245000, folder: "lab-reports" },
    { name: "Fasting_Lipid_Profile_Report.pdf", type: "application/pdf", size: 189000, folder: "lab-reports" },
    { name: "Digital_OPG_Dental_Panoramic_Scan.png", type: "image/png", size: 1450000, folder: "x-rays" },
    { name: "Chest_XRay_PA_Erect.jpg", type: "image/jpeg", size: 980000, folder: "x-rays" },
    { name: "Twelve_Lead_ECG_Recording.pdf", type: "application/pdf", size: 310000, folder: "lab-reports" },
    { name: "Quarterly_HbA1c_Analysis.pdf", type: "application/pdf", size: 175000, folder: "lab-reports" },
    { name: "Consultation_Summary_Signed.pdf", type: "application/pdf", size: 120000, folder: "prescriptions" },
    { name: "Medical_Fitness_Certificate.pdf", type: "application/pdf", size: 95000, folder: "medical-records" },
  ];

  const files = [];
  for (let i = 0; i < 30; i++) {
    const p = patients[i % 10];
    const sf = sampleFiles[i % sampleFiles.length];
    const folderDocId = `fld_74l_${p.patientId}_${sf.folder}`;
    const day = -intBetween(1, 40);

    files.push({
      clinicId,
      fileId: `fil_74l_${String(i + 1).padStart(3, "0")}`,
      patientId: p.patientId,
      patientName: p.fullName,
      patientPhone: p.mobile,
      fileName: `${p.fullName.replace(/\s+/g, "_")}_${sf.name}`,
      r2Key: `reports/${clinicId}/${p.patientId}/${sf.name}`,
      folder: folderDocId,
      mimeType: sf.type,
      size: sf.size,
      version: 1,
      versions: [],
      downloadCount: intBetween(0, 5),
      lastDownloadedAt: i % 2 === 0 ? daysOffset(day + 1) : null,
      uploadedBy: userId,
      uploadedByName: "Dr. Amarnath",
      createdAt: daysOffset(day),
    });
  }
  await db.collection("clc_medical_record_files").insertMany(files);

  // 16. CRM Contacts
  console.log("Seeding CRM contacts...");
  const crmContacts = [];
  const contactJobs = [
    { title: "Senior HR Director", company: "Infosys Technologies Kochi", source: "WEBSITE" },
    { title: "Operations Manager", company: "Cognizant Technology Solutions", source: "MANUAL" },
    { title: "Managing Partner", company: "Sunrise Corporate Advisory", source: "EMAIL" },
    { title: "Principal Physician", company: "Grace Community Clinic", source: "META" },
    { title: "Health & Wellness Lead", company: "Wipro Technologies SEZ", source: "WEBSITE" },
    { title: "Branch Manager", company: "Federal Bank Corporate Office", source: "MANUAL" },
    { title: "Senior Consultant", company: "Ernst & Young GDS", source: "EMAIL" },
    { title: "Director", company: "Lakeshore Wellness Club", source: "META" },
  ];

  for (let i = 0; i < 20; i++) {
    const p = patients[i % patients.length];
    const job = contactJobs[i % contactJobs.length];
    const names = p.fullName.split(" ");
    const firstName = names[0];
    const lastName = names.slice(1).join(" ") || "Client";
    const day = -intBetween(1, 45);

    crmContacts.push({
      clinicId,
      contactId: `cnt_74l_${String(i + 1).padStart(3, "0")}`,
      firstName,
      lastName,
      email: p.email,
      phone: p.mobile,
      title: job.title,
      seniority: i % 3 === 0 ? "Director" : i % 2 === 0 ? "Manager" : "Lead",
      function: "Corporate Health & Employee Benefits",
      linkedinUrl: `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}`,
      twitterUrl: null,
      githubUrl: null,
      imageUrl: null,
      socialsCheckedAt: daysOffset(day),
      enrichmentStatus: "COMPLETE",
      enrichedAt: daysOffset(day),
      enrichmentError: null,
      brief: null,
      companyId: null,
      ownerId: userId,
      source: job.source,
      lastActivityAt: daysOffset(day),
      archivedAt: null,
      deals: [],
      activities: [],
      emailThreads: [],
      calendarEvents: [],
      fieldValues: [],
      visitors: [],
      submissions: [],
      createdAt: daysOffset(day - 5),
      updatedAt: daysOffset(day),
    });
  }
  await db.collection("clc_crm_contacts").insertMany(crmContacts);

  // 17. Leads
  console.log("Seeding leads...");
  const leads = [];
  for (let i = 0; i < 20; i++) {
    const p = patients[i % patients.length];
    const day = -intBetween(1, 30);
    const source = pick(["meta_facebook", "meta_instagram", "website", "manual"]);
    const status = pick(["new", "contacted", "qualified", "appointment", "converted"]);

    leads.push({
      clinicId,
      leadId: `led_74l_${String(i + 1).padStart(3, "0")}`,
      source,
      sourceRef: `ad_lead_ref_kochi_${i + 1}_${Date.now()}`,
      name: p.fullName,
      phone: p.mobile,
      email: p.email,
      formAnswers: {
        preferred_time: "Morning (09:00 - 12:00)",
        health_concern: "Executive Health Checkup & Family Physician Consultation",
      },
      consent: true,
      status,
      priority: pick(["low", "normal", "high"]),
      department: "Outpatient Services",
      service: "Primary Care & Diagnostics",
      team: "Reception",
      assignedTo: userId,
      assignedAt: daysOffset(day),
      receivedAt: daysOffset(day),
      firstResponseAt: daysOffset(day),
      firstContactAt: daysOffset(day),
      contactAttempts: intBetween(1, 3),
      appointmentBookedAt: status === "appointment" || status === "converted" ? daysOffset(day) : null,
      convertedAt: status === "converted" ? daysOffset(day) : null,
      createdAt: daysOffset(day),
      updatedAt: NOW,
    });
  }
  await db.collection("clc_leads").insertMany(leads);

  // 18. Notifications
  console.log("Seeding notifications...");
  const sampleNotifications = [
    { type: "appointment", title: "New Appointment Booked", body: "Karthik Menon booked an appointment for 09:30 AM today." },
    { type: "bill", title: "Invoice Paid via UPI", body: "Payment of ₹1,850 received for Invoice #INV-2026-0012." },
    { type: "report", title: "Diagnostic Lab Report Available", body: "Metropolis Healthcare uploaded CBC and Lipid Profile for Lakshmi Pillai." },
    { type: "general", title: "Queue Update - Afternoon Session", body: "Live Queue is active with 6 patients checked in and waiting." },
    { type: "prescription", title: "Prescription Issued", body: "Prescription for Acute Bronchitis issued to Divya Nambiar." },
    { type: "appointment", title: "Patient Checked In", body: "Rahul Das has arrived and taken Token #8 at the front desk." },
    { type: "report", title: "Dental OPG Scan Uploaded", body: "DentalScan 3D uploaded panoramic radiograph for Tooth 16 review." },
    { type: "bill", title: "Billing Reminder", body: "Partial payment recorded for Invoice #INV-2026-0021. ₹600 pending." },
    { type: "general", title: "System Maintenance Completed", body: "Automatic database backup and search index verification succeeded." },
    { type: "appointment", title: "Follow-up Visit Scheduled", body: "Anoop Thomas scheduled for post-treatment review on next Tuesday." },
  ];

  const notifications = [];
  for (let i = 0; i < 18; i++) {
    const sn = sampleNotifications[i % sampleNotifications.length];
    const isUnread = i < 5; // Top 5 are unread
    const day = -intBetween(0, 4);

    notifications.push({
      clinicId,
      notificationId: `ntf_74l_${String(i + 1).padStart(3, "0")}`,
      recipientUserId: userId, // Exactly this user!
      type: sn.type,
      title: sn.title,
      body: sn.body,
      link: sn.type === "appointment" ? "/clinic/appointments" : sn.type === "bill" ? "/clinic/billing" : sn.type === "report" ? "/clinic/lab" : "/clinic",
      readAt: isUnread ? null : daysOffset(day),
      createdAt: daysOffset(day),
    });
  }
  await db.collection("clc_notifications").insertMany(notifications);

  // 19. Audit Logs
  console.log("Seeding audit logs...");
  const auditEntries = [
    { action: "login", entity: "user", entityId: userId, metadata: { email: TARGET_USER_EMAIL, method: "password" } },
    { action: "create", entity: "patient", entityId: primaryPatientId, metadata: { name: "Amarnath Sharma", mobile: "+91 98470 24120" } },
    { action: "schedule", entity: "appointment", entityId: "apt_74l_today_001", metadata: { doctor: "Dr. Amarnath", time: "09:00" } },
    { action: "create", entity: "prescription", entityId: "prc_74l_001", metadata: { diagnosis: "Essential Hypertension" } },
    { action: "create", entity: "bill", entityId: "bil_74l_001", metadata: { total: 1750, billNumber: "INV-2026-0001" } },
    { action: "payment_received", entity: "bill", entityId: "bil_74l_001", metadata: { amount: 1750, method: "UPI" } },
    { action: "upload", entity: "file", entityId: "fil_74l_001", metadata: { fileName: "CBC_Blood_Report.pdf", folder: "lab-reports" } },
    { action: "update", entity: "settings", entityId: clinicId, metadata: { updatedKeys: ["workingHours", "lookups", "slotMinutes"] } },
    { action: "queue_advance", entity: "queue", entityId: "apt_74l_today_007", metadata: { stage: "in_progress", token: 7 } },
    { action: "create", entity: "examination", entityId: "exm_74l_001", metadata: { patientName: "Amarnath Sharma", status: "completed" } },
  ];

  const auditLogs = [];
  for (let i = 0; i < 30; i++) {
    const entry = auditEntries[i % auditEntries.length];
    const day = -intBetween(0, 10);

    auditLogs.push({
      clinicId,
      actorId: userId,
      actorRole: "clinic_admin",
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      metadata: entry.metadata,
      createdAt: daysOffset(day),
    });
  }
  await db.collection("clc_audit_logs").insertMany(auditLogs);

  // 20. Pharmacy collections (Medicines, Suppliers, Inventory, Sales)
  console.log("Seeding pharmacy...");
  const suppliers = [
    { clinicId, supplierId: "sup_74l_01", name: "Sun Pharma Distributors", contactPerson: "Rajeev Kumar", phone: "+91 98472 11001", email: "sales@sunpharma.test", status: "active", createdBy: userId, createdAt: daysOffset(-90), updatedAt: NOW },
    { clinicId, supplierId: "sup_74l_02", name: "Cipla Healthcare Supply", contactPerson: "Anand M.", phone: "+91 98472 11002", email: "cipla.supply@test.org", status: "active", createdBy: userId, createdAt: daysOffset(-90), updatedAt: NOW },
    { clinicId, supplierId: "sup_74l_03", name: "Dr. Reddy's Regional Agency", contactPerson: "Suresh P.", phone: "+91 98472 11003", email: "drreddys@test.org", status: "active", createdBy: userId, createdAt: daysOffset(-90), updatedAt: NOW },
  ];
  await db.collection("clc_pharmacy_suppliers").insertMany(suppliers);

  const pharmacyMeds = [
    { name: "Paracetamol 650mg", generic: "Paracetamol", brand: "Dolo 650", cat: "tablet", price: 32, mrp: 35 },
    { name: "Telmisartan 40mg", generic: "Telmisartan", brand: "Telma 40", cat: "tablet", price: 95, mrp: 110 },
    { name: "Metformin 500mg ER", generic: "Metformin", brand: "Glycomet 500", cat: "tablet", price: 42, mrp: 50 },
    { name: "Pantoprazole 40mg", generic: "Pantoprazole", brand: "Pantocid 40", cat: "tablet", price: 115, mrp: 130 },
    { name: "Amoxicillin + Clavulanic Acid 625mg", generic: "Amoxicillin/Clav", brand: "Augmentin 625", cat: "tablet", price: 180, mrp: 210 },
    { name: "Montelukast + Levocetirizine", generic: "Montelukast/L-Cet", brand: "Montair LC", cat: "tablet", price: 160, mrp: 185 },
    { name: "Rosuvastatin 10mg", generic: "Rosuvastatin", brand: "Rozavel 10", cat: "tablet", price: 140, mrp: 165 },
    { name: "Aceclofenac + Paracetamol", generic: "Aceclofenac/PCM", brand: "Zerodol P", cat: "tablet", price: 65, mrp: 78 },
  ];

  const pMeds = pharmacyMeds.map((m, idx) => ({
    clinicId,
    medicineId: `pmed_74l_${String(idx + 1).padStart(3, "0")}`,
    name: m.name,
    genericName: m.generic,
    brand: m.brand,
    category: m.cat,
    dosageForm: "tablet",
    strength: "Standard",
    unit: "strip of 10",
    manufacturer: "Reputed Pharma",
    hsnCode: "300490",
    barcode: `890123456${String(idx).padStart(3, "0")}`,
    batchNumber: `BAT-2026-${String(idx + 10)}`,
    prescriptionRequired: true,
    reorderLevel: 20,
    minStockLevel: 10,
    maxStockLevel: 200,
    purchasePrice: m.price,
    sellingPrice: m.mrp,
    taxPercent: 5,
    discount: 0,
    supplierId: suppliers[idx % suppliers.length].supplierId,
    manufacturingDate: "2026-01-10",
    expiryDate: "2028-12-31",
    storageConditions: "Store below 25°C in a dry place",
    status: "active",
    createdAt: daysOffset(-90),
    updatedAt: NOW,
  }));
  await db.collection("clc_pharmacy_medicines").insertMany(pMeds);

  const inventory = pMeds.map((m, idx) => ({
    clinicId,
    inventoryId: `pinv_74l_${String(idx + 1).padStart(3, "0")}`,
    medicineId: m.medicineId,
    name: m.name,
    genericName: m.genericName,
    category: m.category,
    batchNumber: m.batchNumber,
    barcode: m.barcode,
    quantityAvailable: 50 + idx * 15,
    quantityReserved: 0,
    quantityDamaged: 0,
    purchasePrice: m.purchasePrice,
    sellingPrice: m.sellingPrice,
    taxPercent: 5,
    expiryDate: m.expiryDate,
    manufacturingDate: m.manufacturingDate,
    supplierId: m.supplierId,
    storageLocation: `Rack ${String.fromCharCode(65 + idx)}-2`,
    reorderLevel: 20,
    status: "in_stock",
    reorderStatus: "ok",
    lastUpdated: NOW,
    createdAt: daysOffset(-60),
    updatedAt: NOW,
  }));
  await db.collection("clc_pharmacy_inventory").insertMany(inventory);

  console.log(`Successfully seeded ALL collections for clinicId: ${clinicId} (User: ${TARGET_USER_EMAIL})!`);
  await client.close();
}

async function main() {
  console.log("=== SEEDING SCRIPT FOR amarnathdemo2412@gmail.com ===");
  try {
    // 1. Seed Atlas MongoDB (Main Database)
    await seedClinicData(ATLAS_URI, DB_NAME);
  } catch (err) {
    console.error("Atlas seeding error:", err);
  }

  try {
    // 2. Also Seed Local MongoDB for consistency
    await seedClinicData(LOCAL_URI, DB_NAME);
  } catch (err) {
    console.warn("Local seeding skipped or failed:", err.message);
  }
  console.log("=== COMPLETED ALL SEEDING SUCCESSFULLY ===");
}

main().catch(console.error);
