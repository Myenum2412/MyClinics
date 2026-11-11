"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRequireRole, sessionCan } from "@/hooks/use-clinic-session";
import {
  getClinicWhatsappSession,
  connectClinicWhatsapp,
  disconnectClinicWhatsapp,
  getClinicSettings,
  updateClinicSettings,
} from "@/lib/clinic-api";
import type {
  ClinicWhatsappSession,
  ClinicSettings,
} from "@/lib/clinic-api";
import { DROPDOWN_OPTION_DEFS, useDropdownOptions } from "@/lib/dropdown-options";
import { formatTimeOnly } from "@/lib/datetime";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { WhatsappIcon } from "@/components/ui/svgs/whatsappIcon";
import { GoogleCalendar } from "@/components/ui/svgs/googleCalendar";
import { Razorpay } from "@/components/ui/svgs/razorpay";
import { Drive } from "@/components/ui/svgs/drive";
import { GoogleIcon } from "@/components/clinic/google-business-connect-card";
import {
  ListPlus,
  Pencil,
  Plus,
  Trash2,
  X,
  MessageSquare,
  Receipt,
  Sliders,
  UploadCloud,
  QrCode,
  Blocks,
  Check,
  Search,
  ExternalLink,
  Sparkles,
} from "lucide-react";

function MetaIcon({ className }: { className?: string }) {
  return (
    <svg preserveAspectRatio="xMidYMid" viewBox="0 0 256 171" className={className}>
      <defs>
        <linearGradient id="meta_settings_a" x1="13.878%" x2="89.144%" y1="55.934%" y2="58.694%">
          <stop offset="0%" stopColor="#0064E1"/>
          <stop offset="40%" stopColor="#0064E1"/>
          <stop offset="83%" stopColor="#0073EE"/>
          <stop offset="100%" stopColor="#0082FB"/>
        </linearGradient>
        <linearGradient id="meta_settings_b" x1="54.315%" x2="54.315%" y1="82.782%" y2="39.307%">
          <stop offset="0%" stopColor="#0082FB"/>
          <stop offset="100%" stopColor="#0064E0"/>
        </linearGradient>
      </defs>
      <path fill="#0081FB" d="M27.651 112.136c0 9.775 2.146 17.28 4.95 21.82 3.677 5.947 9.16 8.466 14.751 8.466 7.211 0 13.808-1.79 26.52-19.372 10.185-14.092 22.186-33.874 30.26-46.275l13.675-21.01c9.499-14.591 20.493-30.811 33.1-41.806C161.196 4.985 172.298 0 183.47 0c18.758 0 36.625 10.87 50.3 31.257C248.735 53.584 256 81.707 256 110.729c0 17.253-3.4 29.93-9.187 39.946-5.591 9.686-16.488 19.363-34.818 19.363v-27.616c15.695 0 19.612-14.422 19.612-30.927 0-23.52-5.484-49.623-17.564-68.273-8.574-13.23-19.684-21.313-31.907-21.313-13.22 0-23.859 9.97-35.815 27.75-6.356 9.445-12.882 20.956-20.208 33.944l-8.066 14.289c-16.203 28.728-20.307 35.271-28.408 46.07-14.2 18.91-26.324 26.076-42.287 26.076-18.935 0-30.91-8.2-38.325-20.556C2.973 139.413 0 126.202 0 111.148l27.651.988Z"/>
      <path fill="url(#meta_settings_a)" d="M21.802 33.206C34.48 13.666 52.774 0 73.757 0 85.91 0 97.99 3.597 110.605 13.897c13.798 11.261 28.505 29.805 46.853 60.368l6.58 10.967c15.881 26.459 24.917 40.07 30.205 46.49 6.802 8.243 11.565 10.7 17.752 10.7 15.695 0 19.612-14.422 19.612-30.927l24.393-.766c0 17.253-3.4 29.93-9.187 39.946-5.591 9.686-16.488 19.363-34.818 19.363-11.395 0-21.49-2.475-32.654-13.007-8.582-8.083-18.615-22.443-26.334-35.352l-22.96-38.352C118.528 64.08 107.96 49.73 101.845 43.23c-6.578-6.988-15.036-15.428-28.532-15.428-10.923 0-20.2 7.666-27.963 19.39L21.802 33.206Z"/>
      <path fill="url(#meta_settings_b)" d="M73.312 27.802c-10.923 0-20.2 7.666-27.963 19.39-10.976 16.568-17.698 41.245-17.698 64.944 0 9.775 2.146 17.28 4.95 21.82L9.027 149.482C2.973 139.413 0 126.202 0 111.148 0 83.772 7.514 55.24 21.802 33.206 34.48 13.666 52.774 0 73.757 0l-.445 27.802Z"/>
    </svg>
  );
}

