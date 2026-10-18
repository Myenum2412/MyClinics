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

/** Resolve a dotted field path (e.g. "supplier.name") against a document. */
function getPath(obj: Doc, path: string): any {
  if (!path.includes(".")) return obj[path];
  return path
    .split(".")
    .reduce<any>((acc, key) => (acc == null ? acc : (acc as Doc)[key]), obj);
}

function operatorMatch(doc: Doc, key: string, op: Record<string, unknown>): boolean {
  const value = getPath(doc, key);
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
    } else if (!eq(getPath(doc, key), filterValue)) {
      return false;
    }
  }
  return true;
}

// --- Aggregation pipeline support --------------------------------------------
// The fake DB implements only the stages the app's repositories actually use
// ($match/$sort/$skip/$limit/$lookup/$unwind/$set/$unset/$project/$facet/$count).

function sortDocs(items: Doc[], spec: Record<string, 1 | -1>): Doc[] {
  return [...items].sort((a, b) => {
    for (const [key, dir] of Object.entries(spec)) {
      const av = getPath(a, key);
      const bv = getPath(b, key);
      if (av === bv) continue;
      if (av === undefined) return 1 * dir;
      if (bv === undefined) return -1 * dir;
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
    }
    return 0;
  });
}

function evalExpr(row: Doc, expr: unknown): unknown {
  if (typeof expr === "string" && expr.startsWith("$")) return getPath(row, expr.slice(1));
  return expr;
}

function setPath(out: Doc, path: string, value: unknown): void {
  if (!path.includes(".")) {
    out[path] = value;
    return;
  }
  const keys = path.split(".");
  let cur = out;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (typeof cur[key] !== "object" || cur[key] === null) cur[key] = {};
    cur = cur[key];
  }
  cur[keys[keys.length - 1]] = value;
}

function projectRow(row: Doc, spec: Record<string, unknown>): Doc {
  const entries = Object.entries(spec);
  const hasInclusion = entries.some(([, v]) => v === 1 || (typeof v === "object" && v !== null));
  if (hasInclusion) {
    const out: Doc = {};
    for (const [k, v] of entries) {
      if (v === 1) out[k] = getPath(row, k);
      else if (v === 0) continue;
      else out[k] = evalExpr(row, v);
    }
    return out;
  }
  const out: Doc = { ...row };
  for (const [k, v] of entries) if (v === 0) delete out[k];
  return out;
}

function runPipeline(
  input: Doc[],
  stages: Record<string, any>[],
  store: Map<string, Doc[]>
): Doc[] {
  let rows = input;
  for (const stage of stages) {
    if (stage.$match) {
      rows = rows.filter((d) => matches(d, stage.$match));
    } else if (stage.$sort) {
      rows = sortDocs(rows, stage.$sort);
    } else if (stage.$skip !== undefined) {
      rows = rows.slice(stage.$skip);
    } else if (stage.$limit !== undefined) {
      rows = stage.$limit > 0 ? rows.slice(0, stage.$limit) : rows;
    } else if (stage.$count) {
      rows = [{ [stage.$count]: rows.length }];
    } else if (stage.$lookup) {
      const { from, localField, foreignField, as } = stage.$lookup;
      const foreign = store.get(from) ?? [];
      rows = rows.map((row) => {
        const localVal = getPath(row, localField);
        const found = foreign.filter((f) => eq(getPath(f, foreignField), localVal));
        return { ...row, [as]: found.map((f) => ({ ...f })) };
      });
    } else if (stage.$unwind) {
      const spec = typeof stage.$unwind === "string" ? { path: stage.$unwind } : stage.$unwind;
      const field = String(spec.path).replace(/^\$/, "");
      const preserve = spec.preserveNullAndEmptyArrays === true;
      const next: Doc[] = [];
      for (const row of rows) {
        const value = getPath(row, field);
        if (Array.isArray(value)) {
          if (value.length === 0) {
            if (preserve) {
              const copy = { ...row };
              delete copy[field];
              next.push(copy);
            }
          } else {
            for (const item of value) {
              const copy = { ...row };
              setPath(copy, field, item);
              next.push(copy);
            }
          }
        } else if (value === null || value === undefined) {
          if (preserve) {
            const copy = { ...row };
            delete copy[field];
            next.push(copy);
          }
        } else {
          next.push({ ...row });
        }
      }
      rows = next;
    } else if (stage.$set || stage.$addFields) {
      const spec = stage.$set ?? stage.$addFields;
      rows = rows.map((row) => {
        const out = { ...row };
        for (const [k, expr] of Object.entries(spec)) setPath(out, k, evalExpr(row, expr));
        return out;
      });
    } else if (stage.$unset) {
      const fields = Array.isArray(stage.$unset) ? stage.$unset : [stage.$unset];
      rows = rows.map((row) => {
        const out = { ...row };
        for (const f of fields) delete out[f];
        return out;
      });
    } else if (stage.$project) {
      rows = rows.map((row) => projectRow(row, stage.$project));
    } else if (stage.$facet) {
      const facets = stage.$facet as Record<string, Record<string, any>[]>;
      const output: Doc = {};
      for (const [key, sub] of Object.entries(facets)) output[key] = runPipeline(rows, sub, store);
      rows = [output];
    }
    // Unknown stages are ignored — sufficient for the app's read pipelines.
  }
  return rows;
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
    if (n > 0) this.items = this.items.slice(0, n); // 0 = unlimited, like MongoDB
    return this;
  }

  skip(n: number): this {
    this.items = this.items.slice(n);
    return this;
  }

  project(p: Record<string, unknown>): this {
    this.projection = p;
    return this;
  }

  async toArray(): Promise<Doc[]> {
    if (!this.projection) return this.items;
    const fields = Object.entries(this.projection);
    // Exclusion projection ({ mediaData: 0 }): return everything except those fields.
    if (fields.length > 0 && fields.every(([, include]) => include === 0)) {
      return this.items.map((doc) => {
        const out: Doc = { ...doc };
        for (const [key] of fields) delete out[key];
        return out;
      });
    }
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
        aggregate(stages: Record<string, any>[] = []) {
          return {
            async toArray(): Promise<Doc[]> {
              return runPipeline(docs.map((d) => ({ ...d })), stages, store);
            },
            async next(): Promise<Doc | null> {
              const arr = runPipeline(docs.map((d) => ({ ...d })), stages, store);
              return arr[0] ?? null;
            },
          };
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
            return { matchedCount: 1, modifiedCount: 1, upsertedCount: 0 };
          }
          if (opts.upsert) {
            const _id = nextId();
            const created: Doc = { _id };
            applyUpdate(created, update);
            docs.push(created);
            return { matchedCount: 0, modifiedCount: 0, upsertedCount: 1, upsertedId: _id };
          }
          return { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
        },
        async updateMany(filter: Filter, update: Record<string, any>) {
          const matched = docs.filter((d) => matches(d, filter));
          for (const target of matched) {
            applyUpdate(target, update);
          }
          return { matchedCount: matched.length, modifiedCount: matched.length };
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
        async deleteMany(filter: Filter = {}) {
          let count = 0;
          for (let i = docs.length - 1; i >= 0; i--) {
            if (matches(docs[i], filter)) {
              docs.splice(i, 1);
              count++;
            }
          }
          return { deletedCount: count };
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
