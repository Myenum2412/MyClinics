import type { Db } from "mongodb";
import { now as nowFn } from "@/clinic/core/datetime";
import type { MenuState } from "@/services/whatsapp/menu/types";

export const MENU_STATE_COLLECTION = "wa_menu_state";

interface StateDoc {
  clinicId: string;
  phone: string;
  state: MenuState;
  updatedAt: Date;
}

/** Numbers are keyed by their last 10 digits so "+91 98765…" and "98765…" are the same patient. */
export function phoneKey(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

export async function loadMenuState(db: Db, clinicId: string, phone: string): Promise<MenuState | null> {
  const doc = await db
    .collection<StateDoc>(MENU_STATE_COLLECTION)
    .findOne({ clinicId, phone: phoneKey(phone) });
  return doc?.state ?? null;
}

export async function saveMenuState(db: Db, clinicId: string, phone: string, state: MenuState): Promise<void> {
  await db.collection<StateDoc>(MENU_STATE_COLLECTION).updateOne(
    { clinicId, phone: phoneKey(phone) },
    { $set: { state, updatedAt: nowFn() }, $setOnInsert: { clinicId, phone: phoneKey(phone) } },
    { upsert: true }
  );
}
