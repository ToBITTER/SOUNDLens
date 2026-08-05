import { prisma } from "@/lib/db";

export async function acquireJobLock(jobName: string, lockKey: string, ttlMinutes = 30) {
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  try {
    await prisma.jobLock.create({
      data: {
        jobName,
        lockKey,
        expiresAt,
      },
    });
    return true;
  } catch {
    const existing = await prisma.jobLock.findUnique({
      where: {
        jobName_lockKey: {
          jobName,
          lockKey,
        },
      },
    });

    if (!existing) return false;
    if (existing.expiresAt < new Date()) {
      await prisma.jobLock.update({
        where: { jobName_lockKey: { jobName, lockKey } },
        data: { expiresAt },
      });
      return true;
    }

    return false;
  }
}
