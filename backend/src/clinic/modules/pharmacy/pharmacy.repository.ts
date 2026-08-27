import { now as nowFn } from "@/clinic/core/datetime";
import type { Db, WithId } from "mongodb";
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
} from "@/clinic/modules/pharmacy/pharmacy.schema";

type Scope = {
  role: string;
  doctorId: string | null;
  patientId: string | null;
};

function softDeleteFilter(): Record<string, unknown> {
  return { status: { $ne: "deleted" } };
}

// ── Settings ────────────────────────────────────────────────────────────────

export class PharmacySettingsRepository {
  constructor(
    private readonly db: Db,
    private readonly clinicId: string,
    _scope: Scope
  ) {}

  private collection() {
    return this.db.collection<PharmacySettingsDoc>("clc_pharmacy_settings");
  }

  async find(): Promise<WithId<PharmacySettingsDoc> | null> {
    return this.collection().findOne({ clinicId: this.clinicId });
  }

  async upsert(patch: Record<string, unknown>): Promise<WithId<PharmacySettingsDoc>> {
    const now = nowFn();
    const existing = await this.find();
    if (!existing) {
      const doc = {
        clinicId: this.clinicId,
        ...patch,
        createdAt: now,
        updatedAt: now,
      } as PharmacySettingsDoc;
      const { insertedId } = await this.collection().insertOne(doc as never);
      return (await this.collection().findOne({ _id: insertedId })) as WithId<PharmacySettingsDoc>;
    }
    await this.collection().updateOne(
      { clinicId: this.clinicId },
      { $set: { ...patch, updatedAt: now } }
    );
    return (await this.find()) as WithId<PharmacySettingsDoc>;
  }
}

// ── Medicines ────────────────────────────────────────────────────────────────

export class PharmacyMedicineRepository {
  constructor(
    private readonly db: Db,
    private readonly clinicId: string,
    _scope: Scope
  ) {}

  private collection() {
    return this.db.collection<PharmacyMedicineDoc>("clc_pharmacy_medicines");
  }

  private scoped(base: Record<string, unknown> = {}): Record<string, unknown> {
    return { clinicId: this.clinicId, ...softDeleteFilter(), ...base };
  }

  async findByMedicineId(medicineId: string): Promise<WithId<PharmacyMedicineDoc> | null> {
    return this.collection().findOne(this.scoped({ medicineId }));
  }

  async findByBarcode(barcode: string): Promise<WithId<PharmacyMedicineDoc> | null> {
    if (!barcode) return null;
    return this.collection().findOne(this.scoped({ barcode }));
  }

  async findPotentialDuplicate(
    name: string,
    manufacturer: string | null,
    strength: string | null,
    excludeMedicineId?: string
  ): Promise<WithId<PharmacyMedicineDoc> | null> {
    const filter: Record<string, unknown> = {
      name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    };
    if (manufacturer) filter.manufacturer = manufacturer;
    if (strength) filter.strength = strength;
    if (excludeMedicineId) filter.medicineId = { $ne: excludeMedicineId };
    return this.collection().findOne(this.scoped(filter));
  }

  async list(query: {
    search?: string;
    category?: string;
    status?: string;
    supplierId?: string;
    skip: number;
    limit: number;
  }): Promise<[WithId<PharmacyMedicineDoc>[], number]> {
    const filter: Record<string, unknown> = {};
    if (query.category) filter.category = query.category;
    if (query.status) filter.status = query.status;
    if (query.supplierId) filter.supplierId = query.supplierId;
    if (query.search) {
      const re = { $regex: query.search, $options: "i" };
      filter.$or = [
        { name: re },
        { genericName: re },
        { brand: re },
        { barcode: re },
        { category: re },
      ];
    }
    const scoped = this.scoped(filter);
    const [items, total] = await Promise.all([
      this.collection()
        .find(scoped)
        .sort({ name: 1 })
        .skip(query.skip)
        .limit(query.limit)
        .toArray(),
      this.collection().countDocuments(scoped),
    ]);
    return [items, total];
  }

