import type { Db, WithId } from "mongodb";
import { CLINIC_COLLECTIONS } from "@/clinic/core/collections";
import type { ClinicContext } from "@/clinic/core/context";
import type { UserDoc } from "@/clinic/core/types";

export interface UserListQuery {
  q?: string;
  role?: string;
  status?: string;
  skip: number;
  limit: number;
}

/** Clinic-scoped user repository. */
export class UsersRepository {
  constructor(
    private readonly db: Db,
    private readonly ctx: ClinicContext
  ) {}

  private collection() {
    return this.db.collection<UserDoc>(CLINIC_COLLECTIONS.users);
  }

  async list(query: UserListQuery): Promise<[WithId<UserDoc>[], number]> {
    const filter: Record<string, unknown> = { clinicId: this.ctx.clinicId };
    if (query.role) filter.role = query.role;
    if (query.status) filter.status = query.status;
    if (query.q) {
      filter.$or = [
        { name: { $regex: query.q, $options: "i" } },
        { email: { $regex: query.q, $options: "i" } },
      ];
    }
    const [items, total] = await Promise.all([
      this.collection()
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .toArray(),
      this.collection().countDocuments(filter),
    ]);
    return [items, total];
  }
}