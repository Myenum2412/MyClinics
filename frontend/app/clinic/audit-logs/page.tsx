"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import { type AuditLogEntry, listAuditLogs } from "@/lib/clinic-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AuditLogsPage() {
  const session = useRequireRole("clinic_admin");
  const clinicId = session?.clinicId ?? "";
  const [items, setItems] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");

  const load = useCallback(() => {
    if (!clinicId) return;
    setLoading(true);
    listAuditLogs(clinicId, {
      entity: entity || undefined,
      action: action || undefined,
      limit: 100,
    })
      .then((res) => setItems(res.items))
      .catch(() => toast.error("Failed to load audit logs"))
      .finally(() => setLoading(false));
  }, [clinicId, entity, action]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Entity</Label>
          <Input
            placeholder="patient, bill, appointment..."
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
            className="w-48"
          />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Action</Label>
          <Input
            placeholder="create, update, delete..."
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="w-44"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Audit log</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No audit entries found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Entity id</TableHead>
                  <TableHead>Metadata</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((a) => (
                  <TableRow key={a.auditId}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {formatDate(a.createdAt)}
                    </TableCell>
                    <TableCell>{a.actorUserId ?? "—"}</TableCell>
                    <TableCell>
                      <span className="font-medium">{a.action}</span>
                    </TableCell>
                    <TableCell>{a.entity}</TableCell>
                    <TableCell className="max-w-32 truncate">{a.entityId ?? "—"}</TableCell>
                    <TableCell className="max-w-56 truncate text-xs text-muted-foreground">
                      {a.metadata ? JSON.stringify(a.metadata) : "—"}
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