/**
 * Environment variable validation for Next.js applications
 * 
 * This module provides validated configuration settings for Next.js.
 * Required environment variables are validated using envalid.
 */

import { cleanEnv, str, url } from "envalid";
import "server-only";

/**
 * Validate required environment variables
 */
const env = cleanEnv(process.env, {
  // Application configuration
  APP_NAME: str({
    desc: "Application name",
    example: "boilerplate",
    default: "app",
  }),
  APP_PUBLIC_URL: url({
    desc: "Public URL for the application (used for CORS, allowedDevOrigins, etc.)",
    example: "https://test.caimel.tools",
    default: "http://localhost:3000",
  }),
});

/**
 * Next.js configuration object with validated settings
 */
export const nextEnvConfig = {
  // Validated required settings
  appName: env.APP_NAME,
  publicUrl: env.APP_PUBLIC_URL,
  
  // Derived settings
  publicOrigin: new URL(env.APP_PUBLIC_URL).origin,
  publicHostname: new URL(env.APP_PUBLIC_URL).hostname,
};

// Export the raw validated env for direct access
export const validatedEnv = env;
