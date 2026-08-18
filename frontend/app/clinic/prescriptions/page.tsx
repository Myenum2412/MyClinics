"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import {
  type MedicineEntry,
  type Prescription,
  createPrescription,
  deletePrescription,
  listPrescriptions,
} from "@/lib/clinic-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PatientSelect } from "@/components/clinic/pickers";
import { Skeleton } from "@/components/ui/skeleton";
import { sessionCan } from "@/hooks/use-clinic-session";

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

interface PrescriptionFormState {
  patientId: string;
  doctorId: string;
  visitDate: string;
  diagnosis: string;
  medicines: MedicineEntry[];
  notes: string;
}

const EMPTY_MEDICINE: MedicineEntry = {
  name: "",
  dosage: "",
  frequency: "",
  duration: "",
  instructions: "",
};

export default function PrescriptionsPage() {
  const session = useRequireRole("doctor");
  const clinicId = session?.clinicId ?? "";
  const [items, setItems] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (!clinicId) return;
    setLoading(true);
    listPrescriptions(clinicId, { limit: 100 })
      .then((res) => setItems(res.items))
      .catch(() => toast.error("Failed to load prescriptions"))
      .finally(() => setLoading(false));
  }, [clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(form: PrescriptionFormState) {
    setSaving(true);
    try {
      await createPrescription(clinicId, {
        patientId: form.patientId,
        doctorId: form.doctorId || undefined,
        visitDate: form.visitDate,
        diagnosis: form.diagnosis || null,
        medicines: form.medicines.filter((m) => m.name.trim()),
        notes: form.notes || null,
      });
      toast.success("Prescription created");
      setCreating(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create prescription");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(p: Prescription) {
    if (!confirm(`Delete prescription for patient ${p.patientId}?`)) return;
    try {
      await deletePrescription(clinicId, p.prescriptionId);
      toast.success("Prescription deleted");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete prescription");
    }
  }

  const canManage = sessionCan(session, "clinic_admin");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger render={<Button>New prescription</Button>} />
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New prescription</DialogTitle>
              <DialogDescription>
                Prescribe medicines for a patient visit.
              </DialogDescription>
            </DialogHeader>
            <PrescriptionForm
              clinicId={clinicId}
              doctorId={session?.doctorId ?? ""}
              saving={saving}
              onSave={handleSave}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prescriptions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No prescriptions yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Diagnosis</TableHead>
                  <TableHead>Medicines</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((p) => (
                  <TableRow key={p.prescriptionId}>
                    <TableCell>{formatDate(p.visitDate)}</TableCell>
                    <TableCell>{p.patientId}</TableCell>
                    <TableCell className="max-w-48 truncate">{p.diagnosis ?? "—"}</TableCell>
                    <TableCell className="max-w-56">
                      <ul className="list-disc pl-4 text-xs text-muted-foreground">
                        {p.medicines.slice(0, 3).map((m, i) => (
                          <li key={i}>{m.name}</li>
                        ))}
                        {p.medicines.length > 3 && <li>+{p.medicines.length - 3} more</li>}
                      </ul>
                    </TableCell>
                    <TableCell className="text-right">
                      {canManage && (
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(p)}>
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

function PrescriptionForm({
  clinicId,
  doctorId,
  saving,
  onSave,
}: {
  clinicId: string;
  doctorId: string;
  saving: boolean;
  onSave: (form: PrescriptionFormState) => Promise<void>;
}) {
  const [form, setForm] = useState<PrescriptionFormState>({
    patientId: "",
    doctorId,
    visitDate: today(),
    diagnosis: "",
    medicines: [{ ...EMPTY_MEDICINE }],
    notes: "",
  });
  const set = <K extends keyof PrescriptionFormState>(key: K, value: PrescriptionFormState[K] | null) =>
    setForm((f) => ({ ...f, [key]: (value ?? "") as PrescriptionFormState[K] }));

  function setMedicine(i: number, patch: Partial<MedicineEntry>) {
    setForm((f) => ({
      ...f,
      medicines: f.medicines.map((m, idx) => (idx === i ? { ...m, ...patch } : m)),
    }));
  }

  function addMedicine() {
    setForm((f) => ({ ...f, medicines: [...f.medicines, { ...EMPTY_MEDICINE }] }));
  }

  function removeMedicine(i: number) {
    setForm((f) => ({
      ...f,
      medicines: f.medicines.length > 1 ? f.medicines.filter((_, idx) => idx !== i) : f.medicines,
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await onSave(form);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Patient</Label>
            <PatientSelect clinicId={clinicId} value={form.patientId} onChange={(v) => set("patientId", v)} required />
          </div>
          <div className="grid gap-2">
            <Label>Visit date</Label>
            <Input type="date" value={form.visitDate} onChange={(e) => set("visitDate", e.target.value)} required />
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Diagnosis</Label>
          <Input value={form.diagnosis} onChange={(e) => set("diagnosis", e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Medicines</Label>
          {form.medicines.map((m, i) => (
            <div key={i} className="space-y-2 rounded-lg border p-3">
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <Input
                  placeholder="Medicine name"
                  value={m.name}
                  onChange={(e) => setMedicine(i, { name: e.target.value })}
                  required
                />
                <Button type="button" variant="ghost" size="sm" onClick={() => removeMedicine(i)}>
                  Remove
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="Dosage (e.g. 500mg)" value={m.dosage ?? ""} onChange={(e) => setMedicine(i, { dosage: e.target.value })} />
                <Input placeholder="Frequency (e.g. 2x daily)" value={m.frequency ?? ""} onChange={(e) => setMedicine(i, { frequency: e.target.value })} />
                <Input placeholder="Duration (e.g. 5 days)" value={m.duration ?? ""} onChange={(e) => setMedicine(i, { duration: e.target.value })} />
              </div>
              <Input placeholder="Instructions" value={m.instructions ?? ""} onChange={(e) => setMedicine(i, { instructions: e.target.value })} />
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addMedicine}>
            Add medicine
          </Button>
        </div>
        <div className="grid gap-2">
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save prescription"}
        </Button>
      </DialogFooter>
    </form>
  );
}