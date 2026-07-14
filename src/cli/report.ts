import { prisma } from "../db/client";
import { getArg } from "./args";

const args = process.argv.slice(2);
const weeks = getArg(args, "--weeks") ? Number(getArg(args, "--weeks")) : 1;
const threshold = getArg(args, "--threshold") ? Number(getArg(args, "--threshold")) : 60;

function getWeekStart(date: Date) {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setHours(-24 * (day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

async function main() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - weeks * 7);

  const jobs = await prisma.job.findMany({
    where: {
      scrapedAt: { gte: cutoff },
    },
    include: {
      extractions: {
        where: { schemaVersion: "v2", status: "SUCCESS" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      application: true,
    },
  });

  const weekGroups = new Map<string, typeof jobs>();
  
  for (const job of jobs) {
    const start = getWeekStart(job.scrapedAt);
    const key = start.toISOString().split("T")[0];
    if (!weekGroups.has(key)) weekGroups.set(key, []);
    weekGroups.get(key)!.push(job);
  }

  const sortedWeeks = Array.from(weekGroups.keys()).sort().reverse();

  console.log("╔══════════════════════════════════════════════════════════════════════════╗");
  console.log("║                      Weekly Job Search Report                            ║");
  console.log("╠══════════════════════════════════════════════════════════════════════════╣\n");

  for (const weekStart of sortedWeeks) {
    const weekJobs = weekGroups.get(weekStart)!;
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    const weekEnd = end.toISOString().split("T")[0];

    let extractedCount = 0;
    let domainFit = 0;
    
    let hasSalary = 0;
    const salaries: number[] = [];
    let salaryCurrency = "USD";

    const remoteScope: Record<string, number> = {};
    const stackMatch: Record<string, number> = {};
    let seniorityMismatches = 0;

    let applied = 0;
    let domainFitApplied = 0;
    const statuses: Record<string, number> = {};
    const resumes: Record<string, number> = {};

    for (const job of weekJobs) {
      if (job.application) {
        applied++;
        statuses[job.application.status] = (statuses[job.application.status] || 0) + 1;
        resumes[job.application.resumeVersion] = (resumes[job.application.resumeVersion] || 0) + 1;
      }

      if (job.extractions.length > 0) {
        extractedCount++;
        const ext = job.extractions[0].structuredData as any;
        
        const isDomainFit = ext.domainFitScore >= threshold;
        if (isDomainFit) {
          domainFit++;
          if (job.application) domainFitApplied++;
        }

        if (ext.salaryMin || ext.salaryMax) {
          hasSalary++;
          if (ext.salaryMin) salaries.push(ext.salaryMin);
          if (ext.salaryMax) salaries.push(ext.salaryMax);
          if (ext.salaryCurrency) salaryCurrency = ext.salaryCurrency;
        }

        if (ext.remoteScope) {
          remoteScope[ext.remoteScope] = (remoteScope[ext.remoteScope] || 0) + 1;
        }

        if (Array.isArray(ext.stackMatch)) {
          if (ext.stackMatch.length === 0) {
            stackMatch["none"] = (stackMatch["none"] || 0) + 1;
          } else {
            for (const stack of ext.stackMatch) {
              stackMatch[stack] = (stackMatch[stack] || 0) + 1;
            }
          }
        }

        if (ext.seniorityMismatch) seniorityMismatches++;
      }
    }

    const nonDomain = extractedCount - domainFit;
    const dfPct = extractedCount > 0 ? Math.round((domainFit / extractedCount) * 100) : 0;
    const ndPct = extractedCount > 0 ? Math.round((nonDomain / extractedCount) * 100) : 0;
    
    const dfAppPct = applied > 0 ? Math.round((domainFitApplied / applied) * 100) : 0;
    const ndAppPct = applied > 0 ? Math.round(((applied - domainFitApplied) / applied) * 100) : 0;

    const salaryMin = salaries.length > 0 ? Math.min(...salaries) : 0;
    const salaryMax = salaries.length > 0 ? Math.max(...salaries) : 0;
    const salCovPct = extractedCount > 0 ? Math.round((hasSalary / extractedCount) * 100) : 0;

    console.log(`Week of ${weekStart} → ${weekEnd}`);
    console.log("────────────────────────────────────────────────────────────────");
    console.log(`  Jobs scraped:           ${weekJobs.length} (${extractedCount} extracted)`);
    console.log(`  Domain-fit (score ≥ ${threshold}):  ${domainFit} (${dfPct}%)     Target: 70%`);
    console.log(`  Non-domain:               ${nonDomain} (${ndPct}%)     Target: 30%`);
    console.log("");
    console.log(`  Applications:            ${applied}            Target: 10-15/week`);
    if (applied > 0) {
      console.log(`    ├─ Domain-fit:          ${domainFitApplied} (${dfAppPct}%)`);
      console.log(`    └─ Non-domain:          ${applied - domainFitApplied} (${ndAppPct}%)`);
      console.log("");
      console.log("  By status:");
      for (const [s, c] of Object.entries(statuses)) console.log(`    ${s.padEnd(14)}${c}`);
      console.log("");
      console.log("  By resume version:");
      for (const [r, c] of Object.entries(resumes)) console.log(`    ${r.padEnd(18)}${c}`);
    }
    console.log("");
    console.log(`  Salary coverage:     ${hasSalary}/${extractedCount} (${salCovPct}%) had parseable salary`);
    if (salaries.length > 0) {
      console.log(`  Salary range:        ${salaryCurrency} ${salaryMin.toLocaleString()} – ${salaryMax.toLocaleString()}`);
    }
    console.log("");
    console.log("  Remote scope:");
    let rsOut = "";
    for (const [rs, c] of Object.entries(remoteScope)) {
      rsOut += `    ${rs.padEnd(14)}${c.toString().padEnd(5)}`;
      if (rsOut.length > 30) { console.log(rsOut); rsOut = ""; }
    }
    if (rsOut) console.log(rsOut);
    
    console.log("\n  Stack match:");
    let smOut = "";
    for (const [sm, c] of Object.entries(stackMatch)) {
      smOut += `    ${sm.padEnd(14)}${c.toString().padEnd(5)}`;
      if (smOut.length > 30) { console.log(smOut); smOut = ""; }
    }
    if (smOut) console.log(smOut);

    console.log(`\n  Seniority mismatches: ${seniorityMismatches} flagged`);
    console.log("────────────────────────────────────────────────────────────────\n");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error("Report failed:", err.message);
    prisma.$disconnect();
    process.exit(1);
  });
