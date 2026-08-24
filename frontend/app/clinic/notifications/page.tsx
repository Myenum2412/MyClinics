"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Paperclip, X } from "lucide-react";
import { useRequireRole } from "@/hooks/use-clinic-session";
import StatsGeneric from "@/components/stats-generic";
import {
  type Notification,
  type Patient,

  listNotifications,
  listPatients,
  markAllNotificationsRead,
  markNotificationRead,
  sendWhatsappBroadcast,
} from "@/lib/clinic-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { sessionCan } from "@/hooks/use-clinic-session";

const NOTIFICATION_TYPES = ["appointment", "bill", "report", "prescription", "general"];
const MAX_ATTACHMENTS = 3;
const MAX_ATTACHMENT_MB = 10;

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function NotificationsPage() {
  const session = useRequireRole("patient");
  const clinicId = session?.clinicId ?? "";
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const load = useCallback(() => {
    if (!clinicId) return;
    listNotifications(clinicId, { limit: 100 })
      .then((res) => {
        setItems(res.items);
        setUnread(res.unread);
        setPageIndex(0);
      })
      .catch(() => toast.error("Failed to load notifications"))
      .finally(() => setLoading(false));
  }, [clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  const [searchTerm, setSearchTerm] = useState("");

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const q = searchTerm.toLowerCase();
    return items.filter(
      (n) => n.title.toLowerCase().includes(q) || (n.body && n.body.toLowerCase().includes(q)) || n.type.toLowerCase().includes(q)
    );
  }, [items, searchTerm]);

  const paginatedItems = useMemo(
    () => filteredItems.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
    [filteredItems, pageIndex, pageSize]
  );
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / pageSize));

  const totalCount = items.length;
  const readCount = totalCount - unread;
  const readRate = totalCount ? Math.round((readCount / totalCount) * 100) : 100;
  const alertCount = items.filter((i) => i.type === 'appointment' || i.type === 'bill').length;

  const notifStatsItems = [
    {
      name: 'Total Alerts',
      percentage: Math.min(100, Math.round((totalCount / 50) * 100)),
      current: totalCount,
      allowed: 50,
      allowedLabel: 'target',
      fill: 'var(--chart-1)',
    },
    {
      name: 'Unread Alerts',
      percentage: totalCount ? Math.round((unread / totalCount) * 100) : 0,
      current: unread,
      allowed: totalCount,
      allowedLabel: 'total alerts',
      fill: 'var(--chart-2)',
    },
    {
      name: 'Read Rate',
      percentage: readRate,
      current: readCount,
      allowed: totalCount,
      allowedLabel: 'read alerts',
      fill: 'var(--chart-3)',
    },
    {
      name: 'WhatsApp Triggers',
      percentage: totalCount ? Math.round((alertCount / totalCount) * 100) : 0,
      current: alertCount,
      allowed: totalCount,
      allowedLabel: 'alerts',
      fill: 'var(--chart-4)',
    },
  ];

  async function handleRead(n: Notification) {
    if (n.readAt) return;
    try {
      await markNotificationRead(clinicId, n.notificationId);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update notification");
    }
  }

  async function handleReadAll() {
    try {
      await markAllNotificationsRead(clinicId);
      toast.success("All notifications marked as read");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update notifications");
    }
  }

  async function handleSend(form: {
    allPatients: boolean;
    patientIds: string[];
    type: string;
    title: string;
    message: string;
    files: File[];
  }) {
    setSaving(true);
    try {
      const result = await sendWhatsappBroadcast(
        clinicId,
        {
          allPatients: form.allPatients,
          patientIds: form.patientIds,
          type: form.type,
          title: form.title,
          message: form.message,
        },
        form.files
      );
      const parts = [`Sent to ${result.queued} patient${result.queued === 1 ? "" : "s"}`];
      if (result.skippedNoPhone > 0) {
        parts.push(`${result.skippedNoPhone} skipped (no phone number)`);
      }
      toast.success(parts.join(" · "));
      setCreating(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send notification");
    } finally {
      setSaving(false);
    }
  }

  const canCreate = sessionCan(session, "staff");

  return (
    <div className="flex flex-col gap-6">
      {!loading && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <StatsGeneric
            title="Notification Analytics"
            description="WhatsApp alerts, automated reminders, and delivery log insights."
            items={notifStatsItems}
            searchTerm={searchTerm}
            onSearchChange={(v) => {
              setSearchTerm(v);
              setPageIndex(0);
            }}
            searchPlaceholder="Search notifications..."
            action={
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleReadAll} className="h-9">
                  Mark all as read
                </Button>
                {canCreate && (
                  <Dialog open={creating} onOpenChange={setCreating}>
                    <DialogTrigger render={<Button size="sm" className="h-9">Send notification</Button>} />
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Send notification</DialogTitle>
                        <DialogDescription>
                          Send a WhatsApp notification to selected patients — or all patients — with optional attachments.
                        </DialogDescription>
                      </DialogHeader>
                      <NotificationForm clinicId={clinicId} saving={saving} onSave={handleSend} />
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            }
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No notifications.
            </p>
          ) : (
            <div className="space-y-2">
              {paginatedItems.map((n) => (
                <button
                  key={n.notificationId}
                  type="button"
                  onClick={() => handleRead(n)}
                  className={`w-full rounded-lg border p-3 text-left transition hover:bg-muted/50 ${
                    n.readAt ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{n.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(n.createdAt)}
                    </span>
                  </div>
                  {n.body && <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>}
                  <div className="mt-1 flex items-center gap-2">
                    <Badge className="bg-muted text-muted-foreground">{n.type}</Badge>
                    {!n.readAt && (
                      <span className="text-xs font-medium text-primary">unread</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
          {!loading && items.length > 0 && (
            <div className="mt-4">
              <Pagination
                page={pageIndex + 1}
                pageSize={pageSize}
                totalItems={items.length}
                onPageChange={(p) => setPageIndex(Math.max(0, Math.min(p - 1, pageCount - 1)))}
                pageSizeOptions={[5, 10, 25, 50]}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPageIndex(0);
                }}
                itemLabel="notifications"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationForm({
  clinicId,
  saving,
  onSave,
}: {
  clinicId: string;
  saving: boolean;
  onSave: (form: {
    allPatients: boolean;
    patientIds: string[];
    type: string;
    title: string;
    message: string;
    files: File[];
  }) => Promise<void>;
}) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [allPatients, setAllPatients] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [type, setType] = useState("general");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    listPatients(clinicId, { status: "active", limit: 100 })
      .then((res) => {
        if (!cancelled) setPatients(res.items);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load patients");
      })
      .finally(() => {
        if (!cancelled) setPatientsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clinicId]);

  const filteredPatients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        (p.whatsapp ?? "").includes(q) ||
        p.mobile.includes(q)
    );
  }, [patients, search]);

  function togglePatient(patientId: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(patientId);
      else next.delete(patientId);
      return next;
    });
  }

  function addFiles(chosen: FileList | null) {
    if (!chosen?.length) return;
    const accepted: File[] = [];
    for (const file of Array.from(chosen)) {
      if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024) {
        toast.error(`"${file.name}" exceeds the ${MAX_ATTACHMENT_MB}MB limit`);
        continue;
      }
      accepted.push(file);
    }
    setFiles((prev) => {
      const merged = [...prev, ...accepted];
      if (merged.length > MAX_ATTACHMENTS) {
        toast.error(`At most ${MAX_ATTACHMENTS} attachments are allowed`);
        return merged.slice(0, MAX_ATTACHMENTS);
      }
      return merged;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!allPatients && selectedIds.size === 0) {
      toast.error("Select at least one patient or choose all patients");
      return;
    }
    if (!title.trim()) return;
    if (!message.trim() && files.length === 0) {
      toast.error("Write a message or attach a file");
      return;
    }
    await onSave({
      allPatients,
      patientIds: [...selectedIds],
      type,
      title,
      message,
      files,
    });
  }

  const recipientCount = allPatients ? null : selectedIds.size;

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3">
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <Label>Recipients</Label>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <Checkbox checked={allPatients} onCheckedChange={(c) => setAllPatients(c === true)} />
              All patients
            </label>
          </div>
          {allPatients ? (
            <p className="rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              This message will be sent to every active patient in your clinic.
            </p>
          ) : patientsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <>
              <Input
                placeholder="Search patients by name or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border p-2">
                {filteredPatients.length === 0 ? (
                  <p className="py-3 text-center text-sm text-muted-foreground">
                    No patients found.
                  </p>
                ) : (
                  filteredPatients.map((p) => {
                    const phone = (p.whatsapp ?? "").trim() || p.mobile.trim();
                    return (
                      <label
                        key={p.patientId}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition hover:bg-muted/60"
                      >
                        <Checkbox
                          checked={selectedIds.has(p.patientId)}
                          onCheckedChange={(c) => togglePatient(p.patientId, c === true)}
                        />
                        <span className="flex-1 truncate">{p.fullName}</span>
                        {phone ? (
                          <span className="shrink-0 text-xs text-muted-foreground">{phone}</span>
                        ) : (
                          <Badge variant="outline" className="shrink-0 text-xs text-destructive">
                            no phone
                          </Badge>
                        )}
                      </label>
                    );
                  })
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {recipientCount === 0
                  ? "No patients selected."
                  : `${recipientCount} patient${recipientCount === 1 ? "" : "s"} selected.`}
              </p>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v ?? "general")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTIFICATION_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Notification title" />
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Message</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Type the message patients will receive on WhatsApp..."
          />
        </div>

        <div className="grid gap-2">
          <Label>Attachments</Label>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => fileInputRef.current?.click()}
            disabled={files.length >= MAX_ATTACHMENTS}
          >
            <Paperclip className="size-4" />
            Attach files
          </Button>
          {files.length > 0 && (
            <div className="space-y-1">
              {files.map((file, i) => (
                <div
                  key={`${file.name}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-sm"
                >
                  <span className="truncate">{file.name}</span>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(0)} KB
                    </span>
                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-muted-foreground transition hover:text-destructive"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Up to {MAX_ATTACHMENTS} files, {MAX_ATTACHMENT_MB}MB each.
              </p>
            </div>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button
          type="submit"
          disabled={
            saving ||
            !title.trim() ||
            (!allPatients && selectedIds.size === 0)
          }
        >
          {saving ? "Sending..." : "Send via WhatsApp"}
        </Button>
      </DialogFooter>
    </form>
  );
}
