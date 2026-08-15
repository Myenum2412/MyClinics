"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  IdentificationIcon as StethoscopeIcon,
} from "@heroicons/react/24/outline";
import type { Doctor } from "@/components/doctors-table";

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
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload = {
      name,
      specialty: specialty || null,
      mobile: mobile || null,
      qualifications: qualifications || null,
      city: city || null,
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
