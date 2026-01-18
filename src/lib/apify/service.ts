/**
 * Unified Apify Service
 * Orchestrates multi-source lead and partner scraping using various Apify actors.
 */

import { ACTORS } from "./actors";
import { startActorRun, getActorRunStatus, getDatasetItems } from "./client";

// Source types for lead generation
export type LeadSource =
  | "linkedin"
  | "google_maps"
  | "twitter"
  | "instagram"
  | "facebook"
  | "google_search"
  | "yellow_pages";

// Source types for partner discovery
export type PartnerSource = "linkedin" | "twitter" | "instagram" | "facebook";

// Multi-source search configuration
export interface MultiSourceSearchConfig {
  sources: LeadSource[];
  query: string;
  location?: string;
  industry?: string;
  maxResultsPerSource?: number;
}

// Partner discovery configuration
export interface PartnerDiscoveryConfig {
  sources: PartnerSource[];
  industry: string;
  partnerType:
    | "affiliate"
    | "reseller"
    | "integration"
    | "referral"
    | "strategic"
    | "other";
  keywords?: string[];
  maxResultsPerSource?: number;
}

// Unified lead result
export interface UnifiedLead {
  source: LeadSource;
  name: string;
  email?: string;
  company?: string;
  title?: string;
  phone?: string;
  website?: string;
  linkedin_url?: string;
  twitter_url?: string;
  instagram_url?: string;
  facebook_url?: string;
  location?: string;
  industry?: string;
  bio?: string;
  followers?: number;
  score?: number;
  rawData?: Record<string, unknown>;
}

// Unified partner result
export interface UnifiedPartner {
  source: PartnerSource;
  name: string;
  website?: string;
  email?: string;
  type: string;
  industry?: string;
  description?: string;
  followers?: number;
  linkedin_url?: string;
  twitter_url?: string;
  social_profiles?: Record<string, string>;
  score?: number;
  rawData?: Record<string, unknown>;
}

// Actor run result
interface ActorRunResult {
  runId: string;
  source: LeadSource | PartnerSource;
  status: "pending" | "running" | "completed" | "failed";
}

/**
 * Start multi-source lead search
 * Returns run IDs for each source that can be polled for results
 */
export async function startMultiSourceLeadSearch(
  config: MultiSourceSearchConfig
): Promise<ActorRunResult[]> {
  const runs: ActorRunResult[] = [];
  const maxResults = config.maxResultsPerSource || 50;

  for (const source of config.sources) {
    try {
      const actorId = getActorForLeadSource(source);
      const input = buildLeadActorInput(source, config, maxResults);

      const runId = await startActorRun(actorId, input);

      runs.push({
        runId,
        source,
        status: "running",
      });
    } catch (error) {
      console.error(`Failed to start ${source} scraper:`, error);
      runs.push({
        runId: "",
        source,
        status: "failed",
      });
    }
  }

  return runs;
}

/**
 * Get actor ID for lead source
 */
function getActorForLeadSource(source: LeadSource): string {
  switch (source) {
    case "linkedin":
      return ACTORS.LINKEDIN_PEOPLE_SEARCH;
    case "google_maps":
      return ACTORS.GOOGLE_MAPS_SCRAPER;
    case "twitter":
      return ACTORS.TWITTER_SCRAPER;
    case "instagram":
      return ACTORS.INSTAGRAM_SCRAPER;
    case "facebook":
      return ACTORS.FACEBOOK_SCRAPER;
    case "google_search":
      return ACTORS.GOOGLE_SEARCH_SCRAPER;
    case "yellow_pages":
      return ACTORS.YELLOW_PAGES_SCRAPER;
    default:
      throw new Error(`Unknown lead source: ${source}`);
  }
}

/**
 * Build actor input based on source and config
 */
