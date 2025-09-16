import { z } from "zod";

// Client-side public env validation.
const NEXT_PUBLIC_TURNSTILE_SITE_KEY = z
  .string()
  .min(1, "Missing NEXT_PUBLIC_TURNSTILE_SITE_KEY")
  .parse(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

// Export the environment variable directly
export { NEXT_PUBLIC_TURNSTILE_SITE_KEY };
