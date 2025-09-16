/** @type {import('next').NextConfig} */

const rootConfig = require('../../next.config.js');

const nextConfig = {
  ...rootConfig,
  // Override or extend the root config settings
  // App-specific settings
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    ...rootConfig.images,
    domains: [
      // Add app-specific image domains here
      'localhost',
    ],
  },
  // Extend webpack config if needed
  webpack: (config, options) => {
    // First apply the root config webpack modifications
    config = rootConfig.webpack ? rootConfig.webpack(config, options) : config;
    
    // Then apply app-specific webpack modifications
    // Add any app-specific webpack configurations here
    
    return config;
  },
};

module.exports = nextConfig;
