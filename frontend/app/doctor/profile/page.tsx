import { ObjectId } from "mongodb";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { DB_COLLECTIONS } from "@/lib/constants";
import { apiFetch } from "@/lib/server-api";
import { ProfileView, type ProfileUser, type CompanyDetails } from "@/components/profile-view";

export const dynamic = "force-dynamic";

interface CompanyResponse {
  company: CompanyDetails;
}

export default async function ProfilePage() {
  const session = await auth();
  const db = await getDb();
  const doc = session?.user?.id
    ? await db
        .collection(DB_COLLECTIONS.users)
        .findOne({ _id: new ObjectId(session.user.id) })
    : null;

  const user: ProfileUser = doc
    ? {
        id: doc._id.toString(),
        name: doc.name ?? "Doctor",
        email: doc.email ?? "",
        role: doc.role ?? "doctor",
        image: doc.image ?? null,
        phone: doc.phone ?? null,
        specialization: doc.specialization ?? null,
        qualifications: doc.qualifications ?? null,
        bio: doc.bio ?? null,
        createdAt: doc.createdAt ?? null,
      }
    : {
        id: session?.user?.id ?? "",
        name: session?.user?.name ?? "Doctor",
        email: session?.user?.email ?? "",
        role: session?.user?.role ?? "doctor",
        image: null,
        phone: null,
        specialization: null,
        qualifications: null,
        bio: null,
        createdAt: null,
      };

  const org = await apiFetch<CompanyResponse>("/api/organization");
  const company: CompanyDetails =
    org.status === 200 && org.data.company
      ? org.data.company
      : {
          name: "My Clinic",
          phone: null,
          email: null,
          address: null,
          website: null,
          description: null,
        };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <ProfileView initialUser={user} initialCompany={company} />
    </div>
  );
}