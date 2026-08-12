import AppointmentForm from "@/components/AppointmentForm";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 bg-zinc-50 px-6 py-16 dark:bg-black">
      <section className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Welcome to My Clinic
        </h1>
        <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
          This page is a Server Component. It renders on the server, so the
          content below is available immediately without any JavaScript.
        </p>
      </section>
      <AppointmentForm />
      <p className="max-w-md text-center text-sm text-zinc-500 dark:text-zinc-500">
        The form above is a Client Component ({`'use client'`}). It handles
        state and interactivity in the browser.
      </p>
    </main>
  );
}
