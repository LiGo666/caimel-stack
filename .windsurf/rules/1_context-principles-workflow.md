---
trigger: always_on
---

# Project Context

Ultracite enforces strict type safety, accessibility standards, and consistent code quality for JavaScript/TypeScript projects using Biome's lightning-fast formatter and linter.

## Key Principles

- Zero configuration required
- Subsecond performance
- Maximum type safety
- AI-friendly code generation

## Before Writing Code

1. Analyze existing patterns in the codebase
2. Consider edge cases and error scenarios
3. Follow the rules below strictly
4. Validate accessibility requirements
5. Always use context7 when I need code generation, setup or configuration steps, or
   library/API documentation. This means you should automatically use the Context7 MCP
   tools to resolve library id and get library docs without me having to explicitly ask.

## Code Structure

### Rule for Folder-Names of Code Artifact Types:

Enforce the following folder structure for Global-Features (./packages/<feature>) and Project-Features (./apps/<project>/src/app/<feature>):  
The folder-names need to be in brackets if they are used inside Project-Features.

Client:

- components → React components (`"use client"` if needed)
- hooks → Reusable hooks (client/server specific)
- stores → State stores (Zustand etc.)
- providers → Context providers
- lib/client → Client-only adapters (browser APIs, crypto, etc.)
- styles → style related files

Server Side:

- actions → Server Actions (`"use server"`), minimized code, wraps lib/server functions
- lib/server → Server-only adapters (DB, secrets, APIs)

Hybrid:

- lib/shared → Core logic, environment-agnostic, using **Boundary Injection** (ports & strategies)
- config → Static configuration (constants, options)
- data → Seeds, fixtures, static datasets, additional folders
- types → Feature-specific type definitions
- schema → Zod schemas, Prisma mappings
- utils → Small helpers and stuff

Exports / LLM:

- index.ts → Barrel export (server/main usage) → has "server-only" on top, bundles all exports of the feature scope
- index.client.ts → Barrel export (client usage)
- .windsurf/rules → Windsurf rules for this feature
- .windsurf/workflows → Windsurf workflows for this feature

### Example:

(Global Feature)
./packages/shadcn/components/... (shadcn)
(Project Feature)
./apps/rainbow-generator/src/app/rainbows/page.tsx
./apps/rainbow-generator/src/app/rainbows/(actions)/crud.tsx
