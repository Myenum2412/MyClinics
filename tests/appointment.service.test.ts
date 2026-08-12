import { describe, it, expect, beforeEach } from "vitest";
import { createFakeDb } from "@/tests/helpers/fake-db";
import type { OrganizationRecord } from "@/services/customer/customer-context.service";
import {
  checkAvailability,
  createAppointment,
  rescheduleAppointment,
  cancelAppointment,
  getCustomerAppointments,
} from "@/services/ai/appointment.service";

const org: OrganizationRecord = {
  id: "org-1",
  name: "Test Clinic",
  whatsappNumber: null,
  settings: { open: "09:00", close: "18:00", slotMinutes: 30 },
  phone: null,
  email: null,
  address: null,
  website: null,
  description: null,
};

function seedDoctors() {
  return {
    users: [
      { _id: "dr-1", name: "Dr. Kumar", role: "doctor", department: "General" },
      { _id: "dr-2", name: "Dr. Priya", role: "doctor", department: null },
      { _id: "u-1", name: "Reception", role: "receptionist" },
    ],
  };
}

describe("appointment.service", () => {
  beforeEach(() => {});

  it("creates a confirmed whatsapp appointment for a free slot", async () => {
    const { db, dump } = createFakeDb(seedDoctors());
    const result = await createAppointment(db, org, {
      organizationId: "org-1",
      patientName: "Arun",
      phoneNumber: "919876543210",
      doctorName: "Dr. Kumar",
      date: "2099-01-15",
      time: "09:00",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.appointment.status).toBe("confirmed");
    expect(result.appointment.bookingSource).toBe("whatsapp_ai");
    expect(result.appointment.doctorId).toBe("dr-1");
    expect(result.appointment.doctorName).toBe("Dr. Kumar");

    const stored = dump("appointments");
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      organizationId: "org-1",
      fullName: "Arun",
      mobile: "919876543210",
      doctorId: "dr-1",
      status: "confirmed",
      bookingSource: "whatsapp_ai",
    });
  });

  it("rejects an unknown doctor", async () => {
    const { db } = createFakeDb(seedDoctors());
    const result = await createAppointment(db, org, {
      organizationId: "org-1",
      patientName: "Arun",
      phoneNumber: "919876543210",
      doctorName: "Dr. Ghost",
      date: "2099-01-15",
      time: "09:00",
    });
    expect(result).toEqual({ ok: false, code: "INVALID_DOCTOR", message: expect.any(String) });
  });

  it("never lets the AI invent a non-doctor user as a doctor", async () => {
    const { db } = createFakeDb(seedDoctors());
    const result = await createAppointment(db, org, {
      organizationId: "org-1",
      patientName: "Arun",
      phoneNumber: "919876543210",
      doctorName: "Reception",
      date: "2099-01-15",
      time: "09:00",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("INVALID_DOCTOR");
  });

  it("rejects past dates", async () => {
    const { db } = createFakeDb(seedDoctors());
    const result = await createAppointment(db, org, {
      organizationId: "org-1",
      patientName: "Arun",
      phoneNumber: "919876543210",
      doctorName: "Dr. Kumar",
      date: "2020-01-01",
      time: "09:00",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("INVALID_DATE");
  });

  it("rejects times outside clinic hours", async () => {
    const { db } = createFakeDb(seedDoctors());
    const result = await createAppointment(db, org, {
      organizationId: "org-1",
      patientName: "Arun",
      phoneNumber: "919876543210",
      doctorName: "Dr. Kumar",
      date: "2099-01-15",
      time: "20:00",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("INVALID_TIME");
  });

  it("rejects an already-occupied slot (legacy manual appointment)", async () => {
    const { db } = createFakeDb({
      users: seedDoctors().users,
      appointments: [
        {
          _id: "apt-legacy",
          fullName: "Other",
          mobile: "919876543210",
          doctorId: "dr-1",
          doctorName: "Dr. Kumar",
          date: "2099-01-15",
          time: "09:00",
          type: "in-person",
          status: "confirmed",
          bookingSource: "manual",
          createdAt: new Date(),
        },
      ],
    });

    const result = await createAppointment(db, org, {
      organizationId: "org-1",
      patientName: "Arun",
      phoneNumber: "919876543210",
      doctorName: "Dr. Kumar",
      date: "2099-01-15",
      time: "09:00",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("SLOT_TAKEN");
  });

  it("reports a cancelled appointment as available again", async () => {
    const { db } = createFakeDb({
      users: seedDoctors().users,
      appointments: [
        {
          _id: "apt-cancelled",
          fullName: "Other",
          mobile: "919876543210",
          doctorId: "dr-1",
          doctorName: "Dr. Kumar",
          date: "2099-01-15",
          time: "09:00",
          type: "in-person",
          status: "cancelled",
          bookingSource: "manual",
          createdAt: new Date(),
        },
      ],
    });

    const result = await checkAvailability(db, "org-1", org, "Dr. Kumar", "2099-01-15", "09:00");
    expect(result).toMatchObject({ ok: true, available: true });
  });

  it("reschedules to a free slot", async () => {
    const { db } = createFakeDb({
      users: seedDoctors().users,
      appointments: [
        {
          _id: "apt-2",
          fullName: "Arun",
          mobile: "919876543210",
          doctorId: "dr-1",
          doctorName: "Dr. Kumar",
          department: "General",
          date: "2099-02-01",
          time: "09:00",
          type: "in-person",
          status: "confirmed",
          bookingSource: "whatsapp_ai",
          createdAt: new Date(),
        },
      ],
    });

    const result = await rescheduleAppointment(db, org, {
      organizationId: "org-1",
      customerPhone: "919876543210",
      oldDate: "2099-02-01",
      newDate: "2099-02-02",
      newTime: "10:00",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.appointment.date).toBe("2099-02-02");
    expect(result.appointment.time).toBe("10:00");
    expect(result.appointment.status).toBe("rescheduled");
  });

  it("does not reschedule into an occupied slot", async () => {
    const { db } = createFakeDb({
      users: seedDoctors().users,
      appointments: [
        {
          _id: "apt-mine",
          fullName: "Arun",
          mobile: "919876543210",
          doctorId: "dr-1",
          doctorName: "Dr. Kumar",
          date: "2099-02-01",
          time: "09:00",
          type: "in-person",
          status: "confirmed",
          bookingSource: "whatsapp_ai",
          createdAt: new Date(),
        },
        {
          _id: "apt-other",
          fullName: "Other",
          mobile: "919876543211",
          doctorId: "dr-1",
          doctorName: "Dr. Kumar",
          date: "2099-02-02",
          time: "10:00",
          type: "in-person",
          status: "confirmed",
          bookingSource: "manual",
          createdAt: new Date(),
        },
      ],
    });

    const result = await rescheduleAppointment(db, org, {
      organizationId: "org-1",
      customerPhone: "919876543210",
      oldDate: "2099-02-01",
      newDate: "2099-02-02",
      newTime: "10:00",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("SLOT_TAKEN");
  });

  it("cannot reschedule an appointment that does not exist", async () => {
    const { db } = createFakeDb(seedDoctors());
    const result = await rescheduleAppointment(db, org, {
      organizationId: "org-1",
      customerPhone: "919876543210",
      newDate: "2099-02-02",
      newTime: "10:00",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });

  it("cancels a matching appointment", async () => {
    const { db } = createFakeDb({
      users: seedDoctors().users,
      appointments: [
        {
          _id: "apt-3",
          fullName: "Arun",
          mobile: "919876543210",
          doctorId: "dr-1",
          doctorName: "Dr. Kumar",
          date: "2099-03-01",
          time: "11:00",
          type: "in-person",
          status: "confirmed",
          bookingSource: "whatsapp_ai",
          createdAt: new Date(),
        },
      ],
    });

    const result = await cancelAppointment(db, "org-1", {
      organizationId: "org-1",
      customerPhone: "919876543210",
      date: "2099-03-01",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.appointment.status).toBe("cancelled");
  });

  it("cannot cancel an appointment that does not exist", async () => {
    const { db } = createFakeDb(seedDoctors());
    const result = await cancelAppointment(db, "org-1", {
      organizationId: "org-1",
      customerPhone: "919876543210",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });

  it("lists a customer's appointments regardless of booking source", async () => {
    const { db } = createFakeDb({
      users: seedDoctors().users,
      appointments: [
        {
          _id: "apt-wa",
          fullName: "Arun",
          mobile: "919876543210",
          doctorId: "dr-1",
          doctorName: "Dr. Kumar",
          date: "2099-04-01",
          time: "09:00",
          type: "in-person",
          status: "confirmed",
          bookingSource: "whatsapp_ai",
          createdAt: new Date(),
        },
        {
          _id: "apt-legacy",
          fullName: "Arun",
          mobile: "919876543210",
          doctorId: "dr-2",
          doctorName: "Dr. Priya",
          date: "2099-04-02",
          time: "09:00",
          type: "in-person",
          status: "confirmed",
          bookingSource: "manual",
          createdAt: new Date(),
        },
      ],
    });

    const list = await getCustomerAppointments(db, "org-1", "919876543210");
    expect(list).toHaveLength(2);
    expect(list[0].date).toBe("2099-04-02");
  });
});