// The QR itself only rotates every ~20-60s (WhatsApp's own protocol); polling every second just
// adds request churn and increases the odds of catching a transient gap between rotations.
const WHATSAPP_POLL_MS = 4_000;
// Once the session is connected/stable there is nothing to watch for, so back off.
const WHATSAPP_IDLE_POLL_MS = 30_000;

/** Deep links that open the saved UPI ID in the user's payment app. */
function upiAppLinks(upiId: string): { label: string; href: string }[] {
  const query = `pa=${encodeURIComponent(upiId)}&cu=INR`;
  return [
    { label: "Any UPI App", href: `upi://pay?${query}` },
    { label: "Google Pay", href: `tez://upi/pay?${query}` },
    { label: "PhonePe", href: `phonepe://pay?${query}` },
    { label: "Paytm", href: `paytmmp://pay?${query}` },
  ];
}

const STAGE_LABEL: Record<string, string> = {
  unconfigured: "Not connected yet — link this clinic's WhatsApp number",
  idle: "Starting…",
  qr: "Scan the QR below to connect WhatsApp",
  authenticated: "Authenticated — preparing…",
  ready: "Connected — notifications are active",
  disconnected: "Disconnected — press Connect to go back online",
  error: "Connection error — if your phone showed 'Can't Link New Devices right now', remove a linked device (WhatsApp → Settings → Linked devices, max 4), update WhatsApp, wait 1 min, then scan a fresh QR within 20s",
};

