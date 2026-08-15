import { getDb } from "@/lib/db";
import AppointmentForm, { type DoctorOption } from "@/components/AppointmentForm";
import HeaderBlock from "@/components/header-block";

export const dynamic = "force-dynamic";

export default async function Home() {
  const db = await getDb();
  const doctors = await db
    .collection("users")
    .find({ role: "doctor" }, { projection: { name: 1 } })
    .sort({ name: 1 })
    .toArray();

  const doctorOptions: DoctorOption[] = doctors.map((d) => ({
    id: d._id.toString(),
    name: d.name,
  }));

  return (
    <HeaderBlock>
      <div className="flex min-h-[calc(100svh-4rem)] flex-col items-center justify-center gap-10 text-center">
        <section className="max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Welcome to My Clinic
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            This page is a Server Component. It renders on the server, so the
            content below is available immediately without any JavaScript.
          </p>
        </section>
        <AppointmentForm doctors={doctorOptions} />
        <p className="max-w-md text-sm text-muted-foreground">
          The form above is a Client Component ({`'use client'`}). It handles
          state and interactivity in the browser.
        </p>
      </div>
    </HeaderBlock>
  );
}
