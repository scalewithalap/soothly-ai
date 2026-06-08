/**
 * Email Sequences Module
 * Re-exports all sequence-related functionality
 */

// Types
export * from "./types";

// Services
export {
  listSequences,
  getSequence,
  getSequenceWithSteps,
  createSequence,
  updateSequence,
  deleteSequence,
  updateSequenceStats,
  getSteps,
  getStep,
  createStep,
  updateStep,
  deleteStep,
  reorderSteps,
} from "./service";

// Enrollments
export {
  listEnrollments,
  getEnrollment,
  getEnrollmentByEmail,
  enrollContact,
  bulkEnroll,
  pauseEnrollment,
  resumeEnrollment,
  removeEnrollment,
  completeEnrollment,
  updateEnrollmentStatus,
  advanceEnrollment,
  getPendingEnrollments,
} from "./enrollments";

// Personalization
export {
  extractVariables,
  validateContactData,
  personalizeEmail,
  personalizeEmailContent,
  generatePreview,
  createUnsubscribeLink,
  addTrackingPixel,
  wrapLinksForTracking,
} from "./personalization";
