// Mock server-only module
jest.mock("server-only", () => {
   return {}
})

// Mock next/headers if needed
jest.mock("next/headers", () => {
   return { cookies: jest.fn(() => ({ get: jest.fn(), set: jest.fn() })), headers: jest.fn(() => ({ get: jest.fn() })) }
})

const originalError = console.error
const originalWarn = console.warn

console.log = jest.fn()
console.info = jest.fn()

afterAll(() => {
   console.error = originalError
   console.warn = originalWarn
})
