import { prisma } from "../db/client";
import { getArg } from "./args";

const args = process.argv.slice(2);
const list = args.includes("--list");

async function main() {
  if (list) {
    const status = getArg(args, "--status");
    const since = getArg(args, "--since");

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (since) {
      const match = since.match(/^(\d+)d$/);
      if (match) {
        const days = parseInt(match[1], 10);
        const date = new Date();
        date.setDate(date.getDate() - days);
        where.appliedAt = { gte: date };
      }
    }

    const applications = await prisma.application.findMany({
      where,
      include: { job: true },
      orderBy: { appliedAt: "desc" },
    });

    console.log("Recent Applications:");
    console.table(
      applications.map((a) => ({
        ID: a.id,
        Job: a.job.linkedinJobId,
        Status: a.status,
        AppliedAt: a.appliedAt.toISOString().split("T")[0],
        Resume: a.resumeVersion,
      }))
    );
    return;
  }

  const linkedinJobId = getArg(args, "--job-id");
  const resumeVersion = getArg(args, "--resume");
  const statusArg = getArg(args, "--status");

  if (!linkedinJobId) {
    console.error(
      "Usage:\n  pnpm apply --job-id <id> --resume <version>\n  pnpm apply --job-id <id> --status <status>\n  pnpm apply --list [--status <status>] [--since <days>d]"
    );
    process.exit(1);
  }

  const job = await prisma.job.findUnique({ where: { linkedinJobId } });
  if (!job) {
    console.error(`Job with linkedinJobId ${linkedinJobId} not found.`);
    process.exit(1);
  }

  const existing = await prisma.application.findUnique({
    where: { jobId: job.id },
  });

  if (existing) {
    const updateData: any = {};
    if (resumeVersion) updateData.resumeVersion = resumeVersion;
    if (statusArg) updateData.status = statusArg;

    const updated = await prisma.application.update({
      where: { jobId: job.id },
      data: updateData,
    });
    console.log("Application updated:", updated);
  } else {
    if (!resumeVersion) {
      console.error(
        "Creating new application requires --resume <version>."
      );
      process.exit(1);
    }

    const created = await prisma.application.create({
      data: {
        jobId: job.id,
        resumeVersion,
        status: (statusArg as any) ?? "APPLIED",
      },
    });
    console.log("Application created:", created);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error("Apply failed:", err.message);
    prisma.$disconnect();
    process.exit(1);
  });
