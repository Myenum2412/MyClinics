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
  AlertCircle,
  Copy,
  Check,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";

export default function NewPatientPage() {
  const session = useRequireRole("doctor");
  const clinicId = session?.clinicId ?? "";
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [createdPatient, setCreatedPatient] = useState<{
    patientId: string;
    fullName: string;
    email: string;
    password: string;
    loginNotification: string;
  } | null>(null);

  const [passwordCopied, setPasswordCopied] = useState(false);

  const copyPassword = (pw: string) => {
    navigator.clipboard.writeText(pw).then(() => {
      setPasswordCopied(true);
      setTimeout(() => setPasswordCopied(false), 2000);
    });
  };

  const handleSave = async (form: PatientFormState) => {
    setSaving(true);
    setSaveError(null);
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
      const msg = e instanceof Error ? e.message : "Failed to register patient";
      setSaveError(msg);
      toast.error(msg);
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

      {saveError && (
        <div className="px-4 sm:px-6 lg:px-8 pt-4">
          <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-semibold">Could not save patient</p>
              <p className="mt-0.5 text-destructive/80">{saveError}</p>
            </div>
            <button
              className="ml-auto text-destructive/60 hover:text-destructive"
              onClick={() => setSaveError(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}

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
              {/* Email row */}
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

              {/* Password row with copy button */}
              <div className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <KeyRound className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Password</p>
                  <p className="text-sm font-mono font-semibold text-foreground tracking-wide">
                    {createdPatient.password}
                  </p>
                </div>
                <button
                  type="button"
                  title="Copy password"
                  onClick={() => copyPassword(createdPatient.password)}
                  className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-background hover:bg-accent transition-colors"
                >
                  {passwordCopied ? (
                    <Check className="size-3.5 text-success" />
                  ) : (
                    <Copy className="size-3.5 text-muted-foreground" />
                  )}
                </button>
              </div>

              {/* Notification channel badge */}
              {createdPatient.loginNotification !== "none" && (
                <div className="flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1.5">
                  {createdPatient.loginNotification === "whatsapp" ? (
                    <MessageCircle className="size-3.5 text-primary" />
                  ) : (
                    <Mail className="size-3.5 text-primary" />
                  )}
                  <p className="text-xs font-medium text-primary">
                    {createdPatient.loginNotification === "whatsapp"
                      ? "Login details sent to patient via WhatsApp"
                      : "Login details sent to patient via WhatsApp (email notification queued)"}
                  </p>
                </div>
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