function buildLeadActorInput(
  source: LeadSource,
  config: MultiSourceSearchConfig,
  maxResults: number
): Record<string, unknown> {
  const { query, location, industry } = config;

  switch (source) {
    case "linkedin":
      return {
        searchTerms: [query],
        location: location,
        industry: industry,
        maxResults,
      };

    case "google_maps":
      return {
        searchTerms: [`${query} ${industry || ""} ${location || ""}`],
        maxCrawledPlaces: maxResults,
        language: "en",
      };

    case "twitter":
      return {
        searchTerms: [`${query} ${industry || ""}`],
        maxTweets: maxResults * 5, // Get more tweets to find unique users
        mode: "users",
      };

    case "instagram":
      return {
        search: `${query} ${industry || ""}`,
        resultsLimit: maxResults,
        resultsType: "users",
      };

    case "facebook":
      return {
        searchTerms: [`${query} ${location || ""}`],
        maxResults,
      };

    case "google_search":
      return {
        queries: [`${query} ${industry || ""} ${location || ""} email contact`],
        maxResultsPerQuery: maxResults,
      };

    case "yellow_pages":
      return {
        searchTerms: [query],
        location: location || "United States",
        maxItems: maxResults,
      };

    default:
      return { query, maxResults };
  }
}

/**
 * Normalize results from different sources to unified lead format
 */
export function normalizeLeadResults(
  source: LeadSource,
  rawResults: Record<string, unknown>[]
): UnifiedLead[] {
  switch (source) {
    case "linkedin":
      return rawResults.map((r) => ({
        source: "linkedin" as const,
        name: String(r.fullName || r.name || ""),
        email: String(r.email || ""),
        company: String(r.company || r.companyName || ""),
        title: String(r.title || r.position || ""),
        linkedin_url: String(r.profileUrl || r.url || ""),
        location: String(r.location || ""),
        rawData: r,
      }));

    case "google_maps":
      return rawResults.map((r) => ({
        source: "google_maps" as const,
        name: String(r.title || r.name || ""),
        phone: String(r.phone || ""),
        website: String(r.website || ""),
        location: String(r.address || r.location || ""),
        rawData: r,
      }));

    case "twitter":
      return rawResults.map((r) => ({
        source: "twitter" as const,
        name: String(r.name || r.userName || ""),
        twitter_url: `https://twitter.com/${r.userName || r.screenName}`,
        bio: String(r.bio || r.description || ""),
        followers: Number(r.followersCount || r.followers || 0),
        location: String(r.location || ""),
        rawData: r,
      }));

    case "instagram":
      return rawResults.map((r) => ({
        source: "instagram" as const,
        name: String(r.fullName || r.name || ""),
        instagram_url: String(r.profileUrl || r.url || ""),
        bio: String(r.biography || r.bio || ""),
        followers: Number(r.followersCount || r.followers || 0),
        rawData: r,
      }));

    case "facebook":
      return rawResults.map((r) => ({
        source: "facebook" as const,
        name: String(r.name || r.title || ""),
        facebook_url: String(r.url || r.profileUrl || ""),
        website: String(r.website || ""),
        phone: String(r.phone || ""),
        rawData: r,
      }));

    case "google_search":
      return rawResults.map((r) => ({
        source: "google_search" as const,
        name: String(r.title || ""),
        website: String(r.url || r.link || ""),
        rawData: r,
      }));

    case "yellow_pages":
      return rawResults.map((r) => ({
        source: "yellow_pages" as const,
        name: String(r.name || r.businessName || ""),
        phone: String(r.phone || ""),
        website: String(r.website || ""),
        location: String(r.address || ""),
        rawData: r,
      }));

    default:
      return [];
  }
}

/**
 * Start partner discovery across social platforms
 */
