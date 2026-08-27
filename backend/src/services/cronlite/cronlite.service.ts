import { logger } from "@/lib/logger";

/**
 * CronLite client — self-hosted cron-as-a-service (github.com/djlord-it/cronlite).
 *
 * Every job POSTs a webhook to our backend, HMAC-sHA256-signed with the
 * per-job `webhook_secret` (see `verifyCronLiteSignature` in plugins/auth.ts).
 * We use a single shared webhook secret for all jobs so one verifier covers
 * both the per-minute reminder poll and the per-appointment reminder jobs.
 *
 * API reference (djlord-it/cronlite):
 *   POST   /jobs              create a job
 *   GET    /jobs              list jobs (?name=, ?enabled=, …)
 *   GET    /jobs/{id}         job detail + recent executions
 *   PATCH  /jobs/{id}         update fields
 *   DELETE /jobs/{id}         delete a job
 *   POST   /jobs/{id}/pause   pause
 *   POST   /jobs/{id}/resume  resume
 *   POST   /jobs/{id}/trigger trigger immediately
 *
 * Create body: { name, cron_expression, timezone, webhook_url, webhook_secret, body?, headers? }
 */

const API_BASE = (process.env.CRONLITE_URL ?? "http://localhost:8080").replace(/\/$/, "");
const API_KEY = process.env.CRONLITE_API_KEY ?? "";

/** Shared HMAC secret CronLite signs every delivery with (falls back to CRON_SECRET). */
export const CRONLITE_WEBHOOK_SECRET =
  process.env.CRONLITE_WEBHOOK_SECRET ?? process.env.CRON_SECRET ?? "";

/** Backend base URL CronLite should call back on (must be reachable from the CronLite host). */
export const APP_BASE_URL = process.env.APP_URL ?? "http://localhost:3100";

export const CRONLITE_TIMEZONE = process.env.CRONLITE_TIMEZONE ?? "Asia/Kolkata";

function isConfigured(): boolean {
  return Boolean(API_KEY);
}

async function cronApi(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
      ...init?.headers,
    },
  });
}

function readErrorMessage(response: Response): Promise<string> {
  return response
    .text()
    .catch(() => "")
    .then((body) => `cronlite ${response.status} ${response.statusText}${body ? `: ${body.slice(0, 300)}` : ""}`);
}

export interface CronLiteJob {
  id: string;
  name: string;
  cron_expression: string;
  timezone: string;
  webhook_url: string;
  status?: string;
  next_run?: string;
}

export interface CreateCronLiteJobInput {
  name: string;
  cronExpression: string;
  timezone: string;
  webhookUrl: string;
}

function normalizeJobId(data: Record<string, unknown>): string {
  return String(data.id ?? data.jobId ?? data.job_id ?? "");
}

/** Creates a scheduled webhook job on CronLite. Throws on failure. */
export async function createCronLiteJob(input: CreateCronLiteJobInput): Promise<CronLiteJob> {
  const response = await cronApi("/jobs", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      cron_expression: input.cronExpression,
      timezone: input.timezone,
      webhook_url: input.webhookUrl,
      webhook_secret: CRONLITE_WEBHOOK_SECRET,
    }),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const id = normalizeJobId(data);
  if (!id) {
    throw new Error("cronlite create returned no job id");
  }
  return {
    id,
    name: input.name,
    cron_expression: input.cronExpression,
    timezone: input.timezone,
    webhook_url: input.webhookUrl,
    status: typeof data.status === "string" ? data.status : undefined,
    next_run: typeof data.next_run === "string" ? data.next_run : undefined,
  };
}

/** Lists jobs, optionally filtered by exact name. */
export async function listCronLiteJobs(name?: string): Promise<CronLiteJob[]> {
  const url = name ? `/jobs?name=${encodeURIComponent(name)}` : "/jobs";
  const response = await cronApi(url);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  const data = (await response.json()) as { jobs?: unknown[] } | unknown[];
  const raw = Array.isArray(data) ? data : (data.jobs ?? []);
  return raw.map((entry) => {
    const job = entry as Record<string, unknown>;
    return {
      id: normalizeJobId(job),
      name: String(job.name ?? ""),
      cron_expression: String(job.cron_expression ?? ""),
      timezone: String(job.timezone ?? ""),
      webhook_url: String(job.webhook_url ?? ""),
      status: typeof job.status === "string" ? job.status : undefined,
      next_run: typeof job.next_run === "string" ? job.next_run : undefined,
    };
  });
}

/** Deletes a job by id. No-op (resolved) when the job is already gone. */
export async function deleteCronLiteJob(jobId: string): Promise<void> {
  if (!jobId) return;
  const response = await cronApi(`/jobs/${encodeURIComponent(jobId)}`, { method: "DELETE" });
  if (!response.ok && response.status !== 404) {
    throw new Error(await readErrorMessage(response));
  }
}

/** Pauses a job (used when an appointment is no longer eligible for a reminder). */
export async function pauseCronLiteJob(jobId: string): Promise<void> {
  if (!jobId) return;
  const response = await cronApi(`/jobs/${encodeURIComponent(jobId)}/pause`, { method: "POST" });
  if (!response.ok && response.status !== 404) {
    throw new Error(await readErrorMessage(response));
  }
}

/** Resumes a paused job. */
export async function resumeCronLiteJob(jobId: string): Promise<void> {
  if (!jobId) return;
  const response = await cronApi(`/jobs/${encodeURIComponent(jobId)}/resume`, { method: "POST" });
  if (!response.ok && response.status !== 404) {
    throw new Error(await readErrorMessage(response));
  }
}

