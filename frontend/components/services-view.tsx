"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangleIcon,
  Ellipsis,
  Pencil,
  PlusIcon,
  Search,
  Trash,
  StethoscopeIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatINR } from "@/lib/billing";

export type Service = {
  id: string;
  name: string;
  category: string | null;
  price: number;
  isActive: boolean;
  createdAt: string;
};

const SERVICE_CATEGORIES = ["Consultation", "Procedure", "Lab Test", "Surgery", "Other"];

function ServiceForm({
  initial,
  onClose,
  onSaved,
}: {
  initial?: Service | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const isEdit = Boolean(initial);
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [price, setPrice] = useState(initial ? String(initial.price) : "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch(isEdit ? `/api/services/${initial?.id ?? ""}` : "/api/services", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        category: category.trim() || null,
        price: Number(price) || 0,
        isActive,
      }),
    });
    setLoading(false);
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Something went wrong. Please try again.");
      return;
    }
    toast.success(isEdit ? "Service updated!" : "Service added!");
    await onSaved();
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="serviceName">Service Name *</FieldLabel>
          <Input
            id="serviceName"
            type="text"
            placeholder="Consultation fee"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="serviceCategory">Category</FieldLabel>
            <Input
              id="serviceCategory"
              type="text"
              list="service-categories"
              placeholder="Consultation"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <datalist id="service-categories">
              {SERVICE_CATEGORIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <FieldDescription>Optional grouping for this service.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="servicePrice">Price (₹) *</FieldLabel>
            <Input
              id="servicePrice"
              type="number"
              min={0}
              step="0.01"
              placeholder="500"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </Field>
        </div>
        <label className="flex w-fit items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-[var(--primary)]"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Active — available in new bills
        </label>
      </FieldGroup>
      <DialogFooter className="mt-2">
        <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : isEdit ? "Update Service" : "Add Service"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function ServicesView({
  initialServices,
}: {
  initialServices: Service[];
}) {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Service | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<Service | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function refetch() {
    const res = await fetch("/api/services", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setServices(data.services);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    const res = await fetch(`/api/services/${deleting.id}`, { method: "DELETE" });
    setDeleteBusy(false);
    if (res.ok) {
      toast.success("Service deleted", { description: deleting.name });
      setDeleting(null);
      await refetch();
    } else {
      const data = await res.json();
      toast.error(data.error || "Something went wrong. Please try again.");
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return services;
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.category ?? "").toLowerCase().includes(q)
    );
  }, [services, search]);

  const activeCount = services.filter((s) => s.isActive).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="md:w-1/3">
            <h1 className="text-xl font-semibold tracking-tight">Services</h1>
            <p className="text-sm text-muted-foreground">
              Manage clinic services and fees used in billing.
            </p>
          </div>
          <div className="flex justify-center md:w-1/3">
            <div className="relative w-full max-w-sm">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search services..."
                className="pl-8"
                aria-label="Search services"
              />
            </div>
          </div>
          <div className="flex justify-end md:w-1/3">
            <Dialog open={adding} onOpenChange={setAdding}>
              <DialogTrigger render={<Button size="sm" />}>
                <PlusIcon className="mr-1 size-3.5" aria-hidden="true" />
                Add Service
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <StethoscopeIcon className="size-5" />
                    Add Service
                  </DialogTitle>
                  <DialogDescription>
                    Add a service with its price so it can be billed in one click.
                  </DialogDescription>
                </DialogHeader>
                <ServiceForm
                  onClose={() => setAdding(false)}
                  onSaved={refetch}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">{services.length} services</Badge>
          <Badge variant="outline">{activeCount} active</Badge>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
              <TableHead className="h-9">Service</TableHead>
              <TableHead className="h-9">Category</TableHead>
              <TableHead className="h-9">Price</TableHead>
              <TableHead className="h-9">Status</TableHead>
              <TableHead className="h-9 w-12 pr-4 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length ? (
              filtered.map((s) => (
                <TableRow key={s.id} className="border-b border-border last:border-b-0">
                  <TableCell className="py-3">
                    <span className="text-sm font-medium">{s.name}</span>
                  </TableCell>
                  <TableCell className="py-3">
                    <span className="text-sm text-muted-foreground">
                      {s.category ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell className="py-3">
                    <span className="text-sm font-semibold tabular-nums">
                      {formatINR(s.price)}
                    </span>
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge variant={s.isActive ? "default" : "secondary"}>
                      {s.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3 pr-4">
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Actions for ${s.name}`}
                            >
                              <Ellipsis className="size-4" aria-hidden="true" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditing(s);
                            }}
                          >
                            <Pencil aria-hidden="true" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleting(s)}
                          >
                            <Trash aria-hidden="true" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  {services.length
                    ? "No services match your search."
                    : "No services yet. Add the first one above."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="size-4" />
              Edit Service
            </DialogTitle>
            <DialogDescription>Update the service details below.</DialogDescription>
          </DialogHeader>
          <ServiceForm
            initial={editing}
            onClose={() => setEditing(null)}
            onSaved={refetch}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="sm:max-w-lg">
          <div className="flex items-start space-x-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
              <AlertTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <DialogHeader>
              <DialogTitle>Delete service</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete{" "}
                <span className="font-medium text-foreground">
                  {deleting?.name}
                </span>
                ? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteBusy}
            >
              {deleteBusy ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
