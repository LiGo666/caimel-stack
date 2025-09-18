export const DEFAULT_WEBHOOK_CONFIG = {
  endpoint: process.env.UPLOAD_WEBHOOK_ENDPOINT || "",
  authToken: process.env.UPLOAD_WEBHOOK_AUTH_TOKEN || "",
};
