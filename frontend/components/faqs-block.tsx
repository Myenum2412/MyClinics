import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const faqs = [
  {
    q: "Do I need an account to book an appointment?",
    a: "Yes — a patient account keeps your appointments and records in one place. You can sign in with Google in a single click.",
  },
  {
    q: "Can I book through WhatsApp?",
    a: "Yes. Message the clinic's WhatsApp assistant, tell it which doctor or department you need, and it will book your appointment for you.",
  },
  {
    q: "Is my health data safe?",
    a: "Yes. Data is encrypted in transit and at rest, and only the clinic's care team can access your records. We never sell your data.",
  },
  {
    q: "What if I need to cancel or reschedule?",
    a: "Cancel or reschedule from your account, by phone, or through the WhatsApp assistant — anytime, no phone queues.",
  },
  {
    q: "Can I see my past prescriptions and reports?",
    a: "Yes — your account keeps your medical history, prescriptions, uploaded reports and bills, so nothing gets lost between visits.",
  },
  {
    q: "Does the clinic need technical staff to set this up?",
    a: "No. Setup is filling in a few forms: clinic name, doctors, services and opening hours. Your team is up and running the same day.",
  },
  {
    q: "Is my phone number used for anything else?",
    a: "Only for appointment confirmations and reminders. You can opt out at any time, and we never share your number.",
  },
]

export default function FaqsBlock() {
  return (
    <section className="flex w-full items-center justify-center bg-white px-6 py-12 text-foreground">
      <div className="w-full max-w-2xl">
        <div className="text-center">
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Frequently asked questions
          </h2>
          <p className="mt-3 text-muted-foreground">
            Answers to the questions we hear most often.
          </p>
        </div>

        <Accordion defaultValue={[faqs[0].q]} className="mt-10">
          {faqs.map(({ q, a }) => (
            <AccordionItem key={q} value={q}>
              <AccordionTrigger className="py-4 text-base font-medium">
                {q}
              </AccordionTrigger>
              <AccordionContent className="pb-4 text-base text-muted-foreground">
                {a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
