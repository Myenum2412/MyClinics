import { complete } from "@/services/ai/nvidia.service";
import { logger } from "@/lib/logger";

export interface ReportMetrics {
  totalRevenue: number;
  prevRevenue: number;
  revenueGrowth: number | null;
  totalPatients: number;
  newPatients: number;
  returningPatients: number;
  retentionRate: number;
  totalAppointments: number;
  completed: number;
  cancelled: number;
  noShow: number;
  completionRate: number;
  noShowRate: number;
  cancellationRate: number;
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
  avgInvoice: number;
  revenueByDoctor: { name: string; value: number }[];
  revenueByService: { name: string; value: number }[];
  peakHours: { hour: string; count: number }[];
  healthScore: number | null;
  periodLabel: string;
}

export async function generateBusinessInsights(metrics: ReportMetrics): Promise<{ recommendations: { priority: string; title: string; detail: string; action: string }[]; raw: string }> {
  const prompt = `You are a clinic business intelligence advisor for MyClinics. Analyze the following real clinic metrics for period "${metrics.periodLabel}" and generate 3-5 prioritized business recommendations.

Metrics (all from real data, no estimates):
- Total Revenue: ₹${metrics.totalRevenue} (prev: ₹${metrics.prevRevenue}, growth: ${metrics.revenueGrowth ?? "—"}%)
- Total Patients: ${metrics.totalPatients} (new: ${metrics.newPatients}, returning: ${metrics.returningPatients}, retention: ${metrics.retentionRate}%)
- Appointments: total ${metrics.totalAppointments}, completed ${metrics.completed}, cancelled ${metrics.cancelled}, no-show ${metrics.noShow}, completion ${metrics.completionRate}%, no-show ${metrics.noShowRate}%, cancel ${metrics.cancellationRate}%
- Billing: billed ${metrics.totalBilled}, paid ${metrics.totalPaid}, outstanding ${metrics.outstanding}, avg invoice ${metrics.avgInvoice}
- Revenue by doctor: ${metrics.revenueByDoctor.map(r => `${r.name}: ₹${r.value}`).join(", ") || "—"}
- Revenue by service: ${metrics.revenueByService.map(r => `${r.name}: ₹${r.value}`).join(", ") || "—"}
- Peak hours: ${metrics.peakHours.map(p => `${p.hour} (${p.count})`).join(", ") || "—"}
- Health Score: ${metrics.healthScore ?? "—"}/100

Requirements:
- Use NVIDIA_MODEL=minimaxai/minimax-m3 knowledge
- Provide JSON array of recommendations with fields: priority (High/Medium/Opportunity), title, detail (include actual numbers and % from metrics), action (specific, e.g., Enable WhatsApp reminders)
- Every recommendation must be backed by the numbers above, no fake data
- Prioritize High for revenue leakage, no-show >10%, outstanding >15% of billed
- Return ONLY valid JSON array, no markdown, no extra text.

Example output:
[{"priority":"High","title":"Reduce no-shows","detail":"No-show rate is 11% (vs 7% healthy).","action":"Enable automated WhatsApp reminders 24h before appointments."}]
`;

  try {
    const raw = await complete(
      [
        { role: "system", content: "You are a helpful clinic business analyst. Return only valid JSON." },
        { role: "user", content: prompt },
      ],
      { temperature: 0.4, maxTokens: 2000 }
    );
    // Extract JSON array from response
    const jsonStr = raw.trim().replace(/^```json\s*/, "").replace(/```$/, "").trim();
    const start = jsonStr.indexOf("[");
    const end = jsonStr.lastIndexOf("]");
    if (start !== -1 && end !== -1) {
      const parsed = JSON.parse(jsonStr.slice(start, end + 1));
      if (Array.isArray(parsed)) {
        const recs = parsed
          .filter((r: unknown) => r && typeof r === "object")
          .map((r: Record<string, unknown>) => ({
            priority: String(r.priority ?? "Medium"),
            title: String(r.title ?? "Recommendation"),
            detail: String(r.detail ?? ""),
            action: String(r.action ?? ""),
          }))
          .slice(0, 5);
        return { recommendations: recs, raw };
      }
    }
    throw new Error("Invalid JSON from AI");
  } catch (err) {
    logger.warn("business insights AI failed, using fallback", { error: err instanceof Error ? err.message : String(err) });
    // Fallback rule-based
    const recs: { priority: string; title: string; detail: string; action: string }[] = [];
    if (metrics.noShowRate > 10) recs.push({ priority: "High", title: "Reduce no-shows", detail: `No-show rate is ${metrics.noShowRate}%.`, action: "Enable automated WhatsApp reminders 24h before appointments." });
    if (metrics.outstanding > metrics.totalBilled * 0.15) recs.push({ priority: "High", title: "Pending payments high", detail: `₹${metrics.outstanding} outstanding.`, action: "Send automated payment reminders and enable UPI QR." });
    if (metrics.completionRate < 70) recs.push({ priority: "Medium", title: "Improve completion", detail: `Only ${metrics.completionRate}% completed.`, action: "Follow up cancelled/no-show within 24h." });
    if (metrics.revenueByService[0]) recs.push({ priority: "Opportunity", title: `Promote ${metrics.revenueByService[0].name}`, detail: `Top service ₹${metrics.revenueByService[0].value}.`, action: "Increase visibility and slots." });
    return { recommendations: recs.slice(0, 5), raw: "" };
  }
}
