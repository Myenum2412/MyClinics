import type { Db } from "mongodb";
import { ObjectId } from "mongodb";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import { enqueueClinicNotification, NOTIFICATIONS_COLLECTION } from "@/services/whatsapp/notification.service";
import { logger } from "@/lib/logger";

export interface AppointmentNotificationDoc {
  _id?: ObjectId;
  appointmentId: string;
  clinicId: string;
  recipientRole: "patient" | "doctor";
  recipientId: string;
  type: "event" | "reminder";
  action: "created" | "updated" | "cancelled" | "reminder";
  status: "pending" | "enqueued" | "sent" | "failed";
  waNotificationId?: ObjectId | null;
  phone?: string;
  message?: string;
  scheduledTime: Date;
  attempts: number;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date | null;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function getScheduledReminderTime(dateStr: string, timeStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  // Parse in local time
  const appointmentTime = new Date(y, m - 1, d, hh, mm, 0, 0);
  // Subtract 1 hour (60 minutes)
  appointmentTime.setHours(appointmentTime.getHours() - 1);
  return appointmentTime;
}

export async function queueAppointmentNotifications(
  db: Db,
  clinicId: string,
  appointmentId: string,
  action: "created" | "updated" | "cancelled"
): Promise<void> {
  try {
    // 1. Fetch appointment details
    const appointment = await db.collection(CLINIC_COLLECTIONS.appointments).findOne({
      clinicId,
      appointmentId,
    });

    if (!appointment) {
      logger.warn("Could not queue notifications: Appointment not found", { appointmentId });
      return;
    }

    // 2. Fetch patient
    const patient = await db.collection(CLINIC_COLLECTIONS.patients).findOne({
      clinicId,
      patientId: appointment.patientId,
    });

    // 3. Fetch doctor
    const doctor = await db.collection(CLINIC_COLLECTIONS.doctors).findOne({
      clinicId,
      doctorId: appointment.doctorId,
    });

    if (!patient || !doctor) {
      logger.warn("Could not queue notifications: Patient or Doctor not found for appointment", {
        appointmentId,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
      });
      return;
    }

    const patientName = patient.fullName;
    const doctorName = doctor.name;
    const patientPhone = patient.whatsapp ?? patient.mobile;
    const doctorPhone = doctor.whatsapp ?? doctor.phone;

    const now = new Date();

    // If updated or cancelled, clean up any unsent pending/enqueued reminders for this appointment
    if (action === "updated" || action === "cancelled") {
      await db.collection("clc_appointment_notifications").deleteMany({
        clinicId,
        appointmentId,
        type: "reminder",
        status: { $in: ["pending", "enqueued"] },
      });
    }

    const notificationsToInsert: AppointmentNotificationDoc[] = [];

    // Construct event messages
    const patientEventMsg =
      action === "created"
        ? `Hi ${patientName},\n\nYour appointment with Dr. ${doctorName} has been scheduled for ${formatDate(appointment.date)} at ${appointment.time}.\n\nBest regards,\nClinic Team`
        : action === "updated"
        ? `Hi ${patientName},\n\nYour appointment with Dr. ${doctorName} has been rescheduled to ${formatDate(appointment.date)} at ${appointment.time}.\n\nBest regards,\nClinic Team`
        : `Hi ${patientName},\n\nYour appointment with Dr. ${doctorName} scheduled for ${formatDate(appointment.date)} at ${appointment.time} has been cancelled.\n\nBest regards,\nClinic Team`;

    const doctorEventMsg =
      action === "created"
        ? `Dear Dr. ${doctorName},\n\nA new appointment has been scheduled with patient ${patientName} for ${formatDate(appointment.date)} at ${appointment.time}.\n\nBest regards,\nClinic Team`
        : action === "updated"
        ? `Dear Dr. ${doctorName},\n\nYour appointment with patient ${patientName} has been rescheduled to ${formatDate(appointment.date)} at ${appointment.time}.\n\nBest regards,\nClinic Team`
        : `Dear Dr. ${doctorName},\n\nYour appointment with patient ${patientName} scheduled for ${formatDate(appointment.date)} at ${appointment.time} has been cancelled.\n\nBest regards,\nClinic Team`;

    // Queue Event for Patient (skip when unreachable — a queued row with no
    // phone can only ever fail its retry budget, so log once instead).
    if (patientPhone) {
      notificationsToInsert.push({
        appointmentId,
        clinicId,
        recipientRole: "patient",
        recipientId: appointment.patientId,
        type: "event",
        action,
        status: "pending",
        phone: patientPhone,
        message: patientEventMsg,
        scheduledTime: now,
        attempts: 0,
        lastError: null,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      logger.warn(
        "Patient has no mobile number — skipping appointment event notification",
        { appointmentId, clinicId, patientId: appointment.patientId }
      );
    }

    // Queue Event for Doctor (same skip-when-unreachable rule).
    if (doctorPhone) {
      notificationsToInsert.push({
        appointmentId,
        clinicId,
        recipientRole: "doctor",
        recipientId: appointment.doctorId,
        type: "event",
        action,
        status: "pending",
        phone: doctorPhone,
        message: doctorEventMsg,
        scheduledTime: now,
        attempts: 0,
        lastError: null,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      logger.warn(
        "Doctor has no mobile number — skipping appointment event notification",
        { appointmentId, clinicId, doctorId: appointment.doctorId }
      );
    }

    // Queue Reminders (only if appointment is scheduled/confirmed and NOT cancelled)
    if (action !== "cancelled" && appointment.status !== "cancelled") {
      const scheduledTime = getScheduledReminderTime(appointment.date, appointment.time);

      // Only queue if the reminder time is in the future
      if (scheduledTime.getTime() > now.getTime()) {
        const patientReminderMsg = `Hi ${patientName},\n\nThis is a reminder that your appointment today with Dr. ${doctorName} is in 1 hour (at ${appointment.time}). Please arrive 10 minutes early.\n\nBest regards,\nClinic Team`;
        const doctorReminderMsg = `Dear Dr. ${doctorName},\n\nThis is a reminder that you have an appointment with patient ${patientName} in 1 hour (at ${appointment.time}).\n\nBest regards,\nClinic Team`;

        if (patientPhone) {
          notificationsToInsert.push({
            appointmentId,
            clinicId,
            recipientRole: "patient",
            recipientId: appointment.patientId,
            type: "reminder",
            action: "reminder",
            status: "pending",
            phone: patientPhone,
            message: patientReminderMsg,
            scheduledTime,
            attempts: 0,
            lastError: null,
            createdAt: now,
            updatedAt: now,
          });
        } else {
          logger.warn(
            "Patient has no mobile number — skipping 1-hour reminder",
            { appointmentId, clinicId, patientId: appointment.patientId }
          );
        }

        if (doctorPhone) {
          notificationsToInsert.push({
            appointmentId,
            clinicId,
            recipientRole: "doctor",
            recipientId: appointment.doctorId,
            type: "reminder",
            action: "reminder",
            status: "pending",
            phone: doctorPhone,
            message: doctorReminderMsg,
            scheduledTime,
            attempts: 0,
            lastError: null,
            createdAt: now,
            updatedAt: now,
          });
        } else {
          logger.warn(
            "Doctor has no mobile number — skipping 1-hour reminder",
            { appointmentId, clinicId, doctorId: appointment.doctorId }
          );
        }
      }
    }

    if (!notificationsToInsert.length) {
      logger.warn("No reachable recipients for appointment notifications", {
        appointmentId,
        clinicId,
      });
      return;
    }
    await db.collection("clc_appointment_notifications").insertMany(notificationsToInsert);
    logger.info("Successfully queued appointment notifications", { appointmentId, count: notificationsToInsert.length });
  } catch (err) {
    logger.error("Failed to queue appointment notifications", { appointmentId, error: err });
  }
}

export async function processAppointmentNotifications(db: Db): Promise<void> {
  try {
    const now = new Date();

    // 1. Fetch pending notifications that are due
    const pendingList = await db
      .collection<AppointmentNotificationDoc>("clc_appointment_notifications")
      .find({
        status: { $in: ["pending", "failed"] },
        attempts: { $lt: 3 },
        scheduledTime: { $lte: now },
      })
      .toArray();

    for (const notification of pendingList) {
      try {
        const phone = notification.phone;

        if (!phone) {
          await db.collection("clc_appointment_notifications").updateOne(
            { _id: notification._id },
            {
              $set: {
                status: "failed",
                attempts: notification.attempts + 1,
                lastError: `${notification.recipientRole === "patient" ? "Patient" : "Doctor"} has no mobile number`,
                updatedAt: now,
              },
            }
          );
          continue;
        }

        // Verify appointment still exists and is not cancelled (unless it is a cancel notification itself)
        const appointment = await db.collection(CLINIC_COLLECTIONS.appointments).findOne({
          clinicId: notification.clinicId,
          appointmentId: notification.appointmentId,
        });

        if (!appointment && notification.action !== "cancelled") {
          await db.collection("clc_appointment_notifications").updateOne(
            { _id: notification._id },
            {
              $set: {
                status: "failed",
                attempts: notification.attempts + 1,
                lastError: "Appointment not found or deleted",
                updatedAt: now,
              },
            }
          );
          continue;
        }

        if (appointment && appointment.status === "cancelled" && notification.action !== "cancelled") {
          await db.collection("clc_appointment_notifications").updateOne(
            { _id: notification._id },
            {
              $set: {
                status: "failed",
                attempts: notification.attempts + 1,
                lastError: "Appointment was cancelled, reminder aborted",
                updatedAt: now,
              },
            }
          );
          continue;
        }

        // Enqueue the WhatsApp message through the owning clinic's connection
        const result = await enqueueClinicNotification(
          db,
          phone,
          notification.message || "",
          "appointment_notification",
          undefined,
          notification.clinicId
        );

        let waNotificationId: ObjectId | null = null;
        if (result.queued && result.remoteId) {
          const waNotif = await db
            .collection(NOTIFICATIONS_COLLECTION)
            .findOne(
              {
                remoteId: result.remoteId,
                message: notification.message,
                type: "appointment_notification",
                clinicId: notification.clinicId,
              },
              { sort: { createdAt: -1 } }
            );
          waNotificationId = waNotif ? waNotif._id : null;
        }

        await db.collection("clc_appointment_notifications").updateOne(
          { _id: notification._id },
          {
            $set: {
              status: result.queued ? "enqueued" : "failed",
              waNotificationId,
              attempts: notification.attempts + 1,
              lastError: result.queued ? null : "Failed to queue WhatsApp message",
              processedAt: new Date(),
              updatedAt: new Date(),
            },
          }
        );
      } catch (err) {
        logger.error("Error processing individual appointment notification", {
          id: notification._id,
          error: err,
        });
        await db.collection("clc_appointment_notifications").updateOne(
          { _id: notification._id },
          {
            $set: {
              status: "failed",
              attempts: notification.attempts + 1,
              lastError: err instanceof Error ? err.message : String(err),
              updatedAt: new Date(),
            },
          }
        );
      }
    }

    // 2. Sync delivery status from wa_notifications
    const enqueuedNotifications = await db
      .collection<AppointmentNotificationDoc>("clc_appointment_notifications")
      .find({ status: "enqueued", waNotificationId: { $ne: null } })
      .toArray();

    for (const notif of enqueuedNotifications) {
      try {
        if (!notif.waNotificationId) continue;
        const waNotif = await db.collection("wa_notifications").findOne({ _id: notif.waNotificationId });
        if (waNotif) {
          if (waNotif.status === "sent") {
            await db.collection("clc_appointment_notifications").updateOne(
              { _id: notif._id },
              { $set: { status: "sent", updatedAt: new Date() } }
            );
          } else if (waNotif.status === "failed") {
            await db.collection("clc_appointment_notifications").updateOne(
              { _id: notif._id },
              {
                $set: {
                  status: "failed",
                  lastError: waNotif.lastError || "WhatsApp delivery failed",
                  updatedAt: new Date(),
                },
              }
            );
          }
        }
      } catch (err) {
        logger.error("Error syncing status for appointment notification", {
          id: notif._id,
          error: err,
        });
      }
    }
  } catch (err) {
    logger.error("Failed processing appointment notifications batch", { error: err });
  }
}
