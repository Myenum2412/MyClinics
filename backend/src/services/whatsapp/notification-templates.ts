/**
 * Single source of truth for every WhatsApp text message the platform can send.
 *
 * These are the templates rendered (with live data) by the notification
 * services under `src/services/whatsapp/*`. They are exposed read-only to
 * organization admins via `GET /api/organization/whatsapp-notifications` so the
 * org menu can show exactly what patients/staff receive. `{Placeholders}` are
 * replaced with real values at send time.
 */

export type WhatsAppNotificationRecipient =
  | "Patient"
  | "Doctor"
  | "Staff"
  | "Patient & Doctor";

export interface WhatsAppNotificationTemplate {
  /** Stable identifier (also the `type` stored on the queued notification). */
  key: string;
  category: string;
  title: string;
  recipient: WhatsAppNotificationRecipient;
  description: string;
  sample: string;
}

export const WHATSAPP_NOTIFICATION_TEMPLATES: WhatsAppNotificationTemplate[] = [
  // ── Appointments ──────────────────────────────────────────────────────────
  {
    key: "appointment_created_patient",
    category: "Appointments",
    title: "Appointment booked — Patient",
    recipient: "Patient",
    description: "Sent to the patient when a new appointment is created.",
    sample: `Hi {Patient Name},

Your appointment with Dr. {Doctor Name} has been scheduled for {Date} at {Time}.

Best regards,
Clinic Team`,
  },
  {
    key: "appointment_rescheduled_patient",
    category: "Appointments",
    title: "Appointment rescheduled — Patient",
    recipient: "Patient",
    description: "Sent to the patient when an appointment is moved to a new slot.",
    sample: `Hi {Patient Name},

Your appointment with Dr. {Doctor Name} has been rescheduled to {Date} at {Time}.

Best regards,
Clinic Team`,
  },
  {
    key: "appointment_cancelled_patient",
    category: "Appointments",
    title: "Appointment cancelled — Patient",
    recipient: "Patient",
    description: "Sent to the patient when an appointment is cancelled.",
    sample: `Hi {Patient Name},

Your appointment with Dr. {Doctor Name} scheduled for {Date} at {Time} has been cancelled.

Best regards,
Clinic Team`,
  },
  {
    key: "appointment_created_doctor",
    category: "Appointments",
    title: "Appointment booked — Doctor",
    recipient: "Doctor",
    description: "Notifies the doctor when a new appointment is added to their calendar.",
    sample: `Dear Dr. {Doctor Name},

A new appointment has been scheduled with patient {Patient Name} for {Date} at {Time}.

Best regards,
Clinic Team`,
  },
  {
    key: "appointment_rescheduled_doctor",
    category: "Appointments",
    title: "Appointment rescheduled — Doctor",
    recipient: "Doctor",
    description: "Notifies the doctor when their appointment is rescheduled.",
    sample: `Dear Dr. {Doctor Name},

Your appointment with patient {Patient Name} has been rescheduled to {Date} at {Time}.

Best regards,
Clinic Team`,
  },
  {
    key: "appointment_cancelled_doctor",
    category: "Appointments",
    title: "Appointment cancelled — Doctor",
    recipient: "Doctor",
    description: "Notifies the doctor when their appointment is cancelled.",
    sample: `Dear Dr. {Doctor Name},

Your appointment with patient {Patient Name} scheduled for {Date} at {Time} has been cancelled.

Best regards,
Clinic Team`,
  },
  {
    key: "appointment_reminder_patient",
    category: "Appointments",
    title: "1-hour reminder — Patient",
    recipient: "Patient",
    description: "Sent 1 hour before the appointment (only if still upcoming).",
    sample: `Hi {Patient Name},

This is a reminder that your appointment today with Dr. {Doctor Name} is in 1 hour (at {Time}). Please arrive 10 minutes early.

Best regards,
Clinic Team`,
  },
  {
    key: "appointment_reminder_doctor",
    category: "Appointments",
    title: "1-hour reminder — Doctor",
    recipient: "Doctor",
    description: "Reminds the doctor of an upcoming appointment 1 hour before.",
    sample: `Dear Dr. {Doctor Name},

This is a reminder that you have an appointment with patient {Patient Name} in 1 hour (at {Time}).

Best regards,
Clinic Team`,
  },

  // ── Billing ────────────────────────────────────────────────────────────────
  {
    key: "bill_notification",
    category: "Billing",
    title: "Invoice / Bill",
    recipient: "Patient",
    description: "Sent when a bill is created with send method 'whatsapp'; includes the invoice PDF.",
    sample: `Hi {Patient First Name}, here is your invoice {Bill Number} from {Clinic Name}.

Invoice Date: {Date}
Invoice Total: ₹{Total}
Amount Paid: ₹{Amount Paid}
Balance Due: ₹{Balance Due}
Due Date: {Date}
Pay instantly via UPI: {UPI ID}

Thank you for choosing us!`,
  },

  // ── Prescriptions ───────────────────────────────────────────────────────────
  {
    key: "prescription_notification",
    category: "Prescriptions",
    title: "Prescription issued",
    recipient: "Patient",
    description: "Sent to the patient when a prescription is created or updated (patients only — never doctors).",
    sample: `Hi {Patient Name},

Your prescription has been {issued/updated} by Dr. {Doctor Name} on {Visit Date}.

Please log in to the Patient Portal to securely view your prescription details.

Best regards,
Clinic Team`,
  },

  // ── Patient onboarding ──────────────────────────────────────────────────────
  {
    key: "patient_registered_welcome",
    category: "Patient Onboarding",
    title: "Patient welcome (full)",
    recipient: "Patient",
    description: "Welcomes a newly registered patient with clinic info, portal login and welcome documents.",
    sample: `👋 Hi {Patient Name}, welcome to *{Clinic Name}*!
Your patient profile has been registered successfully. ✅

📋 *About Us:*
{Clinic description}

📍 *Clinic Details:*
🏥 *{Clinic Name}*
📌 {Address}
📞 {Phone}
💬 WhatsApp: {WhatsApp}
✉️ {Email}
🌐 {Website}

🕐 *Working Hours:*
  {Day}: {Open} – {Close}

📲 *Follow Us:*
  {Social links}

🔐 *Patient Portal Login:*
  👤 Username: {Username}
  🔑 Password: {Password}

📎 *Welcome Documents:*
  • {File name} ({size})
    📥 {download link}

✅ Thank you for choosing *{Clinic Name}*.`,
  },
  {
    key: "patient_welcome_document",
    category: "Patient Onboarding",
    title: "Welcome document attachment",
    recipient: "Patient",
    description: "Sends each clinic welcome document as an attached file.",
    sample: `📎 Hi {Patient Name}, here is "{File Name}" from {Clinic Name}.`,
  },
  {
    key: "patient_registered",
    category: "Patient Onboarding",
    title: "Patient welcome (fallback)",
    recipient: "Patient",
    description: "Simple welcome used when clinic details are unavailable.",
    sample: `Hi {Patient First Name}, welcome to {Organization Name}! Your patient profile has been registered successfully.
Portal login:
Username: {Username}
Password: {Password}`,
  },
  {
    key: "patient_credentials",
    category: "Patient Onboarding",
    title: "Portal credentials reset",
    recipient: "Patient",
    description: "Sent when a patient's portal login is reset or resent.",
    sample: `Hi {Patient First Name}, your patient portal login for *{Clinic Name}* has been reset.
Email: {Email}
Password: {Password}`,
  },
  {
    key: "patient_updated",
    category: "Patient Onboarding",
    title: "Profile updated — Patient",
    recipient: "Patient",
    description: "Confirms a patient's profile was updated.",
    sample: `Hi {Patient First Name}, your profile at {Organization Name} has been updated successfully{ (updated: fields)}.`,
  },

  // ── Doctor & staff ──────────────────────────────────────────────────────────
  {
    key: "doctor_new_patient",
    category: "Doctor & Staff",
    title: "New patient alert — Doctor",
    recipient: "Doctor",
    description: "Tells the assigned doctor a new patient was registered.",
    sample: `A new patient has been registered at {Organization Name}: {Patient Name}. Please review their profile.`,
  },
  {
    key: "doctor_patient_updated",
    category: "Doctor & Staff",
    title: "Patient updated alert — Doctor",
    recipient: "Doctor",
    description: "Tells the assigned doctor a patient's profile changed.",
    sample: `Patient profile updated at {Organization Name}: {Patient Name}{ (updated: fields)}.`,
  },
  {
    key: "patient_assigned",
    category: "Doctor & Staff",
    title: "Patient assigned — Patient",
    recipient: "Patient",
    description: "Tells the patient which doctor they are assigned to (or unassigned).",
    sample: `Hi {Patient First Name}, you have been assigned to Dr. {Doctor Name} at {Organization Name}.`,
  },
  {
    key: "doctor_patient_assigned",
    category: "Doctor & Staff",
    title: "Patient assigned — Doctor",
    recipient: "Doctor",
    description: "Tells the doctor a patient was assigned to them.",
    sample: `Patient {Patient Name} has been assigned to you at {Organization Name}.`,
  },
  {
    key: "doctor_registered",
    category: "Doctor & Staff",
    title: "Doctor welcome",
    recipient: "Doctor",
    description: "Welcomes a newly registered doctor.",
    sample: `Hi {Doctor First Name}, welcome to {Organization Name}! Your doctor profile has been registered successfully.`,
  },
  {
    key: "doctor_updated",
    category: "Doctor & Staff",
    title: "Doctor profile updated",
    recipient: "Doctor",
    description: "Confirms a doctor's profile was updated.",
    sample: `Hi {Doctor First Name}, your profile at {Organization Name} has been updated successfully.`,
  },
  {
    key: "login_details",
    category: "Doctor & Staff",
    title: "Staff login details",
    recipient: "Staff",
    description: "Sent to a doctor/staff member when their login account is created.",
    sample: `👋 Hi {Name}, your {Role} login for *{Clinic Name}* has been created.

🔐 *Login Details:*
  ✉️  Email: {Email}
  🔑 Password: {Password}

━━━━━━━━━━━━━━━━━━━━
📍 *Clinic Details:*
🏥 *{Clinic Name}*
📌 {Address}
📞 {Phone}
🕐 *Working Hours:* {Open} – {Close}`,
  },

  // ── Medicine records ────────────────────────────────────────────────────────
  {
    key: "medicine_record",
    category: "Medicine Records",
    title: "Medicine record",
    recipient: "Patient",
    description: "Summarizes a patient's medicine/visit record when created or updated.",
    sample: `💊 Hi *{Patient Name}*, your medicine record at *{Clinic Name}* has been {added/updated}.

────────────
📋 *RECORD DETAILS*
────────────
👨‍⚕️ *Doctor:* Dr. {Doctor Name}
📅 *Visit Date:* *{Date}*
🩺 *Diagnosis:* {Diagnosis}
🌡️ *Symptoms:* {Symptoms}
💉 *Treatment:* {Treatment}
💡 *Advice:* {Advice}

🔄 *Next Review Date:* *{Date}*
────────────

✅ Thank you for choosing *{Clinic Name}*.
We are committed to your health and well-being. 💚`,
  },

  // ── Queue & reminders ───────────────────────────────────────────────────────
  {
    key: "turn_alert",
    category: "Queue & Reminders",
    title: "Turn alert (queue)",
    recipient: "Patient",
    description: "Legacy flow: tells the next queued patient their turn has arrived.",
    sample: `Hi {Patient First Name}, this is {Organization Name}. Your turn is now{ (Dr. {Doctor Name})} — please come in. Appointment at {Time}.`,
  },
  {
    key: "reminder",
    category: "Queue & Reminders",
    title: "Appointment day reminder",
    recipient: "Patient",
    description: "Legacy day-of reminder sent from the default organization number.",
    sample: `Hi {Patient First Name},

This is a reminder from {Clinic Name} about your appointment today at {Time}{ with {Doctor Name}}.

Please arrive 10 minutes before your appointment.

Reply here if you need to reschedule or cancel.`,
  },
  {
    key: "morning_digest_doctor",
    category: "Queue & Reminders",
    title: "Morning digest — Doctor",
    recipient: "Doctor",
    description: "Daily 10:00 AM IST digest sent to each doctor with today's appointments.",
    sample: `Good Morning Dr. {Doctor Name} ☀️

You have {Count} appointment(s) today ({Date}) at {Clinic Name}:

1. {Time} - {Patient Name} - {Phone} ({Reason})
2. {Time} - {Patient Name}

Please be prepared.

Best regards,
{Clinic Name}`,
  },
  {
    key: "morning_digest_clinic",
    category: "Queue & Reminders",
    title: "Morning digest — Clinic",
    recipient: "Staff",
    description: "Daily 10:00 AM IST digest sent to the clinic's WhatsApp number with today's appointment summary by doctor.",
    sample: `Good Morning {Clinic Name} 🏥

Appointment Summary for {Date}:
Total: {Count} appointment(s)

👨‍⚕️ Dr. {Doctor Name}: {Count} appointment(s)
  • {Time} - {Patient Name}

Best regards,
System`,
  },
];
