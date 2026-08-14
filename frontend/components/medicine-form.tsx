"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TabletsIcon } from "lucide-react";
import type { Medicine } from "@/components/medicines-table";

const categories = [
  "Tablet",
  "Capsule",
  "Syrup",
  "Injection",
  "Drops",
  "Inhaler",
  "Ointment / Cream",
  "Other",
];

export function MedicineForm({
  onSaved,
  initial,
}: {
  onSaved: () => Promise<void>;
  initial?: Medicine;
}) {
  const isEditing = Boolean(initial);

  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload = {
      name,
      category: category || null,
      notes: notes || null,
    };

    const res = await fetch(
      isEditing ? `/api/medicines/${initial!.id}` : "/api/medicines",
      {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      toast.error(data.error || "Something went wrong. Please try again.");
      return;
    }

    toast.success(isEditing ? "Medicine updated!" : "Medicine added!", {
      description: name,
    });

    if (!isEditing) {
      setName("");
      setCategory("");
      setNotes("");
    }

    await onSaved();
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TabletsIcon className="size-5" />
          {isEditing ? "Edit Medicine" : "Add a Medicine"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="name">Medicine Name *</FieldLabel>
                <Input
                  id="name"
                  type="text"
                  placeholder="Paracetamol 500mg"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="category">Category</FieldLabel>
                <Input
                  id="category"
                  type="text"
                  list="medicine-categories"
                  placeholder="Tablet, Syrup, ..."
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
                <datalist id="medicine-categories">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                <FieldDescription>
                  Optional grouping used to organize the medicine list.
                </FieldDescription>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="notes">Notes</FieldLabel>
              <Textarea
                id="notes"
                rows={3}
                placeholder="e.g. Take with food, avoid before surgery..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </FieldGroup>

          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading
              ? isEditing
                ? "Updating..."
                : "Adding..."
              : isEditing
                ? "Update Medicine"
                : "Add Medicine"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

