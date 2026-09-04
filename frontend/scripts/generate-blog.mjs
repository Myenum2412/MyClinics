import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "content", "blog");

// ---------------------------------------------------------------- utils
const slugify = (t) =>
  t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const hash = (s) =>
  Math.abs([...s].reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 7));
const pick = (arr, seed) => arr[seed % arr.length];
function rotate(arr, start, n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(arr[(start + i) % arr.length]);
  return out;
}
const intentOf = (t) =>
  / vs /i.test(t) ? "versus"
  : /complete guide/i.test(t) ? "pillar"
  : /^\d+\s/i.test(t) ? "listicle"
  : /^what is/i.test(t) ? "explainer"
  : /^(best|top)\b/i.test(t) ? "roundup"
  : "guide";
const subjectOf = (t) =>
  t.replace(/^(how to|how|the complete guide to|what is|best|top)\s+/i, "")
    .replace(/\?$/, "").replace(/:.*$/, "").trim();
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const fill = (tpl, s) => tpl.replaceAll("{s}", s).replaceAll("{S}", cap(s));

// ---------------------------------------------------------------- titles
const TITLES = {
  "Clinic Software": [
    "Clinic Management Software: The Complete Guide for Doctors in 2026",
    "How to Choose the Best Clinic Management Software for Your Practice",
    "15 Features Every Modern Clinic Management Software Should Have",
    "How Digital Clinic Management Can Save Doctors Hours Every Week",
    "How to Run a Clinic Without Paper Records",
    "Clinic Management Software vs Manual Record Keeping: Which Is Better?",
    "How to Digitize Your Clinic From Appointments to Billing",
    "The Complete Guide to Managing a Small Clinic Digitally",
    "How Multi-Doctor Clinics Can Manage Everything From One Platform",
    "How Cloud-Based Clinic Software Is Changing Medical Practices",
  ],
  Appointments: [
    "How to Manage Doctor Appointments Without Confusion",
    "The Best Way to Organize Daily Clinic Appointments",
    "How Online Appointment Booking Can Increase Clinic Efficiency",
    "How to Reduce Patient Waiting Time With Better Appointment Scheduling",
    "How Automated Appointment Reminders Reduce Missed Appointments",
    "Walk-In vs Online Appointments: How Should Clinics Manage Both?",
    "How to Manage Multiple Doctors' Schedules in One Clinic",
    "How Patients Can Book Doctor Appointments Online",
    "How to Create a Simple Online Appointment System for Your Clinic",
    "The Complete Guide to Digital Appointment Management for Clinics",
  ],
  Records: [
    "How to Manage Patient Records Digitally",
    "Paper Patient Records vs Digital Patient Records: Which Is Better?",
    "How to Organize Thousands of Patient Records Without Paper Files",
    "How Digital Patient History Helps Doctors Make Better Decisions",
    "How to Find Any Patient Record in Seconds",
    "How Clinics Can Prevent Duplicate Patient Records",
    "How to Keep Patient Information Organized and Secure",
    "How to Create a Paperless Patient Record System",
    "How Digital Records Improve the Patient Experience",
    "The Complete Guide to Digital Patient Management for Clinics",
  ],
  Prescriptions: [
    "What Is Digital Prescription Software and How Does It Work?",
    "How Doctors Can Create and Manage Digital Prescriptions",
    "Digital Prescription vs Handwritten Prescription: What Changes?",
    "How to Store Patient Prescriptions Safely in the Cloud",
    "How Digital Medical Records Make Patient Follow-Ups Easier",
    "How Doctors Can Access Previous Patient Reports Instantly",
    "How to Organize Medical Reports in a Digital Clinic",
    "How to Manage Prescriptions, Reports and Patient History Together",
    "How Clinics Can Create a Complete Digital Medical Record",
    "The Complete Guide to Digital Prescriptions and Medical Records",
  ],
  Billing: [
    "How to Manage Clinic Billing Without Manual Work",
    "Best Clinic Billing Software Features Doctors Should Look For",
    "Manual Clinic Billing vs Digital Billing: Which Is Better?",
    "How to Track Every Clinic Payment Automatically",
    "How to Create Professional Digital Bills for Patients",
    "How to Track Pending Payments in Your Clinic",
    "How Digital Billing Helps Clinics Reduce Errors",
    "How to Track Daily Clinic Revenue and Expenses",
    "How to Generate Clinic Billing and Revenue Reports Easily",
    "The Complete Guide to Digital Billing for Medical Clinics",
  ],
  WhatsApp: [
    "How Clinics Can Use WhatsApp for Patient Appointments",
    "How to Automate Appointment Reminders on WhatsApp",
    "How WhatsApp Can Reduce Missed Clinic Appointments",
    "How to Send Patient Follow-Up Messages Automatically",
    "How Clinics Can Manage Patient Communication Through WhatsApp",
    "WhatsApp vs SMS Appointment Reminders: Which Works Better?",
    "How to Send Appointment Confirmations Through WhatsApp",
    "How to Automate Routine Patient Messages",
    "How WhatsApp Follow-Ups Can Improve Patient Retention",
    "The Complete Guide to WhatsApp Automation for Clinics",
  ],
  AI: [
    "How AI Can Help Doctors Manage Their Clinics",
    "How AI Appointment Assistants Can Work 24/7",
    "How AI Can Automate Patient Appointment Booking",
    "How AI Can Answer Common Patient Questions Automatically",
    "AI Receptionist vs Human Receptionist: What Should Clinics Choose?",
    "How AI Can Reduce Administrative Work in Clinics",
    "How AI Can Improve Patient Follow-Up and Communication",
    "How AI Can Help Clinics Handle More Patients Efficiently",
    "10 Practical Ways AI Can Improve Clinic Operations",
    "The Future of AI-Powered Clinic Management",
  ],
  "Organic Social": [
    "How Clinics Can Grow With Organic Social Media",
    "How to Plan a Month of Clinic Social Posts Without Paid Ads",
    "How Doctors Can Build Trust on Instagram Organically",
    "Organic Social vs Paid Ads for Clinics: Which Should You Choose?",
    "How to Turn Patient Questions Into Endless Social Content",
    "How Often Should Your Clinic Post on Social Media?",
    "Best Reel Ideas for Clinics That Need No Budget",
    "How to Handle Patient Comments on Social Media the Right Way",
    "How to Build a Content Calendar for Your Clinic's Social Media",
    "The Complete Guide to Organic Social Media for Clinics",
  ],
  Specialties: [
    "Best Clinic Management Software for Dental Clinics",
    "Best Clinic Management Software for Dermatology Clinics",
    "Best Clinic Management Software for Eye Clinics",
    "Best Clinic Management Software for Physiotherapy Clinics",
    "Best Clinic Management Software for Pediatric Clinics",
    "Best Clinic Management Software for Gynecology Clinics",
    "Best Clinic Management Software for Orthopedic Clinics",
    "Best Clinic Management Software for ENT Clinics",
    "Best Clinic Management Software for Multi-Specialty Clinics",
    "Best Clinic Management Software for Diagnostic Clinics",
  ],
  "Buying Guide": [
    "How Much Does Clinic Management Software Cost in India?",
    "Best Affordable Clinic Management Software for Small Clinics",
    "Free vs Paid Clinic Management Software: Which Should You Choose?",
    "What Is the Best Clinic Management Software for a New Doctor?",
    "Top Clinic Management Software Features to Compare Before Buying",
    "How to Compare Clinic Management Software Before You Buy",
    "Clinic Management Software Buying Guide for Doctors",
    "How to Digitize Your Clinic on a Small Budget",
    "The Complete Checklist for Setting Up a Digital Clinic",
    "The Complete Guide to Running a Modern Digital Clinic",
  ],
}