  async insert(
    doc: Omit<PharmacyMedicineDoc, "_id" | "clinicId" | "createdAt" | "updatedAt">
  ): Promise<WithId<PharmacyMedicineDoc>> {
    const now = nowFn();
    await this.collection().insertOne({
      ...doc,
      clinicId: this.clinicId,
      createdAt: now,
      updatedAt: now,
    } as never);
    return (await this.findByMedicineId(doc.medicineId)) as WithId<PharmacyMedicineDoc>;
  }

  async update(
    medicineId: string,
    patch: Record<string, unknown>
  ): Promise<boolean> {
    const r = await this.collection().updateOne(this.scoped({ medicineId }), {
      $set: { ...patch, updatedAt: nowFn() },
    });
    return r.matchedCount === 1;
  }

  async softDelete(medicineId: string): Promise<boolean> {
    const set: Record<string, unknown> = { status: "deleted", deletedAt: nowFn(), updatedAt: nowFn() };
    const r = await this.collection().updateOne(this.scoped({ medicineId }), { $set: set });
    return r.matchedCount === 1;
  }

  async setStatus(ids: string[], status: "active" | "inactive"): Promise<number> {
    const r = await this.collection().updateMany(this.scoped({ medicineId: { $in: ids } }), {
      $set: { status, updatedAt: nowFn() },
    });
    return r.modifiedCount;
  }

  async bulkSoftDelete(ids: string[]): Promise<number> {
    const set: Record<string, unknown> = { status: "deleted", deletedAt: nowFn(), updatedAt: nowFn() };
    const r = await this.collection().updateMany(this.scoped({ medicineId: { $in: ids } }), { $set: set });
    return r.modifiedCount;
  }

  async count(): Promise<number> {
    return this.collection().countDocuments(this.scoped());
  }
}

// ── Inventory ─────────────────────────────────────────────────────────────--

export class PharmacyInventoryRepository {
  constructor(
    private readonly db: Db,
    private readonly clinicId: string,
    _scope: Scope
  ) {}

  private collection() {
    return this.db.collection<PharmacyInventoryDoc>("clc_pharmacy_inventory");
  }

  private scoped(base: Record<string, unknown> = {}): Record<string, unknown> {
    return { clinicId: this.clinicId, ...base };
  }

  async findByInventoryId(inventoryId: string): Promise<WithId<PharmacyInventoryDoc> | null> {
    return this.collection().findOne(this.scoped({ inventoryId }));
  }

  async findByBatch(
    medicineId: string,
    batchNumber: string
  ): Promise<WithId<PharmacyInventoryDoc> | null> {
    return this.collection().findOne(this.scoped({ medicineId, batchNumber }));
  }

  /** All batches for a medicine, ordered for FEFO (expiry asc) or FIFO (created asc). */
  async findBatchesForMedicine(
    medicineId: string,
    order: "fefo" | "fifo" = "fefo"
  ): Promise<WithId<PharmacyInventoryDoc>[]> {
    const sort: Record<string, 1 | -1> =
      order === "fefo" ? { expiryDate: 1, createdAt: 1 } : { createdAt: 1 };
    return this.collection()
      .find(this.scoped({ medicineId, quantityAvailable: { $gt: 0 } }))
      .sort(sort)
      .toArray();
  }

