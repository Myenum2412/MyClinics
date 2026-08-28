import { complete } from "@/services/ai/nvidia.service";
import type {
  NeoIncidentDoc,
  RootCauseAnalysis,
} from "@/neo/incidents/incident.schema";
import type { NeoEventDoc } from "@/neo/events/event.schema";
import { NvidiaConfigError } from "@/services/ai/nvidia.service";

export function classifyConfidence(
  confidence: number
): RootCauseAnalysis["classification"] {
  if (confidence >= 95) return "Very High";
  if (confidence >= 80) return "High";
  if (confidence >= 60) return "Medium";
  if (confidence >= 40) return "Low";
  return "Insufficient Evidence";
}

const DISCLAIMER =
  "AI diagnosis is advisory only. Verify against live telemetry before any remediation. RGB Neo never modifies clinical records without an authorized workflow.";

function buildPrompt(incident: NeoIncidentDoc, events: NeoEventDoc[]): string {
  const recent = events
    .slice(0, 25)
    .map(
      (e) =>
        `- [${e.severity}] ${e.eventType} on ${e.service}${e.module ? ` (${e.module})` : ""}: ${e.message ?? ""}`
    )
    .join("\n");
  return [
    "You are an SRE root-cause analysis engine for a multi-tenant clinic platform (RGB Neo).",
    "Analyze the incident and related events. Return ONLY strict JSON with no prose, no markdown fences.",
    "Schema:",
    '{',
    '  "observed": string,',
    '  "probableRootCause": string,',
    '  "evidence": string[],',
    '  "alternativeCauses": string[],',
    '  "confidence": number (0-100 integer),',
    '  "recommendedVerification": string,',
    '  "technical": string,',
    '  "business": string',
    '}',
    "",
    `Incident: ${incident.title} (severity ${incident.severity}, category ${incident.category})`,
    `Affected services: ${incident.affectedServices.join(", ")}`,
    `Business impact: ${incident.businessImpact.summary}`,
    "",
    "Related events:",
    recent || "(no additional events captured)",
  ].join("\n");
}

/**
 * Produces an AI root-cause analysis for an incident from its related events.
 * Never invents facts: if the AI provider is unavailable or returns
 * insufficient signal, it returns an explicit "Insufficient Evidence" analysis
 * rather than a fabricated root cause.
 */
export async function analyzeIncident(
  incident: NeoIncidentDoc,
  events: NeoEventDoc[]
): Promise<RootCauseAnalysis> {
  const fallback = (reason: string): RootCauseAnalysis => ({
    observed: incident.businessImpact.summary || incident.title,
    probableRootCause: "Insufficient evidence to determine the root cause.",
    evidence: [
      `Source events: ${events.length}`,
      `Category: ${incident.category}`,
    ],
    alternativeCauses: [],
    confidence: 0,
    classification: "Insufficient Evidence",
    recommendedVerification:
      "Collect logs, metrics and traces for the affected services, then re-run analysis.",
    technical: reason,
    business:
      "The system could not determine the cause from available telemetry. Monitor the affected service and gather more data.",
    disclaimer: DISCLAIMER,
  });

  try {
    const raw = await complete(
      [{ role: "user", content: buildPrompt(incident, events) }],
      { temperature: 0.2, maxTokens: 1500 }
    );
    const cleaned = raw
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned) as Partial<RootCauseAnalysis>;
    const confidence = Math.max(0, Math.min(100, Math.round(Number(parsed.confidence) || 0)));
    return {
      observed: String(parsed.observed ?? incident.title),
      probableRootCause: String(
        parsed.probableRootCause ?? "Unknown — evidence inconclusive."
      ),
      evidence: Array.isArray(parsed.evidence)
        ? parsed.evidence.map(String)
        : [],
      alternativeCauses: Array.isArray(parsed.alternativeCauses)
        ? parsed.alternativeCauses.map(String)
        : [],
      confidence,
      classification: classifyConfidence(confidence),
      recommendedVerification: String(
        parsed.recommendedVerification ?? "Verify against live telemetry."
      ),
      technical: String(parsed.technical ?? parsed.probableRootCause ?? ""),
      business: String(parsed.business ?? parsed.observed ?? ""),
      disclaimer: DISCLAIMER,
    };
  } catch (err) {
    if (err instanceof NvidiaConfigError) {
      return fallback(
        "AI provider is not configured on this environment. Configure NVIDIA_API_KEY to enable automated root-cause analysis."
      );
    }
    return fallback(
      "Automated analysis failed to produce a confident result. The raw model response could not be parsed safely."
    );
  }
}
