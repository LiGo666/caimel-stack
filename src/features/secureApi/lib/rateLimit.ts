import "server-only";
import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { redis } from "@/features/redis";
import {
  type RateLimitScenarioType,
  rateLimitProfiles,
} from "../config/rateLimitProfiles";
import type { ApiResponse } from "../types/apiResponses";

async function getContextInfos() {
  const session = await auth();
  const userId = session.userId;
  const headersList = await headers();
  const userAgent = headersList.get("user-agent") || "unknown";
  const referrer = headersList.get("referer") || "unknown";
  const ip =
    headersList.get("cf-connecting-ip") ||
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headersList.get("x-real-ip") ||
    "unknown_ip";
  const country = headersList.get("cf-ipcountry") || "unknown_country";
  const method =
    headersList.get("x-invoke-method") ||
    headersList.get("method") ||
    "unknown_method";
  const path =
    headersList.get("x-invoke-path") ||
    headersList.get("next-url") ||
    "unknown_path";
  const apiKey = headersList.get("x-api-key") || "no_api_key";

  let rateLimitKey: string;
  if (userId) {
    rateLimitKey = `ratelimit:user:${userId}`;
  } else {
    const uaFingerprint =
      userAgent
        .split(" ")
        .slice(0, 2)
        .join("_")
        .replace(/[^a-zA-Z0-9_-]/g, "") || "unknown_ua";
    rateLimitKey = `ratelimit:anon:ip_${ip}:ua_${uaFingerprint}`;
  }

  return {
    userId,
    userAgent,
    referrer,
    ip,
    country,
    method,
    path,
    apiKey,
    rateLimitKey,
  };
}

export async function assertRatelimit<T extends Record<string, any> = {}>(
  scenarioType: RateLimitScenarioType
): Promise<ApiResponse<T>> {
  if (!redis) {
    throw new Error(
      "Redis client not initialized. Ensure Redis feature is configured."
    );
  }

  const t = await getTranslations("features.secureApi.rateLimit");
  const context = await getContextInfos();
  const rateLimitKey = context.rateLimitKey;

  const config = rateLimitProfiles[scenarioType];

  const now = Date.now();
  const windowMs = config.duration * 1000;
  const windowStart = now - windowMs;
  const redisKey = `ratelimit:${scenarioType}:${rateLimitKey}`;

  try {
    await redis.zAdd(redisKey, { score: now, value: now.toString() });
    await redis.zRemRangeByScore(redisKey, 0, windowStart);
    const requestCount = (await redis.zCard(redisKey)) || 0;
    await redis.expire(redisKey, Math.ceil(config.duration * 1.5));

    const allowed = requestCount <= config.points;
    // const remaining = allowed ? config.points - requestCount : 0
    // const reset = Math.ceil((windowStart + windowMs - now) / 1000)

    const baseResponse: ApiResponse<T> = allowed
      ? ({ success: true } as ApiResponse<T>)
      : ({
          success: false,
          errorCode: "RATE_LIMIT_EXCEEDED",
          toastType: "error",
          toastTitle: t("exceeded.title"),
          toastDescription: t("exceeded.description"),
          timestamp: new Date().toISOString(),
          httpStatus: 429,
        } as ApiResponse<T>);

    return baseResponse;
  } catch (error) {
    const errorResponse: ApiResponse<T> = {
      success: false,
      errorCode: "ERROR-025594",
      toastType: "error",
      toastTitle: t("checkFailed"),
      toastDescription: t("checkFailedDescription"),
      timestamp: new Date().toISOString(),
      httpStatus: 500,
    };
    return errorResponse;
  }
}
