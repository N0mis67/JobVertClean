import { inngest } from "./client";
import { prisma } from "../db";

export const handleJobExpiration = inngest.createFunction(
  { id: "job-expiration" },
  { event: "job/created" },
  async ({ event, step }) => {
    const { jobId, expirationDays } = event.data;

    // Wait for the specified duration
    const days = Number(expirationDays);
    await step.sleep("wait-for-expiration", `${days}d`);

    // delete job post after expiration
    await step.run("delete-job-post", async () => {
      await prisma.jobPost.delete({
        where: { id: jobId },
      });
    });

    return { jobId, message: "Job supprimé" };
  }   
);