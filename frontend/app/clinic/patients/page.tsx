"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import {
  type Patient,
  assignPatient,
  createPatient,
  deletePatient,
  listPatients,
  updatePatient,
} from "@/lib/clinic-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DoctorSelect } from "@/components/clinic/pickers";
import { Skeleton } from "@/components/ui/skeleton";
import { sessionCan } from "@/hooks/use-clinic-session";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDERS = ["male", "female", "other"];

interface PatientFormState {
  fullName: string;
  mobile: string;
  email: string;
  gender: string;
  dateOfBirth: string;
  bloodGroup: string;
  address: string;
  city: string;
  pincode: string;
  allergies: string;
  notes: string;
  doctorId: string | null;
  password: string;
}

const EMPTY_FORM: PatientFormState = {
  fullName: "",
  mobile: "",
  email: "",
  gender: "",
  dateOfBirth: "",
  bloodGroup: "",
  address: "",
  city: "",
  pincode: "",
  allergies: "",
  notes: "",
  doctorId: null,
  password: "",
};

export default function PatientsPage() {
  const session = useRequireRole("doctor");
  const clinicId = session?.clinicId ?? "";
  const [items, setItems] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Patient | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (!clinicId) return;
    setLoading(true);
    listPatients(clinicId, { q: q || undefined, limit: 100 })
      .then((res) => setItems(res.items))
      .catch(() => toast.error("Failed to load patients"))
      .finally(() => setLoading(false));
  }, [clinicId, q]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(form: PatientFormState) {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        fullName: form.fullName,
        mobile: form.mobile,
        email: form.email || null,
        gender: form.gender || null,
        dateOfBirth: form.dateOfBirth || null,
        bloodGroup: form.bloodGroup || null,
        address: form.address || null,
        city: form.city || null,
        pincode: form.pincode || null,
        allergies: form.allergies
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
        notes: form.notes || null,
      };
      if (editing) {
        await updatePatient(clinicId, editing.patientId, payload);
        toast.success("Patient updated");
      } else {
        await createPatient(clinicId, { ...payload, password: form.password || undefined });
        toast.success("Patient created");
      }
      setEditing(null);
      setCreating(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save patient");
    } finally {
      setSaving(false);
    }
  }

  async function handleAssign(patient: Patient, doctorId: string | null) {
    try {
      await assignPatient(clinicId, patient.patientId, doctorId);
      toast.success("Patient reassigned");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to assign patient");
    }
  }

  async function handleDelete(patient: Patient) {
    if (!confirm(`Delete patient ${patient.fullName}?`)) return;
    try {
      await deletePatient(clinicId, patient.patientId);
      toast.success("Patient deleted");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete patient");
    }
  }

  const canManage = sessionCan(session, "clinic_admin");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search patients..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-64"
        />
        <div className="flex-1" />
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger render={<Button>New patient</Button>} />
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New patient</DialogTitle>
              <DialogDescription>
                Register a patient. A portal login can be created with a password.
              </DialogDescription>
            </DialogHeader>
            <PatientForm
              clinicId={clinicId}
              initial={EMPTY_FORM}
              saving={saving}
              onSave={handleSave}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Patients</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No patients found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((p) => (
                  <TableRow key={p.patientId}>
                    <TableCell className="font-medium">{p.fullName}</TableCell>
                    <TableCell>{p.mobile}</TableCell>
                    <TableCell>{p.email ?? "—"}</TableCell>
                    <TableCell>
                      <DoctorSelect
                        clinicId={clinicId}
                        value={p.doctorId}
                        onChange={(v) => handleAssign(p, v)}
                        allowEmpty
                      />
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          p.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-200 text-slate-600"
                        }
                      >
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger
                          render={
                            <Button variant="ghost" size="sm">Edit</Button>
                          }
                        />
                        <DialogContent className="max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Edit patient</DialogTitle>
                          </DialogHeader>
                          <PatientForm
                            clinicId={clinicId}
                            initial={{
                              fullName: p.fullName,
                              mobile: p.mobile,
                              email: p.email ?? "",
                              gender: p.gender ?? "",
                              dateOfBirth: p.dateOfBirth ?? "",
                              bloodGroup: p.bloodGroup ?? "",
                              address: p.address ?? "",
                              city: p.city ?? "",
                              pincode: p.pincode ?? "",
                              allergies: (p.allergies ?? []).join(", "),
                              notes: p.notes ?? "",
                              doctorId: p.doctorId,
                              password: "",
                            }}
                            saving={saving}
                            onSave={handleSave}
                          />
                        </DialogContent>
                      </Dialog>
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(p)}
                        >
                          Delete
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PatientForm({
  clinicId,
  initial,
  saving,
  onSave,
}: {
  clinicId: string;
  initial: PatientFormState;
  saving: boolean;
  onSave: (form: PatientFormState) => Promise<void>;
}) {
  const [form, setForm] = useState<PatientFormState>(initial);
  const set = <K extends keyof PatientFormState>(key: K, value: PatientFormState[K] | null) =>
    setForm((f) => ({ ...f, [key]: (value ?? "") as PatientFormState[K] }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await onSave(form);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Full name</Label>
            <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} required minLength={2} />
          </div>
          <div className="grid gap-2">
            <Label>Mobile</Label>
            <Input value={form.mobile} onChange={(e) => set("mobile", e.target.value)} required minLength={8} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Gender</Label>
            <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {GENDERS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Date of birth</Label>
            <Input type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Blood group</Label>
            <Select value={form.bloodGroup} onValueChange={(v) => set("bloodGroup", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {BLOOD_GROUPS.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>City</Label>
            <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Pincode</Label>
            <Input value={form.pincode} onChange={(e) => set("pincode", e.target.value)} maxLength={6} />
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Address</Label>
          <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Allergies (comma separated)</Label>
          <Input value={form.allergies} onChange={(e) => set("allergies", e.target.value)} placeholder="Penicillin, Dust" />
        </div>
        <div className="grid gap-2">
          <Label>Doctor</Label>
          <DoctorSelect
            clinicId={clinicId}
            value={form.doctorId}
            onChange={(v) => set("doctorId", v)}
            allowEmpty
          />
        </div>
        {!initial.fullName && (
          <div className="grid gap-2">
            <Label>Portal password (creates patient login)</Label>
            <Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} minLength={8} placeholder="min. 8 characters" />
          </div>
        )}
        <div className="grid gap-2">
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save patient"}
        </Button>
      </DialogFooter>
    </form>
  );
}