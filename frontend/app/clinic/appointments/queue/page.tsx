"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useRequireRole, sessionCan } from "@/hooks/use-clinic-session";
import {
  type Appointment,
  type AppointmentQueueStatus,
  type Doctor,
  type QueueItem,
  type QueueSettings,
  type QueueSnapshot,
  type QueueStage,
  getAllAppointmentNotifications,
  getAppointmentQueue,
  getQueueSettings,
  listDoctors,
  queueCallNext,
  queueCancel,
  queueCheckIn,
  queueComplete,
  queueNoShow,
  queueRecall,
  queueReschedule,
  queueSkip,
  queueStartConsultation,
  saveQueueSettings,
} from "@/lib/clinic-api";
import { formatTime } from "@/lib/format-time";
import { todayISO } from "@/lib/datetime";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Clock,
  RefreshCw,
  Settings2,
  Bell,
  UserCheck,
  SkipForward,
  RotateCcw,
  CheckCircle2,
  XCircle,
  PhoneOff,
  ArrowRightCircle,
  Star,
  ListChecks,
} from "lucide-react";

const QUEUE_STAGES: QueueStage[] = [
  "you_are_next",
  "please_be_ready",
  "token_called",
  "proceed_to_room",
];

const STAGE_LABELS: Record<QueueStage, string> = {
  you_are_next: "Alert: You are next",
  please_be_ready: "Alert: Please be ready",
  token_called: "Alert: Token called",
  proceed_to_room: "Alert: Proceed to room",
};

