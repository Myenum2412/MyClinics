import type { Db, ObjectId } from "mongodb";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import { enqueueClinicNotification, NOTIFICATIONS_COLLECTION } from "@/services/whatsapp/notification.service";
import { logger } from "@/lib/logger";

export interface PrescriptionNotificationDoc {
  _id?: ObjectId;
  prescriptionId: string;
  clinicId: string;
  patientId: string;
  action: "created" | "updated";
  status: "pending" | "enqueued" | "sent" | "failed";
  waNotificationId?: ObjectId | null;
  phone?: string;
  message?: string;
  attempts: number;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date | null;
}

export async function processPrescriptionNotifications(db: Db): Promise<void> {
  const pendingList = await db
    .collection<PrescriptionNotificationDoc>("clc_prescription_notifications")
    .find({
      status: { $in: ["pending", "failed"] },
      attempts: { $lt: 3 },
    })
    .toArray();

  for (const notification of pendingList) {
    try {
      // 1. Fetch prescription
      const prescription = await db
        .collection(CLINIC_COLLECTIONS.prescriptions)
        .findOne({
          clinicId: notification.clinicId,
          prescriptionId: notification.prescriptionId,
          deletedAt: { $exists: false },
        });

      if (!prescription) {
        await db.collection("clc_prescription_notifications").updateOne(
          { _id: notification._id },
          {
            $set: {
              status: "failed",
              attempts: notification.attempts + 1,
              lastError: "Prescription not found or deleted",
              updatedAt: new Date(),
            },
          }
        );
        continue;
      }

      // 2. Fetch patient details
      const patient = await db
        .collection(CLINIC_COLLECTIONS.patients)
        .findOne({
          clinicId: notification.clinicId,
          patientId: notification.patientId,
          status: { $ne: "deleted" },
        });

      if (!patient) {
        await db.collection("clc_prescription_notifications").updateOne(
          { _id: notification._id },
          {
            $set: {
              status: "failed",
              attempts: notification.attempts + 1,
              lastError: "Patient not found or deleted",
              updatedAt: new Date(),
            },
          }
        );
        continue;
      }

      const phone = patient.whatsapp ?? patient.mobile;
      if (!phone) {
        await db.collection("clc_prescription_notifications").updateOne(
          { _id: notification._id },
          {
            $set: {
              status: "failed",
              attempts: notification.attempts + 1,
              lastError: "Patient has no mobile number",
              updatedAt: new Date(),
            },
          }
        );
        continue;
      }

      // 3. SECURELY handles prescription data:
      // Never send prescription details/documents to doctors. Check if this phone number or email belongs to a doctor in this clinic.
      const isDoctor = await db
        .collection(CLINIC_COLLECTIONS.doctors)
        .findOne({
          clinicId: notification.clinicId,
          $or: [
            { phone: phone },
            patient.email ? { email: patient.email } : { _invalid: true },
          ],
          status: { $ne: "deleted" },
        });

      if (isDoctor) {
        logger.warn("Prevented sending prescription notification: recipient is registered as a doctor.", {
          patientId: notification.patientId,
          phone,
        });
        await db.collection("clc_prescription_notifications").updateOne(
          { _id: notification._id },
          {
            $set: {
              status: "failed",
              attempts: notification.attempts + 1,
              lastError: "Recipient is a doctor. Prescription notifications are restricted to patients only.",
              updatedAt: new Date(),
            },
          }
        );
        continue;
      }

      // 4. Construct message
      const doctor = await db
        .collection(CLINIC_COLLECTIONS.doctors)
        .findOne({
          clinicId: notification.clinicId,
          doctorId: prescription.doctorId,
        });
      const doctorName = doctor ? doctor.name : "your doctor";

      const actionText = notification.action === "created" ? "issued" : "updated";
      const message = `Hi ${patient.fullName},\n\nYour prescription has been ${actionText} by Dr. ${doctorName} on ${prescription.visitDate}.\n\nPlease log in to the Patient Portal to securely view your prescription details.\n\nBest regards,\nClinic Team`;

      // 5. Enqueue notification
      const result = await enqueueClinicNotification(
        db,
        phone,
        message,
        "prescription_notification"
      );

      let waNotificationId: ObjectId | null = null;
      if (result.queued && result.remoteId) {
        const waNotif = await db
          .collection(NOTIFICATIONS_COLLECTION)
          .findOne(
            {
              remoteId: result.remoteId,
              message,
              type: "prescription_notification",
            },
            { sort: { createdAt: -1 } }
          );
        waNotificationId = waNotif ? waNotif._id : null;
      }

      await db.collection("clc_prescription_notifications").updateOne(
        { _id: notification._id },
        {
          $set: {
            status: result.queued ? "enqueued" : "failed",
            waNotificationId,
            phone,
            message,
            attempts: notification.attempts + 1,
            lastError: result.queued ? null : "Failed to queue WhatsApp message",
            processedAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error("Error processing prescription notification", {
        notificationId: notification._id,
        error: errorMsg,
      });
      await db.collection("clc_prescription_notifications").updateOne(
        { _id: notification._id },
        {
          $set: {
            status: "failed",
            attempts: notification.attempts + 1,
            lastError: errorMsg,
            updatedAt: new Date(),
          },
        }
      );
    }
  }

  // 6. Update status of enqueued notifications by checking the status in wa_notifications
  const enqueuedNotifications = await db
    .collection<PrescriptionNotificationDoc>("clc_prescription_notifications")
    .find({ status: "enqueued", waNotificationId: { $ne: null } })
    .toArray();

  for (const notification of enqueuedNotifications) {
    if (!notification.waNotificationId) continue;
    try {
      const waNotif = await db
        .collection(NOTIFICATIONS_COLLECTION)
        .findOne({ _id: notification.waNotificationId });

      if (waNotif) {
        if (waNotif.status === "sent") {
          await db.collection("clc_prescription_notifications").updateOne(
            { _id: notification._id },
            {
              $set: {
                status: "sent",
                processedAt: waNotif.sentAt ?? new Date(),
                updatedAt: new Date(),
              },
            }
          );
        } else if (waNotif.status === "failed") {
          await db.collection("clc_prescription_notifications").updateOne(
            { _id: notification._id },
            {
              $set: {
                status: "failed",
                lastError: waNotif.lastError ?? "WhatsApp delivery failed",
                updatedAt: new Date(),
              },
            }
          );
        }
      }
    } catch (err) {
      logger.error("Error updating prescription notification delivery status", {
        notificationId: notification._id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
