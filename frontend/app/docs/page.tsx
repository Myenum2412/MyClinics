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
      "Creating an account on My Clinics takes less than a minute. Whether you are a clinic owner setting up your practice or a patient booking care, the same simple flow gets you started.",
      "This guide walks through each step — from signing up to verifying your details — so you can start booking or managing appointments right away.",
    ],
  },
  {
    id: "clinic-signup",
    title: "Create a clinic account",
    body: [
      "Go to the homepage and click Create Account or Sign Up. Enter your clinic name, your name, email, and a password. Optionally add your clinic phone number.",
      "After submitting, you will be signed in automatically. Complete your clinic profile by adding address, doctors, and departments so patients can find and book you.",
    ],
  },
  {
    id: "patient-signup",
    title: "Create a patient account",
    body: [
      "Patients are created when you book for the first time or via the patient portal sign-up. Provide your name, phone number, and email to create your profile.",
      "Your appointments, prescriptions, and medical records will be linked to this account so you can access them anytime.",
    ],
  },
  {
    id: "verify",
    title: "Verify and sign in",
    body: [
      "Use your email and password to sign in on the Login page. You can also continue with Google for faster access.",
      "If you forget your password, use Forgot Password to reset it via email. Once signed in, you can book appointments, manage your clinic, or view your health records without signing in again.",
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
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
