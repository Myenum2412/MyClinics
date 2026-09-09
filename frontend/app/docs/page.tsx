import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "How to Create an Account — My Clinics Docs",
  description: "Step-by-step guide to creating your My Clinics account — sign up as a clinic or patient, verify your details, and get started in under a minute.",
};

const sections = [
  {
    id: "overview",
    title: "Overview",
    body: [
      "Think of your My Clinics account as your front desk — patients use it to book visits, clinics use it to run the day. Creating one takes less than a minute and you only do it once.",
      "Below is how to create your account in plain language, and how the system works behind the scenes to keep your bookings and records in one place.",
    ],
  },
  {
    id: "how-to-create",
    title: "How to create your account",
    body: [
      "1. Open My Clinics and click Create Account. Type your clinic name (if you run a clinic), your full name, email, and choose a password. You can also tap Continue with Google to sign up instantly.",
      "2. Click Sign Up. You will be signed in right away — no waiting for an email. If you added a phone number, we use it only to send appointment reminders and WhatsApp updates.",
      "3. For patients: you can also create an account the first time you book. Just enter your name, phone, and email while booking — we create your profile automatically.",
    ],
  },
  {
    id: "how-it-works",
    title: "How it works (in human language)",
    body: [
      "Once your account is created, My Clinics remembers who you are. When a patient books, we save the date, time, and doctor in one calendar so the clinic sees it instantly and the patient gets a confirmation.",
      "Your appointments, prescriptions, medical files, and bills are all linked to your account — like a folder with your name on it. When you sign in, you open that folder and everything is there. Clinics see only their own patients, patients see only their own records.",
      "If you forget your password, tap Forgot Password and we send a reset link to your email. Signing in with Google works the same way — we just ask Google to confirm it is you, so you do not need a new password.",
    ],
  },
  {
    id: "next-steps",
    title: "What to do next",
    body: [
      "Clinic owners: add your address, doctors, and working hours in the dashboard so patients can find you and book online or on WhatsApp.",
      "Patients: try booking a test appointment — pick a doctor, choose a time, and you will see the confirmation and a reminder before your visit.",
    ],
  },
];

export default function DocsPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto w-full max-w-4xl px-6 py-16">
          <Badge variant="secondary" className="mb-4">
            Docs
          </Badge>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-balance">
            How to create an account
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">Get started with My Clinics in under a minute.</p>

          <div className="mt-10 flex flex-col gap-10 md:flex-row md:gap-12">
            <aside className="hidden w-52 shrink-0 md:block">
              <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">On This Page</p>
              <nav className="flex flex-col border-l border-border">
                {sections.map((s) => (
                  <a key={s.id} href={`#${s.id}`} className="-ml-px border-l border-transparent py-1.5 pl-4 text-sm text-muted-foreground hover:text-foreground">
                    {s.title}
                  </a>
                ))}
              </nav>
            </aside>
            <div className="flex min-w-0 flex-1 flex-col gap-10">
              {sections.map((section) => (
                <section key={section.id} id={section.id} className="scroll-mt-20">
                  <h2 className="font-heading text-xl font-semibold tracking-tight">{section.title}</h2>
                  <div className="mt-3 flex flex-col gap-4 text-[15px]/relaxed text-foreground/80">
                    {section.body.map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
