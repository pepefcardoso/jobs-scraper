export interface ExtractedJob {
  title: string;
  seniority: string | null;
  techStack: string[];
  applicationMethod: string | null;
  location: string;
  softSkills: string[];
  company: string;
  employmentType: string | null;
  salary: string | null;           // kept for backward compat in v1 extractions
  salaryMin: number | null;        // parsed numeric minimum
  salaryMax: number | null;        // parsed numeric maximum
  salaryCurrency: string | null;   // e.g. "BRL", "USD", "EUR"
  salaryPeriod: string | null;     // "month" | "year" | "hour" | "week"
  description: string;
  requiredQuals: string[];
  preferredQuals: string[];
  benefits: string[];
  otherMetadata: Record<string, unknown>;
  domainFitScore: number;          // 0-100, keyword density for ERP/fintech/tax
  domainFitKeywords: string[];     // which domain keywords were found
  seniorityMismatch: boolean;      // title says "junior" but 3+ YOE required, or inverse
  stackMatch: ("vue" | "react" | "angular" | "typescript" | "nodejs")[];
  remoteScope: "us-only" | "europe-only" | "latam-ok" | "worldwide" | "hybrid" | "onsite" | "unclear";
  yearsOfExperience: number | null; // extracted min YOE requirement
}

export interface ExtractionInput {
  rawHtml: string;
  rawText: string;
  listMeta: Record<string, unknown>;
}

export interface ExtractionProvider {
  name: string;
  model: string;
  extract(input: ExtractionInput): Promise<ExtractedJob>;
}
