export const PROMPT_V1 = `You extract structured data from a LinkedIn job posting.
You are given the raw description text, the raw HTML (for formatting cues), and metadata already scraped from the listing (title/company/location as shown in the list view — use these to fill gaps).

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
  "description": string,
  "requiredQuals": string[],
  "preferredQuals": string[],
  "benefits": string[],
  "otherMetadata": object
}

If a field is not present, use null (or empty array for arrays). Do not invent data.`;