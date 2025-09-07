import "server-only"
import { z } from "zod"

// Parse environment variables with Zod schemas
const NODE_ENV = z.enum(["development", "test", "production"]).default("development").parse(process.env.NODE_ENV)
const WATCHPACK_POLLING = z.coerce.boolean().optional().default(false).parse(process.env.WATCHPACK_POLLING)
const WATCHPACK_POLLING_INTERVAL = z.coerce.number().int().positive().optional().default(200).parse(process.env.WATCHPACK_POLLING_INTERVAL)
const NEXT_TELEMETRY_DISABLED = z.coerce.boolean().optional().default(true).parse(process.env.NEXT_TELEMETRY_DISABLED)
const PNPM_STORE_DIR = z.string().optional().parse(process.env.PNPM_STORE_DIR)

const ADMIN_USERNAME = z.string().min(1, "ADMIN_USERNAME is required").parse(process.env.ADMIN_USERNAME)
const ADMIN_PASSWORD = z.string().min(1, "ADMIN_PASSWORD is required").parse(process.env.ADMIN_PASSWORD)

// NextAuth configuration
const NEXTAUTH_URL = z.string().url("NEXTAUTH_URL must be a valid URL").parse(process.env.NEXTAUTH_URL)
const NEXTAUTH_SECRET = z.string().min(1, "NEXTAUTH_SECRET is required").parse(process.env.NEXTAUTH_SECRET)
const NEXTAUTH_TRUST_HOST = z.coerce.boolean().optional().default(true).parse(process.env.NEXTAUTH_TRUST_HOST)

const REDIS_HOSTNAME = z.string().min(1, "REDIS_HOSTNAME is required").parse(process.env.REDIS_HOSTNAME)
const REDIS_PASSWORD = z.string().min(1, "REDIS_PASSWORD is required").parse(process.env.REDIS_PASSWORD)

// Secure API / Turnstile / Rate Limiting
// Cloudflare Turnstile secret for server-side verification
const TURNSTILE_SECRET_KEY = z.string().optional().default("").parse(process.env.TURNSTILE_SECRET_KEY)
// Note: Public/client keys are intentionally NOT part of server env schema.
// They are provided to the client via a dedicated PublicEnvProvider component.

// Guard behavior and defaults
const SECUREAPI_FAIL_MODE = z.enum(["block", "allow"]).optional().default("block").parse(process.env.SECUREAPI_FAIL_MODE)
const SECUREAPI_TURNSTILE_TIMEOUT_MS = z.coerce.number().int().positive().optional().default(3000).parse(process.env.SECUREAPI_TURNSTILE_TIMEOUT_MS)
const SECUREAPI_TRUST_CLOUDFLARE = z.coerce.boolean().optional().default(true).parse(process.env.SECUREAPI_TRUST_CLOUDFLARE)
// Optional shared secret header for origin hardening (Cloudflare Transform Rule recommended)
const SECUREAPI_ORIGIN_SHARED_SECRET = z.string().optional().parse(process.env.SECUREAPI_ORIGIN_SHARED_SECRET)
// RL defaults (can be tuned per-route)
const SECUREAPI_RL_POINTS = z.coerce.number().int().positive().optional().default(100).parse(process.env.SECUREAPI_RL_POINTS)
const SECUREAPI_RL_WINDOW_SECONDS = z.coerce.number().int().positive().optional().default(60).parse(process.env.SECUREAPI_RL_WINDOW_SECONDS)
const SECUREAPI_RL_BLOCK_SECONDS = z.coerce.number().int().nonnegative().optional().default(60).parse(process.env.SECUREAPI_RL_BLOCK_SECONDS)

// Using a relaxed check to support postgres:// URIs reliably
const POSTGRES_DATABASE_URL = z
   .string()
   .min(1, "POSTGRES_DATABASE_URL is required")
   .refine((v) => v.startsWith("postgres://"), "POSTGRES_DATABASE_URL must start with 'postgres://'")
   .parse(process.env.POSTGRES_DATABASE_URL)

// Helper constants
const isDev = NODE_ENV === "development"
const isProd = NODE_ENV === "production"
const isTest = NODE_ENV === "test"

// Export all environment variables individually
export {
   NODE_ENV,
   WATCHPACK_POLLING,
   WATCHPACK_POLLING_INTERVAL,
   NEXT_TELEMETRY_DISABLED,
   PNPM_STORE_DIR,
   ADMIN_USERNAME,
   ADMIN_PASSWORD,
   NEXTAUTH_URL,
   NEXTAUTH_SECRET,
   NEXTAUTH_TRUST_HOST,
   REDIS_HOSTNAME,
   REDIS_PASSWORD,
   TURNSTILE_SECRET_KEY,
   SECUREAPI_FAIL_MODE,
   SECUREAPI_TURNSTILE_TIMEOUT_MS,
   SECUREAPI_TRUST_CLOUDFLARE,
   SECUREAPI_ORIGIN_SHARED_SECRET,
   SECUREAPI_RL_POINTS,
   SECUREAPI_RL_WINDOW_SECONDS,
   SECUREAPI_RL_BLOCK_SECONDS,
   POSTGRES_DATABASE_URL,
   isDev,
   isProd,
   isTest
}
