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

// Proposal Generator Functions
import {
  createFullProposal,
  analyzeProspect,
  generateProposal,
} from "./proposal";

// Customer Success Functions
import { handleTicketCreated, processTicket } from "./customer_success";

// Revenue Recovery Functions
import {
  handlePaymentFailed,
  retryPayment,
  handleCardUpdated,
} from "./revenue_recovery";

// Onboarding Functions
import { handleUserCreated, checkProgress, completeTask } from "./onboarding";

// Competitor Intel Functions
import {
  dailyCompetitorScan,
  scanOrgCompetitors,
  addCompetitor,
} from "./competitor_intel";

// Superagent Functions
import { planCampaign, executeCampaign, cancelCampaign } from "./superagent";

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

  // Proposal Generator
  createFullProposal,
  analyzeProspect,
  generateProposal,

  // Customer Success
  handleTicketCreated,
  processTicket,

  // Revenue Recovery
  handlePaymentFailed,
  retryPayment,
  handleCardUpdated,

  // Onboarding
  handleUserCreated,
  checkProgress,
  completeTask,

  // Competitor Intel
  dailyCompetitorScan,
  scanOrgCompetitors,
  addCompetitor,

  // Superagent
  planCampaign,
  executeCampaign,
  cancelCampaign,
];
