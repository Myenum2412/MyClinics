import Image from "next/image";
import Link from "next/link";
import { CloudShader } from "@/components/ui/cloud-shader";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for My Clinics — the rules that govern your use of our clinic management platform.",
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

export default function TermsPage() {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 overflow-hidden p-6 md:p-10">
      <CloudShader
        className="absolute inset-0"
        skyTopColor="#0D47A1"
        skyBottomColor="#90CAF9"
        cloudColor="#E3F2FD"
      />
      <div className="relative z-10 w-full max-w-3xl rounded-2xl border border-white/40 bg-white/85 p-6 shadow-2xl shadow-[#0D47A1]/30 backdrop-blur-xl sm:p-10">
        <div className="flex items-start gap-4 border-b border-gray-200 pb-5">
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
              Terms of Service
            </h1>
            <p className="text-sm text-gray-500">
              Last updated: 16 August 2026
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-8 py-6">
          <Section title="1. Acceptance of Terms">
            <p>
              By creating an account, booking an appointment, messaging the
              clinic through WhatsApp or using My Clinics (the
              &quot;Service&quot;), you agree to these Terms of Service and our{" "}
              <Link
                href="/privacy"
                className="font-medium text-blue-700 underline underline-offset-4 hover:text-blue-900"
              >
                Privacy Policy
              </Link>
              . If you do not agree, please do not use the Service.
            </p>
          </Section>

          <Section title="2. The Service">
            <p>
              My Clinics is a clinic management platform that helps clinics and
              healthcare providers manage appointments, patient records,
              medical history, prescriptions, medicines, billing and reports.
              Patients may use the Service to book and manage appointments,
              chat with the clinic&apos;s assistant, receive reminders and access
              their own records. The Service includes a patient portal, a
              doctor/staff portal, and a WhatsApp-based booking assistant.
            </p>
          </Section>

          <Section title="3. Accounts & Registration">
            <p>
              You are responsible for safeguarding your account credentials and
              for all activity that occurs under your account. You must provide
              accurate information when creating an account and keep it up to
              date. Staff accounts are provisioned by the clinic; patient
              accounts may be created through the sign-up page or via Google
              sign-in. Notify the clinic immediately if you suspect
              unauthorised use of your account.
            </p>
          </Section>

          <Section title="4. Medical Disclaimer">
            <p>
              The Service stores and organises health information but is not a
              medical service. Content on the Service — including
              prescriptions, diagnoses and reports — is provided by licensed
              healthcare professionals and is not a substitute for professional
              medical advice, diagnosis or treatment. Always seek the advice of
              a qualified provider with any questions you may have about a
              medical condition. In an emergency, contact your local emergency
              services.
            </p>
          </Section>

          <Section title="5. Appointments, Rescheduling & Cancellation">
            <p>
              Appointment availability, timings and doctors are subject to
              change at the clinic&apos;s discretion. You agree to attend booked
              appointments on time and to cancel or reschedule with reasonable
              notice — through your account, by calling the clinic, or by
              messaging the WhatsApp assistant. The clinic may mark missed
              appointments as no-shows and may apply its own cancellation
              policy.
            </p>
          </Section>

          <Section title="6. Payments & Billing">
            <p>
              Bills generated through the Service reflect the clinic&apos;s
              charges for consultations, procedures and services. Bills are
              issued as PDFs through the portal and reflect the clinic&apos;s
              pricing. Payment terms, refunds and cancellations are governed by
              the clinic&apos;s own policies. Contact the clinic directly for any
              billing disputes.
            </p>
          </Section>

          <Section title="7. Messaging & Notifications">
            <p>
              By providing your phone number or messaging the clinic&apos;s
              WhatsApp assistant, you consent to receive appointment
              confirmations and reminders via WhatsApp. Reminders are sent for
              booked appointments only and are kept to a minimum. You can opt
              out of reminder messages at any time by telling the clinic or the
              assistant. Standard messaging rates may apply and are the
              responsibility of your carrier.
            </p>
          </Section>

          <Section title="8. AI Chat Assistant">
            <p>
              The clinic may offer an AI chat assistant that helps you find
              doctors, check availability and book, reschedule or cancel
              appointments. The assistant&apos;s answers are generated from
              clinic-provided information, and it never confirms a doctor or
              time slot unless the backend confirms it. The assistant is not a
              medical professional and does not provide medical advice,
              diagnosis or treatment. Always confirm important details directly
              with the clinic.
            </p>
          </Section>

          <Section title="9. Reports & File Uploads">
            <p>
              You may upload medical reports and files through the portal. You
              are responsible for the content you upload and confirm that you
              have the right to share it. Do not upload files containing
              anyone else&apos;s information without consent, and do not upload
              unlawful content. Uploads are subject to reasonable size and type
              limits enforced by the Service and are visible only to clinic
              staff involved in your care.
            </p>
          </Section>

          <Section title="10. Prescriptions & Medicines">
            <p>
              Prescriptions and medicine information displayed in the Service
              are provided by the clinic&apos;s doctors for your treatment.
              Follow your doctor&apos;s instructions for any medication and
              contact the clinic if you have questions about dosage or
              interactions.
            </p>
          </Section>

          <Section title="11. Acceptable Use">
            <p>
              You agree not to misuse the Service — for example, by attempting
              to access other users&apos; data, interfering with the Service&apos;s
              operation, impersonating others, or using the Service for
              unlawful purposes. The clinic may suspend or terminate accounts
              that violate these terms.
            </p>
          </Section>

          <Section title="12. Intellectual Property">
            <p>
              The Service, its software, design and content (excluding your own
              data) belong to the clinic and its licensors. You may not copy,
              modify or redistribute them without permission.
            </p>
          </Section>

          <Section title="13. Limitation of Liability">
            <p>
              To the maximum extent permitted by law, the Service is provided
              &quot;as is&quot; without warranties of any kind, and the clinic is
              not liable for indirect, incidental or consequential damages
              arising from your use of the Service, including reliance on
              automated messages or the AI assistant. The clinic will make
              reasonable efforts to keep the Service available but does not
              guarantee uninterrupted operation.
            </p>
          </Section>

          <Section title="14. Changes to These Terms">
            <p>
              We may update these terms from time to time. Material changes
              will be reflected on this page with an updated date. Continued
              use of the Service after changes take effect means you accept the
              revised terms.
            </p>
          </Section>

          <Section title="15. Contact">
            <p>
              Questions about these terms? Contact the clinic directly through
              your account, by phone, or through the WhatsApp assistant. You
              can also reach the clinic through the contact details provided
              on its website.
            </p>
          </Section>
        </div>

        <div className="border-t border-gray-200 pt-5">
          <Link
            href="/"
            className="text-sm font-medium text-blue-700 underline underline-offset-4 hover:text-blue-900"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}