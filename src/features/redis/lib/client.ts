import "server-only";
import { createClient, type RedisClientType } from "redis";
import { isDev, REDIS_HOSTNAME, REDIS_PASSWORD } from "@/features/env";

// Build URL from validated env
const url = `redis://:${encodeURIComponent(REDIS_PASSWORD)}@${REDIS_HOSTNAME}:6379`;

// Reuse a single instance across hot-reloads in dev
// and across Next.js module reloads.
declare global {
  // eslint-disable-next-line no-var
  var _redisClient: RedisClientType | undefined;
  // eslint-disable-next-line no-var
  var _redisReady: Promise<void> | undefined;
}

const client: RedisClientType =
  globalThis._redisClient ?? createClient({ url });
client.on("error", (err) => {
  console.error("[redis] client error", err);
});

const ready: Promise<void> =
  globalThis._redisReady ??
  client
    .connect()
    .then(() => {})
    .catch((err) => {
      console.error("[redis] connect error", err);
      throw err;
    });

// Persist on globalThis to survive HMR in development
if (isDev) {
  globalThis._redisClient = client;
  globalThis._redisReady = ready;
}

export { client as redis, ready as redisReady };

// Small helpers
export async function ping(): Promise<string> {
  await ready;
  return client.ping();
}

export async function setJson<T>(
  key: string,
  value: T,
  ttlSeconds?: number
): Promise<void> {
  await ready;
  const payload = JSON.stringify(value);
  if (ttlSeconds && ttlSeconds > 0) {
    await client.set(key, payload, { EX: ttlSeconds });
  } else {
    await client.set(key, payload);
  }
}

export async function getJson<T>(key: string): Promise<T | null> {
  await ready;
  const payload = await client.get(key);
  const str = typeof payload === "string" ? payload : payload?.toString();
  return str ? (JSON.parse(str) as T) : null;
}
