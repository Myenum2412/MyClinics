export interface FaqItem {
  q: string;
  a: string;
}

export interface FaqCategoryData {
  id: string;
  label: string;
  iconName:
    | "Sparkles"
    | "MessageSquare"
    | "Calendar"
    | "FileText"
    | "CreditCard"
    | "ShieldCheck";
  items: FaqItem[];
}

export const SOFTWARE_FAQ_CATEGORIES: FaqCategoryData[] = [
  {
    id: "getting-started",
    label: "Getting Started",
    iconName: "Sparkles",
    items: [
      {
        q: "What is MyClinics and how does it help doctors and clinics?",
        a: "MyClinics is an all-in-one clinic management platform designed to automate front-desk operations. It provides 24/7 WhatsApp appointment booking, live OPD queue counters, electronic medical records (EMR), digital prescriptions, GST billing, and pharmacy inventory in a secure multi-tenant system.",
      },
      {
        q: "How long does it take to set up my clinic on MyClinics?",
        a: "You can sign up and start managing your clinic in under 5 minutes. Adding doctors, configuring consultation hours, and connecting your WhatsApp assistant requires no technical setup or hardware installation.",
      },
      {
        q: "Do I or my front-desk staff need technical training to use the software?",
        a: "No. The software is built with an intuitive, clean interface that feels as familiar as everyday messaging apps. Receptionists and staff can schedule visits, register walk-ins, and print bills immediately without formal training.",
      },
      {
        q: "Does MyClinics work on mobile phones, tablets, and computers?",
        a: "Yes. MyClinics is fully cloud-based and responsive. Doctors and staff can securely access the dashboard from smartphones, iPads, tablets, laptops, and desktop computers anywhere, with progressive web app (PWA) support.",
      },
      {
        q: "Can I manage multiple doctors and clinic branches from a single account?",
        a: "Yes. MyClinics supports solo practitioner clinics as well as multi-doctor polyclinics and multi-location practices, with role-based access control for clinic admins, doctors, receptionists, and pharmacy staff.",
      },
      {
        q: "Can I import my existing patient records and medicine inventory?",
        a: "Yes. MyClinics provides quick-import and bulk upload tools for patient directories and pharmacy medicine catalogs, making data migration from spreadsheets or legacy software fast and error-free.",
      },
      {
        q: "Is there a free trial or live product demo available?",
        a: "Yes. You can test the platform with a live demo walk-through or sign up for a trial account to test the dashboard, WhatsApp booking flow, and queue management before committing to a paid plan.",
      },
      {
        q: "What happens if my clinic experiences slow internet or a temporary outage?",
        a: "MyClinics includes Progressive Web App (PWA) offline support. Your reception team can still view queued patient tokens and consult schedules cached locally on their device until internet connectivity resumes.",
      },
    ],
  },
  {
    id: "whatsapp-ai",
    label: "WhatsApp AI Assistant",
    iconName: "MessageSquare",
    items: [
      {
        q: "How does the WhatsApp AI assistant book appointments for patients?",
        a: "Patients message your clinic's WhatsApp number naturally (e.g., 'I want to book an appointment with Dr. Sharma tomorrow morning'). The AI assistant checks live doctor availability, collects necessary details, reserves the slot, and sends an instant WhatsApp confirmation.",
      },
      {
        q: "Does the WhatsApp assistant work 24/7 when the clinic is closed?",
        a: "Yes. The AI assistant responds instantly 24 hours a day, 7 days a week—including nights, weekends, and holidays—so patients can book upcoming appointments and receive clinic info even when your front desk is closed.",
      },
      {
        q: "How do automated WhatsApp reminders reduce patient no-shows?",
        a: "MyClinics automatically sends WhatsApp reminder alerts ~30 minutes prior to the scheduled consultation with token details and clinic directions. Clinics using MyClinics report an average 42% reduction in missed appointments.",
      },
      {
        q: "Can patients reschedule or cancel their appointments over WhatsApp?",
        a: "Yes. Patients can request to reschedule or cancel directly through the WhatsApp chat. The system instantly updates the doctor's calendar and opens up the time slot for other patients waiting in line.",
      },
      {
        q: "Will the WhatsApp AI hallucinate or give wrong medical advice?",
        a: "No. The AI assistant is strictly grounded in your clinic's verified knowledge base (soul.md and uploaded clinic documents). It answers questions about timings, doctors, fees, and location, and strictly refers medical inquiries to a doctor consultation.",
      },
      {
        q: "Can we customize the WhatsApp assistant's personality, greeting, and clinic FAQs?",
        a: "Absolutely. You can customize your clinic's assistant persona via the soul.md configuration and knowledge documents. You define custom clinic rules, consulting hours, doctor bios, consultation fees, and clinic policies.",
      },
      {
        q: "What happens if a patient asks a complex query the AI cannot handle?",
        a: "If a patient query requires human intervention, the assistant flags the conversation in your clinic dashboard's AI Assistant and Leads inbox so your front-desk staff can step in and reply directly.",
      },
      {
        q: "Can the WhatsApp bot send post-consultation instructions and follow-up reminders?",
        a: "Yes. Automated follow-ups can be sent to patients post-visit, reminding them about their medication schedule, follow-up dates, or inviting them to leave a review for the clinic.",
      },
    ],
  },
  {
    id: "appointments-queue",
    label: "Appointments & Queue",
    iconName: "Calendar",
    items: [
      {
        q: "How does the live OPD queue counter and token system work?",
        a: "Every booked patient receives a daily token number. As the doctor marks consultations complete, the live counter updates in real time and automatically alerts the next patient on WhatsApp that it is their turn to enter.",
      },
      {
        q: "Can receptionists easily manage walk-in patients alongside online bookings?",
        a: "Yes. Receptionists can use the Quick-Add feature to register walk-in patients in seconds, assigning them immediate tokens without interrupting pre-booked WhatsApp or online appointments.",
      },
      {
        q: "Can doctors view and manage their daily appointment schedule?",
        a: "Doctors have a dedicated dashboard displaying their day's schedule, live token progression, completed consultations, and patient history, enabling seamless transition between patients.",
      },
      {
        q: "Can patients check their live token number from home before coming to the clinic?",
        a: "Yes. Patients receive a unique WhatsApp tracking link showing the current token being served and their estimated consultation time, allowing them to time their arrival and avoid crowded waiting rooms.",
      },
      {
        q: "Can multiple doctors have independent live queue counters in the same clinic?",
        a: "Yes. Each doctor in your clinic has their own independent queue counter, token sequence, and schedule. The receptionist can manage all active doctor counters simultaneously from the queue dashboard.",
      },
      {
        q: "How does the system prevent double-booking or scheduling conflicts?",
        a: "The scheduling engine synchronizes time slots in real time across online bookings, WhatsApp reservations, and receptionist walk-ins, guaranteeing that no time slot or token is allocated twice.",
      },
      {
        q: "Can emergency or priority patients be moved up in the queue?",
        a: "Yes. Clinic staff have full control to reorder tokens or insert priority patients directly into the queue when immediate medical attention is required.",
      },
    ],
  },
  {
    id: "prescriptions-emr",
    label: "Prescriptions & EMR",
    iconName: "FileText",
    items: [
      {
        q: "Can doctors issue digital prescriptions in MyClinics?",
        a: "Yes. Doctors can generate clean digital prescriptions with medicine search, auto-completed dosages, frequency instructions, and clinical advice. Prescriptions can be printed or delivered directly to the patient's WhatsApp.",
      },
      {
        q: "How are patient medical records and lab reports stored?",
        a: "All patient vitals, diagnosis history, allergies, visit notes, and uploaded diagnostic reports (securely stored in Cloudflare R2) are organized into a unified, searchable patient medical timeline.",
      },
      {
        q: "Does MyClinics include pharmacy inventory and stock tracking?",
        a: "Yes. The integrated pharmacy module lets clinics track medicine batches, purchase invoices, retail sales, expiry dates, stock adjustments, and supplier history with low-stock alerts.",
      },
      {
        q: "Can doctors create customized prescription templates for common diagnoses?",
        a: "Yes. Doctors can save standardized prescription templates (e.g., Seasonal Flu, Hypertension, Dental Cleaning) with pre-filled medications and instructions to create complete prescriptions in under 15 seconds.",
      },
      {
        q: "Can prescription printouts include our clinic's logo and custom letterhead?",
        a: "Yes. You can configure custom clinic letterhead layouts, logos, doctor registration numbers, and clinic addresses to print professional, compliant physical prescriptions or export signed PDFs.",
      },
      {
        q: "Does the prescription system include medicine brand names and generic salts?",
        a: "Yes. The medicine database supports brand names, generic formulations, strengths, dosage formats (tablets, syrups, injections), and customizable intake timings (before food, after food, bedtime).",
      },
      {
        q: "Can patients upload past test reports and records to their profile?",
        a: "Yes. Patients and staff can upload lab PDFs, scan images, and test reports directly to the patient's record, where they are indexed and easily accessible to doctors during consultations.",
      },
    ],
  },
  {
    id: "billing-pricing",
    label: "Billing & Plans",
    iconName: "CreditCard",
    items: [
      {
        q: "Can I generate GST-compliant bills and track payments?",
        a: "Yes. Invoices can be generated automatically from visits and pharmacy items with GST calculation, discount handling, payment mode tracking (Cash, UPI, Card), and pending balance alerts.",
      },
      {
        q: "What pricing plans does MyClinics offer?",
        a: "MyClinics offers transparent monthly and annual tiers: Starter (₹7,000/mo), Growth (₹12,000/mo), and Scale (₹20,000/mo). Annual subscriptions include ~17% savings (2 months free). All plans include WhatsApp booking and strict data isolation.",
      },
      {
        q: "Can patients view past bills and records online?",
        a: "Yes. Patients can access a self-service Patient Portal to review their past appointments, payment receipts, active prescriptions, and lab reports anytime from their phone.",
      },
      {
        q: "Which payment methods can be tracked in the clinic billing system?",
        a: "The system supports Cash, UPI, Card, Net Banking, and custom split-payment options. You can record payments, track partial dues, and generate payment receipts instantly.",
      },
      {
        q: "Does MyClinics generate daily revenue and collection reports?",
        a: "Yes. The dashboard provides real-time financial reporting including daily OPD collections, pharmacy turnover, outstanding patient balances, doctor-wise revenue splits, and monthly GST breakdowns.",
      },
      {
        q: "Are there any hidden setup fees or charges per WhatsApp message?",
        a: "No hidden fees. Our pricing plans include all core features, multi-tenant hosting, and WhatsApp booking capabilities with clear upfront monthly or annual billing.",
      },
      {
        q: "Can I change or cancel my clinic subscription plan at any time?",
        a: "Yes. You can upgrade, downgrade, or cancel your subscription at any time directly from your clinic billing settings without penalty.",
      },
    ],
  },
  {
    id: "security-privacy",
    label: "Security & Privacy",
    iconName: "ShieldCheck",
    items: [
      {
        q: "Is my clinic's patient data isolated and private?",
        a: "Yes. MyClinics uses a multi-tenant architecture with strict database-level isolation. Every clinic has its own dedicated namespace and Clinic ID, ensuring no clinic or outside party can ever view your records.",
      },
      {
        q: "Who owns our clinic's medical and financial data?",
        a: "You own 100% of your data. You can export patient records, appointment registries, and revenue reports at any time with no lock-in.",
      },
      {
        q: "How is patient data protected against unauthorized access?",
        a: "All network traffic is encrypted using TLS 1.3, and medical files are stored with AES-256 encryption. Granular role-based permissions ensure staff members only see the modules authorized by the clinic administrator.",
      },
      {
        q: "Can I control what each staff member can view and edit?",
        a: "Yes. MyClinics provides granular role-based permissions (Admin, Doctor, Nurse, Receptionist, Pharmacist). Receptionists cannot view clinical diagnoses unless authorized, and staff cannot alter billing audits.",
      },
      {
        q: "Are database backups automated, and where is the data hosted?",
        a: "Database backups are automated daily with redundant geographic snapshots. Files and medical documents are stored in Cloudflare R2 object storage with multi-layer encryption.",
      },
      {
        q: "Is MyClinics compliant with telemedicine and digital health guidelines?",
        a: "Yes. MyClinics adheres to the Telemedicine Practice Guidelines and digital healthcare security standards, ensuring doctor consent, digital prescription validity, and strict patient confidentiality.",
      },
    ],
  },
];

// Re-export as AEO_GEO_FAQ_CATEGORIES for backwards-compatibility
export const AEO_GEO_FAQ_CATEGORIES = SOFTWARE_FAQ_CATEGORIES;

/**
 * Builds standard Schema.org FAQPage JSON-LD object for Answer Engine Optimization.
 */
export function buildFaqPageSchema(categories = SOFTWARE_FAQ_CATEGORIES) {
  const mainEntity = categories.flatMap((category) =>
    category.items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    }))
  );

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity,
  };
}
