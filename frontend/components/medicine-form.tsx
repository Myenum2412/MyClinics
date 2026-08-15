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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CircleStackIcon as TabletsIcon,
} from "@heroicons/react/24/outline";
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
  const [composition, setComposition] = useState(initial?.composition ?? "");
  const [dosage, setDosage] = useState(initial?.dosage ?? "");
  const [requiresPrescription, setRequiresPrescription] = useState(
    initial?.requiresPrescription ?? false
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload = {
      name,
      category: category || null,
      composition: composition || null,
      dosage: dosage || null,
      requiresPrescription,
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
      setComposition("");
      setDosage("");
      setRequiresPrescription(false);
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
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="composition">Composition</FieldLabel>
                <Input
                  id="composition"
                  type="text"
                  placeholder="e.g. Paracetamol 500mg + Caffeine 65mg"
                  value={composition}
                  onChange={(e) => setComposition(e.target.value)}
                />
                <FieldDescription>
                  Active ingredients and strengths.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="dosage">Dosage / Frequency</FieldLabel>
                <Input
                  id="dosage"
                  type="text"
                  placeholder="e.g. 1-1-1 or Once daily"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                />
                <FieldDescription>
                  Typical dose and frequency of administration.
                </FieldDescription>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="requiresPrescription">
                Prescription status
              </FieldLabel>
              <label
                htmlFor="requiresPrescription"
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <Checkbox
                  id="requiresPrescription"
                  checked={requiresPrescription}
                  onCheckedChange={(checked) =>
                    setRequiresPrescription(checked === true)
                  }
                />
                <span>Requires a prescription (Rx only)</span>
              </label>
              <FieldDescription>
                Mark this medicine as prescription-only. Shown as Rx in the
                list.
              </FieldDescription>
            </Field>
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

