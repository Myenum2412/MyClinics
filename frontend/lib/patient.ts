import { ObjectId } from "mongodb";
import type { Db, Document } from "mongodb";
import type { Session } from "next-auth";
import type { Appointment } from "@/components/appointments-table";
import type { Prescription } from "@/components/prescriptions-table";
import type { Bill } from "@/components/billing-table";
import type { ReportFile } from "@/lib/report-folders";

export type PatientProfile = {
  id: string;
  fullName: string;
  mobile: string | null;
  secondaryMobile: string | null;
  age: number | null;
  gender: string | null;
  email: string | null;
  whatsapp: string | null;
};

export type PatientDoctor = {
  id: string | null;
  name: string;
  specialty: string | null;
  mobile: string | null;
  qualifications: string | null;
  visits: number;
  bills: number;
  prescriptions: number;
  lastVisit: string | null;
};

export type PatientDashboardData = {
  patient: PatientProfile;
  appointments: Appointment[];
  prescriptions: Prescription[];
  bills: Bill[];
  reports: ReportFile[];
  doctors: PatientDoctor[];
};

function normalizeDoctorName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function mapAppointment(d: Document): Appointment {
  return {
    id: (d._id as ObjectId).toString(),
    fullName: String(d.fullName ?? ""),
    mobile: String(d.mobile ?? ""),
    secondaryMobile: d.secondaryMobile ? String(d.secondaryMobile) : null,
    age: d.age ?? null,
    gender: d.gender ? String(d.gender) : null,
    email: d.email ? String(d.email) : null,
    whatsapp: d.whatsapp ? String(d.whatsapp) : null,
    doctorId: d.doctorId ? String(d.doctorId) : null,
    doctorName: d.doctorName ? String(d.doctorName) : null,
    department: d.department ? String(d.department) : null,
    date: String(d.date ?? ""),
    time: String(d.time ?? ""),
    type: d.type === "video" ? "video" : "in-person",
    reason: d.reason ? String(d.reason) : null,
    status: String(d.status ?? "pending") as Appointment["status"],
    bookingSource: d.bookingSource === "whatsapp_ai" ? "whatsapp_ai" : "manual",
    notes: d.notes ? String(d.notes) : null,
    counter: d.counter ?? null,
  };
}

function mapMedicine(d: Document) {
  return {
    name: String(d.name ?? ""),
    frequency: String(d.frequency ?? ""),
    duration: String(d.duration ?? ""),
    beforeAfterFood: String(d.beforeAfterFood ?? ""),
    specialInstructions: String(d.specialInstructions ?? ""),
  };
}

function mapPrescription(d: Document): Prescription {
  return {
    id: (d._id as ObjectId).toString(),
    patientName: String(d.patientName ?? ""),
    age: d.age ?? null,
    gender: d.gender ? String(d.gender) : null,
    phone: d.phone ? String(d.phone) : null,
    visitDate: String(d.visitDate ?? ""),
    diagnosis: String(d.diagnosis ?? ""),
    medicines: Array.isArray(d.medicines) ? d.medicines.map(mapMedicine) : [],
    symptoms: d.symptoms ? String(d.symptoms) : null,
    testsRecommended: d.testsRecommended ? String(d.testsRecommended) : null,
    followUpDate: d.followUpDate ? String(d.followUpDate) : null,
    doctorName: d.doctorName ? String(d.doctorName) : null,
  };
}

