import { prisma } from "@/lib/db";
import { JobStatus } from "@prisma/client";

export async function startJobRun(jobName: string, userId?: string, metadataJson?: object) {
  return prisma.jobRun.create({
    data: {
      jobName,
      userId,
      status: JobStatus.running,
      startedAt: new Date(),
      metadataJson,
    },
  });
}

export async function finishJobRun(id: string, status: JobStatus, errorMessage?: string, metadataJson?: object) {
  return prisma.jobRun.update({
    where: { id },
    data: {
      status,
      finishedAt: new Date(),
      errorMessage,
      metadataJson,
    },
  });
}
