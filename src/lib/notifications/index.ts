export {
  sendNotification,
  sendBulkNotification,
  notifyAgentCompletion,
  notifyAgentError,
  type NotificationChannel,
  type NotificationConfig,
  type NotificationRecipient,
  type NotificationOptions,
  type NotificationResult,
  type ChannelResult,
} from "./service";

export {
  sendDiscordNotification,
  sendSlackNotification,
  sendTelegramNotification,
  createJiraIssue,
} from "./providers";

export {
  getUserNotificationPreferences,
  getOrgOwnerNotificationPreferences,
  type UserNotificationPreferences,
} from "./settings";
