---
trigger: model_decision
description: This rule must be applied whenever creating, modify or reading page.tsx files and server action files (action.ts)
---

# Page and Action Creation Rules

This document provides standardized guidance for creating page.tsx files and server action files (action.ts) in the Next.js 15 Windsurf boilerplate, ensuring consistent implementation across the project.

## Core Concepts

### Page Files (page.tsx)

- Should be kept thin with minimal logic
- Focus on UI rendering and handling user interactions
- Must follow proper i18n integration for all user-facing text
- Server components by default, unless client interactivity is required

### Action Files (action.ts)

- Implement server-side logic and data processing
- Apply security measures (rate limiting, bot checks)
- Handle errors consistently with standardized ApiResponse format
- Support internationalization for error messages and notifications

## Implementation Template for action.ts

```typescript
"use server"

import { getTranslations } from "next-intl/server"
import { ApiResponse } from "@/features/secure-api"
import { assertRatelimit } from "@/features/secure-api"
import { unexpectedErrorToastContent } from "@/features/toast/lib/unexpectedErrorToastContent"
// Example of environment variable access (server-side)
import { DATABASE_URL, API_KEY } from "@/features/env"

export async function someAction(someInput: string): Promise<ApiResponse<any>> {
   const t = await getTranslations("app.your-path.action")
   const tGeneric = await getTranslations("generic")

   try {
      // Security check
      const rateLimitResult = await assertRatelimit("GENERAL_ENDPOINTS")
      if (!rateLimitResult.success) return rateLimitResult

      // Use env variables (server-side only)
      console.log(`Using database: ${DATABASE_URL}`)

      // Process the input
      const resultData = `Processed: ${someInput}`

      // Return success response with toast notification
      return {
         success: true,
         data: { message: resultData },
         toastTitle: t("success.title"),
         toastDescription: t("success.description"),
         toastType: "success",
      }
   } catch (error) {
      return unexpectedErrorToastContent(tGeneric, "ERROR-100002")
   }
}
```

## Implementation template for page.tsx (Client Component)

```tsx
"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { someAction } from "./action"
import { toastify } from "@/features/toast/index.client"
import { unexpectedErrorToastContent } from "@/features/toast/lib/unexpectedErrorToastContent"
// Example of environment variable access (client-side)
import { NEXT_PUBLIC_TURNSTILE_SITE_KEY } from "@/features/env/index.client"

export default function ExamplePage() {
   const t = useTranslations("app.your-path.page")
   const [input, setInput] = useState("")
   const [isLoading, setIsLoading] = useState(false)
   const [result, setResult] = useState<string | null>(null)

   // Client-side env access
   const siteKey = NEXT_PUBLIC_TURNSTILE_SITE_KEY

   async function handleSubmit() {
      setIsLoading(true)
      setResult(null)

      try {
         const res = await someAction(input)
         toastify(res) // Display toast notification

         if (res.success) {
            setResult(res.data?.message ?? t("fallbackSuccess"))
         } else {
            setResult(res.toastDescription ?? t("fallbackError"))
         }
      } catch (error) {
         toastify(unexpectedErrorToastContent(t, "ERROR-100003"))
         setResult(t("unexpectedError"))
      } finally {
         setIsLoading(false)
      }
   }

   return (
      <main className="p-4">
         <p>Site Key: {siteKey}</p>
         <div className="flex gap-2 my-4">
            <input
               value={input}
               onChange={(e) => setInput(e.target.value)}
               placeholder={t("inputPlaceholder")}
               disabled={isLoading}
               className="px-3 py-2 border rounded"
            />
            <button onClick={handleSubmit} disabled={isLoading} className="px-4 py-2 bg-blue-500 text-white rounded">
               {isLoading ? t("working") : t("submit")}
            </button>
         </div>

         {result && (
            <div className="mt-4 p-3 bg-gray-100 rounded">
               <p>{result}</p>
            </div>
         )}
      </main>
   )
}
```

## Implementation template for page.tsx (Server Component)

```tsx
import { Suspense } from "react"
import { getTranslations } from "next-intl/server"
// Example of environment variable access (server-side)
import { API_URL } from "@/features/env"
import { ClientComponent } from "./components/client-component"

export default async function ServerPage() {
   const t = await getTranslations("app.your-path.page")

   // Server-side env access
   const apiUrl = API_URL

   // Fetch data (server-side)
   const data = await fetch(`${apiUrl}/some-endpoint`).then((r) => r.json())

   return (
      <main className="p-4">
         <h1 className="text-2xl font-bold mb-4">{t("pageTitle")}</h1>

         <div className="mb-4">
            <h2 className="text-xl">{t("serverDataTitle")}</h2>
            <pre className="bg-gray-100 p-3 rounded">{JSON.stringify(data, null, 2)}</pre>
         </div>

         <Suspense fallback={<div>{t("loading")}</div>}>
            <ClientComponent translationNamespace="app.your-path.client-component" />
         </Suspense>
      </main>
   )
}
```

## Rules for Environment Variable Access

### Server-Side Environment Variables

- Import from `@/features/env`
- Available in both server components and server actions
- Example: `import { DATABASE_URL, API_KEY } from "@/features/env"`
- These are Zod-validated for type safety

### Client-Side Environment Variables

- Must be prefixed with `NEXT_PUBLIC_` in your actual .env file
- Import from `@/features/env/index.client`
- Only available in client components
- Example: `import { NEXT_PUBLIC_TURNSTILE_SITE_KEY } from "@/features/env/index.client"`
- These are also Zod-validated for type safety

## Best Practices

1. Keep page.tsx files thin, with business logic in server actions
2. Always use next-intl for user-facing text
3. Handle errors consistently with toast notifications
4. Apply proper security measures (rate limiting, bot checks) in actions
5. Follow the ApiResponse pattern for consistent response handling
6. Use environment variables through the env feature for type safety
7. Prefer server components unless client interactivity is required
8. Use shadcn components for UI consistency
