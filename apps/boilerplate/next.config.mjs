/** @type {import('next').NextConfig} */

import rootConfig from "../../packages/features/nextjs/config/next.config.mjs";

// Get environment variables
const APP_NAME = process.env.APP_NAME || "boilerplate";
const APP_PUBLIC_URL = process.env.APP_PUBLIC_URL || "http://localhost:3000";

// Utility function to safely parse URLs
function safeParseUrl(
  urlString,
  defaultValue = { hostname: "localhost", protocol: "http:" }
) {
  try {
    return new URL(urlString);
  } catch (_error) {
    // biome-ignore lint: This is a build-time warning
    console.warn(`Invalid URL: ${urlString}, using default values`);
    return defaultValue;
  }
}

// Parse the public URL
const parsedPublicUrl = safeParseUrl(APP_PUBLIC_URL);
const nextConfig = {
  ...rootConfig,
  // Add WebSocket protocol to allowedDevOrigins
  allowedDevOrigins: [
    "https://test.caimel.tools",
    "wss://test.caimel.tools"
  ],
  // App-specific environment variables exposed to the browser
  env: {
    APP_NAME,
    APP_PUBLIC_URL,
  },
  // Add app-specific image domains if needed
  images: {
    ...rootConfig.images,
    remotePatterns: [
      ...rootConfig.images.remotePatterns,
      // Add the hostname from APP_PUBLIC_URL to allowed image domains
      {
        protocol: parsedPublicUrl.protocol.replace(":", ""),
        hostname: parsedPublicUrl.hostname,
        port: "",
        pathname: "/**",
      },
    ],
  },
  experimental: {
    ...rootConfig.experimental,
  },
};

export default nextConfig;
