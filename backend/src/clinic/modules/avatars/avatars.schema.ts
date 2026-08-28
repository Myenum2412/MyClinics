import type { Binary, Document } from "mongodb";

export type AvatarOwnerType = "patient" | "doctor" | "clinic";

export const ALLOWED_AVATAR_OWNER_TYPES: ReadonlySet<string> = new Set([
  "patient",
  "doctor",
  "clinic",
]);

export interface AvatarDocument extends Document {
  _id: unknown;
  clinicId: string;
  ownerType: AvatarOwnerType;
  ownerId: string;
  contentType: string;
  data: Binary;
  size: number;
  createdAt: Date;
  updatedAt: Date;
}
