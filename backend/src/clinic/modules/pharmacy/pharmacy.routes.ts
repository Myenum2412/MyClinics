import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { PharmacyController } from "@/clinic/modules/pharmacy/pharmacy.controller";
import { requireClinicAccess } from "@/clinic/core/scope";
import { ForbiddenError, UnauthorizedError } from "@/clinic/core/errors";
import type { ClinicRole } from "@/clinic/core/roles";

const PHARMACY_VIEW: ClinicRole[] = [
  "clinic_admin",
  "pharmacy_manager",
  "pharmacist",
  "inventory_staff",
  "billing_staff",
];
const PHARMACY_MANAGE: ClinicRole[] = ["clinic_admin", "pharmacy_manager"];
const PHARMACY_INVENTORY: ClinicRole[] = ["clinic_admin", "pharmacy_manager", "inventory_staff"];
const PHARMACY_DISPENSE: ClinicRole[] = [
  "clinic_admin",
  "pharmacy_manager",
  "pharmacist",
  "billing_staff",
];
const PHARMACY_SUPPLY: ClinicRole[] = [
  "clinic_admin",
  "pharmacy_manager",
  "inventory_staff",
  "billing_staff",
];

function allowRoles(roles: ClinicRole[]) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    if (!roles.includes(ctx.role)) {
      throw new ForbiddenError("You do not have permission to access the pharmacy module");
    }
  };
}

const viewGuard = allowRoles(PHARMACY_VIEW);
const manageGuard = allowRoles(PHARMACY_MANAGE);
const inventoryGuard = allowRoles(PHARMACY_INVENTORY);
const dispenseGuard = allowRoles(PHARMACY_DISPENSE);
const supplyGuard = allowRoles(PHARMACY_SUPPLY);

/**
 * Pharmacy Management module — fully multi-tenant (clinic-scoped).
 *
 *   GET    /api/clinics/:clinicId/pharmacy/settings
 *   PATCH  /api/clinics/:clinicId/pharmacy/settings
 *   GET    /api/clinics/:clinicId/pharmacy/medicines
 *   POST   /api/clinics/:clinicId/pharmacy/medicines
 *   GET    /api/clinics/:clinicId/pharmacy/medicines/:medicineId
 *   PATCH  /api/clinics/:clinicId/pharmacy/medicines/:medicineId
 *   DELETE /api/clinics/:clinicId/pharmacy/medicines/:medicineId
 *   POST   /api/clinics/:clinicId/pharmacy/medicines/bulk
 *   GET    /api/clinics/:clinicId/pharmacy/inventory
 *   GET    /api/clinics/:clinicId/pharmacy/inventory/:inventoryId
 *   POST   /api/clinics/:clinicId/pharmacy/inventory/opening-stock
 *   POST   /api/clinics/:clinicId/pharmacy/inventory/write-off
 *   GET    /api/clinics/:clinicId/pharmacy/movements
 *   GET    /api/clinics/:clinicId/pharmacy/suppliers
 *   POST   /api/clinics/:clinicId/pharmacy/suppliers
 *   GET    /api/clinics/:clinicId/pharmacy/suppliers/:supplierId
 *   PATCH  /api/clinics/:clinicId/pharmacy/suppliers/:supplierId
 *   DELETE /api/clinics/:clinicId/pharmacy/suppliers/:supplierId
 *   GET    /api/clinics/:clinicId/pharmacy/purchases
 *   POST   /api/clinics/:clinicId/pharmacy/purchases
 *   GET    /api/clinics/:clinicId/pharmacy/purchases/:purchaseId
 *   POST   /api/clinics/:clinicId/pharmacy/purchases/:purchaseId/receive
 *   GET    /api/clinics/:clinicId/pharmacy/sales
 *   POST   /api/clinics/:clinicId/pharmacy/sales
 *   GET    /api/clinics/:clinicId/pharmacy/sales/:saleId
 *   GET    /api/clinics/:clinicId/pharmacy/adjustments
 *   POST   /api/clinics/:clinicId/pharmacy/adjustments
 *   POST   /api/clinics/:clinicId/pharmacy/adjustments/:adjustmentId/review
 *   GET    /api/clinics/:clinicId/pharmacy/transfers
 *   POST   /api/clinics/:clinicId/pharmacy/transfers
 *   POST   /api/clinics/:clinicId/pharmacy/transfers/:transferId/review
 *   GET    /api/clinics/:clinicId/pharmacy/returns
 *   POST   /api/clinics/:clinicId/pharmacy/returns
 *   GET    /api/clinics/:clinicId/pharmacy/dashboard
 *   GET    /api/clinics/:clinicId/pharmacy/alerts
 *   GET    /api/clinics/:clinicId/pharmacy/reports
 */
