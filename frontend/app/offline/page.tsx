export const metadata = {
  title: "Offline  My Clinics",
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="max-w-md space-y-3">
        <h1 className="text-2xl font-semibold">You&apos;re offline</h1>
        <p className="text-sm text-muted-foreground">
          My Clinics couldn&apos;t reach the network. Cached pages will still
          work  check your connection and try again.
        </p>
      </div>
    </main>
  );
}
