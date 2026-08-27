import { now as nowFn, todayISO, addDays } from "@/clinic/core/datetime";
import type { Db, WithId } from "mongodb";
import PDFDocument from "pdfkit";
import { writeAudit } from "@/clinic/core/audit";
import { requireClinicOf, type ClinicContext } from "@/clinic/core/context";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "@/clinic/core/errors";
import {
  generatePharmacyMedicineId,
  generatePharmacyInventoryId,
  generatePharmacyMovementId,
  generatePharmacySupplierId,
  generatePharmacyPurchaseId,
  generatePharmacySaleId,
  generatePharmacyAdjustmentId,
  generatePharmacyTransferId,
  generatePharmacyReturnId,
  randomToken,
} from "@/clinic/core/ids";
import type {
  PharmacySettingsDoc,
  PharmacyMedicineDoc,
  PharmacyInventoryDoc,
  PharmacyStockMovementDoc,
  PharmacySupplierDoc,
  PharmacyPurchaseDoc,
  PharmacySaleDoc,
  PharmacyAdjustmentDoc,
  PharmacyTransferDoc,
  PharmacyReturnDoc,
  StockStatus,
  ReorderStatus,
  MovementType,
} from "@/clinic/modules/pharmacy/pharmacy.schema";
import {
  PharmacySettingsRepository,
  PharmacyMedicineRepository,
  PharmacyInventoryRepository,
  PharmacyStockMovementRepository,
  PharmacySupplierRepository,
  PharmacyPurchaseRepository,
  PharmacySaleRepository,
  PharmacyAdjustmentRepository,
  PharmacyTransferRepository,
  PharmacyReturnRepository,
} from "@/clinic/modules/pharmacy/pharmacy.repository";
import {
  type UpdateSettingsInput,
  type CreateMedicineInput,
  type UpdateMedicineInput,
  type CreateSupplierInput,
  type UpdateSupplierInput,
  type AddOpeningStockInput,
  type CreatePurchaseInput,
  type CreateSaleInput,
  type CreateAdjustmentInput,
  type CreateTransferInput,
  type CreateReturnInput,
  type WriteOffInput,
  type BulkActionInput,
  type ReportType,
} from "@/clinic/modules/pharmacy/pharmacy.dto";

const NEAR_EXPIRY_DAYS = 90;

type ScopeArg = {
  role: string;
  doctorId: string | null;
  patientId: string | null;
};

function computeStatus(
  available: number,
  reorderLevel: number,
  expiryDate: string | null
): { status: StockStatus; reorderStatus: ReorderStatus } {
  const today = todayISO();
  if (expiryDate && expiryDate < today) {
    return { status: "expired", reorderStatus: available <= reorderLevel ? "reorder" : "ok" };
  }
  if (expiryDate) {
    const near = addDays(new Date(`${today}T00:00:00+05:30`), NEAR_EXPIRY_DAYS)
      .toISOString()
      .slice(0, 10);
    if (expiryDate <= near) {
      return {
        status: "near_expiry",
        reorderStatus: available <= reorderLevel ? "reorder" : "ok",
      };
    }
  }
  if (available <= 0) {
    return { status: "out_of_stock", reorderStatus: "reorder" };
  }
  if (available <= reorderLevel) {
    return { status: "low_stock", reorderStatus: "reorder" };
  }
  return { status: "in_stock", reorderStatus: "ok" };
}

export interface ReportResult {
  filename: string;
  contentType: string;
  data: string | Buffer;
}

export class PharmacyService {
  constructor(private readonly db: Db) {}

  private settingsRepo(ctx: ClinicContext) {
    return new PharmacySettingsRepository(this.db, requireClinicOf(ctx), this.scope(ctx));
  }
  private medicineRepo(ctx: ClinicContext) {
    return new PharmacyMedicineRepository(this.db, requireClinicOf(ctx), this.scope(ctx));
  }
  private inventoryRepo(ctx: ClinicContext) {
    return new PharmacyInventoryRepository(this.db, requireClinicOf(ctx), this.scope(ctx));
  }
  private movementRepo(ctx: ClinicContext) {
    return new PharmacyStockMovementRepository(this.db, requireClinicOf(ctx), this.scope(ctx));
  }
  private supplierRepo(ctx: ClinicContext) {
    return new PharmacySupplierRepository(this.db, requireClinicOf(ctx), this.scope(ctx));
  }
  private purchaseRepo(ctx: ClinicContext) {
    return new PharmacyPurchaseRepository(this.db, requireClinicOf(ctx), this.scope(ctx));
  }
  private saleRepo(ctx: ClinicContext) {
    return new PharmacySaleRepository(this.db, requireClinicOf(ctx), this.scope(ctx));
  }
  private adjustmentRepo(ctx: ClinicContext) {
    return new PharmacyAdjustmentRepository(this.db, requireClinicOf(ctx), this.scope(ctx));
  }
  private transferRepo(ctx: ClinicContext) {
    return new PharmacyTransferRepository(this.db, requireClinicOf(ctx), this.scope(ctx));
  }
  private returnRepo(ctx: ClinicContext) {
    return new PharmacyReturnRepository(this.db, requireClinicOf(ctx), this.scope(ctx));
  }

  private scope(ctx: ClinicContext): ScopeArg {
    return { role: ctx.role, doctorId: ctx.doctorId, patientId: ctx.patientId };
  }

  private performer(ctx: ClinicContext): string {
    return ctx.name ? `${ctx.name} (${ctx.userId})` : ctx.userId;
  }

  // ── Settings ─────────────────────────────────────────────────────────────

  async getSettings(ctx: ClinicContext): Promise<WithId<PharmacySettingsDoc> | null> {
    return this.settingsRepo(ctx).find();
  }

