import { z } from "zod"

// Client-side public env validation.
const clientEnvSchema = z.object({ NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1, "Missing NEXT_PUBLIC_TURNSTILE_SITE_KEY") })

export const clientEnv = { NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY }

export type ClientEnv = z.infer<typeof clientEnvSchema>

export const NEXT_PUBLIC_TURNSTILE_SITE_KEY = clientEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY
