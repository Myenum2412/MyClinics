import { ObjectId } from "mongodb";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { DB_COLLECTIONS } from "@/lib/constants";
import { mapUser } from "@/app/api/profile/route";
import { mapCompany } from "@/app/api/organization/route";
import { ensureDefaultOrganization } from "@/services/customer/customer-context.service";
import { ProfileView, type ProfileUser, type CompanyDetails } from "@/components/profile-view";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  const db = await getDb();
  const [doc, org] = await Promise.all([
    session?.user?.id
      ? db
          .collection(DB_COLLECTIONS.users)
          .findOne({ _id: new ObjectId(session.user.id) })
      : null,
    ensureDefaultOrganization(db),
  ]);

  const user: ProfileUser = doc
    ? (mapUser(doc as never) as ProfileUser)
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

  const company: CompanyDetails = mapCompany(org) as CompanyDetails;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <ProfileView initialUser={user} initialCompany={company} />
    </div>
  );
}