export default function SettingsPage() {
  const session = useRequireRole("staff");
  const canEdit = sessionCan(session, "clinic_admin");

  const [activeTab, setActiveTab] = useState<"integrations" | "whatsapp" | "billing" | "dropdowns">("integrations");
  const [searchQuery, setSearchQuery] = useState("");
  const [waDialogOpen, setWaDialogOpen] = useState(false);
  const [calendarSync, setCalendarSync] = useState(true);
  const [driveSync, setDriveSync] = useState(true);

  const [loading, setLoading] = useState(true);

  const [waSession, setWaSession] = useState<ClinicWhatsappSession | null>(null);
  const [waLoading, setWaLoading] = useState(true);
  const [waAction, setWaAction] = useState<"connect" | "disconnect" | "logout" | null>(null);
  // Keeps the last QR on screen across polls instead of flashing to a "Generating…" placeholder
  // whenever a poll lands in the brief gap between one QR expiring and the next being issued.
  const lastQrRef = useRef<ClinicWhatsappSession["qr"] | null>(null);
  if (waSession?.qr) lastQrRef.current = waSession.qr;
  const displayQr = waSession?.qr ?? lastQrRef.current;
  const [aiAgentEnabled, setAiAgentEnabled] = useState(true);
  const [aiAgentSaving, setAiAgentSaving] = useState(false);

  // General settings state
  const [settings, setSettings] = useState<ClinicSettings | null>(null);
  const [gstinDraft, setGstinDraft] = useState("");
  const [udyamDraft, setUdyamDraft] = useState("");
  const [upiIdDraft, setUpiIdDraft] = useState("");
  const [termsDraft, setTermsDraft] = useState("");
  const [qrCodeDraft, setQrCodeDraft] = useState("");
  const [savingBilling, setSavingBilling] = useState(false);
  /** Toggled by clicking the "UPI Payment QR Code" heading — reveals app deep links. */
  const [showUpiAppLinks, setShowUpiAppLinks] = useState(false);
  /** false = read-only view of the saved details; true = editable form. */
  const [billingEditing, setBillingEditing] = useState(false);

  useEffect(() => {
    if (!session?.clinicId) return;

    getClinicSettings(session.clinicId)
      .catch((err) => {
        console.error(err);
        return null;
      })
      .then((settingsRes) => {
        if (settingsRes) {
          setSettings(settingsRes);
          setGstinDraft(settingsRes.gstin ?? "");
          setUdyamDraft(settingsRes.udyam ?? "");
          setUpiIdDraft(settingsRes.upiId ?? "");
          setTermsDraft(settingsRes.termsAndConditions ?? "");
          setQrCodeDraft(settingsRes.qrCodeUrl ?? "");
          setBillingEditing(false);
          setAiAgentEnabled((settingsRes as any).aiAgentEnabled ?? true);
        } else {
          // Nothing saved yet — start straight in edit mode.
          setBillingEditing(true);
        }
      })
      .finally(() => setLoading(false));
  }, [session?.clinicId]);

  const pollWhatsapp = useCallback(async (clinicId: string) => {
    try {
      const res = await getClinicWhatsappSession(clinicId);
      setWaSession(res);
      if (process.env.NODE_ENV !== "production") console.log("[WA]", res.stage, !!res.qr);
    } catch (e) {
      console.error("[WA] poll failed", e);
      setWaSession(null);
    } finally {
      setWaLoading(false);
    }
  }, []);

  // Latest session snapshot, read by the poll scheduler without re-arming the
  // effect on every poll (which would reset the backoff timer each time).
  const waSessionRef = useRef(waSession);
  useEffect(() => {
    waSessionRef.current = waSession;
  }, [waSession]);

  useEffect(() => {
    const clinicId = session?.clinicId;
    if (!clinicId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = () => {
      if (cancelled) return;
      const stage = waSessionRef.current?.stage;
      // Poll quickly only while the user is waiting on a QR / connection;
      // otherwise back off. Hidden tabs are skipped entirely and re-synced on
      // focus, so a backgrounded settings tab stops generating traffic.
      const waiting =
        stage === "qr" ||
        stage === "authenticated" ||
        stage === "unconfigured" ||
        stage === "idle" ||
        stage === "disconnected";
      const delay = waiting ? WHATSAPP_POLL_MS : WHATSAPP_IDLE_POLL_MS;
      timer = setTimeout(tick, delay);
    };

    const tick = async () => {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.hidden) {
        schedule();
        return;
      }
      await pollWhatsapp(clinicId);
      schedule();
    };

    const onVisibility = () => {
      if (!cancelled && typeof document !== "undefined" && !document.hidden) {
        void pollWhatsapp(clinicId);
      }
    };

    void tick();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pollWhatsapp, session?.clinicId]);

  // Auto-show QR: if clinic has no whatsapp session (unconfigured/disconnected), auto-trigger connect
  const autoConnectTried = useRef(false);
  const lastConnectAt = useRef(0);
  useEffect(() => {
    if (!session?.clinicId || !canEdit || waLoading) return;
    const s = waSession?.stage;
    const hasQr = !!waSession?.qr;
    // First try
    if (!autoConnectTried.current && (s === "unconfigured" || s === "disconnected")) {
      autoConnectTried.current = true;
      lastConnectAt.current = Date.now();
      void handleConnect();
      return;
    }
    // Auto-retry if stuck on idle/qr-less for >15s (worker may have not emitted qr yet) — the
    // worker itself can take 10-15s to start, so retrying sooner just fights its own startup.
    if (hasQr || waSession?.connected) return;
    if (s === "idle" || s === "unconfigured" || s === "disconnected" || s === "error") {
      if (Date.now() - lastConnectAt.current > 15_000 && waAction === null) {
        lastConnectAt.current = Date.now();
        void handleConnect();
      }
    }
  }, [session?.clinicId, canEdit, waLoading, waSession?.stage, waSession?.qr, waAction]);

  async function handleConnect() {
    if (!session?.clinicId) return;
    setWaAction("connect");
    try {
      await connectClinicWhatsapp(session.clinicId);
      toast.success("Connecting… scan the QR with your phone in a few seconds.");
      await pollWhatsapp(session.clinicId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start connection");
    } finally {
      setWaAction(null);
    }
  }

  async function handleDisconnect(logout: boolean) {
    if (!session?.clinicId) return;
    setWaAction(logout ? "logout" : "disconnect");
    try {
      await disconnectClinicWhatsapp(session.clinicId, logout);
      lastQrRef.current = null;
      toast.success(
        logout
          ? "WhatsApp disconnected and unlinked. Connect again to re-pair."
          : "WhatsApp disconnected."
      );
      await pollWhatsapp(session.clinicId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to disconnect");
    } finally {
      setWaAction(null);
    }
  }

  async function handleSaveBilling(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.clinicId) return;
    setSavingBilling(true);
    try {
      const updated = await updateClinicSettings(session.clinicId, {
        gstin: gstinDraft.trim() || null,
        udyam: udyamDraft.trim() || null,
        termsAndConditions: termsDraft.trim() || null,
        upiId: upiIdDraft.trim() || null,
        qrCodeUrl: qrCodeDraft || null,
      });
      setSettings(updated);
      toast.success("Billing settings saved successfully");
      setBillingEditing(false);
    } catch (err) {
      console.error("Failed to save billing settings", err);
      const detail =
        err instanceof Error && err.message
          ? err.message
          : "Failed to save billing settings";
      toast.error(`Billing settings could not be saved: ${detail}`);
    } finally {
      setSavingBilling(false);
    }
  }

  const handleQrCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG/JPG)");
      return;
    }
    if (file.size > 150 * 1024) {
      toast.error("QR Code image must be smaller than 150 KB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setQrCodeDraft(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const stage = waSession?.stage ?? "unconfigured";
  const connected = waSession?.connected === true;

  const {
    getOptions,
    addOption,
    removeOption,
    loading: dropdownsLoading,
  } = useDropdownOptions(session?.clinicId ?? "");

  const [dropdownDrafts, setDropdownDrafts] = useState<Record<string, string>>({});
  const [dropdownSaving, setDropdownSaving] = useState<Record<string, boolean>>({});

  async function handleAddOption(key: string) {
    const value = (dropdownDrafts[key] ?? "").trim();
    if (!value) return;
    setDropdownSaving((s) => ({ ...s, [key]: true }));
    try {
      const added = await addOption(key, value);
      if (added) {
        toast.success(`Added "${value}"`);
        setDropdownDrafts((d) => ({ ...d, [key]: "" }));
      } else {
        toast.error("This option already exists");
      }
    } catch {
      /* toast handled in hook */
    } finally {
      setDropdownSaving((s) => ({ ...s, [key]: false }));
    }
  }

  async function handleRemoveOption(key: string, value: string) {
    setDropdownSaving((s) => ({ ...s, [key]: true }));
    try {
      await removeOption(key, value);
      toast.success(`Removed "${value}"`);
    } catch {
      /* toast handled in hook */
    } finally {
      setDropdownSaving((s) => ({ ...s, [key]: false }));
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground font-sans sm:text-2xl">Settings</h2>
        <p className="text-xs text-muted-foreground mt-1 sm:text-sm">
          Manage your clinic's integrations, billing variables, and dropdown lists.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-1 overflow-x-auto sm:gap-2">
        <button
          onClick={() => setActiveTab("integrations")}
          className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2.5 font-semibold text-xs transition-all border-b-2 -mb-[2px] sm:gap-2 sm:px-4 sm:text-sm ${
            activeTab === "integrations" || (activeTab as string) === "whatsapp"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Blocks className="size-4 shrink-0" />
          Integrations
        </button>
        <button
          onClick={() => setActiveTab("billing")}
          className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2.5 font-semibold text-xs transition-all border-b-2 -mb-[2px] sm:gap-2 sm:px-4 sm:text-sm ${
            activeTab === "billing"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Receipt className="size-4 shrink-0" />
          Billing Settings
        </button>
        <button
          onClick={() => setActiveTab("dropdowns")}
          className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2.5 font-semibold text-xs transition-all border-b-2 -mb-[2px] sm:gap-2 sm:px-4 sm:text-sm ${
            activeTab === "dropdowns"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sliders className="size-4 shrink-0" />
          Dropdown Options
        </button>
      </div>

      {/* Tab content */}
      <div className="grid gap-4">
        {(activeTab === "integrations" || (activeTab as string) === "whatsapp") && (() => {
          const integrationsList = [
            {
              id: "whatsapp",
              name: "WhatsApp Business",
              category: "Messaging & AI Bot",
              description:
                "Send appointment confirmations, reminders, prescriptions, and AI assistant replies straight to your patient's chat.",
              icon: <WhatsappIcon className="size-6" />,
              connected: connected,
              connectedLabel: waSession?.phone ? `+${waSession.phone}` : "Connected",
              actions: (
                <div className="flex items-center gap-2">
                  {connected && (
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1 text-xs">
                      <span className="text-[11px] text-muted-foreground font-medium">AI Bot</span>
                      <Switch
                        checked={aiAgentEnabled}
                        disabled={!canEdit || aiAgentSaving}
                        onCheckedChange={async (v) => {
                          if (!session?.clinicId) return;
                          setAiAgentSaving(true);
                          const prev = aiAgentEnabled;
                          setAiAgentEnabled(v);
                          try {
                            const updated = await updateClinicSettings(session.clinicId, { aiAgentEnabled: v } as any);
                            setSettings(updated);
                            toast.success(v ? "AI Agent enabled" : "AI Agent disabled");
                          } catch (e) {
                            setAiAgentEnabled(prev);
                            toast.error(e instanceof Error ? e.message : "Failed to update");
                          } finally {
                            setAiAgentSaving(false);
                          }
                        }}
                      />
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant={connected ? "outline" : "default"}
                    onClick={() => {
                      setWaDialogOpen(true);
                      if (!connected && !displayQr && canEdit) {
                        void handleConnect();
                      }
                    }}
                  >
                    {connected ? "Manage WhatsApp" : "Connect WhatsApp"}
                  </Button>
                </div>
              ),
            },
            {
              id: "google-business",
              name: "Google Business Profile",
              category: "Local Presence & Maps",
              description:
                "Sync verified clinic profile, address, operating hours, phone, and reviews directly from Google Maps.",
              icon: <GoogleIcon className="size-5" />,
              connected: Boolean(settings?.googleBusinessUrl || (settings as any)?.profile?.googleBusinessUrl),
              connectedLabel: "Connected",
              actions: (
                <Button size="sm" variant="outline" asChild>
                  <Link href="/clinic/account">
                    Manage in Account
                    <ExternalLink className="size-3 ml-1" />
                  </Link>
                </Button>
              ),
            },
            {
              id: "meta-business",
              name: "Meta Business",
              category: "Lead Ads & CRM",
              description:
                "Automatically ingest patient leads from Facebook and Instagram Lead Ads directly into clinic CRM contacts.",
              icon: <MetaIcon className="size-5" />,
              connected: false,
              actions: (
                <Button size="sm" variant="outline" asChild>
                  <Link href="/clinic/crm/contacts">
                    Connect Meta
                    <ExternalLink className="size-3 ml-1" />
                  </Link>
                </Button>
              ),
            },
            {
              id: "upi-payments",
              name: "Razorpay & UPI Payments",
              category: "Billing & Payments",
              description:
                "Accept consultation fees and treatment payments with instant clinic UPI QR code and deep links.",
              icon: <Razorpay className="size-6" />,
              connected: Boolean(settings?.upiId),
              connectedLabel: settings?.upiId ? settings.upiId : "Configured",
              actions: (
                <Button
                  size="sm"
                  variant={settings?.upiId ? "outline" : "default"}
                  onClick={() => setActiveTab("billing")}
                >
                  {settings?.upiId ? "Edit UPI" : "Set up UPI"}
                </Button>
              ),
            },
            {
              id: "google-calendar",
              name: "Google Calendar",
              category: "Scheduling",
              description:
                "Two-way sync so every booked appointment lands on the doctor's personal calendar in real-time.",
              icon: <GoogleCalendar className="size-6" />,
              connected: calendarSync,
              connectedLabel: "Active",
              actions: (
                <Switch
                  checked={calendarSync}
                  onCheckedChange={setCalendarSync}
                  aria-label="Toggle Google Calendar sync"
                />
              ),
            },
            {
              id: "google-drive",
              name: "Google Drive Backup",
              category: "Storage",
              description:
                "Encrypted automated cloud backups for dental charts, prescription records, and patient files.",
              icon: <Drive className="size-6" />,
              connected: driveSync,
              connectedLabel: "Active",
              actions: (
                <Switch
                  checked={driveSync}
                  onCheckedChange={setDriveSync}
                  aria-label="Toggle Google Drive sync"
                />
              ),
            },
          ];

          const normalizedSearch = searchQuery.trim().toLowerCase();
          const filteredIntegrations = integrationsList.filter(
            (item) =>
              item.name.toLowerCase().includes(normalizedSearch) ||
              item.category.toLowerCase().includes(normalizedSearch) ||
              item.description.toLowerCase().includes(normalizedSearch)
          );

          return (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Clinic Integrations</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Connect third-party apps and communication tools to run your clinic without duplicate entry.
                  </p>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search integrations..."
                    className="h-9 w-full bg-background pl-9 text-xs"
                  />
                </div>
              </div>

              {/* List of Integrations matching @7ovr/integrations-4 design */}
              {filteredIntegrations.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {filteredIntegrations.map((item) => (
                    <Card
                      key={item.id}
                      className={cn(
                        "w-full gap-0 py-0 transition-colors shadow-xs",
                        item.connected && "border-primary/40 bg-primary/[0.02]"
                      )}
                    >
                      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-6">
                        <div className="flex min-w-0 items-center gap-3 sm:w-64 sm:shrink-0">
                          <span
                            className={cn(
                              "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-foreground transition-colors",
                              item.connected && "border-primary/30 bg-primary/10 text-primary"
                            )}
                          >
                            {item.icon}
                          </span>
                          <div className="min-w-0">
                            <CardTitle className="truncate text-sm font-semibold">{item.name}</CardTitle>
                            <CardDescription className="mt-0.5 text-xs text-muted-foreground">{item.category}</CardDescription>
                          </div>
                        </div>

                        <p className="min-w-0 flex-1 text-xs text-muted-foreground sm:text-sm">
                          {item.description}
                        </p>

                        <div className="flex shrink-0 flex-wrap items-center gap-2.5 sm:justify-end">
                          {item.connected ? (
                            <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-primary/20 gap-1 text-xs font-normal">
                              <Check className="size-3 text-primary" />
                              {item.connectedLabel || "Connected"}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground text-xs font-normal">
                              Not connected
                            </Badge>
                          )}

                          {item.actions}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-background/60 px-6 py-12 text-center">
                  <p className="text-sm text-muted-foreground">
                    No integrations found for “{searchQuery.trim()}”.
                  </p>
                </div>
              )}

              {/* WhatsApp Pairing & Settings Dialog */}
              <Dialog open={waDialogOpen} onOpenChange={setWaDialogOpen}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-md bg-[#25D366]/15">
                        <WhatsappIcon className="size-5" />
                      </div>
                      <div>
                        <DialogTitle className="text-base">WhatsApp Business Connection</DialogTitle>
                        <DialogDescription className="text-xs">
                          Pair your clinic&apos;s WhatsApp Business number with MyClinics.
                        </DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>

                  <div className="py-2">
                    {waLoading ? (
                      <div className="flex flex-col items-center gap-3 py-8">
                        <Skeleton className="h-48 w-48 rounded-lg" />
                      </div>
                    ) : connected ? (
                      <div className="flex flex-col items-center gap-3 py-4 text-center">
                        <span className="flex size-14 items-center justify-center rounded-full bg-success/10 text-2xl">
                          ✅
                        </span>
                        <p className="font-semibold text-success">WhatsApp is connected</p>
                        {waSession?.phone && (
                          <p className="text-sm font-mono text-muted-foreground font-medium">
                            +{waSession.phone}
                          </p>
                        )}
                        <p className="max-w-xs text-xs text-muted-foreground leading-relaxed">
                          Reminders, prescriptions, reports and AI assistant replies for your patients are sent from this number.
                        </p>

                        <div className="w-full rounded-lg border border-border bg-muted/30 p-3 text-left space-y-2 mt-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-medium text-foreground">WhatsApp AI Agent</p>
                              <p className="text-[11px] text-muted-foreground">Auto-reply to patient queries 24/7</p>
                            </div>
                            <Switch
                              checked={aiAgentEnabled}
                              disabled={!canEdit || aiAgentSaving}
                              onCheckedChange={async (v) => {
                                if (!session?.clinicId) return;
                                setAiAgentSaving(true);
                                const prev = aiAgentEnabled;
                                setAiAgentEnabled(v);
                                try {
                                  const updated = await updateClinicSettings(session.clinicId, { aiAgentEnabled: v } as any);
                                  setSettings(updated);
                                  toast.success(v ? "AI Agent enabled" : "AI Agent disabled");
                                } catch (e) {
                                  setAiAgentEnabled(prev);
                                  toast.error(e instanceof Error ? e.message : "Failed to update");
                                } finally {
                                  setAiAgentSaving(false);
                                }
                              }}
                            />
                          </div>
                        </div>

                        {canEdit && (
                          <div className="flex w-full flex-col gap-2 pt-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full justify-center"
                              disabled={waAction !== null}
                              onClick={() => void handleDisconnect(false)}
                            >
                              {waAction === "disconnect" ? "Disconnecting…" : "Disconnect"}
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="w-full justify-center"
                              disabled={waAction !== null}
                              onClick={() => void handleDisconnect(true)}
                            >
                              {waAction === "logout" ? "Removing…" : "Remove & unlink device"}
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : displayQr ? (
                      <div className="flex flex-col items-center gap-3 py-2 text-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={displayQr.dataUrl}
                          alt="WhatsApp Web QR code"
                          width={240}
                          height={240}
                          className="h-auto w-full max-w-[240px] rounded-lg border border-border bg-background p-2"
                        />
                        <p className="max-w-xs text-xs text-muted-foreground leading-relaxed">
                          Open <strong>WhatsApp Business</strong> on your clinic phone → <strong>Settings</strong> → <strong>Linked devices</strong> → <strong>Link a device</strong>, then scan this QR.
                        </p>
                        {canEdit && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={waAction !== null}
                            onClick={() => void handleConnect()}
                          >
                            Generate a new QR
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-4 py-8 text-center">
                        <div className="flex aspect-square size-40 items-center justify-center rounded-lg border border-dashed border-border bg-muted/20">
                          {stage === "error" ? (
                            <QrCode className="size-10 text-muted-foreground/50" />
                          ) : (
                            <span className="size-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary inline-block" />
                          )}
                        </div>
                        <p className="max-w-xs text-xs text-muted-foreground">
                          {stage === "error"
                            ? "WhatsApp is temporarily unavailable. Please try again."
                            : stage === "idle"
                              ? "Starting connection…"
                              : "Generating pairing QR code…"}
                        </p>
                        {canEdit && (
                          <Button
                            type="button"
                            size="sm"
                            disabled={waAction !== null}
                            onClick={() => void handleConnect()}
                          >
                            {waAction === "connect" ? "Starting…" : stage === "error" ? "Try again" : "Generate QR"}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          );
        })()}

        {activeTab === "billing" && (
          <Card>
            <CardHeader>
              <CardTitle>Billing & Invoice Settings</CardTitle>
              {canEdit && settings && !billingEditing && (
                <CardAction>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setBillingEditing(true)}
                  >
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>
                </CardAction>
              )}
            </CardHeader>
            <CardContent>
              {!billingEditing && settings ? (
                /* ── VIEW MODE — saved details ── */
                <div className="space-y-5">
                  <p className="text-sm text-muted-foreground">
                    These details are printed on every generated invoice PDF.
                  </p>
                  <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">GSTIN</dt>
                      <dd className="mt-0.5 text-sm font-medium text-foreground">{settings.gstin || "Not set"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Udyam Registration No.</dt>
                      <dd className="mt-0.5 text-sm font-medium text-foreground">{settings.udyam || "Not set"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">UPI ID (for payments)</dt>
                      <dd className="mt-0.5 text-sm font-medium text-foreground">{settings.upiId || "Not set"}</dd>
                    </div>
                    <div>
                      <dt>
                        {settings.qrCodeUrl && settings.upiId ? (
                          <button
                            type="button"
                            onClick={() => setShowUpiAppLinks((v) => !v)}
                            title="Click to show payment app links"
                            className="text-xs font-medium uppercase tracking-wide text-muted-foreground underline decoration-dotted underline-offset-4 transition hover:text-primary"
                          >
                            UPI Payment QR Code
                          </button>
                        ) : (
                          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            UPI Payment QR Code
                          </span>
                        )}
                      </dt>
                      <dd className="mt-1">
                        {settings.qrCodeUrl ? (
                          <div className="flex flex-col items-start gap-3">
                            <div className="flex min-h-48 min-w-48 items-center justify-center rounded-lg border border-border bg-background p-3">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={settings.qrCodeUrl}
                                alt="UPI QR code"
                                className="size-40 object-contain"
                              />
                            </div>
                            {showUpiAppLinks && settings.upiId && (
                              <div className="flex flex-wrap gap-1.5">
                                {upiAppLinks(settings.upiId).map((link) => (
                                  <a
                                    key={link.label}
                                    href={link.href}
                                    className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-primary transition hover:bg-accent"
                                  >
                                    {link.label}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Not uploaded</span>
                        )}
                      </dd>
                    </div>
                  </dl>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Invoice Terms &amp; Conditions</dt>
                    <dd className="mt-1 whitespace-pre-wrap rounded-lg border border-border bg-muted/20 p-3 text-sm text-foreground">
                      {settings.termsAndConditions || "Not set"}
                    </dd>
                  </div>
                </div>
              ) : (
                /* ── EDIT MODE ── */
                <form onSubmit={handleSaveBilling} className="space-y-4 sm:space-y-6">
                <p className="text-sm text-muted-foreground">
                  Configure the billing and payment details for this clinic. These values are printed on the generated invoice PDFs.
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="gstin">GSTIN</Label>
                    <Input
                      id="gstin"
                      value={gstinDraft}
                      placeholder="e.g. 33LEFPK7682L1ZR"
                      maxLength={15}
                      disabled={!canEdit}
                      onChange={(e) => setGstinDraft(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="udyam">Udyam Registration Number</Label>
                    <Input
                      id="udyam"
                      value={udyamDraft}
                      placeholder="e.g. UDYAM-TN-20-0172636"
                      maxLength={30}
                      disabled={!canEdit}
                      onChange={(e) => setUdyamDraft(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="upiId">UPI ID (for payments)</Label>
                  <Input
                    id="upiId"
                    value={upiIdDraft}
                    placeholder="e.g. payto@upi"
                    maxLength={100}
                    disabled={!canEdit}
                    onChange={(e) => setUpiIdDraft(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>UPI Payment QR Code</Label>
                  <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border p-4 bg-muted/20 sm:flex-row">
                    {qrCodeDraft ? (
                      <div className="relative flex flex-col items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={qrCodeDraft}
                          alt="QR code preview"
                          className="size-32 rounded-md border border-border bg-background p-1 object-contain"
                        />
                        {canEdit && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => setQrCodeDraft("")}
                          >
                            Remove QR Code
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground w-full">
                        <QrCode className="size-10 mb-2 text-muted-foreground" />
                        <p className="text-xs">No QR Code uploaded yet.</p>
                        <p className="text-xxs text-muted-foreground mt-1">PNG or JPG, max 150 KB</p>
                      </div>
                    )}

                    {canEdit && !qrCodeDraft && (
                      <div className="flex flex-col gap-2">
                        <Label
                          htmlFor="qr-file-upload"
                          className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
                        >
                          <UploadCloud className="size-4" />
                          Upload QR Code Image
                        </Label>
                        <input
                          id="qr-file-upload"
                          type="file"
                          accept="image/png, image/jpeg, image/jpg"
                          className="hidden"
                          onChange={handleQrCodeChange}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="terms">Invoice Terms & Conditions</Label>
                  <Textarea
                    id="terms"
                    value={termsDraft}
                    rows={6}
                    placeholder="Enter default invoice terms, payment rules, late fees..."
                    disabled={!canEdit}
                    onChange={(e) => setTermsDraft(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Shown at the bottom of the invoice PDF. Separate terms with a new line.
                  </p>
                </div>

                {canEdit && (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    {settings && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-center sm:w-auto"
                        disabled={savingBilling}
                        onClick={() => setBillingEditing(false)}
                      >
                        Cancel
                      </Button>
                    )}
                    <Button type="submit" className="w-full justify-center sm:w-auto" disabled={savingBilling}>
                      {savingBilling ? "Saving..." : "Save Billing Settings"}
                    </Button>
                  </div>
                )}
              </form>
            )}
            </CardContent>
          </Card>
        )}

        {activeTab === "dropdowns" && canEdit && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListPlus className="size-4.5 text-primary" />
                Dropdown Options
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Manage the options available in the dropdowns across the app. Add new values or
                remove existing ones — changes apply to every form and filter using that dropdown.
              </p>
              {dropdownsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  {DROPDOWN_OPTION_DEFS.map((def) => {
                    const values = getOptions(def.key);
                    const saving = dropdownSaving[def.key];
                    return (
                      <div key={def.key} className="rounded-xl border border-border p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-foreground">{def.label}</p>
                            {def.description && (
                              <p className="text-xs text-muted-foreground">{def.description}</p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {values.length} option{values.length === 1 ? "" : "s"}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {values.map((value) => (
                            <span
                              key={value}
                              className="inline-flex items-center gap-1 rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-800"
                            >
                              {value}
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => handleRemoveOption(def.key, value)}
                                aria-label={`Remove ${value}`}
                                className="text-primary transition hover:text-destructive"
                              >
                                <X className="size-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="mt-3 flex gap-2">
                          <Input
                            value={dropdownDrafts[def.key] ?? ""}
                            placeholder={`Add a new option...`}
                            className="h-8 min-w-0 flex-1 text-xs sm:max-w-xs sm:flex-none"
                            disabled={saving}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                void handleAddOption(def.key);
                              }
                            }}
                            onChange={(e) =>
                              setDropdownDrafts((d) => ({ ...d, [def.key]: e.target.value }))
                            }
                          />
                          <Button
                            size="sm"
                            className="h-8 shrink-0 gap-1 text-xs"
                            disabled={saving || !(dropdownDrafts[def.key] ?? "").trim()}
                            onClick={() => handleAddOption(def.key)}
                          >
                            {saving ? <Trash2 className="size-3.5" /> : <Plus className="size-3.5" />}
                            {saving ? "Saving..." : "Add"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}