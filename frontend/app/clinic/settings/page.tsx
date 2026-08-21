"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useRequireRole, sessionCan } from "@/hooks/use-clinic-session";
import {
  getSoul,
  updateSoul,
  getClinicWhatsappSession,
  connectClinicWhatsapp,
  disconnectClinicWhatsapp,
  getClinicSettings,
  updateClinicSettings,
} from "@/lib/clinic-api";
import type {
  SoulRecord,
  ClinicWhatsappSession,
  ClinicSettings,
} from "@/lib/clinic-api";
import { DROPDOWN_OPTION_DEFS, useDropdownOptions } from "@/lib/dropdown-options";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ListPlus,
  Plus,
  Trash2,
  X,
  MessageSquare,
  Receipt,
  Sliders,
  UploadCloud,
  QrCode,
} from "lucide-react";

const WHATSAPP_POLL_MS = 5_000;

const STAGE_LABEL: Record<string, string> = {
  unconfigured: "Not connected yet — link this clinic's WhatsApp number",
  idle: "Starting…",
  qr: "Scan the QR below to connect WhatsApp",
  authenticated: "Authenticated — preparing…",
  ready: "Connected — notifications are active",
  disconnected: "Disconnected — press Connect to go back online",
  error: "Connection error — try connecting again or check the server logs",
};