  async list(query: {
    search?: string;
    category?: string;
    medicineId?: string;
    batchNumber?: string;
    supplierId?: string;
    status?: string;
    reorderStatus?: string;
    expiryFrom?: string;
    expiryTo?: string;
    sortBy: string;
    sortDir: "asc" | "desc";
    skip: number;
    limit: number;
  }): Promise<[WithId<PharmacyInventoryDoc>[], number]> {
    const filter: Record<string, unknown> = {};
    if (query.medicineId) filter.medicineId = query.medicineId;
    if (query.batchNumber) filter.batchNumber = { $regex: query.batchNumber, $options: "i" };
    if (query.supplierId) filter.supplierId = query.supplierId;
    if (query.status) filter.status = query.status;
    if (query.reorderStatus) filter.reorderStatus = query.reorderStatus;
    if (query.expiryFrom || query.expiryTo) {
      filter.expiryDate = {
        ...(query.expiryFrom ? { $gte: query.expiryFrom } : {}),
        ...(query.expiryTo ? { $lte: query.expiryTo } : {}),
      };
    }
    if (query.search || query.category) {
      const conds: Record<string, unknown>[] = [];
      if (query.search) {
        const re = { $regex: query.search, $options: "i" };
        conds.push(
          { medicineId: re },
          { batchNumber: re },
          { barcode: re },
          { storageLocation: re }
        );
      }
      if (query.category) conds.push({ category: query.category });
      filter.$or = conds;
    }
    const scoped = this.scoped(filter);
    const sortDir = query.sortDir === "asc" ? 1 : -1;
    const sortField =
      query.sortBy === "name"
        ? "name"
        : query.sortBy === "quantityAvailable"
        ? "quantityAvailable"
        : query.sortBy === "expiryDate"
        ? "expiryDate"
        : query.sortBy === "sellingPrice"
        ? "sellingPrice"
        : query.sortBy === "reorderLevel"
        ? "reorderLevel"
        : "lastUpdated";
    const [items, total] = await Promise.all([
      this.collection()
        .find(scoped)
        .sort({ [sortField]: sortDir })
        .skip(query.skip)
        .limit(query.limit)
        .toArray(),
      this.collection().countDocuments(scoped),
    ]);
    return [items, total];
  }

  async insert(
    doc: Omit<PharmacyInventoryDoc, "_id" | "clinicId" | "createdAt" | "updatedAt">
  ): Promise<WithId<PharmacyInventoryDoc>> {
    const now = nowFn();
    await this.collection().insertOne({
      ...doc,
      clinicId: this.clinicId,
      createdAt: now,
      updatedAt: now,
      lastUpdated: now,
    } as never);
    return (await this.findByBatch(doc.medicineId, doc.batchNumber)) as WithId<PharmacyInventoryDoc>;
  }

  async update(
    inventoryId: string,
    patch: Record<string, unknown>
  ): Promise<boolean> {
    const r = await this.collection().updateOne(this.scoped({ inventoryId }), {
      $set: { ...patch, updatedAt: nowFn(), lastUpdated: nowFn() },
    });
    return r.matchedCount === 1;
  }

  async updateByBatch(
    medicineId: string,
    batchNumber: string,
    patch: Record<string, unknown>
  ): Promise<boolean> {
    const r = await this.collection().updateOne(
      this.scoped({ medicineId, batchNumber }),
      { $set: { ...patch, updatedAt: nowFn(), lastUpdated: nowFn() } }
    );
    return r.matchedCount === 1;
  }

  async countByStatus(): Promise<Record<string, number>> {
    const rows = await this.collection()
      .aggregate<{ _id: string; count: number }>([
        { $match: this.scoped() },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ])
      .toArray();
    return rows.reduce<Record<string, number>>((acc, r) => {
      acc[r._id] = r.count;
      return acc;
    }, {});
  }

  async countLowReorder(): Promise<number> {
    return this.collection().countDocuments(this.scoped({ reorderStatus: "reorder" }));
  }
}

// ── Stock Movements ──────────────────────────────────────────────────────────

export class PharmacyStockMovementRepository {
  constructor(
    private readonly db: Db,
    private readonly clinicId: string,
    _scope: Scope
  ) {}

  private collection() {
    return this.db.collection<PharmacyStockMovementDoc>("clc_pharmacy_stock_movements");
  }

  private scoped(base: Record<string, unknown> = {}): Record<string, unknown> {
    return { clinicId: this.clinicId, ...base };
  }

