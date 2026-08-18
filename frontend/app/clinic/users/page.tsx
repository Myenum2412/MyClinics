"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import {
  type ClinicUser,
  createUser,
  deleteUser,
  listDoctors,
  listPatients,
  listStaff,
  listUsers,
  updateUser,
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

interface UserFormState {
  name: string;
  email: string;
  password: string;
  role: string;
  doctorId: string;
  staffId: string;
  patientId: string;
  status: string;
}

const EMPTY_FORM: UserFormState = {
  name: "",
  email: "",
  password: "",
  role: "doctor",
  doctorId: "",
  staffId: "",
  patientId: "",
  status: "active",
};

export default function UsersPage() {
  const session = useRequireRole("clinic_admin");
  const clinicId = session?.clinicId ?? "";
  const [items, setItems] = useState<ClinicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [doctorOptions, setDoctorOptions] = useState<{ doctorId: string; name: string }[]>([]);
  const [staffOptions, setStaffOptions] = useState<{ staffId: string; name: string }[]>([]);
  const [patientOptions, setPatientOptions] = useState<{ patientId: string; fullName: string }[]>([]);

  const load = useCallback(() => {
    if (!clinicId) return;
    setLoading(true);
    listUsers(clinicId, { limit: 100 })
      .then((res) => setItems(res.items))
      .catch(() => toast.error("Failed to load users"))
      .finally(() => setLoading(false));
  }, [clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!clinicId) return;
    listDoctors(clinicId, { limit: 200 })
      .then((r) => setDoctorOptions(r.items.map((d) => ({ doctorId: d.doctorId, name: d.name }))))
      .catch(() => {});
    listStaff(clinicId, { limit: 200 })
      .then((r) => setStaffOptions(r.items.map((s) => ({ staffId: s.staffId, name: s.name }))))
      .catch(() => {});
    listPatients(clinicId, { limit: 200 })
      .then((r) => setPatientOptions(r.items.map((p) => ({ patientId: p.patientId, fullName: p.fullName }))))
      .catch(() => {});
  }, [clinicId]);

  async function handleSave(form: UserFormState) {
    setSaving(true);
    try {
      await createUser(clinicId, {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        doctorId: form.role === "doctor" ? form.doctorId || undefined : undefined,
        staffId: form.role === "staff" ? form.staffId || undefined : undefined,
        patientId: form.role === "patient" ? form.patientId || undefined : undefined,
      });
      toast.success("User created");
      setCreating(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create user");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(user: ClinicUser, status: string | null) {
    try {
      await updateUser(clinicId, user.userId, { status });
      toast.success("User updated");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update user");
    }
  }

  async function handleDelete(user: ClinicUser) {
    if (!confirm(`Delete user ${user.name}?`)) return;
    try {
      await deleteUser(clinicId, user.userId);
      toast.success("User deleted");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete user");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger render={<Button>Create user</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create user</DialogTitle>
              <DialogDescription>
                Creates a portal login linked to an existing doctor, staff or
                patient profile.
              </DialogDescription>
            </DialogHeader>
            <UserForm
              options={{ doctorOptions, staffOptions, patientOptions }}
              saving={saving}
              onSave={handleSave}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No users yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((u) => (
                  <TableRow key={u.userId}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Badge className="bg-slate-100 text-slate-700 capitalize">
                        {u.role.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select value={u.status} onValueChange={(v) => handleStatus(u, v)}>
                        <SelectTrigger className="h-7 w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">active</SelectItem>
                          <SelectItem value="inactive">inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(u)}>
                        Delete
                      </Button>
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

function UserForm({
  options,
  saving,
  onSave,
}: {
  options: {
    doctorOptions: { doctorId: string; name: string }[];
    staffOptions: { staffId: string; name: string }[];
    patientOptions: { patientId: string; fullName: string }[];
  };
  saving: boolean;
  onSave: (form: UserFormState) => Promise<void>;
}) {
  const [form, setForm] = useState<UserFormState>(EMPTY_FORM);
  const set = <K extends keyof UserFormState>(key: K, value: UserFormState[K] | null) =>
    setForm((f) => ({ ...f, [key]: (value ?? "") as UserFormState[K] }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await onSave(form);
  }

  const linkOptions =
    form.role === "doctor"
      ? options.doctorOptions.map((o) => ({ id: o.doctorId, label: o.name }))
      : form.role === "staff"
        ? options.staffOptions.map((o) => ({ id: o.staffId, label: o.name }))
        : options.patientOptions.map((o) => ({ id: o.patientId, label: o.fullName }));

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} required minLength={2} />
          </div>
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Password</Label>
            <Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} required minLength={8} />
          </div>
          <div className="grid gap-2">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(v) => set("role", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="doctor">doctor</SelectItem>
                <SelectItem value="staff">staff</SelectItem>
                <SelectItem value="patient">patient</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Link to {form.role} profile</Label>
          <Select
            value={
              form.role === "doctor"
                ? form.doctorId
                : form.role === "staff"
                  ? form.staffId
                  : form.patientId
            }
            onValueChange={(v) =>
              form.role === "doctor"
                ? set("doctorId", v)
                : form.role === "staff"
                  ? set("staffId", v)
                  : set("patientId", v)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select profile" />
            </SelectTrigger>
            <SelectContent>
              {linkOptions.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={saving}>
          {saving ? "Creating..." : "Create user"}
        </Button>
      </DialogFooter>
    </form>
  );
}