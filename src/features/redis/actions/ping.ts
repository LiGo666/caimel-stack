"use server"

import { ping as redisPing } from "../lib/client"

export async function pingRedis() {
   const pong = await redisPing()
   return { ok: true, pong } as const
}
