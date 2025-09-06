# Next.js 15 Boilerplate Documentation for Windsurf

## Overview

This boilerplate is designed for Windsurf deployments, featuring a robust Next.js 15 setup with Docker, PNPM, and enterprise-grade features. It supports easy deployment to Windsurf services.

## Project Components

- **Dockerfile**: Builds a Node.js container with PNPM, auto-installs dependencies, and handles Postgres seeding.
- **PNPM Management**: Managed via `package.json` with scripts for dev, build, and linting.
- **Folder Structure**: Code is minimized in `src/app`; features are in `src/features/` with barrel exports for imports.
- **TS Aliases**: Defined in `tsconfig.json` for clean paths (e.g., `@/feature-name`).
- **Prettier & Lint**: Configured for code formatting and error checking.

## Features

- **Env**: Zod-validated environment variables.
- **Next-Auth**: Basic admin authentication.
- **Next-Intl**: I18n without routing, with lint checks.
- **Prisma**: ORM for Postgres with seeding.
- **Redis**: Used for rate limiting.
- **Secure API**: Includes bot checks and rate limiting.
- **Shadcn/UI**: Custom UI with Tailwind.
- **Toast**: Custom Sonner wrapper for backend messages.

## Detailed Explanations and Path Samples

To avoid common errors, here's how to use key project elements correctly:

- **TS Aliases**: Use aliases defined in `tsconfig.json` for imports. Example: Correct `import { locales } from '@/next-intl/index';` (via barrel export). Incorrect deep import like `import { locales } from '@/next-intl/config/locales';` is forbidden—route through barrels for maintainability.
- **Feature Imports**: Always use barrel exports. For server-only: `import { authOptions } from '@/features/next-auth';`. For client-facing: `import { LanguageSwitcher } from '@/features/next-intl/index.client';` with "use client" pragma if needed.
- **Prisma Usage**: Import from `import { PrismaClient } from '@prisma/client';` or feature barrels if wrapped.
- **Secure API Paths**: Access rate limit functions via `import { assertRatelimit } from '@/features/secure-api/assertRatelimit';`.

## Consolidated Project Patterns and Best Practices

To streamline the documentation, here are key patterns and usage guidelines, building on the summary:

- **Toast Feature with i18n**: The toast system (in `src/features/toast/`) uses Sonner for notifications and integrates with next-intl for localized messages. Example: Call `toastify(response)` in components, where `response` includes i18n keys; messages are resolved via `t()` function. Ensure toast content uses centralized message keys from `en.json` under namespaces like 'toast'.
- **en.json Structure**: Localized in `src/repository/next-intl/messages/`, mirroring the app and feature hierarchy. Namespaces (e.g., 'ApiResponses', 'TestPages') group keys by domain, avoiding duplicates. Example: `{ "toast": { "success": "Operation successful", "error": "Something went wrong" } }` for type-safe access.
- **App Directory Role**: Contains pages, layouts, and actions directly tied to routes, plus API routes (e.g., `src/app/api/secureApi/route.ts`). Keep it thin by importing logic from features; e.g., `import { assertRatelimit } from '@/secure-api';` in API handlers.
- **Features Folder Structure**: Each feature in `src/features/` has a standardized layout (e.g., `actions/`, `components/`, `lib/`) with barrel exports in `index.ts` (server) or `index.client.ts` (client). Example: For `secure-api`, `index.ts` exports `assertRatelimit`, enforcing shallow imports.
- **Toast Feature Dependency and Usage**: The toast system relies on the `ApiResponse` type from `src/features/secureApi/types/apiResponses.ts` for consistent response structures. This type includes fields like `toastTitle`, `toastDescription`, and `toastType` for localized notifications. When used with i18n, pass translation keys that are resolved via next-intl (e.g., `t('toast.success')`).
- **Securing API Routes and Server Actions**: Protect endpoints by calling `assertRatelimit` and `assertBotCheck` early in the function. Example for a server action or API route:

   ```ts
   import { assertRatelimit, assertBotCheck } from "@/secure-api"

   export async function securedAction(turnstileToken: string) {
      const rateLimitResult = await assertRatelimit("SECURE_ENDPOINTS")
      if (!rateLimitResult.success) return rateLimitResult

      const botCheckResult = await assertBotCheck(turnstileToken)
      if (!botCheckResult.success) return botCheckResult

      // Proceed with action logic
   }
   ```

   This pattern ensures early failure on security checks, integrating with Redis for rate limiting and Cloudflare for bot detection.

## Windsurf Rules

The following actions will only be performed after the user gives explicit permission:

- Changing files in `/` or `/src/features`
- Installing or changing packages
- Restarting, stopping, or starting containers or Next.js

General Principles:

- Always route imports through barrels to prevent deep import errors.
- Validate all inputs and use Zod for env/config.
- Ask before installing packages or restarting Docker to maintain control.
- Prioritize modularity: Keep `src/app/` minimal and delegate to `src/features/` for scalability.