// ------------------------------------------------------- content banks
const INTRO = [
  `If you run or work in a clinic today, {s} is probably on your mind more often than you admit. Between back-to-back consultations, an overflowing front desk and patients who expect instant answers, the old ways of working simply do not keep up. This guide breaks the topic into practical, field-tested pieces so you can act on it this week, not someday.`,
  `Every clinic hits the same wall eventually: growth exposes every manual workaround at once. That is exactly why questions like "{S}?" have become so common among doctors. Rather than theory, this guide focuses on what actually changes day to day  the frictions you feel, the fixes that hold, and the order in which to adopt them.`,
  `There is no shortage of advice about {s}, yet most of it is written for hospital chains, not the two-doctor practice down the road. This article takes the opposite view. Everything below is framed around small and mid-sized clinics: limited staff, limited time, and a genuine need for systems that pay for themselves quickly.`,
]
const WHY = [
  `Three forces make this urgent right now. First, patient expectations have moved online  people book restaurants and taxis in seconds and increasingly expect clinics to behave the same way. Second, staff costs keep rising while good front-desk help gets harder to retain, so every saved manual minute compounds. Third, data privacy scrutiny is growing, and paper registers scattered around a clinic are the hardest thing to protect.`,
  `The economics are straightforward. A clinic that loses even four hours of doctor time a week to administrative drag loses hundreds of consultation slots a year. Multiply that by your average visit value and the cost of inefficiency usually dwarfs the cost of fixing it  often within the first quarter of going digital.`,
  `There is also a compounding effect worth naming. Clinics that digitise early accumulate structured history: visit trends, revenue patterns, recall lists. Within a year that history becomes a decision-making asset competitors without records simply cannot match.`,
]

