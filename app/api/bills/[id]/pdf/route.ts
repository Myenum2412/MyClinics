import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { auth, canAccessBilling } from "@/lib/auth";
import { DB_COLLECTIONS } from "@/lib/constants";
import { mapBill } from "@/app/api/bills/route";
import { ensureDefaultOrganization } from "@/services/customer/customer-context.service";
import { generateBillPdf } from "@/lib/bill-pdf";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return new Response("Invalid bill id", { status: 400 });
    }

    const session = await auth();
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const db = await getDb();
    const billDoc = await db.collection(DB_COLLECTIONS.bills).findOne({ _id: new ObjectId(id) });
    if (!billDoc) {
      return new Response("Bill not found", { status: 404 });
    }

    const bill = mapBill(billDoc);

    const staffAccess = canAccessBilling(session.user.role);
    if (!staffAccess) {
      const email = session.user.email?.toLowerCase();
      const patientDoc = email
        ? await db.collection("patients").findOne({ email })
        : null;
      const patientName = patientDoc?.fullName ? String(patientDoc.fullName) : null;
      const patientPhone = patientDoc?.mobile ? String(patientDoc.mobile) : null;
      const ownsBill =
        (patientName && bill.patientName === patientName) ||
        (patientPhone && bill.patientPhone === patientPhone);
      if (!ownsBill) {
        return new Response("Forbidden", { status: 403 });
      }
    }

    const company = await ensureDefaultOrganization(db);
    const pdf = await generateBillPdf(bill, company);

    const safeName = (bill.billNumber || "invoice").replace(/[^a-zA-Z0-9-_]+/g, "-");
    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
        "Content-Length": String(pdf.byteLength),
      },
    });
  } catch (error) {
    console.error("Download bill PDF error", error);
    return new Response("Something went wrong. Please try again.", { status: 500 });
  }
}
