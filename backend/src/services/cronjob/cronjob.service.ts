import { logger } from "@/lib/logger";

const API_BASE = "https://api.cron-job.org";

interface CronJobSchedule {
  timezone: string;
  expiresAt: number;
  hours: number[];
  mdays: number[];
  minutes: number[];
  months: number[];
  wdays: number[];
}

interface CronJobPayload {
  title: string;
  url: string;
  enabled: boolean;
  saveResponses: boolean;
  requestMethod: number;
  schedule: CronJobSchedule;
  extendedData: {
    headers: Record<string, string>;
    body: string;
  };
  notification: {
    onFailure: boolean;
  };
}

interface CronJobListItem {
  jobId: number;
  title?: string;
  url?: string;
}

export type CronSyncResult = {
  jobId: number | null;
  action: "created" | "updated" | "skipped";
};

function everyMinuteSchedule(timezone: string): CronJobSchedule {
  return {
    timezone,
    expiresAt: 0,
    hours: [-1],
    mdays: [-1],
    minutes: Array.from({ length: 60 }, (_, i) => i),
    months: [-1],
    wdays: [-1],
  };
}

function buildJobPayload(): CronJobPayload {
  const secret = process.env.CRON_SECRET ?? "";
  return {
    title:
      process.env.CRONJOB_JOB_TITLE ??
      "MyClinics Reminders & WhatsApp Notifications",
    url:
      process.env.CRONJOB_JOB_URL ?? "http://localhost:3100/api/cron/reminders",
    enabled: true,
    saveResponses: true,
    requestMethod: 1,
    schedule: everyMinuteSchedule(process.env.CRONJOB_TIMEZONE ?? "Asia/Kolkata"),
    extendedData: {
      headers: { "x-cron-secret": secret, "Content-Type": "application/json" },
      body: "{}",
    },
    notification: { onFailure: true },
  };
}

async function cronApi(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.CRONJOB_API_TOKEN ?? ""}`,
      ...init?.headers,
    },
  });
}

async function readError(response: Response): Promise<string> {
  const body = await response.text().catch(() => "");
  return `cron-job.org ${response.status} ${response.statusText}${body ? `: ${body.slice(0, 300)}` : ""}`;
}

/**
 * Ensures the appointment-reminder scheduler exists on cron-job.org and runs
 * every minute against POST /api/cron/reminders (authenticated via the shared
 * CRON_SECRET header). Idempotent: updates the matching job when present,
 * creates it otherwise.
 */
export async function syncCronJobs(): Promise<CronSyncResult> {
  const token = process.env.CRONJOB_API_TOKEN;
  if (!token) {
    logger.warn("cron-job.org sync skipped (CRONJOB_API_TOKEN not set)");
    return { jobId: null, action: "skipped" };
  }

  const job = buildJobPayload();

  const listResponse = await cronApi("/jobs");
  if (!listResponse.ok) {
    throw new Error(await readError(listResponse));
  }
  const listBody = (await listResponse.json()) as {
    jobs: CronJobListItem[];
  };
  const existing = listBody.jobs.find(
    (entry) => entry.title === job.title || entry.url === job.url
  );

  if (existing) {
    const updateResponse = await cronApi(`/jobs/${existing.jobId}`, {
      method: "PATCH",
      body: JSON.stringify({ job }),
    });
    if (!updateResponse.ok) {
      throw new Error(await readError(updateResponse));
    }
    logger.info("cron-job.org job updated", { jobId: existing.jobId });
    return { jobId: existing.jobId, action: "updated" };
  }

  const createResponse = await cronApi("/jobs", {
    method: "PUT",
    body: JSON.stringify({ job }),
  });
  if (!createResponse.ok) {
    throw new Error(await readError(createResponse));
  }
  const createBody = (await createResponse.json()) as { jobId: number };
  logger.info("cron-job.org job created", { jobId: createBody.jobId });
  return { jobId: createBody.jobId, action: "created" };
}