const CORE = {
  "Clinic Software": [
    { t: "What modern clinic management software actually includes", p: [
      `When doctors hear "clinic management software" they sometimes imagine a complicated hospital ERP. In reality a modern system bundles a handful of everyday jobs: appointment scheduling, patient records, prescriptions, billing and basic reporting, all behind one login.`,
      `The test of a good product is not the feature list but the gaps it removes. After switching, nobody should ask "where is this patient's file?" or "did we bill that visit?"  those questions should answer themselves from the screen.`,
      `Cloud delivery matters more than any single feature. It means updates arrive quietly, staff can work from any machine in the clinic, and the owner can check the day's numbers from home without remote-desktop gymnastics.`,
      `Watch out for products built as generic business tools with medical words painted on. Real clinical software understands visits, follow-ups, prescriptions and lab reports as first-class objects  because your workflow does.`,
    ]},
    { t: "Choosing software your staff will actually use", p: [
      `Adoption is where implementations succeed or die. A powerful system nobody opens is worse than a simple one everybody does. Prioritise interfaces a receptionist can learn in an afternoon over dashboards that impress in a demo.`,
      `Involve the people who will live in the software daily. Let your front-desk lead sit through the trial, book fake appointments, and cancel them. Their friction points predict your future support tickets.`,
      `Prefer vendors who offer guided onboarding rather than a PDF manual. The first week sets habits; hand-holding during that window pays for itself in avoided rework.`,
    ]},
    { t: "Security and data isolation fundamentals", p: [
      `Patient trust is your licence to operate, and software choices either protect or spend it. Non-negotiables: encryption in transit and at rest, hashed passwords, role-based access, and audit logs for sensitive actions.`,
      `Multi-clinic platforms must guarantee isolation  your records living inside your own tenant boundary, never queryable by another clinic. Ask vendors directly how their architecture enforces this; vague answers are disqualifying.`,
      `Finally, insist on exit-friendliness: complete data export in standard formats. Vendors who make leaving hard are telling you something about how they treat customers.`,
    ]},
    { t: "The real cost picture", p: [
      `Sticker price is the smallest number in the equation. Add setup effort, training hours, per-user charges, add-on messaging fees and the productivity dip during switchover  that total is what you should compare.`,
      `Then subtract what you get back: fewer missed appointments, faster billing closure, recovered doctor hours, and the marketing value of online booking. Most clinics find the payback period is measured in weeks once reminders alone cut no-shows.`,
      `Free tiers deserve fair consideration for very small practices, but read the limits carefully  storage caps, record ceilings and export restrictions tend to arrive exactly when the clinic grows.`,
    ]},
    { t: "Making the switch without disrupting care", p: [
      `Sequence beats speed. Move scheduling first  it delivers immediate relief and trains staff gently. Bring active patient records next, then prescriptions, then billing. Each stage earns trust for the next.`,
      `Keep a paper fallback for exactly one week, then retire it deliberately. Open-ended parallel systems breed confusion; short, declared transition windows build discipline.`,
      `Review metrics at thirty days: bookings captured online, reminder response rates, time-to-bill. Visible wins convert sceptics better than any memo.`,
    ]},
  ],
  Appointments: [
    { t: "Why schedules descend into chaos", p: [
      `Confusion rarely comes from one bad booking. It accumulates from parallel sources of truth  a phone diary, someone's memory, sticky notes for callbacks and a walk-in pad  none of which agree after lunch.`,
      `Every extra place a slot can be recorded is another chance for a double-booking or a forgotten patient. The fix is structural, not motivational: one calendar, visible to everyone, updated in real time.`,
      `Doctor-wise calendars matter too. When three doctors share one undifferentiated list, even honest staff create collisions. Separate availability per doctor, merged into a single day view, ends most arguments instantly.`,
    ]},
    { t: "Online booking done right", p: [
      `Patients book when booking is effortless: see genuine availability, pick a slot, receive confirmation  under a minute, no phone call, no account creation marathon.`,
      `Availability shown must be truth. If the online calendar and the front desk disagree even occasionally, patients lose faith and revert to calling, which defeats the entire purpose.`,
      `Confirmation messages do double duty: they reassure the patient and create a commitment moment that measurably reduces later no-shows.`,
    ]},
    { t: "Reminders as a system, not a favour", p: [
      `Missed appointments are mostly memory failures, not disrespect. Automated reminders at booking, the evening before and the morning of recover slots that would otherwise evaporate silently.`,
      `Make every message actionable  reply to reschedule, tap to confirm  so a change of plans becomes a reschedule instead of an absence.`,
      `Track the numbers weekly. Reminder-driven recovery is one of the few clinic metrics that improves almost immediately and stays visible on the dashboard.`,
    ]},
    { t: "Handling walk-ins alongside bookings", p: [
      `Walk-ins are revenue, not interruptions  provided they enter the same calendar as everyone else. Reserve protected capacity each session so booked patients still move on time.`,
      `When the reserved pool runs dry, the desk sees it instantly and can quote honest wait times instead of optimistic guesses patients remember.`,
      `Over a month, walk-in versus online ratios tell you how to size those reserves. Data replaces guesswork, queues shorten, and both patient groups feel respected.`,
    ]},
    { t: "Measuring scheduling health", p: [
      `Four numbers describe scheduling health: utilisation, no-show rate, average wait time and reschedule rate. Review them monthly; each maps to a specific lever covered above.`,
      `Improvement compounds. A five-point drop in no-shows at twenty daily appointments returns roughly a clinic-day of capacity every month  without hiring anyone.`,
      `Publish the trend to your team. Front-desk staff take genuine pride in watching queue times fall once they can see the line moving.`,
    ]},
  ],
  Records: [
    { t: "Structured capture beats scanned paper", p: [
      `Digitising records is not photographing files. A photo of a paper chart inherits every limitation of paper except storage space. Structured entry  fields for demographics, allergies, blood group, diagnoses  is what makes records searchable and safe.`,
      `Structure enables guardrails: duplicate detection at registration, allergy warnings during prescribing, and clean filters for recall lists like "all diabetics due for review".`,
      `Start with active patients. Legacy files can be attached progressively; the clinic gains most of the benefit from the subset seen regularly.`,
    ]},
    { t: "Finding anything in seconds", p: [
      `Search design decides whether staff love or resent the system. Name search plus phone-number lookup covers ninety-five percent of real lookups; results should open a timeline, not a folder tree.`,
      `Timelines beat folders. A patient's story reads top-down  latest visit first, prescriptions, reports and bills attached to the visits that produced them.`,
      `Speed is clinical safety. When retrieval takes seconds, doctors actually consult history; when it takes minutes, they stop trying and decisions degrade.`,
    ]},
    { t: "Duplicates, merges and hygiene", p: [
      `Duplicate registrations creep in through nicknames, phone changes and hurried intake. Prevention starts at the keyboard: soft-match alerts during registration before creation is allowed.`,
      `Schedule a monthly hygiene review. Ten minutes scanning recent near-duplicates keeps the database cleaner than an annual purge ever will.`,
      `Merge tools matter as much as detection  when duplicates appear, staff need a safe, guided way to combine histories without losing either trail.`,
    ]},
    { t: "Privacy patients can feel", p: [
      `Patients rarely ask about encryption, but they notice discretion: screens angled away from the waiting area, records opened only for them, no files visible to the next patient.`,
      `Role-based access turns that discretion into policy. Reception sees contact and schedule; doctors see clinical detail; nothing crosses your clinic's boundary.`,
      `Audit logs close the loop  every view and edit attributable, which protects patients, staff and the clinic equally.`,
    ]},
    { t: "Records as clinical memory", p: [
      `The deepest value of digital records is longitudinal: patterns across months that no single visit reveals. Trends in blood pressure, recurring prescriptions, repeat investigations  visible at a glance.`,
      `Follow-ups become proactive. Recall views surface who is due, turning reactive care into scheduled continuity patients genuinely appreciate.`,
      `That memory also transfers: referrals, insurance claims and second opinions all improve when history is organised and exportable.`,
    ]},
  ],
  Prescriptions: [
    { t: "From handwriting to structure", p: [
      `Illegible handwriting is a punchline until it causes a pharmacy call-back  then it is a delay, an annoyed patient and a broken consultation flow. Typed, structured prescriptions end the problem at source.`,
      `Structure brings safety rails: dosage formats that cannot be ambiguous, allergy cross-checks against the record, and medicine names picked from lists rather than invented.`,
      `Each prescription binds to its visit, so context  indication, related report, previous regimen  travels with it forever.`,
    ]},
    { t: "Faster prescribing in the room", p: [
      `Speed matters between patients. Templates and favourites let common regimens repeat in two clicks; adjustments remain explicit and auditable.`,
      `Patients receive copies digitally in their portal, ending the "I lost the slip" loop that used to consume phone time at the desk.`,
      `Pharmacy hand-off improves immediately  legible, itemised, unambiguous  and pharmacists notice the difference within days.`,
    ]},
    { t: "History-aware follow-ups", p: [
      `Follow-up quality depends on remembered context. Digital prescriptions make the last regimen one glance away, so continuation or change is a decision, not a quiz.`,
      `Comparing prescriptions across visits reveals adherence stories: chronic medicines refilled late, antibiotics repeated suspiciously often, courses abandoned midway.`,
      `Reports attach beside the prescription they informed, closing the loop between evidence and treatment in one view.`,
    ]},
    { t: "Storage, safety and retention", p: [
      `Cloud storage shifts durability from filing cabinets and luck to encrypted, replicated infrastructure with backups nobody forgets to run.`,
      `Retention rules become configuration rather than physical storage anxiety  records persist for as long as regulation and sense demand, then expire cleanly.`,
      `Access remains governed: only authorised roles in your clinic can open a prescription, and every access lands in the audit trail.`,
    ]},
    { t: "Bringing the team along", p: [
      `Doctors vary in enthusiasm for new tools. Pair each senior doctor with a tech-comfortable colleague for the first week; peer support converts faster than training videos.`,
      `Standardise the essential fields  drug, dose, frequency, duration, instructions  and leave personal style intact everywhere else.`,
      `Review the first hundred digital prescriptions together. Small template tweaks there remove friction for the next ten thousand.`,
    ]},
  ],
  Billing: [
    { t: "Where manual billing leaks money", p: [
      `Handwritten bills leak in three places: charges never recorded, arithmetic slips, and payments tracked by memory. Each leak is individually small and collectively enormous.`,
      `Month-end reconciliation becomes detective work  matching registers to receipts to recollections. Digital billing replaces the investigation with a report.`,
      `Professional invoices also change patient perception. Clear itemisation pre-empts disputes and signals a clinic that has its act together.`,
    ]},
    { t: "Attach billing to the visit", p: [
      `The single best billing decision is making the invoice a by-product of the encounter. Consultation, procedures and consumables flow onto the draft automatically as care happens.`,
      `Nothing gets forgotten because nothing depends on recall. The desk reviews, adjusts if needed and collects  administration shrinks to minutes.`,
      `Payments post against the invoice instantly, keeping today's revenue visible today, not at month-end.`,
    ]},
    { t: "Pending payments without awkwardness", p: [
      `Dues age badly: the longer they sit untracked, the harder the conversation. Automated pending views list outstanding amounts with ageing, so follow-ups happen while goodwill is fresh.`,
      `Gentle systematic nudges  message templates the system sends  recover amounts without staff having to play debt collector personally.`,
      `Clear receipts close the loop emotionally as well as financially; patients pay faster when paperwork feels trustworthy.`,
    ]},
    { t: "Errors that disappear overnight", p: [
      `Calculation errors vanish because arithmetic is the computer's job. Item omissions shrink because items come from the visit. Duplication falls because invoices bind to encounters.`,
      `Price-list standardisation removes negotiation drift  every patient quoted consistently, discounts applied as deliberate, logged exceptions.`,
      `Fewer errors mean fewer refund conversations, fewer apologies and measurably calmer evenings at the desk.`,
    ]},
    { t: "Revenue clarity owners actually use", p: [
      `Daily summaries answer the owner's real questions: collections today, services mix, payment modes, pending dues  without opening a spreadsheet.`,
      `Monthly reports add trend lines: visit volumes, revenue per service, seasonal dips. Patterns justify staffing and inventory decisions with evidence.`,
      `Because reports generate themselves, reviewing them becomes a five-minute habit instead of a quarterly archaeology project.`,
    ]},
  ],
  WhatsApp: [
    { t: "Why WhatsApp wins for clinics", p: [
      `Patients do not download apps for clinics; they already carry the app they prefer. Meeting them on WhatsApp removes adoption friction entirely.`,
      `Conversation lowers formality barriers. People type requests the way they would speak them, and a well-built assistant understands plain language rather than menus.`,
      `Crucially, chat creates a written trail both sides can revisit  timings, address, confirmed slot  reducing the misunderstandings phone calls breed.`,
    ]},
    { t: "Booking inside the conversation", p: [
      `Effective flows ask minimally: service or doctor, preferred day, then offer real openings. Every option shown is genuinely available on the calendar  trust dies otherwise.`,
      `Confirmation closes the loop with date, time and location, and posts the booking straight onto the clinic's board tagged by channel.`,
      `Rescheduling through the same thread keeps changes painless and preserves the slot relationship instead of cancelling it into nothing.`,
    ]},
    { t: "Reminder cadence that respects patients", p: [
      `Three touchpoints work: confirmation at booking, reminder the evening before, and a short morning-of note. More than that tips from helpful to spammy.`,
      `Always include an easy opt-out and honour it instantly. Channel permission is an asset; burning it for marginal reminders costs far more than it earns.`,
      `Templates should sound like your clinic, warm and brief. Robotic blasts get muted; human notes get read.`,
    ]},
    { t: "Follow-ups that retain patients", p: [
      `Post-visit follow-ups convert one-time visitors into regulars: a check-in after a procedure, a report-ready notification, a recall when the next due date approaches.`,
      `Automate the trigger, personalise the wording. Patients respond remarkably well to messages that reference their actual visit rather than generic blasts.`,
      `Retention compounds quietly  a small monthly improvement in return-visit rate transforms annual volume without a rupee of advertising.`,
    ]},
    { t: "Governance: who replies, what is logged", p: [
      `Decide ownership early: which staff monitor the inbox, during which hours, and what escalation looks like when the assistant cannot resolve a request.`,
      `Log conversations against patient records so context survives shift changes  the next person sees the thread, not a mystery.`,
      `Respect boundaries strictly: no clinical diagnosis over chat, urgent symptoms steered to immediate human contact. Automation handles logistics; judgement stays human.`,
    ]},
  ],
  AI: [
    { t: "What AI is actually good at here", p: [
      `AI excels at high-volume pattern work: interpreting a request, matching it to availability, answering the forty questions every clinic hears weekly, sending the right nudge at the right hour.`,
      `It is tireless and consistent  midnight enquiries answered politely, tone identical on the thousandth message as the first.`,
      `Judgement stays human. AI narrows and prepares; your team decides, treats and comforts. Framed this way, expectations stay sane and results stay strong.`,
    ]},
    { t: "The booking assistant, concretely", p: [
      `A patient writes "need child specialist tomorrow morning". The assistant identifies intent, checks the paediatrician's real calendar, offers two open slots and books on reply.`,
      `Behind the scenes it respects rules humans would apply  buffer times, doctor-wise availability, reserved walk-in capacity.`,
      `Captured bookings that previously went to voicemail at 9 pm are pure found revenue, measurable within the first week.`,
    ]},
    { t: "Answering routine questions safely", p: [
      `Timings, location, documents to bring, report status  these consume surprising staff minutes yet follow fixed patterns perfect for automation.`,
      `Answers draw from clinic-configured facts, not imagination, so accuracy stays under your control. Unknown or sensitive queries hand off to humans gracefully with context attached.`,
      `Staff feel the difference first: fewer interruption loops, longer stretches of actual front-desk work completed.`,
    ]},
    { t: "Reducing administrative load", p: [
      `Beyond chat, AI assists quietly: summarising repetitive entries, drafting reminder copy, flagging likely duplicate registrations, surfacing unusual billing patterns for review.`,
      `Each assist is small; collectively they return hours weekly to a small team where hours are precious.`,
      `The discipline is measurement  track minutes saved per workflow, expand what works, retire gimmicks honestly.`,
    ]},
    { t: "Choosing your first AI use case", p: [
      `Start where volume is highest and risk lowest: appointment booking plus reminders. Both have clear success metrics and bounded failure modes.`,
      `Run a four-week pilot, compare deflected calls and no-show rates to baseline, then decide expansion with numbers instead of hype.`,
      `My Clinics packages exactly this loop  AI chat booking, automated reminders, staff oversight dashboard  so clinics adopt gradually without integration projects.`,
    ]},
  ],
  "Organic Social": [
    { t: "Organic beats paid when the basics exist", p: [
      "{S} succeeds without ad spend because organic social rewards what clinics already own: genuine expertise and real stories. Platforms push content that earns saves, shares and replies  not content that merely pays.",
      "The trade is patience for permanence. A reel answering a common patient question keeps collecting views months later; an ad stops the moment the budget does. That permanence is why organic compounds while paid resets monthly.",
      "It also ages well for local search. Patients type these exact questions into Google, and helpful posts answer before competitors appear anywhere.",
    ]},
    { t: "Pick two platforms, not five", p: [
      "Spreading thin kills organic reach before consistency ever gets a chance. Instagram plus one more channel  WhatsApp status or YouTube Shorts  covers how most patients actually discover local clinics.",
      "Choose by where your patients already are, not by trend cycles. A quiet, consistent presence on two platforms outperforms sporadic bursts across five every time.",
      "Write down who posts, when and what. Ownership turns social from a maybe into a system.",
    ]},
    { t: "Four content pillars end blank-page panic", p: [
      "Educate: myths, preparation steps, aftercare explained simply. Humanise: clinic life, team introductions, small behind-the-scenes moments. Prove: reviews reshared, milestones, before-and-after stories where consent allows. Convert: services, timings, booking links stated plainly.",
      "Rotate pillars on a weekly rhythm so followers know what to expect and the month plans itself.",
      "Batch creation helps too  one afternoon of filming feeds two weeks of posting without daily scramble.",
    ]},
    { t: "Patient questions are your content calendar", p: [
      "Every question asked twice at the desk deserves a post. Keep a running log at reception; each entry becomes a reel script, a carousel or a story poll with real demand behind it.",
      "These perform because they answer genuine intent  the same phrasing patients type into search bars late at night.",
      "Invite the team to log questions they hear; front-desk staff are your best content researchers.",
    ]},
    { t: "Engagement is half the work", p: [
      "Reply to comments and DMs within a day. Thoughtful responses signal both algorithms and humans that the account is alive, cared for and worth following.",
      "Fifteen minutes of daily engagement compounds into community faster than any posting volume ever will.",
      "Reshare patient reviews to stories and thank people publicly (with permission)  proof beats promises in healthcare.",
    ]},
  ],  Specialties: [
    { t: "Workflow rhythms unique to the specialty", p: [
      `Every specialty repeats certain shapes of day: procedure-heavy blocks, counselling-length consultations, rapid review visits. Software must bend to those rhythms, not flatten them.`,
      `Appointment types with different durations and prices should configure in minutes, letting the calendar mirror clinical reality.`,
      `Documentation templates per visit reason keep notes consistent across doctors while respecting individual style.`,
    ]},
    { t: "Features that matter most in this specialty", p: [
      `Look for structured notes tuned to typical cases, image and report attachment beside the visit, and recall logic matching the specialty's natural review cycles.`,
      `Billing flexibility earns its place fast  packages, split payments, procedure-plus-consumable line items appear in real invoices sooner or later.`,
      `Family linking matters wherever caregivers accompany children or elderly patients; shared profiles prevent retelling the same history every visit.`,
    ]},
    { t: "Evaluating vendors with your own cases", p: [
      `Run three representative scenarios end to end before deciding: a new patient consult, a repeat review, a procedure with follow-up. Score each product on clicks required.`,
      `Support responsiveness during the trial predicts the relationship better than any feature grid  time their first meaningful answer.`,
      `Confirm data isolation and export terms in writing; specialty data accumulated over years is strategic property.`,
    ]},
    { t: "Migration without losing specialty nuance", p: [
      `Import active patients first with their key clinical fields mapped to the new structure; archive the long tail for progressive migration.`,
      `Rebuild your price list and appointment types deliberately  an afternoon spent here prevents months of small irritations.`,
      `Pilot with one doctor for a week, gather the friction list, tune, then roll out clinic-wide.`,
    ]},
    { t: "Signs the fit is right", p: [
      `Within two weeks the front desk stops asking where things are. Notes finish faster than consultations. Bills raise no eyebrows.`,
      `Doctors reference past visits spontaneously because history is simply present on screen.`,
      `And the monthly report answers a question you had not thought to ask  that is software fitting a specialty properly.`,
    ]},
  ],
  "Buying Guide": [
    { t: "Build your requirements before viewing demos", p: [
      `Vendors demo their strengths; buyers should demo their own workflows. Write ten real scenarios  new registration, walk-in squeeze-in, follow-up with old reports, pending payment chase  and score every product against them.`,
      `Weight scenarios by frequency. A feature used daily deserves more than a feature admired annually.`,
      `Circulate the scorecard among staff who will use the system; their totals reveal the true winner quickly.`,
    ]},
    { t: "Total cost of ownership, honestly", p: [
      `Add license, per-user fees, messaging charges, setup and training time, and the productivity dip during switchover. Only then compare headline prices.`,
      `Ask what triggers upgrades: record counts, users, features? Surprise thresholds are how affordable software becomes expensive.`,
      `Include exit costs too  export effort and data portability determine whether switching later is a decision or a hostage situation.`,
    ]},
    { t: "Security questions that sort vendors fast", p: [
      `"How is our data isolated from other clinics?" "Show me the audit log." "What happens to our data if we cancel?" Strong vendors answer precisely; weak ones answer enthusiastically.`,
      `Encryption standards, backup cadence and breach history belong in writing, not verbal reassurance.`,
      `For Indian clinics, WhatsApp automation and local support hours deserve explicit verification  both are operationally decisive.`,
    ]},
    { t: "Trials that predict reality", p: [
      `Insist on a trial with your data shape: fifty realistic patients, a week of bookings, a billing cycle. Toy data hides every rough edge.`,
      `Measure onboarding time-to-value: how many days until the desk prefers the new system to the old way.`,
      `Note what breaks without prompting. Unscripted failures during trials are previews of support quality.`,
    ]},
    { t: "Negotiating and starting smart", p: [
      `Annual pricing usually beats monthly once you are confident  but only commit after a genuine trial, however persuasive the discount.`,
      `Get export format, response-time commitments and included training in writing alongside the contract.`,
      `Then onboard deliberately using a phased plan: scheduling first, records next, billing last  the sequence that has worked for thousands of clinics.`,
    ]},
  ],
}

