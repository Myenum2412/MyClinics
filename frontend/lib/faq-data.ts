export interface FAQItem {
  id: string;
  category: "Queue & WhatsApp" | "Digital Rx & EMR" | "ABDM & Security" | "Billing & Analytics" | "Hardware & Setup";
  q: string;
  a: string;
  popular?: boolean;
}

export const FAQ_DATA: FAQItem[] = [
  {
    id: "what-is-myclinics",
    category: "Hardware & Setup",
    popular: true,
    q: "What is My Clinics and what does it do?",
    a: "My Clinics is a modern, cloud-native clinic management software (CMS) and electronic medical record (EMR) platform engineered for doctors, polyclinics, and multi-specialty healthcare centers. It brings together patient registration, real-time WhatsApp token queue updates, 30-second digital prescriptions, billing, laboratory orders, and automated patient follow-ups into a unified clinical interface without requiring patients to install third-party mobile applications.",
  },
  {
    id: "whatsapp-live-queue",
    category: "Queue & WhatsApp",
    popular: true,
    q: "How does live WhatsApp queue tracking work for patients?",
    a: "When an appointment is booked or a walk-in patient checks in, My Clinics sends an instant WhatsApp notification with the patient's assigned token number, doctor name, and an interactive live queue status link. Patients can check real-time queue movement, see how many patients are ahead of them, and view estimated consultation times on their phone, which eliminates waiting room overcrowding and no-show friction.",
  },
  {
    id: "no-app-download",
    category: "Queue & WhatsApp",
    popular: true,
    q: "Do patients need to download an app to receive queue updates or prescriptions?",
    a: "No. My Clinics is 100% web and WhatsApp native. Patients receive all appointment alerts, live queue token updates, digital prescription PDFs, lab test results, and payment links directly through official WhatsApp messages and secure mobile web links. Zero app download, account registration, or login friction is required for patients.",
  },
  {
    id: "fast-digital-rx",
    category: "Digital Rx & EMR",
    popular: true,
    q: "How fast can doctors write and generate digital prescriptions on My Clinics?",
    a: "Doctors can complete and sign comprehensive digital prescriptions in under 30 seconds. My Clinics features intelligent drug name autocomplete with 100,000+ pre-indexed medications, dosage shortcuts (e.g., 1-0-1 after food), custom clinical notes templates, and 1-tap electronic signing on official clinic letterhead. Prescriptions can be printed instantly or dispatched directly to the patient's WhatsApp.",
  },
  {
    id: "drug-interaction-checks",
    category: "Digital Rx & EMR",
    q: "Does My Clinics check for drug-drug interactions and patient allergies?",
    a: "Yes. My Clinics includes built-in clinical decision support that cross-references active medications, patient drug allergies, and molecular contraindications while the doctor is composing the prescription. If an adverse drug-drug interaction or duplicate molecule is detected, the doctor receives an immediate on-screen clinical alert before finalizing the prescription.",
  },
  {
    id: "letterhead-printing",
    category: "Hardware & Setup",
    q: "Can doctors print prescriptions on their existing physical clinic letterhead?",
    a: "Yes. My Clinics offers flexible print layout settings. Doctors can print full prescriptions onto plain A4 or A5 paper with digital headers, or offset margins to print content precisely onto pre-printed physical clinic letterhead stationery. The software also connects seamlessly with standard 58mm and 80mm thermal receipt printers for clinic billing.",
  },
  {
    id: "abdm-compliance",
    category: "ABDM & Security",
    popular: true,
    q: "Is My Clinics compliant with ABDM (Ayushman Bharat Digital Mission) and data privacy regulations?",
    a: "Yes. My Clinics adheres strictly to the Digital Personal Data Protection Act (DPDP Act 2023), Ayushman Bharat Digital Mission (ABDM) standards, and international HIPAA guidelines. All medical records and patient demographics are secured using AES-256 encryption at rest and TLS 1.3 encryption in transit, enforced with granular role-based access control (RBAC).",
  },
  {
    id: "abha-creation",
    category: "ABDM & Security",
    popular: true,
    q: "Can clinics create Ayushman Bharat Health Account (ABHA) IDs for patients in My Clinics?",
    a: "Yes. My Clinics supports fast ABHA (Health ID) creation and verification using Aadhaar OTP or mobile numbers. Doctors and staff can link patient consultation records to ABHA with patient consent, enabling seamless paperless sharing of health records across the Ayushman Bharat Digital Mission network.",
  },
  {
    id: "multi-specialty-clinics",
    category: "Hardware & Setup",
    q: "Can multi-specialty clinics and hospital chains manage multiple doctors and branches?",
    a: "Yes. My Clinics supports multi-branch organizations, multi-department polyclinics, and visiting consultants. Clinic administrators can assign individual doctor consultation timings, fees, department-specific queues, and role-based staff permissions (receptionist, nurse, billing desk, lab technician) across multiple geographic branches from a single unified dashboard.",
  },
  {
    id: "reduce-no-shows",
    category: "Queue & WhatsApp",
    popular: true,
    q: "How does My Clinics reduce patient no-shows and missed appointments?",
    a: "My Clinics sends automated two-stage WhatsApp reminders: 24 hours prior and 2 hours before the scheduled appointment time. Patients can confirm, cancel, or reschedule with a single tap. Automated reminders recover empty appointment slots for walk-in patients and reduce clinic no-shows by up to 42%.",
  },
  {
    id: "patient-past-records",
    category: "Digital Rx & EMR",
    popular: true,
    q: "How do doctors search and view a patient's past treatment history and medical timeline?",
    a: "Doctors can retrieve a patient's complete longitudinal clinical timeline in 1 click by searching their mobile number, name, or UHID. The timeline displays chronological past prescriptions, lab reports, recorded vitals trends, known drug allergies, and past consultation notes without searching through physical paper files.",
  },
  {
    id: "ai-assistant-eve",
    category: "Digital Rx & EMR",
    q: "How does the AI clinical assistant help doctors during patient consultations?",
    a: "The integrated AI assistant helps clinicians with intelligent medication dosage suggestions based on patient age and weight, differential diagnosis considerations, and converting spoken or bulleted consultation notes into structured electronic medical records in seconds.",
  },
  {
    id: "billing-and-payments",
    category: "Billing & Analytics",
    q: "How does My Clinics handle clinic billing, consultation fees, and pharmacy payments?",
    a: "My Clinics includes an integrated Point of Sale (POS) billing system supporting cash, credit/debit cards, UPI dynamic QR codes, and online payment links powered by Razorpay. Staff can generate itemized, GST-compliant invoices for consultations, diagnostic procedures, and pharmacy sales with one-click WhatsApp receipts and daily cash reconciliation reports.",
  },
  {
    id: "mobile-tablet-access",
    category: "Hardware & Setup",
    q: "Can doctors and clinic staff use My Clinics on smartphones and tablets?",
    a: "Yes. My Clinics is responsive across iPads, Android tablets, iPhones, laptops, and desktop computers. Doctors can review patient history, write prescriptions, and monitor token queues on any modern web browser or install it as an app via Progressive Web App (PWA) capabilities.",
  },
  {
    id: "offline-continuity",
    category: "Hardware & Setup",
    q: "Does My Clinics continue working if the clinic loses internet connectivity?",
    a: "Yes. My Clinics is designed with an offline-resilient architecture. During network outages, clinical staff can continue recording vitals, managing tokens, and viewing patient rosters locally; the platform automatically synchronizes with the cloud once internet connectivity is restored.",
  },
  {
    id: "diagnostic-lab-integration",
    category: "Digital Rx & EMR",
    q: "How does My Clinics integrate with diagnostic laboratories and pathology centers?",
    a: "Clinics can order laboratory investigations directly from the consultation screen. The diagnostic center or in-house lab receives test orders in real time, uploads digital reports (PDFs, pathology values, or scans), and My Clinics automatically attaches the verified report to the patient's electronic health timeline while sending a secure copy to the patient via WhatsApp.",
  },
  {
    id: "teleconsultation-support",
    category: "Queue & WhatsApp",
    q: "Does My Clinics support remote video teleconsultations for outstation patients?",
    a: "Yes. Doctors can schedule video teleconsultations directly from the appointment calendar. My Clinics automatically dispatches an encrypted video room link to the patient over WhatsApp. Once the video consultation concludes, the doctor signs and sends the digital prescription PDF straight to the patient's chat.",
  },
  {
    id: "hybrid-queue-management",
    category: "Queue & WhatsApp",
    q: "How do walk-in patients and online booked appointments synchronize in the queue?",
    a: "My Clinics employs an intelligent hybrid queue scheduling engine. Receptionists can register walk-in patients with a 10-second quick-add form, and the system dynamically schedules walk-in tokens alongside online bookings according to the clinic's predefined buffer rules and emergency triage priorities.",
  },
  {
    id: "schedule-conflict-prevention",
    category: "Hardware & Setup",
    q: "How does My Clinics prevent double-booking across multiple doctors and consultation rooms?",
    a: "My Clinics features an intelligent slot management engine that tracks individual doctor availability, room allocation, and leave calendars in real time, preventing overlapping slots, double bookings, and doctor schedule conflicts.",
  },
  {
    id: "hardware-requirements",
    category: "Hardware & Setup",
    q: "What hardware, computers, or printers are required to operate My Clinics?",
    a: "My Clinics runs on standard consumer hardware without requiring on-premise servers. Any PC, Mac, Chromebook, iPad, or Android tablet with Google Chrome, Safari, or Microsoft Edge works immediately. For printing, it connects with all laser/inkjet A4/A5 printers as well as standard 58mm/80mm thermal receipt printers.",
  },
  {
    id: "data-migration",
    category: "ABDM & Security",
    q: "How can a clinic migrate existing patient data and records into My Clinics?",
    a: "My Clinics provides a dedicated data migration service. Clinics can export historical patient registries, contact lists, and medication catalogs in Excel or CSV formats. Our migration team maps, validates, and uploads the data into your private clinic tenant within 24 to 48 hours with zero clinic downtime.",
  },
  {
    id: "financial-analytics",
    category: "Billing & Analytics",
    q: "Can clinic owners and administrators view financial analytics and doctor performance reports?",
    a: "Yes. The executive analytics dashboard provides real-time reports on daily patient footfall, average doctor consultation durations, patient wait times, revenue breakdown (consultation, pharmacy, procedures), payment modes, and repeat patient retention metrics. All reports can be exported to Excel and PDF in 1 click.",
  },
  {
    id: "data-export-and-backups",
    category: "ABDM & Security",
    q: "Can clinics export their patient database and financial reports at any time?",
    a: "Yes. Clinic owners retain 100% data ownership. You can export patient registries, consultation records, prescription logs, and accounting reports to Excel (XLSX) or CSV at any time. All data is backed up automatically across encrypted cloud locations with zero lock-in.",
  },
  {
    id: "whatsapp-repeat-rx",
    category: "Queue & WhatsApp",
    q: "Can patients request repeat prescriptions or follow-up consultations through WhatsApp?",
    a: "Yes. Clinics can activate verified WhatsApp conversational automation. Chronic care patients (e.g., hypertension, diabetes, thyroid management) can request prescription refills, book follow-up consultations, and initiate teleconsultation sessions directly from the clinic's WhatsApp business number.",
  },
  {
    id: "pricing-and-demo",
    category: "Billing & Analytics",
    popular: true,
    q: "How much does My Clinics cost and is there a free trial or interactive demo available?",
    a: "My Clinics offers transparent, affordable clinic software plans with no hidden setup fees. Doctors and clinic administrators can test the software immediately using our live interactive sandbox at /rx-demo or contact our team to schedule a personalized walkthrough.",
  },
  {
    id: "why-choose-myclinics",
    category: "ABDM & Security",
    popular: true,
    q: "Why do doctors and clinics choose My Clinics over traditional desktop clinic software?",
    a: "Unlike legacy desktop software that requires local servers, manual backups, and separate mobile apps, My Clinics is cloud-native, instantly accessible from any device, and natively integrated with WhatsApp. Clinics using My Clinics save up to 2 hours of administrative overhead every day, eliminate waiting room chaos, guarantee 100% data security, and improve patient retention.",
  },
];

export const FAQ_CATEGORIES = [
  "All",
  "Queue & WhatsApp",
  "Digital Rx & EMR",
  "ABDM & Security",
  "Billing & Analytics",
  "Hardware & Setup",
] as const;
