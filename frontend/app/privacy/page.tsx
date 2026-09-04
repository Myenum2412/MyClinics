import Image from "next/image";
import Link from "next/link";
import { CloudShader } from "@/components/ui/cloud-shader";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for My Clinics — how we collect, use and protect your personal and health information.",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <div className="flex flex-col gap-2 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 overflow-hidden p-6 md:p-10">
      <CloudShader
        className="absolute inset-0"
        skyTopColor="#312E81"
        skyBottomColor="#A5B4FC"
        cloudColor="#E0E7FF"
      />
      <div className="relative z-10 w-full max-w-3xl rounded-2xl border border-white/40 bg-white/85 p-6 shadow-2xl shadow-[#312E81]/30 backdrop-blur-xl sm:p-10">
        <div className="flex items-start gap-4 border-b border-border pb-5">
          <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary/5">
            <Image
              src="/logo.png"
              alt="My Clinics logo"
              width={500}
              height={500}
              className="size-full object-contain"
            />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight text-black">
              Privacy Policy
            </h1>
            <p className="text-sm text-muted-foreground">
              Last updated: 16 August 2026
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-8 py-6">
          <Section title="1. Introduction">
            <p>
              This Privacy Policy explains how My Clinics (the &quot;Service&quot;)
              collects, uses and protects personal and health information when
              you use the platform — including the patient portal, the
              doctor/staff portal, the website and the WhatsApp assistant. By
              using the Service, you agree to the practices described here,
              alongside our{" "}
              <Link
                href="/terms"
                className="font-medium text-primary underline underline-offset-4 hover:text-primary"
              >
                Terms of Service
              </Link>
              .
            </p>
          </Section>

          <Section title="2. Information We Collect">
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <span className="font-medium text-foreground">
                  Account information:
                </span>{" "}
                name, email address and password (stored encrypted) needed to
                create and secure your account. If you sign in with Google, we
                use the minimal profile information (name and email) needed for
                sign-in.
              </li>
              <li>
                <span className="font-medium text-foreground">
                  Patient records:
                </span>{" "}
                contact details, phone number, date of birth, age, gender,
                blood group, medical history, allergies, medications and other
                details you provide for your care.
              </li>
              <li>
                <span className="font-medium text-foreground">
                  Clinical data:
                </span>{" "}
                appointments, prescriptions, medicines, bills and uploaded
                reports generated during your care.
              </li>
              <li>
                <span className="font-medium text-foreground">
                  WhatsApp data:
                </span>{" "}
                your phone number and the content of messages you send to the
                clinic&apos;s WhatsApp assistant, used to book appointments and
                send confirmations and reminders.
              </li>
              <li>
                <span className="font-medium text-foreground">
                  AI chat conversations:
                </span>{" "}
                the messages you exchange with the AI chat assistant, used to
                understand your request (for example, finding a doctor or
                booking an appointment).
              </li>
              <li>
                <span className="font-medium text-foreground">
                  Uploaded files:
                </span>{" "}
                medical reports and documents you upload, stored so your clinic
                can review them as part of your care.
              </li>
              <li>
                <span className="font-medium text-foreground">
                  Usage information:
                </span>{" "}
                basic technical data such as pages visited and device type, to
                keep the Service secure and working.
              </li>
            </ul>
          </Section>

          <Section title="3. How We Use Your Information">
            <ul className="list-disc space-y-1 pl-5">
              <li>To provide and manage appointments, rescheduling and cancellations.</li>
              <li>To let your clinic&apos;s doctors and staff deliver your care.</li>
              <li>To send appointment confirmations and reminders via WhatsApp.</li>
              <li>To run the AI chat assistant that helps you book appointments.</li>
              <li>To manage prescriptions, medicines, billing and reports.</li>
              <li>To maintain security, prevent fraud and comply with law.</li>
            </ul>
          </Section>

          <Section title="4. WhatsApp & the AI Assistant">
            <p>
              When you message the clinic on WhatsApp, the assistant uses your
              message content to identify the requested doctor or service and
              book appointments. Reminder messages are sent only for confirmed
              appointments. You can ask the assistant to stop sending reminders
              at any time. WhatsApp itself is operated by Meta, and your use of
              WhatsApp is governed by WhatsApp&apos;s own terms and privacy
              policy; we use WhatsApp strictly to communicate with you about
              your care.
            </p>
          </Section>

          <Section title="5. Reports & Files">
            <p>
              Reports and files you upload are stored securely and are visible
              only to clinic staff involved in your care and to you through
              your account. Files are retained for as long as needed for your
              care and as required by law, then securely deleted.
            </p>
          </Section>

          <Section title="6. Sharing Your Information">
            <p>
              Your information is shared only within your clinic — with the
              doctors and staff directly involved in your care. Staff can see
              only the data of their own clinic; patients can see only their
              own records. We do not sell your personal or health information
              to third parties. We may share data with trusted service
              providers (such as hosting and infrastructure) who help run the
              Service and are bound by confidentiality obligations.
            </p>
          </Section>

          <Section title="7. Data Storage & Security">
            <p>
              Your data is stored securely using industry-standard measures,
              including encryption in transit and at rest, and access controls
              that limit who can view records. Passwords are stored as
              cryptographic hashes and are never readable in plain text.
              Database access is restricted to authorised systems, and staff
              access is tied to authenticated accounts.
            </p>
          </Section>

          <Section title="8. Data Retention">
            <p>
              We keep your records for as long as your clinic needs them to
              provide care and to comply with applicable legal and regulatory
              requirements. When records are no longer needed, they are
              securely deleted.
            </p>
          </Section>

          <Section title="9. Your Rights">
            <p>
              You may access, correct or request deletion of your personal
              information by contacting your clinic. You can also update your
              own details through your account. You may request that we stop
              sending appointment reminders, and you may withdraw consent for
              WhatsApp-based services at any time. We will respond to
              legitimate requests within a reasonable time.
            </p>
          </Section>

          <Section title="10. Cookies & Third-Party Services">
            <p>
              The Service uses essential cookies for authentication and secure
              sign-in. Sign-in with Google shares only the minimal profile
              information needed and is governed by Google&apos;s privacy policy.
              Messaging on WhatsApp is governed by WhatsApp&apos;s policy. We do
              not use tracking cookies for advertising.
            </p>
          </Section>

          <Section title="11. Children&apos;s Privacy">
            <p>
              The Service is not directed at children. If a child&apos;s
              information is provided by a parent or guardian as part of their
              care, it is handled under the same protections described here.
            </p>
          </Section>

          <Section title="12. Changes to This Policy">
            <p>
              We may update this policy from time to time. Material changes
              will be reflected on this page with an updated date. Continued
              use of the Service after changes take effect means you accept the
              revised policy.
            </p>
          </Section>

          <Section title="13. Contact">
            <p>
              Questions about this policy or your data? Contact your clinic
              directly, by phone, or through the WhatsApp assistant. You can
              also reach the clinic through the contact details provided on
              its website.
            </p>
          </Section>
        </div>

        <div className="border-t border-border pt-5">
          <Link
            href="/"
            className="text-sm font-medium text-primary underline underline-offset-4 hover:text-primary"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}