const STEPS = {
  "Clinic Software": [
    ["Map your current workflow", "Write down how a patient moves through your clinic today, including every register, sticky note and verbal handoff. Honest mapping exposes the exact points software must cover."],
    ["Pick and trial the platform", "Choose a clinic-first product such as My Clinics and run real scenarios through a trial week  bookings, records, prescriptions and a bill end to end."],
    ["Move scheduling first", "Enter doctors, timings and slot lengths, then switch new bookings to the system while keeping a one-week paper fallback for confidence."],
    ["Migrate active records", "Import your regular patients with demographics, allergies and history; attach old paper progressively so momentum never stalls."],
    ["Switch on prescriptions and billing", "Standardise your medicine and price lists, then let invoices generate from visits so revenue tracks itself from day one."],
    ["Review and expand", "At thirty days, check bookings captured online, no-show trend and billing closure time, then enable the next module  reports, recalls, WhatsApp."],
  ],
  Appointments: [
    ["Consolidate to one calendar", "Retire the parallel diaries. Enter every doctor with separate availability so the day view reflects reality for all staff simultaneously."],
    ["Define slot rules", "Set durations per consultation type, reserve protected walk-in capacity, and add buffers where procedures routinely overrun."],
    ["Open online booking", "Publish a booking link that shows true availability and confirms instantly  no account marathons for patients."],
    ["Automate reminders", "Send confirmation at booking, a nudge the evening before and a morning-of note, each with an easy reschedule action."],
    ["Handle exceptions visibly", "Colour-code statuses  waiting, completed, cancelled  so anyone covering the desk reads the room in seconds."],
    ["Review weekly numbers", "Check utilisation, no-shows and wait times; adjust reserves and reminder timing based on what the month actually shows."],
  ],
  Records: [
    ["Define your minimum data set", "Fix the mandatory fields  demographics, phone, blood group, allergies  so every new record starts complete and searchable."],
    ["Register actively, archive passively", "Bring regular patients in fully; scan legacy folders in batches so history attaches over time without halting the clinic."],
    ["Search-proof your conventions", "Standardise name spellings and phone formats; consistency is what makes later lookups instant."],
    ["Enable duplicate guards", "Turn on soft-match alerts at registration and schedule a monthly near-duplicate review."],
    ["Set roles and audit", "Grant access by role, angle screens away from the waiting area, and confirm sensitive actions land in logs."],
    ["Institutionalise retrieval", "Train staff on timeline search  name plus phone finds everything  until seconds-to-record becomes muscle memory."],
  ],
  Prescriptions: [
    ["Standardise the medicine list", "Load commonly prescribed drugs with doses and frequencies so selection replaces typing and errors drop immediately."],
    ["Create favourites", "Save frequent regimens per doctor; two-click repeats keep speed while remaining explicit and auditable."],
    ["Bind to visits", "Issue every prescription from within the consultation so indication and context travel with it permanently."],
    ["Deliver digitally", "Push copies to the patient portal, ending lost-slip phone calls and giving pharmacies unambiguous printouts."],
    ["Review early output", "Sit with the first hundred digital prescriptions, refine templates once, and let the smoother flow compound."],
  ],
  Billing: [
    ["Freeze the price list", "Document consultation fees, procedures and consumables once so every invoice quotes consistently."],
    ["Generate from visits", "Configure invoices to assemble automatically as care happens  nothing charged from memory again."],
    ["Collect and reconcile same-day", "Post payments against invoices instantly so daily revenue is visible before locking up."],
    ["Track dues systematically", "Enable pending-payment ageing and gentle automated follow-ups rather than memory-based chasing."],
    ["Read the monthly report", "Review revenue by service and visit trends monthly; use evidence, not instinct, for staffing decisions."],
  ],
  WhatsApp: [
    ["Connect your verified number", "Link the clinic's WhatsApp through My Clinics so every conversation ties to real patient records."],
    ["Design the booking flow", "Keep it minimal  request, doctor preference, real slot options, confirmation  mirroring your best front-desk manner."],
    ["Set reminder cadence", "Choose confirmation, eve-before and morning-of touches with clear opt-out handling respected instantly."],
    ["Draft human-sounding templates", "Short, warm, specific messages get read; robotic blasts get muted."],
    ["Assign inbox ownership", "Name who monitors chats and when, with graceful handoff to staff whenever the assistant cannot resolve a request."],
  ],
  AI: [
    ["Pick the narrow first case", "Start with appointment booking plus reminders  high volume, low risk, clearly measurable."],
    ["Feed it accurate availability", "An assistant is only as good as the calendar beneath it; tidy slot rules before switching it on."],
    ["Define handoff rules", "Specify exactly when the AI passes a conversation to staff, always carrying context along."],
    ["Baseline before launch", "Record current call volume and no-show rate so the pilot's effect is provable, not anecdotal."],
    ["Expand on evidence", "After four weeks, extend to FAQs or follow-ups only where the numbers justify it."],
  ],
  "Organic Social": [
    ["Audit your profiles today", "Fix bios, hours, links and booking CTAs on every platform you own; organic reach starts with a complete, trustworthy profile."],
    ["Choose two platforms", "Instagram plus WhatsApp status or YouTube Shorts  go where your patients already are and commit there fully."],
    ["Define four content pillars", "Educate, humanise, prove, convert  rotating these removes blank-page panic and gives followers a rhythm to expect."],
    ["Batch-create monthly", "One afternoon of filming and writing feeds two weeks of posts; consistency beats daily improvisation."],
    ["Engage fifteen minutes daily", "Reply to comments and DMs thoughtfully; responsiveness signals life to algorithms and patients alike."],
    ["Review monthly numbers", "Track saves, shares, profile visits and booking-link clicks; double down next month on what moved."],
  ],


  Specialties: [
    ["Model your visit types", "List consultation, procedure and review categories with realistic durations and prices for the calendar."],
    ["Template the documentation", "Create note structures per visit reason so consistency survives busy days and multiple doctors."],
    ["Wire recalls to the specialty", "Set review cycles  prophylaxis, refills, post-op  so due patients surface automatically."],
    ["Test with signature scenarios", "Run a typical new case, a review and a procedure end to end before committing the whole clinic."],
    ["Tune after the pilot", "One doctor, one week, then adjust templates and slots from observed friction before full rollout."],
  ],
  "Buying Guide": [
    ["Write the scenario scorecard", "Ten real workflows weighted by frequency  your yardstick for every demo you attend."],
    ["Demand a realistic trial", "Your patient shape, your booking week, your billing cycle; toy data conceals everything important."],
    ["Interrogate security in writing", "Isolation model, encryption, audit logs, export terms  precise answers or walk away."],
    ["Compute total cost", "License, users, messaging add-ons, training hours and switchover tax, compared against expected no-show savings."],
    ["Phase the rollout", "Contract with a plan: scheduling week one, records week two, billing week three, review at thirty days."],
  ],
}

