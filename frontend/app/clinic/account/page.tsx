"use client";

import { useEffect, useRef, useState } from "react";
import {
  Building2,
  Camera,
  Clock,
  ExternalLink,
  FileText,
  Globe,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Save,
  Shield,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import type { Clinic } from "@/lib/clinic-api";
import {
  getOwnClinic,
  updateOwnClinic,
} from "@/lib/clinic-api";
import { PersonAvatar, bustAvatarCache } from "@/components/clinic/person-avatar";
import { uploadAvatar } from "@/lib/clinic-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

const ROLE_LABELS: Record<string, string> = {
  platform_admin: "Platform Admin",
  clinic_admin: "Clinic Admin",
  doctor: "Doctor",
  staff: "Staff",
  patient: "Patient",
};

export default function AccountPage() {
  const session = useRequireRole("staff");
  const clinicId = session?.clinicId ?? "";
  
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [photoRefresh, setPhotoRefresh] = useState(0);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  async function handlePhotoUpload(file: File | null) {
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      toast.error("Only JPG or PNG images are allowed");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be smaller than 2MB");
      return;
    }
    setUploadingPhoto(true);
    try {
      await uploadAvatar(clinicId, "clinic", clinicId, file);
      bustAvatarCache(clinicId, "clinic", clinicId);
      setPhotoRefresh((n) => n + 1);
      toast.success("Clinic photo updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update photo");
    } finally {
      setUploadingPhoto(false);
    }
  }

  const [draft, setDraft] = useState({
    name: "",
    description: "",
    website: "",
    phone: "",
    email: "",
    address: "",
    open: "",
    close: "",
  });

  useEffect(() => {
    if (!clinicId) return;
    getOwnClinic(clinicId)
      .then((res) => {
        setClinic(res);
        setDraft({
          name: res.name,
          description: res.description ?? "",
          website: res.website ?? "",
          phone: res.phone ?? "",
          email: res.email ?? "",
          address: res.address ?? "",
          open: res.settings.workingHours.open,
          close: res.settings.workingHours.close,
        });
      })
      .catch(() => toast.error("Failed to load clinic profile"))
      .finally(() => setLoading(false));
  }, [clinicId]);

  async function saveAll() {
    if (!clinic) return;
    setSaving(true);
    try {
      const updated = await updateOwnClinic(clinicId, {
        name: draft.name,
        description: draft.description,
        website: draft.website,
        phone: draft.phone,
        email: draft.email,
        address: draft.address,
        settings: { workingHours: { open: draft.open, close: draft.close } },
      });
      setClinic(updated);
      setIsEditing(false);
      toast.success("Clinic profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update clinic profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !clinic) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 md:px-8">
        <Skeleton className="h-64 w-full rounded-b-3xl" />
        <Skeleton className="mx-auto -mt-12 h-24 w-24 rounded-full border-4 border-white" />
        <Skeleton className="mx-auto mt-4 h-6 w-48" />
        <Skeleton className="mx-auto mt-2 h-4 w-32" />
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Skeleton className="h-96 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const role = session?.role ?? "staff";
  const roleLabel = ROLE_LABELS[role] ?? "Member";
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([clinic.name, clinic.address].filter(Boolean).join(", "))}`;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12 font-sans">
      {/* Top Banner Gradient */}
      <div className="h-[280px] w-full bg-gradient-to-b from-[#7A8FF2] via-[#94A9F9] to-[#E0E9FA]" />

      <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="relative -mt-12 flex flex-col items-center">
          <div className="relative">
            <PersonAvatar
              clinicId={clinicId}
              ownerType="clinic"
              ownerId={clinicId}
              name={clinic.name}
              refreshKey={photoRefresh}
              className="size-[104px] border-4 border-white shadow-sm ring-1 ring-slate-900/5 text-3xl font-semibold"
            />
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute bottom-1 right-1 flex size-7 items-center justify-center rounded-full border-2 border-white bg-[#5E72E4] text-white shadow-sm hover:bg-[#4E62D4] transition-colors disabled:opacity-60"
              aria-label="Upload clinic photo"
            >
              <Camera className="size-3.5" />
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={(e) => {
                handlePhotoUpload(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
          </div>
          <h1 className="mt-3 text-[22px] font-bold text-slate-900">{clinic.name}</h1>
          <p className="text-[15px] text-slate-500">{clinic.email ?? "No email provided"}</p>

          <div className="mt-3 flex items-center gap-2">
            <Badge className="gap-1.5 border-none bg-[#5E72E4] px-3.5 py-1 text-white hover:bg-[#4E62D4] rounded-full font-medium shadow-sm text-xs">
              <Shield className="size-3" />
              {roleLabel}
            </Badge>
            <Badge
              variant="outline"
              className="gap-1.5 rounded-full border-slate-200 bg-white/60 backdrop-blur-sm px-3.5 py-1 text-slate-600 font-medium text-xs shadow-sm"
            >
              <Building2 className="size-3 text-slate-400" />
              {clinic.name}&apos;s Organization
            </Badge>
          </div>
        </div>

        {/* Navigation & Edit Button */}
        <div className="mt-10 flex flex-wrap items-center justify-between border-b border-slate-200/80 pb-4">
          <div className="flex gap-2 px-2">
            <button className="flex items-center gap-2 rounded-md bg-white px-4 py-2 text-[14px] font-medium text-slate-800 shadow-sm border border-slate-200">
              <User className="size-[16px]" />
              Profile
            </button>
            <button className="flex items-center gap-2 rounded-md px-4 py-2 text-[14px] font-medium text-slate-500 hover:bg-white hover:shadow-sm hover:border hover:border-slate-200 border border-transparent transition-all">
              <Building2 className="size-[16px]" />
              Company
            </button>
            <button className="flex items-center gap-2 rounded-md px-4 py-2 text-[14px] font-medium text-slate-500 hover:bg-white hover:shadow-sm hover:border hover:border-slate-200 border border-transparent transition-all">
              <FileText className="size-[16px]" />
              Terms
            </button>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  className="h-9 gap-2 rounded-full border-slate-200 px-4 text-slate-600 shadow-sm hover:bg-slate-50"
                >
                  <X className="size-4" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={saveAll}
                  disabled={saving}
                  className="h-9 gap-2 rounded-full bg-[#5E72E4] px-4 text-white shadow-sm hover:bg-[#4E62D4]"
                >
                  <Save className="size-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="h-9 gap-2 rounded-full border-slate-200 px-4 text-slate-600 shadow-sm hover:bg-slate-50"
              >
                <Pencil className="size-4" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {/* Left Column: Personal Information */}
          <Card className="rounded-[16px] border border-slate-200/60 bg-white shadow-sm overflow-hidden">
            <div className="px-7 py-6 border-b border-slate-100">
              <h2 className="flex items-center gap-2 text-[17px] font-semibold text-slate-800">
                <User className="size-[18px] text-slate-600" />
                Clinic Information
              </h2>
            </div>
            
            <div className="flex flex-col px-7 pb-4">
              {/* Field: Email */}
              <div className="flex items-start gap-4 border-b border-slate-100 py-4.5 last:border-0">
                <Mail className="mt-1 size-[16px] text-slate-400 shrink-0" />
                <div className="w-full min-w-0">
                  <p className="text-[13px] font-medium text-slate-400">Email</p>
                  {isEditing ? (
                    <Input
                      className="mt-2 h-9 w-full bg-slate-50/50 text-[14px]"
                      value={draft.email}
                      onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                    />
                  ) : (
                    <p className="mt-1 truncate text-[14px] text-slate-800">
                      {clinic.email || "—"}
                    </p>
                  )}
                </div>
              </div>

              {/* Field: Full Name */}
              <div className="flex items-start gap-4 border-b border-slate-100 py-4.5 last:border-0">
                <Building2 className="mt-1 size-[16px] text-slate-400 shrink-0" />
                <div className="w-full min-w-0">
                  <p className="text-[13px] font-medium text-slate-400">Clinic Name</p>
                  {isEditing ? (
                    <Input
                      className="mt-2 h-9 w-full bg-slate-50/50 text-[14px]"
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    />
                  ) : (
                    <p className="mt-1 truncate text-[14px] text-slate-800">
                      {clinic.name || "—"}
                    </p>
                  )}
                </div>
              </div>

              {/* Field: Phone */}
              <div className="flex items-start gap-4 border-b border-slate-100 py-4.5 last:border-0">
                <Phone className="mt-1 size-[16px] text-slate-400 shrink-0" />
                <div className="w-full min-w-0">
                  <p className="text-[13px] font-medium text-slate-400">Phone</p>
                  {isEditing ? (
                    <Input
                      className="mt-2 h-9 w-full bg-slate-50/50 text-[14px]"
                      value={draft.phone}
                      onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                    />
                  ) : (
                    <p className="mt-1 truncate text-[14px] text-slate-800">
                      {clinic.phone || "—"}
                    </p>
                  )}
                </div>
              </div>

              {/* Field: Description */}
              <div className="flex items-start gap-4 border-b border-slate-100 py-4.5 last:border-0">
                <FileText className="mt-1 size-[16px] text-slate-400 shrink-0" />
                <div className="w-full min-w-0">
                  <p className="text-[13px] font-medium text-slate-400">Description</p>
                  {isEditing ? (
                    <Textarea
                      className="mt-2 min-h-[80px] w-full bg-slate-50/50 resize-none text-[14px]"
                      value={draft.description}
                      onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    />
                  ) : (
                    <p className="mt-1 text-[14px] text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {clinic.description || "—"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Right Column: Address & Social */}
          <Card className="rounded-[16px] border border-slate-200/60 bg-white shadow-sm overflow-hidden">
            <div className="px-7 py-6 border-b border-slate-100">
              <h2 className="flex items-center gap-2 text-[17px] font-semibold text-slate-800">
                <MapPin className="size-[18px] text-slate-600" />
                Address & Operations
              </h2>
            </div>
            
            <div className="flex flex-col px-7 pb-6 pt-5">
              <p className="text-[12px] font-semibold tracking-wide text-slate-400 uppercase mb-4">
                LOCATION
              </p>
              
              <div className="grid gap-x-6 gap-y-5 border-b border-slate-100 pb-7 mb-6">
                <div className="col-span-2">
                  <p className="text-[13px] font-medium text-slate-400">Full Address</p>
                  {isEditing ? (
                    <Textarea
                      className="mt-2 min-h-[80px] w-full bg-slate-50/50 resize-none text-[14px]"
                      value={draft.address}
                      onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                    />
                  ) : (
                    <div className="mt-1 flex items-start justify-between gap-4">
                      <p className="text-[14px] text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {clinic.address || "—"}
                      </p>
                      {clinic.address && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(mapsUrl, "_blank", "noopener,noreferrer")}
                          className="shrink-0 h-8 text-xs text-[#5E72E4] hover:bg-[#5E72E4]/10 hover:text-[#4E62D4]"
                        >
                          <ExternalLink className="mr-1.5 size-3" />
                          Maps
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <p className="text-[12px] font-semibold tracking-wide text-slate-400 uppercase mb-4">
                OPERATIONAL DETAILS
              </p>
              
              <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                <div>
                  <p className="flex items-center gap-1.5 text-[13px] font-medium text-slate-400">
                    <Clock className="size-3.5" />
                    Opening Time
                  </p>
                  {isEditing ? (
                    <Input
                      type="time"
                      className="mt-2 h-9 w-full bg-slate-50/50 text-[14px]"
                      value={draft.open}
                      onChange={(e) => setDraft({ ...draft, open: e.target.value })}
                    />
                  ) : (
                    <p className="mt-1 text-[14px] text-slate-800">{clinic.settings.workingHours.open || "—"}</p>
                  )}
                </div>
                
                <div>
                  <p className="flex items-center gap-1.5 text-[13px] font-medium text-slate-400">
                    <Clock className="size-3.5" />
                    Closing Time
                  </p>
                  {isEditing ? (
                    <Input
                      type="time"
                      className="mt-2 h-9 w-full bg-slate-50/50 text-[14px]"
                      value={draft.close}
                      onChange={(e) => setDraft({ ...draft, close: e.target.value })}
                    />
                  ) : (
                    <p className="mt-1 text-[14px] text-slate-800">{clinic.settings.workingHours.close || "—"}</p>
                  )}
                </div>
                
                <div className="col-span-2 pt-2">
                  <p className="flex items-center gap-1.5 text-[13px] font-medium text-slate-400">
                    <Globe className="size-3.5" />
                    Website
                  </p>
                  {isEditing ? (
                    <Input
                      className="mt-2 h-9 w-full bg-slate-50/50 text-[14px]"
                      value={draft.website}
                      onChange={(e) => setDraft({ ...draft, website: e.target.value })}
                      placeholder="https://..."
                    />
                  ) : (
                    <p className="mt-1 text-[14px] text-slate-800">
                      {clinic.website ? (
                        <a 
                          href={clinic.website.startsWith("http") ? clinic.website : `https://${clinic.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#5E72E4] hover:underline flex items-center gap-1 w-fit"
                        >
                          {clinic.website}
                          <ExternalLink className="size-3" />
                        </a>
                      ) : (
                        "—"
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}