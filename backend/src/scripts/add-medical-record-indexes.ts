import { MongoClient } from "mongodb";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";

/**
 * Migration script to add critical indexes for medical records performance.
 * Run with: npx tsx src/scripts/add-medical-record-indexes.ts
 */

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is required");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db("myclinic");

  console.log("Adding medical records indexes...");

  const medicalRecordFiles = db.collection(CLINIC_COLLECTIONS.medicalRecordFiles);
  const medicalRecordFolders = db.collection(CLINIC_COLLECTIONS.medicalRecordFolders);

  try {
    // Compound index for listing files by patient with folder filter
    await medicalRecordFiles.createIndex(
      { clinicId: 1, patientId: 1, folder: 1, createdAt: -1 },
      { name: "clinicId_1_patientId_1_folder_1_createdAt_-1", background: true }
    );
    console.log("✓ Created clinicId_patientId_folder_createdAt index");

    // Index for doctor-scoped queries (via aggregation $lookup)
    await medicalRecordFiles.createIndex(
      { clinicId: 1, doctorId: 1, createdAt: -1 },
      { name: "clinicId_1_doctorId_1_createdAt_-1", background: true }
    );
    console.log("✓ Created clinicId_doctorId_createdAt index");

    // Index for fileId lookups (already unique but ensure it exists)
    await medicalRecordFiles.createIndex(
      { clinicId: 1, fileId: 1 },
      { unique: true, name: "clinicId_1_fileId_1_unique", background: true }
    );
    console.log("✓ Created/verified clinicId_fileId unique index");

    // Index for folder operations
    await medicalRecordFolders.createIndex(
      { clinicId: 1, patientId: 1, parentFolderId: 1, createdAt: 1 },
      { name: "clinicId_1_patientId_1_parentFolderId_1_createdAt_1", background: true }
    );
    console.log("✓ Created clinicId_patientId_parentFolderId_createdAt index");

    // Index for appointment notifications processing
    const appointmentNotifications = db.collection("clc_appointment_notifications");
    await appointmentNotifications.createIndex(
      { clinicId: 1, appointmentId: 1, status: 1 },
      { name: "clinicId_1_appointmentId_1_status_1", background: true }
    );
    console.log("✓ Created clinicId_appointmentId_status index");

    // Index for audit logs
    const auditLogs = db.collection(CLINIC_COLLECTIONS.auditLogs);
    await auditLogs.createIndex(
      { clinicId: 1, entity: 1, entityId: 1, createdAt: -1 },
      { name: "clinicId_1_entity_1_entityId_1_createdAt_-1", background: true }
    );
    console.log("✓ Created audit logs compound index");

    // Index for patients by doctor (used in medical records aggregation)
    const patients = db.collection(CLINIC_COLLECTIONS.patients);
    await patients.createIndex(
      { clinicId: 1, doctorId: 1, status: 1, createdAt: -1 },
      { name: "clinicId_1_doctorId_1_status_1_createdAt_-1", background: true }
    );
    console.log("✓ Created patients doctorId index");

    // Text index for patient search
    await patients.createIndex(
      { clinicId: 1, fullName: "text", mobile: "text", email: "text" },
      { name: "clinicId_1_fullName_text_mobile_text_email_text", background: true }
    );
    console.log("✓ Created patients text search index");

    // Verify all indexes
    console.log("\nVerifying indexes...");
    const indexes = await medicalRecordFiles.indexes();
    console.log("Medical Record Files indexes:");
    indexes.forEach((idx) => console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`));

    console.log("\n✅ All indexes created successfully!");
  } catch (error) {
    console.error("❌ Error creating indexes:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main().catch(console.error);