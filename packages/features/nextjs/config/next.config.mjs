/** @type {import('next').NextConfig} */

// Using direct values for configuration instead of environment variables
// This ensures the configuration is applied correctly at build time

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@packages/features"],
  poweredByHeader: false,
  eslint: {
    ignoreDuringBuilds: false,
    dirs: ["app", "components", "lib", "utils"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "localhost",
        port: "",
        pathname: "/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    // biome-ignore lint/style/noMagicNumbers: list of device sizes
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  },
  // serverExternalPackages is now a top-level option, not under experimental
  serverExternalPackages: [],
  // Allow cross-origin requests from the public URL in development
  // This fixes the warning: Cross origin request detected from test.caimel.tools to /_next/* resource
  allowedDevOrigins: ["https://test.caimel.tools"],
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
    optimizePackageImports: ["@packages/features"],
  },
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error", "warn"],
          }
        : false,
  },
  // Security headers for all apps
  async headers() {
    return await [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    // Optimize webpack configuration
    if (!isServer) {
      // Client-side optimizations
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: "all",
          cacheGroups: {
            default: false,
            vendors: false,
            commons: {
              name: "commons",
              chunks: "all",
              minChunks: 2,
            },
          },
        },
        moduleIds: "deterministic",
      };
    }
    return config;
  },
  output: "standalone",
};

export default nextConfig;
