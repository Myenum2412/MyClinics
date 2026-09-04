"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import { useDropdownOptions } from "@/lib/dropdown-options";
import { DoctorComboBox } from "@/components/clinic/pickers";
import { PincodeLookup } from "@/components/clinic/pincode-lookup";
import {
  WhatsAppInput,
  isIndianMobile,
} from "@/components/clinic/whatsapp-input";
import {
  AttachmentUploader,
  type AttachmentFile,
} from "@/components/clinic/attachment-uploader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  AlertCircle,
  Camera,
  User,
  ShieldCheck,
  KeyRound,
  Mail,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import { now, toLocalDateISO } from "@/lib/datetime";

const GENDERS = ["Male", "Female", "Other"];

export interface PatientFormState {
  fullName: string;
  mobile: string;
  whatsapp: string;
  email: string;
  gender: string;
  dateOfBirth: string;
  bloodGroup: string;
  height: string;
  weight: string;
  bloodPressure: string;
  temperature: string;
  pulse: string;
  respiratoryRate: string;
  spo2: string;
  maritalStatus: string;
  occupation: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactMobile: string;
  allergies: string;
  medicalConditions: string;
  previousSurgeries: string;
  currentMedications: string;
  idType: string;
  idNumber: string;
  insuranceProvider: string;
  insurancePolicyNumber: string;
  insurancePolicyHolderName: string;
  insuranceValidTill: string;
  referredBy: string;
  howDidYouHear: string;
  notes: string;
  doctorId: string | null;
  password: string;
  confirmPassword: string;
  portalAccess: "enable" | "disable";
  loginNotification: "whatsapp" | "email" | "none";
  attachments: AttachmentFile[];
  patientId: string;
  profileImage: File | null;
}

export const EMPTY_FORM: PatientFormState = {
  fullName: "",
  mobile: "",
  whatsapp: "",
  email: "",
  gender: "",
  dateOfBirth: "",
  bloodGroup: "",
  height: "",
  weight: "",
  bloodPressure: "",
  temperature: "",
  pulse: "",
  respiratoryRate: "",
  spo2: "",
  maritalStatus: "",
  occupation: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  emergencyContactName: "",
  emergencyContactRelationship: "",
  emergencyContactMobile: "",
  allergies: "",
  medicalConditions: "",
  previousSurgeries: "",
  currentMedications: "",
  idType: "",
  idNumber: "",
  insuranceProvider: "",
  insurancePolicyNumber: "",
  insurancePolicyHolderName: "",
  insuranceValidTill: "",
  referredBy: "",
  howDidYouHear: "",
  notes: "",
  doctorId: null,
  password: "",
  confirmPassword: "",
  portalAccess: "enable",
  loginNotification: "none",
  attachments: [],
  patientId: "",
  profileImage: null,
};

const validateIndianMobile = (mobile: string): boolean => {
  return /^[6-9]\d{9}$/.test(mobile.replace(/\D/g, ""));
};

const validateIndianPincode = (pincode: string): boolean => {
  return /^[1-9]\d{5}$/.test(pincode);
};

const validateEmail = (email: string): boolean => {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const calculateAge = (dateOfBirth: string): number | null => {
  if (!dateOfBirth) return null;
  const [ty, tm, td] = toLocalDateISO(now()).split("-").map(Number);
  const [by, bm, bd] = dateOfBirth.split("-").map(Number);
  let age = ty - by;
  const monthDiff = tm - bm;
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && td < bd)
  ) {
    age--;
  }
  return age >= 0 ? age : null;
};

