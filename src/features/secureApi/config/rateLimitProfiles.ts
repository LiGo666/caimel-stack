export type RateLimitScenarioType =
  | "SECURE_ENDPOINTS"
  | "GENERAL_ENDPOINTS"
  | "TESTING_ENVIRONMENT";

export interface RateLimitProfile {
  points: number; // Points consumed per request
  duration: number; // Duration of the rate limit window in seconds
  blockDuration: number; // Block duration in seconds when limit is exceeded
}

export const rateLimitProfiles: Record<
  RateLimitScenarioType,
  RateLimitProfile
> = {
  SECURE_ENDPOINTS: { points: 10, duration: 60, blockDuration: 300 },
  GENERAL_ENDPOINTS: { points: 20, duration: 60, blockDuration: 300 },
  TESTING_ENVIRONMENT: { points: 50, duration: 60, blockDuration: 300 },
};
