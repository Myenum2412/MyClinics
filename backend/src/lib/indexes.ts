import type { Db } from "mongodb";

/**
 * Idempotent index creation for platform collections (WhatsApp/AI services),
 * run once at server/worker startup.
 */
export async function ensureIndexes(db: Db): Promise<void> {
  const appointments = db.collection("appointments");
  const patients = db.collection("patients");
  const users = db.collection("users");
  const bills = db.collection("bills");
  const prescriptions = db.collection("prescriptions");
  const reports = db.collection("reports");
  const medicines = db.collection("medicines");
  const organizations = db.collection("organizations");
  const souls = db.collection("souls");
  const knowledge = db.collection("knowledge_documents");
  const waCustomers = db.collection("wa_customers");
  const waConversations = db.collection("wa_conversations");
  const waMemories = db.collection("wa_memories");
  const waNotifications = db.collection("wa_notifications");
  const reminders = db.collection("reminders");

  await Promise.all([
    appointments.createIndex({ date: 1, status: 1, time: 1 }),
    appointments.createIndex({ date: 1, status: 1, createdAt: 1 }),
    appointments.createIndex({ patientId: 1, date: 1 }),
    appointments.createIndex({ doctorId: 1, date: 1 }),
    appointments.createIndex({ mobile: 1 }),
    appointments.createIndex({ createdAt: -1 }),
    patients.createIndex({ mobile: 1 }),
    patients.createIndex({ userId: 1 }),
    patients.createIndex({ fullName: 1 }),
    patients.createIndex({ createdAt: -1 }),
    users.createIndex({ email: 1 }, { unique: true }),
    users.createIndex({ role: 1, createdAt: -1 }),
    users.createIndex({ resetToken: 1 }),
    bills.createIndex({ patientPhone: 1 }),
    bills.createIndex({ createdAt: -1 }),
    prescriptions.createIndex({ createdAt: -1 }),
    prescriptions.createIndex({ patientName: 1 }),
    reports.createIndex({ folderId: 1, createdAt: -1 }),
    reports.createIndex({ patientId: 1, createdAt: -1 }),
    reports.createIndex({ createdAt: -1 }),
    medicines.createIndex({ name: 1 }),
    organizations.createIndex({ isDefault: 1 }, { unique: true, partialFilterExpression: { isDefault: true } }),
    organizations.createIndex({ whatsappNumber: 1 }, { unique: true, sparse: true }),
    souls.createIndex({ organizationId: 1, isActive: 1 }),
    knowledge.createIndex({ organizationId: 1, category: 1 }),
    knowledge.createIndex({ organizationId: 1, hasEmbedding: 1 }),
    waCustomers.createIndex({ organizationId: 1, whatsappId: 1 }, { unique: true }),
    waCustomers.createIndex({ organizationId: 1, phone: 1 }),
    waConversations.createIndex({ organizationId: 1, customerId: 1, createdAt: -1 }),
    waMemories.createIndex({ organizationId: 1, customerId: 1 }),
    waNotifications.createIndex({ organizationId: 1, status: 1, createdAt: 1 }),
    waNotifications.createIndex({ appointmentId: 1 }, { unique: true, sparse: true }),
    reminders.createIndex({ appointmentId: 1 }, { unique: true }),
    reminders.createIndex({ organizationId: 1, status: 1, createdAt: 1 }),
  ]);
}