function FormField({
  label,
  name,
  type = "text",
  value,
  onChange,
  error,
  required = false,
  placeholder,
  helperText,
  maxLength,
  pattern,
  disabled = false,
  children,
}: {
  label: string;
  name: string;
  type?: string;
  value?: string | number;
  onChange?: (val: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  helperText?: string;
  maxLength?: number;
  pattern?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name} className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children || (
        <Input
          id={name}
          type={type}
          value={value ?? ""}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          pattern={pattern}
          disabled={disabled}
          className={`border ${
            error
              ? "border-destructive focus:ring-destructive"
              : "border-border focus:ring-ring"
          }`}
        />
      )}
      {error && (
        <div className="flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border bg-gradient-to-b from-muted/50 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-foreground">
          {title}
        </CardTitle>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

interface PatientFormProps {
  clinicId: string;
  initialData?: Partial<PatientFormState>;
  mode: "create" | "edit" | "view";
  onSave?: (form: PatientFormState) => Promise<void>;
  onClose?: () => void;
  onEdit?: () => void;
  saving?: boolean;
  doctors?: { doctorId: string; name: string }[];
}

export function PatientForm({
  clinicId,
  initialData = EMPTY_FORM,
  mode,
  onSave,
  onClose,
  onEdit,
  saving = false,
  doctors = [],
}: PatientFormProps) {
  const { getOptions } = useDropdownOptions(clinicId);
  const bloodGroups = getOptions("blood_groups");
  const maritalStatuses = getOptions("marital_statuses");
  const howDidYouHear = getOptions("how_did_you_hear");
  const idProofTypes = getOptions("id_proof_types");

  const [form, setForm] = useState<PatientFormState>({ ...EMPTY_FORM, ...initialData } as PatientFormState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const portalEnabled = form.portalAccess === "enable";
  const isViewMode = mode === "view";
  const isEditMode = mode === "edit";
  const isCreateMode = mode === "create";

  const calculatedAge = useMemo(() => {
    return calculateAge(form.dateOfBirth);
  }, [form.dateOfBirth]);

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }
    if (!form.mobile.trim()) {
      newErrors.mobile = "Mobile number is required";
    } else if (!validateIndianMobile(form.mobile)) {
      newErrors.mobile = "Enter a valid Indian mobile number";
    }
    if (!form.gender) {
      newErrors.gender = "Gender is required";
    }
    if (!form.dateOfBirth) {
      newErrors.dateOfBirth = "Date of birth is required";
    }
    if (!form.address.trim()) {
      newErrors.address = "Full address is required";
    }
    if (!form.doctorId) {
      newErrors.doctorId = "Please assign a doctor";
    }

    if (portalEnabled) {
      if (!form.email.trim()) {
        newErrors.email = "Email is required to enable portal access";
      } else if (!validateEmail(form.email)) {
        newErrors.email = "Enter a valid email address";
      }
      if (isCreateMode) {
        if (!form.password) {
          newErrors.password = "Portal password is required";
        } else if (form.password.length < 8) {
          newErrors.password = "Password must be at least 8 characters";
        }
        if (!form.confirmPassword) {
          newErrors.confirmPassword = "Please confirm password";
        } else if (form.password !== form.confirmPassword) {
          newErrors.confirmPassword = "Passwords do not match";
        }
      } else if (isEditMode && form.password && form.password.length > 0) {
        if (form.password.length < 8) {
          newErrors.password = "Password must be at least 8 characters";
        }
        if (!form.confirmPassword) {
          newErrors.confirmPassword = "Please confirm password";
        } else if (form.password !== form.confirmPassword) {
          newErrors.confirmPassword = "Passwords do not match";
        }
      }
    }

    if (form.email && !portalEnabled && !validateEmail(form.email)) {
      newErrors.email = "Enter a valid email address";
    }
    if (form.whatsapp && !isIndianMobile(form.whatsapp)) {
      newErrors.whatsapp = "Enter a valid Indian WhatsApp number";
    }
    if (form.pincode && !validateIndianPincode(form.pincode)) {
      newErrors.pincode = "Enter a valid Indian pincode";
    }
    if (
      form.emergencyContactMobile &&
      !validateIndianMobile(form.emergencyContactMobile)
    ) {
      newErrors.emergencyContactMobile =
        "Enter a valid Indian mobile number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form, portalEnabled, isCreateMode, isEditMode]);

  const handleChange = (
    field: keyof PatientFormState,
    value: string | null
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value ?? "",
    }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleProfileImage = (file: File | null) => {
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setErrors((e) => ({ ...e, profileImage: "Only JPG or PNG images are allowed" }));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrors((e) => ({ ...e, profileImage: "Image must be smaller than 2MB" }));
      return;
    }
    setErrors((e) => {
      const next = { ...e };
      delete next.profileImage;
      return next;
    });
    setProfileImage(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please fix the errors below");
      return;
    }
    if (onSave) {
      await onSave(form);
    }
  };

  const renderViewField = (label: string, value: string | undefined | null) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      <div className="text-foreground">{value || ""}</div>
    </div>
  );

  if (isViewMode) {
    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <SectionCard title="1. Patient Information">
          <div className="grid gap-4 md:grid-cols-2">
            {renderViewField("Full Name", form.fullName)}
            {renderViewField("Mobile Number", form.mobile)}
            {renderViewField("WhatsApp Number", form.whatsapp)}
            {renderViewField("Email", form.email)}
            {renderViewField("Gender", form.gender ? form.gender.charAt(0).toUpperCase() + form.gender.slice(1) : "")}
            {renderViewField("Date of Birth", form.dateOfBirth)}
            {renderViewField("Blood Group", form.bloodGroup)}
            {renderViewField("Height (cm)", form.height)}
            {renderViewField("Weight (kg)", form.weight)}
            {renderViewField("Marital Status", form.maritalStatus)}
            {renderViewField("Occupation", form.occupation)}
          </div>
        </SectionCard>

        <SectionCard title="2. Vital Signs">
          <div className="grid gap-4 md:grid-cols-2">
            {renderViewField("Blood Pressure", form.bloodPressure ? `${form.bloodPressure} mmHg` : "")}
            {renderViewField("Temperature", form.temperature ? `${form.temperature} °C` : "")}
            {renderViewField("Pulse / Heart Rate", form.pulse ? `${form.pulse} bpm` : "")}
            {renderViewField("Respiratory Rate", form.respiratoryRate ? `${form.respiratoryRate} /min` : "")}
            {renderViewField("SpO₂ (Oxygen Saturation)", form.spo2 ? `${form.spo2} %` : "")}
          </div>
        </SectionCard>

        <SectionCard title="3. Address">
          <div className="grid gap-4 md:grid-cols-2">
            {renderViewField("Full Address", form.address)}
            {renderViewField("City", form.city)}
            {renderViewField("State", form.state)}
            {renderViewField("Pincode", form.pincode)}
          </div>
        </SectionCard>

        <SectionCard title="4. Emergency Contact">
          <div className="grid gap-4 md:grid-cols-3">
            {renderViewField("Contact Name", form.emergencyContactName)}
            {renderViewField("Relationship", form.emergencyContactRelationship)}
            {renderViewField("Mobile Number", form.emergencyContactMobile)}
          </div>
        </SectionCard>

        <SectionCard title="5. Medical Information">
          <div className="space-y-4">
            {renderViewField("Known Allergies", form.allergies)}
            {renderViewField("Medical Conditions", form.medicalConditions)}
            {renderViewField("Previous Surgeries / Hospitalizations", form.previousSurgeries)}
            {renderViewField("Current Medications", form.currentMedications)}
          </div>
        </SectionCard>

        <SectionCard title="6. Identification">
          <div className="grid gap-4 md:grid-cols-2">
            {renderViewField("ID Proof Type", form.idType)}
            {renderViewField("ID Number", form.idNumber)}
          </div>
        </SectionCard>

        <SectionCard title="7. Account & Portal Access">
          <div className="grid gap-4 md:grid-cols-2">
            {renderViewField(
              "Assigned Doctor",
              doctors.find((d) => d.doctorId === form.doctorId)?.name ?? form.doctorId
            )}
            {renderViewField("Portal Access", form.portalAccess)}
            {renderViewField("Login Notification", form.loginNotification)}
          </div>
        </SectionCard>

        <SectionCard title="8. Insurance">
          <div className="grid gap-4 md:grid-cols-2">
            {renderViewField("Insurance Provider", form.insuranceProvider)}
            {renderViewField("Policy Number", form.insurancePolicyNumber)}
            {renderViewField("Policy Holder Name", form.insurancePolicyHolderName)}
            {renderViewField("Valid Till", form.insuranceValidTill)}
          </div>
        </SectionCard>

        <SectionCard title="9. Additional Information">
          <div className="grid gap-4 md:grid-cols-2">
            {renderViewField("Referred By", form.referredBy)}
            {renderViewField("How Did You Hear About Us?", form.howDidYouHear)}
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Internal Notes</Label>
            <div className="text-foreground">{form.notes || ""}</div>
          </div>
        </SectionCard>

        <SectionCard title="10. Attachments">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Uploaded Documents</Label>
            <div className="text-foreground">
              {form.attachments && form.attachments.length > 0
                ? form.attachments.map((a, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span>{a.name}</span>
                      <span className="text-xs text-muted-foreground">({(a.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  ))
                : ""}
            </div>
          </div>
        </SectionCard>

        <div className="flex gap-3 border-t border-border pt-8">
          {onEdit && (
            <Button
              variant="outline"
              onClick={onEdit}
            >
              Edit Patient
            </Button>
          )}
          {onClose && (
            <Button
              variant="outline"
              onClick={onClose}
              className="border-primary/30 text-primary hover:bg-accent"
            >
              Close
            </Button>
          )}
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <SectionCard title="1. Patient Information">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Upload patient photo"
            className="relative shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            disabled={isViewMode}
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Patient photo preview"
                className="size-20 rounded-full border border-border object-cover"
              />
            ) : (
              <span className="flex size-20 items-center justify-center rounded-full border border-border bg-accent text-primary">
                <User className="size-9" />
              </span>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 flex size-7 items-center justify-center rounded-full border border-border bg-background text-primary shadow-sm">
              <Camera className="size-3.5" />
            </span>
          </button>
          <div>
            <p className="text-sm font-medium text-foreground">Patient Photo</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Click the avatar to upload a profile photo (JPG, PNG  Max 2MB)
            </p>
            {profileImage && (
              <p className="mt-1 truncate text-xs text-primary">{profileImage.name}</p>
            )}
            {errors.profileImage && (
              <p className="mt-1 text-xs text-destructive">{errors.profileImage}</p>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={(e) => {
              handleProfileImage(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
            disabled={isViewMode}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            label="Full Name"
            name="fullName"
            value={form.fullName}
            onChange={(v) => handleChange("fullName", v)}
            error={errors.fullName}
            required
            placeholder="John Doe"
            disabled={isViewMode}
          />
          <FormField
            label="Mobile Number"
            name="mobile"
            type="tel"
            value={form.mobile}
            onChange={(v) => handleChange("mobile", v)}
            error={errors.mobile}
            required
            placeholder="9876543210"
            helperText="10-digit Indian mobile number"
            disabled={isViewMode}
          />
          <div className="space-y-2">
            <Label
              htmlFor="whatsapp"
              className="text-sm font-medium text-foreground"
            >
              WhatsApp Number
            </Label>
            <WhatsAppInput
              id="whatsapp"
              value={form.whatsapp}
              onChange={(v) => handleChange("whatsapp", v)}
              error={errors.whatsapp}
              helperText="10-digit Indian WhatsApp number"
              disabled={isViewMode}
            />
          </div>
          <FormField
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={(v) => handleChange("email", v)}
            error={errors.email}
            placeholder="john@example.com"
            helperText={
              portalEnabled
                ? "Required  this is the patient's portal login username"
                : undefined
            }
            disabled={isViewMode}
          />
          <FormField
            label="Gender"
            name="gender"
            required
            error={errors.gender}
            disabled={isViewMode}
          >
            <Select value={form.gender} onValueChange={(v) => handleChange("gender", v)} disabled={isViewMode}>
              <SelectTrigger className={`border ${errors.gender ? 'border-destructive' : 'border-border'}`}>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                {GENDERS.map((g) => (
                  <SelectItem key={g} value={g.toLowerCase()}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField
            label="Date of Birth"
            name="dateOfBirth"
            type="date"
            value={form.dateOfBirth}
            onChange={(v) => handleChange("dateOfBirth", v)}
            error={errors.dateOfBirth}
            required
            disabled={isViewMode}
          />
          <FormField
            label="Age (Auto-calculated)"
            name="age"
            type="text"
            value={calculatedAge !== null ? calculatedAge : ""}
            disabled
            placeholder="Age"
          />
          <FormField
            label="Blood Group"
            name="bloodGroup"
            error={errors.bloodGroup}
            disabled={isViewMode}
          >
            <Select value={form.bloodGroup} onValueChange={(v) => handleChange("bloodGroup", v)} disabled={isViewMode}>
              <SelectTrigger className="border-border">
                <SelectValue placeholder="Select blood group" />
              </SelectTrigger>
              <SelectContent>
                {bloodGroups.map((bg) => (
                  <SelectItem key={bg} value={bg}>
                    {bg}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField
            label="Height (cm)"
            name="height"
            type="number"
            value={form.height}
            onChange={(v) => handleChange("height", v)}
            placeholder="170"
            disabled={isViewMode}
          />
          <FormField
            label="Weight (kg)"
            name="weight"
            type="number"
            value={form.weight}
            onChange={(v) => handleChange("weight", v)}
            placeholder="65"
            disabled={isViewMode}
          />
          <FormField
            label="Marital Status"
            name="maritalStatus"
            error={errors.maritalStatus}
            disabled={isViewMode}
          >
            <Select value={form.maritalStatus} onValueChange={(v) => handleChange("maritalStatus", v)} disabled={isViewMode}>
              <SelectTrigger className="border-border">
                <SelectValue placeholder="Select marital status" />
              </SelectTrigger>
              <SelectContent>
                {maritalStatuses.map((ms) => (
                  <SelectItem key={ms} value={ms}>
                    {ms}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField
            label="Occupation"
            name="occupation"
            value={form.occupation}
            onChange={(v) => handleChange("occupation", v)}
            placeholder="Software Engineer"
            disabled={isViewMode}
          />
        </div>
      </SectionCard>

      <SectionCard title="2. Vital Signs" description="Optional  captured at registration, editable anytime">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            label="Blood Pressure"
            name="bloodPressure"
            value={form.bloodPressure}
            onChange={(v) => handleChange("bloodPressure", v)}
            placeholder="120/80"
            helperText="mmHg, e.g. 120/80"
            disabled={isViewMode}
          />
          <FormField
            label="Temperature"
            name="temperature"
            value={form.temperature}
            onChange={(v) => handleChange("temperature", v)}
            placeholder="98.6"
            helperText="°F or °C"
            disabled={isViewMode}
          />
          <FormField
            label="Pulse / Heart Rate"
            name="pulse"
            value={form.pulse}
            onChange={(v) => handleChange("pulse", v)}
            placeholder="72"
            helperText="beats per minute (bpm)"
            disabled={isViewMode}
          />
          <FormField
            label="Respiratory Rate"
            name="respiratoryRate"
            value={form.respiratoryRate}
            onChange={(v) => handleChange("respiratoryRate", v)}
            placeholder="16"
            helperText="breaths per minute"
            disabled={isViewMode}
          />
          <FormField
            label="SpO₂ (Oxygen Saturation)"
            name="spo2"
            value={form.spo2}
            onChange={(v) => handleChange("spo2", v)}
            placeholder="98"
            helperText="%, e.g. 98"
            disabled={isViewMode}
          />
        </div>
      </SectionCard>

      <SectionCard title="3. Address">
        <PincodeLookup
          pincode={form.pincode}
          city={form.city}
          state={form.state}
          pincodeError={errors.pincode}
          onPincodeChange={(v) => handleChange("pincode", v)}
          onCityChange={(v) => handleChange("city", v)}
          onStateChange={(v) => handleChange("state", v)}
          disabled={isViewMode}
        />
        <FormField
          label="Full Address"
          name="address"
          value={form.address}
          onChange={(v) => handleChange("address", v)}
          error={errors.address}
          required
          placeholder="Enter complete address including street, building, and landmark"
          disabled={isViewMode}
        >
          <Textarea
            value={form.address}
            onChange={(e) => handleChange("address", e.target.value)}
            placeholder="Enter complete address"
            rows={3}
            className={`border ${
              errors.address
                ? "border-destructive focus:ring-destructive"
                : "border-border focus:ring-ring"
            }`}
            disabled={isViewMode}
          />
        </FormField>
      </SectionCard>

      <SectionCard
        title="4. Emergency Contact"
        description="Optional but recommended"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <FormField
            label="Contact Name"
            name="emergencyContactName"
            value={form.emergencyContactName}
            onChange={(v) => handleChange("emergencyContactName", v)}
            placeholder="Jane Doe"
            disabled={isViewMode}
          />
          <FormField
            label="Relationship"
            name="emergencyContactRelationship"
            value={form.emergencyContactRelationship}
            onChange={(v) => handleChange("emergencyContactRelationship", v)}
            placeholder="Spouse"
            disabled={isViewMode}
          />
          <FormField
            label="Mobile Number"
            name="emergencyContactMobile"
            type="tel"
            value={form.emergencyContactMobile}
            onChange={(v) => handleChange("emergencyContactMobile", v)}
            error={errors.emergencyContactMobile}
            placeholder="9876543210"
            disabled={isViewMode}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="5. Medical Information"
        description="Shared with the assigned doctor for prescriptions and consultations"
      >
        <FormField
          label="Known Allergies"
          name="allergies"
          value={form.allergies}
          onChange={(v) => handleChange("allergies", v)}
          placeholder="Penicillin, Nuts (comma-separated)"
          helperText="Enter multiple allergies separated by commas"
          disabled={isViewMode}
        />
        <FormField
          label="Medical Conditions"
          name="medicalConditions"
          value={form.medicalConditions}
          onChange={(v) => handleChange("medicalConditions", v)}
          placeholder="Diabetes, Hypertension (comma-separated)"
          helperText="Enter multiple conditions separated by commas"
          disabled={isViewMode}
        />
        <FormField
          label="Previous Surgeries / Hospitalizations"
          name="previousSurgeries"
          value={form.previousSurgeries}
          onChange={(v) => handleChange("previousSurgeries", v)}
          placeholder="Appendectomy (2015), Fracture treatment (2018)"
          disabled={isViewMode}
        >
          <Textarea
            value={form.previousSurgeries}
            onChange={(e) => handleChange("previousSurgeries", e.target.value)}
            placeholder="Describe any previous surgeries or hospitalizations"
            rows={2}
            className="border-border"
            disabled={isViewMode}
          />
        </FormField>
        <FormField
          label="Current Medications"
          name="currentMedications"
          value={form.currentMedications}
          onChange={(v) => handleChange("currentMedications", v)}
          placeholder="Aspirin 500mg (daily), Lisinopril 10mg (daily)"
          disabled={isViewMode}
        >
          <Textarea
            value={form.currentMedications}
            onChange={(e) => handleChange("currentMedications", e.target.value)}
            placeholder="List current medications with dosages"
            rows={2}
            className="border-border"
            disabled={isViewMode}
          />
        </FormField>
      </SectionCard>

      <SectionCard
        title="6. Identification"
        description="Optional  only fill if required by your clinic"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="ID Proof Type" name="idType" error={errors.idType} disabled={isViewMode}>
            <Select value={form.idType} onValueChange={(v) => handleChange("idType", v)} disabled={isViewMode}>
              <SelectTrigger className="border-border">
                <SelectValue placeholder="Select ID proof type" />
              </SelectTrigger>
              <SelectContent>
                {idProofTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField
            label="ID Number"
            name="idNumber"
            value={form.idNumber}
            onChange={(v) => handleChange("idNumber", v)}
            placeholder="Enter the ID number"
            disabled={isViewMode}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="7. Account & Portal Access"
        description="Assign the patient to a doctor and optionally create patient portal credentials"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            label="Assign Doctor"
            name="doctorId"
            required
            error={errors.doctorId}
          >
            {isViewMode ? (
              <div className="border border-border rounded-md px-3 py-2 text-foreground bg-muted">
                {form.doctorId || ""}
              </div>
            ) : (
              <DoctorComboBox
                clinicId={clinicId}
                value={form.doctorId}
                onChange={(v) => handleChange("doctorId", v)}
                required
              />
            )}
          </FormField>
          <div />
          <FormField
            label="Portal Password"
            name="password"
            type="password"
            value={form.password}
            onChange={(v) => handleChange("password", v)}
            error={errors.password}
            required={isCreateMode}
            disabled={!portalEnabled || isViewMode}
            placeholder="••••••••"
            helperText="Minimum 8 characters"
          />
          <FormField
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={(v) => handleChange("confirmPassword", v)}
            error={errors.confirmPassword}
            required={isCreateMode}
            disabled={!portalEnabled || isViewMode}
            placeholder="••••••••"
          />
        </div>

        <div className="space-y-4 border-t border-border pt-4">
          <div>
            <Label className="text-sm font-medium text-foreground">
              Patient Portal Access
            </Label>
            <div className="mt-3 space-y-2">
              {(["enable", "disable"] as const).map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-3 rounded-lg p-3 hover:bg-accent"
                >
                  <input
                    type="radio"
                    name="portalAccess"
                    value={option}
                    checked={form.portalAccess === option}
                    onChange={(e) => {
                      handleChange("portalAccess", e.target.value as "enable" | "disable");
                      if (e.target.value === "disable") {
                        setForm((prev) => ({
                          ...prev,
                          portalAccess: "disable",
                          password: "",
                          confirmPassword: "",
                          loginNotification: "none",
                        }));
                      }
                    }}
                    className="h-4 w-4 border-primary/30 text-primary"
                    disabled={isViewMode}
                  />
                  <span className="text-sm font-medium text-foreground">
                    {option === "enable" ? "Enable Access" : "Disable Access"}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {portalEnabled && (
            <div>
              <Label className="text-sm font-medium text-foreground">
                Send Login Details Via
              </Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                The patient receives login credentials only through the selected method
              </p>
              <div className="mt-3 space-y-2">
                {(["whatsapp", "email", "none"] as const).map((option) => (
                  <label
                    key={option}
                    className="flex items-center gap-3 rounded-lg p-3 hover:bg-accent"
                  >
                    <input
                      type="radio"
                      name="loginNotification"
                      value={option}
                      checked={form.loginNotification === option}
                      onChange={(e) =>
                        handleChange(
                          "loginNotification",
                          e.target.value as "whatsapp" | "email" | "none"
                        )
                      }
                      className="h-4 w-4 border-primary/30 text-primary"
                      disabled={isViewMode}
                    />
                    <span className="text-sm font-medium text-foreground">
                      {option === "whatsapp"
                        ? "Send login details via WhatsApp"
                        : option === "email"
                          ? "Send login details via Email"
                          : "Do not send"}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="8. Insurance"
        description="Optional  add if the patient has health insurance"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            label="Insurance Provider"
            name="insuranceProvider"
            value={form.insuranceProvider}
            onChange={(v) => handleChange("insuranceProvider", v)}
            placeholder="e.g. Star Health, ICICI Lombard"
            disabled={isViewMode}
          />
          <FormField
            label="Policy Number"
            name="insurancePolicyNumber"
            value={form.insurancePolicyNumber}
            onChange={(v) => handleChange("insurancePolicyNumber", v)}
            placeholder="Policy number"
            disabled={isViewMode}
          />
          <FormField
            label="Policy Holder Name"
            name="insurancePolicyHolderName"
            value={form.insurancePolicyHolderName}
            onChange={(v) => handleChange("insurancePolicyHolderName", v)}
            placeholder="Name on the policy"
            disabled={isViewMode}
          />
          <FormField
            label="Valid Till"
            name="insuranceValidTill"
            type="date"
            value={form.insuranceValidTill}
            onChange={(v) => handleChange("insuranceValidTill", v)}
            disabled={isViewMode}
          />
        </div>
      </SectionCard>

      <SectionCard title="9. Additional Information">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            label="Referred By"
            name="referredBy"
            value={form.referredBy}
            onChange={(v) => handleChange("referredBy", v)}
            placeholder="Doctor name or clinic name"
            disabled={isViewMode}
          />
          <FormField
            label="How Did You Hear About Us?"
            name="howDidYouHear"
            error={errors.howDidYouHear}
            disabled={isViewMode}
          >
            <Select
              value={form.howDidYouHear}
              onValueChange={(v) => handleChange("howDidYouHear", v)}
              disabled={isViewMode}
            >
              <SelectTrigger className="border-border">
                <SelectValue placeholder="Select option" />
              </SelectTrigger>
              <SelectContent>
                {howDidYouHear.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>
        <FormField
          label="Internal Notes"
          name="notes"
          value={form.notes}
          onChange={(v) => handleChange("notes", v)}
          placeholder="Add any additional notes (visible only to clinic staff)"
          disabled={isViewMode}
        >
          <Textarea
            value={form.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            placeholder="Internal notes  visible only to authorized clinic staff"
            rows={3}
            className="border-border"
            disabled={isViewMode}
          />
          <p className="text-xs text-warning flex items-center gap-1">
            <ShieldCheck className="size-3.5" />
            Visible only to authorized clinic staff, never to the patient
          </p>
        </FormField>
      </SectionCard>

      <SectionCard
        title="10. Attachments"
        description="Optional - upload patient documents"
      >
        {isViewMode ? (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Uploaded Documents</Label>
            <div className="text-foreground">
              {form.attachments && form.attachments.length > 0
                ? form.attachments.map((a, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span>{a.name}</span>
                      <span className="text-xs text-muted-foreground">({(a.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  ))
                : ""}
            </div>
          </div>
        ) : (
          <AttachmentUploader
            files={form.attachments}
            onChange={(files) => setForm((f) => ({ ...f, attachments: files }))}
            description="Upload ID proofs, reports, videos, or documents (JPG, PNG, PDF, MP4, MOV, WEBM up to 25 MB)."
            accept={[
              "image/jpeg",
              "image/png",
              "application/pdf",
              "video/*",
              ".mp4",
              ".mov",
              ".webm",
              ".avi",
              ".mkv",
            ]}
          />
        )}
      </SectionCard>

      <div className="flex gap-3 border-t border-border pt-8">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={saving}
          className="border-primary/30 text-primary hover:bg-accent"
        >
          {isViewMode ? "Close" : "Cancel"}
        </Button>
        <div className="flex-1" />
        {!isViewMode && (
          <Button
            type="submit"
            disabled={saving}
            size="lg"
          >
            {saving ? "Saving..." : isCreateMode ? "Save Patient" : "Update Patient"}
          </Button>
        )}
      </div>
    </form>
  );
}