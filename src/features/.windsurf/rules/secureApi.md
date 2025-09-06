---
trigger: model_decision
description: This rule must be applied whenever a server action is created or a page.tsx or component that uses this action
---

# SecureApi Rules

The secureApi feature provides standardized security checks for API endpoints and server actions, tightly integrated with the Toast notification system.

## Core Functionality

### Rate Limiting (assertRatelimit)

Purpose: Prevent abuse by limiting request frequency per user/IP.

Implementation:

Redis sliding window.

Identity:

Authenticated: user ID.

Anonymous: fingerprint of IP + (shortened) User-Agent.

Profiles:

SECURE_ENDPOINTS: 10 req / 60s, block 5m

GENERAL_ENDPOINTS: 20 req / 60s, block 5m

TESTING_ENVIRONMENT: 50 req / 60s, block 5m

## Implementation Template for action.ts

"use server"

import { getTranslations } from "next-intl/server" import { ApiResponse } from "@/secureApi" import { assertRatelimit } from "@/secureApi" import { unexpectedErrorToastContent } from "@/toast/lib/unexpectedErrorToastContent"

export async function someAction(someInput: string): Promise<ApiResponse<any>> { const t = await getTranslations("app.timeout-tester.action-example") const tGeneric = await getTranslations("generic")

try { const rateLimitResult = await assertRatelimit("GENERAL_ENDPOINTS") if (!rateLimitResult.success) return rateLimitResult

      // .. do something with someInput

      const resultData = `something ${someInput}`

      // possible response

if (someCondition === "minimal") { return { success: true, data: { message: resultData }, } } else if (someCondition === "withToast") { return { success: true, data: { message: resultData }, toastTitle: t("success.title"), toastDescription: t("success.description"), toastType: "success", } } else { return { success: false, errorCode: "ERROR-400001", toastTitle: t("error.title"), toastDescription: t("error.description"), toastType: "error", } }

} catch { return unexpectedErrorToastContent(tGeneric, "ERROR-100002") } }

## Rules to Adopt the Template for action.ts

- Guards first (unchanged on failure): Call assertRatelimit("PROFILE") at the top. If it returns success: false, return it as-is. Add assertBotCheck(…) where relevant.

- Success output (normative): success: true, data: Result, timestamp (ISO), toastTitle, toastDescription, toastType: "success".

- Error output (normative): success: false, errorCode: "ERROR-XXXXXX", timestamp (ISO), toastTitle, toastDescription, toastType: "error". Optional: httpStatus, headers.

- Internationalization: All user-visible text via next-intl; use feature-scoped keys (e.g., features.secureApi.\* or your feature namespace).

- Client handling (pages/components): Always toastify(response); then branch on response.success.

If true: read documented fields from response.data.

If false: display response.toastDescription (and optionally surface response.errorCode). Guard failures (rate-limit/bot-check) are returned unchanged and handled the same.

## Implementation template for page.tsx that if it uses "use client"

"use client"

import { useState } from "react" import { useTranslations } from "next-intl" import { someAction } from "./action" import { toastify } from "@/toast/index.client" import { unexpectedErrorToastContent } from "@/toast/lib/unexpectedErrorToastContent"

export default function ExamplePage() { const t = useTranslations("app.path-to-page") // i18n for this page const [input, setInput] = useState("") const [isLoading, setIsLoading] = useState(false) const [result, setResult] = useState<string | null>(null)

async function handleClick() { setIsLoading(true) setResult(null)

    try {
      const res = await someAction(input)
      toastify(res) // standardized ApiResponse toast

      if (res.success) {
        setResult(res.data?.message ?? t("fallbackSuccess"))
      } else {
        setResult(res.toastDescription ?? t("fallbackError"))
      }
    } catch {
      // Generic, i18n-ready error payload + toast
      toastify( unexpectedErrorToastContent(t, "ERROR-100003") )
      setResult(err.toastDescription ?? t("fallbackError"))
    } finally {
      setIsLoading(false)
    }

}

return ( <main style={{ padding: 16 }}> <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("inputPlaceholder")} disabled={isLoading} /> <button onClick={handleClick} disabled={isLoading} style={{ marginLeft: 8 }}> {isLoading ? t("working") : t("runAction")} </button> {result && <p style={{ marginTop: 12 }}>{result}</p>} </main> ) }

## Rules to adopt the template for page.tsx

- Translation namespace: change useTranslations("app.path-to-page") to your page’s namespace and adjust the keys (inputPlaceholder, working, runAction, fallbackSuccess, fallbackError).

- Action import/name: swap someAction (and its import path) for your actual action(s).

- Action input: replace the single input string with whatever your action expects (multiple fields, numbers, objects); adapt the state and onChange accordingly.

- Result shape: change how you read res.data to match your action’s Result type (e.g., use res.data?.id, res.data?.items, etc., instead of .message).

- Error code on catch: replace "ERROR-100003" with the correct six-digit code for this page/feature.

- Fallback messages: change fallbackSuccess/fallbackError keys and their copy to suit the page.

- Button and placeholder texts: update the i18n keys used for button labels, placeholders, and loading text.

- Loading UX: adjust the isLoading behavior (disable more inputs, show a spinner, debounce clicks, etc.).

- Toast strategy: keep toastify(res) as standard, but you can add a follow-up toast or suppress certain success toasts if the page shows inline results prominently.

- Result rendering: change the simple <p> to any component (table, list, card) that renders the fields from res.data.