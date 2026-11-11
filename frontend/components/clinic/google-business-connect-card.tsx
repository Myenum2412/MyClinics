"use client";

import { useEffect, useState } from "react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
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
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  resolveGoogleBusinessProfile,
  type GoogleBusinessResolvedData,
} from "@/lib/clinic-api";
import { cn } from "@/lib/utils";

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
  const [tab, setTab] = useState<"auth" | "url">("auth");
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState(connectedUrl ?? "");
  const [loading, setLoading] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [businesses, setBusinesses] = useState<GoogleBusinessResolvedData[]>([]);
  const [selectedBiz, setSelectedBiz] = useState<GoogleBusinessResolvedData | null>(null);

  const connected = Boolean(connectedUrl);

  // Listen for Google OAuth callback postMessage
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "GOOGLE_BUSINESS_AUTH_SUCCESS") {
        setAuthenticating(false);
        const { email, businesses: bizList } = e.data as {
          email: string;
          businesses?: GoogleBusinessResolvedData[];
        };

        if (!email) {
          toast.error("Google authentication failed. Please try again.");
          return;
        }

        setVerifiedEmail(email);
        const list = bizList || [];
        setBusinesses(list);
        setSelectedBiz(list[0] || null);

        if (list.length > 0) {
          toast.success(`Verified Google Account: ${email}. Found ${list.length} connected business profile(s).`);
        } else {
          toast.info(`Signed in with verified email ${email}. No Google Business listings found under this account.`);
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Launch Google OAuth popup for verified email login only (no fake emails allowed)
  const handleLaunchGoogleAuth = () => {
    setAuthenticating(true);
    const authUrl = `/api/clinics/auth/google?from=google_business${
      clinicEmail ? `&email=${encodeURIComponent(clinicEmail)}` : ""
    }`;
    const popup = window.open(authUrl, "googleOAuth", "width=600,height=720");
    if (!popup) {
      setAuthenticating(false);
      toast.error("Please allow popups to sign in with your verified Google account.");
    }
  };

  const handleFetchFromUrl = async () => {
    if (!urlInput.trim()) {
      toast.error("Please enter your Google Maps or Google Business link");
      return;
    }

    if (!urlInput.includes("google.com/maps") && !urlInput.includes("maps.app.goo.gl") && !urlInput.includes("business.google.com")) {
      toast.error("Please enter a valid Google Maps or Google Business link");
      return;
    }

    setLoading(true);
    setBusinesses([]);
    setSelectedBiz(null);
    try {
      const data = await resolveGoogleBusinessProfile(clinicId, {
        url: urlInput.trim(),
        name: clinicName,
      });

      const list = data.businesses && data.businesses.length > 0 ? data.businesses : [data];
      setBusinesses(list);
      setSelectedBiz(list[0] || null);
      toast.success("Business profile retrieved from link!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load link details");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = (bizToApply?: GoogleBusinessResolvedData) => {
    const target = bizToApply || selectedBiz;
    if (!target) return;
    onAutoComplete(target);
    setOpen(false);
  };

  const statusText = connected
    ? verifiedEmail
      ? `Connected as ${verifiedEmail}`
      : "Connected — clinic details and hours are synced"
    : verifiedEmail
      ? `Verified as ${verifiedEmail} — click to view profiles`
      : clinicEmail
        ? `Connect with verified ${clinicEmail} to sync clinic details`
        : "Connect your clinic's Google Business Profile to sync details and hours";

  return (
    <div className="flex h-full flex-col justify-between gap-3 rounded-xl border border-[#E3F2FD] bg-[#E3F2FD]/40 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#4285F4]/15">
          <GoogleIcon className="size-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">Google Business Profile</p>
            {connected && (
              <Badge
                variant="outline"
                className="border-[#4285F4]/40 bg-[#4285F4]/10 text-[#1a73e8]"
              >
                <span className="mr-1.5 size-1.5 rounded-full bg-[#4285F4]" />
                Connected
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{statusText}</p>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <Button disabled={!canManage} className="w-full sm:w-auto shrink-0">
              {connected ? "Google settings" : "Connect Google"}
            </Button>
          }
        />
        <DialogContent className="max-w-xl sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-md border bg-white shadow-xs">
                <GoogleIcon className="size-4" />
              </div>
              <DialogTitle>Connect Google Business Profile</DialogTitle>
            </div>
            <DialogDescription>
              Verify your clinic&apos;s Google account to view and auto-fill your verified Google Business profile.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Tabs value={tab} onValueChange={(v) => setTab(v as "auth" | "url")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="auth" className="text-xs">
                  Verified Google Account
                </TabsTrigger>
                <TabsTrigger value="url" className="text-xs">
                  Google Maps Link
                </TabsTrigger>
              </TabsList>

              <TabsContent value="auth" className="space-y-3 pt-2">
                {verifiedEmail ? (
                  <div className="rounded-lg border border-emerald-300 bg-emerald-50/70 p-3.5 space-y-2 text-xs dark:border-emerald-800 dark:bg-emerald-950/30">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <ShieldCheck className="size-4 text-emerald-600" />
                        Verified Google Account
                      </span>
                      <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px]">
                        Google Verified
                      </Badge>
                    </div>
                    <p className="font-mono text-xs text-emerald-900 dark:text-emerald-200">
                      {verifiedEmail}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Only verified business profiles belonging to this authenticated Google account are shown below.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs bg-white text-foreground mt-1"
                      onClick={handleLaunchGoogleAuth}
                      disabled={authenticating}
                    >
                      {authenticating ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
                      Switch Google Account
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-lg border border-[#E3F2FD] bg-muted/30 p-4 text-center space-y-3">
                    <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-white shadow-xs">
                      <GoogleIcon className="size-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-foreground">Sign in with Google to Verify</h4>
                      <p className="mt-1 text-[11px] text-muted-foreground max-w-md mx-auto">
                        To prevent fake emails, Google authentication is required to verify ownership of your clinic&apos;s
                        Google Business Profile.
                      </p>
                    </div>

                    <Button
                      type="button"
                      className="bg-[#4285F4] hover:bg-[#3367D6] text-white gap-2 text-xs font-medium"
                      onClick={handleLaunchGoogleAuth}
                      disabled={authenticating}
                    >
                      {authenticating ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <GoogleIcon className="size-3.5" />
                      )}
                      {authenticating ? "Verifying with Google..." : "Sign in with Google to Verify"}
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="url" className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="google-maps-url" className="text-xs font-medium">
                    Google Maps / Business Share Link
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
                      onClick={() => void handleFetchFromUrl()}
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
                    Only authentic Google Maps links for your clinic are accepted.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            {/* If verified via Google and NO connected business profiles found */}
            {verifiedEmail && businesses.length === 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3.5 text-xs space-y-2 dark:border-amber-900/50 dark:bg-amber-950/20">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-medium">
                  <AlertCircle className="size-4 shrink-0 text-amber-600" />
                  No Business Profiles Found Under {verifiedEmail}
                </div>
                <p className="text-amber-700/90 dark:text-amber-400 text-[11px] leading-relaxed">
                  This authenticated Gmail account does not manage any verified listings on{" "}
                  <strong>Google Business Profile</strong> (business.google.com). Unrelated or fake businesses
                  are never shown.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs bg-white text-foreground"
                    onClick={handleLaunchGoogleAuth}
                  >
                    Try Another Google Account
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-primary"
                    asChild
                  >
                    <a href="https://business.google.com" target="_blank" rel="noopener noreferrer">
                      Open Google Business Manager
                      <ExternalLink className="size-3 ml-1" />
                    </a>
                  </Button>
                </div>
              </div>
            )}

            {/* List of Verified Connected Businesses ONLY */}
            {businesses.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Building2 className="size-4 text-primary" />
                    Connected Business Profiles ({businesses.length})
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {verifiedEmail ? `Verified for ${verifiedEmail}` : "Select your business"}
                  </span>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {businesses.map((biz, idx) => {
                    const isSelected = selectedBiz === biz;
                    const fullAddress = [biz.addressLine1, biz.addressLine2, biz.city, biz.state, biz.pincode]
                      .filter(Boolean)
                      .join(", ");

                    return (
                      <div
                        key={biz.id || idx}
                        onClick={() => setSelectedBiz(biz)}
                        className={cn(
                          "cursor-pointer rounded-lg border p-3 transition-all text-left",
                          isSelected
                            ? "border-[#4285F4] bg-[#4285F4]/5 ring-1 ring-[#4285F4] shadow-xs"
                            : "border-border bg-card hover:border-[#4285F4]/50 hover:bg-muted/40"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-foreground truncate">{biz.name}</h4>
                              {isSelected ? (
                                <Badge className="h-4 bg-[#4285F4] px-1.5 text-[9px] text-white">
                                  Selected
                                </Badge>
                              ) : null}
                            </div>

                            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <MapPin className="size-3 shrink-0 text-muted-foreground" />
                              <span className="truncate">{fullAddress || "Verified Location"}</span>
                            </p>

                            <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground pt-0.5">
                              {biz.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="size-3" />
                                  {biz.email}
                                </span>
                              )}
                              {biz.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="size-3" />
                                  {biz.phone}
                                </span>
                              )}
                              {biz.website && (
                                <span className="flex items-center gap-1 truncate max-w-[200px]">
                                  <Globe className="size-3" />
                                  {biz.website}
                                </span>
                              )}
                            </div>
                          </div>

                          <Button
                            size="sm"
                            type="button"
                            variant={isSelected ? "default" : "outline"}
                            className={cn(
                              "h-7 text-xs shrink-0 gap-1",
                              isSelected && "bg-[#4285F4] hover:bg-[#3367D6] text-white"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApply(biz);
                            }}
                          >
                            <CheckCircle2 className="size-3" />
                            Select & Fill
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Selected Business Preview */}
                {selectedBiz && (
                  <div className="rounded-lg border border-[#E3F2FD] bg-muted/30 p-3 space-y-2 animate-in fade-in-50 duration-200">
                    <div className="flex items-center justify-between border-b pb-1.5">
                      <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                        <Sparkles className="size-3.5 text-amber-500" />
                        Selected Profile to Auto-Fill
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Ready to apply to form
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground">Clinic Name</span>
                        <p className="font-semibold text-foreground truncate">{selectedBiz.name}</p>
                      </div>

                      <div>
                        <span className="text-[10px] text-muted-foreground">Verified Email</span>
                        <p className="font-medium text-foreground truncate">
                          {selectedBiz.email || verifiedEmail || clinicEmail || "—"}
                        </p>
                      </div>

                      <div className="col-span-full">
                        <span className="text-[10px] text-muted-foreground">Address</span>
                        <p className="font-medium text-foreground">
                          {[
                            selectedBiz.addressLine1,
                            selectedBiz.addressLine2,
                            selectedBiz.city,
                            selectedBiz.state,
                            selectedBiz.pincode,
                            selectedBiz.country,
                          ]
                            .filter(Boolean)
                            .join(", ") || "—"}
                        </p>
                      </div>
                    </div>

                    <p className="text-[10px] text-muted-foreground pt-1 border-t">
                      Auto-completing will populate your profile form. You can review, update any fields manually, and click <strong>Save</strong>.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between pt-2">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                Close
              </Button>
              {connected && onDisconnect && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    onDisconnect();
                    setOpen(false);
                  }}
                >
                  Disconnect
                </Button>
              )}
            </div>

            {selectedBiz ? (
              <Button
                size="sm"
                onClick={() => handleApply(selectedBiz)}
                className="gap-1.5 bg-[#4285F4] hover:bg-[#3367D6] text-white"
              >
                <CheckCircle2 className="size-3.5" />
                Auto-Fill Profile Form
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleLaunchGoogleAuth}
                disabled={authenticating}
                className="gap-1.5 bg-[#4285F4] hover:bg-[#3367D6] text-white"
              >
                {authenticating ? <Loader2 className="size-3.5 animate-spin" /> : <GoogleIcon className="size-3.5" />}
                Sign in with Google
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
