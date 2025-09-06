/**
 * Error categories:
 * - tolerated: can happen, harmless, not visible to users
 * - violation: must not happen, harmless, not visible to users
 * - visible: must not happen, harmless, visible to users
 * - fatal: must not happen, critical; site/app should be taken down until fixed
 */
export type ErrorCategory = "tolerated" | "violation" | "visible" | "fatal"

export const ERROR_CATALOG = {
   "ERROR-234234": { category: "tolerated", description: "Shadcn test-action failed (server side)" },
   "ERROR-234235": { category: "tolerated", description: "Shadcn test-action failed (client side)" },
   "ERROR-643554": { category: "fatal", description: "Next-Auth user registration failed (server side)" },
   "ERROR-643555": { category: "fatal", description: "Next-Auth user registration failed (client side)" },
   "ERROR-342534": { category: "visible", description: "Sign in failed (client Side)" },
   "ERROR-654232": { category: "visible", description: "Get user profile failed (server side)" },
   "ERROR-654245": { category: "visible", description: "Update user profile failed (server side)" },
   "ERROR-342537": { category: "visible", description: "Update user profile failed (client side)" },
   "ERROR-123456": { category: "visible", description: "Passphrase management failes (server side)" },
   "ERROR-123457": { category: "visible", description: "Passphrase management failes (client side)" },
} as const