  async insert(
    doc: Omit<PharmacyStockMovementDoc, "_id" | "clinicId" | "createdAt">
  ): Promise<WithId<PharmacyStockMovementDoc>> {
    const now = nowFn();
    await this.collection().insertOne({
      ...doc,
      clinicId: this.clinicId,
      createdAt: now,
    } as never);
    return (await this.collection().findOne({ clinicId: this.clinicId, movementId: doc.movementId })) as WithId<PharmacyStockMovementDoc>;
  }

  async list(query: {
    search?: string;
    medicineId?: string;
    batchNumber?: string;
    movementType?: string;
    referenceInvoice?: string;
    party?: string;
    performedBy?: string;
    from?: string;
    to?: string;
    skip: number;
    limit: number;
  }): Promise<[WithId<PharmacyStockMovementDoc>[], number]> {
    const filter: Record<string, unknown> = {};
    if (query.medicineId) filter.medicineId = query.medicineId;
    if (query.batchNumber) filter.batchNumber = query.batchNumber;
    if (query.movementType) filter.movementType = query.movementType;
    if (query.referenceInvoice) filter.referenceInvoice = query.referenceInvoice;
    if (query.performedBy) filter.performedBy = query.performedBy;
    if (query.party) filter.party = { $regex: query.party, $options: "i" };
    if (query.from || query.to) {
      filter.createdAt = {
        ...(query.from ? { $gte: new Date(`${query.from}T00:00:00+05:30`) } : {}),
        ...(query.to ? { $lte: new Date(`${query.to}T23:59:59.999+05:30`) } : {}),
      };
    }
    if (query.search) {
      const re = { $regex: query.search, $options: "i" };
      filter.$or = [{ medicineId: re }, { batchNumber: re }, { transactionId: re }, { reason: re }, { notes: re }, { party: re }];
    }
    const scoped = this.scoped(filter);
    const [items, total] = await Promise.all([
      this.collection()
        .find(scoped)
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .toArray(),
      this.collection().countDocuments(scoped),
    ]);
    return [items, total];
  }

  async aggregateByType(from?: string, to?: string): Promise<Record<string, number>> {
    const match: Record<string, unknown> = this.scoped();
    if (from || to) {
      match.createdAt = {
        ...(from ? { $gte: new Date(`${from}T00:00:00+05:30`) } : {}),
        ...(to ? { $lte: new Date(`${to}T23:59:59.999+05:30`) } : {}),
      };
    }
    const rows = await this.collection()
      .aggregate<{ _id: string; count: number }>([
        { $match: match },
        { $group: { _id: "$movementType", count: { $sum: 1 } } },
      ])
      .toArray();
    return rows.reduce<Record<string, number>>((acc, r) => {
      acc[r._id] = r.count;
      return acc;
    }, {});
  }
}

// ── Suppliers ────────────────────────────────────────────────────────────────

export class PharmacySupplierRepository {
  constructor(
    private readonly db: Db,
    private readonly clinicId: string,
    _scope: Scope
  ) {}

  private collection() {
    return this.db.collection<PharmacySupplierDoc>("clc_pharmacy_suppliers");
  }

  private scoped(base: Record<string, unknown> = {}): Record<string, unknown> {
    return { clinicId: this.clinicId, ...softDeleteFilter(), ...base };
  }

  async findBySupplierId(supplierId: string): Promise<WithId<PharmacySupplierDoc> | null> {
    return this.collection().findOne(this.scoped({ supplierId }));
  }

  async findByGst(gstNumber: string, excludeId?: string): Promise<WithId<PharmacySupplierDoc> | null> {
    if (!gstNumber) return null;
    const filter: Record<string, unknown> = { gstNumber };
    if (excludeId) filter.supplierId = { $ne: excludeId };
    return this.collection().findOne(this.scoped(filter));
  }

