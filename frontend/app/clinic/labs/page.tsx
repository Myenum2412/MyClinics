"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useRequireRole, sessionCan } from "@/hooks/use-clinic-session";
import { listLabs, updateLab, deleteLab, type Lab } from "@/lib/clinic-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FlaskConical, Plus, Eye, Pencil, Trash2, Search } from "lucide-react";

export default function LabsPage() {
  const session = useRequireRole("patient");
  const clinicId = session?.clinicId ?? "";
  const canManage = sessionCan(session, "clinic_admin");
  const [items, setItems] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [viewing, setViewing] = useState<Lab | null>(null);
  const [editing, setEditing] = useState<Lab | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lab | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const load = useCallback(() => {
    if (!clinicId) return;
    setLoading(true);
    listLabs(clinicId).then((r) => setItems((r as any)?.items ?? [])).catch(() => toast.error("Failed to load labs")).finally(() => setLoading(false));
  }, [clinicId]);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return items.filter((l) => !q || (l.labName ?? (l as any).name ?? "").toLowerCase().includes(s) || (l.contactPerson ?? "").toLowerCase().includes(s) || (l.phone ?? "").includes(s) || (l.email ?? "").toLowerCase().includes(s));
  }, [items, q]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = useMemo(() => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize), [filtered, currentPage]);

  const toggleAll = () => {
    if (selectedIds.size === paginated.length && paginated.length > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(paginated.map((l) => l.labId)));
  };
  const toggleOne = (id: string) => setSelectedIds((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const handleDelete = async (lab: Lab) => {
    await deleteLab(clinicId, lab.labId);
    toast.success("Lab deleted");
    load();
  };
  const handleBulkDelete = async () => {
    await Promise.all(Array.from(selectedIds).map((id) => deleteLab(clinicId, id)));
    toast.success(`Deleted ${selectedIds.size} labs`);
    setSelectedIds(new Set());
    setBulkDeleteOpen(false);
    load();
  };
  const handleEditSave = async (form: Record<string, string>) => {
    if (!editing) return;
    setSaving(true);
    try {
      await updateLab(clinicId, editing.labId, { labName: form.labName, contactPerson: form.contactPerson || null, phone: form.phone || null, email: form.email || null, labType: form.labType || null, licenseNo: form.licenseNo || null });
      toast.success("Lab updated");
      setEditing(null);
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to update"); } finally { setSaving(false); }
  };

  if (editing) {
    return (
      <div className="flex flex-col gap-6">
        <Card className="border-border shadow-sm max-w-xl">
          <CardHeader className="border-b bg-muted/20"><CardTitle>Edit Lab</CardTitle></CardHeader>
          <CardContent className="p-6"><LabForm initial={editing} saving={saving} onSave={handleEditSave} onCancel={() => setEditing(null)} /></CardContent>
        </Card>
      </div>
    );
  }
  if (viewing) {
    return (
      <div className="flex flex-col gap-6">
        <Card className="border-border shadow-sm max-w-xl">
          <CardHeader className="border-b bg-muted/20 flex flex-row items-center justify-between"><CardTitle>View Lab</CardTitle>
            <Button variant="outline" size="sm" onClick={() => { setEditing(viewing); setViewing(null); }}><Pencil className="size-4" />Edit</Button>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div><span className="text-xs text-muted-foreground">Lab Name</span><div className="font-medium">{viewing.labName ?? (viewing as any).name ?? "—"}</div></div>
              <div><span className="text-xs text-muted-foreground">Contact</span><div className="font-medium">{viewing.contactPerson ?? "—"}</div></div>
              <div><span className="text-xs text-muted-foreground">Phone</span><div className="font-medium">{viewing.phone ?? "—"}</div></div>
              <div><span className="text-xs text-muted-foreground">Email</span><div className="font-medium">{viewing.email ?? "—"}</div></div>
              <div><span className="text-xs text-muted-foreground">Lab Type</span><div className="font-medium">{viewing.labType ?? "—"}</div></div>
              <div><span className="text-xs text-muted-foreground">License</span><div className="font-medium">{viewing.licenseNo ?? "—"}</div></div>
              <div><span className="text-xs text-muted-foreground">Status</span><div><Badge variant="outline">{viewing.status}</Badge></div></div>
            </div>
            <div className="mt-6"><Button variant="outline" onClick={() => setViewing(null)}>Back to Labs</Button></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><FlaskConical className="size-5 text-primary" /><h1 className="text-xl font-bold">Labs</h1><Badge variant="secondary">{filtered.length}</Badge></div>
        {canManage && <Button render={<Link href="/clinic/labs/new" />}><Plus className="size-4" />Create Lab</Button>}
      </div>

      {selectedIds.size > 0 && canManage && (
        <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5">
          <span className="text-sm font-semibold text-primary">{selectedIds.size} selected</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>Clear</Button>
            <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}><Trash2 className="size-3.5" />Delete Selected</Button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" /><Input placeholder="Search labs..." value={q} onChange={(e) => { setQ(e.target.value); setCurrentPage(1); }} className="pl-9 h-9" /></div>
      </div>

      <Card className="border-border shadow-sm"><CardContent className="p-0">
        {loading ? <div className="p-6 space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
          : filtered.length === 0 ? <div className="py-12 text-center text-sm text-muted-foreground">No labs found.</div>
            : <>
              <div className="overflow-x-auto -mx-6 px-6"><Table className="min-w-[720px]">
                <TableHeader><TableRow className="border-b bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-12"><Checkbox checked={paginated.length > 0 && selectedIds.size === paginated.length} onCheckedChange={toggleAll} aria-label="Select all" /></TableHead>
                  <TableHead>Lab Name</TableHead><TableHead>Contact</TableHead><TableHead>Phone</TableHead><TableHead>Email</TableHead><TableHead>Lab Type</TableHead><TableHead>License</TableHead><TableHead>Status</TableHead>
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>{paginated.map((l) => (
                  <TableRow key={l.labId} className={`hover:bg-muted/30 border-b last:border-0 ${selectedIds.has(l.labId) ? "bg-muted/30" : ""}`}>
                    <TableCell><Checkbox checked={selectedIds.has(l.labId)} onCheckedChange={() => toggleOne(l.labId)} aria-label={`Select ${l.labName}`} /></TableCell>
                    <TableCell className="font-medium">{(l as any).labName ?? (l as any).name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{l.contactPerson ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{l.phone ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{l.email ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{l.labType ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{l.licenseNo ?? "—"}</TableCell>
                    <TableCell><Badge variant="outline">{l.status}</Badge></TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => setViewing(l)} aria-label="View" title="View"><Eye className="size-4" /></Button>
                        {canManage && <Button variant="ghost" size="icon-sm" onClick={() => setEditing(l)} aria-label="Edit" title="Edit"><Pencil className="size-4" /></Button>}
                        {canManage && <Button variant="ghost" size="icon-sm" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(l)} aria-label="Delete" title="Delete"><Trash2 className="size-4" /></Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table></div>
              {filtered.length > 0 && <Pagination page={currentPage} pageSize={pageSize} totalItems={filtered.length} onPageChange={(p) => setCurrentPage(Math.max(1, Math.min(p, totalPages || 1)))} itemLabel="results" />}
            </>}
      </CardContent></Card>

      <ConfirmDeleteDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)} title={`Delete ${deleteTarget?.labName ?? "lab"}?`} description="This will permanently delete the lab. This action cannot be undone." onConfirm={async () => { if (deleteTarget) await handleDelete(deleteTarget); }} />
      <ConfirmDeleteDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen} title={`Delete ${selectedIds.size} labs?`} description="This will permanently delete all selected labs." confirmLabel="Delete All" onConfirm={handleBulkDelete} />
    </div>
  );
}

function LabForm({ initial, saving, onSave, onCancel }: { initial: Lab; saving: boolean; onSave: (f: Record<string, string>) => Promise<void>; onCancel: () => void }) {
  const [form, setForm] = useState({ labName: initial.labName ?? (initial as any).name ?? "", contactPerson: initial.contactPerson ?? "", phone: initial.phone ?? "", email: initial.email ?? "", labType: initial.labType ?? "", licenseNo: initial.licenseNo ?? "" });
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  return (
    <form onSubmit={async (e) => { e.preventDefault(); await onSave(form); }} className="space-y-4">
      <div className="grid gap-2"><Label>Lab Name *</Label><Input value={form.labName} onChange={(e) => set("labName", e.target.value)} required /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2"><Label>Contact Person</Label><Input value={form.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} /></div>
        <div className="grid gap-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></div>
      </div>
      <div className="grid gap-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2"><Label>Lab Type</Label><Input value={form.labType} onChange={(e) => set("labType", e.target.value)} placeholder="Pathology / Radiology" /></div>
        <div className="grid gap-2"><Label>License No</Label><Input value={form.licenseNo} onChange={(e) => set("licenseNo", e.target.value)} /></div>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
      </div>
    </form>
  );
}
