import { JOB_NAMES } from "@/lib/jobs/constants";
import { acquireJobLock } from "@/server/locks/job-locks";
import { finishJobRun, startJobRun } from "@/server/services/job-run.service";
import { JobStatus } from "@prisma/client";

export async function syncRecentlyPlayedJob(userId?: string) {
  const lockKey = userId ?? "global";
  const locked = await acquireJobLock(JOB_NAMES.syncRecentlyPlayed, lockKey, 25);
  if (!locked) return { skipped: true };

  const run = await startJobRun(JOB_NAMES.syncRecentlyPlayed, userId, { scope: lockKey });

  try {
    await finishJobRun(run.id, JobStatus.success, undefined, { completed: true });
    return { skipped: false, success: true };
  } catch (error) {
    await finishJobRun(run.id, JobStatus.failed, error instanceof Error ? error.message : "Unknown error");
    throw error;
  }
}