export type CronSyncResult = {
  jobId: string | null;
  action: "created" | "updated" | "skipped" | "not_configured";
};

/**
 * Ensures the per-minute appointment-reminder poller exists on CronLite and
 * fires every minute against POST /api/cron/reminders (HMAC-signed). Idempotent:
 * updates the matching job when present, creates it otherwise. This is the
 * safety-net scheduler; precise per-appointment jobs are managed separately.
 */
export async function syncCronJobs(): Promise<CronSyncResult> {
  if (!isConfigured()) {
    logger.warn("cronlite sync skipped (CRONLITE_API_KEY not set)");
    return { jobId: null, action: "not_configured" };
  }

  const name = process.env.CRONLITE_REMINDER_JOB_NAME ?? "myclinics-reminders";
  const webhookUrl = `${APP_BASE_URL}/api/cron/reminders`;
  const cronExpression = process.env.CRONLITE_REMINDER_CRON ?? "* * * * *";

  const matches = (await listCronLiteJobs(name)).filter((job) => job.name === name);

  // Defensive: a past bug, a manual duplicate, or a partial failure could leave
  // more than one job with the same name. Keep exactly one — delete any extras
  // so CronLite never fires the reminder poll more than once per minute.
  const [existing, ...duplicates] = matches;
  for (const dup of duplicates) {
    logger.warn("cronlite removing duplicate reminder job", { jobId: dup.id, name });
    await deleteCronLiteJob(dup.id).catch(() => {});
  }

  if (existing) {
    // Re-create with the latest config if the target or schedule moved.
    if (existing.webhook_url !== webhookUrl || existing.cron_expression !== cronExpression) {
      await deleteCronLiteJob(existing.id);
    } else {
      logger.info("cronlite reminder job already in sync", { jobId: existing.id });
      return { jobId: existing.id, action: "skipped" };
    }
  }

  try {
    const job = await createCronLiteJob({
      name,
      cronExpression,
      timezone: CRONLITE_TIMEZONE,
      webhookUrl,
    });
    logger.info("cronlite reminder job synced", { jobId: job.id, action: existing ? "updated" : "created" });
    return { jobId: job.id, action: existing ? "updated" : "created" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("cronlite reminder job sync failed", { error: message });
    // Surface the error so the caller (the /api/cron/sync route) can report it.
    throw error;
  }
}

export type CronLiteStatus =
  | "not_configured"
  | "connection_failed"
  | "authentication_failed"
  | "job_missing"
  | "duplicate_jobs"
  | "healthy";

export interface CronLiteStatusResult {
  status: CronLiteStatus;
  jobId: string | null;
  jobCount: number;
  detail?: string;
}

/**
 * Health/verification check that proves whether MyClinics can reach the
 * self-hosted CronLite API and whether the required `myclinics-reminders` job
 * exists. Distinguishes the failure modes so operators get an actionable
 * signal instead of a generic error:
 *   - not_configured     CRONLITE_API_KEY is unset
 *   - connection_failed  CronLite unreachable / network error
 *   - authentication_failed  API rejected our Bearer token (401/403)
 *   - job_missing        configured, reachable, but no reminder job exists
 *   - duplicate_jobs     more than one reminder job exists (should be exactly 1)
 *   - healthy            exactly one correctly-configured reminder job
 */
export async function getCronLiteStatus(): Promise<CronLiteStatusResult> {
  if (!isConfigured()) {
    return {
      status: "not_configured",
      jobId: null,
      jobCount: 0,
      detail: "CRONLITE_API_KEY is not set",
    };
  }

  const name = process.env.CRONLITE_REMINDER_JOB_NAME ?? "myclinics-reminders";
  const webhookUrl = `${APP_BASE_URL}/api/cron/reminders`;
  const cronExpression = process.env.CRONLITE_REMINDER_CRON ?? "* * * * *";

  let jobs: CronLiteJob[];
  try {
    jobs = (await listCronLiteJobs(name)).filter((job) => job.name === name);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // 401/403 => the API key is wrong/expired; everything else is a transport error.
    if (/\b(401|403)\b|unauthorized|forbidden|invalid.*token|api key/i.test(message)) {
      return { status: "authentication_failed", jobId: null, jobCount: 0, detail: message };
    }
    return { status: "connection_failed", jobId: null, jobCount: 0, detail: message };
  }

  if (jobs.length === 0) {
    return { status: "job_missing", jobId: null, jobCount: 0 };
  }
  if (jobs.length > 1) {
    logger.warn("cronlite status: duplicate reminder jobs detected", { count: jobs.length });
    return { status: "duplicate_jobs", jobId: jobs[0].id, jobCount: jobs.length };
  }

  const job = jobs[0];
  const drifted = job.webhook_url !== webhookUrl || job.cron_expression !== cronExpression;
  if (drifted) {
    // Exactly one job, but its target/schedule drifted. Report it as missing so
    // the next /api/cron/sync reconciles it (syncCronJobs recreates on drift).
    logger.warn("cronlite status: reminder job config drifted", {
      jobId: job.id,
      webhook_url: job.webhook_url,
      cron_expression: job.cron_expression,
    });
    return {
      status: "job_missing",
      jobId: job.id,
      jobCount: 1,
      detail: "single reminder job exists but its webhook_url/cron_expression drifted",
    };
  }

  return { status: "healthy", jobId: job.id, jobCount: 1 };
}
