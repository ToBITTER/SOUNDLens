import { JOB_NAMES } from "@/lib/jobs/constants";
import { acquireJobLock } from "@/server/locks/job-locks";
import { finishJobRun, startJobRun } from "@/server/services/job-run.service";
import { JobStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { syncUserRecentlyPlayed } from "@/server/services/listening-sync.service";

export async function syncRecentlyPlayedJob(userId?: string) {
  const lockKey = userId ?? "global";
  const locked = await acquireJobLock(JOB_NAMES.syncRecentlyPlayed, lockKey, 25);
  if (!locked) return { skipped: true };

  const run = await startJobRun(JOB_NAMES.syncRecentlyPlayed, userId, { scope: lockKey });

  try {
    if (userId) {
      const result = await syncUserRecentlyPlayed(userId);
      await finishJobRun(run.id, JobStatus.success, undefined, result);
      return { skipped: false, success: true, ...result };
    }

    const users = await prisma.user.findMany({
      select: { id: true },
      where: { deletedAt: null },
    });

    let totalInserted = 0;
    for (const user of users) {
      const result = await syncUserRecentlyPlayed(user.id);
      totalInserted += result.insertedCount;
    }

    await finishJobRun(run.id, JobStatus.success, undefined, { insertedCount: totalInserted });
    return { skipped: false, success: true, insertedCount: totalInserted };
  } catch (error) {
    await finishJobRun(run.id, JobStatus.failed, error instanceof Error ? error.message : "Unknown error");
    throw error;
  }
}
