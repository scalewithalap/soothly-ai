/**
 * Apify Actor Configurations
 * Pre-configured actors for lead scraping, enrichment, and partner discovery
 */

import { runActor } from "./client";

// ============================================
// ACTOR IDS - Popular Apify actors
// ============================================

export const ACTORS = {
  // Lead Scraping
  LINKEDIN_PEOPLE_SEARCH: "johnvc/linkedin-people-search-api",
  GOOGLE_MAPS_SCRAPER: "compass/crawler-google-places",
  YELLOW_PAGES_SCRAPER: "epctex/yellowpages-scraper",

  // Social Media Scraping
  TWITTER_SCRAPER: "apidojo/tweet-scraper",
  INSTAGRAM_SCRAPER: "apify/instagram-scraper",
  FACEBOOK_SCRAPER: "apify/facebook-pages-scraper",

  // Web Search
  GOOGLE_SEARCH_SCRAPER: "apify/google-search-scraper",

  // Lead/Company Enrichment
  COMPANY_INFO_SCRAPER: "tri_angle/company-info-extractor",
  LINKEDIN_PROFILE_SCRAPER: "anchor/linkedin-profile-scraper",
  EMAIL_FINDER: "curious_coder/email-finder",

  // Partner Discovery (LinkedIn Companies)
  LINKEDIN_COMPANY_SCRAPER: "anchor/linkedin-company-scraper",
  LINKEDIN_COMPANY_SEARCH: "curious_coder/linkedin-company-search",
} as const;

// ============================================
// LEAD SCRAPING
// ============================================

export interface LeadScrapingInput {
  keywords?: string[];
  jobTitles?: string[];
  locations?: string[];
  industries?: string[];
  companySize?: string;
  maxResults?: number;
}

export interface ScrapedLead {
  name: string;
  title?: string;
  company?: string;
  companyUrl?: string;
  linkedinUrl?: string;
  location?: string;
  email?: string;
  phone?: string;
  profileImage?: string;
  summary?: string;
}

/**
 * Scrape leads from LinkedIn based on search criteria
 */
export async function scrapeLinkedInLeads(
  input: LeadScrapingInput
): Promise<ScrapedLead[]> {
  // The actor takes single strings, so list criteria are combined
  const actorInput = {
    keywords:
      [...(input.keywords || []), ...(input.industries || [])].join(" ") ||
      undefined,
    jobTitle: (input.jobTitles || []).join(" OR ") || undefined,
    location: input.locations?.[0],
    maxResults: input.maxResults || 50,
  };

  const results = await runActor<{
    fullName: string;
    headline: string;
    currentTitle: string;
    currentCompany: string;
    currentCompanyUrl: string;
    profileUrl: string;
    locationLocality: string;
    locationCountry: string;
    profilePhotoUrl: string;
    about: string;
    errorMessage?: string;
  }>(ACTORS.LINKEDIN_PEOPLE_SEARCH, actorInput, { timeoutSecs: 600 });

  return results
    .filter((r) => !r.errorMessage)
    .map((r) => ({
      name: r.fullName,
      title: r.currentTitle || r.headline,
      company: r.currentCompany,
      companyUrl: r.currentCompanyUrl,
      linkedinUrl: r.profileUrl,
      location: [r.locationLocality, r.locationCountry]
        .filter(Boolean)
        .join(", "),
      profileImage: r.profilePhotoUrl,
      summary: r.about,
    }));
}

/**
 * Scrape local business leads from Google Maps
 */
export async function scrapeGoogleMapsLeads(
  query: string,
  location: string,
  maxResults: number = 50
): Promise<ScrapedLead[]> {
  const actorInput = {
    searchStringsArray: [query],
    locationQuery: location,
    maxCrawledPlacesPerSearch: maxResults,
    language: "en",
  };

  const results = await runActor<{
    title: string;
    categoryName: string;
    address: string;
    website: string;
    phone: string;
    url: string;
  }>(ACTORS.GOOGLE_MAPS_SCRAPER, actorInput, { timeoutSecs: 600 });

  return results.map((r) => ({
    name: r.title,
    title: r.categoryName,
    company: r.title,
    companyUrl: r.website,
    location: r.address,
    phone: r.phone,
    linkedinUrl: r.url, // Google Maps URL in this case
  }));
}

// ============================================
// LEAD ENRICHMENT
// ============================================

export interface EnrichmentInput {
  name?: string;
  company?: string;
  linkedinUrl?: string;
  domain?: string;
}

export interface EnrichedLeadData {
  // Contact info
  email?: string;
  phone?: string;

  // Company info
  companyDescription?: string;
  companySize?: string;
  industry?: string;
  foundedYear?: number;
  revenue?: string;
  headquarters?: string;
  website?: string;

  // Social profiles
  linkedinUrl?: string;
  twitterUrl?: string;

  // Additional data
  technologies?: string[];
  keywords?: string[];
}

/**
 * Enrich lead data using company domain
 */
