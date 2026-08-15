import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { Toaster } from "@/components/ui/sonner";
import {
  DoctorRecordsView,
  type DoctorAppointment,
  type DoctorPrescription,
  type DoctorBill,
} from "@/components/doctor-records-view";
import type { Doctor } from "@/components/doctors-table";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const RECORDS_LIMIT = 300;

export default async function DoctorRecordsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) notFound();

  const db = await getDb();
  const doctorDoc = (await db
    .collection("users")
    .findOne({ _id: new ObjectId(id), role: "doctor" })) as Record<
    string,
    unknown
  > | null;
  if (!doctorDoc) notFound();

  const doctorName = String(doctorDoc.name ?? "");
  const [appointmentDocs, prescriptionDocs, billDocs] = await Promise.all([
    db
      .collection("appointments")
      .find({ doctorId: id })
      .sort({ createdAt: -1 })
      .limit(RECORDS_LIMIT)
      .toArray(),
    db
      .collection("prescriptions")
      .find({ doctorName })
      .sort({ createdAt: -1 })
      .limit(RECORDS_LIMIT)
      .toArray(),
    db
      .collection("bills")
      .find({ $or: [{ doctorId: id }, { doctorName }] })
      .sort({ createdAt: -1 })
      .limit(RECORDS_LIMIT)
      .toArray(),
  ]);

  const doctor: Doctor = {
    id: String(doctorDoc._id),
    name: doctorName,
    email: String(doctorDoc.email ?? ""),
    specialty: doctorDoc.specialty ? String(doctorDoc.specialty) : null,
    mobile: doctorDoc.mobile ? String(doctorDoc.mobile) : null,
    qualifications: doctorDoc.qualifications
      ? String(doctorDoc.qualifications)
      : null,
    city: doctorDoc.city ? String(doctorDoc.city) : null,
    state: doctorDoc.state ? String(doctorDoc.state) : null,
    consultationFee:
      typeof doctorDoc.consultationFee === "number"
        ? doctorDoc.consultationFee
        : null,
    experience: doctorDoc.experience ? String(doctorDoc.experience) : null,
    gender: doctorDoc.gender ? String(doctorDoc.gender) : null,
    languages: Array.isArray(doctorDoc.languages)
      ? doctorDoc.languages.map(String)
      : [],
    registrationNumber: doctorDoc.registrationNumber
      ? String(doctorDoc.registrationNumber)
      : null,
    bio: doctorDoc.bio ? String(doctorDoc.bio) : null,
    address: doctorDoc.address ? String(doctorDoc.address) : null,
    schedule: [],
    image: doctorDoc.image ? String(doctorDoc.image) : null,
    status:
      doctorDoc.status === "terminated"
        ? ("terminated" as const)
        : ("active" as const),
  };

  const appointments: DoctorAppointment[] = appointmentDocs.map((a) => ({
    id: String(a._id),
    fullName: String(a.fullName ?? ""),
    mobile: String(a.mobile ?? ""),
    age: a.age ? String(a.age) : null,
    gender: a.gender ? String(a.gender) : null,
    date: String(a.date ?? ""),
    time: String(a.time ?? ""),
    type: String(a.type ?? ""),
    reason: a.reason ? String(a.reason) : null,
    status: String(a.status ?? ""),
    notes: a.notes ? String(a.notes) : null,
  }));

  const prescriptions: DoctorPrescription[] = prescriptionDocs.map((p) => ({
    id: String(p._id),
    patientName: String(p.patientName ?? ""),
    age: p.age ? String(p.age) : null,
    gender: p.gender ? String(p.gender) : null,
    phone: p.phone ? String(p.phone) : null,
    visitDate: String(p.visitDate ?? ""),
    diagnosis: String(p.diagnosis ?? ""),
    medicines: Array.isArray(p.medicines)
      ? p.medicines.map((m) => ({
          name: m?.name ? String(m.name) : undefined,
          dosage: m?.dosage ? String(m.dosage) : undefined,
        }))
      : [],
    symptoms: p.symptoms ? String(p.symptoms) : null,
    testsRecommended: p.testsRecommended ? String(p.testsRecommended) : null,
    followUpDate: p.followUpDate ? String(p.followUpDate) : null,
  }));

  const bills: DoctorBill[] = billDocs.map((b) => ({
    id: String(b._id),
    billNumber: String(b.billNumber ?? ""),
    patientName: String(b.patientName ?? ""),
    patientPhone: b.patientPhone ? String(b.patientPhone) : null,
    date: String(b.date ?? ""),
    items: Array.isArray(b.items)
      ? b.items.map((i) => ({
          name: String(i?.name ?? ""),
          qty: Number(i?.qty) || 0,
          price: Number(i?.price) || 0,
        }))
      : [],
    total: Number(b.total) || 0,
    paymentMethod: String(b.paymentMethod ?? ""),
    status: String(b.status ?? ""),
  }));

  return (
    <>
      <DoctorRecordsView
        doctor={doctor}
        appointments={appointments}
        prescriptions={prescriptions}
        bills={bills}
      />
      <Toaster />
    </>
  );
}