"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { useClinicSession } from "@/hooks/use-clinic-session";
import {
  assignLead,
  bookLeadAppointment,
  convertLead,
  getLead,
  markLeadContacted,
  type Lead,
  type LeadAttribution,
  upsertLeadWhatsappFollowup,
} from "@/lib/clinic-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

function format(v: string | null | undefined) {
  return v ? new Date(v).toLocaleString() : "—";
}

export default function LeadDetailPage() {
  const session = useClinicSession();
  const { leadId } = useParams<{ leadId: string }>();
  const clinicId = session.session?.clinicId;
  const [lead, setLead] = useState<Lead | null>(null);
  const [attr, setAttr] = useState<LeadAttribution | null>(null);
  const [wa, setWa] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!clinicId || !leadId) return;
    getLead(clinicId, leadId)
      .then((r) => {
        setLead(r.lead);
        setAttr(r.attribution);
        setWa(r.whatsappFollowup as Record<string, unknown> | null);
      })
      .catch(() => toast.error("Failed to load lead"))
      .finally(() => setLoading(false));
  }, [clinicId, leadId]);

  useEffect(() => {
    if (session.session) void load();
  }, [session.session, load]);

  if (loading) return <Skeleton className="h-64 w-full" />;
  if (!lead) return <p className="text-sm text-muted-foreground">Lead not found.</p>;

  const isMeta = lead.source.startsWith("meta");

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{lead.name ?? "Unnamed lead"}</CardTitle>
            <Badge>{lead.status}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <Row label="Source" value={lead.source} />
            <Row label="Priority" value={lead.priority} />
            <Row label="Phone" value={lead.phone} />
            <Row label="Email" value={lead.email} />
            <Row label="Department" value={lead.department} />
            <Row label="Service" value={lead.service} />
            <Row label="Team" value={lead.team} />
            <Row label="Assigned To" value={lead.assignedTo} />
          </dl>

          <Separator className="my-3" />
          <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Response Workflow</p>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <Row label="Received" value={format(lead.receivedAt)} />
            <Row label="First Response" value={format(lead.firstResponseAt)} />
            <Row label="First Contact" value={format(lead.firstContactAt)} />
            <Row label="Contact Attempts" value={String(lead.contactAttempts)} />
            <Row label="Appointment" value={format(lead.appointmentBookedAt)} />
            <Row label="Converted" value={format(lead.convertedAt)} />
          </dl>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" onClick={async () => { await markLeadContacted(clinicId!, leadId); toast.success("Marked contacted"); void load(); }}>Mark Contacted</Button>
            <Button size="sm" variant="outline" onClick={async () => { const id = prompt("Assign to user ID:"); if (!id) return; await assignLead(clinicId!, leadId, id); toast.success("Assigned"); void load(); }}>Assign</Button>
            <Button size="sm" variant="outline" onClick={async () => { await bookLeadAppointment(clinicId!, leadId); toast.success("Appointment booked"); void load(); }}>Book Appointment</Button>
            <Button size="sm" variant="outline" onClick={async () => { await convertLead(clinicId!, leadId); toast.success("Converted"); void load(); }}>Convert</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Meta Attribution</CardTitle></CardHeader>
        <CardContent>
          {!isMeta || !attr ? (
            <p className="text-sm text-muted-foreground">This lead did not originate from Meta, or attribution is unavailable.</p>
          ) : (
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <Row label="Meta Lead ID" value={attr.metaLeadId} mono />
              <Row label="Platform" value={attr.platform} />
              <Row label="Business" value={attr.businessId} mono />
              <Row label="Page" value={attr.pageId} mono />
              <Row label="Instagram" value={attr.instagramAccountId} mono />
              <Row label="Ad Account" value={attr.adAccountId} mono />
              <Row label="Campaign" value={attr.campaignName ?? attr.campaignId} mono />
              <Row label="Ad Set" value={attr.adsetName ?? attr.adsetId} mono />
              <Row label="Advertisement" value={attr.adName ?? attr.adId} mono />
              <Row label="Lead Form" value={attr.formName ?? attr.formId} mono />
              <Row label="Original Source" value={lead.source} />
              <Row label="Submission Time" value={format(attr.submittedAt)} />
            </dl>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader><CardTitle>WhatsApp Follow-up</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Minimal conversation metadata only — kept tenant-isolated. Messages are not stored in the CRM.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={async () => {
              const ref = prompt("WhatsApp conversation reference (optional):");
              await upsertLeadWhatsappFollowup(clinicId!, leadId, { status: "contacted", conversationRef: ref ?? null, lastContactedAt: new Date().toISOString(), messageStatus: "sent" });
              toast.success("Follow-up updated");
              void load();
            }}>Record Follow-up</Button>
            <span className="self-center text-xs text-muted-foreground">
              Status: {wa?.status ? String(wa.status) : "none"} {wa?.lastContactedAt ? `· last ${format(String(wa.lastContactedAt))}` : ""}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`${mono ? "font-mono text-xs" : ""} text-right`}>{value ?? "—"}</dd>
    </div>
  );
}