export default function SettingsPage() {
  const session = useRequireRole("staff");
  const canEdit = sessionCan(session, "clinic_admin");

  const [activeTab, setActiveTab] = useState<"whatsapp" | "billing" | "dropdowns">("whatsapp");

  const [soul, setSoul] = useState<SoulRecord | null>(null);
  const [soulDraft, setSoulDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingSoul, setSavingSoul] = useState(false);

  const [waSession, setWaSession] = useState<ClinicWhatsappSession | null>(null);
  const [waLoading, setWaLoading] = useState(true);
  const [waAction, setWaAction] = useState<"connect" | "disconnect" | "logout" | null>(null);

  // General settings state
  const [settings, setSettings] = useState<ClinicSettings | null>(null);
  const [gstinDraft, setGstinDraft] = useState("");
  const [udyamDraft, setUdyamDraft] = useState("");
  const [upiIdDraft, setUpiIdDraft] = useState("");
  const [termsDraft, setTermsDraft] = useState("");
  const [qrCodeDraft, setQrCodeDraft] = useState("");
  const [savingBilling, setSavingBilling] = useState(false);

  useEffect(() => {
    if (!session?.clinicId) return;

    Promise.all([
      getSoul().catch((err) => {
        console.error(err);
        return { soul: { content: "", version: 0, fallbackReply: "Unavailable" } } as any;
      }),
      getClinicSettings(session.clinicId).catch((err) => {
        console.error(err);
        return null;
      }),
    ])
      .then(([soulRes, settingsRes]) => {
        if (soulRes?.soul) {
          setSoul(soulRes.soul);
          setSoulDraft(soulRes.soul.content);
        }
        if (settingsRes) {
          setSettings(settingsRes);
          setGstinDraft(settingsRes.gstin ?? "");
          setUdyamDraft(settingsRes.udyam ?? "");
          setUpiIdDraft(settingsRes.upiId ?? "");
          setTermsDraft(settingsRes.termsAndConditions ?? "");
          setQrCodeDraft(settingsRes.qrCodeUrl ?? "");
        }
      })
      .finally(() => setLoading(false));
  }, [session?.clinicId]);

  const pollWhatsapp = useCallback(async (clinicId: string) => {
    try {
      const res = await getClinicWhatsappSession(clinicId);
      setWaSession(res);
    } catch {
      setWaSession(null);
    } finally {
      setWaLoading(false);
    }
  }, []);

  useEffect(() => {
    const clinicId = session?.clinicId;
    if (!clinicId) return;
    queueMicrotask(() => void pollWhatsapp(clinicId));
    const timer = setInterval(() => {
      void pollWhatsapp(clinicId);
    }, WHATSAPP_POLL_MS);
    return () => clearInterval(timer);
  }, [pollWhatsapp, session?.clinicId]);

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

  async function saveSoulMd(e: React.FormEvent) {
    e.preventDefault();
    setSavingSoul(true);
    try {
      const updated = await updateSoul(soulDraft);
      setSoul(updated.soul);
      setSoulDraft(updated.soul.content);
      toast.success("soul.md saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save soul.md");
    } finally {
      setSavingSoul(false);
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save billing settings");
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground font-sans">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your clinic's assistant configurations, billing variables, and dropdown lists.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-2">
        <button
          onClick={() => setActiveTab("whatsapp")}
          className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm transition-all border-b-2 -mb-[2px] ${
            activeTab === "whatsapp"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessageSquare className="size-4" />
          WhatsApp & AI
        </button>
        <button
          onClick={() => setActiveTab("billing")}
          className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm transition-all border-b-2 -mb-[2px] ${
            activeTab === "billing"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Receipt className="size-4" />
          Billing Settings
        </button>
        <button
          onClick={() => setActiveTab("dropdowns")}
          className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm transition-all border-b-2 -mb-[2px] ${
            activeTab === "dropdowns"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sliders className="size-4" />
          Dropdown Options
        </button>
      </div>

      {/* Tab content */}
      <div className="grid gap-4">
        {activeTab === "whatsapp" && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>WhatsApp connection</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4 text-center">
                {waLoading ? (
                  <Skeleton className="h-64 w-64" />
                ) : connected ? (
                  <>
                    <div className="flex flex-col items-center gap-3 py-8">
                      <span className="flex size-14 items-center justify-center rounded-full bg-success/10 text-2xl">
                        ✅
                      </span>
                      <p className="font-medium text-success">WhatsApp connected</p>
                      {waSession?.phone && (
                        <p className="text-sm font-mono text-muted-foreground">
                          +{waSession.phone}
                        </p>
                      )}
                      <p className="max-w-sm text-sm text-muted-foreground">
                        Appointment reminders, prescriptions and clinic notifications for YOUR
                        patients are sent from this number.
                      </p>
                    </div>
                    {canEdit && (
                      <div className="flex flex-wrap justify-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={waAction !== null}
                          onClick={() => void handleDisconnect(false)}
                        >
                          {waAction === "disconnect" ? "Disconnecting…" : "Disconnect"}
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          disabled={waAction !== null}
                          onClick={() => void handleDisconnect(true)}
                        >
                          {waAction === "logout"
                            ? "Removing…"
                            : "Remove & unlink device"}
                        </Button>
                      </div>
                    )}
                  </>
                ) : waSession?.qr ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={waSession.qr.dataUrl}
                      alt="WhatsApp Web QR code"
                      width={264}
                      height={264}
                      className="rounded-lg border border-border bg-background p-2"
                    />
                    <p className="max-w-sm text-sm font-medium text-primary">
                      Open WhatsApp on your phone → Settings → Linked devices → Link a device,
                      then scan this QR with THIS clinic&apos;s phone. QR refreshes every few
                      seconds.
                    </p>
                    {canEdit && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={waAction !== null}
                        onClick={() => void handleConnect()}
                      >
                        Generate a new QR
                      </Button>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <span className="flex size-14 items-center justify-center rounded-full bg-warning/10 text-2xl">
                      ⚠️
                    </span>
                    <p className="font-medium text-warning">
                      {STAGE_LABEL[stage] ?? "WhatsApp unavailable"}
                    </p>
                    <p className="max-w-sm text-sm text-muted-foreground">
                      {waSession === null
                        ? "The status service is not reachable right now. The WhatsApp worker may be down — check pm2 status on the server (myclinic-whatsapp), then reload this page."
                        : stage === "unconfigured" || stage === "disconnected" || stage === "error"
                          ? "Link this clinic's own WhatsApp number to send appointment reminders and patient notifications from it. Each clinic connects its own number separately."
                          : "Make sure the WhatsApp worker is running on the server (pm2: myclinic-whatsapp) and a Chromium browser is available."}
                    </p>
                    {canEdit &&
                      (stage === "unconfigured" ||
                        stage === "disconnected" ||
                        stage === "error") && (
                        <Button type="button" disabled={waAction !== null} onClick={() => void handleConnect()}>
                          {waAction === "connect" ? "Starting…" : "Connect WhatsApp"}
                        </Button>
                      )}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Powered by WhatsApp Integration · last update{" "}
                  {waSession?.updatedAt ? new Date(waSession.updatedAt).toLocaleTimeString("en-IN") : "—"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>soul.md</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={saveSoulMd} className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    The story and purpose of your clinic, stored as a markdown file. The WhatsApp
                    assistant uses this file to answer patients in your clinic&apos;s voice.
                  </p>
                  <div className="grid gap-2">
                    <Label htmlFor="soul" className="text-sm font-medium text-foreground">
                      soul.md content
                    </Label>
                    <Textarea
                      id="soul"
                      value={soulDraft}
                      disabled={!canEdit}
                      rows={12}
                      placeholder={"# Our clinic's soul\n\nWhy we exist, what we stand for..."}
                      className="min-h-64 resize-y font-mono text-sm"
                      onChange={(e) => setSoulDraft(e.target.value)}
                    />
                  </div>
                  {soul && (
                    <p className="text-xs text-muted-foreground">
                      Version {soul.version} · fallback reply: “{soul.fallbackReply}”
                    </p>
                  )}
                  {canEdit && (
                    <Button type="submit" disabled={savingSoul}>
                      {savingSoul ? "Saving..." : "Save soul.md"}
                    </Button>
                  )}
                </form>
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === "billing" && (
          <Card>
            <CardHeader>
              <CardTitle>Billing & Invoice Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveBilling} className="space-y-6">
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
                  <Button type="submit" disabled={savingBilling}>
                    {savingBilling ? "Saving..." : "Save Billing Settings"}
                  </Button>
                )}
              </form>
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
                            className="h-8 max-w-xs text-xs"
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
                            className="h-8 gap-1 text-xs"
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