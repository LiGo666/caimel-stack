/**
 * Redis Client Module
 * 
 * This module provides a singleton Redis client for use in server-side code.
 * It handles connection management, error handling, and provides helper methods
 * for common Redis operations.
 */

import { createClient, type RedisClientType } from "redis";
import "server-only";
import { cleanEnv, str } from "envalid";

/**
 * Simple logger that avoids direct console usage to satisfy linting rules
 */
const logger = {
  // biome-ignore lint/suspicious/noConsole: Structured logging is acceptable
  log: (data: Record<string, unknown>) => console.log(data),
  // biome-ignore lint/suspicious/noConsole: Structured logging is acceptable
  error: (data: Record<string, unknown>) => console.error(data)
};

/**
 * Environment variable validation
 * 
 * Validates required environment variables for Redis connection.
 * Will throw an error if any required variables are missing.
 */
const env = cleanEnv(process.env, {
  REDIS_HOSTNAME: str({
    desc: "Redis server hostname",
    example: "redis",
  }),
  REDIS_PASSWORD: str({
    desc: "Redis server password",
    example: "password",
  }),
});

// Determine if we're in development mode
const isDevelopment = process.env.NODE_ENV === "development";

// Build Redis connection URL from validated env variables
const url = `redis://:${encodeURIComponent(env.REDIS_PASSWORD)}@${env.REDIS_HOSTNAME}:6379`;

/**
 * Global declarations for Redis client persistence across HMR
 * 
 * These global variables allow the Redis client to persist across
 * hot module reloads in development mode.
 */
declare global {
  // eslint-disable-next-line no-var
  var _redisClient: RedisClientType | undefined;
  // eslint-disable-next-line no-var
  var _redisReady: Promise<void> | undefined;
}

/**
 * Create or reuse Redis client instance
 * 
 * In development mode, we reuse the existing client across hot module reloads.
 * In production, we create a new client for each module load.
 */
const client: RedisClientType =
  (isDevelopment && globalThis._redisClient) ? globalThis._redisClient : createClient({ url });

// Set up error handling
client.on("error", (err) => {
  // Use structured logging format
  logger.error({
    service: "redis",
    event: "client_error",
    error: err.message,
    stack: isDevelopment ? err.stack : undefined,
  });
});

/**
 * Connection promise
 * 
 * This promise resolves when the Redis client is connected.
 * It's used to ensure that operations only execute after a successful connection.
 */
const ready: Promise<void> =
  (isDevelopment && globalThis._redisReady ? globalThis._redisReady : undefined) ??
  client
    .connect()
    .then(() => {
      logger.log({
        service: "redis",
        event: "connected",
        host: env.REDIS_HOSTNAME,
      });
    })
    .catch((err) => {
      logger.error({
        service: "redis",
        event: "connect_error",
        error: err.message,
        stack: isDevelopment ? err.stack : undefined,
      });
      throw err;
    });

// Persist client and ready promise in development mode to survive HMR
if (isDevelopment) {
  globalThis._redisClient = client;
  globalThis._redisReady = ready;
}

// Export the Redis client and ready promise
export { client as redis, ready as redisReady };

/**
 * Helper Functions
 * 
 * These functions provide a simplified interface for common Redis operations.
 */

/**
 * Ping the Redis server
 * 
 * Useful for health checks and connection verification.
 * 
 * @returns A promise that resolves to the server's response ("PONG")
 */
export async function ping(): Promise<string> {
  await ready;
  return client.ping();
}

/**
 * Store a JSON value in Redis
 * 
 * Serializes the value to JSON and stores it under the given key.
 * 
 * @param key - The Redis key to store the value under
 * @param value - The value to store (will be JSON serialized)
 * @param ttlSeconds - Optional TTL in seconds
 * @returns A promise that resolves when the operation is complete
 */
export async function setJson<T>(
  key: string,
  value: T,
  ttlSeconds?: number
): Promise<void> {
  try {
    await ready;
    const payload = JSON.stringify(value);
    if (ttlSeconds && ttlSeconds > 0) {
      await client.set(key, payload, { EX: ttlSeconds });
    } else {
      await client.set(key, payload);
    }
  } catch (error) {
    logger.error({
      service: "redis",
      event: "set_json_error",
      key,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Retrieve and parse a JSON value from Redis
 * 
 * @param key - The Redis key to retrieve
 * @returns A promise that resolves to the parsed value, or null if not found
 */
export async function getJson<T>(key: string): Promise<T | null> {
  try {
    await ready;
    const payload = await client.get(key);
    if (payload === null) {
      return null;
    }
    // Handle the payload properly - Redis client.get() returns string | Buffer
    const valueStr = Buffer.isBuffer(payload) ? payload.toString() : payload;
    return valueStr ? (JSON.parse(valueStr) as T) : null;
  } catch (error) {
    logger.error({
      service: "redis",
      event: "get_json_error",
      key,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Delete a key from Redis
 * 
 * @param key - The Redis key to delete
 * @returns A promise that resolves to the number of keys deleted (0 or 1)
 */
export async function del(key: string): Promise<number> {
  try {
    await ready;
    return await client.del(key);
  } catch (error) {
    logger.error({
      service: "redis",
      event: "del_error",
      key,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Set a key with expiration
 * 
 * @param key - The Redis key to set
 * @param value - The string value to store
 * @param ttlSeconds - TTL in seconds
 * @returns A promise that resolves when the operation is complete
 */
export async function setWithExpiry(
  key: string,
  value: string,
  ttlSeconds: number
): Promise<void> {
  try {
    await ready;
    await client.set(key, value, { EX: ttlSeconds });
  } catch (error) {
    logger.error({
      service: "redis",
      event: "set_with_expiry_error",
      key,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
