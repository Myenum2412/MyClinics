import type { FastifyInstance } from "fastify";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/plugins/auth";
import { DB_COLLECTIONS } from "@/lib/constants";
import { mapBill } from "@/routes/bills";
import { ensureDefaultOrganization } from "@/services/customer/customer-context.service";
import { generateBillPdf } from "@/lib/bill-pdf";
import { findBillVisitData } from "@/lib/bill-visit";
import { canAccessBilling } from "@/lib/roles";

export function registerBillPdfRoutes(app: FastifyInstance): void {
  app.get("/api/bills/:id/pdf", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      if (!ObjectId.isValid(id)) {
        return reply.code(400).send("Invalid bill id");
      }

      if (!(await requireAuth(request, reply))) return;

      const db = await getDb();
      const billDoc = await db
        .collection(DB_COLLECTIONS.bills)
        .findOne({ _id: new ObjectId(id) });
      if (!billDoc) {
        return reply.code(404).send("Bill not found");
      }

      const bill = mapBill(billDoc);

      const staffAccess = canAccessBilling(request.user?.role);
      if (!staffAccess) {
        const email = request.user?.email?.toLowerCase();
        const patientDoc = email
          ? await db.collection("patients").findOne({ email })
          : null;
        const patientName = patientDoc?.fullName
          ? String(patientDoc.fullName)
          : null;
        const patientPhone = patientDoc?.mobile ? String(patientDoc.mobile) : null;
        const ownsBill =
          (patientName && bill.patientName === patientName) ||
          (patientPhone && bill.patientPhone === patientPhone);
        if (!ownsBill) {
          return reply.code(403).send("Forbidden");
        }
      }

      const company = await ensureDefaultOrganization(db);
      const visit = await findBillVisitData(db, bill);
      const pdf = await generateBillPdf(bill, company, visit);

      const safeName = (bill.billNumber || "invoice").replace(
        /[^a-zA-Z0-9-_]+/g,
        "-"
      );
      return reply
        .code(200)
        .type("application/pdf")
        .header("Content-Disposition", `attachment; filename="${safeName}.pdf"`)
        .send(new Uint8Array(pdf));
    } catch (error) {
      console.error("Download bill PDF error", error);
      return reply.code(500).send("Something went wrong. Please try again.");
    }
  });
}