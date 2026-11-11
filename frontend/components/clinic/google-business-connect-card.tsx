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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  CheckCircle2,
  ChevronRight,
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
  const [tab, setTab] = useState<"email" | "url" | "search">("email");
  const [emailInput, setEmailInput] = useState(clinicEmail ?? "");
  const [urlInput, setUrlInput] = useState(connectedUrl ?? "");
  const [queryInput, setQueryInput] = useState(clinicName);
  const [loading, setLoading] = useState(false);
  const [businesses, setBusinesses] = useState<GoogleBusinessResolvedData[]>([]);
  const [selectedBiz, setSelectedBiz] = useState<GoogleBusinessResolvedData | null>(null);

  const isConnected = Boolean(connectedUrl);
  const effectiveEmail = emailInput.trim() || clinicEmail?.trim() || "";

  useEffect(() => {
    if (clinicEmail && !emailInput) {
      setEmailInput(clinicEmail);
    }
  }, [clinicEmail, emailInput]);

  const handleFetchBusinesses = async (overrideEmail?: string) => {
    const targetEmail = overrideEmail !== undefined ? overrideEmail : (tab === "email" ? emailInput.trim() : undefined);
    const targetUrl = tab === "url" ? urlInput.trim() : undefined;
    const targetQuery =
      tab === "search"
        ? queryInput.trim()
        : tab === "email" && targetEmail
        ? `${clinicName} ${targetEmail.split("@")[0].replace(/[._-]/g, " ")}`
        : undefined;

    if (tab === "email" && !targetEmail) {
      toast.error("Please enter your Google Business email");
      return;
    }
    if (tab === "url" && !targetUrl) {
      toast.error("Please enter a Google Maps or Google Business link");
      return;
    }
    if (tab === "search" && !targetQuery) {
      toast.error("Please enter clinic name or location to search");
      return;
    }

    setLoading(true);
    setBusinesses([]);
    setSelectedBiz(null);
    try {
      const data = await resolveGoogleBusinessProfile(clinicId, {
        email: targetEmail,
        name: clinicName,
        url: targetUrl,
        query: targetQuery,
      });

      const list = data.businesses && data.businesses.length > 0 ? data.businesses : [data];
      setBusinesses(list);
      setSelectedBiz(list[0] || null);

      toast.success(
        list.length > 1
          ? `Found ${list.length} businesses for this account! Select your location below.`
          : "Business details retrieved successfully!"
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch Google Business details");
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

  const handleOpenModal = (preferredTab: "email" | "url" | "search" = "email") => {
    setTab(preferredTab);
    setOpen(true);
    if (preferredTab === "email" && effectiveEmail && businesses.length === 0) {
      void handleFetchBusinesses(effectiveEmail);
    }
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
                ? `Connect with ${effectiveEmail} to view and auto-fill your connected businesses.`
                : "Connect your Google Business Profile to view connected businesses and auto-fill your profile."}
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
              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs font-medium bg-[#4285F4] hover:bg-[#3367D6] text-white"
                onClick={() => handleOpenModal("email")}
              >
                <GoogleIcon className="size-3.5" />
                {isConnected ? "View Connected Businesses" : "Connect with Google"}
              </Button>

              {isConnected && onDisconnect && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-destructive hover:bg-destructive/10"
                  onClick={onDisconnect}
                >
                  Disconnect
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-md border bg-white shadow-xs">
                <GoogleIcon className="size-4" />
              </div>
              <DialogTitle>Google Business Profile Connection</DialogTitle>
            </div>
            <DialogDescription>
              View the list of businesses connected to your Google account and select your location to auto-complete
              the clinic profile.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Tabs value={tab} onValueChange={(v) => setTab(v as "email" | "url" | "search")}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="email" className="text-xs">
                  Connected Email
                </TabsTrigger>
                <TabsTrigger value="search" className="text-xs">
                  Search Clinic
                </TabsTrigger>
                <TabsTrigger value="url" className="text-xs">
                  Maps Link
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
                      onClick={() => void handleFetchBusinesses()}
                      disabled={loading}
                      className="shrink-0 gap-1.5 text-xs bg-[#4285F4] hover:bg-[#3367D6] text-white"
                    >
                      {loading ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Mail className="size-3.5" />
                      )}
                      Show Businesses
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Fetches all business profiles and branches connected with this email address.
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
                      onClick={() => void handleFetchBusinesses()}
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
                    Search by clinic name and city to find matching Google Business profiles.
                  </p>
                </div>
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
                      onClick={() => void handleFetchBusinesses()}
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
            </Tabs>

            {/* List of Connected Businesses */}
            {businesses.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Building2 className="size-4 text-primary" />
                    Businesses Connected to this Account ({businesses.length})
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Click to select your business
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
                              <span className="truncate">{fullAddress || "Address available upon selection"}</span>
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
                        <span className="text-[10px] text-muted-foreground">Connected Email</span>
                        <p className="font-medium text-foreground truncate">
                          {selectedBiz.email || effectiveEmail || "—"}
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
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            {selectedBiz ? (
              <Button
                size="sm"
                onClick={() => handleApply(selectedBiz)}
                className="gap-1.5 bg-[#4285F4] hover:bg-[#3367D6] text-white"
              >
                <CheckCircle2 className="size-3.5" />
                Auto-Fill Profile with Selected Business
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => void handleFetchBusinesses()}
                disabled={loading}
                className="gap-1.5 bg-[#4285F4] hover:bg-[#3367D6] text-white"
              >
                {loading && <Loader2 className="size-3.5 animate-spin" />}
                Show Businesses
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