export function registerPharmacyRoutes(app: FastifyInstance): void {
  const controller = new PharmacyController();

  const base = {
    preHandler: [requireClinicAccess, viewGuard],
  };

  // Settings
  app.get("/api/clinics/:clinicId/pharmacy/settings", base, (r, rp) => controller.getSettings(r, rp));
  app.patch(
    "/api/clinics/:clinicId/pharmacy/settings",
    { preHandler: [requireClinicAccess, manageGuard] },
    (r, rp) => controller.updateSettings(r, rp)
  );

  // Medicines
  app.get("/api/clinics/:clinicId/pharmacy/medicines", base, (r, rp) => controller.listMedicines(r, rp));
  app.post(
    "/api/clinics/:clinicId/pharmacy/medicines",
    { preHandler: [requireClinicAccess, inventoryGuard] },
    (r, rp) => controller.createMedicine(r, rp)
  );
  app.get("/api/clinics/:clinicId/pharmacy/medicines/:medicineId", base, (r, rp) => controller.getMedicine(r, rp));
  app.patch(
    "/api/clinics/:clinicId/pharmacy/medicines/:medicineId",
    { preHandler: [requireClinicAccess, inventoryGuard] },
    (r, rp) => controller.updateMedicine(r, rp)
  );
  app.delete(
    "/api/clinics/:clinicId/pharmacy/medicines/:medicineId",
    { preHandler: [requireClinicAccess, inventoryGuard] },
    (r, rp) => controller.deleteMedicine(r, rp)
  );
  app.post(
    "/api/clinics/:clinicId/pharmacy/medicines/bulk",
    { preHandler: [requireClinicAccess, inventoryGuard] },
    (r, rp) => controller.bulkMedicines(r, rp)
  );

  // Inventory
  app.get("/api/clinics/:clinicId/pharmacy/inventory", base, (r, rp) => controller.listInventory(r, rp));
  app.get("/api/clinics/:clinicId/pharmacy/inventory/:inventoryId", base, (r, rp) => controller.getInventory(r, rp));
  app.post(
    "/api/clinics/:clinicId/pharmacy/inventory/opening-stock",
    { preHandler: [requireClinicAccess, inventoryGuard] },
    (r, rp) => controller.addOpeningStock(r, rp)
  );
  app.post(
    "/api/clinics/:clinicId/pharmacy/inventory/write-off",
    { preHandler: [requireClinicAccess, inventoryGuard] },
    (r, rp) => controller.writeOff(r, rp)
  );

  // Stock Movements
  app.get("/api/clinics/:clinicId/pharmacy/movements", base, (r, rp) => controller.listMovements(r, rp));

  // Suppliers
  app.get("/api/clinics/:clinicId/pharmacy/suppliers", base, (r, rp) => controller.listSuppliers(r, rp));
  app.post(
    "/api/clinics/:clinicId/pharmacy/suppliers",
    { preHandler: [requireClinicAccess, supplyGuard] },
    (r, rp) => controller.createSupplier(r, rp)
  );
  app.get("/api/clinics/:clinicId/pharmacy/suppliers/:supplierId", base, (r, rp) => controller.getSupplier(r, rp));
  app.patch(
    "/api/clinics/:clinicId/pharmacy/suppliers/:supplierId",
    { preHandler: [requireClinicAccess, supplyGuard] },
    (r, rp) => controller.updateSupplier(r, rp)
  );
  app.delete(
    "/api/clinics/:clinicId/pharmacy/suppliers/:supplierId",
    { preHandler: [requireClinicAccess, supplyGuard] },
    (r, rp) => controller.deleteSupplier(r, rp)
  );

  // Purchases
  app.get("/api/clinics/:clinicId/pharmacy/purchases", base, (r, rp) => controller.listPurchases(r, rp));
  app.post(
    "/api/clinics/:clinicId/pharmacy/purchases",
    { preHandler: [requireClinicAccess, supplyGuard] },
    (r, rp) => controller.createPurchase(r, rp)
  );
  app.get("/api/clinics/:clinicId/pharmacy/purchases/:purchaseId", base, (r, rp) => controller.getPurchase(r, rp));
  app.post(
    "/api/clinics/:clinicId/pharmacy/purchases/:purchaseId/receive",
    { preHandler: [requireClinicAccess, inventoryGuard] },
    (r, rp) => controller.receivePurchase(r, rp)
  );

  // Sales
  app.get("/api/clinics/:clinicId/pharmacy/sales", base, (r, rp) => controller.listSales(r, rp));
  app.post(
    "/api/clinics/:clinicId/pharmacy/sales",
    { preHandler: [requireClinicAccess, dispenseGuard] },
    (r, rp) => controller.createSale(r, rp)
  );
  app.get("/api/clinics/:clinicId/pharmacy/sales/:saleId", base, (r, rp) => controller.getSale(r, rp));

  // Adjustments
  app.get("/api/clinics/:clinicId/pharmacy/adjustments", base, (r, rp) => controller.listAdjustments(r, rp));
  app.post(
    "/api/clinics/:clinicId/pharmacy/adjustments",
    { preHandler: [requireClinicAccess, inventoryGuard] },
    (r, rp) => controller.createAdjustment(r, rp)
  );
  app.post(
    "/api/clinics/:clinicId/pharmacy/adjustments/:adjustmentId/review",
    { preHandler: [requireClinicAccess, manageGuard] },
    (r, rp) => controller.reviewAdjustment(r, rp)
  );

  // Transfers
  app.get("/api/clinics/:clinicId/pharmacy/transfers", base, (r, rp) => controller.listTransfers(r, rp));
  app.post(
    "/api/clinics/:clinicId/pharmacy/transfers",
    { preHandler: [requireClinicAccess, inventoryGuard] },
    (r, rp) => controller.createTransfer(r, rp)
  );
  app.post(
    "/api/clinics/:clinicId/pharmacy/transfers/:transferId/review",
    { preHandler: [requireClinicAccess, manageGuard] },
    (r, rp) => controller.reviewTransfer(r, rp)
  );

  // Returns
  app.get("/api/clinics/:clinicId/pharmacy/returns", base, (r, rp) => controller.listReturns(r, rp));
  app.post(
    "/api/clinics/:clinicId/pharmacy/returns",
    { preHandler: [requireClinicAccess, dispenseGuard] },
    (r, rp) => controller.createReturn(r, rp)
  );

  // Dashboard / Alerts / Reports
  app.get("/api/clinics/:clinicId/pharmacy/dashboard", base, (r, rp) => controller.getDashboard(r, rp));
  app.get("/api/clinics/:clinicId/pharmacy/alerts", base, (r, rp) => controller.getAlerts(r, rp));
  app.get("/api/clinics/:clinicId/pharmacy/reports", base, (r, rp) => controller.downloadReport(r, rp));
}
