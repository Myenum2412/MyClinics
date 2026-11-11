"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useClinicSession } from "@/hooks/use-clinic-session";
import {
  getContact,
  updateContact,
  archiveContact,
  restoreContact,
  type Contact,
} from "@/lib/clinic-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Edit2, Archive, RotateCcw, Save, X } from "lucide-react";

function format(v: string | null | undefined) {
  return v ? new Date(v).toLocaleString() : "—";
}

export default function ContactDetailPage() {
  const session = useClinicSession();
  const router = useRouter();
  const { contactId } = useParams<{ contactId: string }>();
  const clinicId = session.session?.clinicId;
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!clinicId || !contactId) return;
    setLoading(true);
    try {
      const { contact } = await getContact(clinicId, contactId);
      setContact(contact);
      setForm({
        firstName: contact.firstName,
        lastName: contact.lastName ?? "",
        email: contact.email ?? "",
        phone: contact.phone ?? "",
        title: contact.title ?? "",
        seniority: contact.seniority ?? "",
        function: contact.function ?? "",
        companyId: contact.companyId ?? "",
        ownerId: contact.ownerId ?? "",
      });
    } catch {
      toast.error("Failed to load contact");
    } finally {
      setLoading(false);
    }
  }, [clinicId, contactId]);

  useEffect(() => {
    if (session.session) void load();
  }, [session.session, load]);

  const save = async () => {
    if (!clinicId) return;
    try {
      await updateContact(clinicId, contactId!, form);
      toast.success("Contact saved");
      void load();
      setEditing(false);
    } catch {
      toast.error("Failed to save contact");
    }
  };

  const cancelEdit = () => {
    if (contact) {
      setForm({
        firstName: contact.firstName,
        lastName: contact.lastName ?? "",
        email: contact.email ?? "",
        phone: contact.phone ?? "",
        title: contact.title ?? "",
        seniority: contact.seniority ?? "",
        function: contact.function ?? "",
        companyId: contact.companyId ?? "",
        ownerId: contact.ownerId ?? "",
      });
    }
    setEditing(false);
  };

  if (loading) return <Skeleton className="h-64 w-full" />;
  if (!contact) return <p className="text-sm text-muted-foreground">Contact not found.</p>;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{editing ? "Edit Contact" : contact.name}</CardTitle>
            <div className="flex items-center gap-2">
              {contact.archivedAt ? (
                <Button variant="outline" size="sm" onClick={async () => {
                  if (confirm("Restore this contact?")) {
                    await fetch(`/api/clinics/${clinicId}/crm/contacts/${contactId}/restore`, { method: "POST", credentials: "include" });
                    toast.success("Contact restored");
                    router.refresh();
                  }
                }}>
                  <RotateCcw className="size-4 mr-2" />
                  Restore
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={async () => {
                  if (confirm("Archive this contact?")) {
                    await fetch(`/api/clinics/${clinicId}/crm/contacts/${contactId}/archive`, { method: "POST", credentials: "include" });
                    toast.success("Contact archived");
                    router.refresh();
                  }
                }}>
                  <Archive className="size-4 mr-2" />
                  Archive
                </Button>
              )}
              {editing ? (
                <>
                  <Button variant="outline" size="sm" onClick={cancelEdit}>
                    <X className="size-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={save}>
                    <Save className="size-4 mr-2" />
                    Save
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <Edit2 className="size-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">First Name</label>
                <Input value={form.firstName} onChange={(e) => setForm({...form, firstName: e.target.value})} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Last Name</label>
                <Input value={form.lastName} onChange={(e) => setForm({...form, lastName: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
                <Input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Phone</label>
                <Input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Title</label>
                <Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Seniority</label>
                <Input value={form.seniority} onChange={(e) => setForm({...form, seniority: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Function</label>
                <Input value={form.function} onChange={(e) => setForm({...form, function: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Company ID</label>
                <Input value={form.companyId} onChange={(e) => setForm({...form, companyId: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Owner ID</label>
                <Input value={form.ownerId} onChange={(e) => setForm({...form, ownerId: e.target.value})} />
              </div>
            </div>
          ) : (
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <Row label="Source" value={contact.source} />
              <Row label="Priority" value={contact.enrichmentStatus} />
              <Row label="Phone" value={contact.phone} />
              <Row label="Email" value={contact.email} />
              <Row label="Title" value={contact.title} />
              <Row label="Seniority" value={contact.seniority} />
              <Row label="Function" value={contact.function} />
              <Row label="Company ID" value={contact.companyId} />
              <Row label="Owner ID" value={contact.ownerId} />
              <Row label="Created" value={format(contact.createdAt)} />
              <Row label="Updated" value={format(contact.updatedAt)} />
              <Row label="Last Activity" value={format(contact.lastActivityAt)} />
              {contact.archivedAt && <Row label="Archived" value={format(contact.archivedAt)} />}
            </dl>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <svg preserveAspectRatio="xMidYMid" viewBox="0 0 256 171" className="w-4 h-auto">
                <defs>
                  <linearGradient id="meta_dtl_a" x1="13.878%" x2="89.144%" y1="55.934%" y2="58.694%">
                    <stop offset="0%" stopColor="#0064E1" />
                    <stop offset="40%" stopColor="#0064E1" />
                    <stop offset="83%" stopColor="#0073EE" />
                    <stop offset="100%" stopColor="#0082FB" />
                  </linearGradient>
                  <linearGradient id="meta_dtl_b" x1="54.315%" x2="54.315%" y1="82.782%" y2="39.307%">
                    <stop offset="0%" stopColor="#0082FB" />
                    <stop offset="100%" stopColor="#0064E0" />
                  </linearGradient>
                </defs>
                <path fill="#0081FB" d="M27.651 112.136c0 9.775 2.146 17.28 4.95 21.82 3.677 5.947 9.16 8.466 14.751 8.466 7.211 0 13.808-1.79 26.52-19.372 10.185-14.092 22.186-33.874 30.26-46.275l13.675-21.01c9.499-14.591 20.493-30.811 33.1-41.806C161.196 4.985 172.298 0 183.47 0c18.758 0 36.625 10.87 50.3 31.257C248.735 53.584 256 81.707 256 110.729c0 17.253-3.4 29.93-9.187 39.946-5.591 9.686-16.488 19.363-34.818 19.363v-27.616c15.695 0 19.612-14.422 19.612-30.927 0-23.52-5.484-49.623-17.564-68.273-8.574-13.23-19.684-21.313-31.907-21.313-13.22 0-23.859 9.97-35.815 27.75-6.356 9.445-12.882 20.956-20.208 33.944l-8.066 14.289c-16.203 28.728-20.307 35.271-28.408 46.07-14.2 18.91-26.324 26.076-42.287 26.076-18.935 0-30.91-8.2-38.325-20.556C2.973 139.413 0 126.202 0 111.148l27.651.988Z" />
                <path fill="url(#meta_dtl_a)" d="M21.802 33.206C34.48 13.666 52.774 0 73.757 0 85.91 0 97.99 3.597 110.605 13.897c13.798 11.261 28.505 29.805 46.853 60.368l6.58 10.967c15.881 26.459 24.917 40.07 30.205 46.49 6.802 8.243 11.565 10.7 17.752 10.7 15.695 0 19.612-14.422 19.612-30.927l24.393-.766c0 17.253-3.4 29.93-9.187 39.946-5.591 9.686-16.488 19.363-34.818 19.363-11.395 0-21.49-2.475-32.654-13.007-8.582-8.083-18.615-22.443-26.334-35.352l-22.96-38.352C118.528 64.08 107.96 49.73 101.845 43.23c-6.578-6.988-15.036-15.428-28.532-15.428-10.923 0-20.2 7.666-27.963 19.39L21.802 33.206Z" />
                <path fill="url(#meta_dtl_b)" d="M73.312 27.802c-10.923 0-20.2 7.666-27.963 19.39-10.976 16.568-17.698 41.245-17.698 64.944 0 9.775 2.146 17.28 4.95 21.82L9.027 149.482C2.973 139.413 0 126.202 0 111.148 0 83.772 7.514 55.24 21.802 33.206 34.48 13.666 52.774 0 73.757 0l-.445 27.802Z" />
              </svg>
              Meta Lead Attribution
            </CardTitle>
            {contact.source === "META" && (
              <Badge className="bg-[#0081FB]/10 text-[#0081FB] border-[#0081FB]/20">
                Meta Lead
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {contact.metaAttribution ? (
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <Row label="Platform" value={contact.metaAttribution.platform ?? "Meta"} />
              <Row label="Campaign" value={contact.metaAttribution.campaignName || contact.metaAttribution.campaignId} />
              <Row label="Ad Set" value={contact.metaAttribution.adsetName || contact.metaAttribution.adsetId} />
              <Row label="Ad Name" value={contact.metaAttribution.adName || contact.metaAttribution.adId} />
              <Row label="Form" value={contact.metaAttribution.formName || contact.metaAttribution.formId} />
              <Row label="Meta Lead ID" value={contact.metaAttribution.metaLeadId} />
              <Row label="Submitted" value={format(contact.metaAttribution.submittedAt)} />
            </dl>
          ) : contact.source === "META" ? (
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
              <p className="font-medium text-foreground">Ingested via Meta Integration</p>
              <p className="mt-1 text-xs text-muted-foreground">
                This contact was generated from Meta (Facebook / Instagram). Detailed ad attribution will populate when synced with campaign mapping.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Meta attribution data will appear here for contacts captured from Meta Lead Ads.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-mono text-xs">{value ?? "—"}</dd>
    </div>
  );
}