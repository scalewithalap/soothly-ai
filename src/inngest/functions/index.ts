/**
 * Inngest Functions Index
 * Exports all background job functions for the agent system
 */

// Lead Generation Functions
import { handleCampaignCreated, enrichLeads } from "./leads";

// SEO Content Functions
import { handleBriefCreated, generateArticle } from "./content";

// Partnership Functions
import { discoverPartners, qualifyPartner } from "./partners";

/**
 * All Inngest functions to be registered with the serve handler
 */
export const functions = [
  // Lead Generation
  handleCampaignCreated,
  enrichLeads,

  // SEO Content
  handleBriefCreated,
  generateArticle,

  // Partnership
  discoverPartners,
  qualifyPartner,
];
