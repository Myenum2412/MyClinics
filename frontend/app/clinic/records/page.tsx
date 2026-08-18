"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import {
  type MedicalRecord,
  createRecord,
  deleteRecord,
  listRecords,
  updateRecord,
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

interface RecordFormState {
  patientId: string;
  doctorId: string;
  diagnosis: string;
  symptoms: string;
  treatment: string;
  notes: string;
  visitDate: string;
}

const EMPTY_FORM: RecordFormState = {
  patientId: "",
  doctorId: "",
  diagnosis: "",
  symptoms: "",
  treatment: "",
  notes: "",
  visitDate: today(),
};

export default function RecordsPage() {
  const session = useRequireRole("doctor");
  const clinicId = session?.clinicId ?? "";
  const [items, setItems] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<MedicalRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (!clinicId) return;
    setLoading(true);
    listRecords(clinicId, { limit: 100 })
      .then((res) => setItems(res.items))
      .catch(() => toast.error("Failed to load medical records"))
      .finally(() => setLoading(false));
  }, [clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(form: RecordFormState) {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        patientId: form.patientId,
        doctorId: form.doctorId || undefined,
        diagnosis: form.diagnosis,
        symptoms: form.symptoms || null,
        treatment: form.treatment || null,
        notes: form.notes || null,
        visitDate: form.visitDate,
      };
      if (editing) {
        await updateRecord(clinicId, editing.recordId, payload);
        toast.success("Record updated");
      } else {
        await createRecord(clinicId, payload);
        toast.success("Record created");
      }
      setEditing(null);
      setCreating(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save record");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(record: MedicalRecord) {
    if (!confirm(`Delete medical record for patient ${record.patientId}?`)) return;
    try {
      await deleteRecord(clinicId, record.recordId);
      toast.success("Record deleted");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete record");
    }
  }

  const canManage = sessionCan(session, "clinic_admin");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger render={<Button>New record</Button>} />
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New medical record</DialogTitle>
              <DialogDescription>
                Record a diagnosis, symptoms and treatment for a visit.
              </DialogDescription>
            </DialogHeader>
            <RecordForm
              clinicId={clinicId}
              doctorId={session?.doctorId ?? ""}
              initial={EMPTY_FORM}
              saving={saving}
              onSave={handleSave}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Medical records</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No medical records yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Visit date</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Diagnosis</TableHead>
                  <TableHead>Symptoms</TableHead>
                  <TableHead>Treatment</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((r) => (
                  <TableRow key={r.recordId}>
                    <TableCell>{formatDate(r.visitDate)}</TableCell>
                    <TableCell>{r.patientId}</TableCell>
                    <TableCell className="max-w-48 truncate font-medium">{r.diagnosis}</TableCell>
                    <TableCell className="max-w-40 truncate">{r.symptoms ?? "—"}</TableCell>
                    <TableCell className="max-w-40 truncate">{r.treatment ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger render={<Button variant="ghost" size="sm">Edit</Button>} />
                        <DialogContent className="max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Edit record</DialogTitle>
                          </DialogHeader>
                          <RecordForm
                            clinicId={clinicId}
                            doctorId={session?.doctorId ?? ""}
                            initial={{
                              patientId: r.patientId,
                              doctorId: r.doctorId,
                              diagnosis: r.diagnosis,
                              symptoms: r.symptoms ?? "",
                              treatment: r.treatment ?? "",
                              notes: r.notes ?? "",
                              visitDate: r.visitDate,
                            }}
                            saving={saving}
                            onSave={handleSave}
                          />
                        </DialogContent>
                      </Dialog>
                      {canManage && (
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(r)}>
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

function RecordForm({
  clinicId,
  doctorId,
  initial,
  saving,
  onSave,
}: {
  clinicId: string;
  doctorId: string;
  initial: RecordFormState;
  saving: boolean;
  onSave: (form: RecordFormState) => Promise<void>;
}) {
  const [form, setForm] = useState<RecordFormState>({
    ...initial,
    doctorId: initial.doctorId || doctorId,
  });
  const set = <K extends keyof RecordFormState>(key: K, value: RecordFormState[K] | null) =>
    setForm((f) => ({ ...f, [key]: (value ?? "") as RecordFormState[K] }));

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
          <Textarea value={form.diagnosis} onChange={(e) => set("diagnosis", e.target.value)} required rows={2} />
        </div>
        <div className="grid gap-2">
          <Label>Symptoms</Label>
          <Textarea value={form.symptoms} onChange={(e) => set("symptoms", e.target.value)} rows={2} />
        </div>
        <div className="grid gap-2">
          <Label>Treatment</Label>
          <Textarea value={form.treatment} onChange={(e) => set("treatment", e.target.value)} rows={2} />
        </div>
        <div className="grid gap-2">
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save record"}
        </Button>
      </DialogFooter>
    </form>
  );
}