function mapBill(d: Document): Bill {
  const items = Array.isArray(d.items)
    ? d.items.map((i: Document) => ({
        name: String(i.name ?? ""),
        qty: Number(i.qty ?? 0),
        price: Number(i.price ?? 0),
        amount: Number(i.amount ?? 0),
      }))
    : [];
  return {
    id: (d._id as ObjectId).toString(),
    billNumber: String(d.billNumber ?? ""),
    patientName: String(d.patientName ?? ""),
    patientPhone: d.patientPhone ? String(d.patientPhone) : null,
    doctorId: d.doctorId ? String(d.doctorId) : null,
    doctorName: d.doctorName ? String(d.doctorName) : null,
    date: String(d.date ?? ""),
    items,
    subtotal: Number(d.subtotal ?? 0),
    discount: Number(d.discount ?? 0),
    taxRate: Number(d.taxRate ?? 0),
    tax: Number(d.tax ?? 0),
    total: Number(d.total ?? 0),
    paymentMethod: String(d.paymentMethod ?? "Other"),
    status: String(d.status ?? "pending") as Bill["status"],
    notes: d.notes ? String(d.notes) : null,
    createdAt: (d.createdAt as Date).toISOString(),
  };
}

function mapReport(d: Document): ReportFile {
  return {
    id: (d._id as ObjectId).toString(),
    name: String(d.name ?? ""),
    size: Number(d.size ?? 0),
    type: String(d.type ?? ""),
    extension: String(d.extension ?? ""),
    folderId: d.folderId ? String(d.folderId) : null,
    category: d.category ? String(d.category) : null,
    patientId: d.patientId ? String(d.patientId) : null,
    patientName: d.patientName ? String(d.patientName) : null,
    prescriptionId: d.prescriptionId ? String(d.prescriptionId) : null,
    prescriptionLabel: d.prescriptionLabel ? String(d.prescriptionLabel) : null,
    uploadedBy: d.uploadedBy ? String(d.uploadedBy) : null,
    createdAt: (d.createdAt as Date).toISOString(),
    updatedAt: ((d.updatedAt as Date) ?? (d.createdAt as Date)).toISOString(),
  };
}

function emptyDoctor(name: string): PatientDoctor {
  return {
    id: null,
    name,
    specialty: null,
    mobile: null,
    qualifications: null,
    visits: 0,
    bills: 0,
    prescriptions: 0,
    lastVisit: null,
  };
}

async function buildPatientDoctors(
  appointments: Appointment[],
  bills: Bill[],
  prescriptions: Prescription[],
  db: Db
): Promise<PatientDoctor[]> {
  const byId = new Map<string, PatientDoctor>();
  const byName = new Map<string, PatientDoctor>();

  const getById = (id: string, name: string) => {
    let entry = byId.get(id);
    if (!entry) {
      entry = emptyDoctor(name);
      entry.id = id;
      byId.set(id, entry);
    } else if (name && !entry.name) {
      entry.name = name;
    }
    return entry;
  };

  const getByName = (name: string) => {
    const key = `name:${normalizeDoctorName(name)}`;
    let entry = byName.get(key);
    if (!entry) {
      entry = emptyDoctor(name);
      byName.set(key, entry);
    }
    return entry;
  };

  const foldDate = (entry: PatientDoctor, date: string) => {
    if (date && (!entry.lastVisit || date > entry.lastVisit)) {
      entry.lastVisit = date;
    }
  };

  for (const a of appointments) {
    const name = (a.doctorName ?? "").trim();
    if (!a.doctorId && !name) continue;
    const entry = a.doctorId ? getById(a.doctorId, name) : getByName(name);
    entry.visits += 1;
    foldDate(entry, a.date);
  }

  for (const b of bills) {
    const name = (b.doctorName ?? "").trim();
    if (!b.doctorId && !name) continue;
    const entry = b.doctorId ? getById(b.doctorId, name) : getByName(name);
    entry.bills += 1;
    foldDate(entry, b.date);
  }

  for (const p of prescriptions) {
    const name = (p.doctorName ?? "").trim();
    if (!name) continue;
    const entry = getByName(name);
    entry.prescriptions += 1;
    foldDate(entry, p.visitDate);
  }

  const ids = [...byId.keys()]
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));
  if (ids.length) {
    const docs = await db
      .collection("users")
      .find({ role: "doctor", _id: { $in: ids } })
      .toArray();
    for (const doc of docs) {
      const entry = byId.get((doc._id as ObjectId).toString());
      if (!entry) continue;
      entry.specialty = doc.specialty ? String(doc.specialty) : null;
      entry.mobile = doc.mobile ? String(doc.mobile) : null;
      entry.qualifications = doc.qualifications
        ? String(doc.qualifications)
        : null;
      if (!entry.name && doc.name) entry.name = String(doc.name);
    }
  }

  for (const entry of byName.values()) {
    if (!entry.name) continue;
    const target = [...byId.values()].find(
      (d) => d.name && normalizeDoctorName(d.name) === normalizeDoctorName(entry.name)
    );
    if (target) {
      target.visits += entry.visits;
      target.bills += entry.bills;
      target.prescriptions += entry.prescriptions;
      foldDate(target, entry.lastVisit ?? "");
    } else {
      byId.set(`name:${normalizeDoctorName(entry.name)}`, entry);
    }
  }

  return [...byId.values()].sort((a, b) => {
    if (a.lastVisit && b.lastVisit) return b.lastVisit.localeCompare(a.lastVisit);
    if (a.lastVisit) return -1;
    if (b.lastVisit) return 1;
    return a.name.localeCompare(b.name);
  });
}

