---
trigger: always_on
---

## Project Rules

This document defines the core rules for working with the Next.js 15 Windsurf boilerplate.  
It ensures consistency, scalability, and maintainability across the project.

---

## Project Structure

# Root Structure

- / → Next.js root (next.config.js, tsconfig.json, package.json, Dockerfile, pnpm-lock.yaml, etc.)
- /src/app → Routing layer, layouts, pages, server actions, API routes (`@app/*`)
- /src/features → All business logic, UI, hooks, stores, config, schema (`@features/<feature>/*`)

# Aliases

- "@/_": ["./_"]

# Folder Structures

Whenever there is uncertainty about **where code should be placed** or **whether a new file should be created**,  
access the feature- or app-specific structure rules in:

- `/src/app/.windsurf/rules/structure.md`
- `/src/features/.windsurf/rules/structure.md`

## Principles

- Keep `/src/app` thin: only routing, layouts, server actions, API routes.
- Put all reusable logic, components, hooks, and utilities in `/src/features`.
- Follow the strict folder layout defined in each `structure.md`. No arbitrary subfolders.
- Use barrel exports from features (`index.ts`, `index.client.ts`) — never deep imports.
- Use existing features for integrations
- Prefer server actions over API routes when possible.
- Ensure that user facing messages are done in a i18n way, use next-intl translation rules to ensure how its integrated
- Never install packages, create files, or place code outside the defined structure without explicit approval

## Features

- env → providing zod-validated env-vars (server + client via barrel).
- logging → Centralized logging utilities for server and client.
- next-auth → Authentication system with schemas, config, components and client helpers.
- next-intl → Internationalization with JSON messages and type-safe hooks.
- prisma → Prisma ORM integration with project db schema and client.
- redis → Redis utilities for caching and data storage.
- secureApi → API security with rate limiting and bot checks. Consider this when creating actions and page.tsx that call actions
- shadcn → UI components based on shadcn/ui with custom themes.
- toast → Toast notifications integrated with API responses. Also Toastify feature to render server-generated messages
