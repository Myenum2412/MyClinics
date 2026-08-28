import type { Db } from "mongodb";
import { NEO_COLLECTIONS } from "@/neo/core/collections";
import type { NeoContext } from "@/neo/core/neo-context";
import { type NeoSeverity } from "@/neo/core/neo-events";
import { daysAgo, toLocalDateISO, now } from "@/clinic/core/datetime";

export type RiskLevel = "high" | "medium" | "low";

export interface Prediction {
  clinicId: string;
  service: string;
  risk: RiskLevel;
  riskScore: number; // 0-100
  horizonDays: number | null;
  basis: string;
  recommendation: string;
  category: "error_rate" | "capacity" | "latency" | "integration";
}

function dayKey(d: Date): string {
  return toLocalDateISO(d);
}

/**
 * Computes predictive risks from real telemetry. Uses a linear least-squares
 * trend on daily weighted severity counts (critical=3, high=2, medium=1) over
 * the last 7 days. A positive, materially rising trend produces a forward risk
 * with a projected horizon. No values are invented — when there is insufficient
 * history the function returns an empty list.
 */
export async function computePredictions(db: Db, scope: NeoContext): Promise<Prediction[]> {
  const since = daysAgo(7);
  const col = db.collection(NEO_COLLECTIONS.events);
  // Synchronous slice of the async aggregation to keep the helper callable
  // without await at call sites that already await the parent.
  const rows = await col
    .aggregate([
      {
        $match: {
          organizationId: scope.organizationId,
          ...(scope.clinicId ? { clinicId: scope.clinicId } : {}),
          timestamp: { $gte: since },
        },
      },
      {
        $group: {
          _id: {
            clinicId: "$clinicId",
            service: "$service",
            day: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$timestamp",
                timezone: "Asia/Kolkata",
              },
            },
          },
          weight: {
            $sum: {
              $switch: {
                branches: [
                  { case: { $eq: ["$severity", "critical"] }, then: 3 },
                  { case: { $eq: ["$severity", "high"] }, then: 2 },
                  { case: { $eq: ["$severity", "medium"] }, then: 1 },
                ],
                default: 0,
              },
            },
          },
          storageWarnings: {
            $sum: { $cond: [{ $eq: ["$eventType", "DB_STORAGE_WARNING"] }, 1, 0] },
          },
          latencySpikes: {
            $sum: { $cond: [{ $eq: ["$eventType", "API_LATENCY"] }, 1, 0] },
          },
        },
      },
    ])
    .toArray();

  const byKey = new Map<string, { clinicId: string; service: string; days: Map<string, number>; storage: number; latency: number }>();
  for (const r of rows) {
    const key = `${r._id.clinicId}::${r._id.service}`;
    if (!byKey.has(key)) {
      byKey.set(key, {
        clinicId: String(r._id.clinicId),
        service: String(r._id.service),
        days: new Map(),
        storage: 0,
        latency: 0,
      });
    }
    const entry = byKey.get(key)!;
    entry.days.set(String(r._id.day), r.weight as number);
    entry.storage += (r.storage as number) ?? 0;
    entry.latency += (r.latency as number) ?? 0;
  }

  const predictions: Prediction[] = [];
  const today = dayKey(now());

  for (const entry of byKey.values()) {
    const dayList = [...entry.days.entries()].sort();
    if (dayList.length < 3) continue;
    const xs = dayList.map((_, i) => i);
    const ys = dayList.map(([, v]) => v);
    const n = xs.length;
    const meanX = xs.reduce((a, b) => a + b, 0) / n;
    const meanY = ys.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (xs[i] - meanX) * (ys[i] - meanY);
      den += (xs[i] - meanX) ** 2;
    }
    const slope = den === 0 ? 0 : num / den;
    const recent = ys.slice(-3).reduce((a, b) => a + b, 0);

    if (slope > 0.3 && recent >= 3) {
      const projected = slope * 7 + meanY;
      const riskScore = Math.min(100, Math.round(40 + slope * 20 + recent * 2));
      const horizonDays = Math.max(1, Math.round((recent * 2 - meanY) / slope)) || null;
      predictions.push({
        clinicId: entry.clinicId,
        service: entry.service,
        risk: riskScore >= 75 ? "high" : riskScore >= 50 ? "medium" : "low",
        riskScore,
        horizonDays,
        basis: `Weighted severity trend rising (slope ≈ ${slope.toFixed(2)}/day over ${n} days; recent load ${recent}).`,
        recommendation:
          "Investigate the affected service's error budget and recent deployments before the projected window.",
        category: "error_rate",
      });
    }

    if (entry.storage > 0) {
      predictions.push({
        clinicId: entry.clinicId,
        service: entry.service,
        risk: entry.storage >= 3 ? "high" : "medium",
        riskScore: Math.min(100, 50 + entry.storage * 10),
        horizonDays: null,
        basis: `${entry.storage} database storage warning event(s) in the last 7 days.`,
        recommendation:
          "Review database storage growth and add capacity or archival before saturation.",
        category: "capacity",
      });
    }

    if (entry.latency > 5 && slope >= 0) {
      predictions.push({
        clinicId: entry.clinicId,
        service: entry.service,
        risk: "medium",
        riskScore: Math.min(100, 40 + entry.latency * 3),
        horizonDays: null,
        basis: `${entry.latency} API latency spikes observed in the last 7 days.`,
        recommendation: "Profile slow endpoints and check dependency latency.",
        category: "latency",
      });
    }
  }

  return predictions.sort((a, b) => b.riskScore - a.riskScore);
}
