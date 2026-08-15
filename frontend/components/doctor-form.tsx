"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CameraIcon,
  IdentificationIcon as StethoscopeIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type { Doctor } from "@/components/doctors-table";
import { cn } from "@/lib/utils";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const specialties = [
  "General Medicine",
  "Cardiology",
  "Dermatology",
  "Pediatrics",
  "Orthopedics",
  "Neurology",
  "ENT",
  "Ophthalmology",
  "Gynecology",
  "Dentistry",
  "Psychiatry",
  "General Surgery",
];

const genderOptions = ["Male", "Female", "Other"];

const allLanguages = [
  "Abkhaz",
  "Afar",
  "Afrikaans",
  "Akan",
  "Albanian",
  "Amharic",
  "Arabic",
  "Armenian",
  "Assamese",
  "Aymara",
  "Azerbaijani",
  "Bambara",
  "Bangla (Bengali)",
  "Basque",
  "Belarusian",
  "Bhojpuri",
  "Bosnian",
  "Bulgarian",
  "Burmese",
  "Cantonese",
  "Catalan",
  "Cebuano",
  "Chewa",
  "Chinese (Mandarin)",
  "Corsican",
  "Croatian",
  "Czech",
  "Danish",
  "Dhivehi",
  "Dogri",
  "Dutch",
  "English",
  "Esperanto",
  "Estonian",
  "Ewe",
  "Faroese",
  "Fijian",
  "Finnish",
  "French",
  "Frisian",
  "Galician",
  "Ganda",
  "Georgian",
  "German",
  "Greek",
  "Guarani",
  "Gujarati",
  "Haitian Creole",
  "Hausa",
  "Hawaiian",
  "Hebrew",
  "Hindi",
  "Hmong",
  "Hungarian",
  "Icelandic",
  "Igbo",
  "Ilocano",
  "Indonesian",
  "Irish",
  "Italian",
  "Japanese",
  "Javanese",
  "Kannada",
  "Kazakh",
  "Khmer",
  "Kinyarwanda",
  "Konkani",
  "Korean",
  "Krio",
  "Kurdish (Kurmanji)",
  "Kurdish (Sorani)",
  "Kyrgyz",
  "Lao",
  "Latin",
  "Latvian",
  "Lingala",
  "Lithuanian",
  "Luganda",
  "Luxembourgish",
  "Maithili",
  "Malagasy",
  "Malay",
  "Malayalam",
  "Maltese",
  "Manipuri (Meitei)",
  "Maori",
  "Marathi",
  "Mongolian",
  "Nepali",
  "Norwegian",
  "Odia (Oriya)",
  "Oromo",
  "Pashto",
  "Persian (Farsi)",
  "Polish",
  "Portuguese",
  "Punjabi",
  "Quechua",
  "Romanian",
  "Romansh",
  "Russian",
  "Samoan",
  "Sanskrit",
  "Santali",
  "Saraiki",
  "Scots Gaelic",
  "Serbian",
  "Sesotho",
  "Shona",
  "Sindhi",
  "Sinhala",
  "Slovak",
  "Slovenian",
  "Somali",
  "Spanish",
  "Sundanese",
  "Swahili",
  "Swedish",
  "Tagalog (Filipino)",
  "Tahitian",
  "Tajik",
  "Tamil",
  "Tatar",
  "Telugu",
  "Thai",
  "Tibetan",
  "Tigrinya",
  "Tongan",
  "Tsonga",
  "Turkish",
  "Turkmen",
  "Twi",
  "Ukrainian",
  "Urdu",
  "Uyghur",
  "Uzbek",
  "Vietnamese",
  "Welsh",
  "Xhosa",
  "Yiddish",
  "Yoruba",
  "Zulu",
  "Others",
];

const dayOptions = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type ScheduleRow = {
  day: string;
  enabled: boolean;
  start: string;
  end: string;
};

const emptySchedule = (): ScheduleRow[] =>
  dayOptions.map((day) => ({ day, enabled: false, start: "", end: "" }));

