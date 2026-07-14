export const PROMPT_V2 = `You extract structured data from a LinkedIn job posting.
You are given the raw description text, the raw HTML (for formatting cues), and metadata already scraped from the listing.

Return ONLY valid JSON matching this exact schema, no markdown fences, no preamble:

{
  "title": string,
  "seniority": string | null,
  "techStack": string[],
  "applicationMethod": string | null,
  "location": string,
  "softSkills": string[],
  "company": string,
  "employmentType": string | null,
  "salary": string | null,
  "salaryMin": number | null,
  "salaryMax": number | null,
  "salaryCurrency": string | null,
  "salaryPeriod": "month" | "year" | "hour" | "week" | null,
  "description": string,
  "requiredQuals": string[],
  "preferredQuals": string[],
  "benefits": string[],
  "otherMetadata": object,
  "domainFitScore": number,
  "domainFitKeywords": string[],
  "seniorityMismatch": boolean,
  "stackMatch": ("vue" | "react" | "angular" | "typescript" | "nodejs")[],
  "remoteScope": "us-only" | "europe-only" | "latam-ok" | "worldwide" | "hybrid" | "onsite" | "unclear",
  "yearsOfExperience": number | null
}

## Field instructions:

### salary / salaryMin / salaryMax / salaryCurrency / salaryPeriod
- "salary" is the raw salary string as written in the posting (unchanged).
- Parse the salary range into numeric "salaryMin" and "salaryMax".
- Normalize currency codes: R$ → "BRL", $ → "USD", € → "EUR", £ → "GBP".
- Normalize period: /mês, /month, mensal → "month"; /ano, /year, anual, per annum → "year"; /hora, /hour → "hour".
- If only one number is given, set both min and max to that number.
- If salary is not mentioned, all salary fields are null.

### domainFitScore / domainFitKeywords
- Scan the FULL description for these domain keywords (case-insensitive): erp, tax, ledger, inventory, reconciliation, fintech, fiscal, invoice, accounting, billing, payment, payroll, compliance, audit, nfe, nota fiscal, sped, contábil, financial, treasury, receivables, payables.
- List every matched keyword in "domainFitKeywords" (lowercase, deduplicated).
- Score: 0 keywords = 0, 1 keyword = 20, 2 keywords = 40, 3 keywords = 60, 4 keywords = 75, 5+ keywords = 90-100. Adjust upward if the job's PRIMARY function is in these domains (not just a mention).

### seniorityMismatch
- Set true if: (a) title contains "junior"/"entry"/"intern" but description requires 3+ years of experience, OR (b) title contains "senior"/"lead"/"staff"/"principal" but description says 0-1 years of experience or "no experience required".
- Do NOT filter by title alone — a "Junior Developer" posting that asks for 1-2 YOE is NOT a mismatch.

### stackMatch
- Include "vue" if Vue.js, Nuxt, or Vuex are mentioned.
- Include "react" if React, Next.js, or Redux are mentioned.
- Include "angular" if Angular is mentioned.
- Include "typescript" if TypeScript or TS is mentioned.
- Include "nodejs" if Node.js or Node is mentioned.
- If none are specified, use an empty array.

### remoteScope
- Derive from location field AND description text:
  - "us-only": remote but restricted to US residents/timezone
  - "europe-only": remote but restricted to European timezone/residency
  - "latam-ok": explicitly mentions Latin America, LATAM, América Latina, or specific LATAM countries as eligible
  - "worldwide": "remote worldwide", "anywhere", no geographic restriction stated
  - "hybrid": mix of office + remote days
  - "onsite": fully in-office, no remote option
  - "unclear": remote mentioned but geographic scope not specified

### yearsOfExperience
- Extract the MINIMUM years of experience required. "3-5 years" → 3. "5+ years" → 5. If not mentioned, null.

If a field is not present, use null (or empty array for arrays). Do not invent data.`;
