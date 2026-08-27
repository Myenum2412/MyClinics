import type { ClinicDocument } from "@/clinic/core/repository";

export type PharmacyStatus = "active" | "inactive";
export type MedicineStatus = "active" | "inactive";
export type StockStatus = "in_stock" | "low_stock" | "out_of_stock" | "near_expiry" | "expired";
export type ReorderStatus = "ok" | "reorder";
export type MovementType =
  | "purchase"
  | "sale"
  | "return"
  | "adjustment"
  | "transfer"
  | "damaged"
  | "expired"
  | "wastage"
  | "correction";
export type AdjustmentStatus = "pending" | "approved" | "rejected";
export type TransferStatus = "pending" | "approved" | "rejected" | "completed";
export type ReturnType = "supplier_return" | "customer_return";
export type PaymentMethod = "cash" | "upi" | "card" | "bank_transfer" | "credit" | "other";

export interface PharmacySettingsDoc extends ClinicDocument {
  clinicId: string;
  pharmacyId: string;
  pharmacyName: string;
  registrationNumber: string | null;
  licenseNumber: string | null;
  gstNumber: string | null;
  taxId: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  pharmacistName: string | null;
  pharmacistRegistration: string | null;
  operatingHours: { day: string; open: string; close: string; closed: boolean }[];
  dispensingSettings: {
    allowSubstitution: boolean;
    requirePrescription: boolean;
    defaultTaxPercent: number;
    rounding: "none" | "nearest_rupee";
  };
  invoiceConfig: {
    prefix: string;
    nextNumber: number;
    footerNote: string | null;
  };
  paymentMethods: PaymentMethod[];
  supplierInfo: string | null;
  pharmacyStatus: PharmacyStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface PharmacyMedicineDoc extends ClinicDocument {
  clinicId: string;
  medicineId: string;
  name: string;
  genericName: string | null;
  brand: string | null;
  category: string | null;
  dosageForm: string | null;
  strength: string | null;
  unit: string | null;
  manufacturer: string | null;
  hsnCode: string | null;
  barcode: string | null;
  batchNumber: string | null;
  prescriptionRequired: boolean;
  reorderLevel: number;
  minStockLevel: number;
  maxStockLevel: number | null;
  purchasePrice: number;
  sellingPrice: number;
  taxPercent: number;
  discount: number;
  supplierId: string | null;
  manufacturingDate: string | null;
  expiryDate: string | null;
  storageConditions: string | null;
  status: MedicineStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface PharmacyInventoryDoc extends ClinicDocument {
  clinicId: string;
  inventoryId: string;
  medicineId: string;
  /** Denormalized from the medicine master for high-performance listing. */
  name: string;
  genericName: string | null;
  category: string | null;
  batchNumber: string;
  barcode: string | null;
  quantityAvailable: number;
  quantityReserved: number;
  quantityDamaged: number;
  purchasePrice: number;
  sellingPrice: number;
  taxPercent: number;
  expiryDate: string | null;
  manufacturingDate: string | null;
  supplierId: string | null;
  storageLocation: string | null;
  reorderLevel: number;
  status: StockStatus;
  reorderStatus: ReorderStatus;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface PharmacyStockMovementDoc extends ClinicDocument {
  clinicId: string;
  movementId: string;
  transactionId: string;
  medicineId: string;
  batchNumber: string;
  quantityBefore: number;
  quantityChanged: number;
  quantityAfter: number;
  movementType: MovementType;
  referenceInvoice: string | null;
  party: string | null;
  performedBy: string | null;
  reason: string | null;
  notes: string | null;
  createdAt: Date;
}

export interface PharmacySupplierDoc extends ClinicDocument {
  clinicId: string;
  supplierId: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  gstNumber: string | null;
  drugLicenseNumber: string | null;
  paymentTerms: string | null;
  notes: string | null;
  status: PharmacyStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface PharmacyPurchaseItem {
  medicineId: string;
  batchNumber: string;
  quantity: number;
  unitPrice: number;
  expiryDate: string | null;
  manufacturingDate: string | null;
  supplierId: string | null;
  storageLocation: string | null;
}

export interface PharmacyPurchaseDoc extends ClinicDocument {
  clinicId: string;
  purchaseId: string;
  invoiceNumber: string;
  supplierId: string | null;
  purchaseDate: string;
  items: PharmacyPurchaseItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  status: "draft" | "received" | "cancelled";
  receivedBy: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface PharmacySaleItem {
  medicineId: string;
  batchNumber: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxPercent: number;
}

export interface PharmacySaleDoc extends ClinicDocument {
  clinicId: string;
  saleId: string;
  invoiceNumber: string;
  saleDate: string;
  patientId: string | null;
  items: PharmacySaleItem[];
  subtotal: number;
  discount: number;
  taxAmount: number;
  total: number;
  paymentMethod: PaymentMethod;
  status: "completed" | "cancelled" | "refunded";
  soldBy: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface PharmacyAdjustmentDoc extends ClinicDocument {
  clinicId: string;
  adjustmentId: string;
  medicineId: string;
  batchNumber: string;
  currentQuantity: number;
  newQuantity: number;
  reason: string;
  status: AdjustmentStatus;
  requestedBy: string | null;
  approvedBy: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PharmacyTransferItem {
  medicineId: string;
  batchNumber: string;
  quantity: number;
}

export interface PharmacyTransferDoc extends ClinicDocument {
  clinicId: string;
  transferId: string;
  fromLocation: string;
  toLocation: string;
  items: PharmacyTransferItem[];
  status: TransferStatus;
  requestedBy: string | null;
  approvedBy: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PharmacyReturnItem {
  medicineId: string;
  batchNumber: string;
  quantity: number;
  reason: string | null;
}

export interface PharmacyReturnDoc extends ClinicDocument {
  clinicId: string;
  returnId: string;
  type: ReturnType;
  referenceId: string | null;
  items: PharmacyReturnItem[];
  processedBy: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Public serializers ──────────────────────────────────────────────────────

export function settingsToPublic(doc: PharmacySettingsDoc) {
  return {
    clinicId: doc.clinicId,
    pharmacyId: doc.pharmacyId,
    pharmacyName: doc.pharmacyName,
    registrationNumber: doc.registrationNumber,
    licenseNumber: doc.licenseNumber,
    gstNumber: doc.gstNumber,
    taxId: doc.taxId,
    addressLine1: doc.addressLine1,
    addressLine2: doc.addressLine2,
    city: doc.city,
    state: doc.state,
    country: doc.country,
    pincode: doc.pincode,
    contactPhone: doc.contactPhone,
    contactEmail: doc.contactEmail,
    pharmacistName: doc.pharmacistName,
    pharmacistRegistration: doc.pharmacistRegistration,
    operatingHours: doc.operatingHours,
    dispensingSettings: doc.dispensingSettings,
    invoiceConfig: doc.invoiceConfig,
    paymentMethods: doc.paymentMethods,
    supplierInfo: doc.supplierInfo,
    pharmacyStatus: doc.pharmacyStatus,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function medicineToPublic(doc: PharmacyMedicineDoc) {
  return {
    clinicId: doc.clinicId,
    medicineId: doc.medicineId,
    name: doc.name,
    genericName: doc.genericName,
    brand: doc.brand,
    category: doc.category,
    dosageForm: doc.dosageForm,
    strength: doc.strength,
    unit: doc.unit,
    manufacturer: doc.manufacturer,
    hsnCode: doc.hsnCode,
    barcode: doc.barcode,
    batchNumber: doc.batchNumber,
    prescriptionRequired: doc.prescriptionRequired,
    reorderLevel: doc.reorderLevel,
    minStockLevel: doc.minStockLevel,
    maxStockLevel: doc.maxStockLevel,
    purchasePrice: doc.purchasePrice,
    sellingPrice: doc.sellingPrice,
    taxPercent: doc.taxPercent,
    discount: doc.discount,
    supplierId: doc.supplierId,
    manufacturingDate: doc.manufacturingDate,
    expiryDate: doc.expiryDate,
    storageConditions: doc.storageConditions,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function inventoryToPublic(doc: PharmacyInventoryDoc) {
  return {
    clinicId: doc.clinicId,
    inventoryId: doc.inventoryId,
    medicineId: doc.medicineId,
    batchNumber: doc.batchNumber,
    barcode: doc.barcode,
    quantityAvailable: doc.quantityAvailable,
    quantityReserved: doc.quantityReserved,
    quantityDamaged: doc.quantityDamaged,
    purchasePrice: doc.purchasePrice,
    sellingPrice: doc.sellingPrice,
    taxPercent: doc.taxPercent,
    expiryDate: doc.expiryDate,
    manufacturingDate: doc.manufacturingDate,
    supplierId: doc.supplierId,
    storageLocation: doc.storageLocation,
    reorderLevel: doc.reorderLevel,
    status: doc.status,
    reorderStatus: doc.reorderStatus,
    lastUpdated: doc.lastUpdated,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function movementToPublic(doc: PharmacyStockMovementDoc) {
  return {
    clinicId: doc.clinicId,
    movementId: doc.movementId,
    transactionId: doc.transactionId,
    medicineId: doc.medicineId,
    batchNumber: doc.batchNumber,
    quantityBefore: doc.quantityBefore,
    quantityChanged: doc.quantityChanged,
    quantityAfter: doc.quantityAfter,
    movementType: doc.movementType,
    referenceInvoice: doc.referenceInvoice,
    party: doc.party,
    performedBy: doc.performedBy,
    reason: doc.reason,
    notes: doc.notes,
    createdAt: doc.createdAt,
  };
}

export function supplierToPublic(doc: PharmacySupplierDoc) {
  return {
    clinicId: doc.clinicId,
    supplierId: doc.supplierId,
    name: doc.name,
    contactPerson: doc.contactPerson,
    phone: doc.phone,
    email: doc.email,
    address: doc.address,
    gstNumber: doc.gstNumber,
    drugLicenseNumber: doc.drugLicenseNumber,
    paymentTerms: doc.paymentTerms,
    notes: doc.notes,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function purchaseToPublic(doc: PharmacyPurchaseDoc) {
  return {
    clinicId: doc.clinicId,
    purchaseId: doc.purchaseId,
    invoiceNumber: doc.invoiceNumber,
    supplierId: doc.supplierId,
    purchaseDate: doc.purchaseDate,
    items: doc.items,
    subtotal: doc.subtotal,
    taxAmount: doc.taxAmount,
    total: doc.total,
    status: doc.status,
    receivedBy: doc.receivedBy,
    notes: doc.notes,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function saleToPublic(doc: PharmacySaleDoc) {
  return {
    clinicId: doc.clinicId,
    saleId: doc.saleId,
    invoiceNumber: doc.invoiceNumber,
    saleDate: doc.saleDate,
    patientId: doc.patientId,
    items: doc.items,
    subtotal: doc.subtotal,
    discount: doc.discount,
    taxAmount: doc.taxAmount,
    total: doc.total,
    paymentMethod: doc.paymentMethod,
    status: doc.status,
    soldBy: doc.soldBy,
    notes: doc.notes,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function adjustmentToPublic(doc: PharmacyAdjustmentDoc) {
  return {
    clinicId: doc.clinicId,
    adjustmentId: doc.adjustmentId,
    medicineId: doc.medicineId,
    batchNumber: doc.batchNumber,
    currentQuantity: doc.currentQuantity,
    newQuantity: doc.newQuantity,
    reason: doc.reason,
    status: doc.status,
    requestedBy: doc.requestedBy,
    approvedBy: doc.approvedBy,
    notes: doc.notes,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function transferToPublic(doc: PharmacyTransferDoc) {
  return {
    clinicId: doc.clinicId,
    transferId: doc.transferId,
    fromLocation: doc.fromLocation,
    toLocation: doc.toLocation,
    items: doc.items,
    status: doc.status,
    requestedBy: doc.requestedBy,
    approvedBy: doc.approvedBy,
    notes: doc.notes,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function returnToPublic(doc: PharmacyReturnDoc) {
  return {
    clinicId: doc.clinicId,
    returnId: doc.returnId,
    type: doc.type,
    referenceId: doc.referenceId,
    items: doc.items,
    processedBy: doc.processedBy,
    notes: doc.notes,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
