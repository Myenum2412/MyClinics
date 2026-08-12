import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  ensureDefaultOrganization,
  updateOrganizationDetails,
  type OrganizationRecord,
} from "@/services/customer/customer-context.service";

const MAX = {
  name: 120,
  phone: 30,
  email: 120,
  address: 300,
  website: 120,
  description: 500,
};

export function mapCompany(org: OrganizationRecord) {
  return {
    name: org.name,
    phone: org.phone ?? null,
    email: org.email ?? null,
    address: org.address ?? null,
    website: org.website ?? null,
    description: org.description ?? null,
  };
}

function optionalString(value: unknown, max: number): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  return value.trim().slice(0, max);
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const org = await ensureDefaultOrganization(db);
    return NextResponse.json({ company: mapCompany(org) });
  } catch (error) {
    console.error("Get company error", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json(
        { error: "Clinic name is required" },
        { status: 400 }
      );
    }
    if (name.length > MAX.name) {
      return NextResponse.json(
        { error: `Clinic name must be under ${MAX.name} characters` },
        { status: 400 }
      );
    }

    const email = optionalString(body?.email, MAX.email);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    const phone = optionalString(body?.phone, MAX.phone);
    const address = optionalString(body?.address, MAX.address);
    const website = optionalString(body?.website, MAX.website);
    const description = optionalString(body?.description, MAX.description);

    const db = await getDb();
    const org = await ensureDefaultOrganization(db);
    const updated = await updateOrganizationDetails(db, org.id, {
      name,
      phone,
      email,
      address,
      website,
      description,
    });

    return NextResponse.json({ company: mapCompany(updated) });
  } catch (error) {
    console.error("Update company error", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
