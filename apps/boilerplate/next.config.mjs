/** @type {import('next').NextConfig} */

import rootConfig from "../../packages/features/nextjs/config/next.config.mjs";

const nextConfig = {
  ...rootConfig,
  // Only app-specific environment variables
  env: {
    APP_NAME: "boilerplate",
  },
};

export default nextConfig;
