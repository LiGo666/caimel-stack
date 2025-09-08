// Set up environment variables for tests
process.env.MINIO_ENDPOINT = 'minio.example.com';
process.env.MINIO_ACCESS_KEY = 'test-access-key';
process.env.MINIO_SECRET_KEY = 'test-secret-key';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.ADMIN_USERNAME = 'admin';
process.env.ADMIN_PASSWORD = 'password';
process.env.REDIS_HOSTNAME = 'localhost';
process.env.REDIS_PASSWORD = 'password';
process.env.POSTGRES_DATABASE_URL = 'postgres://user:password@localhost:5432/testdb';

// Mock server-only module
jest.mock('server-only', () => {
  return {};
});

// Mock next/headers if needed
jest.mock('next/headers', () => {
  return {
    cookies: jest.fn(() => ({
      get: jest.fn(),
      set: jest.fn(),
    })),
    headers: jest.fn(() => ({
      get: jest.fn(),
    })),
  };
});
