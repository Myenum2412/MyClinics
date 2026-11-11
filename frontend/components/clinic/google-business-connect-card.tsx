"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  CheckCircle2,
  ExternalLink,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import {
  resolveGoogleBusinessProfile,
  type GoogleBusinessResolvedData,
} from "@/lib/clinic-api";

export function GoogleIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

interface GoogleBusinessConnectCardProps {
  clinicId: string;
  clinicName?: string;
  clinicEmail?: string | null;
  canManage: boolean;
  connectedUrl?: string | null;
  onAutoComplete: (data: GoogleBusinessResolvedData) => void;
  onDisconnect?: () => void;
}

export function GoogleBusinessConnectCard({
  clinicId,
  clinicName = "",
  clinicEmail = "",
  canManage,
  connectedUrl,
  onAutoComplete,
  onDisconnect,
}: GoogleBusinessConnectCardProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"email" | "url" | "search">("email");
  const [emailInput, setEmailInput] = useState(clinicEmail ?? "");
  const [urlInput, setUrlInput] = useState(connectedUrl ?? "");
  const [queryInput, setQueryInput] = useState(clinicName);
  const [loading, setLoading] = useState(false);
  const [autoConnecting, setAutoConnecting] = useState(false);
  const [resolvedData, setResolvedData] = useState<GoogleBusinessResolvedData | null>(null);

  const isConnected = Boolean(connectedUrl);
  const effectiveEmail = emailInput.trim() || clinicEmail?.trim() || "";

  // 1-Click Auto-Connect with Email from Card directly
  const handleAutoConnect = async (customEmail?: string) => {
    const targetEmail = customEmail || effectiveEmail;
    if (!targetEmail) {
      setTab("email");
      setOpen(true);
      return;
    }

    setAutoConnecting(true);
    try {
      const data = await resolveGoogleBusinessProfile(clinicId, {
        email: targetEmail,
        name: clinicName,
        query: `${clinicName} ${targetEmail.split("@")[0].replace(/[._-]/g, " ")}`,
      });

      onAutoComplete(data);
      toast.success(
        `Connected Google Business Profile for ${targetEmail}! Profile form auto-completed. Review and make manual updates before saving.`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to connect Google Business Profile");
    } finally {
      setAutoConnecting(false);
    }
  };

  const handleFetch = async () => {
    if (tab === "email" && !emailInput.trim()) {
      toast.error("Please enter your Google Business email address");
      return;
    }
    if (tab === "url" && !urlInput.trim()) {
      toast.error("Please enter a Google Maps or Google Business URL");
      return;
    }
    if (tab === "search" && !queryInput.trim()) {
      toast.error("Please enter clinic name and city to search");
      return;
    }

    setLoading(true);
    setResolvedData(null);
    try {
      const data = await resolveGoogleBusinessProfile(clinicId, {
        email: tab === "email" ? emailInput.trim() : undefined,
        name: clinicName,
        url: tab === "url" ? urlInput.trim() : undefined,
        query:
          tab === "search"
            ? queryInput.trim()
            : tab === "email"
            ? `${clinicName} ${emailInput.trim().split("@")[0].replace(/[._-]/g, " ")}`
            : undefined,
      });

      setResolvedData(data);
      toast.success("Google Business details retrieved successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch Google Business details");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!resolvedData) return;
    onAutoComplete(resolvedData);
    setOpen(false);
  };

  return (
    <div className="rounded-xl border border-[#E3F2FD] bg-card p-4 transition-colors">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-[#E3F2FD] bg-white shadow-xs">
            <GoogleIcon className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Google Business Profile</h3>
              {isConnected ? (
                <Badge
                  variant="outline"
                  className="border-emerald-300 bg-emerald-50 text-emerald-700 text-[11px] dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                >
                  <span className="mr-1 size-1.5 rounded-full bg-emerald-500" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground text-[11px]">
                  Not Connected
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isConnected
                ? "Connected with Google. Auto-completes clinic address, phone, working hours and details."
                : effectiveEmail
                ? `Connect with ${effectiveEmail} to auto-complete clinic address, phone and hours.`
                : "Connect your Google Business Profile to auto-complete your profile, address and hours."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isConnected && connectedUrl && (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <a href={connectedUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-3.5" />
                View on Google
              </a>
            </Button>
          )}

          {canManage && (
            <>
              {effectiveEmail && !isConnected ? (
                <Button
                  size="sm"
                  className="h-8 gap-1.5 text-xs font-medium bg-[#4285F4] hover:bg-[#3367D6] text-white"
                  onClick={() => handleAutoConnect(effectiveEmail)}
                  disabled={autoConnecting}
                >
                  {autoConnecting ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <GoogleIcon className="size-3.5" />
                  )}
                  {autoConnecting ? "Connecting..." : `Auto-Connect with ${effectiveEmail.split("@")[0]}`}
                </Button>
              ) : (
                <Button
                  variant={isConnected ? "outline" : "default"}
                  size="sm"
                  className="h-8 gap-1.5 text-xs font-medium"
                  onClick={() => {
                    setResolvedData(null);
                    setOpen(true);
                  }}
                >
                  <GoogleIcon className="size-3.5" />
                  {isConnected ? "Re-sync / Auto-Fill" : "Connect Google Profile"}
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  setResolvedData(null);
                  setOpen(true);
                }}
              >
                {isConnected ? "Settings" : "Options"}
              </Button>
            </>
          )}

          {isConnected && onDisconnect && canManage && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-destructive hover:bg-destructive/10"
              onClick={onDisconnect}
            >
              Disconnect
            </Button>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg sm:max-w-xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-md border bg-white shadow-xs">
                <GoogleIcon className="size-4" />
              </div>
              <DialogTitle>Connect Google Business Profile</DialogTitle>
            </div>
            <DialogDescription>
              Connect your Google Business Profile to auto-complete clinic details.
              You can review and update all fields manually before saving.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Tabs value={tab} onValueChange={(v) => setTab(v as "email" | "url" | "search")}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="email" className="text-xs">
                  Auto with Email
                </TabsTrigger>
                <TabsTrigger value="url" className="text-xs">
                  Google Maps Link
                </TabsTrigger>
                <TabsTrigger value="search" className="text-xs">
                  Clinic Name Search
                </TabsTrigger>
              </TabsList>

              <TabsContent value="email" className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="google-email" className="text-xs font-medium">
                    Google Business Account Email
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="google-email"
                      type="email"
                      placeholder="e.g. clinic@gmail.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="text-xs"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleFetch}
                      disabled={loading}
                      className="shrink-0 gap-1.5 text-xs bg-[#4285F4] hover:bg-[#3367D6] text-white"
                    >
                      {loading ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Mail className="size-3.5" />
                      )}
                      Auto-Connect
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Connects using your Google Business email to automatically discover and auto-fill your profile details.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="url" className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="google-maps-url" className="text-xs font-medium">
                    Google Maps / Business URL
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="google-maps-url"
                      placeholder="e.g. https://maps.app.goo.gl/... or https://google.com/maps/place/..."
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      className="text-xs"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleFetch}
                      disabled={loading}
                      className="shrink-0 gap-1.5 text-xs"
                    >
                      {loading ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Search className="size-3.5" />
                      )}
                      Fetch
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Tip: Open Google Maps, search your clinic, click <strong>Share</strong>, and copy the link.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="search" className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="google-search-query" className="text-xs font-medium">
                    Clinic Name and City
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="google-search-query"
                      placeholder="e.g. Apollo Clinic, Indiranagar, Bengaluru"
                      value={queryInput}
                      onChange={(e) => setQueryInput(e.target.value)}
                      className="text-xs"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleFetch}
                      disabled={loading}
                      className="shrink-0 gap-1.5 text-xs"
                    >
                      {loading ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Search className="size-3.5" />
                      )}
                      Search
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Include both your clinic name and locality or city for best matching.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            {resolvedData && (
              <div className="rounded-lg border border-[#E3F2FD] bg-muted/30 p-3.5 space-y-3 animate-in fade-in-50 duration-200">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-amber-500" />
                    Detected Profile Data
                  </span>
                  <Badge variant="outline" className="border-emerald-300 text-emerald-700 text-[10px]">
                    Ready to Auto-Complete
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Building2 className="size-3" /> Clinic Name
                    </span>
                    <p className="font-medium text-foreground truncate">{resolvedData.name || "—"}</p>
                  </div>

                  <div>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Mail className="size-3" /> Google Account Email
                    </span>
                    <p className="font-medium text-foreground truncate">{resolvedData.email || effectiveEmail || "—"}</p>
                  </div>

                  <div>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Phone className="size-3" /> Phone Number
                    </span>
                    <p className="font-medium text-foreground truncate">{resolvedData.phone || "—"}</p>
                  </div>

                  <div>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Globe className="size-3" /> Website
                    </span>
                    <p className="font-medium text-foreground truncate">{resolvedData.website || "—"}</p>
                  </div>

                  <div className="col-span-full">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <MapPin className="size-3" /> Address & Location
                    </span>
                    <p className="font-medium text-foreground">
                      {[
                        resolvedData.addressLine1,
                        resolvedData.addressLine2,
                        resolvedData.city,
                        resolvedData.state,
                        resolvedData.pincode,
                        resolvedData.country,
                      ]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </p>
                  </div>

                  {resolvedData.weeklySchedule && resolvedData.weeklySchedule.length > 0 && (
                    <div className="col-span-full text-[11px] text-muted-foreground">
                      <strong>Hours:</strong> Mon–Sat: 09:00 – 18:00 (Sun: Closed)
                    </div>
                  )}
                </div>

                <div className="rounded bg-background/80 p-2 text-[11px] text-muted-foreground border">
                  Auto-completing will populate your clinic profile form fields. You will be able to review,
                  edit any field manually, and click <strong>Save</strong>.
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between pt-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            {resolvedData ? (
              <Button size="sm" onClick={handleApply} className="gap-1.5 bg-[#4285F4] hover:bg-[#3367D6] text-white">
                <CheckCircle2 className="size-3.5" />
                Auto-Fill Profile Form
              </Button>
            ) : (
              <Button size="sm" onClick={handleFetch} disabled={loading} className="gap-1.5">
                {loading && <Loader2 className="size-3.5 animate-spin" />}
                Fetch Details
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
