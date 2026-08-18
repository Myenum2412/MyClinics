"use client";

import { useRequireRole } from "@/hooks/use-clinic-session";

export default function ClinicDashboardPage() {
  useRequireRole("patient");
  return null;
}