"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Bell,
  BriefcaseMedical,
  Building2,
  Camera,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  CreditCard,
  Globe,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Settings,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import type { Clinic } from "@/lib/clinic-api";
import { getOwnClinic } from "@/lib/clinic-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AccountPage() {
  const session = useRequireRole("staff");
  const clinicId = session?.clinicId ?? "";

  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clinicId) return;
    getOwnClinic(clinicId)
      .then((res) => {
        setClinic(res);
      })
      .catch(() => toast.error("Failed to load clinic profile"))
      .finally(() => setLoading(false));
  }, [clinicId]);

  if (loading || !clinic) {
    return (
      <div className="mx-auto max-w-7xl space-y-4 p-8">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            <BriefcaseMedical className="size-5" />
          </div>
          <span className="text-xl font-bold text-slate-900">MyClinic</span>
        </div>
        <div className="flex items-center gap-4 md:gap-6">
          <button className="relative text-slate-500 hover:text-slate-700">
            <Bell className="size-5" />
            <span className="absolute right-0 top-0 size-2 rounded-full bg-red-500 ring-2 ring-white"></span>
          </button>
          <div className="flex items-center gap-3 border-l border-slate-200 pl-4 md:pl-6">
            <div className="flex size-9 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">
              {session?.name ? session.name.substring(0, 2).toUpperCase() : "SS"}
            </div>
            <div className="hidden flex-col md:flex">
              <span className="text-sm font-semibold text-slate-900">{session?.name || "Dr. Sarah Smith"}</span>
              <span className="text-xs text-slate-500 capitalize">{session?.role?.replace("_", " ") || "Chief Medical Officer"}</span>
            </div>
            <ChevronDown className="size-4 text-slate-400" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] p-4 md:p-8">
        {/* Page Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="hover:text-blue-600 cursor-pointer">Dashboard</span>
              <span>/</span>
              <span className="font-medium text-slate-900">Clinic Profile</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">Clinic Profile</h1>
            <p className="text-sm text-slate-500">Manage your clinic information and preferences</p>
          </div>
          <Button className="bg-blue-600 text-white hover:bg-blue-700 rounded-md shrink-0">
            <Pencil className="mr-2 size-4" /> Edit Profile
          </Button>
        </div>

        {/* Main Clinic Profile Card */}
        <Card className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm mb-6">
          <div className="flex flex-col lg:flex-row">
            {/* Left: Cover */}
            <div className="relative h-48 lg:h-auto lg:w-72 shrink-0 bg-slate-100">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-indigo-50"></div>
              <button className="absolute bottom-4 right-4 flex size-8 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm hover:bg-white">
                <Camera className="size-4" />
              </button>
            </div>
            
            <div className="flex flex-1 flex-col p-6 md:flex-row md:items-center md:justify-between">
              {/* Middle: Info */}
              <div className="flex items-start gap-6">
                <div className="relative shrink-0">
                  <div className="flex size-20 items-center justify-center rounded-full border-4 border-white bg-blue-600 text-2xl font-bold text-white shadow-sm">
                    {clinic.name ? clinic.name.charAt(0).toUpperCase() : "H"}
                  </div>
                  <div className="absolute bottom-0 right-0 rounded-full bg-white p-0.5">
                    <CheckCircle className="size-5 text-blue-600 fill-white" />
                  </div>
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-bold text-slate-900">{clinic.name || "HealthCare Medical Clinic"}</h2>
                  <p className="mt-1 truncate text-sm text-slate-500">{clinic.description || "Compassionate Care, Better Health"}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                    <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100 font-medium">
                      ID: #CL-29384
                    </Badge>
                    <span className="hidden sm:inline text-slate-400">•</span>
                    <span className="text-slate-500">Member since Aug 2021</span>
                    <span className="hidden sm:inline text-slate-400">•</span>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200 font-medium">
                      <span className="mr-1.5 size-1.5 rounded-full bg-emerald-500"></span> Active
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Vertical Divider */}
              <div className="my-6 hidden h-24 w-px bg-slate-200 md:my-0 md:block"></div>

              {/* Right: Contact */}
              <div className="mt-6 flex flex-col gap-3 md:mt-0 md:w-64 shrink-0">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <Phone className="size-4" />
                  </div>
                  <span className="truncate">{clinic.phone || "+1 (555) 123-4567"}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <Mail className="size-4" />
                  </div>
                  <span className="truncate">{clinic.email || "contact@healthcare.com"}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <Globe className="size-4" />
                  </div>
                  <span className="truncate text-blue-600 hover:underline cursor-pointer">{clinic.website || "www.healthcare.com"}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Two-Column Layout */}
        <div className="grid gap-6 lg:grid-cols-2 mb-6">
          {/* Left: Clinic Info */}
          <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-semibold text-slate-900">Clinic Information</h3>
            </div>
            <div className="p-6">
              <div className="flex flex-col">
                {[
                  { label: "Clinic Name", value: clinic.name || "HealthCare Medical Clinic" },
                  { label: "Registration Number", value: "REG-2021-99823" },
                  { label: "Clinic Type", value: "Multi-Specialty Hospital" },
                  { label: "Established On", value: "15 August 2021" },
                  { label: "GST Number", value: "22AAAAA0000A1Z5" },
                  { label: "PAN Number", value: "ABCDE1234F" },
                  { label: "Email", value: clinic.email || "contact@healthcare.com" },
                  { label: "Phone", value: clinic.phone || "+1 (555) 123-4567" },
                  { label: "Alternate Phone", value: "+1 (555) 987-6543" },
                ].map((item, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 py-3.5 first:pt-0 last:border-0 last:pb-0">
                    <span className="text-sm text-slate-500 mb-1 sm:mb-0">{item.label}</span>
                    <span className="text-sm font-medium text-slate-900 text-left sm:text-right">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Right: Address */}
          <Card className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-semibold text-slate-900">Clinic Address</h3>
            </div>
            <div className="flex flex-col flex-1 p-6">
              <div className="flex flex-col">
                {[
                  { label: "Address Line 1", value: clinic.address || "123 Medical Center Blvd" },
                  { label: "Address Line 2", value: "Suite 400" },
                  { label: "City", value: "New York" },
                  { label: "State", value: "NY" },
                  { label: "Pincode", value: "10001" },
                  { label: "Country", value: "United States" },
                ].map((item, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 py-3.5 first:pt-0 last:border-0">
                    <span className="text-sm text-slate-500 mb-1 sm:mb-0">{item.label}</span>
                    <span className="text-sm font-medium text-slate-900 text-left sm:text-right">{item.value}</span>
                  </div>
                ))}
              </div>
              
              {/* Map Preview */}
              <div className="mt-auto pt-6">
                <div className="relative h-40 w-full overflow-hidden rounded-lg bg-slate-50 border border-slate-200">
                  <div className="absolute inset-0 bg-[url('https://maps.gstatic.com/mapfiles/api-3/images/google_gray.svg')] bg-center bg-no-repeat opacity-10"></div>
                  <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                  <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
                    <div className="rounded bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-sm border border-slate-200">
                      HealthCare Clinic
                    </div>
                    <div className="mt-1 h-3 w-0.5 bg-slate-300"></div>
                    <MapPin className="size-7 text-red-500 fill-white" />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Bottom Three Cards */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          {/* Working Hours */}
          <Card className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4 flex items-center gap-2">
              <Clock className="size-4 text-blue-600" />
              <h3 className="text-base font-semibold text-slate-900">Working Hours</h3>
            </div>
            <div className="flex flex-col flex-1 p-6">
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Monday – Friday</span>
                  <span className="text-sm font-medium text-slate-900">{clinic.settings?.workingHours?.open || "09:00 AM"} - {clinic.settings?.workingHours?.close || "08:00 PM"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Saturday</span>
                  <span className="text-sm font-medium text-slate-900">09:00 AM - 02:00 PM</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Sunday</span>
                  <span className="text-sm font-medium text-red-600">Closed</span>
                </div>
                <div className="flex justify-between items-center pt-3 mt-1 border-t border-slate-100">
                  <span className="text-sm text-slate-500">Emergency</span>
                  <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">24/7 Available</span>
                </div>
              </div>
              <div className="mt-auto pt-6">
                <Button variant="outline" className="w-full text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700 bg-transparent">
                  Manage Working Hours
                </Button>
              </div>
            </div>
          </Card>

          {/* Specialties */}
          <Card className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4 flex items-center gap-2">
              <Stethoscope className="size-4 text-blue-600" />
              <h3 className="text-base font-semibold text-slate-900">Specialties</h3>
            </div>
            <div className="flex flex-col flex-1 p-6">
              <div className="flex flex-col gap-3.5">
                {[
                  "General Medicine",
                  "Pediatrics",
                  "Dermatology",
                  "Gynecology",
                  "Orthopedics",
                ].map((spec, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex size-6 items-center justify-center rounded-full bg-blue-50 text-blue-600 shrink-0">
                      <CheckCircle className="size-3.5" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">{spec}</span>
                  </div>
                ))}
              </div>
              <div className="mt-auto pt-6">
                <Button variant="outline" className="w-full text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700 bg-transparent">
                  View All Specialties
                </Button>
              </div>
            </div>
          </Card>

          {/* Clinic Settings */}
          <Card className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4 flex items-center gap-2">
              <Settings className="size-4 text-blue-600" />
              <h3 className="text-base font-semibold text-slate-900">Clinic Settings</h3>
            </div>
            <div className="flex flex-col flex-1 p-4">
              <div className="flex flex-col gap-0.5">
                {[
                  { label: "Clinic Preferences", icon: Building2 },
                  { label: "Notification Settings", icon: Bell },
                  { label: "Billing & Invoice Settings", icon: CreditCard },
                  { label: "Users & Staff", icon: Users },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <button key={i} className="flex items-center justify-between rounded-lg p-2.5 hover:bg-slate-50 transition-colors text-left group">
                      <div className="flex items-center gap-3">
                        <Icon className="size-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                        <span className="text-sm font-medium text-slate-700">{item.label}</span>
                      </div>
                      <ChevronRight className="size-4 text-slate-300 group-hover:text-slate-400" />
                    </button>
                  )
                })}
              </div>
              <div className="mt-auto pt-4 px-2 pb-2">
                <Button variant="outline" className="w-full text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700 bg-transparent">
                  Manage Settings
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Clinic Overview */}
        <div className="mt-8">
          <h3 className="mb-4 text-lg font-bold text-slate-900">Clinic Overview</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: "Total Patients", value: "12,450", trend: "+12%", icon: Users },
              { label: "Appointments", value: "842", trend: "+5%", icon: Clock },
              { label: "Doctors", value: "24", trend: "0%", icon: Stethoscope },
              { label: "Staff Members", value: "45", trend: "+2%", icon: ShieldCheck },
              { label: "Total Revenue", value: "$45.2K", trend: "+18%", icon: Activity },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <Card key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                      <h4 className="mt-2 text-2xl font-bold text-slate-900">{stat.value}</h4>
                    </div>
                    <div className="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 shrink-0">
                      <Icon className="size-5" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-1.5 text-xs">
                    <span className={stat.trend.startsWith("+") ? "text-emerald-600 font-medium" : "text-slate-500 font-medium"}>
                      {stat.trend}
                    </span>
                    <span className="text-slate-400">vs last month</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 pb-4 text-center text-sm text-slate-400">
          © 2024 MyClinic. All rights reserved.
        </footer>
      </div>
    </div>
  );
}