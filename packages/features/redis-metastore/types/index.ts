import type { RedisClientType } from "redis";
import type { z } from "zod";

/**
 * Object types that determine TTL and behavior policies.
 * Each type has specific expiration and versioning characteristics.
 */
export const ObjectType = {
  CONFIG: "config",     // Long-lived configuration data (no TTL)
  SETTINGS: "settings", // User/app settings (long TTL, 30 days)
  STATE: "state",       // Session/temporary state (short TTL, 1 hour)
  TEXTS: "texts",       // Immutable content (no TTL, versioned forever)
} as const;

export type ObjectType = typeof ObjectType[keyof typeof ObjectType];

/**
 * Job status for async transformations.
 * Represents the lifecycle states of a transformation job.
 */
export const JobStatus = {
  QUEUED: "queued",
  RUNNING: "running",
  DONE: "done",
  FAILED: "failed",
} as const;

export type JobStatus = typeof JobStatus[keyof typeof JobStatus];

/**
 * Transformation execution modes.
 * Determines how transformations are processed (inline vs async worker).
 */
export const TransformationMode = {
  WORKER: "worker",
  INLINE: "inline",
} as const;

export type TransformationMode = typeof TransformationMode[keyof typeof TransformationMode];

/**
 * TTL policies based on object type.
 * Defines default expiration times in seconds for each object type.
 * undefined means no expiration.
 */
export const TTL_POLICIES: Record<ObjectType, number | undefined> = {
  [ObjectType.CONFIG]: undefined,    // No expiration
  // biome-ignore lint/style/noMagicNumbers: <explanation>
  [ObjectType.SETTINGS]: 30 * 24 * 60 * 60, // 30 days
  [ObjectType.STATE]: 60 * 60,       // 1 hour
  [ObjectType.TEXTS]: undefined,     // No expiration
} as const;

/**
 * Base configuration for a repository.
 * Defines the domain, app name, and collections for a Redis-Metastore repository.
 */
export type RepoConfig = {
  domain: string;
  app: string;
  collections: Record<string, CollectionConfig>;
};

/**
 * Configuration for a single collection.
 * Defines schema, TTL policy, mutations, and transformations for a collection.
 * @template T - The data type stored in this collection
 */
export type CollectionConfig<T = unknown> = {
  objectType: ObjectType;
  schema?: z.ZodSchema<T>;
  ttl?: number; // Override default TTL policy
  mutations?: Record<string, MutationConfig<T, unknown>>;
  transformations?: Record<string, TransformationConfig>;
};

/**
 * Configuration for inline mutations.
 * Pure functions that transform document data synchronously.
 * @template T - Input document type
 * @template R - Result type
 */
export type MutationConfig<T = unknown, R = unknown> = (doc: T) => R;

/**
 * Configuration for async transformations.
 * Defines execution mode and retry policies for worker-backed operations.
 */
export type TransformationConfig = {
  mode: TransformationMode;
  timeout?: number; // Timeout in seconds
  retries?: number; // Number of retries on failure
};

/**
 * Repository item with metadata.
 * Represents a stored document with its metadata (version, timestamps).
 * @template T - The data type stored in this item
 */
export type RepoItem<T = unknown> = {
  id: string;
  version: number;
  data: T;
  createdAt: Date;
  updatedAt: Date;
  ttl?: number;
};

/**
 * Version information.
 * Metadata about a specific version of a repository item.
 */
export type VersionInfo = {
  version: number;
  createdAt: Date;
  ttl?: number;
};

/**
 * Mutation result.
 * The output of a mutation operation with execution metadata.
 * @template T - The result data type
 */
export type MutationResult<T = unknown> = {
  id: string;
  mutation: string;
  result: T;
  executedAt: Date;
};

/**
 * Transformation job.
 * Represents an async transformation task with its execution state.
 */
export type TransformationJob = {
  id: string;
  domain: string;
  app: string;
  collection: string;
  itemId: string;
  transformation: string;
  status: JobStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  retries: number;
};

/**
 * Transformation result.
 * The output of a completed transformation with execution metadata.
 * @template T - The result data type
 */
export type TransformationResult<T = unknown> = {
  id: string;
  transformation: string;
  result: T;
  completedAt: Date;
  jobId: string;
};

/**
 * Audit entry.
 * Record of an operation performed on a repository item.
 * Used for change tracking and history.
 */
export type AuditEntry = {
  id: string;
  domain: string;
  app: string;
  collection: string;
  itemId: string;
  operation: "create" | "update" | "delete" | "mutation" | "transformation";
  version?: number;
  mutation?: string;
  transformation?: string;
  timestamp: Date;
  data?: unknown;
};

/**
 * Collection client type.
 * Provides methods for interacting with a specific collection.
 * @template T - The data type stored in this collection
 */
export type CollectionClient<T = unknown> = {
  create(data: T): Promise<{ id: string; version: number }>;
  get(id: string, options?: { version?: number }): Promise<RepoItem<T> | null>;
  update(id: string, data: Partial<T>): Promise<{ version: number }>;
  delete(id: string): Promise<boolean>;
  list(options?: { limit?: number; offset?: number }): Promise<RepoItem<T>[]>;
  
  // Version management
  getVersion(id: string, version: number): Promise<RepoItem<T> | null>;
  listVersions(id: string): Promise<VersionInfo[]>;
  
  // Mutations
  runMutation<R = unknown>(id: string, mutation: string): Promise<R>;
  materializeMutation(id: string, mutation: string): Promise<void>;
  getMutation<R = unknown>(id: string, mutation: string): Promise<MutationResult<R> | null>;
  
  // Transformations
  runTransformation(id: string, transformation: string): Promise<string>; // Returns job ID
  getTransformation<R = unknown>(id: string, transformation: string): Promise<TransformationResult<R> | null>;
  getTransformationByName<R = unknown>(id: string, transformation: string): Promise<R | null>;
};

/**
 * Repository client type.
 * Dynamic record of collection clients indexed by collection name.
 */
export type RepoClient = {
  [collectionName: string]: CollectionClient<unknown>;
};

/**
 * Repository factory result.
 * The output of the repository factory with connection method.
 */
export type Repository = {
  connect(client: RedisClientType, options?: RepoOptions): RepoClient;
  config: RepoConfig;
};

/**
 * Key components for building canonical keys.
 * Used to construct consistent Redis key patterns across the system.
 */
export type KeyComponents = {
  domain: string;
  app: string;
  collection: string;
  id?: string;
  version?: number;
  mutation?: string;
  transformation?: string;
};

/**
 * Key types for different Redis key patterns
 */
export const KeyType = {
  BASE: "base",
  LATEST: "latest", 
  VERSION: "version",
  MUTATION: "mutation",
  TRANSFORMATION: "transformation",
  INDEX: "index",
  AUDIT: "audit",
  JOB_QUEUE: "job_queue",
} as const;

export type KeyType = typeof KeyType[keyof typeof KeyType];

/**
 * Options for repository operations.
 * Configuration options that affect repository behavior.
 */
export type RepoOptions = {
  enableAudit?: boolean;
  auditStream?: string;
};

/**
 * Worker processor function.
 * Function signature for transformation worker implementations.
 * @template T - Input document type
 * @template R - Result type
 */
export type WorkerProcessor<T = unknown, R = unknown> = (
  doc: RepoItem<T>,
  job: TransformationJob
) => Promise<R>;

/**
 * Worker configuration.
 * Settings that control worker behavior, concurrency, and retry policy.
 */
export type WorkerConfig = {
  concurrency?: number;
  pollInterval?: number; // milliseconds
  maxRetries?: number;
  retryDelay?: number; // milliseconds
};
