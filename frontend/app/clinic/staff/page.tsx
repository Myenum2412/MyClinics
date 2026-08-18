"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import {
  type Staff,
  createStaff,
  deleteStaff,
  listStaff,
  updateStaff,
} from "@/lib/clinic-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Skeleton } from "@/components/ui/skeleton";
import { sessionCan } from "@/hooks/use-clinic-session";

const POSITIONS = [
  "receptionist",
  "nurse",
  "lab_technician",
  "pharmacist",
  "accountant",
  "manager",
  "other",
];

interface StaffFormState {
  name: string;
  position: string;
  phone: string;
  email: string;
  joinedAt: string;
  status: string;
}

const EMPTY_FORM: StaffFormState = {
  name: "",
  position: "receptionist",
  phone: "",
  email: "",
  joinedAt: "",
  status: "active",
};

export default function StaffPage() {
  const session = useRequireRole("staff");
  const clinicId = session?.clinicId ?? "";
  const [items, setItems] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (!clinicId) return;
    setLoading(true);
    listStaff(clinicId, { limit: 100 })
      .then((res) => setItems(res.items))
      .catch(() => toast.error("Failed to load staff"))
      .finally(() => setLoading(false));
  }, [clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(form: StaffFormState) {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        position: form.position,
        phone: form.phone || null,
        email: form.email || null,
        joinedAt: form.joinedAt || null,
        status: form.status,
      };
      if (editing) {
        await updateStaff(clinicId, editing.staffId, payload);
        toast.success("Staff updated");
      } else {
        await createStaff(clinicId, payload);
        toast.success("Staff added");
      }
      setEditing(null);
      setCreating(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save staff");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(staff: Staff) {
    if (!confirm(`Delete staff ${staff.name}?`)) return;
    try {
      await deleteStaff(clinicId, staff.staffId);
      toast.success("Staff deleted");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete staff");
    }
  }

  const canManage = sessionCan(session, "clinic_admin");

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <div className="flex items-center justify-end">
          <Dialog open={creating} onOpenChange={setCreating}>
            <DialogTrigger render={<Button>Add staff</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add staff</DialogTitle>
                <DialogDescription>Register a staff member.</DialogDescription>
              </DialogHeader>
              <StaffForm initial={EMPTY_FORM} saving={saving} onSave={handleSave} />
            </DialogContent>
          </Dialog>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Staff</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No staff yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((s) => (
                  <TableRow key={s.staffId}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="capitalize">{s.position.replace("_", " ")}</TableCell>
                    <TableCell>{s.phone ?? "—"}</TableCell>
                    <TableCell>{s.email ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          s.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-200 text-slate-600"
                        }
                      >
                        {s.status}
                      </Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger render={<Button variant="ghost" size="sm">Edit</Button>} />
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit staff</DialogTitle>
                            </DialogHeader>
                            <StaffForm
                              initial={{
                                name: s.name,
                                position: s.position,
                                phone: s.phone ?? "",
                                email: s.email ?? "",
                                joinedAt: s.joinedAt ?? "",
                                status: s.status,
                              }}
                              saving={saving}
                              onSave={handleSave}
                            />
                          </DialogContent>
                        </Dialog>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(s)}>
                          Delete
                        </Button>
                      </TableCell>
                    )}
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

function StaffForm({
  initial,
  saving,
  onSave,
}: {
  initial: StaffFormState;
  saving: boolean;
  onSave: (form: StaffFormState) => Promise<void>;
}) {
  const [form, setForm] = useState<StaffFormState>(initial);
  const set = <K extends keyof StaffFormState>(key: K, value: StaffFormState[K] | null) =>
    setForm((f) => ({ ...f, [key]: (value ?? "") as StaffFormState[K] }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await onSave(form);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} required minLength={2} />
          </div>
          <div className="grid gap-2">
            <Label>Position</Label>
            <Select value={form.position} onValueChange={(v) => set("position", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POSITIONS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Joined date</Label>
            <Input type="date" value={form.joinedAt} onChange={(e) => set("joinedAt", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">active</SelectItem>
                <SelectItem value="inactive">inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save staff"}
        </Button>
      </DialogFooter>
    </form>
  );
}