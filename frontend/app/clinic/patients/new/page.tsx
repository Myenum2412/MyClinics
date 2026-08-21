"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import { createPatient, uploadAvatar } from "@/lib/clinic-api";
import { PatientForm, PatientFormState, EMPTY_FORM } from "@/components/clinic/patient-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  CheckCircle,
  ExternalLink,
  KeyRound,
  Mail,
} from "lucide-react";
import Link from "next/link";

export default function NewPatientPage() {
  const session = useRequireRole("doctor");
  const clinicId = session?.clinicId ?? "";
  const router = useRouter();

  const [saving, setSaving] = useState(false);

  const [createdPatient, setCreatedPatient] = useState<{
    patientId: string;
    fullName: string;
    email: string;
    password: string;
    loginNotification: string;
  } | null>(null);

  const handleSave = async (form: PatientFormState) => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        fullName: form.fullName.trim(),
        mobile: form.mobile.replace(/\D/g, ""),
        whatsapp: form.whatsapp.trim() || null,
        email: form.email.trim() || null,
        gender: form.gender.toLowerCase() || null,
        dateOfBirth: form.dateOfBirth || null,
        bloodGroup: form.bloodGroup || null,
        height: form.height.trim() || null,
        weight: form.weight.trim() || null,
        occupation: form.occupation.trim() || null,
        maritalStatus: form.maritalStatus || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        pincode: form.pincode.trim() || null,
        emergencyContactName: form.emergencyContactName.trim() || null,
        emergencyContactRelationship: form.emergencyContactRelationship.trim() || null,
        emergencyContactMobile: form.emergencyContactMobile.trim() || null,
        allergies: form.allergies
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
        medicalConditions: form.medicalConditions.trim() || null,
        previousSurgeries: form.previousSurgeries.trim() || null,
        currentMedications: form.currentMedications.trim() || null,
        idType: form.idType || null,
        idNumber: form.idNumber.trim() || null,
        insuranceProvider: form.insuranceProvider.trim() || null,
        insurancePolicyNumber: form.insurancePolicyNumber.trim() || null,
        insurancePolicyHolderName: form.insurancePolicyHolderName.trim() || null,
        insuranceValidTill: form.insuranceValidTill || null,
        referredBy: form.referredBy.trim() || null,
        howDidYouHear: form.howDidYouHear || null,
        notes: form.notes.trim() || null,
        portalAccess: form.portalAccess,
        loginNotification: form.loginNotification,
        doctorId: form.doctorId || null,
      };

      if (form.portalAccess === "enable") {
        payload.password = form.password;
      }

      const created = await createPatient(clinicId, payload);

      if (form.profileImage) {
        try {
          await uploadAvatar(clinicId, "patient", created.patientId, form.profileImage);
        } catch {
          toast.warning("Patient saved, but the profile photo could not be uploaded");
        }
      }

      if (form.portalAccess === "enable" && created.userId) {
        setCreatedPatient({
          patientId: created.patientId,
          fullName: created.fullName,
          email: form.email.trim(),
          password: form.password,
          loginNotification: form.loginNotification,
        });
      } else {
        toast.success("Patient registered successfully");
        router.push("/clinic/patients");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to register patient");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 border-b border-border bg-background">
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-4">
              <Link
                href="/clinic/patients"
                className="inline-flex items-center justify-center rounded-lg p-2 hover:bg-muted mt-1"
              >
                <ChevronLeft size={20} className="text-muted-foreground" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground">New Patient</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Register a new patient in your clinic
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <PatientForm
          clinicId={clinicId}
          initialData={EMPTY_FORM}
          mode="create"
          onSave={handleSave}
          onClose={() => router.push("/clinic/patients")}
          saving={saving}
        />
      </div>

      <Dialog
        open={createdPatient !== null}
        onOpenChange={(open) => {
          if (!open && createdPatient) {
            setCreatedPatient(null);
            router.push("/clinic/patients");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/10">
              <CheckCircle className="size-7 text-success" />
            </div>
            <DialogTitle className="text-center text-lg">
              Patient Registered Successfully
            </DialogTitle>
            <DialogDescription className="text-center">
              {createdPatient?.fullName} has been added to your clinic with
              patient ID{" "}
              <span className="font-semibold text-foreground">
                {createdPatient?.patientId}
              </span>
              .
            </DialogDescription>
          </DialogHeader>

          {createdPatient && (
            <div className="rounded-xl border border-border bg-accent/50 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Mail className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Portal Login (Email)</p>
                  <p className="truncate text-sm font-medium text-foreground">
                    {createdPatient.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <KeyRound className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Password</p>
                  <p className="text-sm font-medium text-foreground">
                    {createdPatient.password}
                  </p>
                </div>
              </div>
              {createdPatient.loginNotification === "whatsapp" && (
                <p className="text-xs text-primary flex items-center gap-1">
                  Login details sent via WhatsApp
                </p>
              )}
              {createdPatient.loginNotification === "email" && (
                <p className="text-xs text-primary flex items-center gap-1">
                  Login details sent via Email
                </p>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="border-primary/30 text-primary hover:bg-accent flex-1"
              onClick={() => {
                setCreatedPatient(null);
                router.push("/clinic/patients");
              }}
            >
              Go to Patients
            </Button>
            <Button
              className="flex-1 gap-1.5"
              onClick={() => {
                window.open("/login?callbackUrl=/clinic", "_blank");
              }}
            >
              <ExternalLink className="size-4" />
              Open Patient Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}