  async list(query: {
    search?: string;
    status?: string;
    skip: number;
    limit: number;
  }): Promise<[WithId<PharmacySupplierDoc>[], number]> {
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.search) {
      const re = { $regex: query.search, $options: "i" };
      filter.$or = [{ name: re }, { contactPerson: re }, { email: re }, { phone: re }, { gstNumber: re }];
    }
    const scoped = this.scoped(filter);
    const [items, total] = await Promise.all([
      this.collection().find(scoped).sort({ name: 1 }).skip(query.skip).limit(query.limit).toArray(),
      this.collection().countDocuments(scoped),
    ]);
    return [items, total];
  }

  async insert(
    doc: Omit<PharmacySupplierDoc, "_id" | "clinicId" | "createdAt" | "updatedAt">
  ): Promise<WithId<PharmacySupplierDoc>> {
    const now = nowFn();
    await this.collection().insertOne({
      ...doc,
      clinicId: this.clinicId,
      createdAt: now,
      updatedAt: now,
    } as never);
    return (await this.findBySupplierId(doc.supplierId)) as WithId<PharmacySupplierDoc>;
  }

  async update(supplierId: string, patch: Record<string, unknown>): Promise<boolean> {
    const r = await this.collection().updateOne(this.scoped({ supplierId }), {
      $set: { ...patch, updatedAt: nowFn() },
    });
    return r.matchedCount === 1;
  }

  async softDelete(supplierId: string): Promise<boolean> {
    const set: Record<string, unknown> = { status: "deleted", deletedAt: nowFn(), updatedAt: nowFn() };
    const r = await this.collection().updateOne(this.scoped({ supplierId }), { $set: set });
    return r.matchedCount === 1;
  }
}

// ── Purchases ────────────────────────────────────────────────────────────────

export class PharmacyPurchaseRepository {
  constructor(
    private readonly db: Db,
    private readonly clinicId: string,
    _scope: Scope
  ) {}

  private collection() {
    return this.db.collection<PharmacyPurchaseDoc>("clc_pharmacy_purchases");
  }

  private scoped(base: Record<string, unknown> = {}): Record<string, unknown> {
    return { clinicId: this.clinicId, ...base };
  }

  async findByPurchaseId(purchaseId: string): Promise<WithId<PharmacyPurchaseDoc> | null> {
    return this.collection().findOne(this.scoped({ purchaseId }));
  }

  async findByInvoice(invoiceNumber: string): Promise<WithId<PharmacyPurchaseDoc> | null> {
    return this.collection().findOne(this.scoped({ invoiceNumber }));
  }

  async list(query: {
    supplierId?: string;
    status?: string;
    from?: string;
    to?: string;
    skip: number;
    limit: number;
  }): Promise<[WithId<PharmacyPurchaseDoc>[], number]> {
    const filter: Record<string, unknown> = {};
    if (query.supplierId) filter.supplierId = query.supplierId;
    if (query.status) filter.status = query.status;
    if (query.from || query.to) {
      filter.purchaseDate = {
        ...(query.from ? { $gte: query.from } : {}),
        ...(query.to ? { $lte: query.to } : {}),
      };
    }
    const scoped = this.scoped(filter);
    const [items, total] = await Promise.all([
      this.collection().find(scoped).sort({ purchaseDate: -1, createdAt: -1 }).skip(query.skip).limit(query.limit).toArray(),
      this.collection().countDocuments(scoped),
    ]);
    return [items, total];
  }

  async insert(
    doc: Omit<PharmacyPurchaseDoc, "_id" | "clinicId" | "createdAt" | "updatedAt">
  ): Promise<WithId<PharmacyPurchaseDoc>> {
    const now = nowFn();
    await this.collection().insertOne({
      ...doc,
      clinicId: this.clinicId,
      createdAt: now,
      updatedAt: now,
    } as never);
    return (await this.findByPurchaseId(doc.purchaseId)) as WithId<PharmacyPurchaseDoc>;
  }

  async update(purchaseId: string, patch: Record<string, unknown>): Promise<boolean> {
    const r = await this.collection().updateOne(this.scoped({ purchaseId }), {
      $set: { ...patch, updatedAt: nowFn() },
    });
    return r.matchedCount === 1;
  }
}