export default function TokenQueuePage() {
  const session = useRequireRole("staff");
  const clinicId = session?.clinicId ?? "";
  const canManage = session ? sessionCan(session, "staff") : false;
  const isDoctor = session?.role === "doctor";

  const [date, setDate] = useState<string>(todayISO());
  const [doctorId, setDoctorId] = useState<string>(session?.doctorId ?? "");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [snapshot, setSnapshot] = useState<QueueSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [settings, setSettings] = useState<QueueSettings | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<unknown[]>([]);

  const [rescheduleTarget, setRescheduleTarget] = useState<QueueItem | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");

  const effectiveDoctorId = isDoctor ? session?.doctorId ?? "" : doctorId;

  const load = useCallback(async () => {
    if (!clinicId) return;
    try {
      const snap = await getAppointmentQueue(clinicId, {
        doctorId: effectiveDoctorId || undefined,
        date,
      });
      setSnapshot(snap);
    } catch {
      toast.error("Failed to load queue");
    } finally {
      setLoading(false);
    }
  }, [clinicId, effectiveDoctorId, date]);

  const loadDoctors = useCallback(async () => {
    if (!clinicId || isDoctor) return;
    try {
      const res = await listDoctors(clinicId, { limit: 200 });
      setDoctors(res.items ?? []);
    } catch {
      /* ignore */
    }
  }, [clinicId, isDoctor]);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  // Polling for real-time sync across reception + doctor screens.
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    load();
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(load, 5000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [load]);

  const runAction = useCallback(
    async (key: string, fn: () => Promise<unknown>) => {
      setBusy(key);
      try {
        await fn();
        await load();
        toast.success("Updated");
      } catch {
        toast.error("Action failed");
      } finally {
        setBusy(null);
      }
    },
    [load]
  );

  const openSettings = async () => {
    if (!clinicId) return;
    try {
      const s = await getQueueSettings(clinicId);
      setSettings(s);
      setSettingsOpen(true);
    } catch {
      toast.error("Failed to load settings");
    }
  };

  const openNotifications = async () => {
    if (!clinicId) return;
    try {
      const res = await getAllAppointmentNotifications(clinicId);
      setNotifications(res.notifications ?? []);
      setNotifOpen(true);
    } catch {
      toast.error("Failed to load notifications");
    }
  };

  const saveSettings = async () => {
    if (!clinicId || !settings) return;
    try {
      await saveQueueSettings(clinicId, settings);
      toast.success("Queue settings saved");
      setSettingsOpen(false);
    } catch {
      toast.error("Failed to save settings");
    }
  };

  const toggleStage = (stage: QueueStage) => {
    if (!settings) return;
    const has = settings.enabledStages.includes(stage);
    setSettings({
      ...settings,
      enabledStages: has
        ? settings.enabledStages.filter((s) => s !== stage)
        : [...settings.enabledStages, stage],
    });
  };

  const submitReschedule = async () => {
    if (!rescheduleTarget || !rescheduleDate || !rescheduleTime) return;
    await runAction(`reschedule-${rescheduleTarget.appointment.appointmentId}`, () =>
      queueReschedule(clinicId, rescheduleTarget.appointment.appointmentId, {
        date: rescheduleDate,
        time: rescheduleTime,
      })
    );
    setRescheduleTarget(null);
  };

  if (!session) return null;

  const current = snapshot?.current ?? null;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Token Queue</h1>
          <p className="text-sm text-muted-foreground">
            Real-time token-based appointment flow.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-auto"
          />
          {!isDoctor && (
            <Select
              value={doctorId || "all"}
              onValueChange={(v) => setDoctorId(v === "all" || v == null ? "" : v)}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All doctors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All doctors</SelectItem>
                {doctors.map((d) => (
                  <SelectItem key={d.doctorId} value={d.doctorId}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="icon" onClick={load} aria-label="Refresh">
            <RefreshCw className="size-4" />
          </Button>
          {canManage && (
            <>
              <Button variant="outline" size="icon" onClick={openSettings} aria-label="Settings">
                <Settings2 className="size-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={openNotifications} aria-label="Notifications">
                <Bell className="size-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {loading && !snapshot ? (
        <div className="text-sm text-muted-foreground">Loading queue…</div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Waiting" value={snapshot?.counts.waiting ?? 0} />
            <StatCard label="In Consultation" value={snapshot?.counts.inConsultation ?? 0} />
            <StatCard label="Completed" value={snapshot?.counts.completed ?? 0} />
            <StatCard label="Upcoming" value={snapshot?.counts.upcoming ?? 0} />
            <StatCard label="Priority" value={snapshot?.counts.priority ?? 0} tone="warning" />
          </div>

          {/* Empty state for selected date/doctor */}
          {snapshot &&
            !loading &&
            snapshot.counts.waiting === 0 &&
            snapshot.counts.inConsultation === 0 &&
            snapshot.counts.completed === 0 &&
            snapshot.counts.upcoming === 0 &&
            snapshot.waiting.length === 0 &&
            snapshot.upcoming.length === 0 &&
            !snapshot.current &&
            !snapshot.next && (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center">
                  <p className="text-sm font-medium text-foreground">No appointments for {date}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {effectiveDoctorId
                      ? "No appointments for the selected doctor on this date. Try 'All doctors' or another date."
                      : "No appointments scheduled for this date."}{" "}
                    Create an appointment or check the Appointments page for other dates.
                  </p>
                  <div className="mt-4 flex justify-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setDate(todayISO())}>
                      Go to Today
                    </Button>
                    <Button size="sm" onClick={() => (window.location.href = "/clinic/appointments")}>
                      Create Appointment
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Current + Call next */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Now Serving</CardTitle>
              </CardHeader>
              <CardContent>
                {current ? (
                  <PatientCard
                    item={current}
                    canManage={canManage}
                    busy={busy}
                    onStart={() =>
                      runAction(`start-${current.appointment.appointmentId}`, () =>
                        queueStartConsultation(clinicId, current.appointment.appointmentId)
                      )
                    }
                    onComplete={() =>
                      runAction(`complete-${current.appointment.appointmentId}`, () =>
                        queueComplete(clinicId, current.appointment.appointmentId)
                      )
                    }
                    onSkip={() =>
                      runAction(`skip-${current.appointment.appointmentId}`, () =>
                        queueSkip(clinicId, current.appointment.appointmentId)
                      )
                    }
                    onNoShow={() =>
                      runAction(`noshow-${current.appointment.appointmentId}`, () =>
                        queueNoShow(clinicId, current.appointment.appointmentId)
                      )
                    }
                    onCancel={() =>
                      runAction(`cancel-${current.appointment.appointmentId}`, () =>
                        queueCancel(clinicId, current.appointment.appointmentId)
                      )
                    }
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">No patient currently being served.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Next in Line</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {snapshot?.next ? (
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">#{snapshot.next.appointment.tokenNumber}</span>
                      {snapshot.next.appointment.priority && (
                        <Badge variant="secondary">
                          <Star className="mr-1 size-3" /> Priority
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 font-medium">{snapshot.next.patientName}</p>
                    <p className="text-xs text-muted-foreground">
                      {snapshot.next.doctorName} · {formatTime(snapshot.next.appointment.time)}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Queue is empty.</p>
                )}
                {canManage && (
                  <Button
                    className="w-full"
                    disabled={busy === "callnext"}
                    onClick={() =>
                      runAction("callnext", () =>
                        queueCallNext(clinicId, {
                          doctorId: effectiveDoctorId || undefined,
                          date,
                        })
                      )
                    }
                  >
                    <ArrowRightCircle className="mr-2 size-4" /> Call Next Patient
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Waiting */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <ListChecks className="size-4" /> Waiting ({snapshot?.waiting.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {snapshot && snapshot.waiting.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {snapshot.waiting.map((item) => (
                    <WaitingCard
                      key={item.appointment.appointmentId}
                      item={item}
                      canManage={canManage}
                      busy={busy}
                      onSkip={() =>
                        runAction(`skip-${item.appointment.appointmentId}`, () =>
                          queueSkip(clinicId, item.appointment.appointmentId)
                        )
                      }
                      onRecall={() =>
                        runAction(`recall-${item.appointment.appointmentId}`, () =>
                          queueRecall(clinicId, item.appointment.appointmentId)
                        )
                      }
                      onComplete={() =>
                        runAction(`complete-${item.appointment.appointmentId}`, () =>
                          queueComplete(clinicId, item.appointment.appointmentId)
                        )
                      }
                      onNoShow={() =>
                        runAction(`noshow-${item.appointment.appointmentId}`, () =>
                          queueNoShow(clinicId, item.appointment.appointmentId)
                        )
                      }
                      onCancel={() =>
                        runAction(`cancel-${item.appointment.appointmentId}`, () =>
                          queueCancel(clinicId, item.appointment.appointmentId)
                        )
                      }
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No patients waiting.</p>
              )}
            </CardContent>
          </Card>

          {/* Upcoming (not yet checked in) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Upcoming — Check In ({snapshot?.upcoming.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {snapshot && snapshot.upcoming.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {snapshot.upcoming.map((item) => (
                    <UpcomingCard
                      key={item.appointment.appointmentId}
                      item={item}
                      canManage={canManage}
                      busy={busy}
                      onCheckIn={(priority) =>
                        runAction(`checkin-${item.appointment.appointmentId}`, () =>
                          queueCheckIn(clinicId, item.appointment.appointmentId, priority)
                        )
                      }
                      onCancel={() =>
                        runAction(`cancel-${item.appointment.appointmentId}`, () =>
                          queueCancel(clinicId, item.appointment.appointmentId)
                        )
                      }
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No upcoming appointments.</p>
              )}
            </CardContent>
          </Card>

          {/* Completed */}
          {snapshot && snapshot.completed.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Completed Today ({snapshot.completed.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {snapshot.completed.slice(0, 24).map((item) => (
                    <span
                      key={item.appointment.appointmentId}
                      className="inline-flex items-center gap-1 rounded-full border bg-muted px-3 py-1 text-xs"
                    >
                      #{item.appointment.tokenNumber} {item.patientName}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Settings dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Queue Notification Settings</DialogTitle>
            <DialogDescription>
              Choose which alerts are sent automatically and via which channel.
            </DialogDescription>
          </DialogHeader>
          {settings && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Enabled alerts</p>
                {QUEUE_STAGES.map((stage) => (
                  <label key={stage} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={settings.enabledStages.includes(stage)}
                      onChange={() => toggleStage(stage)}
                    />
                    {STAGE_LABELS[stage]}
                  </label>
                ))}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Channel</p>
                <Select
                  value={settings.channel}
                  onValueChange={(v) =>
                    setSettings({ ...settings, channel: (v ?? "whatsapp") as QueueSettings["channel"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="push">Push</SelectItem>
                    <SelectItem value="in_app">In-App</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveSettings}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notifications history dialog */}
      <Dialog open={notifOpen} onOpenChange={setNotifOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Notification History</DialogTitle>
            <DialogDescription>Recent queue + appointment notifications.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {(notifications as Array<Record<string, unknown>>).length === 0 ? (
              <p className="text-sm text-muted-foreground">No notifications yet.</p>
            ) : (
              (notifications as Array<Record<string, unknown>>).map((n, i) => (
                <div key={i} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{(n.stage as string) ?? n.action}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {String(n.channel ?? "whatsapp")} · {String(n.status)}
                    </span>
                  </div>
                  <p className="mt-1">{String(n.message ?? "")}</p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reschedule dialog */}
      <Dialog open={!!rescheduleTarget} onOpenChange={(o) => !o && setRescheduleTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
            <DialogDescription>
              Move this token to a new date/time. It will leave the current queue.
            </DialogDescription>
          </DialogHeader>
          {rescheduleTarget && (
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">New date</p>
                <Input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">New time</p>
                <Input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleTarget(null)}>
              Cancel
            </Button>
            <Button onClick={submitReschedule}>Reschedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "warning";
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p
          className={`mt-1 text-2xl font-bold ${
            tone === "warning" ? "text-amber-600" : ""
          }`}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function QueueBadge({ status }: { status: AppointmentQueueStatus | null }) {
  if (!status) return <Badge variant="outline">Scheduled</Badge>;
  const map: Record<string, { label: string; tone: "default" | "secondary" | "outline" | "destructive" }> = {
    checked_in: { label: "Checked In", tone: "default" },
    waiting: { label: "Waiting", tone: "default" },
    called: { label: "Called", tone: "secondary" },
    in_consultation: { label: "In Consultation", tone: "secondary" },
    completed: { label: "Completed", tone: "outline" },
    no_show: { label: "No Show", tone: "destructive" },
    cancelled: { label: "Cancelled", tone: "destructive" },
    skipped: { label: "Skipped", tone: "destructive" },
    rescheduled: { label: "Rescheduled", tone: "default" },
  };
  const s = map[status] ?? { label: status, tone: "default" as const };
  return <Badge variant={s.tone}>{s.label}</Badge>;
}

function PatientCard({
  item,
  canManage,
  busy,
  onStart,
  onComplete,
  onSkip,
  onNoShow,
  onCancel,
}: {
  item: QueueItem;
  canManage: boolean;
  busy: string | null;
  onStart: () => void;
  onComplete: () => void;
  onSkip: () => void;
  onNoShow: () => void;
  onCancel: () => void;
}) {
  const st = item.appointment.queueStatus;
  const id = item.appointment.appointmentId;
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl font-bold">#{item.appointment.tokenNumber}</span>
          {item.appointment.priority && (
            <Badge variant="secondary">
              <Star className="mr-1 size-3" /> Priority
            </Badge>
          )}
          <QueueBadge status={st} />
        </div>
      </div>
      <p className="mt-2 text-lg font-semibold">{item.patientName}</p>
      <p className="text-sm text-muted-foreground">
        {item.doctorName} · {formatTime(item.appointment.time)}
        {item.patientPhone ? ` · ${item.patientPhone}` : ""}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {canManage && st === "called" && (
          <Button disabled={busy === `start-${id}`} onClick={onStart}>
            <UserCheck className="mr-2 size-4" /> Start Consultation
          </Button>
        )}
        {canManage && st === "in_consultation" && (
          <Button disabled={busy === `complete-${id}`} onClick={onComplete}>
            <CheckCircle2 className="mr-2 size-4" /> Complete
          </Button>
        )}
        {canManage && (
          <>
            <Button variant="outline" disabled={busy === `skip-${id}`} onClick={onSkip}>
              <SkipForward className="mr-2 size-4" /> Skip
            </Button>
            <Button variant="outline" disabled={busy === `noshow-${id}`} onClick={onNoShow}>
              <PhoneOff className="mr-2 size-4" /> No Show
            </Button>
            <Button variant="outline" disabled={busy === `cancel-${id}`} onClick={onCancel}>
              <XCircle className="mr-2 size-4" /> Cancel
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function WaitingCard({
  item,
  canManage,
  busy,
  onSkip,
  onRecall,
  onComplete,
  onNoShow,
  onCancel,
}: {
  item: QueueItem;
  canManage: boolean;
  busy: string | null;
  onSkip: () => void;
  onRecall: () => void;
  onComplete: () => void;
  onNoShow: () => void;
  onCancel: () => void;
}) {
  const id = item.appointment.appointmentId;
  const skipped = item.appointment.queueStatus === "skipped";
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <span className="text-xl font-bold">#{item.appointment.tokenNumber}</span>
        {item.appointment.priority && (
          <Badge variant="secondary">
            <Star className="mr-1 size-3" /> P
          </Badge>
        )}
        <QueueBadge status={item.appointment.queueStatus} />
      </div>
      <p className="mt-1 font-medium">{item.patientName}</p>
      <p className="text-xs text-muted-foreground">
        {item.doctorName} · {formatTime(item.appointment.time)}
      </p>
      {canManage && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {skipped ? (
            <Button size="sm" variant="outline" disabled={busy === `recall-${id}`} onClick={onRecall}>
              <RotateCcw className="mr-1 size-3" /> Recall
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled={busy === `skip-${id}`} onClick={onSkip}>
              <SkipForward className="mr-1 size-3" /> Skip
            </Button>
          )}
          <Button size="sm" variant="outline" disabled={busy === `complete-${id}`} onClick={onComplete}>
            <CheckCircle2 className="mr-1 size-3" /> Done
          </Button>
          <Button size="sm" variant="outline" disabled={busy === `noshow-${id}`} onClick={onNoShow}>
            <PhoneOff className="mr-1 size-3" /> NS
          </Button>
          <Button size="sm" variant="outline" disabled={busy === `cancel-${id}`} onClick={onCancel}>
            <XCircle className="mr-1 size-3" /> X
          </Button>
        </div>
      )}
    </div>
  );
}

function UpcomingCard({
  item,
  canManage,
  busy,
  onCheckIn,
  onCancel,
}: {
  item: QueueItem;
  canManage: boolean;
  busy: string | null;
  onCheckIn: (priority: boolean) => void;
  onCancel: () => void;
}) {
  const id = item.appointment.appointmentId;
  const [priority, setPriority] = useState(false);
  return (
    <div className="rounded-lg border p-3">
      <p className="font-medium">{item.patientName}</p>
      <p className="text-xs text-muted-foreground">
        {item.doctorName} · {formatTime(item.appointment.time)}
      </p>
      {canManage && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <label className="flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              checked={priority}
              onChange={(e) => setPriority(e.target.checked)}
            />
            Priority
          </label>
          <Button size="sm" disabled={busy === `checkin-${id}`} onClick={() => onCheckIn(priority)}>
            <UserCheck className="mr-1 size-3" /> Check In
          </Button>
          <Button size="sm" variant="outline" disabled={busy === `cancel-${id}`} onClick={onCancel}>
            <XCircle className="mr-1 size-3" /> Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
