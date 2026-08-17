import { ObjectId } from "mongodb";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { DB_COLLECTIONS } from "@/lib/constants";
import { apiFetch } from "@/lib/server-api";
import { DEFAULT_CLINIC_NAME } from "@/lib/clinic-name-client";
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

  const sessionImage = session?.user?.image ?? null;

  const user: ProfileUser = doc
    ? {
        id: doc._id.toString(),
        name: doc.name ?? "Doctor",
        email: doc.email ?? "",
        role: doc.role ?? "doctor",
        image: doc.image ?? sessionImage,
        phone: doc.phone ?? null,
        specialization: doc.specialization ?? null,
        qualifications: doc.qualifications ?? null,
        bio: doc.bio ?? null,
        createdAt: doc.createdAt ?? null,
        department: doc.department ?? null,
        company: doc.company ?? null,
        addressStreet: doc.addressStreet ?? null,
        addressCity: doc.addressCity ?? null,
        addressState: doc.addressState ?? null,
        addressCountry: doc.addressCountry ?? null,
        addressZip: doc.addressZip ?? null,
        socialLinkedIn: doc.socialLinkedIn ?? null,
        socialGitHub: doc.socialGitHub ?? null,
        socialTwitter: doc.socialTwitter ?? null,
        socialWebsite: doc.socialWebsite ?? null,
      }
    : {
        id: session?.user?.id ?? "",
        name: session?.user?.name ?? "Doctor",
        email: session?.user?.email ?? "",
        role: session?.user?.role ?? "doctor",
        image: sessionImage,
        phone: null,
        specialization: null,
        qualifications: null,
        bio: null,
        createdAt: null,
        department: null,
        company: null,
        addressStreet: null,
        addressCity: null,
        addressState: null,
        addressCountry: null,
        addressZip: null,
        socialLinkedIn: null,
        socialGitHub: null,
        socialTwitter: null,
        socialWebsite: null,
      };

  const org = await apiFetch<CompanyResponse>("/api/organization");
  const company: CompanyDetails =
    org.status === 200 && org.data.company
      ? org.data.company
      : {
          name: DEFAULT_CLINIC_NAME,
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