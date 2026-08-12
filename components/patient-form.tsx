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
import { UsersIcon } from "lucide-react";
import type { Patient } from "@/components/patients-table";

const genders = ["Male", "Female", "Other"];

export function PatientForm({
  onCreated,
  initial,
}: {
  onCreated: () => Promise<void>;
  initial?: Patient;
}) {
  const isEditing = Boolean(initial);

  const [fullName, setFullName] = useState(initial?.fullName ?? "");
  const [mobile, setMobile] = useState(initial?.mobile ?? "");
  const [secondaryMobile, setSecondaryMobile] = useState(
    initial?.secondaryMobile ?? ""
  );
  const [age, setAge] = useState(initial?.age != null ? String(initial.age) : "");
  const [gender, setGender] = useState(initial?.gender ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [password, setPassword] = useState("");
  const [whatsapp, setWhatsapp] = useState(initial?.whatsapp ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload = {
      fullName,
      mobile,
      secondaryMobile: secondaryMobile || null,
      age: age ? Number(age) : null,
      gender: gender || null,
      whatsapp: whatsapp || null,
    };

    const res = await fetch(
      isEditing ? `/api/patients/${initial!.id}` : "/api/patients",
      {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEditing
            ? payload
            : { ...payload, email, password }
        ),
      }
    );

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      toast.error(data.error || "Something went wrong. Please try again.");
      return;
    }

    toast.success(isEditing ? "Patient updated!" : "Patient added!", {
      description: isEditing
        ? undefined
        : `${fullName} can now sign in with the provided credentials.`,
    });

    if (!isEditing) {
      setFullName("");
      setMobile("");
      setSecondaryMobile("");
      setAge("");
      setGender("");
      setEmail("");
      setPassword("");
      setWhatsapp("");
    }

    await onCreated();
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <UsersIcon className="size-5" />
          {isEditing ? "Edit Patient" : "Add a Patient"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="fullName">Full Name *</FieldLabel>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="mobile">Mobile Number *</FieldLabel>
                <Input
                  id="mobile"
                  type="tel"
                  placeholder="+91 98765 43210"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="secondaryMobile">
                  Secondary Mobile Number
                </FieldLabel>
                <Input
                  id="secondaryMobile"
                  type="tel"
                  placeholder="+91 98765 43211"
                  value={secondaryMobile}
                  onChange={(e) => setSecondaryMobile(e.target.value)}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="age">Age</FieldLabel>
                <Input
                  id="age"
                  type="number"
                  min={0}
                  max={120}
                  placeholder="35"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="gender">Gender</FieldLabel>
                <Select value={gender} onValueChange={(v) => setGender(v ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {genders.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="email">Email *</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  disabled={isEditing}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {isEditing && (
                  <FieldDescription>
                    Email is tied to the patient&apos;s login account and cannot be
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
                    The patient signs in to their dashboard with this email and
                    password.
                  </FieldDescription>
                </Field>
              )}
            </div>
            <Field>
              <FieldLabel htmlFor="whatsapp">WhatsApp Number</FieldLabel>
              <Input
                id="whatsapp"
                type="tel"
                placeholder="+91 98765 43212"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
              />
            </Field>
          </FieldGroup>

          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading
              ? isEditing
                ? "Updating..."
                : "Adding..."
              : isEditing
                ? "Update Patient"
                : "Add Patient"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
