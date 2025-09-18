import { z } from "zod";

export const keySchema = z.string().min(1, "Key is required").max(512);

// Raw value from form; we may JSON.parse inside actions
export const rawValueSchema = z.string().default("");

// Optional TTL (seconds). Empty string -> undefined
export const ttlSchema = z
  .union([z.coerce.number().int().positive(), z.literal("")])
  .optional()
  .transform((v) => (v === "" ? undefined : (v as number)));

export const upsertSchema = z.object({
  key: keySchema,
  value: rawValueSchema,
  ttlSeconds: ttlSchema,
  asJson: z.coerce.boolean().optional().default(false),
});

export const getSchema = z.object({ key: keySchema });
export const deleteSchema = z.object({ key: keySchema });

export const scanSchema = z.object({
  prefix: z.string().optional().default(""),
  cursor: z.string().optional().default("0"),
});

export type UpsertInput = z.infer<typeof upsertSchema>;
export type GetInput = z.infer<typeof getSchema>;
export type DeleteInput = z.infer<typeof deleteSchema>;
export type ScanInput = z.infer<typeof scanSchema>;
