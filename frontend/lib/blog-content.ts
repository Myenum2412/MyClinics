import { CATALOG, type CatalogEntry, type Cluster } from "./blog-catalog"

export type ArticleSection = { id: string; title: string; body: string[] }
export type Faq = { q: string; a: string }

export type ResolvedArticle = {
  slug: string
  title: string
  category: string
  excerpt: string
  author: { name: string; initials: string; img: number }
  date: string
  readTime: string
  sections: ArticleSection[]
  faqs: Faq[]
}

function hash(s: string) {
  return Math.abs([...s].reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 7))
}
function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length]
}

type Intent = "guide" | "versus" | "pillar" | "listicle" | "explainer" | "roundup"

function intentOf(title: string): Intent {
  if (/ vs /i.test(title)) return "versus"
  if (/complete guide/i.test(title)) return "pillar"
  if (/^\d+\s/i.test(title)) return "listicle"
  if (/^what is/i.test(title)) return "explainer"
  if (/^(best|top)\b/i.test(title)) return "roundup"
  return "guide"
}

function subjectOf(title: string) {
  return title
    .replace(/^(how to|how|the complete guide to|what is|best|top)\s+/i, "")
    .replace(/\?$/, "")
    .trim()
}

const AUTHORS = [
  { name: "Lena Park", initials: "LP", img: 47 },
  { name: "Riya Menon", initials: "RM", img: 26 },
  { name: "Marcus Webb", initials: "MW", img: 12 },
  { name: "Sofia Andrade", initials: "SA", img: 45 },
  { name: "Devon Ross", initials: "DR", img: 13 },
  { name: "Priya Nair", initials: "PN", img: 44 },
]

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
function dateFor(index: number) {
  const d = new Date(2026, 0, 12 + index * 2)
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

type Blueprint = { t: (s: string) => string; p: (s: string) => [string, string] }

const CLUSTER_SECTIONS: Record<Cluster, Blueprint[]> = {
  "Clinic Software": [
    { t: s => `What "${s}" really involves`, p: s => [
      `At its core, ${s} replaces the register-and-recall habits of a paper clinic with one connected system. Appointments, patient histories, prescriptions, bills and reports stop living in separate places and start living under a single login.`,
      `The practical difference shows up on a busy day: instead of flipping through files or calling the front desk for updates, everything about a patient is one search away â€” and every colleague sees the same, current picture.`,
    ]},
    { t: () => `Where paper workflows break down`, p: () => [
      `Paper scales badly with success. More patients mean more files, more handwriting, more time lost locating records, and more chances for a prescription or bill to go missing at exactly the wrong moment.`,
      `Manual systems also make questions expensive. Simple ones â€” how many patients did we see last month, which payments are still pending, who is due for a follow-up â€” require someone to sit down and count.`,
    ]},
    { t: s => `Doing ${s} the right way`, p: s => [
      `Successful clinics keep the transition boring and deliberate: move scheduling first, bring patient records in next, then prescriptions and billing. Each step delivers value on its own, so nothing hinges on a risky big-bang switchover.`,
      `Staff adoption matters more than features. A system like My Clinics is designed so the front desk can learn it in an afternoon, which is why clinics see value from week one rather than quarter two.`,
    ]},
  ],
  Appointments: [
    { t: s => `Why ${s} matters`, p: s => [
      `Appointment chaos is rarely one big failure â€” it is dozens of small ones. Double-booked slots, forgotten walk-ins, sticky notes for callbacks and phone interruptions all add up to long waits and stressed staff.`,
      `Fixing ${s.toLowerCase()} starts with making the schedule single source of truth: one calendar every doctor and staff member works from, visible in real time.`,
    ]},
    { t: () => `A schedule patients can trust`, p: () => [
      `When patients can see genuine availability and book themselves â€” online or over WhatsApp â€” no-shows drop because the booking feels owned, not imposed. Automatic reminders reinforce that commitment without staff lifting a finger.`,
      `Inside the clinic, colour-coded statuses make the day readable at a glance: confirmed, waiting, completed, cancelled. Anyone covering the desk instantly knows what needs attention.`,
    ]},
    { t: s => `Making it stick`, p: (s) => [
      `Clinics that succeed with ${s.toLowerCase()} review the calendar at open and close: confirm today's list each morning, clear pending follow-ups before locking up.`,
      `My Clinics keeps this routine lightweight by handling reminders, reschedules and doctor-wise calendars automatically, so discipline costs minutes instead of hours.`,
    ]},
  ],
  Records: [
    { t: s => `From filing cabinets to instant answers`, p: s => [
      `${s} is ultimately about retrieval speed. A record that cannot be found in seconds is a liability, however carefully it was written.`,
      `Digital records flip the model: search a name or phone number and the full history â€” visits, diagnoses, reports, prescriptions â€” appears in one timeline, newest first.`,
    ]},
    { t: () => `Structure beats storage`, p: () => [
      `Scanning paper into folders only moves the mess. The clinics that benefit most capture information as structured data from day one: demographics, allergies, blood group, visit notes, attached reports.`,
      `That structure powers everything else â€” duplicate detection when registering, safety prompts for allergies, and clean monthly reports without manual counting.`,
    ]},
    { t: s => `Keeping it safe`, p: (s) => [
      `${s} also means keeping information private: encrypted transfer and storage, role-based access so front desk sees scheduling while doctors see clinical detail, and audit logs for sensitive actions.`,
      `With My Clinics, isolation goes further â€” every clinic's data lives inside its own tenant boundary, so records are never shared or mixed across clinics.`,
    ]},
  ],
  Prescriptions: [
    { t: s => `What changes when prescribing goes digital`, p: s => [
      `${s} removes the weakest links of paper: illegible handwriting, missing dosage instructions and prescriptions that vanish between consultation and pharmacy.`,
      `A digital prescription is typed, structured and stored against the patient's visit. Patients receive their copy in the portal, and doctors can reproduce or reference it months later in seconds.`,
    ]},
    { t: () => `Faster follow-ups, better history`, p: () => [
      `Because every prescription links to its visit and diagnosis, follow-ups start with context. Doctors compare what was prescribed last time and whether reports improved â€” without asking the patient to carry old files.`,
      `Reports attach to the same timeline, so a prescription, the lab result it relied on and the bill for that visit stay together permanently.`,
    ]},
    { t: s => `Adopting it safely`, p: (s) => [
      `Clinics adopting ${s.toLowerCase()} typically start with new prescriptions while keeping old paper scanned into the record â€” history preserved, future digital.`,
      `In My Clinics, medicines and dosages are picked from structured lists, which cuts typing errors and makes pharmacy hand-off unambiguous.`,
    ]},
  ],
  Billing: [
    { t: s => `The cost of manual billing`, p: s => [
      `${s} done by hand leaks money quietly: missed charges, calculation slips, untracked dues and hours of reconciliation at month-end.`,
      `Digital billing attaches charges to the visit itself. Consultation fees, procedures and medicines flow onto an itemised invoice the moment they happen.`,
    ]},
    { t: () => `Know today's numbers today`, p: () => [
      `With payments recorded against invoices, daily revenue is a glance, not an audit. Pending amounts surface automatically, so follow-up happens while collection is still easy.`,
      `Monthly reports compile visits, revenue and service mix into summaries owners actually use â€” no spreadsheet archaeology required.`,
    ]},
    { t: s => `Getting it right`, p: (s) => [
      `Clinics working on ${s.toLowerCase()} standardise their price list once, then let the system apply it consistently â€” fewer disputes, cleaner receipts for patients.`,
      `My Clinics generates professional digital bills and tracks every payment against them, which is why clinics describe month-end as reading a report rather than assembling one.`,
    ]},
  ],
  WhatsApp: [
    { t: s => `Meet patients where they already are`, p: s => [
      `${s} succeeds because it asks nothing new of patients. No app downloads, no portals to remember â€” just the chat app already on every phone.`,
      `Booking, rescheduling and reminders become conversations. The assistant understands requests in plain language and acts on a real calendar, so what gets promised is genuinely available.`,
    ]},
    { t: () => `Reminders that actually land`, p: () => [
      `Missed appointments usually trace back to forgetfulness, not disrespect. Timely WhatsApp reminders â€” confirmation on booking, nudge the day before, follow-up after the visit â€” measurably cut empty slots.`,
      `Patients stay in control: they can reply to reschedule or opt out of messages anytime, which keeps the channel welcome rather than intrusive.`,
    ]},
    { t: s => `Setting it up well`, p: (s) => [
      `Clinics starting with ${s.toLowerCase()} connect their number once, define reminder timing, and let the assistant handle confirmations automatically.`,
      `Within My Clinics every conversation ties back to the patient record, so the front desk always sees the full story behind each message.`,
    ]},
  ],
  AI: [
    { t: s => `What AI should (and shouldn't) do in a clinic`, p: s => [
      `${s} works best when AI handles pattern work â€” matching requests to doctors, answering routine questions, sending the right message at the right time â€” and humans handle judgement.`,
      `It is not a doctor replacement. It is the tireless part of the front desk: awake at midnight, consistent in tone, and never putting a caller on hold.`,
    ]},
    { t: () => `Where clinics feel the difference first`, p: () => [
      `Booking is the fastest win. An AI appointment assistant converts natural language into a correct slot on a real calendar, capturing patients who would otherwise hang up or abandon a form.`,
      `Routine queries â€” timings, location, reports availability â€” get instant answers, freeing staff for the conversations that genuinely need a person.`,
    ]},
    { t: s => `Choosing your first use case`, p: (s) => [
      `For teams exploring ${s.toLowerCase()}, start narrow: appointment booking plus reminders. Measure calls deflected and no-shows avoided, then expand gradually.`,
      `My Clinics bundles exactly this loop â€” AI booking over chat, automatic confirmations, staff dashboard oversight â€” so control stays with the clinic throughout.`,
    ]},
  ],
  Growth: [
    { t: s => `Growth starts with being findable`, p: s => [
      `${s} begins before the patient ever calls: a complete Google profile, accurate directions, real opening hours and recent reviews decide whether a search turns into a visit.`,
      `Most patients choose from the top few local results. Being present, accurate and responsive there is the cheapest marketing a clinic can do.`,
    ]},
    { t: () => `Turn one good visit into the next`, p: () => [
      `Retention compounds. Automated follow-ups, WhatsApp check-ins and easy rebooking make returning frictionless â€” and returning patients refer friends.`,
      `Asking for a review right after a positive visit, when goodwill peaks, steadily builds the social proof that convinces strangers to try you.`,
    ]},
    { t: s => `Systems, not campaigns`, p: (s) => [
      `Sustainable ${s.toLowerCase()} comes from routines: profile refreshed monthly, reviews requested weekly, follow-ups automated always.`,
      `My Clinics supports the operational half â€” online booking that converts, reminders that retain, records that impress â€” so marketing promises are kept at the front desk.`,
    ]},
  ],
  Specialties: [
    { t: s => `What this specialty uniquely needs`, p: s => [
      `${s} has a workflow rhythm of its own: typical visit reasons, recurring procedures, follow-up patterns and documentation habits general software treats as edge cases.`,
      `The right platform bends to those patterns â€” customisable appointment reasons, procedure-linked billing items and templates doctors recognise â€” rather than forcing the clinic to adapt to it.`,
    ]},
    { t: () => `Features that earn their keep`, p: () => [
      `Look past the brochure: flexible slot lengths per procedure, structured notes for repeat visits, report attachments beside the prescription, and family accounts for paediatric-style care.`,
      `Billing flexibility matters too â€” packages, split payments and insurance-ready invoices appear in almost every specialty's day-to-day reality.`,
    ]},
    { t: s => `Evaluating with confidence`, p: (s) => [
      `Run a live trial week with real scenarios from ${s.toLowerCase()}: book a typical case, prescribe, attach a report, bill it, then pull the monthly report.`,
      `My Clinics passes this test by staying configurable without custom development â€” specialty fit through settings, not engineering projects.`,
    ]},
  ],
  "Buying Guide": [
    { t: s => `Decide with a framework, not a demo high`, p: s => [
      `${s} deserves the same rigour as any equipment purchase. Demos are choreographed; your clinic week is not. Write down five real scenarios and score every vendor against them.`,
      `Price matters less than total cost: setup effort, training time, per-user charges and export freedom all hide inside the monthly figure.`,
    ]},
    { t: () => `Non-negotiables for medical software`, p: () => [
      `Data isolation between clinics, encryption in transit and at rest, hashed credentials, role-based access and audit logs are table stakes â€” treat anything less as disqualifying.`,
      `Insist on exit-friendliness too: full data export in open formats means the relationship stays honest for both sides.`,
    ]},
    { t: s => `Questions worth asking vendors`, p: () => [
      `Who can see our data? What happens on cancellation? Is WhatsApp automation included or extra? How long does onboarding really take? Vendors answer these quickly or reveal themselves slowly.`,
      `My Clinics publishes straightforward answers: strict per-clinic isolation, encrypted storage, WhatsApp built in, and onboarding measured in days with your own Clinic ID from sign-up.`,
    ]},
  ],
}

const UNIVERSAL: Record<Intent, Blueprint> = {
  guide: { t: s => `A step-by-step approach`, p: s => [
    `Break ${s.toLowerCase()} into weekly moves rather than a weekend overhaul. Week one: map today's workflow honestly, warts included. Week two: digitise scheduling. Week three: migrate active patient records. Week four: switch on prescriptions and billing.`,
    `Review with staff at each step. Adoption follows involvement â€” the team that designs the workflow defends it.`,
  ]},
  versus: { t: s => `Head-to-head comparison`, p: s => [
    `Side by side, the trade-off is speed versus reliability. Manual methods start faster but tax you every single day thereafter; digital takes a short setup hit and then pays you back continuously.`,
    `Consider error rates, retrieval time, reporting ability and data safety. On all four, the digital column wins â€” the only real question is switching discipline, not capability.`,
  ]},
  pillar: { t: s => `Where most clinics go wrong`, p: s => [
    `The classic mistakes are predictable: migrating everything at once, skipping staff training, customising endlessly before seeing value, and choosing software that locks data in.`,
    `Avoid all four by sequencing change, training in small doses, shipping value weekly and insisting on exportable data from day one.`,
  ]},
  listicle: { t: s => `What to look for`, p: s => [
    `Judge each item on this list against daily reality: does it save measurable minutes, prevent a specific error class, or unlock insight you currently lack? Everything else is decoration.`,
    `Prioritise the three you would feel this week. Features you would feel next quarter can wait â€” momentum beats completeness.`,
  ]},
  explainer: { t: s => `How it works in practice`, p: s => [
    `Under the hood, ${s.toLowerCase()} connects people, events and documents into one graph: a patient links to visits, visits link to prescriptions, reports and bills.`,
    `Once relationships are structured, everything downstream â€” search, reminders, reports, follow-ups â€” becomes simple queries instead of human memory.`,
  ]},
  roundup: { t: s => `Comparing your options`, p: s => [
    `Shortlist three products maximum, run identical scenarios through each, and score support responsiveness during the trial â€” it predicts the next three years better than any feature grid.`,
    `Weigh ongoing costs honestly: training, per-seat fees, add-ons for messaging or reports. The cheapest sticker price rarely stays cheapest.`,
  ]},
}

const FAQ_BANK: Record<Cluster, [string, string][]> = {
  "Clinic Software": [
    ["How long does it take to move a clinic to software?", "Most clinics run scheduling within a week and complete records migration inside a month, moving one workflow at a time."],
    ["Will my staff need technical training?", "No formal training needed â€” modern platforms like My Clinics are designed so front-desk staff are productive the same afternoon."],
    ["Is my patient data safe with cloud software?", "Yes, when the vendor enforces encryption in transit and at rest, per-clinic data isolation, hashed passwords and audit logs â€” all standard in My Clinics."],
    ["Can I export my data later?", "You should be able to. My Clinics supports full export so your records always remain yours."],
  ],
  Appointments: [
    ["How do reminders reduce no-shows?", "They convert vague intentions into firm commitments at the moments patients decide â€” booking, the night before and the morning of."],
    ["Can walk-in patients still be managed?", "Yes. Walk-ins enter the same calendar alongside online bookings so the day's capacity is always accurate."],
    ["Can different doctors keep separate schedules?", "Each doctor gets an independent calendar with own slots, and staff see all of them side by side."],
    ["Do patients need an app to book online?", "No. With My Clinics patients book through a web page or WhatsApp â€” nothing to install."],
  ],
  Records: [
    ["How do we handle old paper files?", "Scan and attach them to the patient's digital record so history stays in one place going forward."],
    ["What stops duplicate patient records?", "Structured registration checks names and phone numbers at entry, flagging likely matches before a second file is created."],
    ["Who can access patient records?", "Only your clinic's authorised roles â€” and patients see only their own records in the portal."],
    ["Are digital records admissible and reliable?", "Timestamped, audit-logged entries are far easier to verify than handwritten pages, with every edit attributable."],
  ],
  Prescriptions: [
    ["Can patients lose digital prescriptions?", "They cannot â€” every prescription stays in the patient's portal history and can be re-shared anytime."],
    ["Do pharmacists accept printed digital prescriptions?", "Yes. Typed prescriptions with clear dosages are easier for pharmacies than handwriting."],
    ["Can doctors reuse previous prescriptions?", "Common medicines and regimens can be repeated and adjusted in seconds from visit history."],
    ["How are reports linked to prescriptions?", "Reports attach to the same visit, so the prescription, its evidence and the bill stay together."],
  ],
  Billing: [
    ["Can billing catch missed charges?", "Itemised invoices generated from the visit make omissions visible instead of silent."],
    ["How do we track pending payments?", "Every unpaid amount is tracked against its invoice with ageing, so follow-ups happen on time."],
    ["Can patients get digital receipts?", "Yes â€” patients receive professional digital bills they can retrieve from their portal anytime."],
    ["What reports do clinics get?", "Daily revenue, pending payments and monthly summaries of visits and services, generated automatically."],
  ],
  WhatsApp: [
    ["Is WhatsApp booking official and secure?", "Yes â€” My Clinics connects your verified clinic number and ties every chat action to the patient record."],
    ["Will patients get too many messages?", "Messaging is purposeful and opt-out friendly: confirmations, reminders and essential follow-ups only."],
    ["Can staff see WhatsApp conversations?", "Authorised staff view the thread beside the patient record, so context is never lost between shifts."],
    ["Does the assistant understand free-form messages?", "Yes. It interprets plain language requests and maps them to real availability on your calendar."],
  ],
  AI: [
    ["Will AI replace my receptionist?", "No â€” it absorbs repetitive volume so your team can focus on patients standing in front of them."],
    ["What happens when AI can't answer?", "It hands over gracefully to your staff with the conversation context attached."],
    ["Can AI book outside working hours?", "Yes, that is precisely its strength â€” capturing bookings at midnight that would otherwise be lost."],
    ["Is patient data shared with the AI?", "No. Within My Clinics, AI operates strictly inside your clinic's isolated tenant boundary."],
  ],
  Growth: [
    ["How soon does local SEO show results?", "Expect profile improvements within weeks; steady review growth compounds over months."],
    ["Do I need a big budget for clinic marketing?", "No. Accurate listings, prompt reviews and automated follow-ups cost time discipline, not ad spend."],
    ["Which channel brings most patients?", "Consistently: Google search for discovery, WhatsApp word-of-mouth for conversion."],
    ["Can software help retention?", "Automated follow-ups and effortless rebooking measurably raise return-visit rates."],
  ],
  Specialties: [
    ["Can software handle procedure-based appointments?", "Yes â€” slot lengths and pricing can differ per procedure type in My Clinics."],
    ["What about family or child records?", "Linked family accounts keep caregivers and children organised under related profiles."],
    ["Can templates match my specialty notes?", "Structured note templates reduce typing and keep documentation consistent across doctors."],
    ["Does billing support packages?", "Procedure packages, splits and itemised invoices are supported out of the box."],
  ],
  "Buying Guide": [
    ["What does clinic software typically cost?", "Plans range from free tiers to premium per-clinic pricing; judge total cost including add-ons, not headline price."],
    ["Should we choose free software?", "Free tiers suit tiny practices; verify export freedom and data isolation before committing either way."],
    ["How important is WhatsApp integration?", "For Indian clinics, decisive â€” it is where patients already are, and it drives reminders that pay for the software."],
    ["What is the very first feature to switch on?", "Appointments: fastest to adopt, immediate relief for the front desk, and the gateway to everything else."],
  ],
}

const GENERIC_FAQ: Faq = {
  q: "How do we get started with My Clinics?",
  a: "Create your clinic account, note your unique Clinic ID, add doctors and patients, and switch on online booking â€” most clinics are fully set up within days using the setup guide on our blog.",
}

export function resolveCatalogArticle(entry: CatalogEntry): ResolvedArticle {
  const seed = hash(entry.slug)
  const subject = subjectOf(entry.title)
  const intent = intentOf(entry.title)
  const clusterSections = CLUSTER_SECTIONS[entry.cluster].map((bp, i) => ({
    id: `core-${i + 1}`,
    title: bp.t(subject),
    body: bp.p(subject),
  }))
  const uni = UNIVERSAL[intent]
  const sections: ArticleSection[] = [
    {
      id: "overview",
      title: "Overview",
      body: [
        `${entry.excerpt}`,
        `This guide walks through ${subjectOf(entry.title).toLowerCase()} the way working clinics actually experience it â€” the daily frictions, the fixes that hold up, and where a platform like My Clinics removes the busywork entirely.`,
      ],
    },
    ...clusterSections,
    {
      id: "myclinics",
      title: "How My Clinics fits in",
      body: [
        `My Clinics puts ${pick([
          "appointments, patient records, prescriptions, billing and reports",
          "scheduling, records, prescriptions, invoicing and analytics",
          "bookings, timelines, e-prescriptions, payments and reports",
        ], seed)} into one multi-tenant workspace built for clinics. Every clinic gets a dedicated Clinic ID and strict data isolation â€” your records never mix with anyone else's.`,
        `WhatsApp booking, automated reminders and an AI assistant come built in, so the front desk spends its time on patients instead of paperwork.`,
      ],
    },
    { id: "playbook", title: uni.t(subject), body: uni.p(subject) },
  ]

  const bank = FAQ_BANK[entry.cluster]
  const faqStart = seed % bank.length
  const faqs: Faq[] = [0, 1, 2]
    .map((i) => bank[(faqStart + i) % bank.length])
    .map(([q, a]) => ({ q, a }))
  faqs.push(GENERIC_FAQ)

  const bodyChars =
    sections.reduce((n, s) => n + s.body.join("").length, 0) +
    faqs.reduce((n, f) => n + f.a.length, 0)
  const words = Math.round(bodyChars / 6)
  const readTime = `${Math.max(4, Math.min(11, Math.round(words / 200)))} Min Read`

  const idx = CATALOG.findIndex((c) => c.slug === entry.slug)

  return {
    slug: entry.slug,
    title: entry.title,
    category: entry.cluster,
    excerpt: entry.excerpt,
    author: pick(AUTHORS, seed),
    date: dateFor(idx < 0 ? 0 : idx),
    readTime,
    sections,
    faqs,
  }
}

export function relatedCatalogArticles(slug: string, limit = 4) {
  const entry = CATALOG.find((c) => c.slug === slug)
  if (!entry) return []
  return CATALOG.filter((c) => c.cluster === entry.cluster && c.slug !== slug)
    .slice(0, limit)
    .map((c) => ({ slug: c.slug, title: c.title }))
}
