module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  testEnvironmentOptions: {
    url: "http://localhost",
  },
  roots: ["<rootDir>/src"],
  testMatch: [
    "**/__tests__/**/*.(test|spec).(ts|tsx|js)",
    "**/*.(test|spec).(ts|tsx|js)",
  ],
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  },
  transformIgnorePatterns: ["node_modules/(?!(next-intl)/)"],
  collectCoverageFrom: ["src/**/*.(ts|tsx)", "!src/**/*.d.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^next-intl/server$": "<rootDir>/__mocks__/next-intl-server.js",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
};
