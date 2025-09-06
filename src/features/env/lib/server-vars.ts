import "server-only"
import { z } from "zod"

const EnvSchema = z.object({
   NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
   WATCHPACK_POLLING: z.coerce.boolean().optional().default(false),
   WATCHPACK_POLLING_INTERVAL: z.coerce.number().int().positive().optional().default(200),
   NEXT_TELEMETRY_DISABLED: z.coerce.boolean().optional().default(true),
   PNPM_STORE_DIR: z.string().optional(),

   ADMIN_USERNAME: z.string().min(1, "ADMIN_USERNAME is required"),
   ADMIN_PASSWORD: z.string().min(1, "ADMIN_PASSWORD is required"),

   // NextAuth configuration
   NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL"),
   NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is required"),
   NEXTAUTH_TRUST_HOST: z.coerce.boolean().optional().default(true),

   REDIS_HOSTNAME: z.string().min(1, "REDIS_HOSTNAME is required"),
   REDIS_PASSWORD: z.string().min(1, "REDIS_PASSWORD is required"),

   // Secure API / Turnstile / Rate Limiting
   // Cloudflare Turnstile secret for server-side verification
   TURNSTILE_SECRET_KEY: z.string().optional().default(""),
   // Note: Public/client keys are intentionally NOT part of server env schema.
   // They are provided to the client via a dedicated PublicEnvProvider component.

   // Guard behavior and defaults
   SECUREAPI_FAIL_MODE: z.enum(["block", "allow"]).optional().default("block"),
   SECUREAPI_TURNSTILE_TIMEOUT_MS: z.coerce.number().int().positive().optional().default(3000),
   SECUREAPI_TRUST_CLOUDFLARE: z.coerce.boolean().optional().default(true),
   // Optional shared secret header for origin hardening (Cloudflare Transform Rule recommended)
   SECUREAPI_ORIGIN_SHARED_SECRET: z.string().optional(),
   // RL defaults (can be tuned per-route)
   SECUREAPI_RL_POINTS: z.coerce.number().int().positive().optional().default(100),
   SECUREAPI_RL_WINDOW_SECONDS: z.coerce.number().int().positive().optional().default(60),
   SECUREAPI_RL_BLOCK_SECONDS: z.coerce.number().int().nonnegative().optional().default(60),

   // Using a relaxed check to support postgres:// URIs reliably
   POSTGRES_DATABASE_URL: z
      .string()
      .min(1, "POSTGRES_DATABASE_URL is required")
      .refine((v) => v.startsWith("postgres://"), "POSTGRES_DATABASE_URL must start with 'postgres://'"),
})

export type AppEnv = z.infer<typeof EnvSchema>

// Parse once at module load; z.object strips unknown keys by default
export const env: AppEnv = EnvSchema.parse(process.env)

export const isDev = env.NODE_ENV === "development"
export const isProd = env.NODE_ENV === "production"
export const isTest = env.NODE_ENV === "test"