export async function enrichLeadByDomain(
  domain: string
): Promise<EnrichedLeadData> {
  const results = await runActor<{
    name: string;
    description: string;
    employees: string;
    industry: string;
    founded: number;
    revenue: string;
    headquarters: string;
    website: string;
    linkedin: string;
    twitter: string;
    technologies: string[];
  }>(ACTORS.COMPANY_INFO_SCRAPER, { domains: [domain] }, { timeoutSecs: 120 });

  if (results.length === 0) {
    return {};
  }

  const r = results[0];
  return {
    companyDescription: r.description,
    companySize: r.employees,
    industry: r.industry,
    foundedYear: r.founded,
    revenue: r.revenue,
    headquarters: r.headquarters,
    website: r.website,
    linkedinUrl: r.linkedin,
    twitterUrl: r.twitter,
    technologies: r.technologies,
  };
}

/**
 * Find email for a person at a company
 */
export async function findEmail(
  name: string,
  company: string,
  domain?: string
): Promise<string | null> {
  const results = await runActor<{
    email: string;
    confidence: number;
  }>(
    ACTORS.EMAIL_FINDER,
    {
      firstName: name.split(" ")[0],
      lastName: name.split(" ").slice(1).join(" "),
      company,
      domain,
    },
    { timeoutSecs: 60 }
  );

  if (results.length === 0) {
    return null;
  }

  // Return highest confidence email
  const sortedByConfidence = results.sort(
    (a, b) => b.confidence - a.confidence
  );
  return sortedByConfidence[0]?.email || null;
}

/**
 * Enrich lead by LinkedIn profile URL
 */
export async function enrichByLinkedIn(
  linkedInUrl: string
): Promise<EnrichedLeadData> {
  const results = await runActor<{
    email: string;
    phone: string;
    company: {
      name: string;
      industry: string;
      size: string;
      website: string;
    };
    linkedinUrl: string;
    twitterUrl: string;
  }>(
    ACTORS.LINKEDIN_PROFILE_SCRAPER,
    { profileUrls: [linkedInUrl] },
    {
      timeoutSecs: 120,
    }
  );

  if (results.length === 0) {
    return {};
  }

  const r = results[0];
  return {
    email: r.email,
    phone: r.phone,
    industry: r.company?.industry,
    companySize: r.company?.size,
    website: r.company?.website,
    linkedinUrl: r.linkedinUrl,
    twitterUrl: r.twitterUrl,
  };
}

// ============================================
// PARTNER DISCOVERY
// ============================================

export interface PartnerDiscoveryInput {
  industry: string;
  keywords?: string[];
  locations?: string[];
  companySize?: string;
  maxResults?: number;
}

export interface DiscoveredPartner {
  name: string;
  description?: string;
  website?: string;
  linkedinUrl?: string;
  industry?: string;
  companySize?: string;
  headquarters?: string;
  foundedYear?: number;
  specialties?: string[];
}

/**
 * Discover potential partners by searching LinkedIn companies
 */
export async function discoverPartnersOnLinkedIn(
  input: PartnerDiscoveryInput
): Promise<DiscoveredPartner[]> {
  const searchQuery = [input.industry, ...(input.keywords || [])].join(" ");

  const actorInput = {
    searchQuery,
    locations: input.locations || [],
    companySizes: input.companySize ? [input.companySize] : [],
    maxItems: input.maxResults || 30,
  };

  const results = await runActor<{
    name: string;
    description: string;
    websiteUrl: string;
    linkedinUrl: string;
    industry: string;
    companySize: string;
    headquarters: string;
    foundedYear: number;
    specialties: string[];
  }>(ACTORS.LINKEDIN_COMPANY_SEARCH, actorInput, { timeoutSecs: 600 });

  return results.map((r) => ({
    name: r.name,
    description: r.description,
    website: r.websiteUrl,
    linkedinUrl: r.linkedinUrl,
    industry: r.industry,
    companySize: r.companySize,
    headquarters: r.headquarters,
    foundedYear: r.foundedYear,
    specialties: r.specialties,
  }));
}

/**
 * Get detailed info about a specific LinkedIn company
 */
export async function getCompanyDetails(
  linkedInCompanyUrl: string
): Promise<DiscoveredPartner | null> {
  const results = await runActor<{
    name: string;
    description: string;
    websiteUrl: string;
    linkedinUrl: string;
    industry: string;
    companySize: string;
    headquarters: string;
    foundedYear: number;
    specialties: string[];
  }>(
    ACTORS.LINKEDIN_COMPANY_SCRAPER,
    { companyUrls: [linkedInCompanyUrl] },
    { timeoutSecs: 120 }
  );

  if (results.length === 0) {
    return null;
  }

  const r = results[0];
  return {
    name: r.name,
    description: r.description,
    website: r.websiteUrl,
    linkedinUrl: r.linkedinUrl,
    industry: r.industry,
    companySize: r.companySize,
    headquarters: r.headquarters,
    foundedYear: r.foundedYear,
    specialties: r.specialties,
  };
}

