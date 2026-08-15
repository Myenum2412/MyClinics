"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { PlusIcon, Printer, ReceiptText, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { printBill } from "@/components/billing-print";
import { billingHtml } from "@/lib/print-documents";
import { saveReportCopy } from "@/components/report-copy";
import { BILL_STATUSES, PAYMENT_METHODS, formatINR, round2 } from "@/lib/billing";
import { PatientPicker, type PatientPick } from "@/components/patient-picker";
import type { Bill, BillItem } from "@/components/billing-table";
import type { Service } from "@/components/services-view";

type BillItemInput = {
  name: string;
  qty: string;
  price: string;
};

function emptyItem(): BillItemInput {
  return { name: "", qty: "1", price: "" };
}

function toInputs(initial?: Bill | null): BillItemInput[] {
  if (!initial || !initial.items.length) return [emptyItem()];
  return initial.items.map((i) => ({
    name: i.name,
    qty: String(i.qty),
    price: String(i.price),
  }));
}

export function BillingForm({
  initial,
  onSaved,
  onCancel,
  patients,
  services,
}: {
  initial?: Bill | null;
  onSaved: () => Promise<void>;
  onCancel: () => void;
  patients?: PatientPick[];
  services?: Service[];
}) {
  const isEdit = Boolean(initial);

  const [patientName, setPatientName] = useState(initial?.patientName ?? "");
  const [patientPhone, setPatientPhone] = useState(initial?.patientPhone ?? "");
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<BillItemInput[]>(toInputs(initial));
  const [discount, setDiscount] = useState(initial ? String(initial.discount) : "0");
  const [taxRate, setTaxRate] = useState(initial ? String(initial.taxRate) : "0");
  const [paymentMethod, setPaymentMethod] = useState(initial?.paymentMethod ?? "Cash");
  const [status, setStatus] = useState(initial?.status ?? "paid");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [quickService, setQuickService] = useState("");
  const [loading, setLoading] = useState(false);

  const activeServices = useMemo(
    () => (services ?? []).filter((s) => s.isActive),
    [services]
  );

  function addService(service: Service) {
    setItems((prev) => [
      ...prev,
      { name: service.name, qty: "1", price: String(service.price) },
    ]);
  }

  function handlePickPatient(patient: PatientPick) {
    setSelectedPatientId(patient.id);
    setPatientName(patient.fullName);
    setPatientPhone(patient.mobile || patient.whatsapp || "");
  }

  function updateItem(i: number, patch: Partial<BillItemInput>) {
    setItems((prev) =>
      prev.map((item, idx) => (idx === i ? { ...item, ...patch } : item))
    );
  }

  function removeItem(i: number) {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  const parsedItems: BillItem[] = items.map((i) => {
    const qty = Number(i.qty) || 0;
    const price = Number(i.price) || 0;
    return { name: i.name, qty, price, amount: round2(qty * price) };
  });
  const subtotal = round2(parsedItems.reduce((s, i) => s + i.amount, 0));
  const safeDiscount = round2(Math.max(0, Number(discount) || 0));
  const safeTaxRate = Math.max(0, Number(taxRate) || 0);
  const taxable = Math.max(0, subtotal - safeDiscount);
  const tax = round2((taxable * safeTaxRate) / 100);
  const total = round2(taxable + tax);

  function buildPayload() {
    return {
      patientName: patientName.trim(),
      patientPhone: patientPhone.trim() || null,
      date: date || null,
      items: parsedItems.filter((i) => i.name.trim() && (i.qty > 0 || i.price > 0)),
      discount: safeDiscount,
      taxRate: safeTaxRate,
      paymentMethod,
      status,
      notes: notes.trim() || null,
    };
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch(
      isEdit ? `/api/bills/${initial?.id ?? ""}` : "/api/bills",
      {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      }
    );

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      toast.error(data.error || "Something went wrong. Please try again.");
      return;
    }

    const copySaved = await saveCopy(data.bill?.billNumber ?? initial?.billNumber);

    toast.success(isEdit ? "Bill updated!" : "Bill saved!", {
      description: copySaved
        ? `${data.bill?.billNumber ?? patientName} · copy saved`
        : data.bill?.billNumber ?? patientName,
    });

    await onSaved();
    onCancel();
  }

  async function saveCopy(billNumber?: string): Promise<boolean> {
    const name = patientName.trim();
    if (!name) return false;
    try {
      const bill: Bill = {
        id: initial?.id ?? "",
        billNumber: billNumber || initial?.billNumber || "New Invoice",
        patientName: name,
        patientPhone: patientPhone || null,
        doctorId: initial?.doctorId ?? null,
        doctorName: initial?.doctorName ?? "Doctor",
        date,
        items: parsedItems,
        subtotal,
        discount: safeDiscount,
        taxRate: safeTaxRate,
        tax,
        total,
        paymentMethod,
        status,
        notes: notes.trim() || null,
        createdAt: initial?.createdAt ?? new Date().toISOString(),
      };
      const matched = patients?.find(
        (pt) => pt.fullName.toLowerCase() === name.toLowerCase()
      );
      await saveReportCopy({
        html: billingHtml(bill),
        fileName: `${bill.billNumber.replace(/\s+/g, "-")}-${name.replace(/\s+/g, "-")}.html`,
        category: "billing",
        patientId: selectedPatientId || matched?.id || null,
        patientName: name,
      });
      return true;
    } catch (error) {
      console.error("Save bill copy error", error);
      return false;
    }
  }

  function handlePrint() {
    const bill: Bill = {
      id: initial?.id ?? "",
      billNumber: initial?.billNumber ?? "New Invoice",
      patientName,
      patientPhone: patientPhone || null,
      doctorId: initial?.doctorId ?? null,
      doctorName: initial?.doctorName ?? "Doctor",
      date,
      items: parsedItems,
      subtotal,
      discount: safeDiscount,
      taxRate: safeTaxRate,
      tax,
      total,
      paymentMethod,
      status,
      notes: notes.trim() || null,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    };
    printBill(bill);
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ReceiptText className="size-5" />
          {isEdit ? `Edit Bill ${initial?.billNumber ?? ""}` : "New Bill / Invoice"}
        </CardTitle>
        <CardDescription>
          {isEdit
            ? "Update the bill details below."
            : "Create a bill or invoice for a patient visit."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="flex flex-col gap-8">
          <fieldset className="flex flex-col gap-4">
            <legend className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Patient Details
            </legend>
            <FieldGroup>
              {patients && patients.length > 0 && (
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="patientPicker">Select Patient</FieldLabel>
                  <PatientPicker
                    id="patientPicker"
                    patients={patients}
                    value={selectedPatientId}
                    onPick={handlePickPatient}
                  />
                  <FieldDescription>
                    Selecting a patient auto-fills the details below.
                  </FieldDescription>
                </Field>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="patientName">Patient Name *</FieldLabel>
                  <Input
                    id="patientName"
                    type="text"
                    placeholder="Ravi Kumar"
                    required
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="patientPhone">Phone Number</FieldLabel>
                  <Input
                    id="patientPhone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                  />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor="billDate">Bill Date</FieldLabel>
                  <Input
                    id="billDate"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>Payment Method</FieldLabel>
                  <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v ?? "Cash")}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Status</FieldLabel>
                  <Select value={status} onValueChange={(v) => setStatus(v ?? "paid")}>
                    <SelectTrigger className="w-full">
                      <SelectValue className="capitalize" />
                    </SelectTrigger>
                    <SelectContent>
                      {BILL_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          <span className="capitalize">{s}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </FieldGroup>
          </fieldset>

          <fieldset className="flex flex-col gap-4">
            <legend className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Bill Items
            </legend>
            <FieldGroup>
              {activeServices.length > 0 && (
                <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-sm font-medium">Quick add from services</p>
                  <Select
                    value={quickService}
                    onValueChange={(v) => {
                      if (v) {
                        const service = activeServices.find((s) => s.id === v);
                        if (service) addService(service);
                        setQuickService("");
                      }
                    }}
                  >
                    <SelectTrigger className="w-full sm:max-w-sm">
                      <SelectValue placeholder="Pick a service to add..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activeServices.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                          <span className="text-muted-foreground">
                            {" "}
                            · {formatINR(s.price)}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex flex-col gap-4">
                {items.map((item, i) => (
                  <div
                    key={i}
                    className="flex flex-col gap-4 rounded-lg border border-border bg-muted/30 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        Item {items.length > 1 ? i + 1 : ""}
                      </p>
                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => removeItem(i)}
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                          Remove
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <Field className="sm:col-span-2 lg:col-span-2">
                        <FieldLabel htmlFor={`item-name-${i}`}>
                          Item / Service
                        </FieldLabel>
                        <Input
                          id={`item-name-${i}`}
                          type="text"
                          placeholder="Consultation fee"
                          value={item.name}
                          onChange={(e) => updateItem(i, { name: e.target.value })}
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor={`item-qty-${i}`}>Qty</FieldLabel>
                        <Input
                          id={`item-qty-${i}`}
                          type="number"
                          min={0}
                          step={1}
                          value={item.qty}
                          onChange={(e) => updateItem(i, { qty: e.target.value })}
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor={`item-price-${i}`}>Price (₹)</FieldLabel>
                        <Input
                          id={`item-price-${i}`}
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="500"
                          value={item.price}
                          onChange={(e) => updateItem(i, { price: e.target.value })}
                        />
                      </Field>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Amount:{" "}
                      <span className="font-medium text-foreground tabular-nums">
                        {formatINR(parsedItems[i]?.amount ?? 0)}
                      </span>
                    </p>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setItems((prev) => [...prev, emptyItem()])}
                >
                  <PlusIcon className="size-3.5" aria-hidden="true" />
                  Add Item
                </Button>
              </div>
            </FieldGroup>
          </fieldset>

          <fieldset className="flex flex-col gap-4">
            <legend className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Totals
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="subtotal">Subtotal</FieldLabel>
                <Input
                  id="subtotal"
                  type="text"
                  readOnly
                  value={formatINR(subtotal)}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="discount">Discount (₹)</FieldLabel>
                  <Input
                    id="discount"
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="0"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="taxRate">Tax (%)</FieldLabel>
                  <Input
                    id="taxRate"
                    type="number"
                    min={0}
                    step="0.1"
                    placeholder="0"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                  />
                </Field>
              </div>
            </div>
            <div className="flex flex-col gap-1 rounded-lg border border-border bg-muted/30 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium tabular-nums">{formatINR(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span className="font-medium text-destructive tabular-nums">
                  −{formatINR(safeDiscount)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tax ({safeTaxRate}%)</span>
                <span className="font-medium tabular-nums">{formatINR(tax)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between border-t border-border pt-2 text-base">
                <span className="font-semibold">Total</span>
                <span className="font-bold tabular-nums">{formatINR(total)}</span>
              </div>
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-4">
            <legend className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Additional Details
            </legend>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="notes">Notes</FieldLabel>
                <Textarea
                  id="notes"
                  rows={3}
                  placeholder="Payment terms, follow-up notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <FieldDescription>
                  Optional notes shown on the invoice.
                </FieldDescription>
              </Field>
            </FieldGroup>
          </fieldset>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : isEdit ? "Update Bill" : "Save Bill"}
            </Button>
            <Button type="button" variant="outline" onClick={handlePrint}>
              <Printer className="size-3.5" aria-hidden="true" />
              Print Invoice
            </Button>
            <Button type="button" variant="ghost" onClick={onCancel}>
              <X className="size-3.5" aria-hidden="true" />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
