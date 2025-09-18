"use server";

import { z } from "zod";
import { del, get, scanPrefix, upsert } from "../lib/crud";
import {
  deleteSchema,
  getSchema,
  scanSchema,
  upsertSchema,
} from "../schema/crud";

export type ActionResult<T = unknown> = {
  ok: boolean;
  message?: string;
  data?: T;
};

function toResult<T>(ok: boolean, message?: string, data?: T): ActionResult<T> {
  return { ok, message, data };
}

// Low-level helpers moved to ../lib/crud (server-only)

// UI-facing server actions compatible with useActionState
export async function actionUpsert(
  prevState: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  try {
    const parsed = upsertSchema.parse({
      key: formData.get("key"),
      value: formData.get("value") ?? "",
      ttlSeconds: formData.get("ttlSeconds") ?? "",
      asJson: formData.get("asJson") ?? "false",
    });
    await upsert(parsed);
    return toResult(true, `Saved key '${parsed.key}'.`);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return toResult(false, err.issues.map((i) => i.message).join("; "));
    }
    return toResult(false, (err as Error).message);
  }
}

export async function actionGet(
  prevState: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult<{ value: string | null }>> {
  try {
    const { key } = getSchema.parse({ key: formData.get("key") });
    const value = await get(key);
    return toResult<{ value: string | null }>(
      true,
      value === null ? `Key '${key}' not found.` : `Loaded '${key}'.`,
      { value }
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return toResult<{ value: string | null }>(
        false,
        err.issues.map((i) => i.message).join("; ")
      );
    }
    return toResult<{ value: string | null }>(false, (err as Error).message);
  }
}

export async function actionDelete(
  prevState: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult<{ deleted: number }>> {
  try {
    const { key } = deleteSchema.parse({ key: formData.get("key") });
    const deleted = await del(key);
    return toResult(
      true,
      deleted ? `Deleted '${key}'.` : `No key '${key}' to delete.`,
      { deleted }
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return toResult<{ deleted: number }>(
        false,
        err.issues.map((i) => i.message).join("; ")
      );
    }
    return toResult<{ deleted: number }>(false, (err as Error).message);
  }
}

export async function actionScan(
  prevState: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult<{ keys: string[] }>> {
  try {
    const { prefix } = scanSchema.parse({
      prefix: formData.get("prefix") ?? "",
    });
    const keys = await scanPrefix(prefix);
    return toResult(true, `Found ${keys.length} keys.`, { keys });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return toResult<{ keys: string[] }>(
        false,
        err.issues.map((i) => i.message).join("; ")
      );
    }
    return toResult<{ keys: string[] }>(false, (err as Error).message);
  }
}