export async function startPartnerDiscovery(
  config: PartnerDiscoveryConfig
): Promise<ActorRunResult[]> {
  const runs: ActorRunResult[] = [];
  const maxResults = config.maxResultsPerSource || 30;

  // Build search keywords for partner discovery
  const searchKeywords = [
    `${config.industry} ${config.partnerType} program`,
    `${config.industry} affiliate`,
    `${config.industry} partnership`,
    ...(config.keywords || []),
  ];

  for (const source of config.sources) {
    try {
      const actorId = getActorForPartnerSource(source);
      const input = buildPartnerActorInput(source, searchKeywords, maxResults);

      const runId = await startActorRun(actorId, input);

      runs.push({
        runId,
        source,
        status: "running",
      });
    } catch (error) {
      console.error(`Failed to start ${source} partner scraper:`, error);
      runs.push({
        runId: "",
        source,
        status: "failed",
      });
    }
  }

  return runs;
}

/**
 * Get actor ID for partner source
 */
function getActorForPartnerSource(source: PartnerSource): string {
  switch (source) {
    case "linkedin":
      return ACTORS.LINKEDIN_COMPANY_SEARCH;
    case "twitter":
      return ACTORS.TWITTER_SCRAPER;
    case "instagram":
      return ACTORS.INSTAGRAM_SCRAPER;
    case "facebook":
      return ACTORS.FACEBOOK_SCRAPER;
    default:
      throw new Error(`Unknown partner source: ${source}`);
  }
}

/**
 * Build partner actor input
 */
function buildPartnerActorInput(
  source: PartnerSource,
  keywords: string[],
  maxResults: number
): Record<string, unknown> {
  switch (source) {
    case "linkedin":
      return {
        searchTerms: keywords,
        maxResults,
      };

    case "twitter":
      return {
        searchTerms: keywords.map((k) => `${k} affiliate OR partner`),
        maxTweets: maxResults * 3,
        mode: "users",
      };

    case "instagram":
      return {
        search: keywords.join(" "),
        resultsLimit: maxResults,
        resultsType: "users",
      };

    case "facebook":
      return {
        searchTerms: keywords,
        maxResults,
      };

    default:
      return { keywords, maxResults };
  }
}

/**
 * Normalize partner results from different sources
 */
export function normalizePartnerResults(
  source: PartnerSource,
  rawResults: Record<string, unknown>[]
): UnifiedPartner[] {
  switch (source) {
    case "linkedin":
      return rawResults.map((r) => ({
        source: "linkedin" as const,
        name: String(r.name || r.companyName || ""),
        website: String(r.website || ""),
        industry: String(r.industry || ""),
        description: String(r.description || r.about || ""),
        linkedin_url: String(r.url || r.profileUrl || ""),
        type: "potential",
        rawData: r,
      }));

    case "twitter":
      return rawResults.map((r) => ({
        source: "twitter" as const,
        name: String(r.name || r.userName || ""),
        twitter_url: `https://twitter.com/${r.userName || r.screenName}`,
        description: String(r.bio || r.description || ""),
        followers: Number(r.followersCount || 0),
        type: "influencer",
        rawData: r,
      }));

    case "instagram":
      return rawResults.map((r) => ({
        source: "instagram" as const,
        name: String(r.fullName || r.name || ""),
        description: String(r.biography || ""),
        followers: Number(r.followersCount || 0),
        social_profiles: {
          instagram: String(r.profileUrl || r.url || ""),
        },
        type: "influencer",
        rawData: r,
      }));

    case "facebook":
      return rawResults.map((r) => ({
        source: "facebook" as const,
        name: String(r.name || ""),
        website: String(r.website || ""),
        description: String(r.about || r.description || ""),
        social_profiles: {
          facebook: String(r.url || ""),
        },
        type: "business",
        rawData: r,
      }));

    default:
      return [];
  }
}

/**
 * Get results from a completed actor run
 */
export async function getScrapingResults(
  runId: string
): Promise<Record<string, unknown>[]> {
  try {
    const status = await getActorRunStatus(runId);
    if (status.status !== "SUCCEEDED" || !status.datasetId) {
      return [];
    }
    return await getDatasetItems(status.datasetId);
  } catch (error) {
    console.error(`Failed to get results for run ${runId}:`, error);
    return [];
  }
}