// ── Sales ────────────────────────────────────────────────────────────────────

export class PharmacySaleRepository {
  constructor(
    private readonly db: Db,
    private readonly clinicId: string,
    _scope: Scope
  ) {}

  private collection() {
    return this.db.collection<PharmacySaleDoc>("clc_pharmacy_sales");
  }

  private scoped(base: Record<string, unknown> = {}): Record<string, unknown> {
    return { clinicId: this.clinicId, ...base };
  }

  async findBySaleId(saleId: string): Promise<WithId<PharmacySaleDoc> | null> {
    return this.collection().findOne(this.scoped({ saleId }));
  }

  async findByInvoice(invoiceNumber: string): Promise<WithId<PharmacySaleDoc> | null> {
    return this.collection().findOne(this.scoped({ invoiceNumber }));
  }

  async list(query: {
    patientId?: string;
    paymentMethod?: string;
    status?: string;
    from?: string;
    to?: string;
    skip: number;
    limit: number;
  }): Promise<[WithId<PharmacySaleDoc>[], number]> {
    const filter: Record<string, unknown> = {};
    if (query.patientId) filter.patientId = query.patientId;
    if (query.paymentMethod) filter.paymentMethod = query.paymentMethod;
    if (query.status) filter.status = query.status;
    if (query.from || query.to) {
      filter.saleDate = {
        ...(query.from ? { $gte: query.from } : {}),
        ...(query.to ? { $lte: query.to } : {}),
      };
    }
    const scoped = this.scoped(filter);
    const [items, total] = await Promise.all([
      this.collection().find(scoped).sort({ saleDate: -1, createdAt: -1 }).skip(query.skip).limit(query.limit).toArray(),
      this.collection().countDocuments(scoped),
    ]);
    return [items, total];
  }

  async insert(
    doc: Omit<PharmacySaleDoc, "_id" | "clinicId" | "createdAt" | "updatedAt">
  ): Promise<WithId<PharmacySaleDoc>> {
    const now = nowFn();
    await this.collection().insertOne({
      ...doc,
      clinicId: this.clinicId,
      createdAt: now,
      updatedAt: now,
    } as never);
    return (await this.findBySaleId(doc.saleId)) as WithId<PharmacySaleDoc>;
  }

  async update(saleId: string, patch: Record<string, unknown>): Promise<boolean> {
    const r = await this.collection().updateOne(this.scoped({ saleId }), {
      $set: { ...patch, updatedAt: nowFn() },
    });
    return r.matchedCount === 1;
  }
}

// ── Adjustments ──────────────────────────────────────────────────────────────

export class PharmacyAdjustmentRepository {
  constructor(
    private readonly db: Db,
    private readonly clinicId: string,
    _scope: Scope
  ) {}

  private collection() {
    return this.db.collection<PharmacyAdjustmentDoc>("clc_pharmacy_adjustments");
  }

  private scoped(base: Record<string, unknown> = {}): Record<string, unknown> {
    return { clinicId: this.clinicId, ...base };
  }

  async findByAdjustmentId(adjustmentId: string): Promise<WithId<PharmacyAdjustmentDoc> | null> {
    return this.collection().findOne(this.scoped({ adjustmentId }));
  }

  async list(query: {
    status?: string;
    skip: number;
    limit: number;
  }): Promise<[WithId<PharmacyAdjustmentDoc>[], number]> {
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    const scoped = this.scoped(filter);
    const [items, total] = await Promise.all([
      this.collection().find(scoped).sort({ createdAt: -1 }).skip(query.skip).limit(query.limit).toArray(),
      this.collection().countDocuments(scoped),
    ]);
    return [items, total];
  }

  async insert(
    doc: Omit<PharmacyAdjustmentDoc, "_id" | "clinicId" | "createdAt" | "updatedAt">
  ): Promise<WithId<PharmacyAdjustmentDoc>> {
    const now = nowFn();
    await this.collection().insertOne({
      ...doc,
      clinicId: this.clinicId,
      createdAt: now,
      updatedAt: now,
    } as never);
    return (await this.findByAdjustmentId(doc.adjustmentId)) as WithId<PharmacyAdjustmentDoc>;
  }