const MISTAKES = {
  "Clinic Software": [
    "Boiling the ocean  migrating everything at once overwhelms staff; sequence scheduling, records, prescriptions, billing.",
    "Buying on demo polish instead of trial reality  choreographed demos hide the rough edges your week will find.",
    "Skipping staff involvement  the people who click all day hold the adoption keys; involve them from trialling onward.",
    "Ignoring export terms  data lock-in turns a tool into a trap; secure exit rights before signing.",
    "Underestimating the price list task  one focused afternoon standardising services prevents months of billing irritation.",
  ],
  Appointments: [
    "Keeping parallel diaries  every extra slot record breeds collisions; one shared calendar or chaos.",
    "Showing fake availability online  patients forgive technology less than lies; display only real slots.",
    "Treating reminders as optional courtesy  automated reminders are the cheapest no-show reduction available.",
    "No protected walk-in capacity  unplanned arrivals then wreck booked patients' punctuality daily.",
    "Never reading scheduling metrics  utilisation and no-show trends point straight at the next fix.",
  ],
  Records: [
    "Scanning instead of structuring  photographed charts stay unsearchable; capture fields, not images.",
    "Allowing free-text phone numbers  format inconsistency quietly kills retrieval speed.",
    "Registering without duplicate checks  near-matches multiply until merging becomes archaeology.",
    "Sharing one login across staff  accountability vanishes and audit logs become meaningless.",
    "Deferring old-file migration forever  schedule batches, or the paper shadow grows indefinitely.",
  ],
  Prescriptions: [
    "Recreating paper habits on screen  typed freeform paragraphs repeat illegibility digitally; use structured picks.",
    "Skipping allergy cross-checks  the record knows; let it warn before dispensing errors happen.",
    "Issuing outside the visit context  orphan prescriptions lose indication, reports and billing linkage.",
    "Forgetting patient delivery  portal copies eliminate the lost-slip loop; enable them by default.",
    "No template maintenance  refine favourites after the first hundred scripts or speed gains stall.",
  ],
  Billing: [
    "Charging from memory  unrecorded charges are silent losses; generate invoices from the visit.",
    "Leaving dues unaged  stale pendings become charity; track ageing and nudge early.",
    "Ad-hoc pricing per patient  inconsistency invites disputes; freeze the list, log exceptions.",
    "Monthly-only reconciliation  same-day posting keeps errors discoverable while details are fresh.",
    "Ignoring mode-of-service reports  revenue patterns guide staffing; unread reports guide nothing.",
  ],
  WhatsApp: [
    "Using an unverified number  trust collapses with the first 'who is this?' reply; connect officially.",
    "Blasting promotional noise  utility messages get read, marketing blasts get muted.",
    "No opt-out path  permission is an asset; honour exits instantly or lose the channel.",
    "Diagnosing over chat  logistics yes, clinical judgement no; steer urgency to humans.",
    "Losing threads between shifts  log conversations to records or context dies at 6 pm.",
  ],
  AI: [
    "Expecting judgement from automation  AI schedules and informs; treatment decisions stay human, always.",
    "Launching without baselines  no before-numbers means no proof, only opinions afterwards.",
    "Hiding the handoff  patients resent dead ends; make escalation to staff obvious and instant.",
    "Feeding sloppy calendars  assistants amplify whatever availability truth they inherit.",
    "Chasing novelty use-cases  booking and reminders first; gimmicks later, if ever.",
  ],
  "Organic Social": [
    "Buying followers or engagement  audiences and algorithms both notice; credibility never recovers cheaply.",
    "Posting promotions only  feeds reward value; educate and humanise before you sell.",
    "Ignoring comments and DMs  unanswered messages tell patients the clinic does not listen.",
    "Chasing every platform  two done consistently beat five done occasionally.",
    "Deleting negative comments  address calmly instead; visible professionalism wins the watchers.",
  ],


  Specialties: [
    "Forcing generic durations  procedure blocks need their own slot lengths or the day unravels.",
    "Generic note templates  specialty-specific structure saves minutes per visit, hundreds monthly.",
    "Ignoring recall cycles  reviews and refills define specialty revenue; automate them.",
    "Copying another clinic's setup blindly  workflows differ; tune to your observed rhythm.",
    "Skipping the pilot doctor  clinic-wide launches without tuning import every mistake at scale.",
  ],
  "Buying Guide": [
    "Attending demos without a scorecard  vendors steer unprepared buyers toward their strengths.",
    "Comparing sticker prices only  add-ons, user tiers and messaging fees hide in plain sight.",
    "Accepting verbal security claims  isolation, encryption and export belong in writing.",
    "Trial-free annual commits  discounts tempt; a genuine trial protects years ahead.",
    "Big-bang go-lives  phased adoption catches issues while they are cheap to fix.",
  ],
}

