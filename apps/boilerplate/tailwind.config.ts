import { Config } from 'tailwindcss';
import baseConfig from '../../tailwind.config';

const config: Config = {
  // Extend the base config
  ...baseConfig,
  // Override content paths to be specific to this app
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    '../../packages/features/**/*.{js,ts,jsx,tsx}',
  ],
  // App-specific customizations can be added here
  theme: {
    ...baseConfig.theme,
    extend: {
      ...(baseConfig.theme?.extend || {}),
      // Add any app-specific theme extensions here
    },
  },
};

export default config;
