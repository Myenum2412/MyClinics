"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import {
  type Clinic,
  activateClinic,
  createClinic,
  listAllClinics,
  suspendClinic,
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
import { Plus } from "lucide-react";
import StatsGeneric from "@/components/stats-generic";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminClinicsPage() {
  const session = useRequireRole("platform_admin");
  const [items, setItems] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    listAllClinics({
      status: statusFilter === "all" ? undefined : statusFilter,
      q: q || undefined,
      limit: 100,
    })
      .then((res) => setItems(res.items))
      .catch(() => toast.error("Failed to load clinics"))
      .finally(() => setLoading(false));
  }, [statusFilter, q]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(form: {
    name: string;
    adminName: string;
    email: string;
    password: string;
    phone: string;
  }) {
    setSaving(true);
    try {
      await createClinic({
        name: form.name,
        adminName: form.adminName,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
      });
      toast.success("Clinic created");
      setCreating(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create clinic");
    } finally {
      setSaving(false);
    }
  }

  async function handleSuspend(clinic: Clinic) {
    if (!confirm(`Suspend ${clinic.name}? Its members will be blocked from login.`)) return;
    try {
      await suspendClinic(clinic.clinicId);
      toast.success("Clinic suspended");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to suspend clinic");
    }
  }

  async function handleActivate(clinic: Clinic) {
    try {
      await activateClinic(clinic.clinicId);
      toast.success("Clinic activated");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to activate clinic");
    }
  }

  const totalClinics = items.length;
  const activeCount = items.filter((c) => c.status === "active").length;
  const suspendedCount = items.filter((c) => c.status === "suspended").length;

  const adminStatsItems = [
    {
      name: 'Total Clinics',
      percentage: Math.min(100, Math.round((totalClinics / 20) * 100)),
      current: totalClinics,
      allowed: 20,
      allowedLabel: 'target',
      fill: 'var(--chart-1)',
    },
    {
      name: 'Active Clinics',
      percentage: totalClinics ? Math.round((activeCount / totalClinics) * 100) : 0,
      current: activeCount,
      allowed: totalClinics,
      allowedLabel: 'total clinics',
      fill: 'var(--chart-2)',
    },
    {
      name: 'Suspended Clinics',
      percentage: totalClinics ? Math.round((suspendedCount / totalClinics) * 100) : 0,
      current: suspendedCount,
      allowed: totalClinics,
      allowedLabel: 'total clinics',
      fill: 'var(--chart-3)',
    },
    {
      name: 'System Capacity',
      percentage: 100,
      current: totalClinics,
      allowed: 100,
      allowedLabel: 'max clinics',
      fill: 'var(--chart-4)',
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {!loading && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <StatsGeneric
            title="Platform Analytics"
            description="Multi-tenant clinic deployments, account status, and system insights."
            items={adminStatsItems}
            searchTerm={q}
            onSearchChange={setQ}
            searchPlaceholder="Search clinic name, admin, email..."
            action={
              <div className="flex items-center gap-2">
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
                  <SelectTrigger className="h-9 w-36">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>

                <Dialog open={creating} onOpenChange={setCreating}>
                  <DialogTrigger render={<Button className="h-9 flex items-center gap-1.5 shadow-sm"><Plus className="size-4" /> Create clinic</Button>} />
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create clinic</DialogTitle>
                      <DialogDescription>
                        Provisions a new tenant with its first clinic_admin account.
                      </DialogDescription>
                    </DialogHeader>
                    <CreateClinicForm saving={saving} onSave={handleCreate} />
                  </DialogContent>
                </Dialog>
              </div>
            }
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All clinics</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No clinics found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                  <TableHead>Clinic</TableHead>
                  <TableHead>Clinic ID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((c) => (
                  <TableRow key={c.clinicId}>
                    <TableCell>
                      <Link
                        href={`/admin/clinics/${c.clinicId}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{c.clinicId}</TableCell>
                    <TableCell>{c.email ?? "—"}</TableCell>
                    <TableCell>{formatDate(c.createdAt)}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          c.status === "active"
                            ? "bg-success/10 text-success"
                            : c.status === "suspended"
                              ? "bg-warning/10 text-warning"
                              : "bg-muted text-muted-foreground"
                        }
                      >
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {c.status === "active" ? (
                        <Button variant="ghost" size="sm" onClick={() => handleSuspend(c)}>
                          Suspend
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => handleActivate(c)}>
                          Activate
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

function CreateClinicForm({
  saving,
  onSave,
}: {
  saving: boolean;
  onSave: (form: {
    name: string;
    adminName: string;
    email: string;
    password: string;
    phone: string;
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await onSave({ name, adminName, email, password, phone });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3">
        <div className="grid gap-2">
          <Label>Clinic name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
        </div>
        <div className="grid gap-2">
          <Label>Admin name</Label>
          <Input value={adminName} onChange={(e) => setAdminName(e.target.value)} required minLength={2} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Admin email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Admin password</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={saving}>
          {saving ? "Creating..." : "Create clinic"}
        </Button>
      </DialogFooter>
    </form>
  );
}