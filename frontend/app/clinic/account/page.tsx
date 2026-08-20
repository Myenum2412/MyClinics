"use client";

import { useEffect, useState } from "react";
import {
  LogOut,
  Mail,
  Phone,
  MapPin,
  Building2,
  User,
  Shield,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import type { Clinic } from "@/lib/clinic-api";
import { getOwnClinic } from "@/lib/clinic-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";

export default function AccountPage() {
  const session = useRequireRole("staff");
  const clinicId = session?.clinicId ?? "";
  const router = useRouter();

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

  const handleLogout = () => {
    localStorage.removeItem("clinic_token");
    document.cookie = "clinic_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push("/login");
  };

  if (loading || !clinic) {
    return (
      <div className="mx-auto max-w-4xl p-8 space-y-6">
        <Skeleton className="h-12 w-1/4 rounded-lg" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Building2 className="size-5" />
          </div>
          <span className="text-xl font-bold text-slate-900">{clinic.name || "My Clinic"}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3 text-sm text-slate-600">
            <span>{session?.name || "User"}</span>
            <Badge variant="secondary" className="text-xs">
              {session?.role?.replace("_", " ") || "Staff"}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50">
            <LogOut className="size-4" />
            Logout
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-4xl p-4 md:p-6 lg:p-8">
        {/* Clinic Profile Card */}
        <Card className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm mb-6">
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="text-xl font-bold text-slate-900">Clinic Profile</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-2xl font-bold">
                  {clinic.name ? clinic.name.charAt(0).toUpperCase() : "C"}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{clinic.name || "My Clinic"}</h3>
                  <p className="mt-1 text-sm text-slate-500">{clinic.description || "Clinic description not set"}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      <span className="mr-1.5 size-1.5 rounded-full bg-emerald-500" />
                      Active
                    </Badge>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500">Clinic ID: {clinic.clinicId || "N/A"}</span>
                  </div>
                </div>
              </div>
              <Button variant="outline" className="shrink-0 gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50">
                Edit Profile
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Two Column Layout */}
        <div className="grid gap-6 md:grid-cols-2 mb-6">
          {/* Contact & Basic Info */}
          <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Building2 className="size-4 text-blue-600" />
                Contact & Basic Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="size-4 text-slate-400 shrink-0" />
                <span className="text-slate-500">Email</span>
                <span className="ml-auto font-medium text-slate-900 truncate max-w-[60%]">{clinic.email || "Not set"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="size-4 text-slate-400 shrink-0" />
                <span className="text-slate-500">Phone</span>
                <span className="ml-auto font-medium text-slate-900 truncate max-w-[60%]">{clinic.phone || "Not set"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="size-4 text-slate-400 shrink-0" />
                <span className="text-slate-500">Address</span>
                <span className="ml-auto font-medium text-slate-900 truncate max-w-[60%] text-right">
                  {clinic.address || "Not set"}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="size-4 text-slate-400 shrink-0" />
                <span className="text-slate-500">Member Since</span>
                <span className="ml-auto font-medium text-slate-900">Aug 2021</span>
              </div>
            </CardContent>
          </Card>

          {/* Account & Settings */}
          <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Shield className="size-4 text-blue-600" />
                Account & Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <User className="size-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700">Your Role</span>
                </div>
                <Badge variant="secondary">{session?.role?.replace("_", " ") || "Staff"}</Badge>
              </div>
              <hr className="border-slate-100" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Clinic ID</span>
                <span className="font-mono text-slate-900">{clinic.clinicId || "N/A"}</span>
              </div>
              <hr className="border-slate-100" />
              <Button variant="outline" className="w-full gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50">
                Manage Settings
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">Quick Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Total Patients" value="12,450" icon={User} />
              <StatCard label="Appointments" value="842" icon={Calendar} />
              <StatCard label="Doctors" value="24" icon={Shield} />
              <StatCard label="Staff Members" value="45" icon={User} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <h4 className="mt-1 text-xl font-bold text-slate-900">{value}</h4>
        </div>
        <Icon className="size-8 text-blue-600" />
      </div>
    </div>
  );
}