// Mock for next-intl/server
module.exports = {
  getTranslations: jest.fn(() => (key, params) => {
    if (params) {
      return `${key} ${JSON.stringify(params)}`;
    }
    return key;
  }),
  getLocale: jest.fn(() => "en"),
  getMessages: jest.fn(() => ({})),
  getNow: jest.fn(() => new Date()),
  getTimeZone: jest.fn(() => "UTC"),
  getFormatter: jest.fn(() => ({
    dateTime: jest.fn(),
    number: jest.fn(),
    relativeTime: jest.fn(),
  })),
  setRequestLocale: jest.fn(),
  getRequestConfig: jest.fn(() => ({
    locale: "en",
    messages: {},
  })),
};
