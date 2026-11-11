import type { Metadata } from "next";
import { FAQSubscribersTable } from "@/components/org/faq-subscribers-table";

export const metadata: Metadata = {
  title: "F&Q Subscribers | Org Menu",
  description: "View and manage email IDs captured from the public FAQ newsletter form.",
};

export default function OrgMenuFAQPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          F&Q Inquiries & Newsletter Table
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real-time list of all visitor and doctor email addresses captured from the public FAQ page.
        </p>
      </div>

      <FAQSubscribersTable />
    </div>
  );
}
