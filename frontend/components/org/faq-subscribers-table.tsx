"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, Copy, Search, RefreshCw, Download, MailCheck, Inbox } from "lucide-react";
import { formatDate } from "@/lib/datetime";

export interface FAQSubscriber {
  id: string;
  email: string;
  consent: boolean;
  source: string;
  status: string;
  createdAt: string;
}

export function FAQSubscribersTable() {
  const [items, setItems] = useState<FAQSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/faq-subscribers", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.items)) {
        setItems(data.items);
      } else {
        toast.error("Failed to load FAQ subscribers");
      }
    } catch {
      toast.error("Error connecting to subscribers service");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.email.toLowerCase().includes(q) ||
        item.source.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((item) => item.id)));
    }
  };

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to remove ${email}?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/faq-subscribers?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success(`Removed ${email}`);
        setItems((prev) => prev.filter((item) => item.id !== id));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } else {
        toast.error("Failed to delete subscriber");
      }
    } catch {
      toast.error("Network error deleting subscriber");
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected subscriber(s)?`)) return;

    let successCount = 0;
    for (const id of selectedIds) {
      try {
        const res = await fetch(`/api/faq-subscribers?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        if (res.ok) successCount++;
      } catch {
        // ignore individual errors
      }
    }

    toast.success(`Deleted ${successCount} subscriber(s)`);
    setSelectedIds(new Set());
    loadData();
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    toast.success(`Copied ${email} to clipboard`);
  };

  const handleExportCSV = () => {
    if (items.length === 0) {
      toast.error("No subscribers to export");
      return;
    }
    const headers = "ID,Email,Source,Status,Subscribed Date\n";
    const rows = items
      .map(
        (item) =>
          `"${item.id}","${item.email}","${item.source}","${item.status}","${item.createdAt}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `faq-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Exported CSV file");
  };

  return (
    <div className="space-y-4">
      {/* Top Search & Actions Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Search email IDs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              className="h-9 gap-1.5"
              onClick={handleBulkDelete}
            >
              <Trash2 className="size-3.5" />
              <span>Delete ({selectedIds.size})</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={handleExportCSV}
            disabled={items.length === 0}
          >
            <Download className="size-3.5" />
            <span>Export CSV</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="gap-0 rounded-lg border shadow-sm">
        <CardHeader className="py-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <MailCheck className="size-5 text-blue-600" />
                <span>F&Q Inquiries & Subscribers</span>
                <Badge variant="secondary" className="font-mono text-xs ml-1">
                  {items.length}
                </Badge>
              </CardTitle>
              <CardDescription className="mt-1 text-xs text-muted-foreground">
                All visitor and doctor email addresses captured from the public FAQ page newsletter form.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-8 w-full rounded-md" />
              <Skeleton className="h-8 w-full rounded-md" />
              <Skeleton className="h-8 w-full rounded-md" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <Inbox className="mx-auto size-10 text-muted-foreground/60" />
              <p className="text-sm font-medium text-muted-foreground">
                {searchQuery ? `No subscribers found matching "${searchQuery}"` : "No FAQ subscribers yet. Form submissions will appear here."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[650px]">
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="w-12 pl-4">
                      <Checkbox
                        checked={filteredItems.length > 0 && selectedIds.size === filteredItems.length}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead>Email ID</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Subscribed Date</TableHead>
                    <TableHead className="text-right pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => {
                    const isSelected = selectedIds.has(item.id);
                    return (
                      <TableRow
                        key={item.id}
                        className={`transition-colors duration-150 hover:bg-muted/40 ${
                          isSelected ? "bg-muted/40" : ""
                        }`}
                      >
                        <TableCell className="w-12 pl-4">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectRow(item.id)}
                            aria-label={`Select ${item.email}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {item.email}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal text-xs bg-muted/40">
                            {item.source}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(item.createdAt)}
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-foreground"
                              onClick={() => handleCopyEmail(item.email)}
                              title="Copy Email"
                            >
                              <Copy className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(item.id, item.email)}
                              disabled={deletingId === item.id}
                              title="Delete Email"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
