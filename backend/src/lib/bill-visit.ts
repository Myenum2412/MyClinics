import type { Db, Document } from "mongodb";

/**
 * Builds a case-insensitive exact-name regex while escaping regex meta
 * characters so patient names match safely.
 */
function exactRegex(value: string): RegExp {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped}$`, "i");
}

export interface BillVisitData {
  appointment: Document | null;
  prescriptions: Document[];
  doctors: { id: string | null; name: string }[];
  patient: Document | null;
}

/**
 * Finds the most recent appointment, prescriptions and the patient record
 * for the patient a bill belongs to, along with every doctor involved (bill
 * doctor + visit doctors). Patients are matched by phone first, then by
 * exact name.
 */
export async function findBillVisitData(
  db: Db,
  bill: {
    patientName?: string | null;
    patientPhone?: string | null;
    doctorId?: string | null;
    doctorName?: string | null;
  }
): Promise<BillVisitData> {
  const phone = bill.patientPhone?.trim();
  const name = bill.patientName?.trim();

  const appointmentConditions: Record<string, unknown>[] = [];
  if (phone) {
    appointmentConditions.push({ mobile: phone }, { whatsapp: phone });
  }
  if (name) {
    appointmentConditions.push({ fullName: exactRegex(name) });
  }

  const prescriptionConditions: Record<string, unknown>[] = [];
  if (phone) {
    prescriptionConditions.push({ phone });
  }
  if (name) {
    prescriptionConditions.push({ patientName: exactRegex(name) });
  }

  const patientConditions: Record<string, unknown>[] = [];
  if (phone) {
    patientConditions.push({ mobile: phone }, { whatsapp: phone });
  }
  if (name) {
    patientConditions.push({ fullName: exactRegex(name) });
  }

  if (!appointmentConditions.length && !prescriptionConditions.length && !patientConditions.length) {
    return { appointment: null, prescriptions: [], doctors: [], patient: null };
  }

  const [appointmentDoc, prescriptionDocs, patientDoc] = await Promise.all([
    appointmentConditions.length
      ? db
          .collection("appointments")
          .find({ $or: appointmentConditions })
          .sort({ createdAt: -1, date: -1 })
          .limit(1)
          .next()
      : Promise.resolve(null),
    prescriptionConditions.length
      ? db
          .collection("prescriptions")
          .find({ $or: prescriptionConditions })
          .sort({ createdAt: -1, visitDate: -1 })
          .limit(3)
          .toArray()
      : Promise.resolve([]),
    patientConditions.length
      ? db
          .collection("patients")
          .find({ $or: patientConditions })
          .sort({ createdAt: -1 })
          .limit(1)
          .next()
      : Promise.resolve(null),
  ]);

  const doctorMap = new Map<string, { id: string | null; name: string }>();
  if (bill.doctorName) {
    doctorMap.set(bill.doctorName.toLowerCase(), {
      id: bill.doctorId ?? null,
      name: bill.doctorName,
    });
  }
  if (appointmentDoc) {
    const doctorName = appointmentDoc.doctorName
      ? String(appointmentDoc.doctorName)
      : null;
    if (doctorName) {
      doctorMap.set(doctorName.toLowerCase(), {
        id: appointmentDoc.doctorId
          ? String(appointmentDoc.doctorId)
          : null,
        name: doctorName,
      });
    }
  }
  for (const p of prescriptionDocs) {
    const doctorName = p.doctorName ? String(p.doctorName) : null;
    if (doctorName) {
      doctorMap.set(doctorName.toLowerCase(), {
        id: null,
        name: doctorName,
      });
    }
  }

  return {
    appointment: appointmentDoc ?? null,
    prescriptions: prescriptionDocs,
    doctors: [...doctorMap.values()],
    patient: patientDoc ?? null,
  };
}