export function DoctorForm({
  onSaved,
  initial,
}: {
  onSaved: () => Promise<void>;
  initial?: Doctor;
}) {
  const isEditing = Boolean(initial);

  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [password, setPassword] = useState("");
  const [specialty, setSpecialty] = useState(initial?.specialty ?? "");
  const [mobile, setMobile] = useState(initial?.mobile ?? "");
  const [qualifications, setQualifications] = useState(
    initial?.qualifications ?? ""
  );
  const [city, setCity] = useState(initial?.city ?? "");
  const [consultationFee, setConsultationFee] = useState(
    initial?.consultationFee != null ? String(initial.consultationFee) : ""
  );
  const [experience, setExperience] = useState(initial?.experience ?? "");
  const [gender, setGender] = useState(initial?.gender ?? "");
  const [languages, setLanguages] = useState<string[]>(
    initial?.languages ?? []
  );
  const [registrationNumber, setRegistrationNumber] = useState(
    initial?.registrationNumber ?? ""
  );
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [schedule, setSchedule] = useState<ScheduleRow[]>(() =>
    dayOptions.map((day) => {
      const existing = initial?.schedule?.find((s) => s.day === day);
      return {
        day,
        enabled: Boolean(existing),
        start: existing?.start ?? "",
        end: existing?.end ?? "",
      };
    })
  );
  const [loading, setLoading] = useState(false);

  const [image, setImage] = useState<string | null>(initial?.image ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageLoading, setImageLoading] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Avatar image must be under 5MB.");
      return;
    }
    setImageLoading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setImage(typeof reader.result === "string" ? reader.result : null);
      setImageLoading(false);
    };
    reader.onerror = () => {
      setImageLoading(false);
      toast.error("Could not read the image.");
    };
    reader.readAsDataURL(file);
  }

  function addLanguage(lang: string) {
    if (!lang) return;
    setLanguages((prev) => (prev.includes(lang) ? prev : [...prev, lang]));
  }

  function toggleScheduleDay(day: string, enabled: boolean) {
    setSchedule((prev) =>
      prev.map((row) =>
        row.day === day
          ? {
              ...row,
              enabled,
              start: enabled ? row.start : "",
              end: enabled ? row.end : "",
            }
          : row
      )
    );
  }

  function updateScheduleDay(
    day: string,
    patch: Partial<Pick<ScheduleRow, "start" | "end">>
  ) {
    setSchedule((prev) =>
      prev.map((row) => (row.day === day ? { ...row, ...patch } : row))
    );
  }

  useEffect(() => {
    if (isEditing) return;
    let cancelled = false;
    async function fetchClinicAddress() {
      try {
        const res = await fetch("/api/organization");
        if (!res.ok) return;
        const data = (await res.json()) as {
          company?: { address?: string | null };
        };
        const clinicAddress = data?.company?.address;
        if (!cancelled && clinicAddress?.trim()) {
          setAddress((current) =>
            current.trim() ? current : clinicAddress.trim()
          );
        }
      } catch {
        /* ignore */
      }
    }
    void fetchClinicAddress();
    return () => {
      cancelled = true;
    };
  }, [isEditing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload = {
      name,
      specialty: specialty || null,
      mobile: mobile || null,
      qualifications: qualifications || null,
      city: city || null,
      consultationFee: consultationFee ? Number(consultationFee) : null,
      experience: experience || null,
      gender: gender || null,
      languages,
      registrationNumber: registrationNumber || null,
      bio: bio || null,
      address: address || null,
      schedule: schedule
        .filter((row) => row.enabled)
        .map((row) => ({
          day: row.day,
          start: row.start || null,
          end: row.end || null,
        })),
      image,
    };

    const res = await fetch(
      isEditing ? `/api/doctors/${initial!.id}` : "/api/doctors",
      {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEditing ? payload : { ...payload, email, password }
        ),
      }
    );

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      toast.error(data.error || "Something went wrong. Please try again.");
      return;
    }

    toast.success(isEditing ? "Doctor updated!" : "Doctor added!", {
      description: isEditing
        ? undefined
        : `${name} can now sign in with the provided credentials.`,
    });

    if (!isEditing) {
      setName("");
      setEmail("");
      setPassword("");
      setSpecialty("");
      setMobile("");
      setQualifications("");
      setCity("");
      setConsultationFee("");
      setExperience("");
      setGender("");
      setLanguages([]);
      setRegistrationNumber("");
      setBio("");
      setAddress("");
      setSchedule(emptySchedule());
      setImage(null);
    }

    await onSaved();
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <StethoscopeIcon className="size-5" />
          {isEditing ? "Edit Doctor" : "Add a Doctor"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <FieldGroup>
            <Field>
              <FieldLabel>Profile Photo</FieldLabel>
              <div className="flex flex-wrap items-center gap-4">
                <Avatar size="lg" className="size-16 data-[size=lg]:size-16">
                  <AvatarImage src={image ?? undefined} alt={name || "Doctor"} />
                  <AvatarFallback>{initials(name || "Doctor")}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={imageLoading}
                    >
                      <CameraIcon className="size-3.5" aria-hidden="true" />
                      {imageLoading
                        ? "Reading..."
                        : image
                          ? "Change photo"
                          : "Upload photo"}
                    </Button>
                    {image && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setImage(null)}
                      >
                        <XMarkIcon className="size-3.5" aria-hidden="true" />
                        Remove
                      </Button>
                    )}
                  </div>
                  <FieldDescription>
                    PNG, JPG or WebP, up to 5MB.
                  </FieldDescription>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="name">Full Name *</FieldLabel>
              <Input
                id="name"
                type="text"
                placeholder="Dr. Ravi Kumar"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="email">Email *</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="doctor@example.com"
                  required
                  disabled={isEditing}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {isEditing && (
                  <FieldDescription>
                    Email is tied to the doctor&apos;s login account and cannot be
                    changed.
                  </FieldDescription>
                )}
              </Field>
              {!isEditing && (
                <Field>
                  <FieldLabel htmlFor="password">Password *</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min. 6 characters"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <FieldDescription>
                    The doctor signs in to their dashboard with this email and
                    password.
                  </FieldDescription>
                </Field>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="specialty">
                  Specialty / Department
                </FieldLabel>
                <Select
                  value={specialty}
                  onValueChange={(v) => setSpecialty(v ?? "")}
                >
                  <SelectTrigger id="specialty" className="w-full">
                    <SelectValue placeholder="Select specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    {specialties.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="mobile">Mobile Number</FieldLabel>
                <Input
                  id="mobile"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="qualifications">Qualifications</FieldLabel>
                <Input
                  id="qualifications"
                  type="text"
                  placeholder="MBBS, MD (Cardiology)"
                  value={qualifications}
                  onChange={(e) => setQualifications(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="experience">Experience</FieldLabel>
                <Input
                  id="experience"
                  type="text"
                  placeholder="e.g. 12 years"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="gender">Gender</FieldLabel>
                <Select
                  value={gender}
                  onValueChange={(v) => setGender(v ?? "")}
                >
                  <SelectTrigger id="gender" className="w-full">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {genderOptions.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="registrationNumber">
                  Registration Number
                </FieldLabel>
                <Input
                  id="registrationNumber"
                  type="text"
                  placeholder="Medical council registration no."
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                />
                <FieldDescription>
                  State medical council / license number.
                </FieldDescription>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="consultationFee">
                  Consultation Fee (₹)
                </FieldLabel>
                <Input
                  id="consultationFee"
                  type="number"
                  min={0}
                  step={1}
                  placeholder="e.g. 500"
                  value={consultationFee}
                  onChange={(e) => setConsultationFee(e.target.value)}
                />
                <FieldDescription>
                  Per-visit consultation charge shown to patients.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="languages">Languages Spoken</FieldLabel>
                <Select
                  value=""
                  onValueChange={(v) => addLanguage(v ?? "")}
                >
                  <SelectTrigger id="languages" className="w-full sm:max-w-xs">
                    <SelectValue placeholder="Select a language..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allLanguages.map((lang) => (
                      <SelectItem key={lang} value={lang}>
                        {lang}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {languages.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {languages.map((lang) => (
                      <span
                        key={lang}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs"
                      >
                        {lang}
                        <button
                          type="button"
                          onClick={() =>
                            setLanguages((prev) =>
                              prev.filter((l) => l !== lang)
                            )
                          }
                          aria-label={`Remove ${lang}`}
                          className="text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <XMarkIcon className="size-3" aria-hidden="true" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <FieldDescription>
                    Pick a language from the list to add it.
                  </FieldDescription>
                )}
              </Field>
            </div>
            <Field>
              <FieldLabel>Available Days & Timings</FieldLabel>
              <div className="overflow-hidden rounded-lg border border-border">
                {schedule.map((row, idx) => (
                  <div
                    key={row.day}
                    className={cn(
                      "flex flex-wrap items-center gap-3 px-3 py-2",
                      idx !== 0 && "border-t border-border"
                    )}
                  >
                    <label className="flex w-24 shrink-0 cursor-pointer items-center gap-2 text-sm">
                      <Checkbox
                        checked={row.enabled}
                        onCheckedChange={(checked) =>
                          toggleScheduleDay(row.day, checked === true)
                        }
                        aria-label={`Available on ${row.day}`}
                      />
                      <span
                        className={
                          row.enabled ? "font-medium" : "text-muted-foreground"
                        }
                      >
                        {row.day}
                      </span>
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        disabled={!row.enabled}
                        value={row.start}
                        onChange={(e) =>
                          updateScheduleDay(row.day, { start: e.target.value })
                        }
                        className="w-32"
                        aria-label={`${row.day} start time`}
                      />
                      <span className="text-sm text-muted-foreground">to</span>
                      <Input
                        type="time"
                        disabled={!row.enabled}
                        value={row.end}
                        onChange={(e) =>
                          updateScheduleDay(row.day, { end: e.target.value })
                        }
                        className="w-32"
                        aria-label={`${row.day} end time`}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <FieldDescription>
                Check the days the doctor is available and set the hours for
                each day.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="address">Clinic Address</FieldLabel>
              <Textarea
                id="address"
                rows={2}
                placeholder="Clinic name, street, area..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
              <FieldDescription>
                {isEditing
                  ? "Clinic address for this doctor."
                  : "Auto-detected from your clinic profile. You can edit it for this doctor."}
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="bio">Bio / About</FieldLabel>
              <Textarea
                id="bio"
                rows={3}
                placeholder="Short introduction shown to patients..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="city">City</FieldLabel>
                <Input
                  id="city"
                  type="text"
                  placeholder="Kochi"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
                <FieldDescription>
                  Used on the home page to show this doctor to patients in the
                  same city.
                </FieldDescription>
              </Field>
            </div>
          </FieldGroup>

          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading
              ? isEditing
                ? "Updating..."
                : "Adding..."
              : isEditing
                ? "Update Doctor"
                : "Add Doctor"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
