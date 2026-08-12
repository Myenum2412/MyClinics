"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PlusIcon, Printer, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Textarea } from "@/components/ui/textarea";
import { PillIcon } from "lucide-react";
import { printPrescription } from "@/components/prescription-print";
import { prescriptionHtml } from "@/lib/print-documents";
import { saveReportCopy } from "@/components/report-copy";
import { PatientPicker, type PatientPick } from "@/components/patient-picker";
import type { Prescription } from "@/components/prescriptions-table";

const genders = ["Male", "Female", "Other"];

const foodOptions = ["Before Food", "After Food", "Not Applicable"];

type MedicineInput = {
  name: string;
  frequency: string;
  duration: string;
  beforeAfterFood: string;
  specialInstructions: string;
};

function emptyMedicine(): MedicineInput {
  return {
    name: "",
    frequency: "",
    duration: "",
    beforeAfterFood: "After Food",
    specialInstructions: "",
  };
}

function toInputs(initial?: Prescription | null): MedicineInput[] {
  if (!initial || !initial.medicines.length) return [emptyMedicine()];
  return initial.medicines.map((m) => ({ ...m }));
}

export function PrescriptionForm({
  initial,
  onSaved,
  onCancel,
  patients,
}: {
  initial?: Prescription | null;
  onSaved: () => Promise<void>;
  onCancel: () => void;
  patients?: PatientPick[];
}) {
  const isEdit = Boolean(initial);

  const [patientName, setPatientName] = useState(initial?.patientName ?? "");
  const [age, setAge] = useState(initial?.age ? String(initial.age) : "");
  const [gender, setGender] = useState(initial?.gender ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [visitDate, setVisitDate] = useState(initial?.visitDate ?? "");
  const [diagnosis, setDiagnosis] = useState(initial?.diagnosis ?? "");
  const [medicines, setMedicines] = useState<MedicineInput[]>(toInputs(initial));
  const [symptoms, setSymptoms] = useState(initial?.symptoms ?? "");
  const [testsRecommended, setTestsRecommended] = useState(
    initial?.testsRecommended ?? ""
  );
  const [followUpDate, setFollowUpDate] = useState(initial?.followUpDate ?? "");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [loading, setLoading] = useState(false);
  const [medicineOptions, setMedicineOptions] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/medicines", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.medicines)) {
          setMedicineOptions(
            data.medicines.map((m: { name: string }) => m.name)
          );
        }
      })
      .catch(() => {});
  }, []);

  const medicineOptionsWithExisting = Array.from(
    new Set([
      ...medicineOptions,
      ...medicines.map((m) => m.name).filter((n) => n.trim()),
    ])
  ).sort((a, b) => a.localeCompare(b));

  function handlePickPatient(patient: PatientPick) {
    setSelectedPatientId(patient.id);
    setPatientName(patient.fullName);
    setAge(patient.age != null ? String(patient.age) : "");
    setGender(patient.gender ?? "");
    setPhone(patient.mobile);
  }

  function updateMedicine(i: number, patch: Partial<MedicineInput>) {
    setMedicines((prev) =>
      prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m))
    );
  }

  function removeMedicine(i: number) {
    setMedicines((prev) =>
      prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)
    );
  }

  function buildPayload() {
    return {
      patientName,
      age: age ? Number(age) : null,
      gender: gender || null,
      phone: phone || null,
      visitDate: visitDate || null,
      diagnosis,
      medicines: medicines.filter((m) => m.name.trim()),
      symptoms: symptoms || null,
      testsRecommended: testsRecommended || null,
      followUpDate: followUpDate || null,
    };
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch(
      isEdit ? `/api/prescriptions/${initial?.id ?? ""}` : "/api/prescriptions",
      {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      }
    );

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      toast.error(data.error || "Something went wrong. Please try again.");
      return;
    }

    const copySaved = await saveCopy();

    toast.success(isEdit ? "Prescription updated!" : "Prescription saved!", {
      description: copySaved
        ? `${patientName} · copy saved to patient folder`
        : patientName,
    });

    await onSaved();
    onCancel();
  }

  async function saveCopy(): Promise<boolean> {
    const name = patientName.trim();
    if (!name) return false;
    try {
      const p: Prescription = {
        id: initial?.id ?? "",
        ...buildPayload(),
        visitDate: visitDate || "",
        doctorName: initial?.doctorName ?? "Doctor",
        medicines: buildPayload().medicines,
      };
      const matched = patients?.find(
        (pt) => pt.fullName.toLowerCase() === name.toLowerCase()
      );
      await saveReportCopy({
        html: prescriptionHtml(p),
        fileName: `Prescription-${name.replace(/\s+/g, "-")}-${new Date()
          .toISOString()
          .slice(0, 10)}.html`,
        category: "prescription",
        patientId: selectedPatientId || matched?.id || null,
        patientName: name,
      });
      return true;
    } catch (error) {
      console.error("Save prescription copy error", error);
      return false;
    }
  }

  function handlePrint() {
    const p: Prescription = {
      id: initial?.id ?? "",
      ...buildPayload(),
      visitDate: visitDate || "",
      doctorName: initial?.doctorName ?? "Doctor",
      medicines: buildPayload().medicines,
    };
    printPrescription(p);
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <PillIcon className="size-5" />
          {isEdit ? "Edit Prescription" : "Prescription Form"}
        </CardTitle>
        <CardDescription>
          {isEdit
            ? "Update the prescription details below."
            : "Create and manage a patient prescription."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="flex flex-col gap-8">
          <fieldset className="flex flex-col gap-4">
            <legend className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Patient Details
            </legend>
            <FieldGroup>
              {patients && patients.length > 0 && (
                <Field>
                  <FieldLabel htmlFor="patientPicker">Select Patient</FieldLabel>
                  <PatientPicker
                    id="patientPicker"
                    patients={patients}
                    value={selectedPatientId}
                    onPick={handlePickPatient}
                  />
                  <FieldDescription>
                    Selecting a patient auto-fills the details below.
                  </FieldDescription>
                </Field>
              )}
              <Field>
                <FieldLabel htmlFor="patientName">Patient Name *</FieldLabel>
                <Input
                  id="patientName"
                  type="text"
                  placeholder="Ravi Kumar"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                />
              </Field>
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
                  <FieldLabel htmlFor="phone">Phone Number</FieldLabel>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="visitDate">Visit Date</FieldLabel>
                  <Input
                    id="visitDate"
                    type="date"
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                  />
                </Field>
              </div>
            </FieldGroup>
          </fieldset>

          <fieldset className="flex flex-col gap-4">
            <legend className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Prescription Details
            </legend>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="diagnosis">Diagnosis / Problem *</FieldLabel>
                <Input
                  id="diagnosis"
                  type="text"
                  placeholder="Fever"
                  required
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                />
              </Field>

              <div className="flex flex-col gap-4">
                {medicines.map((m, i) => (
                  <div
                    key={i}
                    className="flex flex-col gap-4 rounded-lg border border-border bg-muted/30 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        Medicine {medicines.length > 1 ? i + 1 : ""}
                      </p>
                      {medicines.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => removeMedicine(i)}
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                          Remove
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor={`m-name-${i}`}>Medicine Name</FieldLabel>
                        <Select
                          value={m.name}
                          onValueChange={(v) => updateMedicine(i, { name: v ?? "" })}
                        >
                          <SelectTrigger id={`m-name-${i}`} className="w-full">
                            <SelectValue placeholder="Select medicine" />
                          </SelectTrigger>
                          <SelectContent>
                            {medicineOptionsWithExisting.length === 0 ? (
                              <div className="px-3 py-2 text-sm text-muted-foreground">
                                No medicines in the list yet.
                              </div>
                            ) : (
                              medicineOptionsWithExisting.map((name) => (
                                <SelectItem key={name} value={name}>
                                  {name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        {medicineOptionsWithExisting.length === 0 && (
                          <FieldDescription>
                            Add medicines under the Medicines section first.
                          </FieldDescription>
                        )}
                      </Field>
                      <Field>
                        <FieldLabel htmlFor={`m-frequency-${i}`}>Frequency</FieldLabel>
                        <Input
                          id={`m-frequency-${i}`}
                          type="text"
                          placeholder="Morning, Afternoon, Night"
                          value={m.frequency}
                          onChange={(e) =>
                            updateMedicine(i, { frequency: e.target.value })
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor={`m-duration-${i}`}>Duration</FieldLabel>
                        <Input
                          id={`m-duration-${i}`}
                          type="text"
                          placeholder="5 days"
                          value={m.duration}
                          onChange={(e) =>
                            updateMedicine(i, { duration: e.target.value })
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor={`m-food-${i}`}>
                          Before / After Food
                        </FieldLabel>
                        <Select
                          value={m.beforeAfterFood}
                          onValueChange={(v) =>
                            updateMedicine(i, { beforeAfterFood: v ?? "" })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {foodOptions.map((f) => (
                              <SelectItem key={f} value={f}>
                                {f}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field>
                        <FieldLabel htmlFor={`m-instr-${i}`}>
                          Special Instructions
                        </FieldLabel>
                        <Input
                          id={`m-instr-${i}`}
                          type="text"
                          placeholder="Take with warm water"
                          value={m.specialInstructions}
                          onChange={(e) =>
                            updateMedicine(i, { specialInstructions: e.target.value })
                          }
                        />
                      </Field>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMedicines((prev) => [...prev, emptyMedicine()])}
                >
                  <PlusIcon className="size-3.5" aria-hidden="true" />
                  Add Medicine
                </Button>
              </div>
            </FieldGroup>
          </fieldset>

          <fieldset className="flex flex-col gap-4">
            <legend className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Additional Details
            </legend>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="symptoms">Symptoms / Notes</FieldLabel>
                <Textarea
                  id="symptoms"
                  rows={3}
                  placeholder="Describe symptoms or add notes..."
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="tests">Tests Recommended</FieldLabel>
                <Input
                  id="tests"
                  type="text"
                  placeholder="Blood test, X-ray"
                  value={testsRecommended}
                  onChange={(e) => setTestsRecommended(e.target.value)}
                />
                <FieldDescription>
                  Comma-separated tests, if any.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="followUp">Follow-up Date</FieldLabel>
                <Input
                  id="followUp"
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                />
              </Field>
            </FieldGroup>
          </fieldset>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Prescription"}
            </Button>
            <Button type="button" variant="outline" onClick={handlePrint}>
              <Printer className="size-3.5" aria-hidden="true" />
              Print Prescription
            </Button>
            <Button type="button" variant="ghost" onClick={onCancel}>
              <X className="size-3.5" aria-hidden="true" />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
