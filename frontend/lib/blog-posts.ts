export type ArticleSection = { id: string; title: string; body: string[] }

export type Article = {
  slug: string
  category: string
  title: string
  image: string
  excerpt: string
  author: { name: string; initials: string; img: number }
  date: string
  readTime: string
  sections: ArticleSection[]
}

export function slugifyTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export function articleHref(title: string) {
  return `/blog/${slugifyTitle(title)}`
}

type ArticleInput = Omit<Article, "slug">

const inputs: ArticleInput[] = [
  {
    category: "Security",
    title: "One clinic, one tenant: how My Clinics isolates your data",
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80",
    excerpt:
      "Your patients' records should never mix with anyone else's. Here's how our multi-tenant architecture enforces strict data isolation across appointments, prescriptions and billing.",
    author: { name: "Lena Park", initials: "LP", img: 47 },
    date: "Jun 9, 2026",
    readTime: "7 Min Read",
    sections: [
      {
        id: "why-isolation-matters",
        title: "Why isolation matters",
        body: [
          "When multiple clinics share one platform, the biggest risk isn't downtime  it's leakage. A patient's history, prescriptions and bills are deeply personal, and a clinic's books are confidential business data.",
          "That's why My Clinics was designed around a simple promise: everything your clinic creates lives inside your clinic's boundary, and nothing crosses it.",
        ],
      },
      {
        id: "one-clinic-one-tenant",
        title: "One clinic, one tenant",
        body: [
          "Every clinic that signs up receives its own Clinic ID. Doctors, staff, patients, appointments, prescriptions, uploaded reports and invoices are all attached to that single identifier.",
          "There is no shared pool of records between clinics. Two clinics on My Clinics can treat patients with identical names and their files will never intersect.",
        ],
      },
      {
        id: "how-queries-are-scoped",
        title: "How every query is scoped",
        body: [
          "Isolation isn't a filter you remember to apply  it's enforced in the data layer. Every read and write in our API resolves the caller's clinic session first and scopes the query to that clinic.",
          "Staff accounts can only see their own clinic's workspace. Patients can only see their own records inside the patient portal. There is no query path that returns another clinic's data.",
        ],
      },
      {
        id: "access-control",
        title: "Access control on top of isolation",
        body: [
          "Within a clinic, role-based access decides what each person sees: doctors work with appointments and prescriptions, front-desk staff manage scheduling and billing, and platform admins never browse clinical content.",
          "Every sensitive action lands in an audit log, so you always know who accessed or changed what, and when.",
        ],
      },
      {
        id: "what-this-means-for-you",
        title: "What this means for you",
        body: [
          "You get the economics of a shared platform with the privacy posture of a dedicated install: encrypted transport, encryption at rest, hashed passwords and strict tenant walls.",
          "If you ever leave, your data export belongs to you  complete, portable and free of anyone else's records.",
        ],
      },
    ],
  },
  {
    category: "Guides",
    title: "How to Setup Your MyClinic Account",
    image:
      "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800&q=80",
    excerpt:
      "From sign-up to your first booked appointment: a complete walkthrough of setting up your clinic on My Clinics, step by step.",
    author: { name: "Riya Menon", initials: "RM", img: 26 },
    date: "Aug 18, 2026",
    readTime: "10 Min Read",
    sections: [
      {
        id: "what-youll-need",
        title: "What you'll need",
        body: [
          "Before starting, keep these ready: your clinic's official name and address, a working email address for the clinic admin, and a phone number patients can reach you on.",
          "You can sign up with an email and password, or continue with Google for a faster start. The whole setup usually takes under fifteen minutes.",
        ],
      },
      {
        id: "step-1-create-your-account",
        title: "Step 1: Create your clinic account",
        body: [
          "Go to the sign-up page and choose \"Create Account\". Enter your name, clinic email and a strong password, or click \"Continue with Google\" to use your Google account in one tap.",
          "Pick a password with at least eight characters mixing letters, numbers and symbols. Passwords are stored as cryptographic hashes  nobody at My Clinics can read them.",
        ],
      },
      {
        id: "step-2-note-your-clinic-id",
        title: "Step 2: Note your Clinic ID",
        body: [
          "The moment your clinic is created, My Clinics generates a unique Clinic ID and shows it on screen. This ID is the identity of your clinic inside the platform.",
          "Copy it and keep it safe  you'll share it with your staff so they join the right workspace, and with patients who need to find your clinic. Losing access to it makes onboarding staff harder, so treat it like your clinic's account number.",
        ],
      },
      {
        id: "step-3-sign-in-to-your-workspace",
        title: "Step 3: Sign in to your workspace",
        body: [
          "After sign-up you're redirected to the login page. Sign in with the credentials you just created, or use Google sign-in.",
          "You'll land in your clinic workspace  the dashboard showing today's appointments, your doctors, patients and recent activity. Everything you see here belongs only to your clinic.",
        ],
      },
      {
        id: "step-4-add-doctors-and-staff",
        title: "Step 4: Add doctors and staff",
        body: [
          "Open the Doctors page and add each doctor with their name, specialisation, contact details and consultation timings. Front-desk and admin staff are added from the same area with the appropriate role.",
          "Roles control what each person can do: doctors manage appointments and prescriptions, staff handle scheduling and billing, and admins oversee settings and reports. Share your Clinic ID with team members who need to join from their own accounts.",
        ],
      },
      {
        id: "step-5-add-your-patients",
        title: "Step 5: Add your patients",
        body: [
          "From the Patients page, register each patient with their name, age, gender, blood group, contact number and any known allergies or medical history.",
          "The more complete the profile, the better  doctors see this context during consultations, and emergency details like blood group are visible at a glance.",
        ],
      },
      {
        id: "step-6-set-up-appointments",
        title: "Step 6: Set up appointments and booking",
        body: [
          "Configure each doctor's available days and time slots so the calendar reflects reality. Patients can then book online through your clinic's booking page, choosing a doctor and a slot that suits them.",
          "Every booking lands on the Appointments board where staff can confirm, reschedule or cancel. Statuses are colour-coded so the day's schedule reads at a glance.",
        ],
      },
      {
        id: "step-7-whatsapp-assistant",
        title: "Step 7: Turn on the WhatsApp assistant",
        body: [
          "Connect your clinic's WhatsApp number from Settings. Patients message your clinic the way they already message everyone else  the assistant understands their request and books the appointment for them.",
          "Automatic confirmations and reminders go out over WhatsApp, cutting no-shows without your staff lifting a finger. Patients can ask the assistant to stop reminders anytime.",
        ],
      },
      {
        id: "step-8-records-prescriptions-billing",
        title: "Step 8: Records, prescriptions and billing",
        body: [
          "During consultations, doctors issue digital prescriptions and attach reports  lab results, scans and documents upload straight into the patient's record. Bills are generated against each visit with medicine and service line items.",
          "Patients see their own prescriptions, reports and bills in the patient portal, so follow-ups don't turn into front-desk phone calls. Monthly reports summarise visits, revenue and patient flow for the whole clinic.",
        ],
      },
      {
        id: "troubleshooting",
        title: "Troubleshooting & support",
        body: [
          "Didn't receive a confirmation? Check spam, and confirm the email on the account is correct. Google sign-in failing usually means the Google account differs from the one used at sign-up.",
          "For anything else, reach out through the contact details on your clinic dashboard  support can see your Clinic ID context and resolve issues faster when you quote it.",
        ],
      },
    ],
  },
  {
    category: "Product",
    title: "WhatsApp booking your patients actually finish",
    image:
      "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&q=80",
    excerpt:
      "No apps to install. Patients book, reschedule and get reminders right inside the chat app they already use.",
    author: { name: "Marcus Webb", initials: "MW", img: 12 },
    date: "May 28, 2026",
    readTime: "5 Min Read",
    sections: [
      {
        id: "the-drop-off-problem",
        title: "The drop-off problem",
        body: [
          "Most online booking funnels lose patients between \"find the website\" and \"confirm the slot\". Every extra app download or account creation sheds people who simply wanted to see a doctor.",
          "WhatsApp removes that entire funnel  the conversation happens where your patients already are.",
        ],
      },
      {
        id: "how-it-works",
        title: "How it works",
        body: [
          "A patient messages your clinic's number. The assistant identifies the doctor or service they need, offers open slots, and confirms the booking  all in chat.",
          "Confirmations and reminders are sent automatically, and patients stay in control of the messages they receive.",
        ],
      },
      {
        id: "what-clinics-see",
        title: "What clinics see",
        body: [
          "Bookings made over WhatsApp appear instantly on your Appointments board alongside online and walk-in bookings  one calendar, zero double entry.",
          "Clinics running reminders report fewer empty slots and calmer mornings at the front desk.",
        ],
      },
    ],
  },
  {
    category: "Engineering",
    title: "Designing a multi-tenant MongoDB layer for health records",
    image:
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80",
    excerpt:
      "Every query is scoped to a clinicId. A look at the patterns that keep one clinic's data invisible to another.",
    author: { name: "Sofia Andrade", initials: "SA", img: 45 },
    date: "May 14, 2026",
    readTime: "9 Min Read",
    sections: [
      {
        id: "starting-point",
        title: "Starting point",
        body: [
          "Shared databases with per-row tenancy are efficient  and dangerous if even one query forgets its scope. For health records we wanted forgetting to be impossible.",
          "Our answer was to make the tenant boundary part of the data-access layer itself rather than a discipline expected of every feature.",
        ],
      },
      {
        id: "scoping-in-the-data-layer",
        title: "Scoping in the data layer",
        body: [
          "Repositories require an explicit clinic scope parameter; there is no unscoped variant to accidentally call. Cross-clinic reads are reserved for a handful of audited platform operations.",
          "Indexes lead with clinicId, keeping queries fast and making the scope physically present in every execution plan.",
        ],
      },
      {
        id: "verifying-the-walls",
        title: "Verifying the walls",
        body: [
          "Automated tests try to cross the boundary: reading another clinic's patients, booking into another clinic's calendar, fetching another clinic's bills. Each attempt must fail closed.",
          "These tests run on every change to the data layer, so a refactor can't silently widen a query.",
        ],
      },
    ],
  },
  {
    category: "Telehealth",
    title: "From walk-ins to online bookings: a clinic's first 30 days",
    image:
      "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=800&q=80",
    excerpt:
      "How a single-location clinic moved scheduling, records and billing onto My Clinics without missing a beat.",
    author: { name: "Devon Ross", initials: "DR", img: 13 },
    date: "May 2, 2026",
    readTime: "6 Min Read",
    sections: [
      {
        id: "week-1-going-digital",
        title: "Week 1: Going digital",
        body: [
          "The clinic started by registering doctors and importing their regular patients. Consultations continued on paper while staff learned the calendar.",
          "By Friday the team was confirming bookings from the dashboard instead of a paper diary.",
        ],
      },
      {
        id: "week-2-opening-online-booking",
        title: "Week 2: Opening online booking",
        body: [
          "Online booking switched on with real availability. The first day brought eleven online bookings  most from existing patients who preferred not to call.",
          "Front-desk workload shifted from answering phones to welcoming arrivals.",
        ],
      },
      {
        id: "week-4-the-habit-forms",
        title: "Week 4: The habit forms",
        body: [
          "With WhatsApp reminders active, no-shows dropped noticeably. Prescriptions, reports and bills were fully digital, and patients began expecting their documents in the portal.",
          "Thirty days in, the clinic runs on one system end to end  and the paper diary is a drawer relic.",
        ],
      },
    ],
  },
  {
    category: "Security",
    title: "Encrypting patient data in transit and at rest",
    image:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80",
    excerpt:
      "What we encrypt, how we rotate keys, and why passwords are hashed and never readable  even by us.",
    author: { name: "Priya Nair", initials: "PN", img: 44 },
    date: "Apr 19, 2026",
    readTime: "4 Min Read",
    sections: [
      {
        id: "in-transit",
        title: "In transit",
        body: [
          "All traffic to My Clinics runs over TLS. Appointment changes, prescription edits and document downloads are encrypted between your browser and our servers.",
          "Internal service communication follows the same rule  plaintext hops are not allowed anywhere in the pipeline.",
        ],
      },
      {
        id: "at-rest",
        title: "At rest",
        body: [
          "Stored records, uploads and backups are encrypted at rest. A lost disk or an exported snapshot is ciphertext without the keys.",
          "Keys live separately from the data they protect and rotate on a schedule, so long-lived copies age out automatically.",
        ],
      },
      {
        id: "credentials-and-access",
        title: "Credentials and access",
        body: [
          "Passwords are stored as cryptographic hashes and are never readable in plain text  by staff, by support, or by us. Sessions expire, and privileged actions land in audit logs.",
          "Encryption is the floor, not the ceiling: tenant isolation and role-based access decide who can reach data even when they can technically connect.",
        ],
      },
    ],
  },
  {
    category: "Product",
    title: "Prescriptions, reports and bills in one patient timeline",
    image:
      "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=800&q=80",
    excerpt:
      "Staff shouldn't dig through five screens. Here's how we unified the patient journey into a single view.",
    author: { name: "Theo Lambert", initials: "TL", img: 15 },
    date: "Apr 5, 2026",
    readTime: "8 Min Read",
    sections: [
      {
        id: "five-screens-too-many",
        title: "Five screens, too many",
        body: [
          "Before the timeline, answering \"what happened with this patient last month?\" meant visiting appointments, prescriptions, records and billing separately.",
          "Context lived in tabs and memory instead of in one place next to the patient.",
        ],
      },
      {
        id: "one-timeline",
        title: "One timeline",
        body: [
          "Now every visit, prescription, uploaded report and bill attaches to the patient's timeline in order. Open the patient, see the story  newest first.",
          "Documents preview inline, so verifying a lab report doesn't mean downloading anything.",
        ],
      },
      {
        id: "patients-see-it-too",
        title: "Patients see it too",
        body: [
          "The patient portal mirrors the same timeline for the patient's own eyes: their prescriptions, their reports, their bills.",
          "Shared context means fewer clarification calls and faster follow-ups.",
        ],
      },
    ],
  },
  {
    category: "Telehealth",
    title: "An AI assistant that finds the right doctor for you",
    image:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&q=80",
    excerpt:
      "Ask in plain language, get matched with the right specialist and book instantly. Inside our AI chat assistant.",
    author: { name: "Hana Kim", initials: "HK", img: 41 },
    date: "Mar 22, 2026",
    readTime: "5 Min Read",
    sections: [
      {
        id: "plain-language-intent",
        title: "Plain language, real intent",
        body: [
          "\"My son has rashes and fever since yesterday\" is how patients describe problems  not department names. The assistant parses intent from everyday language.",
          "It maps the need to the right doctor in that clinic's roster, considering specialisation and availability.",
        ],
      },
      {
        id: "matching-and-booking",
        title: "Matching and booking",
        body: [
          "Once matched, the assistant proposes open slots and completes the booking in the same conversation  no forms, no redirects.",
          "The reservation appears on the clinic's board instantly, tagged with the source so staff know it came through chat.",
        ],
      },
      {
        id: "guardrails",
        title: "Guardrails",
        body: [
          "The assistant schedules and informs; it does not diagnose. Anything urgent steers patients to immediate human contact.",
          "Clinics control the roster it draws from, so every recommendation is an appointment that can actually happen.",
        ],
      },
    ],
  },
]

export const ARTICLES: Article[] = inputs.map((input) => ({
  ...input,
  slug: slugifyTitle(input.title),
}))
