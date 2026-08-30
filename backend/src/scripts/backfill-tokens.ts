import { getDb } from "@/lib/db-pools";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import { deriveSession } from "@/clinic/modules/appointments/token.service";
import type { AppointmentDoc } from "@/clinic/modules/appointments/appointments.schema";

async function backfill() {
  const db = await getDb();
  const col = db.collection<AppointmentDoc>(CLINIC_COLLECTIONS.appointments);
  const missing = await col
    .find({ tokenNumber: null, status: { $ne: "cancelled" as const } })
    .sort({ clinicId: 1, doctorId: 1, date: 1, time: 1 })
    .toArray();
  console.log(`Found ${missing.length} appointments without tokenNumber`);
  const groups = new Map<string, typeof missing>();
  for (const doc of missing) {
    const session = (doc.session ?? deriveSession(doc.time)) as ReturnType<typeof deriveSession>;
    const key = `${doc.clinicId}|${doc.doctorId}|${doc.date}|${session}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(doc);
  }
  let updated = 0;
  for (const [key, docs] of groups) {
    const [clinicId, doctorId, date, session] = key.split("|");
    docs.sort((a, b) => a.time.localeCompare(b.time));
    const last = await col
      .find({
        clinicId,
        doctorId,
        date,
        session: session as any,
        tokenNumber: { $ne: null },
      })
      .sort({ tokenNumber: -1 })
      .limit(1)
      .toArray();
    let next = (last[0]?.tokenNumber ?? 0) + 1;
    for (const doc of docs) {
      await col.updateOne(
        { clinicId, appointmentId: doc.appointmentId },
        {
          $set: {
            tokenNumber: next++,
            session: session as any,
            queueStatus: doc.queueStatus ?? "waiting",
            updatedAt: new Date(),
          },
        }
      );
      updated++;
    }
    console.log(`Backfilled ${docs.length} for ${key} -> next token ${next}`);
  }
  console.log(`Done. Updated ${updated} appointments.`);
  process.exit(0);
}

backfill().catch((e) => {
  console.error(e);
  process.exit(1);
});
