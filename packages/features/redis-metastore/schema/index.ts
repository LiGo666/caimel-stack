import { z } from "zod";
import type { 
  RepoConfig, 
  CollectionConfig
} from "../types";
import { 
  ObjectType, 
  TransformationMode, 
  JobStatus, 
  KeyType 
} from "../types";

/**
 * Schema validation for Redis-Metastore
 * 
 * Provides Zod schemas for all configuration and data structures
 * to ensure type safety and runtime validation.
 */

/**
 * Object type schema
 */
export const ObjectTypeSchema = z.enum(Object.values(ObjectType) as [string, ...string[]]);

/**
 * Transformation mode schema
 */
export const TransformationModeSchema = z.enum(Object.values(TransformationMode) as [string, ...string[]]);

/**
 * Job status schema
 */
export const JobStatusSchema = z.enum(Object.values(JobStatus) as [string, ...string[]]);

/**
 * Transformation configuration schema
 */
export const TransformationConfigSchema = z.object({
  mode: TransformationModeSchema,
  timeout: z.number().positive().optional(),
  retries: z.number().min(0).optional(),
});

/**
 * Collection configuration schema
 */
export const CollectionConfigSchema = z.object({
  objectType: ObjectTypeSchema,
  schema: z.any().optional(), // ZodSchema - can't validate structure at compile time
  ttl: z.number().positive().optional(),
  mutations: z.record(z.string(), z.function()).optional(),
  transformations: z.record(z.string(), TransformationConfigSchema).optional(),
});

/**
 * Repository configuration schema
 */
export const RepoConfigSchema = z.object({
  domain: z.string().min(1).regex(/^[a-zA-Z0-9_-]+$/, "Domain must contain only alphanumeric characters, underscores, and hyphens"),
  app: z.string().min(1).regex(/^[a-zA-Z0-9_-]+$/, "App must contain only alphanumeric characters, underscores, and hyphens"),
  collections: z.record(z.string(), CollectionConfigSchema).refine(
    (collections) => Object.keys(collections).length > 0,
    "At least one collection must be defined"
  ),
});

/**
 * Repository item schema
 */
export const RepoItemSchema = z.object({
  id: z.string().min(1),
  version: z.number().positive(),
  data: z.any(),
  createdAt: z.date(),
  updatedAt: z.date(),
  ttl: z.number().positive().optional(),
});

/**
 * Version info schema
 */
export const VersionInfoSchema = z.object({
  version: z.number().positive(),
  createdAt: z.date(),
  ttl: z.number().positive().optional(),
});

/**
 * Mutation result schema
 */
export const MutationResultSchema = z.object({
  id: z.string().min(1),
  mutation: z.string().min(1),
  result: z.any(),
  executedAt: z.date(),
});

/**
 * Transformation job schema
 */
export const TransformationJobSchema = z.object({
  id: z.string().min(1),
  domain: z.string().min(1),
  app: z.string().min(1),
  collection: z.string().min(1),
  itemId: z.string().min(1),
  transformation: z.string().min(1),
  status: JobStatusSchema,
  createdAt: z.date(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  error: z.string().optional(),
  retries: z.number().min(0),
});

/**
 * Transformation result schema
 */
export const TransformationResultSchema = z.object({
  id: z.string().min(1),
  transformation: z.string().min(1),
  result: z.any(),
  completedAt: z.date(),
  jobId: z.string().min(1),
});

/**
 * Audit entry schema
 */
export const AuditEntrySchema = z.object({
  id: z.string().min(1),
  domain: z.string().min(1),
  app: z.string().min(1),
  collection: z.string().min(1),
  itemId: z.string().min(1),
  operation: z.enum(["create", "update", "delete", "mutation", "transformation"] as const),
  version: z.number().positive().optional(),
  mutation: z.string().optional(),
  transformation: z.string().optional(),
  timestamp: z.date(),
  data: z.any().optional(),
});

/**
 * Key type schema
 */
export const KeyTypeSchema = z.enum(Object.values(KeyType) as [string, ...string[]]);

/**
 * Key components schema
 */
export const KeyComponentsSchema = z.object({
  domain: z.string().min(1),
  app: z.string().min(1),
  collection: z.string().min(1),
  id: z.string().min(1).optional(),
  version: z.number().positive().optional(),
  mutation: z.string().min(1).optional(),
  transformation: z.string().min(1).optional(),
});

/**
 * Worker configuration schema
 */
export const WorkerConfigSchema = z.object({
  concurrency: z.number().positive().optional(),
  pollInterval: z.number().positive().optional(),
  maxRetries: z.number().min(0).optional(),
  retryDelay: z.number().positive().optional(),
});

/**
 * Repository options schema
 */
export const RepoOptionsSchema = z.object({
  enableAudit: z.boolean().optional(),
  auditStream: z.string().optional(),
});

/**
 * Validate repository configuration
 */
export function validateRepoConfig(config: unknown): RepoConfig {
  // We need to cast the result to RepoConfig since the Zod schema validation
  // doesn't perfectly align with our TypeScript types after the interface to type conversion
  return RepoConfigSchema.parse(config) as unknown as RepoConfig;
}

/**
 * Validate collection configuration
 */
export function validateCollectionConfig<T = unknown>(config: unknown): CollectionConfig<T> {
  // We need to cast the result to CollectionConfig<T> since the Zod schema validation
  // doesn't perfectly align with our TypeScript types after the interface to type conversion
  return CollectionConfigSchema.parse(config) as unknown as CollectionConfig<T>;
}

/**
 * Validate data against a collection's schema
 */
export function validateData<T>(data: unknown, schema?: z.ZodSchema<T>): T {
  if (!schema) {
    return data as T;
  }
  return schema.parse(data);
}

/**
 * Create a schema for repository item data
 */
export function createItemSchema<T>(dataSchema?: z.ZodSchema<T>) {
  return z.object({
    id: z.string().min(1),
    version: z.number().positive(),
    data: dataSchema || z.any(),
    createdAt: z.date(),
    updatedAt: z.date(),
    ttl: z.number().positive().optional(),
  });
}

/**
 * Validate partial data for updates
 */
export function validatePartialData<T>(
  data: unknown, 
  schema?: z.ZodSchema<T>
): Partial<T> {
  if (!schema) {
    return data as Partial<T>;
  }
  
  // For object schemas, use partial()
  if (schema instanceof z.ZodObject) {
    const partialSchema = schema.partial();
    // Cast the result to Partial<T> since we know this is an object schema
    return partialSchema.parse(data) as Partial<T>;
  }
  
  // For non-object schemas, just use the schema as is
  // This allows partial updates for primitive values
  return schema.parse(data) as Partial<T>;
}

/**
 * Safe JSON parsing with validation
 */
export function safeJsonParse<T>(
  json: string,
  schema?: z.ZodSchema<T>
): T | null {
  try {
    const parsed = JSON.parse(json);
    return schema ? schema.parse(parsed) : parsed;
  } catch {
    return null;
  }
}

/**
 * Safe JSON stringification
 */
export function safeJsonStringify(data: unknown): string {
  try {
    return JSON.stringify(data);
  } catch (error) {
    throw new Error(`Failed to serialize data: ${error instanceof Error ? error.message : String(error)}`);
  }
}