const CHECKLIST = {
  "Clinic Software": ["Scenario scorecard written","Trial with real data completed","Staff leads involved","Export terms verified","Security answers in writing","Rollout phases planned","Fallback week defined","30-day metric review scheduled"],
  Appointments: ["Single shared calendar live","Per-doctor slots configured","Walk-in reserve set","Online booking published","Reminder cadence enabled","Status colours in use","Weekly metrics reviewed","Reschedule flow tested"],
  Records: ["Minimum data set defined","Active patients imported","Legacy scan batches scheduled","Duplicate alerts on","Roles assigned","Audit logging verified","Timeline search trained","Monthly hygiene review set"],
  Prescriptions: ["Medicine list loaded","Dosage formats standardised","Allergy checks enabled","Visit-bound issuing enforced","Portal delivery on","Pharmacy printout tested","Favourites saved","First-hundred review done"],
  Billing: ["Price list frozen","Invoice-from-visit enabled","Same-day posting habit","Pending ageing view on","Automated dues nudges","Digital receipts live","Monthly report reviewed","Discount logging agreed"],
  WhatsApp: ["Verified number connected","Booking flow drafted","Reminder cadence set","Templates reviewed for tone","Opt-out honoured","Inbox owner named","Escalation rule defined","Threads logged to records"],
  AI: ["Use case narrowed","Calendar truth ensured","Baselines recorded","Handoff rules written","Trial window fixed","Deflection measured","No-show delta checked","Expansion decided on evidence"],
  "Organic Social": ["Bio complete with booking link","Two platforms chosen","Four pillars defined","Month batched ahead","Stories three times weekly","Reel weekly","Comments replied within 24h","Reviews reshared","Analytics reviewed monthly","Patient-question log kept"],
  Specialties: ["Visit types modelled","Durations priced realistically","Note templates built","Recall cycles configured","Signature scenarios tested","Pilot doctor chosen","Friction list collected","Full rollout tuned"],
  "Buying Guide": ["Scorecard circulated","Realistic trial secured","TCO computed","Security in writing","Export rights confirmed","Training included","Phased contract agreed","30-day review booked"],
}

