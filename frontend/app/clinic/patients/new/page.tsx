"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import { createPatient } from "@/lib/clinic-api";
import { DoctorSelect } from "@/components/clinic/pickers";
import { PincodeLookup } from "@/components/clinic/pincode-lookup";
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
import { ChevronLeft, AlertCircle, CheckCircle, Camera, User } from "lucide-react";
import Link from "next/link";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDERS = ["Male", "Female", "Other"];
const MARITAL_STATUS = ["Single", "Married", "Divorced", "Widowed"];
const HOW_DID_YOU_HEAR = [
  "Family/Friends Referral",
  "Google Search",
  "Social Media",
  "Doctor Referral",
  "Walk-in",
  "Other",
];

interface PatientFormState {
  // Patient Information
  fullName: string;
  mobile: string;
  email: string;
  gender: string;
  dateOfBirth: string;
  bloodGroup: string;
  height: string;
  weight: string;
  maritalStatus: string;
  occupation: string;

  // Address
  address: string;
  city: string;
  state: string;
  pincode: string;

  // Emergency Contact
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactMobile: string;

  // Medical Information
  allergies: string;
  medicalConditions: string;
  previousSurgeries: string;
  currentMedications: string;

  // Account & Portal Access
  doctorId: string | null;
  password: string;
  confirmPassword: string;
  portalAccess: "enable" | "disable";
  loginNotification: "whatsapp" | "email" | "none";

  // Additional Information
  referredBy: string;
  howDidYouHear: string;
  notes: string;

  // Attachments
  attachments: AttachmentFile[];
}

const EMPTY_FORM: PatientFormState = {
  fullName: "",
  mobile: "",
  email: "",
  gender: "",
  dateOfBirth: "",
  bloodGroup: "",
  height: "",
  weight: "",
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
  doctorId: null,
  password: "",
  confirmPassword: "",
  portalAccess: "enable",
  loginNotification: "none",
  referredBy: "",
  howDidYouHear: "",
  notes: "",
  attachments: [],
};

