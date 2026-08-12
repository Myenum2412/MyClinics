export const APPOINTMENT_STATUSES = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "rescheduled",
  "no_show",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const BOOKING_SOURCES = ["manual", "whatsapp_ai"] as const;
export type BookingSource = (typeof BOOKING_SOURCES)[number];

export const APPOINTMENT_INTENTS = [
  "appointment_booking",
  "appointment_reschedule",
  "appointment_cancel",
  "appointment_status",
  "none",
] as const;
export type AppointmentIntent = (typeof APPOINTMENT_INTENTS)[number];

export const AGENT_STATES = [
  "collecting",
  "awaiting_confirmation",
  "confirmed",
  "done",
] as const;
export type AgentState = (typeof AGENT_STATES)[number];

export interface AppointmentSlot {
  customerName: string | null;
  doctorName: string | null;
  date: string | null;
  time: string | null;
}

export const AI_ACTION_TYPES = [
  "create_appointment",
  "reschedule_appointment",
  "cancel_appointment",
] as const;
export type AiActionType = (typeof AI_ACTION_TYPES)[number];

export interface AiAction {
  action: AiActionType;
  appointment: AppointmentSlot;
}

export interface AgentReply {
  reply: string;
  intent: AppointmentIntent;
  appointment: AppointmentSlot;
  state: AgentState;
  action: AiAction | null;
}

export interface AgentContext {
  organizationId: string;
  clinicName: string;
  soul: string;
  fallbackReply: string;
  customerName: string | null;
  phoneNumber: string;
  memoryFacts: string[];
  conversationSummary: string | null;
  history: { role: "user" | "assistant"; content: string }[];
  doctors: string[];
  todayISO: string;
  workingHours?: { open: string; close: string; slotMinutes: number };
  knowledgeDocs: { title: string; content: string }[];
}

export const EMPTY_SLOT: AppointmentSlot = {
  customerName: null,
  doctorName: null,
  date: null,
  time: null,
};

export interface WaCustomer {
  id: string;
  organizationId: string;
  whatsappId: string;
  phoneNumber: string;
  name: string | null;
  preferences: Record<string, string>;
  importantInformation: string[];
  conversationSummary: string | null;
  appointmentHistory: {
    date: string;
    time: string;
    doctor: string;
    status: string;
    bookedAt: string;
  }[];
  lastInteractionAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface WaConversation {
  id: string;
  organizationId: string;
  customerId: string;
  whatsappMessageId: string;
  direction: "incoming" | "outgoing";
  message: string;
  aiResponse?: string;
  intent?: AppointmentIntent;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}
