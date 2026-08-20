"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import { createPatient, updatePatient, uploadAvatar } from "@/lib/clinic-api";
import { PatientForm, PatientFormState, EMPTY_FORM } from "@/components/clinic/patient-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

  const [mode, setMode] = useState<"create" | "edit" | "view">("create");
  const [saving, setSaving] = useState(false);
  const [editingPatient, setEditingPatient] = useState<PatientFormState | null>(null);
  const [viewingPatient, setViewingPatient] = useState<PatientFormState | null>(null);

  const [createdPatient, setCreatedPatient] = useState<{
    patientId: string;
    fullName: string;
    email: string;
    password: string;
    loginNotification: string;
  } | null>(null);

  const handleView = (patient: PatientFormState) => {
    setViewingPatient(patient);
    setMode("view");
    setEditingPatient(null);
  };

  const handleEdit = (patient: PatientFormState) => {
    setEditingPatient(patient);
    setMode("edit");
    setViewingPatient(null);
  };

  const handleClose = () => {
    setMode("create");
    setViewingPatient(null);
    setEditingPatient(null);
  };

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

      if (isEditMode) {
        await updatePatient(clinicId, editingPatient!.patientId, payload);
        
        if (form.profileImage) {
          try {
            await uploadAvatar(clinicId, "patient", editingPatient!.patientId, form.profileImage);
          } catch {
            toast.warning("Patient updated, but the profile photo could not be uploaded");
          }
        }
        
        toast.success("Patient updated successfully");
        setMode("create");
        setEditingPatient(null);
        router.push("/clinic/patients");
      } else {
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
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : isEditMode ? "Failed to update patient" : "Failed to register patient");
    } finally {
      setSaving(false);
    }
  };

  const isEditMode = mode === "edit";
  const isViewMode = mode === "view";
  const formInitialData = isEditMode && editingPatient ? editingPatient : isViewMode && viewingPatient ? viewingPatient : EMPTY_FORM;

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-10 border-b border-blue-200 bg-white">
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-4">
              <Link
                href="/clinic/patients"
                className="inline-flex items-center justify-center rounded-lg p-2 hover:bg-blue-100 mt-1"
              >
                <ChevronLeft size={20} className="text-blue-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {isEditMode ? "Edit Patient" : isViewMode ? "View Patient" : "New Patient"}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {isEditMode
                    ? "Modify patient demographics, contact, medical history, insurance, and notes."
                    : isViewMode
                    ? "Complete patient details — demographics, contact, medical history, insurance, and notes."
                    : "Register a new patient in your clinic"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <PatientForm
          clinicId={clinicId}
          initialData={formInitialData}
          mode={mode}
          onSave={handleSave}
          onClose={handleClose}
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
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="size-7 text-green-600" />
            </div>
            <DialogTitle className="text-center text-lg">
              Patient Registered Successfully
            </DialogTitle>
            <DialogDescription className="text-center">
              {createdPatient?.fullName} has been added to your clinic with
              patient ID{" "}
              <span className="font-semibold text-gray-800">
                {createdPatient?.patientId}
              </span>
              .
            </DialogDescription>
          </DialogHeader>

          {createdPatient && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                  <Mail className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Portal Login (Email)</p>
                  <p className="truncate text-sm font-medium text-gray-800">
                    {createdPatient.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                  <KeyRound className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Password</p>
                  <p className="text-sm font-medium text-gray-800">
                    {createdPatient.password}
                  </p>
                </div>
              </div>
              {createdPatient.loginNotification === "whatsapp" && (
                <p className="text-xs text-blue-700 flex items-center gap-1">
                  Login details sent via WhatsApp
                </p>
              )}
              {createdPatient.loginNotification === "email" && (
                <p className="text-xs text-blue-700 flex items-center gap-1">
                  Login details sent via Email
                </p>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="border-blue-300 text-blue-600 hover:bg-blue-50 flex-1"
              onClick={() => {
                setCreatedPatient(null);
                router.push("/clinic/patients");
              }}
            >
              Go to Patients
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white flex-1 gap-1.5"
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