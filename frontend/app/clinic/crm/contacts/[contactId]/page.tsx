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
        <CardHeader><CardTitle>Meta Attribution</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Meta attribution data will appear here for contacts captured from Meta Lead Ads.
          </p>
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