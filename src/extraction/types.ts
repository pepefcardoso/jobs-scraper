export interface ExtractedJob {
  title: string;
  seniority: string | null;
  techStack: string[];
  applicationMethod: string | null;
  location: string;
  softSkills: string[];
  company: string;
  employmentType: string | null;
  salary: string | null;
  description: string;
  requiredQuals: string[];
  preferredQuals: string[];
  benefits: string[];
  otherMetadata: Record<string, unknown>;
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
