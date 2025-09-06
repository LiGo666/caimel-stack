"use client"

import React, { useActionState } from "react"
import { actionUpsert, actionGet, actionDelete, actionScan, type ActionResult } from "../actions/crud"
import { pingRedis } from "../actions/ping"

export function RedisCrud() {
   const [upsertState, upsertAction] = useActionState<ActionResult | undefined, FormData>(actionUpsert, undefined)
   const [getState, getAction] = useActionState<ActionResult<{ value: string | null }> | undefined, FormData>(actionGet, undefined)
   const [deleteState, deleteAction] = useActionState<ActionResult<{ deleted: number }> | undefined, FormData>(actionDelete, undefined)
   const [scanState, scanAction] = useActionState<ActionResult<{ keys: string[] }> | undefined, FormData>(actionScan, undefined)

   async function handlePing(formData: FormData) {
      const res = await pingRedis()
      alert(`Redis ping: ${res.pong}`)
   }

   return (
      <div className="grid gap-6 md:grid-cols-2">
         <section className="rounded-lg border p-4">
            <h2 className="font-semibold mb-3">Ping</h2>
            <form action={handlePing} className="flex items-center gap-2">
               <button type="submit" className="rounded bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700">
                  Ping Redis
               </button>
            </form>
         </section>

         <section className="rounded-lg border p-4">
            <h2 className="font-semibold mb-3">Upsert</h2>
            <form action={upsertAction} className="space-y-2">
               <input name="key" placeholder="key" className="w-full rounded border px-3 py-1.5" required />
               <textarea name="value" placeholder="value (string or JSON)" className="w-full rounded border px-3 py-1.5 h-28" />
               <div className="flex items-center gap-3">
                  <input name="ttlSeconds" placeholder="ttl seconds (optional)" className="rounded border px-3 py-1.5" />
                  <label className="flex items-center gap-2">
                     <input type="checkbox" name="asJson" value="true" className="h-4 w-4" />
                     <span>Parse value as JSON</span>
                  </label>
               </div>
               <button type="submit" className="rounded bg-green-600 px-3 py-1.5 text-white hover:bg-green-700">
                  Save
               </button>
               {upsertState && <p className={upsertState.ok ? "text-green-700" : "text-red-700"}>{upsertState.message}</p>}
            </form>
         </section>

         <section className="rounded-lg border p-4">
            <h2 className="font-semibold mb-3">Get</h2>
            <form action={getAction} className="space-y-2">
               <input name="key" placeholder="key" className="w-full rounded border px-3 py-1.5" required />
               <button type="submit" className="rounded bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700">
                  Load
               </button>
               {getState && (
                  <div className="text-sm">
                     <p className={getState.ok ? "text-green-700" : "text-red-700"}>{getState.message}</p>
                     {getState.data && <pre className="mt-2 max-h-48 overflow-auto rounded bg-gray-100 p-2 text-xs">{getState.data.value}</pre>}
                  </div>
               )}
            </form>
         </section>

         <section className="rounded-lg border p-4">
            <h2 className="font-semibold mb-3">Delete</h2>
            <form action={deleteAction} className="space-y-2">
               <input name="key" placeholder="key" className="w-full rounded border px-3 py-1.5" required />
               <button type="submit" className="rounded bg-red-600 px-3 py-1.5 text-white hover:bg-red-700">
                  Delete
               </button>
               {deleteState && <p className={deleteState.ok ? "text-green-700" : "text-red-700"}>{deleteState.message}</p>}
            </form>
         </section>

         <section className="rounded-lg border p-4 md:col-span-2">
            <h2 className="font-semibold mb-3">Scan</h2>
            <form action={scanAction} className="space-y-2">
               <input name="prefix" placeholder="prefix (optional)" className="w-full rounded border px-3 py-1.5" />
               <button type="submit" className="rounded bg-gray-700 px-3 py-1.5 text-white hover:bg-gray-800">
                  Scan
               </button>
               {scanState && (
                  <div className="text-sm">
                     <p className={scanState.ok ? "text-green-700" : "text-red-700"}>{scanState.message}</p>
                     {scanState.data && (
                        <ul className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                           {scanState.data.keys.map((k) => (
                              <li key={k} className="rounded bg-gray-100 p-2 text-xs break-all">
                                 {k}
                              </li>
                           ))}
                        </ul>
                     )}
                  </div>
               )}
            </form>
         </section>
      </div>
   )
}
