export interface ListMeta {
  title: string;
  company: string;
  location: string;
  badges: string[];
  applicantInfo?: string;
}

export interface ScrapedJob {
  linkedinJobId: string;
  searchUrl: string;
  scrapedAt: Date;
  rawHtml: string;
  rawText: string;
  listMeta: ListMeta;
}