  async update(adjustmentId: string, patch: Record<string, unknown>): Promise<boolean> {
    const r = await this.collection().updateOne(this.scoped({ adjustmentId }), {
      $set: { ...patch, updatedAt: nowFn() },
    });
    return r.matchedCount === 1;
  }
}

// ── Transfers ────────────────────────────────────────────────────────────────

export class PharmacyTransferRepository {
  constructor(
    private readonly db: Db,
    private readonly clinicId: string,
    _scope: Scope
  ) {}

  private collection() {
    return this.db.collection<PharmacyTransferDoc>("clc_pharmacy_transfers");
  }

  private scoped(base: Record<string, unknown> = {}): Record<string, unknown> {
    return { clinicId: this.clinicId, ...base };
  }

  async findByTransferId(transferId: string): Promise<WithId<PharmacyTransferDoc> | null> {
    return this.collection().findOne(this.scoped({ transferId }));
  }

  async list(query: { status?: string; skip: number; limit: number }): Promise<
    [WithId<PharmacyTransferDoc>[], number]
  > {
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    const scoped = this.scoped(filter);
    const [items, total] = await Promise.all([
      this.collection().find(scoped).sort({ createdAt: -1 }).skip(query.skip).limit(query.limit).toArray(),
      this.collection().countDocuments(scoped),
    ]);
    return [items, total];
  }

  async insert(
    doc: Omit<PharmacyTransferDoc, "_id" | "clinicId" | "createdAt" | "updatedAt">
  ): Promise<WithId<PharmacyTransferDoc>> {
    const now = nowFn();
    await this.collection().insertOne({
      ...doc,
      clinicId: this.clinicId,
      createdAt: now,
      updatedAt: now,
    } as never);
    return (await this.findByTransferId(doc.transferId)) as WithId<PharmacyTransferDoc>;
  }

  async update(transferId: string, patch: Record<string, unknown>): Promise<boolean> {
    const r = await this.collection().updateOne(this.scoped({ transferId }), {
      $set: { ...patch, updatedAt: nowFn() },
    });
    return r.matchedCount === 1;
  }
}

// ── Returns ──────────────────────────────────────────────────────────────────

export class PharmacyReturnRepository {
  constructor(
    private readonly db: Db,
    private readonly clinicId: string,
    _scope: Scope
  ) {}

  private collection() {
    return this.db.collection<PharmacyReturnDoc>("clc_pharmacy_returns");
  }

  private scoped(base: Record<string, unknown> = {}): Record<string, unknown> {
    return { clinicId: this.clinicId, ...base };
  }

  async findByReturnId(returnId: string): Promise<WithId<PharmacyReturnDoc> | null> {
    return this.collection().findOne(this.scoped({ returnId }));
  }

  async list(query: { type?: string; skip: number; limit: number }): Promise<
    [WithId<PharmacyReturnDoc>[], number]
  > {
    const filter: Record<string, unknown> = {};
    if (query.type) filter.type = query.type;
    const scoped = this.scoped(filter);
    const [items, total] = await Promise.all([
      this.collection().find(scoped).sort({ createdAt: -1 }).skip(query.skip).limit(query.limit).toArray(),
      this.collection().countDocuments(scoped),
    ]);
    return [items, total];
  }

  async insert(
    doc: Omit<PharmacyReturnDoc, "_id" | "clinicId" | "createdAt" | "updatedAt">
  ): Promise<WithId<PharmacyReturnDoc>> {
    const now = nowFn();
    await this.collection().insertOne({
      ...doc,
      clinicId: this.clinicId,
      createdAt: now,
      updatedAt: now,
    } as never);
    return (await this.findByReturnId(doc.returnId)) as WithId<PharmacyReturnDoc>;
  }
}
