/** @type {import('next').NextConfig} */

const rootConfig = require('../../next.config.js');

const nextConfig = {
  ...rootConfig,
  // Only app-specific environment variables
  env: {
    APP_NAME: 'boilerplate',
  },
};

module.exports = nextConfig;
