import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { Toaster } from "@/components/ui/sonner";
import { PatientDetails } from "@/components/patient-details";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PatientDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) notFound();

  const db = await getDb();
  const patient = (await db
    .collection("patients")
    .findOne({ _id: new ObjectId(id) })) as Record<string, unknown> | null;
  if (!patient) notFound();

  const mobile = String(patient.mobile ?? "");

  const [appointments, prescriptions, bills, reports] = await Promise.all([
    db
      .collection("appointments")
      .find({ mobile })
      .sort({ date: -1, time: -1 })
      .limit(20)
      .toArray(),
    db
      .collection("prescriptions")
      .find({ phone: mobile })
      .sort({ visitDate: -1 })
      .limit(20)
      .toArray(),
    db
      .collection("bills")
      .find({ patientPhone: mobile })
      .sort({ date: -1 })
      .limit(20)
      .toArray(),
    db
      .collection("reports")
      .find({ patientId: new ObjectId(id) })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray(),
  ]);

  return (
    <>
      <PatientDetails
        patient={{
          id: String(patient._id),
          fullName: String(patient.fullName ?? ""),
          mobile,
          secondaryMobile: patient.secondaryMobile
            ? String(patient.secondaryMobile)
            : null,
          age: patient.age ? Number(patient.age) : null,
          gender: patient.gender ? String(patient.gender) : null,
          email: patient.email ? String(patient.email) : null,
          whatsapp: patient.whatsapp ? String(patient.whatsapp) : null,
          bloodGroup: patient.bloodGroup ? String(patient.bloodGroup) : null,
          dateOfBirth: patient.dateOfBirth ? String(patient.dateOfBirth) : null,
          weight: patient.weight ? Number(patient.weight) : null,
          height: patient.height ? Number(patient.height) : null,
          guardianName: patient.guardianName
            ? String(patient.guardianName)
            : null,
          emergencyContactName: patient.emergencyContactName
            ? String(patient.emergencyContactName)
            : null,
          emergencyContactPhone: patient.emergencyContactPhone
            ? String(patient.emergencyContactPhone)
            : null,
          maritalStatus: patient.maritalStatus
            ? String(patient.maritalStatus)
            : null,
          smoking: patient.smoking ? String(patient.smoking) : null,
          alcohol: patient.alcohol ? String(patient.alcohol) : null,
          address: patient.address ? String(patient.address) : null,
          city: patient.city ? String(patient.city) : null,
          pincode: patient.pincode ? String(patient.pincode) : null,
          occupation: patient.occupation ? String(patient.occupation) : null,
          medicalHistory: Array.isArray(patient.medicalHistory)
            ? (patient.medicalHistory as {
                date?: unknown;
                record?: unknown;
              }[])
                .map((entry) => ({
                  date: entry.date ? String(entry.date) : null,
                  record: entry.record ? String(entry.record) : "",
                }))
                .filter((entry) => entry.record)
            : typeof patient.medicalHistory === "string" &&
                patient.medicalHistory.trim()
              ? [{ date: null, record: patient.medicalHistory.trim() }]
              : null,
          allergies: patient.allergies ? String(patient.allergies) : null,
          currentMedications: patient.currentMedications
            ? String(patient.currentMedications)
            : null,
          previousSurgeries: patient.previousSurgeries
            ? String(patient.previousSurgeries)
            : null,
          familyHistory: patient.familyHistory
            ? String(patient.familyHistory)
            : null,
          notes: patient.notes ? String(patient.notes) : null,
        }}
        appointments={appointments.map((a) => ({
          id: a._id.toString(),
          date: String(a.date ?? ""),
          time: String(a.time ?? ""),
          type: String(a.type ?? "in-person"),
          status: String(a.status ?? "pending"),
          doctorName: a.doctorName ? String(a.doctorName) : null,
          doctorId: a.doctorId?.toString() ?? null,
          department: a.department ? String(a.department) : null,
          reason: a.reason ? String(a.reason) : null,
          notes: a.notes ? String(a.notes) : null,
          counter: a.counter != null ? Number(a.counter) : null,
        }))}
        prescriptions={prescriptions.map((p) => ({
          id: p._id.toString(),
          visitDate: String(p.visitDate ?? ""),
          diagnosis: String(p.diagnosis ?? "—"),
          doctorName: p.doctorName ? String(p.doctorName) : null,
          medicines: Array.isArray(p.medicines)
            ? (p.medicines as { name?: string }[]).map((m) => ({
                name: String(m.name ?? ""),
              }))
            : [],
        }))}
        bills={bills.map((b) => ({
          id: b._id.toString(),
          billNumber: String(b.billNumber ?? ""),
          date: String(b.date ?? ""),
          paymentMethod: String(b.paymentMethod ?? "—"),
          status: String(b.status ?? "pending"),
          total: Number(b.total ?? 0),
          items: Array.isArray(b.items)
            ? (b.items as { name?: string }[]).map((i) => ({
                name: String(i.name ?? ""),
              }))
            : [],
        }))}
        reports={reports.map((r) => ({
          id: r._id.toString(),
          name: String(r.name ?? ""),
          category: r.category ? String(r.category) : null,
          size: r.size != null ? Number(r.size) : null,
          createdAt: r.createdAt ? String(r.createdAt) : "",
        }))}
      />
      <Toaster />
    </>
  );
}