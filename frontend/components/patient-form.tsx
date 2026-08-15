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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UsersIcon,
} from "@heroicons/react/24/outline";
import type { Patient } from "@/components/patients-table";

const genders = ["Male", "Female", "Other"];
const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const maritalStatuses = ["Single", "Married", "Divorced", "Widowed"];
const yesNo = ["Yes", "No"];

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
  const [bloodGroup, setBloodGroup] = useState(initial?.bloodGroup ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(initial?.dateOfBirth ?? "");
  const [weight, setWeight] = useState(initial?.weight != null ? String(initial.weight) : "");
  const [height, setHeight] = useState(initial?.height != null ? String(initial.height) : "");
  const [guardianName, setGuardianName] = useState(initial?.guardianName ?? "");
  const [emergencyContactName, setEmergencyContactName] = useState(
    initial?.emergencyContactName ?? ""
  );
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(
    initial?.emergencyContactPhone ?? ""
  );
  const [maritalStatus, setMaritalStatus] = useState(initial?.maritalStatus ?? "");
  const [smoking, setSmoking] = useState(initial?.smoking ?? "");
  const [alcohol, setAlcohol] = useState(initial?.alcohol ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [pincode, setPincode] = useState(initial?.pincode ?? "");
  const [occupation, setOccupation] = useState(initial?.occupation ?? "");
  const [medicalHistory, setMedicalHistory] = useState(
    initial?.medicalHistory ?? ""
  );
  const [allergies, setAllergies] = useState(initial?.allergies ?? "");
  const [currentMedications, setCurrentMedications] = useState(
    initial?.currentMedications ?? ""
  );
  const [previousSurgeries, setPreviousSurgeries] = useState(
    initial?.previousSurgeries ?? ""
  );
  const [familyHistory, setFamilyHistory] = useState(
    initial?.familyHistory ?? ""
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
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
      bloodGroup: bloodGroup || null,
      dateOfBirth: dateOfBirth || null,
      weight: weight ? Number(weight) : null,
      height: height ? Number(height) : null,
      guardianName: guardianName || null,
      emergencyContactName: emergencyContactName || null,
      emergencyContactPhone: emergencyContactPhone || null,
      maritalStatus: maritalStatus || null,
      smoking: smoking || null,
      alcohol: alcohol || null,
      address: address || null,
      city: city || null,
      pincode: pincode || null,
      occupation: occupation || null,
      medicalHistory: medicalHistory || null,
      allergies: allergies || null,
      currentMedications: currentMedications || null,
      previousSurgeries: previousSurgeries || null,
      familyHistory: familyHistory || null,
      notes: notes || null,
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
      setBloodGroup("");
      setDateOfBirth("");
      setWeight("");
      setHeight("");
      setGuardianName("");
      setEmergencyContactName("");
      setEmergencyContactPhone("");
      setMaritalStatus("");
      setSmoking("");
      setAlcohol("");
      setAddress("");
      setCity("");
      setPincode("");
      setOccupation("");
      setMedicalHistory("");
      setAllergies("");
      setCurrentMedications("");
      setPreviousSurgeries("");
      setFamilyHistory("");
      setNotes("");
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
                <FieldLabel htmlFor="dateOfBirth">Date of Birth</FieldLabel>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
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
            <div className="grid gap-4 sm:grid-cols-3">
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
                <FieldLabel htmlFor="weight">Weight (kg)</FieldLabel>
                <Input
                  id="weight"
                  type="number"
                  min={0}
                  max={300}
                  step="0.1"
                  placeholder="65"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="height">Height (cm)</FieldLabel>
                <Input
                  id="height"
                  type="number"
                  min={0}
                  max={250}
                  step="0.1"
                  placeholder="165"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="guardianName">Guardian Name</FieldLabel>
              <Input
                id="guardianName"
                type="text"
                placeholder="Parent or guardian (for minors)"
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="email">Email *</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email id"
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
            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="maritalStatus">Marital Status</FieldLabel>
                <Select
                  value={maritalStatus}
                  onValueChange={(v) => setMaritalStatus(v ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {maritalStatuses.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="smoking">Smoking</FieldLabel>
                <Select value={smoking} onValueChange={(v) => setSmoking(v ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {yesNo.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="alcohol">Alcohol</FieldLabel>
                <Select value={alcohol} onValueChange={(v) => setAlcohol(v ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {yesNo.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="emergencyContactName">
                  Emergency Contact Name
                </FieldLabel>
                <Input
                  id="emergencyContactName"
                  type="text"
                  placeholder="e.g. Spouse, parent"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="emergencyContactPhone">
                  Emergency Contact Phone
                </FieldLabel>
                <Input
                  id="emergencyContactPhone"
                  type="tel"
                  placeholder="+91 98765 43213"
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="bloodGroup">Blood Group</FieldLabel>
                <Select
                  value={bloodGroup}
                  onValueChange={(v) => setBloodGroup(v ?? "")}
                >
                  <SelectTrigger className="w-full">
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
              </Field>
              <Field>
                <FieldLabel htmlFor="occupation">Occupation</FieldLabel>
                <Input
                  id="occupation"
                  type="text"
                  placeholder="e.g. Engineer, Student"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="address">Address</FieldLabel>
                <Textarea
                  id="address"
                  rows={3}
                  placeholder="House name, street, locality"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </Field>
              <div className="grid gap-4">
                <Field>
                  <FieldLabel htmlFor="city">City</FieldLabel>
                  <Input
                    id="city"
                    type="text"
                    placeholder="e.g. Kochi"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="pincode">Pincode</FieldLabel>
                  <Input
                    id="pincode"
                    type="text"
                    maxLength={6}
                    placeholder="e.g. 682020"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                  />
                </Field>
              </div>
            </div>
            <Field>
              <FieldLabel htmlFor="allergies">Allergies</FieldLabel>
              <Input
                id="allergies"
                type="text"
                placeholder="e.g. Penicillin"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="medicalHistory">Medical History</FieldLabel>
              <Textarea
                id="medicalHistory"
                rows={3}
                placeholder="Chronic conditions, past surgeries, ongoing treatment..."
                value={medicalHistory}
                onChange={(e) => setMedicalHistory(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="currentMedications">
                Current Medications
              </FieldLabel>
              <Textarea
                id="currentMedications"
                rows={3}
                placeholder="Medicines the patient is currently taking..."
                value={currentMedications}
                onChange={(e) => setCurrentMedications(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="previousSurgeries">Previous Surgeries</FieldLabel>
              <Textarea
                id="previousSurgeries"
                rows={2}
                placeholder="Surgical history, if any..."
                value={previousSurgeries}
                onChange={(e) => setPreviousSurgeries(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="familyHistory">Family History</FieldLabel>
              <Textarea
                id="familyHistory"
                rows={2}
                placeholder="Diseases common in the family..."
                value={familyHistory}
                onChange={(e) => setFamilyHistory(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="notes">Notes</FieldLabel>
              <Textarea
                id="notes"
                rows={3}
                placeholder="Any additional notes about the patient"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
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
