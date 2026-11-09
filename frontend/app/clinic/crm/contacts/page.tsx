"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useClinicSession } from "@/hooks/use-clinic-session";
import {
  listContacts,
  createContact,
  type Contact,
  type ListContactsInput,
  type ListContactsOutput,
} from "@/lib/clinic-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Filter, ChevronDown, ChevronUp, Archive, RotateCcw } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import {
  RowCheckbox,
  SelectAllCheckbox,
  TableSelectionBar,
  useRowSelection,
} from "@/components/ui/table-selection";

const SOURCES = [
  "MANUAL",
  "IMPORT",
  "EMAIL",
  "CALENDAR",
  "TRACKING",
  "WEBSITE",
  "META",
] as const;

export default function ContactsPage() {
  const session = useClinicSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const clinicId = session.session?.clinicId;

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [facetCounts, setFacetCounts] = useState<Record<string, Record<string, number>>>({});
  const [archived, setArchived] = useState(false);
  const [search, setSearch] = useState("");
  // Dropdown filters were removed; these stay empty (all).
  const [sourceFilter] = useState("");
  const [ownerFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [sort, setSort] = useState("-createdAt");
  const [creating, setCreating] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const searchParamsRef = useRef(searchParams);
  const selection = useRowSelection(contacts, (c) => c.contactId);

  useEffect(() => {
    searchParamsRef.current = searchParams;
  }, [searchParams]);

  const load = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    setError(null);
    try {
      const input: ListContactsInput = {
        archived: archived || undefined,
        q: search || undefined,
        ownerId: ownerFilter || undefined,
        companyId: companyFilter || undefined,
        source: sourceFilter || undefined,
        page,
        limit,
        sort,
      };
      const result = await listContacts(clinicId, input);
      setContacts(result.rows);
      setTotal(result.total);
      setFacetCounts(result.facetCounts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contacts");
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, [clinicId, archived, search, sourceFilter, ownerFilter, companyFilter, page, sort]);

  useEffect(() => {
    if (!session.session) return;
    void load();
  }, [session.session, load]);

  const handleCreate = async () => {
    if (!clinicId || !newContactName.trim()) return;
    setCreating(true);
    try {
      const parts = newContactName.trim().split(" ");
      await createContact(clinicId, {
        firstName: parts[0],
        lastName: parts.slice(1).join(" ") || null,
        source: "MANUAL",
      });
      setNewContactName("");
      toast.success("Contact created");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create contact");
    } finally {
      setCreating(false);
    }
  };

  const handleArchive = async (contactId: string) => {
    if (!clinicId) return;
    try {
      await fetch(`/api/clinics/${clinicId}/crm/contacts/${contactId}/archive`, {
        method: "POST",
        credentials: "include",
      });
      toast.success("Contact archived");
      void load();
    } catch {
      toast.error("Failed to archive contact");
    }
  };

  const handleRestore = async (contactId: string) => {
    if (!clinicId) return;
    try {
      await fetch(`/api/clinics/${clinicId}/crm/contacts/${contactId}/restore`, {
        method: "POST",
        credentials: "include",
      });
      toast.success("Contact restored");
      void load();
    } catch {
      toast.error("Failed to restore contact");
    }
  };

  const handleSort = (field: string) => {
    setSort((prev) => (prev === field ? `-${field}` : field.startsWith("-") ? field.slice(1) : field));
  };

  if (!session.session) return null;

  return (
    <div className="flex flex-col gap-4">
      <Card className="border-dashed" variant="outline">
        <CardContent className="grid grid-cols-1 gap-3 py-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
          <div aria-hidden="true" />
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full lg:w-80 lg:justify-self-center"
            onKeyDown={(e) => e.key === "Enter" && void load()}
          />
          <div className="flex items-center gap-2 lg:justify-end">
            <Input
              placeholder="New contact name"
              value={newContactName}
              onChange={(e) => setNewContactName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleCreate()}
              className="w-48"
            />
            <Button onClick={handleCreate} disabled={creating || !newContactName.trim()}>
              <Plus className="size-4 mr-2" />
              {creating ? "Creating…" : "Add Contact"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setArchived((v) => !v)}
              className={archived ? "bg-muted" : ""}
            >
              <Archive className="size-4 mr-2" />
              {archived ? "Show Active" : "Show Archived"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 rounded-none border border-border py-0 ring-0">
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <CardTitle>Contacts</CardTitle>
            <span className="text-sm text-muted-foreground">{total} total</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" onClick={() => void load()}>
                Retry
              </Button>
            </div>
          ) : contacts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {archived ? "No archived contacts." : "No contacts yet. Add your first contact above."}
            </p>
          ) : (
            <>
            <TableSelectionBar count={selection.selectedIds.size} onClear={selection.clear} />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 pl-4">
                    <SelectAllCheckbox
                      checked={selection.allSelected}
                      indeterminate={selection.someSelected && !selection.allSelected}
                      onCheckedChange={selection.toggleAll}
                    />
                  </TableHead>
                  <TableHead onClick={() => handleSort("name")} className="cursor-pointer">
                    Name <span className="ml-1">{sort === "name" ? <ChevronUp /> : sort === "-name" ? <ChevronDown /> : null}</span>
                  </TableHead>
                  <TableHead onClick={() => handleSort("source")} className="cursor-pointer">
                    Source <span className="ml-1">{sort === "source" ? <ChevronUp /> : sort === "-source" ? <ChevronDown /> : null}</span>
                  </TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead onClick={() => handleSort("createdAt")} className="cursor-pointer">
                    Created <span className="ml-1">{sort === "createdAt" ? <ChevronUp /> : sort === "-createdAt" ? <ChevronDown /> : null}</span>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((c) => (
                  <TableRow
                    key={c.contactId}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/clinic/crm/contacts/${c.contactId}`)}
                  >
                    <TableCell className="pl-4">
                      <RowCheckbox
                        checked={selection.selectedIds.has(c.contactId)}
                        onCheckedChange={(checked) => selection.toggleOne(c.contactId, checked)}
                        label={`Select ${c.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{c.source}</Badge>
                    </TableCell>
                    <TableCell>{c.phone ?? "—"}</TableCell>
                    <TableCell>{c.email ?? "—"}</TableCell>
                    <TableCell>{c.companyId ?? "—"}</TableCell>
                    <TableCell>{c.ownerId ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      {archived ? (
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); void handleRestore(c.contactId); }}>
                          <RotateCcw className="size-4" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); void handleArchive(c.contactId); }}>
                          <Archive className="size-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </>
          )}
        </CardContent>
        {contacts.length > 0 && (
          <Pagination
            page={page}
            pageSize={limit}
            totalItems={total}
            onPageChange={setPage}
            itemLabel="contacts"
          />
        )}
      </Card>
    </div>
  );
}