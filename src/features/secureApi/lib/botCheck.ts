import "server-only"
import { NextResponse } from "next/server"
import { env } from "@/features/env/lib/server-vars"
import { getTranslations } from "next-intl/server"
import { ApiResponse } from "../types/apiResponses"

// Define BotCheckResult interface with response methods
interface BotCheckResult extends ApiResponse {
   apiResponse: () => NextResponse<ApiResponse>
   actionResponse: () => ApiResponse
}

// Turnstile verification URL
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

// Types for Turnstile verification result
type TurnstileResult = { ok: boolean; reason?: string; latencyMs: number }

// Options for Turnstile verification
type TurnstileOptions = { enabled?: boolean; failMode?: "allow" | "block"; timeoutMs?: number }

async function verifyTurnstileToken(token: string | null | undefined, opts?: TurnstileOptions & { ip?: string }): Promise<TurnstileResult> {
   const enabled = opts?.enabled ?? true
   const failMode = opts?.failMode ?? env.SECUREAPI_FAIL_MODE
   const timeoutMs = opts?.timeoutMs ?? env.SECUREAPI_TURNSTILE_TIMEOUT_MS

   // If disabled or no secret configured, short-circuit based on fail mode
   if (!enabled || !env.TURNSTILE_SECRET_KEY) {
      return { ok: true, reason: !enabled ? "disabled" : "no-secret", latencyMs: 0 }
   }

   if (!token) {
      if (failMode === "allow") return { ok: true, reason: "missing-token-allowed", latencyMs: 0 }
      return { ok: false, reason: "missing-token", latencyMs: 0 }
   }

   const controller = new AbortController()
   const timer = setTimeout(() => controller.abort(), timeoutMs)
   const started = Date.now()
   try {
      const body = new URLSearchParams()
      body.set("secret", env.TURNSTILE_SECRET_KEY)
      body.set("response", token)
      if (opts?.ip) body.set("remoteip", opts.ip)

      const res = await fetch(VERIFY_URL, {
         method: "POST",
         body,
         signal: controller.signal,
         headers: { "content-type": "application/x-www-form-urlencoded" },
      })
      const latencyMs = Date.now() - started
      if (!res.ok) {
         const reason = `verify_http_${res.status}`
         return failMode === "allow" ? { ok: true, reason, latencyMs } : { ok: false, reason, latencyMs }
      }
      type CfResp = { success: boolean; "error-codes"?: string[]; challenge_ts?: string; hostname?: string }
      const data: CfResp = await res.json()
      if (data.success) return { ok: true, latencyMs }
      const reason = (data["error-codes"] || []).join(",") || "verify_failed"
      return failMode === "allow" ? { ok: true, reason, latencyMs } : { ok: false, reason, latencyMs }
   } catch (err) {
      const latencyMs = Date.now() - started
      const reason = err instanceof Error ? `verify_error_${err.name}` : "verify_error_unknown"
      return failMode === "allow" ? { ok: true, reason, latencyMs } : { ok: false, reason, latencyMs }
   } finally {
      clearTimeout(timer)
   }
}

export async function assertBotCheck(turnstileToken: string): Promise<ApiResponse> {
   const result = await verifyTurnstileToken(turnstileToken)
   const success = result.ok
   const message = success ? "Bot check passed" : `Bot check failed: ${result.reason || "unknown reason"}`

   const t = await getTranslations("features.secureApi.botCheck")

   const response: ApiResponse = success
      ? { success, timestamp: new Date().toISOString() }
      : {
           success: false,
           errorCode: "BOT_CHECK_FAILED",
           toastTitle: t("failed.Title"),
           toastDescription: t("failed.Description"),
           toastType: "error",
           httpStatus: 403,
        }

   return response
}
