import "server-only"
import { redis, redisReady } from "./client"
import type { UpsertInput } from "../schema/crud"

export async function upsert(input: UpsertInput) {
   await redisReady
   if (input.asJson) {
      const parsed = input.value ? JSON.parse(input.value) : null
      if (input.ttlSeconds && input.ttlSeconds > 0) {
         await redis.set(input.key, JSON.stringify(parsed), { EX: input.ttlSeconds })
      } else {
         await redis.set(input.key, JSON.stringify(parsed))
      }
   } else {
      if (input.ttlSeconds && input.ttlSeconds > 0) {
         await redis.set(input.key, input.value, { EX: input.ttlSeconds })
      } else {
         await redis.set(input.key, input.value)
      }
   }
}

export async function get(key: string): Promise<string | null> {
   await redisReady
   const result = await redis.get(key)
   return result as string | null
}

export async function del(key: string) {
   await redisReady
   return redis.del(key)
}

export async function scanPrefix(prefix = "", limit = 50) {
   await redisReady
   const keys: string[] = []
   const pattern = prefix ? `${prefix}*` : "*"
   const iterator = redis.scanIterator({ MATCH: pattern, COUNT: 100 }) as AsyncIterable<string | string[]>
   for await (const item of iterator) {
      if (Array.isArray(item)) {
         for (const k of item) {
            keys.push(k)
            if (keys.length >= limit) break
         }
      } else {
         keys.push(item)
      }
      if (keys.length >= limit) break
   }
   return keys
}
