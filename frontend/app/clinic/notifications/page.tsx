"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import StatsGeneric from "@/components/stats-generic";
import {
  type Notification,
  type Patient,
  createNotification,
  listNotifications,
  listPatients,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/clinic-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  async function handleCreate(form: {
    recipientUserId: string;
    type: string;
    title: string;
    body: string;
    link: string;
  }) {
    setSaving(true);
    try {
      await createNotification(clinicId, {
        recipientUserId: form.recipientUserId,
        type: form.type,
        title: form.title,
        body: form.body || null,
        link: form.link || null,
      });
      toast.success("Notification sent");
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
                          Notify a user in this clinic.
                        </DialogDescription>
                      </DialogHeader>
                      <NotificationForm clinicId={clinicId} saving={saving} onSave={handleCreate} />
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
    recipientUserId: string;
    type: string;
    title: string;
    body: string;
    link: string;
  }) => Promise<void>;
}) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [recipientUserId, setRecipientUserId] = useState("");
  const [type, setType] = useState("general");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");

  useEffect(() => {
    if (!clinicId) return;
    let active = true;
    setLoadingPatients(true);
    listPatients(clinicId, { limit: 100 })
      .then((res) => {
        if (active) {
          setPatients(res.items);
          if (res.items.length > 0) {
            setRecipientUserId(res.items[0].userId || res.items[0].patientId);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingPatients(false);
      });
    return () => {
      active = false;
    };
  }, [clinicId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!recipientUserId) {
      toast.error("Please select a patient recipient");
      return;
    }
    await onSave({ recipientUserId, type, title, body, link });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3">
        <div className="grid gap-2">
          <Label>Select Patient *</Label>
          {loadingPatients ? (
            <Skeleton className="h-10 w-full rounded-md" />
          ) : patients.length > 0 ? (
            <Select value={recipientUserId} onValueChange={(v) => setRecipientUserId(v ?? "")} required>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a patient..." />
              </SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p.patientId} value={p.userId || p.patientId}>
                    {p.fullName} {p.mobile ? `(${p.mobile})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              placeholder="Enter Patient User ID (usr_...)"
              value={recipientUserId}
              onChange={(e) => setRecipientUserId(e.target.value)}
              required
            />
          )}
          <p className="text-xs text-muted-foreground">
            Select the patient account to receive this notification.
          </p>
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
          <Label>Body</Label>
          <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Details or message content..." />
        </div>
        <div className="grid gap-2">
          <Label>Link</Label>
          <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="/clinic/appointments" />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={saving || !recipientUserId}>
          {saving ? "Sending..." : "Send Notification"}
        </Button>
      </DialogFooter>
    </form>
  );
}