export async function loadPatientData(
  db: Db,
  session: Session | null
): Promise<PatientDashboardData | null> {
  const email = session?.user?.email?.toLowerCase() ?? null;
  if (!email) return null;

  const doc = await db.collection("patients").findOne({ email });
  if (!doc) return null;

  const patient: PatientProfile = {
    id: (doc._id as ObjectId).toString(),
    fullName: String(doc.fullName ?? ""),
    mobile: doc.mobile ? String(doc.mobile) : null,
    secondaryMobile: doc.secondaryMobile ? String(doc.secondaryMobile) : null,
    age: doc.age ?? null,
    gender: doc.gender ? String(doc.gender) : null,
    email: doc.email ? String(doc.email) : null,
    whatsapp: doc.whatsapp ? String(doc.whatsapp) : null,
  };

  // Names can carry stray whitespace (e.g. "Arjun V " vs "Arjun V" on bills),
  // so match the raw name plus its trimmed variant.
  const nameVariants = [patient.fullName, patient.fullName.trim()].filter(
    (name) => name.length > 0
  );
  const nameMatch =
    nameVariants.length > 1
      ? { patientName: { $in: nameVariants } }
      : { patientName: patient.fullName };
  const appointmentOr: Record<string, unknown>[] = [];
  if (email) appointmentOr.push({ email });
  for (const name of nameVariants) {
    appointmentOr.push({ fullName: name });
  }
  if (patient.mobile) appointmentOr.push({ mobile: patient.mobile });
  const billOr: Record<string, unknown>[] = [nameMatch];
  if (patient.mobile) billOr.push({ patientPhone: patient.mobile });

  const [appointmentDocs, prescriptionDocs, billDocs, reportDocs] =
    await Promise.all([
      db
        .collection("appointments")
        .find({ $or: appointmentOr })
        .sort({ date: -1, time: -1 })
        .toArray(),
      db
        .collection("prescriptions")
        .find(nameMatch)
        .sort({ createdAt: -1 })
        .toArray(),
      db
        .collection("bills")
        .find({ $or: billOr })
        .sort({ createdAt: -1 })
        .toArray(),
      db
        .collection("reports")
        .find({ $or: [nameMatch, { patientId: patient.id }] })
        .sort({ createdAt: -1 })
        .toArray(),
    ]);

  const appointments = appointmentDocs.map(mapAppointment);
  const prescriptions = prescriptionDocs.map(mapPrescription);
  const bills = billDocs.map(mapBill);

  return {
    patient,
    appointments,
    prescriptions,
    bills,
    reports: reportDocs.map(mapReport),
    doctors: await buildPatientDoctors(appointments, bills, prescriptions, db),
  };
}
