import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

const isDev = process.env.NODE_ENV !== "production"

const securityHeaders = [
   // Helps prevent XSS attacks
   {
      key: "Content-Security-Policy",
      value: [
         "default-src 'self'",
         "base-uri 'self'",
         "frame-ancestors 'none'",
         "img-src 'self' data: blob:",
         // Allow local fonts and Google Fonts if used
         "font-src 'self' data: https://fonts.gstatic.com",
         "object-src 'none'",
         // Allow inline/eval in dev to avoid breaking Fast Refresh; tighten in prod
         isDev
            ? "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://challenges.cloudflare.com https://static.cloudflareinsights.com https://*.clerk.accounts.dev https://*.clerk.com"
            : "script-src 'self' https://challenges.cloudflare.com https://*.clerk.accounts.dev https://*.clerk.com",
         // Some browsers use script-src-elem separately from script-src
         isDev
            ? "script-src-elem 'self' 'unsafe-eval' 'unsafe-inline' https://challenges.cloudflare.com https://static.cloudflareinsights.com https://*.clerk.accounts.dev https://*.clerk.com"
            : "script-src-elem 'self' https://challenges.cloudflare.com https://*.clerk.accounts.dev https://*.clerk.com",
         // Turnstile renders an iframe from challenges.cloudflare.com
         "frame-src 'self' https://challenges.cloudflare.com",
         // Fallback for older engines
         "child-src 'self' https://challenges.cloudflare.com blob:",
         isDev
            ? "connect-src 'self' ws: wss: https://*.clerk.accounts.dev https://*.clerk.com"
            : "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com",
         // Allow inline styles and Google Fonts stylesheet if used
         "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
         // Some browsers use style-src-elem separately
         "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com",
         "form-action 'self'",
      ].join("; "),
   },
   { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
   { key: "X-Content-Type-Options", value: "nosniff" },
   { key: "X-Frame-Options", value: "DENY" },
   { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
   // Only meaningful over HTTPS; harmless if set behind TLS-terminating proxy
   { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
]

const nextConfig: NextConfig = {
   async headers() {
      // Completely disable all security headers in development for Clerk compatibility
      if (isDev) {
         return []
      }
      return [{ source: "/:path*", headers: securityHeaders }]
   },
}

const withNextIntl = createNextIntlPlugin("./src/features/next-intl/lib/request.ts")

export default withNextIntl(nextConfig)
