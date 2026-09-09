import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quickstart — My Clinics Docs",
  description: "Get started with My Clinics — create your clinic or patient account in under a minute and start booking appointments.",
};

const toc = [
  { id: "overview", title: "Overview" },
  { id: "ways-to-start", title: "Ways to get started" },
  { id: "clinic-account", title: "Create a clinic account" },
  { id: "patient-account", title: "Create a patient account" },
  { id: "what-happens-next", title: "What happens next" },
];

export default function DocsPage() {
  return (
    <div className="flex">
      <aside className="hidden w-52 shrink-0 p-6 lg:block">
        <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground">On This Page</p>
        <nav className="mt-3 flex flex-col gap-2 border-l pl-4 text-sm">
          {toc.map((i) => (
            <a key={i.id} href={`#${i.id}`} className="text-muted-foreground hover:text-foreground">
              {i.title}
            </a>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1 px-6 py-10 lg:px-10">
          <p className="text-sm font-medium text-primary">Get started with My Clinics</p>
          <h1 className="mt-2 font-heading text-4xl font-bold tracking-tight">Quickstart</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            Create your account once, then book or manage appointments from one place. No paperwork, no
            waiting room calls — just pick a doctor, choose a time, and you are confirmed.
          </p>

          <section id="ways-to-start" className="mt-10 scroll-mt-20">
            <h2 className="text-lg font-semibold">Ways to get started</h2>
            <p className="mt-2 text-sm text-muted-foreground">Pick the path that fits you:</p>
            <div className="mt-4 overflow-hidden rounded-lg border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Approach</th>
                    <th className="px-4 py-3">Best for</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="px-4 py-3 font-medium">
                      <a href="#clinic-account" className="text-primary hover:underline">
                        Clinic account
                      </a>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">Doctors, admins running a practice</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">
                      <a href="#patient-account" className="text-primary hover:underline">
                        Patient account
                      </a>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">Anyone booking care for themselves or family</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Continue with Google</td>
                    <td className="px-4 py-3 text-muted-foreground">Fastest — one tap, no password to remember</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">
              <span className="font-semibold">Tip:</span> You can create a patient account while booking — just enter your name, phone, and email at checkout and we make the profile for you.
            </div>
          </section>

          <hr className="my-10" />

          <section id="clinic-account" className="scroll-mt-20">
            <h2 className="font-heading text-2xl font-semibold tracking-tight">Create a clinic account</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              This is for clinic owners and staff who want to manage appointments, patients, and billing.
            </p>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-[15px] leading-relaxed text-foreground/90">
              <li>
                Click <span className="font-medium">Create Account</span> on the homepage. Enter your clinic name, your name, email, and a password.
              </li>
              <li>
                Click <span className="font-medium">Sign Up</span>. You are signed in immediately — no email verification wait.
              </li>
              <li>
                Add your clinic details: address, doctors, departments, and working hours. This is how patients find you when they search.
              </li>
            </ol>
            <div className="mt-4 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
              <span className="font-semibold">How it works:</span> We create a private workspace for your clinic. Only your team can see your patients and appointments — like a locked cabinet with your clinic&apos;s name on it.
            </div>
          </section>

          <hr className="my-10" />

          <section id="patient-account" className="scroll-mt-20">
            <h2 className="font-heading text-2xl font-semibold tracking-tight">Create a patient account</h2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-[15px] leading-relaxed text-foreground/90">
              <li>Go to Book Appointment, pick a doctor, date, and time.</li>
              <li>At checkout, enter your name, phone, and email.</li>
              <li>Confirm — your profile is created and your appointment is saved to it automatically.</li>
            </ol>
            <div className="mt-4 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
              <span className="font-semibold">How it works:</span> Your appointments, prescriptions, lab reports, and bills are linked to your account. Sign in anytime to see them — everything stays together, even if you book on WhatsApp next time.
            </div>
          </section>

          <hr className="my-10" />

          <section id="what-happens-next" className="scroll-mt-20">
            <h2 className="font-heading text-2xl font-semibold tracking-tight">What happens next</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-foreground/90">
              <li>Sign in with your email and password, or tap Continue with Google.</li>
              <li>Forgot your password? Click Forgot Password and we send a reset link to your email.</li>
              <li>Clinics: start adding appointments — patients will get WhatsApp reminders automatically before their visit.</li>
            </ul>
          </section>
      </main>
    </div>
  );
}

