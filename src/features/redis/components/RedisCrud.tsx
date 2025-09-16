"use client";

import React, { useActionState } from "react";
import {
  type ActionResult,
  actionDelete,
  actionGet,
  actionScan,
  actionUpsert,
} from "../actions/crud";
import { pingRedis } from "../actions/ping";

export function RedisCrud() {
  const [upsertState, upsertAction] = useActionState<
    ActionResult | undefined,
    FormData
  >(actionUpsert, undefined);
  const [getState, getAction] = useActionState<
    ActionResult<{ value: string | null }> | undefined,
    FormData
  >(actionGet, undefined);
  const [deleteState, deleteAction] = useActionState<
    ActionResult<{ deleted: number }> | undefined,
    FormData
  >(actionDelete, undefined);
  const [scanState, scanAction] = useActionState<
    ActionResult<{ keys: string[] }> | undefined,
    FormData
  >(actionScan, undefined);

  async function handlePing(formData: FormData) {
    const res = await pingRedis();
    alert(`Redis ping: ${res.pong}`);
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="rounded-lg border p-4">
        <h2 className="mb-3 font-semibold">Ping</h2>
        <form action={handlePing} className="flex items-center gap-2">
          <button
            className="rounded bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700"
            type="submit"
          >
            Ping Redis
          </button>
        </form>
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="mb-3 font-semibold">Upsert</h2>
        <form action={upsertAction} className="space-y-2">
          <input
            className="w-full rounded border px-3 py-1.5"
            name="key"
            placeholder="key"
            required
          />
          <textarea
            className="h-28 w-full rounded border px-3 py-1.5"
            name="value"
            placeholder="value (string or JSON)"
          />
          <div className="flex items-center gap-3">
            <input
              className="rounded border px-3 py-1.5"
              name="ttlSeconds"
              placeholder="ttl seconds (optional)"
            />
            <label className="flex items-center gap-2">
              <input
                className="h-4 w-4"
                name="asJson"
                type="checkbox"
                value="true"
              />
              <span>Parse value as JSON</span>
            </label>
          </div>
          <button
            className="rounded bg-green-600 px-3 py-1.5 text-white hover:bg-green-700"
            type="submit"
          >
            Save
          </button>
          {upsertState && (
            <p className={upsertState.ok ? "text-green-700" : "text-red-700"}>
              {upsertState.message}
            </p>
          )}
        </form>
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="mb-3 font-semibold">Get</h2>
        <form action={getAction} className="space-y-2">
          <input
            className="w-full rounded border px-3 py-1.5"
            name="key"
            placeholder="key"
            required
          />
          <button
            className="rounded bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700"
            type="submit"
          >
            Load
          </button>
          {getState && (
            <div className="text-sm">
              <p className={getState.ok ? "text-green-700" : "text-red-700"}>
                {getState.message}
              </p>
              {getState.data && (
                <pre className="mt-2 max-h-48 overflow-auto rounded bg-gray-100 p-2 text-xs">
                  {getState.data.value}
                </pre>
              )}
            </div>
          )}
        </form>
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="mb-3 font-semibold">Delete</h2>
        <form action={deleteAction} className="space-y-2">
          <input
            className="w-full rounded border px-3 py-1.5"
            name="key"
            placeholder="key"
            required
          />
          <button
            className="rounded bg-red-600 px-3 py-1.5 text-white hover:bg-red-700"
            type="submit"
          >
            Delete
          </button>
          {deleteState && (
            <p className={deleteState.ok ? "text-green-700" : "text-red-700"}>
              {deleteState.message}
            </p>
          )}
        </form>
      </section>

      <section className="rounded-lg border p-4 md:col-span-2">
        <h2 className="mb-3 font-semibold">Scan</h2>
        <form action={scanAction} className="space-y-2">
          <input
            className="w-full rounded border px-3 py-1.5"
            name="prefix"
            placeholder="prefix (optional)"
          />
          <button
            className="rounded bg-gray-700 px-3 py-1.5 text-white hover:bg-gray-800"
            type="submit"
          >
            Scan
          </button>
          {scanState && (
            <div className="text-sm">
              <p className={scanState.ok ? "text-green-700" : "text-red-700"}>
                {scanState.message}
              </p>
              {scanState.data && (
                <ul className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                  {scanState.data.keys.map((k) => (
                    <li
                      className="break-all rounded bg-gray-100 p-2 text-xs"
                      key={k}
                    >
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
  );
}
