export const DEFAULT_WORKING_HOURS = {
  open: "09:00",
  close: "18:00",
  slotMinutes: 30,
} as const;

/**
 * Default configured fallback reply used when the doctor's soul.md (and
 * retrieved knowledge) does not contain an answer. Overridable per
 * organization via the soul record.
 */
export const KNOWLEDGE_NOT_FOUND_REPLY =
  "I'm sorry, I couldn't find that information. Please contact the clinic for more details.";

export const DB_COLLECTIONS = {
  organizations: "organizations",
  souls: "souls",
  knowledgeDocuments: "knowledge_documents",
  waCustomers: "wa_customers",
  waConversations: "wa_conversations",
  waMemories: "wa_memories",
  users: "users",
  appointments: "appointments",
  patients: "patients",
  bills: "bills",
  medicines: "medicines",
  services: "services",
} as const;
