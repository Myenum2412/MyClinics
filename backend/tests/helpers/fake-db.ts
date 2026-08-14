/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Db } from "mongodb";

type Doc = Record<string, any>;
type Filter = Record<string, any>;

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `id-${idCounter}`;
}

function eq(value: unknown, filterValue: unknown): boolean {
  if (filterValue === null || filterValue === undefined) return value === filterValue;
  if (Array.isArray(filterValue)) return Array.isArray(value) && value.length === filterValue.length && filterValue.every((v, i) => eq(value[i], v));
  return value === filterValue;
}

function operatorMatch(doc: Doc, key: string, op: Record<string, unknown>): boolean {
  const value = doc[key];
  for (const [operator, operandRaw] of Object.entries(op)) {
    const operand = operandRaw as any;
    switch (operator) {
      case "$gte":
        if (!(value >= operand)) return false;
        break;
      case "$gt":
        if (!(value > operand)) return false;
        break;
      case "$lte":
        if (!(value <= operand)) return false;
        break;
      case "$lt":
        if (!(value < operand)) return false;
        break;
      case "$in":
        if (!Array.isArray(operand) || !operand.some((o) => eq(value, o))) return false;
        break;
      case "$nin":
        if (!Array.isArray(operand) || operand.some((o) => eq(value, o))) return false;
        break;
      case "$ne":
        if (eq(value, operand)) return false;
        break;
      case "$exists":
        if (operand === true && value === undefined) return false;
        if (operand === false && value !== undefined) return false;
        break;
      case "$regex":
        if (typeof value !== "string" || !new RegExp(operand as string).test(value)) return false;
        break;
      default:
        return false;
    }
  }
  return true;
}

function matches(doc: Doc, filter: Filter): boolean {
  for (const [key, filterValue] of Object.entries(filter)) {
    if (key === "$or") {
      const clauses = filterValue as Filter[];
      if (!clauses.some((clause) => matches(doc, clause))) return false;
      continue;
    }
    const isOperator = (v: unknown) =>
      typeof v === "object" && v !== null && !Array.isArray(v) && Object.keys(v as object).every((k) => k.startsWith("$"));
    if (isOperator(filterValue)) {
      if (!operatorMatch(doc, key, filterValue as Record<string, unknown>)) return false;
    } else if (filterValue === undefined) {
      // no constraint
    } else if (!eq(doc[key], filterValue)) {
      return false;
    }
  }
  return true;
}

class FakeCursor {
  private items: Doc[];
  private projection?: Record<string, unknown>;

  constructor(items: Doc[], projection?: Record<string, unknown>) {
    this.items = items;
    this.projection = projection;
  }

  sort(spec: Record<string, 1 | -1>): this {
    this.items = [...this.items].sort((a, b) => {
      for (const [key, dir] of Object.entries(spec)) {
        const av = a[key];
        const bv = b[key];
        if (av === bv) continue;
        if (av === undefined) return 1 * dir;
        if (bv === undefined) return -1 * dir;
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
      }
      return 0;
    });
    return this;
  }

  limit(n: number): this {
    this.items = this.items.slice(0, n);
    return this;
  }

  project(p: Record<string, unknown>): this {
    this.projection = p;
    return this;
  }

  async toArray(): Promise<Doc[]> {
    if (!this.projection) return this.items;
    const fields = Object.entries(this.projection);
    return this.items.map((doc) => {
      const out: Doc = {};
      for (const [key, include] of fields) {
        if (include === 1) out[key] = doc[key];
      }
      return out;
    });
  }
}

function applyUpdate(doc: Doc, update: Record<string, any>): void {
  for (const [operator, payload] of Object.entries(update)) {
    if (operator === "$set") {
      for (const [k, v] of Object.entries(payload)) doc[k] = v;
    } else if (operator === "$setOnInsert") {
      for (const [k, v] of Object.entries(payload)) if (doc[k] === undefined) doc[k] = v;
    } else if (operator === "$push") {
      for (const [k, v] of Object.entries(payload)) {
        if (!Array.isArray(doc[k])) doc[k] = [];
        doc[k].push(v);
      }
    } else if (operator === "$unset") {
      for (const k of Object.keys(payload)) delete doc[k];
    } else if (operator === "$inc") {
      for (const [k, v] of Object.entries(payload)) doc[k] = (Number(doc[k]) || 0) + Number(v);
    }
  }
}

export function createFakeDb(seed: Record<string, any[]> = {}): { db: Db; dump: (name: string) => Doc[] } {
  const store = new Map<string, Doc[]>();
  for (const [name, docs] of Object.entries(seed)) {
    store.set(name, docs.map((d) => ({ ...d, _id: d._id ?? nextId() })));
  }

  const db = {
    collection(name: string) {
      const docs = store.get(name) ?? [];
      if (!store.has(name)) store.set(name, docs);
      return {
        async findOne(filter: Filter = {}) {
          return docs.find((d) => matches(d, filter)) ?? null;
        },
        find(filter: Filter = {}, options: { projection?: Record<string, unknown> } = {}) {
          const matched = docs.filter((d) => matches(d, filter));
          return new FakeCursor(matched, options.projection);
        },
        async insertOne(doc: Doc) {
          const _id = doc._id ?? nextId();
          docs.push({ ...doc, _id });
          return { insertedId: _id };
        },
        async insertMany(docsToInsert: Doc[]) {
          const insertedIds: { [key: number]: string } = {};
          for (const [index, doc] of docsToInsert.entries()) {
            const _id = doc._id ?? nextId();
            docs.push({ ...doc, _id });
            insertedIds[index] = _id;
          }
          return { insertedCount: docsToInsert.length, insertedIds };
        },
        async updateOne(
          filter: Filter,
          update: Record<string, any>,
          opts: { upsert?: boolean } = {}
        ) {
          const target = docs.find((d) => matches(d, filter));
          if (target) {
            applyUpdate(target, update);
            return { modifiedCount: 1, upsertedCount: 0 };
          }
          if (opts.upsert) {
            const _id = nextId();
            const created: Doc = { _id };
            applyUpdate(created, update);
            docs.push(created);
            return { modifiedCount: 0, upsertedCount: 1, upsertedId: _id };
          }
          return { modifiedCount: 0, upsertedCount: 0 };
        },
        async findOneAndUpdate(
          filter: Filter,
          update: Record<string, any>,
          opts: { returnDocument?: "before" | "after" } = {}
        ) {
          const target = docs.find((d) => matches(d, filter));
          if (!target) return null;
          const previous = { ...target };
          applyUpdate(target, update);
          return opts.returnDocument === "before" ? previous : target;
        },
        async deleteOne(filter: Filter = {}) {
          const index = docs.findIndex((d) => matches(d, filter));
          if (index === -1) return { deletedCount: 0 };
          docs.splice(index, 1);
          return { deletedCount: 1 };
        },
        async countDocuments(filter: Filter = {}) {
          return docs.filter((d) => matches(d, filter)).length;
        },
        async bulkWrite(ops: { updateOne?: { filter: Filter; update: Record<string, any> } }[]) {
          let modifiedCount = 0;
          for (const op of ops) {
            if (op.updateOne) {
              const result = await this.updateOne(op.updateOne.filter, op.updateOne.update);
              modifiedCount += result.modifiedCount;
            }
          }
          return { modifiedCount };
        },
      };
    },
  };

  return { db: db as unknown as Db, dump: (name: string) => store.get(name) ?? [] };
}