  async updateSettings(
    ctx: ClinicContext,
    input: UpdateSettingsInput
  ): Promise<WithId<PharmacySettingsDoc>> {
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) {
      if (v !== undefined) patch[k] = v;
    }
    if (Object.keys(patch).length === 0) {
      const existing = await this.settingsRepo(ctx).find();
      if (existing) return existing;
    }
    const saved = await this.settingsRepo(ctx).upsert(patch);
    await writeAudit(this.db, ctx, {
      action: "update",
      entity: "pharmacy_settings",
      entityId: saved.pharmacyId,
      metadata: { fields: Object.keys(patch) },
    });
    return saved;
  }

  // ── Medicines ────────────────────────────────────────────────────────────

  async createMedicine(ctx: ClinicContext, input: CreateMedicineInput): Promise<WithId<PharmacyMedicineDoc>> {
    const clinicId = requireClinicOf(ctx);
    if (input.barcode) {
      const byBarcode = await this.medicineRepo(ctx).findByBarcode(input.barcode);
      if (byBarcode) {
        throw new ConflictError("A medicine with this barcode already exists");
      }
    }
    const duplicate = await this.medicineRepo(ctx).findPotentialDuplicate(
      input.name,
      input.manufacturer ?? null,
      input.strength ?? null
    );
    if (duplicate) {
      throw new ConflictError(
        "A similar medicine already exists (same name, manufacturer and strength)"
      );
    }
    if (input.supplierId) {
      const supplier = await this.supplierRepo(ctx).findBySupplierId(input.supplierId);
      if (!supplier) throw new BadRequestError("The selected supplier does not exist");
    }
    const medicineId = generatePharmacyMedicineId();
    const record = await this.medicineRepo(ctx).insert({
      medicineId,
      name: input.name,
      genericName: input.genericName ?? null,
      brand: input.brand ?? null,
      category: input.category ?? null,
      dosageForm: input.dosageForm ?? null,
      strength: input.strength ?? null,
      unit: input.unit ?? null,
      manufacturer: input.manufacturer ?? null,
      hsnCode: input.hsnCode ?? null,
      barcode: input.barcode ?? null,
      batchNumber: input.batchNumber ?? null,
      prescriptionRequired: input.prescriptionRequired,
      reorderLevel: input.reorderLevel,
      minStockLevel: input.minStockLevel,
      maxStockLevel: input.maxStockLevel ?? null,
      purchasePrice: input.purchasePrice,
      sellingPrice: input.sellingPrice,
      taxPercent: input.taxPercent,
      discount: input.discount,
      supplierId: input.supplierId ?? null,
      manufacturingDate: input.manufacturingDate ?? null,
      expiryDate: input.expiryDate ?? null,
      storageConditions: input.storageConditions ?? null,
      status: input.status,
    });
    await writeAudit(this.db, ctx, {
      action: "create",
      entity: "pharmacy_medicine",
      entityId: medicineId,
      metadata: { name: input.name, barcode: input.barcode ?? null },
    });
    return record;
  }

  async listMedicines(
    ctx: ClinicContext,
    query: {
      search?: string;
      category?: string;
      status?: string;
      supplierId?: string;
      skip: number;
      limit: number;
    }
  ) {
    const [items, total] = await this.medicineRepo(ctx).list(query);
    return { items, total };
  }

  async getMedicine(ctx: ClinicContext, medicineId: string): Promise<WithId<PharmacyMedicineDoc>> {
    const med = await this.medicineRepo(ctx).findByMedicineId(medicineId);
    if (!med) throw new NotFoundError("Medicine not found");
    return med;
  }

  async updateMedicine(
    ctx: ClinicContext,
    medicineId: string,
    input: UpdateMedicineInput
  ): Promise<WithId<PharmacyMedicineDoc>> {
    const repo = this.medicineRepo(ctx);
    const existing = await repo.findByMedicineId(medicineId);
    if (!existing) throw new NotFoundError("Medicine not found");
    if (input.barcode && input.barcode !== existing.barcode) {
      const byBarcode = await repo.findByBarcode(input.barcode);
      if (byBarcode) throw new ConflictError("A medicine with this barcode already exists");
    }
    if (input.supplierId) {
      const supplier = await this.supplierRepo(ctx).findBySupplierId(input.supplierId);
      if (!supplier) throw new BadRequestError("The selected supplier does not exist");
    }
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) {
      if (v !== undefined) patch[k] = v;
    }
    if (Object.keys(patch).length === 0) return existing;
    await repo.update(medicineId, patch);
    await writeAudit(this.db, ctx, {
      action: "update",
      entity: "pharmacy_medicine",
      entityId: medicineId,
      metadata: { fields: Object.keys(patch) },
    });
    return (await repo.findByMedicineId(medicineId))!;
  }

  async deleteMedicine(ctx: ClinicContext, medicineId: string): Promise<void> {
    const repo = this.medicineRepo(ctx);
    const existing = await repo.findByMedicineId(medicineId);
    if (!existing) throw new NotFoundError("Medicine not found");
    const inStock = await this.inventoryRepo(ctx).findByBatch(existing.medicineId, existing.batchNumber ?? "");
    if (inStock && inStock.quantityAvailable > 0) {
      throw new BadRequestError("Cannot delete a medicine that still has stock");
    }
    await repo.softDelete(medicineId);
    await writeAudit(this.db, ctx, {
      action: "delete",
      entity: "pharmacy_medicine",
      entityId: medicineId,
      metadata: { name: existing.name },
    });
  }

  async bulkMedicines(ctx: ClinicContext, input: BulkActionInput): Promise<{ modified: number }> {
    const repo = this.medicineRepo(ctx);
    let modified = 0;
    if (input.action === "delete") {
      modified = await repo.bulkSoftDelete(input.ids);
    } else {
      modified = await repo.setStatus(input.ids, input.action === "activate" ? "active" : "inactive");
    }
    await writeAudit(this.db, ctx, {
      action: "bulk",
      entity: "pharmacy_medicine",
      entityId: null,
      metadata: { action: input.action, count: modified },
    });
    return { modified };
  }

  // ── Inventory & Stock Movements ───────────────────────────────────────────

  private async recordMovement(
    ctx: ClinicContext,
    params: {
      medicineId: string;
      batchNumber: string;
      before: number;
      changed: number;
      after: number;
      type: MovementType;
      transactionId: string;
      referenceInvoice?: string | null;
      party?: string | null;
      reason?: string | null;
      notes?: string | null;
    }
  ): Promise<void> {
    await this.movementRepo(ctx).insert({
      movementId: generatePharmacyMovementId(),
      transactionId: params.transactionId,
      medicineId: params.medicineId,
      batchNumber: params.batchNumber,
      quantityBefore: params.before,
      quantityChanged: params.changed,
      quantityAfter: params.after,
      movementType: params.type,
      referenceInvoice: params.referenceInvoice ?? null,
      party: params.party ?? null,
      performedBy: this.performer(ctx),
      reason: params.reason ?? null,
      notes: params.notes ?? null,
    });
  }

  /** Recompute and persist status/reorderStatus for an inventory batch. */
  private async refreshInventoryStatus(
    ctx: ClinicContext,
    inventoryId: string
  ): Promise<void> {
    const inv = await this.inventoryRepo(ctx).findByInventoryId(inventoryId);
    if (!inv) return;
    const { status, reorderStatus } = computeStatus(
      inv.quantityAvailable,
      inv.reorderLevel,
      inv.expiryDate
    );
    await this.inventoryRepo(ctx).update(inventoryId, { status, reorderStatus });
  }

  async listInventory(
    ctx: ClinicContext,
    query: Parameters<PharmacyInventoryRepository["list"]>[0]
  ) {
    const [items, total] = await this.inventoryRepo(ctx).list(query);
    const supplierIds = Array.from(
      new Set(items.map((i) => i.supplierId).filter(Boolean) as string[])
    );
    const supplierMap = new Map<string, string>();
    if (supplierIds.length) {
      const [suppliers] = await this.supplierRepo(ctx).list({ skip: 0, limit: 10_000 });
      for (const s of suppliers) supplierMap.set(s.supplierId, s.name);
    }
    const rows = items.map((i) => ({
      ...i,
      supplierName: i.supplierId ? (supplierMap.get(i.supplierId) ?? null) : null,
    }));
    return { items: rows, total };
  }

  async getInventory(ctx: ClinicContext, inventoryId: string): Promise<WithId<PharmacyInventoryDoc>> {
    const inv = await this.inventoryRepo(ctx).findByInventoryId(inventoryId);
    if (!inv) throw new NotFoundError("Inventory batch not found");
    return inv;
  }

  async addOpeningStock(ctx: ClinicContext, input: AddOpeningStockInput): Promise<{ created: number }> {
    const transactionId = `txn_${randomToken(10)}`;
    let created = 0;
    for (const item of input.items) {
      const med = await this.medicineRepo(ctx).findByMedicineId(item.medicineId);
      if (!med) throw new BadRequestError(`Medicine ${item.medicineId} does not exist`);
      if (item.supplierId) {
        const sup = await this.supplierRepo(ctx).findBySupplierId(item.supplierId);
        if (!sup) throw new BadRequestError("The selected supplier does not exist");
      }
      const existing = await this.inventoryRepo(ctx).findByBatch(med.medicineId, item.batchNumber);
      if (existing) {
        const before = existing.quantityAvailable;
        const after = before + item.quantity;
        await this.inventoryRepo(ctx).updateByBatch(med.medicineId, item.batchNumber, {
          quantityAvailable: after,
          purchasePrice: item.unitPrice,
          expiryDate: item.expiryDate ?? existing.expiryDate,
          supplierId: item.supplierId ?? existing.supplierId,
          storageLocation: item.storageLocation ?? existing.storageLocation,
        });
        await this.refreshInventoryStatus(ctx, existing.inventoryId);
        await this.recordMovement(ctx, {
          medicineId: med.medicineId,
          batchNumber: item.batchNumber,
          before,
          changed: item.quantity,
          after,
          type: "correction",
          transactionId,
          reason: "Opening stock",
          notes: input.notes ?? null,
        });
      } else {
        const { status, reorderStatus } = computeStatus(
          item.quantity,
          med.reorderLevel,
          item.expiryDate ?? null
        );
        await this.inventoryRepo(ctx).insert({
          inventoryId: generatePharmacyInventoryId(),
          medicineId: med.medicineId,
          name: med.name,
          genericName: med.genericName,
          category: med.category,
          batchNumber: item.batchNumber,
          barcode: med.barcode,
          quantityAvailable: item.quantity,
          quantityReserved: 0,
          quantityDamaged: 0,
          purchasePrice: item.unitPrice,
          sellingPrice: med.sellingPrice,
          taxPercent: med.taxPercent,
          expiryDate: item.expiryDate ?? null,
          manufacturingDate: item.manufacturingDate ?? null,
          supplierId: item.supplierId ?? null,
          storageLocation: item.storageLocation ?? null,
          reorderLevel: med.reorderLevel,
          status,
          reorderStatus,
        });
        await this.recordMovement(ctx, {
          medicineId: med.medicineId,
          batchNumber: item.batchNumber,
          before: 0,
          changed: item.quantity,
          after: item.quantity,
          type: "correction",
          transactionId,
          reason: "Opening stock",
          notes: input.notes ?? null,
        });
        created++;
      }
    }
    await writeAudit(this.db, ctx, {
      action: "create",
      entity: "pharmacy_opening_stock",
      entityId: null,
      metadata: { items: input.items.length, transactionId },
    });
    return { created };
  }

  async writeOff(ctx: ClinicContext, input: WriteOffInput): Promise<void> {
    const inv = await this.inventoryRepo(ctx).findByInventoryId(input.inventoryId);
    if (!inv) throw new NotFoundError("Inventory batch not found");
    if (input.quantity > inv.quantityAvailable) {
      throw new BadRequestError("Cannot write off more than available stock");
    }
    const before = inv.quantityAvailable;
    const after = before - input.quantity;
    const transactionId = `txn_${randomToken(10)}`;
    await this.inventoryRepo(ctx).updateByBatch(inv.medicineId, inv.batchNumber, {
      quantityAvailable: after,
      quantityDamaged: inv.quantityDamaged + (input.reason === "damaged" ? input.quantity : 0),
    });
    await this.refreshInventoryStatus(ctx, inv.inventoryId);
    await this.recordMovement(ctx, {
      medicineId: inv.medicineId,
      batchNumber: inv.batchNumber,
      before,
      changed: -input.quantity,
      after,
      type: input.reason,
      transactionId,
      reason: input.reason,
      notes: input.notes ?? null,
    });
    await writeAudit(this.db, ctx, {
      action: "writeoff",
      entity: "pharmacy_inventory",
      entityId: inv.inventoryId,
      metadata: { type: input.reason, quantity: input.quantity },
    });
  }

  async listMovements(
    ctx: ClinicContext,
    query: Parameters<PharmacyStockMovementRepository["list"]>[0]
  ) {
    const [items, total] = await this.movementRepo(ctx).list(query);
    const medicineIds = Array.from(new Set(items.map((m) => m.medicineId)));
    const medMap = new Map<string, string>();
    if (medicineIds.length) {
      const [meds] = await this.medicineRepo(ctx).list({ skip: 0, limit: 10_000 });
      for (const m of meds) medMap.set(m.medicineId, m.name);
    }
    const rows = items.map((m) => ({ ...m, medicineName: medMap.get(m.medicineId) ?? m.medicineId }));
    return { items: rows, total };
  }

  // ── Suppliers ─────────────────────────────────────────────────────────────

  async createSupplier(ctx: ClinicContext, input: CreateSupplierInput): Promise<WithId<PharmacySupplierDoc>> {
    if (input.gstNumber) {
      const existing = await this.supplierRepo(ctx).findByGst(input.gstNumber);
      if (existing) throw new ConflictError("A supplier with this GST number already exists");
    }
    const supplierId = generatePharmacySupplierId();
    const record = await this.supplierRepo(ctx).insert({
      supplierId,
      name: input.name,
      contactPerson: input.contactPerson ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      address: input.address ?? null,
      gstNumber: input.gstNumber ?? null,
      drugLicenseNumber: input.drugLicenseNumber ?? null,
      paymentTerms: input.paymentTerms ?? null,
      notes: input.notes ?? null,
      status: input.status,
    });
    await writeAudit(this.db, ctx, {
      action: "create",
      entity: "pharmacy_supplier",
      entityId: supplierId,
      metadata: { name: input.name },
    });
    return record;
  }

  async listSuppliers(
    ctx: ClinicContext,
    query: { search?: string; status?: string; skip: number; limit: number }
  ) {
    const [items, total] = await this.supplierRepo(ctx).list(query);
    return { items, total };
  }

  async getSupplier(ctx: ClinicContext, supplierId: string): Promise<WithId<PharmacySupplierDoc>> {
    const sup = await this.supplierRepo(ctx).findBySupplierId(supplierId);
    if (!sup) throw new NotFoundError("Supplier not found");
    return sup;
  }

  async updateSupplier(
    ctx: ClinicContext,
    supplierId: string,
    input: UpdateSupplierInput
  ): Promise<WithId<PharmacySupplierDoc>> {
    const repo = this.supplierRepo(ctx);
    const existing = await repo.findBySupplierId(supplierId);
    if (!existing) throw new NotFoundError("Supplier not found");
    if (input.gstNumber && input.gstNumber !== existing.gstNumber) {
      const dup = await repo.findByGst(input.gstNumber, supplierId);
      if (dup) throw new ConflictError("A supplier with this GST number already exists");
    }
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) if (v !== undefined) patch[k] = v;
    if (Object.keys(patch).length === 0) return existing;
    await repo.update(supplierId, patch);
    await writeAudit(this.db, ctx, {
      action: "update",
      entity: "pharmacy_supplier",
      entityId: supplierId,
      metadata: { fields: Object.keys(patch) },
    });
    return (await repo.findBySupplierId(supplierId))!;
  }

  async deleteSupplier(ctx: ClinicContext, supplierId: string): Promise<void> {
    const repo = this.supplierRepo(ctx);
    const existing = await repo.findBySupplierId(supplierId);
    if (!existing) throw new NotFoundError("Supplier not found");
    await repo.softDelete(supplierId);
    await writeAudit(this.db, ctx, {
      action: "delete",
      entity: "pharmacy_supplier",
      entityId: supplierId,
    });
  }

  // ── Purchases ───────────────────────────────────────────────────────────

  async createPurchase(ctx: ClinicContext, input: CreatePurchaseInput): Promise<WithId<PharmacyPurchaseDoc>> {
    if (input.supplierId) {
      const sup = await this.supplierRepo(ctx).findBySupplierId(input.supplierId);
      if (!sup) throw new BadRequestError("The selected supplier does not exist");
    }
    for (const item of input.items) {
      const med = await this.medicineRepo(ctx).findByMedicineId(item.medicineId);
      if (!med) throw new BadRequestError(`Medicine ${item.medicineId} does not exist`);
    }
    const purchaseId = generatePharmacyPurchaseId();
    const invoiceNumber =
      input.invoiceNumber ??
      `PUR-${todayISO().replace(/-/g, "")}-${randomToken(4).toUpperCase()}`;
    const subtotal = input.items.reduce(
      (s, i) => s + i.quantity * (i.unitPrice ?? 0),
      0
    );
    const taxAmount = 0;
    const purchase = await this.purchaseRepo(ctx).insert({
      purchaseId,
      invoiceNumber,
      supplierId: input.supplierId ?? null,
      purchaseDate: input.purchaseDate ?? todayISO(),
      items: input.items.map((i) => ({
        medicineId: i.medicineId,
        batchNumber: i.batchNumber,
        quantity: i.quantity,
        unitPrice: i.unitPrice ?? 0,
        expiryDate: i.expiryDate ?? null,
        manufacturingDate: i.manufacturingDate ?? null,
        supplierId: i.supplierId ?? input.supplierId ?? null,
        storageLocation: i.storageLocation ?? null,
      })),
      subtotal,
      taxAmount,
      total: subtotal + taxAmount,
      status: input.status,
      receivedBy: input.status === "received" ? this.performer(ctx) : null,
      notes: input.notes ?? null,
    });
    await writeAudit(this.db, ctx, {
      action: "create",
      entity: "pharmacy_purchase",
      entityId: purchaseId,
      metadata: { invoiceNumber, status: input.status, items: input.items.length },
    });
    if (input.status === "received") {
      await this.receivePurchase(ctx, purchaseId, { notes: input.notes ?? null });
    }
    return (await this.purchaseRepo(ctx).findByPurchaseId(purchaseId))!;
  }

  async listPurchases(
    ctx: ClinicContext,
    query: { supplierId?: string; status?: string; from?: string; to?: string; skip: number; limit: number }
  ) {
    const [items, total] = await this.purchaseRepo(ctx).list(query);
    return { items, total };
  }

  async getPurchase(ctx: ClinicContext, purchaseId: string): Promise<WithId<PharmacyPurchaseDoc>> {
    const p = await this.purchaseRepo(ctx).findByPurchaseId(purchaseId);
    if (!p) throw new NotFoundError("Purchase not found");
    return p;
  }

  /** Goods receipt: create/update inventory batches and record purchase movements. */
  async receivePurchase(
    ctx: ClinicContext,
    purchaseId: string,
    input: { notes?: string | null }
  ): Promise<void> {
    const purchase = await this.purchaseRepo(ctx).findByPurchaseId(purchaseId);
    if (!purchase) throw new NotFoundError("Purchase not found");
    if (purchase.status === "received") {
      throw new BadRequestError("Purchase has already been received");
    }
    if (purchase.status === "cancelled") {
      throw new BadRequestError("Cannot receive a cancelled purchase");
    }
    const transactionId = `txn_${randomToken(10)}`;
    for (const item of purchase.items) {
      const med = await this.medicineRepo(ctx).findByMedicineId(item.medicineId);
      if (!med) throw new BadRequestError(`Medicine ${item.medicineId} does not exist`);
      const existing = await this.inventoryRepo(ctx).findByBatch(med.medicineId, item.batchNumber);
      if (existing) {
        const before = existing.quantityAvailable;
        const after = before + item.quantity;
        await this.inventoryRepo(ctx).updateByBatch(med.medicineId, item.batchNumber, {
          quantityAvailable: after,
          purchasePrice: item.unitPrice,
          expiryDate: item.expiryDate ?? existing.expiryDate,
          supplierId: item.supplierId ?? existing.supplierId,
          storageLocation: item.storageLocation ?? existing.storageLocation,
        });
        await this.refreshInventoryStatus(ctx, existing.inventoryId);
        await this.recordMovement(ctx, {
          medicineId: med.medicineId,
          batchNumber: item.batchNumber,
          before,
          changed: item.quantity,
          after,
          type: "purchase",
          transactionId,
          referenceInvoice: purchase.invoiceNumber,
          party: purchase.supplierId ?? null,
          reason: "Goods receipt",
          notes: input.notes ?? null,
        });
      } else {
        const { status, reorderStatus } = computeStatus(
          item.quantity,
          med.reorderLevel,
          item.expiryDate ?? null
        );
        await this.inventoryRepo(ctx).insert({
          inventoryId: generatePharmacyInventoryId(),
          medicineId: med.medicineId,
          name: med.name,
          genericName: med.genericName,
          category: med.category,
          batchNumber: item.batchNumber,
          barcode: med.barcode,
          quantityAvailable: item.quantity,
          quantityReserved: 0,
          quantityDamaged: 0,
          purchasePrice: item.unitPrice,
          sellingPrice: med.sellingPrice,
          taxPercent: med.taxPercent,
          expiryDate: item.expiryDate ?? null,
          manufacturingDate: item.manufacturingDate ?? null,
          supplierId: item.supplierId ?? null,
          storageLocation: item.storageLocation ?? null,
          reorderLevel: med.reorderLevel,
          status,
          reorderStatus,
        });
        await this.recordMovement(ctx, {
          medicineId: med.medicineId,
          batchNumber: item.batchNumber,
          before: 0,
          changed: item.quantity,
          after: item.quantity,
          type: "purchase",
          transactionId,
          referenceInvoice: purchase.invoiceNumber,
          party: purchase.supplierId ?? null,
          reason: "Goods receipt",
          notes: input.notes ?? null,
        });
      }
    }
    await this.purchaseRepo(ctx).update(purchaseId, {
      status: "received",
      receivedBy: this.performer(ctx),
    });
    await writeAudit(this.db, ctx, {
      action: "receive",
      entity: "pharmacy_purchase",
      entityId: purchaseId,
      metadata: { invoiceNumber: purchase.invoiceNumber, transactionId },
    });
  }

  // ── Sales (dispensing) ─────────────────────────────────────────────────

  async createSale(ctx: ClinicContext, input: CreateSaleInput): Promise<WithId<PharmacySaleDoc>> {
    if (input.patientId) {
      const patient = await this.db
        .collection("clc_patients")
        .findOne({ clinicId: requireClinicOf(ctx), patientId: input.patientId, status: { $ne: "deleted" } });
      if (!patient) throw new BadRequestError("The patient does not exist in this clinic");
    }
    const saleId = generatePharmacySaleId();
    const settings = await this.settingsRepo(ctx).find();
    const prefix = settings?.invoiceConfig?.prefix ?? "INV";
    const nextNumber = settings?.invoiceConfig?.nextNumber ?? 1;
    const invoiceNumber = input.invoiceNumber ?? `${prefix}${nextNumber}`;
    const transactionId = `txn_${randomToken(10)}`;
    const saleItems: PharmacySaleDoc["items"] = [];
    let subtotal = 0;
    let taxAmount = 0;
    let totalDiscount = 0;

    for (const item of input.items) {
      const med = await this.medicineRepo(ctx).findByMedicineId(item.medicineId);
      if (!med) throw new BadRequestError(`Medicine ${item.medicineId} does not exist`);
      if (med.prescriptionRequired && !input.patientId) {
        throw new BadRequestError(`"${med.name}" requires a prescription`);
      }
      const unitPrice = item.unitPrice ?? med.sellingPrice;
      const batches = await this.inventoryRepo(ctx).findBatchesForMedicine(
        med.medicineId,
        input.fifo ? "fifo" : "fefo"
      );
      let remaining = item.quantity;
      let sourcedFrom = item.batchNumber;
      if (item.batchNumber) {
        const target = batches.find((b) => b.batchNumber === item.batchNumber);
        if (!target || target.quantityAvailable < item.quantity) {
          throw new BadRequestError(
            `Insufficient stock for ${med.name} batch ${item.batchNumber}`
          );
        }
        await this.consumeBatch(ctx, target, item.quantity, {
          type: "sale",
          transactionId,
          referenceInvoice: invoiceNumber,
          party: input.patientId,
          reason: "Sale",
        });
      } else {
        for (const batch of batches) {
          if (remaining <= 0) break;
          const take = Math.min(remaining, batch.quantityAvailable);
          if (take <= 0) continue;
          await this.consumeBatch(ctx, batch, take, {
            type: "sale",
            transactionId,
            referenceInvoice: invoiceNumber,
            party: input.patientId,
            reason: "Sale",
          });
          remaining -= take;
          if (!sourcedFrom) sourcedFrom = batch.batchNumber;
        }
        if (remaining > 0) {
          throw new BadRequestError(`Insufficient stock for ${med.name}`);
        }
      }
      const lineDiscount = (unitPrice * item.quantity * (item.discount ?? 0)) / 100;
      const lineTax = ((unitPrice * item.quantity - lineDiscount) * (item.taxPercent ?? med.taxPercent)) / 100;
      const lineTotal = unitPrice * item.quantity - lineDiscount + lineTax;
      subtotal += unitPrice * item.quantity;
      totalDiscount += lineDiscount;
      taxAmount += lineTax;
      saleItems.push({
        medicineId: med.medicineId,
        batchNumber: sourcedFrom ?? "",
        quantity: item.quantity,
        unitPrice,
        discount: item.discount ?? 0,
        taxPercent: item.taxPercent ?? med.taxPercent,
      });
    }

    const total = subtotal - totalDiscount + taxAmount;
    const sale = await this.saleRepo(ctx).insert({
      saleId,
      invoiceNumber,
      saleDate: input.saleDate ?? todayISO(),
      patientId: input.patientId ?? null,
      items: saleItems,
      subtotal,
      discount: totalDiscount,
      taxAmount,
      total,
      paymentMethod: input.paymentMethod,
      status: "completed",
      soldBy: this.performer(ctx),
      notes: input.notes ?? null,
    });
    if (!input.invoiceNumber && settings) {
      await this.settingsRepo(ctx).upsert({
        invoiceConfig: {
          ...settings.invoiceConfig,
          nextNumber: nextNumber + 1,
        },
      });
    }
    await writeAudit(this.db, ctx, {
      action: "create",
      entity: "pharmacy_sale",
      entityId: saleId,
      metadata: { invoiceNumber, total, items: input.items.length },
    });
    return (await this.saleRepo(ctx).findBySaleId(saleId))!;
  }

  private async consumeBatch(
    ctx: ClinicContext,
    batch: WithId<PharmacyInventoryDoc>,
    quantity: number,
    meta: {
      type: MovementType;
      transactionId: string;
      referenceInvoice?: string | null;
      party?: string | null;
      reason?: string | null;
      notes?: string | null;
    }
  ): Promise<void> {
    const before = batch.quantityAvailable;
    const after = before - quantity;
    await this.inventoryRepo(ctx).updateByBatch(batch.medicineId, batch.batchNumber, {
      quantityAvailable: after,
    });
    await this.refreshInventoryStatus(ctx, batch.inventoryId);
    await this.recordMovement(ctx, {
      medicineId: batch.medicineId,
      batchNumber: batch.batchNumber,
      before,
      changed: -quantity,
      after,
      type: meta.type,
      transactionId: meta.transactionId,
      referenceInvoice: meta.referenceInvoice ?? null,
      party: meta.party ?? null,
      reason: meta.reason ?? null,
      notes: meta.notes ?? null,
    });
  }

  async listSales(
    ctx: ClinicContext,
    query: { patientId?: string; paymentMethod?: string; status?: string; from?: string; to?: string; skip: number; limit: number }
  ) {
    const [items, total] = await this.saleRepo(ctx).list(query);
    return { items, total };
  }

  async getSale(ctx: ClinicContext, saleId: string): Promise<WithId<PharmacySaleDoc>> {
    const s = await this.saleRepo(ctx).findBySaleId(saleId);
    if (!s) throw new NotFoundError("Sale not found");
    return s;
  }

  // ── Adjustments (approval workflow) ───────────────────────────────────────

  async createAdjustment(ctx: ClinicContext, input: CreateAdjustmentInput): Promise<WithId<PharmacyAdjustmentDoc>> {
    const inv = await this.inventoryRepo(ctx).findByBatch(input.medicineId, input.batchNumber);
    if (!inv) throw new NotFoundError("Inventory batch not found");
    const adjustmentId = generatePharmacyAdjustmentId();
    const record = await this.adjustmentRepo(ctx).insert({
      adjustmentId,
      medicineId: input.medicineId,
      batchNumber: input.batchNumber,
      currentQuantity: inv.quantityAvailable,
      newQuantity: input.newQuantity,
      reason: input.reason,
      status: "pending",
      requestedBy: this.performer(ctx),
      approvedBy: null,
      notes: input.notes ?? null,
    });
    await writeAudit(this.db, ctx, {
      action: "create",
      entity: "pharmacy_adjustment",
      entityId: adjustmentId,
      metadata: { medicineId: input.medicineId, batchNumber: input.batchNumber },
    });
    return record;
  }

  async listAdjustments(
    ctx: ClinicContext,
    query: { status?: string; skip: number; limit: number }
  ) {
    const [items, total] = await this.adjustmentRepo(ctx).list(query);
    return { items, total };
  }

  async reviewAdjustment(
    ctx: ClinicContext,
    adjustmentId: string,
    decision: "approved" | "rejected",
    notes?: string | null
  ): Promise<void> {
    const repo = this.adjustmentRepo(ctx);
    const adj = await repo.findByAdjustmentId(adjustmentId);
    if (!adj) throw new NotFoundError("Adjustment not found");
    if (adj.status !== "pending") throw new BadRequestError("Adjustment already reviewed");
    await repo.update(adj.adjustmentId, {
      status: decision,
      approvedBy: this.performer(ctx),
      notes: notes ?? adj.notes,
    });
    if (decision === "approved") {
      const inv = await this.inventoryRepo(ctx).findByBatch(adj.medicineId, adj.batchNumber);
      if (inv) {
        const before = inv.quantityAvailable;
        const after = adj.newQuantity;
        const transactionId = `txn_${randomToken(10)}`;
        await this.inventoryRepo(ctx).updateByBatch(adj.medicineId, adj.batchNumber, {
          quantityAvailable: after,
        });
        await this.refreshInventoryStatus(ctx, inv.inventoryId);
        await this.recordMovement(ctx, {
          medicineId: adj.medicineId,
          batchNumber: adj.batchNumber,
          before,
          changed: after - before,
          after,
          type: "adjustment",
          transactionId,
          reason: adj.reason,
          notes: notes ?? null,
        });
      }
    }
    await writeAudit(this.db, ctx, {
      action: "review",
      entity: "pharmacy_adjustment",
      entityId: adjustmentId,
      metadata: { decision },
    });
  }

  // ── Transfers (between locations) ─────────────────────────────────────────

  async createTransfer(ctx: ClinicContext, input: CreateTransferInput): Promise<WithId<PharmacyTransferDoc>> {
    for (const item of input.items) {
      const inv = await this.inventoryRepo(ctx).findByBatch(item.medicineId, item.batchNumber);
      if (!inv) throw new NotFoundError(`Batch ${item.batchNumber} not found for medicine ${item.medicineId}`);
      if (inv.quantityAvailable < item.quantity) {
        throw new BadRequestError(`Insufficient stock for batch ${item.batchNumber}`);
      }
    }
    const transferId = generatePharmacyTransferId();
    const record = await this.transferRepo(ctx).insert({
      transferId,
      fromLocation: input.fromLocation,
      toLocation: input.toLocation,
      items: input.items.map((i) => ({
        medicineId: i.medicineId,
        batchNumber: i.batchNumber,
        quantity: i.quantity,
      })),
      status: "pending",
      requestedBy: this.performer(ctx),
      approvedBy: null,
      notes: input.notes ?? null,
    });
    await writeAudit(this.db, ctx, {
      action: "create",
      entity: "pharmacy_transfer",
      entityId: transferId,
      metadata: { from: input.fromLocation, to: input.toLocation },
    });
    return record;
  }

  async listTransfers(ctx: ClinicContext, query: { status?: string; skip: number; limit: number }) {
    const [items, total] = await this.transferRepo(ctx).list(query);
    return { items, total };
  }

  async reviewTransfer(
    ctx: ClinicContext,
    transferId: string,
    decision: "approved" | "rejected" | "completed",
    notes?: string | null
  ): Promise<void> {
    const repo = this.transferRepo(ctx);
    const trf = await repo.findByTransferId(transferId);
    if (!trf) throw new NotFoundError("Transfer not found");
    if (decision === "rejected") {
      await repo.update(transferId, { status: "rejected", approvedBy: this.performer(ctx), notes: notes ?? trf.notes });
      return;
    }
    if (decision === "approved") {
      if (trf.status !== "pending") throw new BadRequestError("Transfer already reviewed");
      await repo.update(transferId, { status: "approved", approvedBy: this.performer(ctx) });
      return;
    }
    // completed → move stock
    if (trf.status !== "approved") throw new BadRequestError("Transfer must be approved first");
    const transactionId = `txn_${randomToken(10)}`;
    for (const item of trf.items) {
      const inv = await this.inventoryRepo(ctx).findByBatch(item.medicineId, item.batchNumber);
      if (!inv) throw new NotFoundError(`Batch ${item.batchNumber} not found`);
      if (inv.quantityAvailable < item.quantity) {
        throw new BadRequestError(`Insufficient stock for batch ${item.batchNumber}`);
      }
      const before = inv.quantityAvailable;
      const after = before - item.quantity;
      await this.inventoryRepo(ctx).updateByBatch(item.medicineId, item.batchNumber, {
        quantityAvailable: after,
        storageLocation: trf.toLocation,
      });
      await this.refreshInventoryStatus(ctx, inv.inventoryId);
      await this.recordMovement(ctx, {
        medicineId: item.medicineId,
        batchNumber: item.batchNumber,
        before,
        changed: -item.quantity,
        after,
        type: "transfer",
        transactionId,
        party: `${trf.fromLocation} → ${trf.toLocation}`,
        reason: "Stock transfer",
        notes: notes ?? null,
      });
    }
    await repo.update(transferId, { status: "completed", approvedBy: this.performer(ctx) });
    await writeAudit(this.db, ctx, {
      action: "complete",
      entity: "pharmacy_transfer",
      entityId: transferId,
      metadata: { transactionId },
    });
  }

  // ── Returns ───────────────────────────────────────────────────────────────

  async createReturn(ctx: ClinicContext, input: CreateReturnInput): Promise<WithId<PharmacyReturnDoc>> {
    const transactionId = `txn_${randomToken(10)}`;
    for (const item of input.items) {
      const med = await this.medicineRepo(ctx).findByMedicineId(item.medicineId);
      if (!med) throw new BadRequestError(`Medicine ${item.medicineId} does not exist`);
      const inv = await this.inventoryRepo(ctx).findByBatch(item.medicineId, item.batchNumber);
      if (input.type === "customer_return") {
        if (!inv) {
          const { status, reorderStatus } = computeStatus(
            item.quantity,
            med.reorderLevel,
            med.expiryDate
          );
          await this.inventoryRepo(ctx).insert({
            inventoryId: generatePharmacyInventoryId(),
            medicineId: med.medicineId,
            name: med.name,
            genericName: med.genericName,
            category: med.category,
            batchNumber: item.batchNumber,
            barcode: med.barcode,
            quantityAvailable: item.quantity,
            quantityReserved: 0,
            quantityDamaged: 0,
            purchasePrice: med.purchasePrice,
            sellingPrice: med.sellingPrice,
            taxPercent: med.taxPercent,
            expiryDate: med.expiryDate,
            manufacturingDate: med.manufacturingDate,
            supplierId: med.supplierId,
            storageLocation: null,
            reorderLevel: med.reorderLevel,
            status,
            reorderStatus,
          });
        } else {
          const before = inv.quantityAvailable;
          const after = before + item.quantity;
          await this.inventoryRepo(ctx).updateByBatch(item.medicineId, item.batchNumber, {
            quantityAvailable: after,
          });
          await this.refreshInventoryStatus(ctx, inv.inventoryId);
        }
        await this.recordMovement(ctx, {
          medicineId: item.medicineId,
          batchNumber: item.batchNumber,
          before: inv ? inv.quantityAvailable : 0,
          changed: item.quantity,
          after: inv ? inv.quantityAvailable + item.quantity : item.quantity,
          type: "return",
          transactionId,
          referenceInvoice: input.referenceId,
          reason: item.reason ?? "Customer return",
          notes: input.notes ?? null,
        });
      } else {
        // supplier_return: reduce stock and record
        if (!inv) throw new BadRequestError(`Batch ${item.batchNumber} not found`);
        if (inv.quantityAvailable < item.quantity) {
          throw new BadRequestError(`Insufficient stock for batch ${item.batchNumber}`);
        }
        const before = inv.quantityAvailable;
        const after = before - item.quantity;
        await this.inventoryRepo(ctx).updateByBatch(item.medicineId, item.batchNumber, {
          quantityAvailable: after,
        });
        await this.refreshInventoryStatus(ctx, inv.inventoryId);
        await this.recordMovement(ctx, {
          medicineId: item.medicineId,
          batchNumber: item.batchNumber,
          before,
          changed: -item.quantity,
          after,
          type: "return",
          transactionId,
          referenceInvoice: input.referenceId,
          reason: item.reason ?? "Supplier return",
          notes: input.notes ?? null,
        });
      }
    }
    const returnDoc = await this.returnRepo(ctx).insert({
      returnId: generatePharmacyReturnId(),
      type: input.type,
      referenceId: input.referenceId ?? null,
      items: input.items.map((i) => ({
        medicineId: i.medicineId,
        batchNumber: i.batchNumber,
        quantity: i.quantity,
        reason: i.reason ?? null,
      })),
      processedBy: this.performer(ctx),
      notes: input.notes ?? null,
    });
    await writeAudit(this.db, ctx, {
      action: "create",
      entity: "pharmacy_return",
      entityId: returnDoc.returnId,
      metadata: { type: input.type, items: input.items.length },
    });
    return returnDoc;
  }

  async listReturns(ctx: ClinicContext, query: { type?: string; skip: number; limit: number }) {
    const [items, total] = await this.returnRepo(ctx).list(query);
    return { items, total };
  }

  // ── Dashboard & Alerts ────────────────────────────────────────────────────

  async getDashboard(ctx: ClinicContext) {
    const clinicId = requireClinicOf(ctx);
    const today = todayISO();
    const [medCount, invStatus, lowReorder, movementsToday, salesToday, purchasesToday] =
      await Promise.all([
        this.medicineRepo(ctx).count(),
        this.inventoryRepo(ctx).countByStatus(),
        this.inventoryRepo(ctx).countLowReorder(),
        this.movementRepo(ctx).aggregateByType(today, today),
        this.saleRepo(ctx).list({ status: "completed", from: today, to: today, skip: 0, limit: 1 }),
        this.purchaseRepo(ctx).list({ status: "received", from: today, to: today, skip: 0, limit: 1 }),
      ]);

    const inventory = this.db.collection<PharmacyInventoryDoc>("clc_pharmacy_inventory");
    const valuationAgg = await inventory
      .aggregate<{ total: number }>([
        { $match: { clinicId, quantityAvailable: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: { $multiply: ["$quantityAvailable", "$purchasePrice"] } } } },
      ])
      .toArray();
    const stockValue = valuationAgg[0]?.total ?? 0;

    const sales = this.db.collection<PharmacySaleDoc>("clc_pharmacy_sales");
    const salesAgg = await sales
      .aggregate<{ count: number; total: number }>([
        { $match: { clinicId, status: "completed", saleDate: today } },
        { $group: { _id: null, count: { $sum: 1 }, total: { $sum: "$total" } } },
      ])
      .toArray();
    const todaySales = { count: salesAgg[0]?.count ?? 0, value: salesAgg[0]?.total ?? 0 };

    const purchases = this.db.collection<PharmacyPurchaseDoc>("clc_pharmacy_purchases");
    const purchaseAgg = await purchases
      .aggregate<{ total: number }>([
        { $match: { clinicId, status: "received", purchaseDate: today } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ])
      .toArray();
    const purchaseValue = purchaseAgg[0]?.total ?? 0;

    return {
      totalMedicines: medCount,
      totalStockValue: stockValue,
      lowStock: invStatus["low_stock"] ?? 0,
      outOfStock: invStatus["out_of_stock"] ?? 0,
      nearExpiry: invStatus["near_expiry"] ?? 0,
      expired: invStatus["expired"] ?? 0,
      todaySales,
      purchaseValue,
      stockMovementsToday: Object.values(movementsToday).reduce((a, b) => a + b, 0),
      reorderCount: lowReorder,
    };
  }

  async getAlerts(ctx: ClinicContext) {
    const inv = this.inventoryRepo(ctx);
    const [low, out, near, expired, reorder] = await Promise.all([
      inv.list({ status: "low_stock", sortBy: "lastUpdated", sortDir: "desc", skip: 0, limit: 50 }),
      inv.list({ status: "out_of_stock", sortBy: "lastUpdated", sortDir: "desc", skip: 0, limit: 50 }),
      inv.list({ status: "near_expiry", sortBy: "expiryDate", sortDir: "asc", skip: 0, limit: 50 }),
      inv.list({ status: "expired", sortBy: "expiryDate", sortDir: "asc", skip: 0, limit: 50 }),
      inv.list({ reorderStatus: "reorder", sortBy: "quantityAvailable", sortDir: "asc", skip: 0, limit: 200 }),
    ]);
    const lowItems = low[0];
    const outItems = out[0];
    const nearItems = near[0];
    const expiredItems = expired[0];
    const reorderItems = reorder[0];
    const reorderSuggestions = reorderItems.map((i) => {
      const max = i.maxStockLevel ?? null;
      const suggested = max
        ? Math.max(0, max - i.quantityAvailable)
        : Math.max(i.reorderLevel * 2 - i.quantityAvailable, i.reorderLevel);
      return { inventoryId: i.inventoryId, medicineId: i.medicineId, name: i.name, batchNumber: i.batchNumber, available: i.quantityAvailable, reorderLevel: i.reorderLevel, suggested };
    });
    return {
      lowStock: lowItems,
      outOfStock: outItems,
      nearExpiry: nearItems,
      expired: expiredItems,
      reorderSuggestions,
    };
  }

  // ── Reports ───────────────────────────────────────────────────────────────

  async buildReport(
    ctx: ClinicContext,
    type: ReportType,
    opts: { from?: string; to?: string; category?: string; supplierId?: string; format: "csv" | "pdf" }
  ): Promise<ReportResult> {
    const clinicId = requireClinicOf(ctx);
    const from = opts.from;
    const to = opts.to;
    const title = this.reportTitle(type);

    if (type === "current_stock" || type === "batch_wise" || type === "low_stock" || type === "expiry" || type === "expired" || type === "valuation" || type === "reconciliation") {
      const inv = this.db.collection<PharmacyInventoryDoc>("clc_pharmacy_inventory");
      const filter: Record<string, unknown> = { clinicId };
      if (opts.category) filter.category = opts.category;
      if (opts.supplierId) filter.supplierId = opts.supplierId;
      if (type === "expiry") {
        filter.expiryDate = { $ne: null };
        if (from || to) filter.expiryDate = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
      }
      if (type === "low_stock") filter.reorderStatus = "reorder";
      if (type === "expired") filter.status = "expired";
      let rows = await inv.find(filter).sort({ name: 1, batchNumber: 1 }).toArray();
      if (type === "expiry") {
        rows = rows.filter((r) => r.expiryDate && r.expiryDate < (to ?? "9999-12-31"));
      }
      if (type === "valuation" || type === "reconciliation") {
        rows = rows.filter((r) => r.quantityAvailable > 0);
      }
      const columns = [
        "Medicine",
        "Generic",
        "Category",
        "Batch",
        "Available",
        "Reserved",
        "Damaged",
        "Purchase Price",
        "Selling Price",
        "Expiry",
        "Status",
        "Reorder",
        "Supplier",
      ];
      const supplierMap = await this.supplierNameMap(ctx);
      const data = rows.map((r) => [
        r.name,
        r.genericName ?? "",
        r.category ?? "",
        r.batchNumber,
        String(r.quantityAvailable),
        String(r.quantityReserved),
        String(r.quantityDamaged),
        String(r.purchasePrice),
        String(r.sellingPrice),
        r.expiryDate ?? "",
        r.status,
        r.reorderStatus,
        r.supplierId ? (supplierMap.get(r.supplierId) ?? "") : "",
      ]);
      if (type === "valuation" || type === "reconciliation") {
        const value = rows.reduce((s, r) => s + r.quantityAvailable * r.purchasePrice, 0);
        data.push([]);
        data.push(["TOTAL VALUATION", "", "", "", "", "", "", "", "", "", "", "", String(value)]);
      }
      return this.packageReport(title, columns, data, opts.format);
    }

    if (type === "stock_movement") {
      const mv = this.db.collection<PharmacyStockMovementDoc>("clc_pharmacy_stock_movements");
      const filter: Record<string, unknown> = { clinicId };
      if (from || to) {
        filter.createdAt = {
          ...(from ? { $gte: new Date(`${from}T00:00:00+05:30`) } : {}),
          ...(to ? { $lte: new Date(`${to}T23:59:59.999+05:30`) } : {}),
        };
      }
      const rows = await mv.find(filter).sort({ createdAt: -1 }).toArray();
      const medMap = await this.medicineNameMap(ctx);
      const columns = ["Transaction", "Date", "Medicine", "Batch", "Before", "Changed", "After", "Type", "Reference", "Party", "Performed By", "Reason"];
      const data = rows.map((m) => [
        m.transactionId,
        m.createdAt.toISOString().slice(0, 19).replace("T", " "),
        medMap.get(m.medicineId) ?? m.medicineId,
        m.batchNumber,
        String(m.quantityBefore),
        String(m.quantityChanged),
        String(m.quantityAfter),
        m.movementType,
        m.referenceInvoice ?? "",
        m.party ?? "",
        m.performedBy ?? "",
        m.reason ?? "",
      ]);
      return this.packageReport(title, columns, data, opts.format);
    }

    if (type === "purchase" || type === "sales") {
      const coll = type === "purchase" ? "clc_pharmacy_purchases" : "clc_pharmacy_sales";
      const dateField = type === "purchase" ? "purchaseDate" : "saleDate";
      const filter: Record<string, unknown> = { clinicId };
      if (from || to) filter[dateField] = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
      if (type === "purchase" && opts.supplierId) filter.supplierId = opts.supplierId;
      const rows = await this.db
        .collection(coll)
        .find(filter)
        .sort({ [dateField]: -1 })
        .toArray();
      const columns = type === "purchase"
        ? ["Invoice", "Date", "Supplier", "Items", "Subtotal", "Tax", "Total", "Status"]
        : ["Invoice", "Date", "Patient", "Items", "Subtotal", "Discount", "Tax", "Total", "Payment", "Status"];
      const data = rows.map((r: any) => (type === "purchase"
        ? [r.invoiceNumber, r.purchaseDate, r.supplierId ?? "", r.items.length, r.subtotal, r.taxAmount, r.total, r.status]
        : [r.invoiceNumber, r.saleDate, r.patientId ?? "", r.items.length, r.subtotal, r.discount, r.taxAmount, r.total, r.paymentMethod, r.status]));
      return this.packageReport(title, columns, data, opts.format);
    }

    if (type === "supplier") {
      const sup = this.db.collection<PharmacySupplierDoc>("clc_pharmacy_suppliers");
      const rows = await sup.find({ clinicId, status: { $ne: "deleted" } } as never).sort({ name: 1 }).toArray();
      const columns = ["Name", "Contact", "Phone", "Email", "GST", "Drug License", "Status"];
      const data = rows.map((s) => [s.name, s.contactPerson ?? "", s.phone ?? "", s.email ?? "", s.gstNumber ?? "", s.drugLicenseNumber ?? "", s.status]);
      return this.packageReport(title, columns, data, opts.format);
    }

    if (type === "wastage") {
      const mv = this.db.collection<PharmacyStockMovementDoc>("clc_pharmacy_stock_movements");
      const filter: Record<string, unknown> = { clinicId, movementType: { $in: ["damaged", "wastage", "expired"] } };
      if (from || to) {
        filter.createdAt = {
          ...(from ? { $gte: new Date(`${from}T00:00:00+05:30`) } : {}),
          ...(to ? { $lte: new Date(`${to}T23:59:59.999+05:30`) } : {}),
        };
      }
      const rows = await mv.find(filter).sort({ createdAt: -1 }).toArray();
      const medMap = await this.medicineNameMap(ctx);
      const columns = ["Date", "Medicine", "Batch", "Quantity", "Type", "Reason", "Performed By"];
      const data = rows.map((m) => [
        m.createdAt.toISOString().slice(0, 19).replace("T", " "),
        medMap.get(m.medicineId) ?? m.medicineId,
        m.batchNumber,
        String(Math.abs(m.quantityChanged)),
        m.movementType,
        m.reason ?? "",
        m.performedBy ?? "",
      ]);
      return this.packageReport(title, columns, data, opts.format);
    }

    throw new BadRequestError("Unknown report type");
  }

  private reportTitle(type: ReportType): string {
    const map: Record<ReportType, string> = {
      current_stock: "Current Stock Report",
      stock_movement: "Stock Movement Report",
      batch_wise: "Batch-wise Stock Report",
      expiry: "Expiry Report",
      expired: "Expired Stock Report",
      low_stock: "Low Stock Report",
      purchase: "Purchase Report",
      sales: "Sales Report",
      supplier: "Supplier Report",
      valuation: "Inventory Valuation Report",
      wastage: "Wastage Report",
      reconciliation: "Stock Reconciliation Report",
    };
    return map[type];
  }

  private async supplierNameMap(ctx: ClinicContext): Promise<Map<string, string>> {
    const [suppliers] = await this.supplierRepo(ctx).list({ skip: 0, limit: 10_000 });
    return new Map(suppliers.map((s) => [s.supplierId, s.name]));
  }

  private async medicineNameMap(ctx: ClinicContext): Promise<Map<string, string>> {
    const [meds] = await this.medicineRepo(ctx).list({ skip: 0, limit: 10_000 });
    return new Map(meds.map((m) => [m.medicineId, m.name]));
  }

  private async packageReport(
    title: string,
    columns: string[],
    data: string[][],
    format: "csv" | "pdf"
  ): Promise<ReportResult> {
    if (format === "csv") {
      const escape = (v: string) => {
        if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
        return v;
      };
      const lines = [columns.map(escape).join(","), ...data.map((row) => row.map(escape).join(","))];
      return {
        filename: `${title.replace(/\s+/g, "_").toLowerCase()}.csv`,
        contentType: "text/csv; charset=utf-8",
        data: lines.join("\n"),
      };
    }
    const pdf = await this.buildPdf(title, columns, data);
    return { filename: `${title.replace(/\s+/g, "_").toLowerCase()}.pdf`, contentType: "application/pdf", data: pdf };
  }

  private buildPdf(title: string, columns: string[], data: string[][]): Promise<Buffer> {
    const doc = new PDFDocument({ margin: 30, size: "A4", layout: "landscape" });
    const chunks: Buffer[] = [];
    const done = new Promise<Buffer>((resolve) => {
      doc.on("data", (c: Buffer) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
    });
    doc.fontSize(14).text(title, { align: "center" });
    doc.moveDown();
    const usableWidth = doc.page.width - 60;
    const colWidth = usableWidth / columns.length;
    const rowH = 18;
    let y = doc.y;
    const drawHeader = () => {
      doc.fontSize(8).font("Helvetica-Bold");
      columns.forEach((c, i) => doc.text(c, 30 + i * colWidth, y, { width: colWidth, height: rowH, ellipsis: true }));
      doc.font("Helvetica");
      y += rowH;
      doc.moveTo(30, y).lineTo(30 + usableWidth, y).stroke();
    };
    drawHeader();
    data.forEach((row, idx) => {
      if (y > doc.page.height - 50) {
        doc.addPage();
        y = doc.y;
        drawHeader();
      }
      if (idx % 2 === 0) {
        doc.rect(30, y, usableWidth, rowH).fill("#f1f5f9");
      }
      doc.fontSize(7);
      row.forEach((cell, i) => {
        doc.text(String(cell ?? ""), 30 + i * colWidth, y + 2, { width: colWidth, height: rowH, ellipsis: true });
      });
      y += rowH;
    });
    doc.end();
    return done;
  }
}
