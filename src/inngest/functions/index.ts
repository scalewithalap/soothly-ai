/**
 * Inngest Functions Index
 * Exports all background job functions for the agent system
 */

// Lead Generation Functions
import {
  handleCampaignCreated,
  enrichLeads,
  sendLeadOutreach,
} from "./lead_gen";

// SEO Content Functions
import { handleBriefCreated, generateArticle, optimizeArticleSEO } from "./seo";

// Partnership Functions
import {
  discoverPartners,
  qualifyPartner,
  sendPartnerOutreach,
} from "./partnership";

/**
 * All Inngest functions to be registered with the serve handler
 */
export const functions = [
  // Lead Generation
  handleCampaignCreated,
  enrichLeads,
  sendLeadOutreach,

  // SEO Content
  handleBriefCreated,
  generateArticle,
  optimizeArticleSEO,

  // Partnership
  discoverPartners,
  qualifyPartner,
  sendPartnerOutreach,
];