// Validation functions
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
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
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
      <Label htmlFor={name} className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
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
              ? "border-red-500 focus:ring-red-500"
              : "border-blue-200 focus:ring-blue-400"
          }`}
        />
      )}
      {error && (
        <div className="flex items-center gap-1.5 text-sm text-red-600">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      {helperText && <p className="text-xs text-gray-500">{helperText}</p>}
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
    <Card className="border-blue-200 bg-gradient-to-b from-blue-50/50 to-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-gray-800">
          {title}
        </CardTitle>
        {description && (
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

export default function NewPatientPage() {
  const session = useRequireRole("doctor");
  const clinicId = session?.clinicId ?? "";
  const router = useRouter();

  const [form, setForm] = useState<PatientFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate age from date of birth
  const calculatedAge = useMemo(() => {
    return calculateAge(form.dateOfBirth);
  }, [form.dateOfBirth]);

  // Validate form
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
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

    // Optional validations
    if (form.email && !validateEmail(form.email)) {
      newErrors.email = "Enter a valid email address";
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
  }, [form]);

  // Handle form input changes
  const handleChange = (
    field: keyof PatientFormState,
    value: string | null
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value ?? "",
    }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle avatar selection
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

  // Handle save
  const handleSave = async () => {
    if (!validateForm()) {
      toast.error("Please fix the errors below");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        fullName: form.fullName.trim(),
        mobile: form.mobile.replace(/\D/g, ""),
        email: form.email.trim() || null,
        gender: form.gender.toLowerCase() || null,
        dateOfBirth: form.dateOfBirth || null,
        bloodGroup: form.bloodGroup || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        pincode: form.pincode.trim() || null,
        allergies: form.allergies
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
        notes: form.notes.trim() || null,
      };

      await createPatient(clinicId, {
        ...payload,
        password: form.password,
      });

      toast.success("Patient registered successfully");
      router.push(`/clinic/patients`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to register patient");
    } finally {
      setSaving(false);
    }
  };

  // Handle reset
  const handleReset = () => {
    if (
      confirm(
        "Are you sure you want to clear all entered data? This cannot be undone."
      )
    ) {
      setForm(EMPTY_FORM);
      setErrors({});
      setProfileImage(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
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
                <h1 className="text-2xl font-bold text-gray-900">New Patient</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Register a new patient in your clinic
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Form */}
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* 1. Patient Information */}
          <SectionCard title="1. Patient Information">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Upload patient photo"
                className="relative shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Patient photo preview"
                    className="size-20 rounded-full border border-blue-200 object-cover"
                  />
                ) : (
                  <span className="flex size-20 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-blue-600">
                    <User className="size-9" />
                  </span>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 flex size-7 items-center justify-center rounded-full border border-blue-200 bg-white text-blue-600 shadow-sm">
                  <Camera className="size-3.5" />
                </span>
              </button>
              <div>
                <p className="text-sm font-medium text-gray-700">Patient Photo</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Click the avatar to upload a profile photo (JPG, PNG — Max 2MB)
                </p>
                {profileImage && (
                  <p className="mt-1 truncate text-xs text-blue-600">{profileImage.name}</p>
                )}
                {errors.profileImage && (
                  <p className="mt-1 text-xs text-red-600">{errors.profileImage}</p>
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
              />
              <FormField
                label="Email"
                name="email"
                type="email"
                value={form.email}
                onChange={(v) => handleChange("email", v)}
                error={errors.email}
                placeholder="john@example.com"
              />
              <FormField
                label="Gender"
                name="gender"
                required
                error={errors.gender}
              >
                <Select value={form.gender} onValueChange={(v) => handleChange("gender", v)}>
                  <SelectTrigger className={`border ${errors.gender ? 'border-red-500' : 'border-blue-200'}`}>
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
              >
                <Select value={form.bloodGroup} onValueChange={(v) => handleChange("bloodGroup", v)}>
                  <SelectTrigger className="border-blue-200">
                    <SelectValue placeholder="Select blood group" />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOOD_GROUPS.map((bg) => (
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
              />
              <FormField
                label="Weight (kg)"
                name="weight"
                type="number"
                value={form.weight}
                onChange={(v) => handleChange("weight", v)}
                placeholder="65"
              />
              <FormField
                label="Marital Status"
                name="maritalStatus"
                error={errors.maritalStatus}
              >
                <Select value={form.maritalStatus} onValueChange={(v) => handleChange("maritalStatus", v)}>
                  <SelectTrigger className="border-blue-200">
                    <SelectValue placeholder="Select marital status" />
                  </SelectTrigger>
                  <SelectContent>
                    {MARITAL_STATUS.map((ms) => (
                      <SelectItem key={ms} value={ms.toLowerCase()}>
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
              />
            </div>
          </SectionCard>

          {/* 2. Address */}
          <SectionCard title="2. Address">
            <PincodeLookup
              pincode={form.pincode}
              city={form.city}
              state={form.state}
              pincodeError={errors.pincode}
              onPincodeChange={(v) => handleChange("pincode", v)}
              onCityChange={(v) => handleChange("city", v)}
              onStateChange={(v) => handleChange("state", v)}
            />
            <FormField
              label="Full Address"
              name="address"
              value={form.address}
              onChange={(v) => handleChange("address", v)}
              error={errors.address}
              required
              placeholder="Enter complete address including street, building, and landmark"
            >
              <Textarea
                value={form.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="Enter complete address"
                rows={3}
                className={`border ${
                  errors.address
                    ? "border-red-500 focus:ring-red-500"
                    : "border-blue-200 focus:ring-blue-400"
                }`}
              />
            </FormField>
          </SectionCard>

          {/* 3. Emergency Contact */}
          <SectionCard
            title="3. Emergency Contact"
            description="Optional but recommended"
          >
            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                label="Contact Name"
                name="emergencyContactName"
                value={form.emergencyContactName}
                onChange={(v) => handleChange("emergencyContactName", v)}
                placeholder="Jane Doe"
              />
              <FormField
                label="Relationship"
                name="emergencyContactRelationship"
                value={form.emergencyContactRelationship}
                onChange={(v) => handleChange("emergencyContactRelationship", v)}
                placeholder="Spouse"
              />
              <FormField
                label="Mobile Number"
                name="emergencyContactMobile"
                type="tel"
                value={form.emergencyContactMobile}
                onChange={(v) => handleChange("emergencyContactMobile", v)}
                error={errors.emergencyContactMobile}
                placeholder="9876543210"
              />
            </div>
          </SectionCard>

          {/* 4. Medical Information */}
          <SectionCard title="4. Medical Information">
            <FormField
              label="Known Allergies"
              name="allergies"
              value={form.allergies}
              onChange={(v) => handleChange("allergies", v)}
              placeholder="Penicillin, Nuts (comma-separated)"
              helperText="Enter multiple allergies separated by commas"
            />
            <FormField
              label="Medical Conditions"
              name="medicalConditions"
              value={form.medicalConditions}
              onChange={(v) => handleChange("medicalConditions", v)}
              placeholder="Diabetes, Hypertension (comma-separated)"
              helperText="Enter multiple conditions separated by commas"
            />
            <FormField
              label="Previous Surgeries / Hospitalizations"
              name="previousSurgeries"
              value={form.previousSurgeries}
              onChange={(v) => handleChange("previousSurgeries", v)}
              placeholder="Appendectomy (2015), Fracture treatment (2018)"
            >
              <Textarea
                value={form.previousSurgeries}
                onChange={(e) => handleChange("previousSurgeries", e.target.value)}
                placeholder="Describe any previous surgeries or hospitalizations"
                rows={2}
                className="border-blue-200"
              />
            </FormField>
            <FormField
              label="Current Medications"
              name="currentMedications"
              value={form.currentMedications}
              onChange={(v) => handleChange("currentMedications", v)}
              placeholder="Aspirin 500mg (daily), Lisinopril 10mg (daily)"
            >
              <Textarea
                value={form.currentMedications}
                onChange={(e) => handleChange("currentMedications", e.target.value)}
                placeholder="List current medications with dosages"
                rows={2}
                className="border-blue-200"
              />
            </FormField>
          </SectionCard>

          {/* 5. Account & Portal Access */}
          <SectionCard
            title="5. Account & Portal Access"
            description="Create patient portal credentials"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                label="Assign Doctor"
                name="doctorId"
                required
                error={errors.doctorId}
              >
                <DoctorSelect
                  clinicId={clinicId}
                  value={form.doctorId}
                  onChange={(v) => handleChange("doctorId", v)}
                  required
                />
              </FormField>
              <div />
              <FormField
                label="Portal Password"
                name="password"
                type="password"
                value={form.password}
                onChange={(v) => handleChange("password", v)}
                error={errors.password}
                required
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
                required
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-4 border-t border-blue-200 pt-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Portal Access
                </Label>
                <div className="mt-3 space-y-2">
                  {(["enable", "disable"] as const).map((option) => (
                    <label
                      key={option}
                      className="flex items-center gap-3 rounded-lg p-3 hover:bg-blue-50"
                    >
                      <input
                        type="radio"
                        name="portalAccess"
                        value={option}
                        checked={form.portalAccess === option}
                        onChange={(e) =>
                          handleChange("portalAccess", e.target.value as any)
                        }
                        className="h-4 w-4 border-blue-300 text-blue-600"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {option === "enable" ? "Enable Access" : "Disable Access"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Send Login Details Via
                </Label>
                <div className="mt-3 space-y-2">
                  {(["whatsapp", "email", "none"] as const).map((option) => (
                    <label
                      key={option}
                      className="flex items-center gap-3 rounded-lg p-3 hover:bg-blue-50"
                    >
                      <input
                        type="radio"
                        name="loginNotification"
                        value={option}
                        checked={form.loginNotification === option}
                        onChange={(e) =>
                          handleChange(
                            "loginNotification",
                            e.target.value as any
                          )
                        }
                        className="h-4 w-4 border-blue-300 text-blue-600"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {option === "whatsapp"
                          ? "WhatsApp"
                          : option === "email"
                            ? "Email"
                            : "Do Not Send"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>

          {/* 6. Additional Information */}
          <SectionCard title="6. Additional Information">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                label="Referred By"
                name="referredBy"
                value={form.referredBy}
                onChange={(v) => handleChange("referredBy", v)}
                placeholder="Doctor name or clinic name"
              />
              <FormField
                label="How Did You Hear About Us?"
                name="howDidYouHear"
                error={errors.howDidYouHear}
              >
                <Select
                  value={form.howDidYouHear}
                  onValueChange={(v) => handleChange("howDidYouHear", v)}
                >
                  <SelectTrigger className="border-blue-200">
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    {HOW_DID_YOU_HEAR.map((option) => (
                      <SelectItem
                        key={option}
                        value={option.toLowerCase()}
                      >
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
            >
              <Textarea
                value={form.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="Internal notes visible only to authorized clinic staff"
                rows={3}
                className="border-blue-200"
              />
            </FormField>
          </SectionCard>

          {/* 7. Attachments */}
          <SectionCard
            title="7. Attachments"
            description="Optional - upload patient documents"
          >
            <AttachmentUploader
              files={form.attachments}
              onChange={(files) => setForm((f) => ({ ...f, attachments: files }))}
              description="Upload ID proofs, reports, or documents (PDF, PNG, JPG up to 25 MB)."
            />
          </SectionCard>

          {/* Bottom Actions */}
          <div className="flex gap-3 border-t border-blue-200 pt-8">
            <Button
              variant="outline"
              onClick={handleReset}
              className="border-blue-300 text-blue-600 hover:bg-blue-50"
            >
              Reset
            </Button>
            <div className="flex-1" />
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              size="lg"
            >
              {saving ? "Saving..." : "Save Patient"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