const FAQ = {
  "Clinic Software": [["How long does implementation really take?","Most clinics run scheduling within a week and finish records migration inside a month, moving one workflow at a time rather than all at once."],["Do doctors need typing skills?","If they can send a text message they can prescribe digitally  structured picks replace composition, and favourites repeat common regimens in two clicks."],["What happens if the internet goes down?","Modern cloud systems tolerate brief outages gracefully; bookings taken on phone sync back the moment connectivity returns."],["Can we start with just appointments?","Yes  and it is the recommended path. Scheduling delivers immediate relief and funds credibility for the stages that follow."],["Who owns the data we enter?","You do. My Clinics supports full export so records remain yours throughout and after the relationship."]],
  Appointments: [["Will elderly patients manage online booking?","They book through a simple web page or a WhatsApp message  no installation  while the desk retains full control for anyone preferring to call."],["Can two staff edit the calendar together?","Yes, simultaneously. Everyone sees the same truth in real time, which is precisely the point of consolidation."],["How much do reminders reduce no-shows?","Clinics typically report a third to a half of previous misses recovered once confirmation, eve-before and morning-of touches run automatically."],["What about patients who book and never confirm?","Unconfirmed bookings surface on the dashboard so the desk can call strategically instead of dialling everyone blindly."],["Can patients choose their doctor?","Yes, doctor-wise availability is exposed during booking, with staff able to override when clinically appropriate."]],
  Records: [["How do we handle name spelling variations?","Phone number is the anchor identifier; registration soft-matches on it and flags likely duplicates before creation."],["Are records accessible from home?","Authorised roles can reach the workspace securely from anywhere, useful for teleconsultation and emergency reference."],["What size clinics is this suitable for?","From single-doctor practices to multi-doctor clinics  structure matters more than scale."],["Can we attach photographs of old charts?","Yes, attach legacy scans to patient timelines so history stays complete while new entries are structured."],["How is deletion handled?","Corrections supersede rather than silently erase  audit trails preserve accountability throughout."]],
  Prescriptions: [["Can pharmacists read the printouts?","Legible, itemised printouts are welcomed by pharmacies  clearer than handwriting by definition."],["What about controlled medicines?","Standard prescribing applies with full audit trails, which strengthens rather than weakens compliance."],["Can patients share prescriptions with other doctors?","Yes, portal copies are shareable, improving continuity when specialists get involved."],["Do prescriptions sync with billing?","Items flow onto invoices where configured, so medication charges never rely on memory."],["How long are prescriptions stored?","Indefinitely by default, encrypted and retrievable in seconds  retention rules remain configurable."]],
  Billing: [["Can we offer partial payments?","Yes, splits post against the invoice with balance and ageing tracked automatically."],["What do patients receive?","Professional digital receipts itemised by service, retrievable from their portal anytime."],["Does it support different payment modes?","Cash and digital modes record distinctly, feeding the daily collection summary automatically."],["How are discounts handled?","Applied as deliberate, logged adjustments against standard prices  consistency with accountability."],["Can we see yesterday's collections?","Any day's summary is one view away; daily totals post in real time as payments record."]],
  WhatsApp: [["Does this use my personal number?","No, the clinic connects its official business number through verified setup inside My Clinics."],["What if two patients message simultaneously?","The assistant handles concurrency naturally  queues exist for humans, not software."],["Can staff take over a chat mid-conversation?","Yes, authorised staff join with full context, and the assistant steps aside gracefully."],["Are message templates customisable?","Fully  wording, timing and language match your clinic's voice rather than vendor defaults."],["What happens to chat history?","Conversations log against patient records, preserving context across staff and shifts."]],
  AI: [["Which languages does the assistant understand?","It handles everyday mixed-language patient phrasing, including Hinglish patterns common in Indian clinics."],["Can it handle rude or confused messages?","Gracefully  unclear intent triggers clarifying questions or a polite handoff to staff with context."],["Does AI increase our costs significantly?","Within My Clinics the booking-and-reminder loop is bundled, so pilots cost attention, not add-on fees."],["How do we stop it saying something wrong?","Answers draw only from clinic-configured facts; unknown territory escalates rather than improvises."],["Can we turn it off temporarily?","Instantly  toggles exist per feature, and human channels resume unaffected."]],
  "Organic Social": [["Which platform is best for clinics?","Instagram for reach and trust, WhatsApp status for existing patients  start there before adding anything else."],["How often should a clinic post?","Three to four quality posts weekly beats daily filler; consistency trains algorithms and audiences alike."],["What if we cannot show patient faces?","Educational reels, myth-busters and team introductions work without exposing any patient."],["Does organic social really bring patients?","Yes over months  familiarity plus easy booking paths convert local attention into visits."],["Are hashtags still useful?","Locally relevant ones help modestly; saves and shares matter far more now."]],
  Specialties: [["Can slot lengths differ per procedure?","Yes, appointment types carry their own duration and pricing across the calendar."],["How are procedure packages billed?","Composite items build from components, invoiced as packages while reporting stays granular."],["Can reports attach to specific visits?","Every upload binds to its encounter, keeping evidence beside the decision it supported."],["Do templates constrain doctors?","They structure defaults without restricting additions  consistency plus personal style coexist."],["What about multi-doctor specialty clinics?","Doctor-wise calendars, shared patients and role-based views are designed in from the start."]],
  "Buying Guide": [["Is free software viable for clinics?","For very small practices, sometimes  verify export freedom and isolation before committing either way."],["Annual or monthly billing?","Monthly until proven, annual once convinced; negotiate training inclusion rather than deeper discounts."],["What one feature predicts satisfaction?","Reminder automation  its effects show in weeks and touch revenue directly."],["How many vendors should we trial?","Three maximum with identical scenarios; more options create analysis paralysis, not insight."],["When should we sign the contract?","After a realistic trial, written security answers and an export clause  in that order."]],
}

