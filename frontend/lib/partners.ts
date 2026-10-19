export type PartnerType = {
  iconName: "Building2" | "Stethoscope" | "FlaskConical" | "Megaphone";
  title: string;
  description: string;
};

export type PartnerIntegration = {
  title: string;
  description: string;
};

export const PARTNER_EMAIL = "partners@myenum.in";

export const PARTNER_TYPES: PartnerType[] = [
  {
    iconName: "Building2",
    title: "Clinic chains & hospitals",
    description:
      "Standardise appointments, live queues, EMR, billing and pharmacy across every branch you operate.",
  },
  {
    iconName: "Stethoscope",
    title: "EMR & healthcare consultants",
    description:
      "Add My Clinics to your implementations and earn on every clinic you onboard and support.",
  },
  {
    iconName: "FlaskConical",
    title: "Labs, diagnostics & pharmacies",
    description:
      "Connect reports, prescriptions and orders so data moves between systems without manual entry.",
  },
  {
    iconName: "Megaphone",
    title: "Affiliates & creators",
    description:
      "Refer clinics in your network or audience and get rewarded for every successful activation.",
  },
];

export const PARTNER_BENEFITS: string[] = [
  "Revenue share on every clinic you bring onboard",
  "Co-marketing, joint webinars and published case studies",
  "Dedicated partner manager and guided onboarding",
  "Priority product support and a say in the roadmap",
  "Early access to new modules before public launch",
];

export const PARTNER_INTEGRATIONS: PartnerIntegration[] = [
  {
    title: "WhatsApp Business API",
    description: "AI booking, reminders and live queue alerts delivered where patients already are.",
  },
  {
    title: "Diagnostics & labs",
    description: "Lab orders out, reports back — attached to the patient record automatically.",
  },
  {
    title: "Payments & billing",
    description: "UPI and card collections with settlement reconciliation against clinic invoices.",
  },
  {
    title: "Pharmacy & inventory",
    description: "Digital prescriptions flow straight into dispensing, stock and expiry tracking.",
  },
  {
    title: "Calendar, telehealth & EHR",
    description: "Calendar sync, video consults and HL7/FHIR-friendly exchange with existing systems.",
  },
];