const MYCLINICS = [
  [`My Clinics was built around exactly these problems. One multi-tenant workspace carries appointments, records, prescriptions, billing and reports, with every clinic isolated behind its own Clinic ID  your data never mixes with anyone else's.`,
   `WhatsApp booking, automated reminders and an AI assistant ship built-in, so the front desk spends its day with patients instead of paperwork. Most clinics complete setup in days using the step-by-step account guide on this blog.`],
  [`This is where a purpose-built platform pays off. My Clinics bundles scheduling, structured records, e-prescriptions, invoicing and analytics into one workspace designed for clinics rather than adapted from generic business tools.`,
   `Strict tenant isolation keeps your data yours; encryption and audit logs keep it safe; and the built-in WhatsApp plus AI booking loop converts the workflows above into daily habit without extra subscriptions.`],
]
const CONCLUSION = [
  `{S} rewards clinics that treat it as a sequence of small, deliberate upgrades rather than a single dramatic overhaul. Pick the first step above, schedule it, and let the results argue for the next one. When you are ready, My Clinics can have your clinic booking online within days  the setup walkthrough lives right here on the blog.`,
  `The gap between clinics that struggle and clinics that flow is rarely effort  it is systems. Every section above converts directly into a working habit inside My Clinics, from the calendar your desk learns in an afternoon to the reports your future self will thank you for. Start with one step this week.`,
  `Change sticks when it is boring, incremental and visibly rewarded. That is the philosophy behind everything above, and behind how My Clinics itself works: sensible defaults, strict data isolation, and automation for the repetitive middle of clinic life so your team can focus on the human parts. Your move  step one is closer than it looks.`,
]

const AUTHORS = [
  { name: "Lena Park", initials: "LP", img: 47 },
  { name: "Riya Menon", initials: "RM", img: 26 },
  { name: "Marcus Webb", initials: "MW", img: 12 },
  { name: "Sofia Andrade", initials: "SA", img: 45 },
  { name: "Devon Ross", initials: "DR", img: 13 },
  { name: "Priya Nair", initials: "PN", img: 44 },
]
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
const dateFor = (i) => {
  const d = new Date(2026, 0, 12 + i * 2)
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}
function excerptFor(cluster, title) {
  const s = subjectOf(title)
  const f = {
    "Clinic Software": `A practical, doctor-friendly guide to ${s}  what it involves, common pitfalls, and how clinics run it effortlessly on My Clinics.`,
    Appointments: `Cut confusion at the front desk: ${s}, explained step by step, with scheduling habits and My Clinics features that keep waiting rooms calm.`,
    Records: `Patient files without paper chases  ${s}, plus the record structure successful clinics run on My Clinics.`,
    Prescriptions: `Cleaner prescriptions and faster follow-ups: understand ${s} with the digital workflow My Clinics provides out of the box.`,
    Billing: `Fewer errors, faster payments  ${s}, and how clinics automate it end to end with My Clinics billing.`,
    WhatsApp: `Meet patients where they already are: ${s}, powered by the WhatsApp assistant built into My Clinics.`,
    AI: `Practical, non-hyped guidance on ${s}, including where the AI assistant in My Clinics fits best.`,
    "Organic Social": `Grow without an ad budget  ${s}, the organic-social playbook clinics run on My Clinics' digital foundations.`,
    Specialties: `Feature checklists and real workflows for ${s.toLowerCase()} evaluated through running your practice on My Clinics.`,
    "Buying Guide": `Budgets, features and contracts: a confident framework for ${s.toLowerCase()}, and where My Clinics stands.`,
  }[cluster]
  return f.replace(/\s+/g, " ")
}

// ------------------------------------------------------------ compose
function buildArticle(title, cluster, index) {
  const seed = hash(slugify(title))
  const intent = intentOf(title)
  const s = subjectOf(title)

  const cores = CORE[cluster].map((sec, i) => {
    const paras = rotate(sec.p, seed + i, 3).map((t) => fill(t, s))
    return `## ${fill(sec.t, s)}\n\n${paras.join("\n\n")}`
  })

  const steps = rotate(STEPS[cluster], seed, 6)
    .map(([t, d], i) => `**Step ${i + 1}. ${t}.** ${d}`)
    .join("\n\n")

  const mistakes = rotate(MISTAKES[cluster], seed, 5)
    .map((m) => `- ${m}`)
    .join("\n")

  const checklist = rotate(CHECKLIST[cluster], seed, 8)
    .map((c) => `- [ ] ${c}`)
    .join("\n")

  const faqPairs = [...rotate(FAQ[cluster], seed, 5)]
    .map(([q, a]) => `Q: ${q}\nA: ${a}`)
    .join("\n\n")
  const faqsSection = `## Frequently asked questions\n\n${faqPairs}`

  const author = pick(AUTHORS, seed)
  const excerpt = excerptFor(cluster, title)
  const md = [
    `---`,
    `Title: ${title}`,
    `Category: ${cluster}`,
    `Excerpt: ${excerpt}`,
    `AuthorName: ${author.name}`,
    `AuthorInitials: ${author.initials}`,
    `AuthorImg: ${author.img}`,
    `Date: ${dateFor(index)}`,
    `ReadTime: 9 Min Read`,
    `---`,
    ``,
    `# ${title}`,
    ``,
    `## Overview`,
    ``,
    fill(pick(INTRO, seed), s),
    ``,
    `**TL;DR**`,
    ``,
    rotate(CHECKLIST[cluster], seed, 6).map((c) => `- ${c}`).join("\n"),
    ``,
    `## Why this matters in 2026`,
    ``,
    fill(pick(WHY, seed), s),
    ``,
    cores.join("\n\n"),
    ``,
    `## Step-by-step playbook`,
    ``,
    steps,
    ``,
    `## Common mistakes to avoid`,
    ``,
    mistakes,
    ``,
    `## Quick checklist`,
    ``,
    checklist,
    ``,
    `## How My Clinics helps`,
    ``,
    pick(MYCLINICS, seed).join("\n\n"),
    ``,
    faqsSection,
    ``,
    `## Final takeaway`,
    ``,
    fill(pick(CONCLUSION, seed), s),
    ``,
  ].join("\n")

  return { md, meta: { title, slug: slugify(title), cluster, excerpt, author, date: dateFor(index), readTime: "9 Min Read", cover: `/blog/cover/${slugify(title)}`, keywords: [cluster, ...cluster.split(" "), ...s.split(" ").slice(0, 4)].map((k)=>k.toLowerCase()) } }
}

// ------------------------------------------------------------ main
let totalChars = 0, min = Infinity, max = 0, count = 0
const manifest = []
fs.rmSync(OUT, { recursive: true, force: true })
for (const [cluster, titles] of Object.entries(TITLES)) {
  for (const title of titles) {
    const { md, meta } = buildArticle(title, cluster, count)
    const dir = path.join(OUT, meta.slug)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, "article.md"), md, "utf8")
    fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify(meta, null, 2), "utf8")
    manifest.push(meta)
    const chars = md.length
    totalChars += chars; min = Math.min(min, chars); max = Math.max(max, chars); count++
  }
}
fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify(manifest, null, 2), "utf8")
console.log(`Generated ${count} articles`)
console.log(`Total chars: ${totalChars.toLocaleString("en-IN")}`)
console.log(`Min: ${min.toLocaleString("en-IN")}  Max: ${max.toLocaleString("en-IN")}  Avg: ${Math.round(totalChars / count).toLocaleString("en-IN")}`)
