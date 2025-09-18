import { KeyComponents, KeyType } from "../../types";
// Using KeyType as both type and value

/**
 * Canonical key builder for Redis-Metastore
 *
 * Enforces consistent key patterns across the entire system.
 * All Redis operations must go through this module to ensure
 * no ad-hoc keys are created.
 */

// Constants for magic numbers
const MIN_KEY_PARTS = 3;
const BASE_36_RADIX = 36;
const RANDOM_STRING_START = 2;
const RANDOM_STRING_END = 8;

/**
 * Sanitize a string component for use in Redis keys
 * Removes or replaces characters that could cause issues
 */
function sanitize(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9_-]/g, "_") // Replace invalid chars with underscore
    .replace(/_+/g, "_") // Collapse multiple underscores
    .replace(/^_|_$/g, ""); // Remove leading/trailing underscores
}

/**
 * Validate key components
 */
function validateComponents(components: KeyComponents): void {
  if (!components.domain?.trim()) {
    throw new Error("Domain is required for key generation");
  }
  if (!components.app?.trim()) {
    throw new Error("App is required for key generation");
  }
  if (!components.collection?.trim()) {
    throw new Error("Collection is required for key generation");
  }
}

/**
 * Build base key: {domain}:{app}:{collection}:{id}
 */
export function buildBaseKey(components: KeyComponents): string {
  validateComponents(components);

  const parts = [
    sanitize(components.domain),
    sanitize(components.app),
    sanitize(components.collection),
  ];

  if (components.id) {
    parts.push(sanitize(components.id));
  }

  return parts.join(":");
}

/**
 * Build latest pointer key: {base}:latest
 */
export function buildLatestKey(components: KeyComponents): string {
  if (!components.id) {
    throw new Error("ID is required for latest key");
  }
  return `${buildBaseKey(components)}:latest`;
}

/**
 * Build version key: {base}:version:{n}
 */
export function buildVersionKey(components: KeyComponents): string {
  if (!components.id) {
    throw new Error("ID is required for version key");
  }
  if (components.version === undefined || components.version < 1) {
    throw new Error("Valid version number is required for version key");
  }
  return `${buildBaseKey(components)}:version:${components.version}`;
}

/**
 * Build mutation key: {base}:mutation:{name}
 */
export function buildMutationKey(components: KeyComponents): string {
  if (!components.id) {
    throw new Error("ID is required for mutation key");
  }
  if (!components.mutation?.trim()) {
    throw new Error("Mutation name is required for mutation key");
  }
  return `${buildBaseKey(components)}:mutation:${sanitize(components.mutation)}`;
}

/**
 * Build transformation key: {base}:transformation:{name}
 */
export function buildTransformationKey(components: KeyComponents): string {
  if (!components.id) {
    throw new Error("ID is required for transformation key");
  }
  if (!components.transformation?.trim()) {
    throw new Error("Transformation name is required for transformation key");
  }
  return `${buildBaseKey(components)}:transformation:${sanitize(components.transformation)}`;
}

/**
 * Build index key: idx:{domain}:{app}:{collection}
 */
export function buildIndexKey(components: KeyComponents): string {
  validateComponents(components);
  return `idx:${sanitize(components.domain)}:${sanitize(components.app)}:${sanitize(components.collection)}`;
}

/**
 * Build audit stream key: stream:audit:{domain}:{app}:{collection}:{id}
 */
export function buildAuditKey(components: KeyComponents): string {
  if (!components.id) {
    throw new Error("ID is required for audit key");
  }
  validateComponents(components);
  return `stream:audit:${sanitize(components.domain)}:${sanitize(components.app)}:${sanitize(components.collection)}:${sanitize(components.id)}`;
}

/**
 * Build job queue key: queue:jobs:{domain}:{app}:{collection}:{transformation}
 */
export function buildJobQueueKey(components: KeyComponents): string {
  if (!components.transformation?.trim()) {
    throw new Error("Transformation name is required for job queue key");
  }
  validateComponents(components);
  return `queue:jobs:${sanitize(components.domain)}:${sanitize(components.app)}:${sanitize(components.collection)}:${sanitize(components.transformation)}`;
}

/**
 * Build job status key: job:{jobId}
 */
export function buildJobStatusKey(jobId: string): string {
  if (!jobId?.trim()) {
    throw new Error("Job ID is required for job status key");
  }
  return `job:${sanitize(jobId)}`;
}

/**
 * Universal key builder - routes to appropriate builder based on type
 */
export function buildKey(type: KeyType, components: KeyComponents): string {
  switch (type) {
    case KeyType.BASE:
      return buildBaseKey(components);
    case KeyType.LATEST:
      return buildLatestKey(components);
    case KeyType.VERSION:
      return buildVersionKey(components);
    case KeyType.MUTATION:
      return buildMutationKey(components);
    case KeyType.TRANSFORMATION:
      return buildTransformationKey(components);
    case KeyType.INDEX:
      return buildIndexKey(components);
    case KeyType.AUDIT:
      return buildAuditKey(components);
    case KeyType.JOB_QUEUE:
      return buildJobQueueKey(components);
    default:
      throw new Error(`Unknown key type: ${type}`);
  }
}

/**
 * Parse a key back into its components
 * Useful for debugging and introspection
 */
export function parseKey(
  key: string
): Partial<KeyComponents> & { keyType: KeyType } {
  const parts = key.split(":");

  // Handle special prefixes
  if (key.startsWith("idx:")) {
    return {
      keyType: KeyType.INDEX,
      domain: parts[1],
      app: parts[2],
      collection: parts[3],
    };
  }

  if (key.startsWith("stream:audit:")) {
    return {
      keyType: KeyType.AUDIT,
      domain: parts[2],
      app: parts[3],
      collection: parts[4],
      id: parts[5],
    };
  }

  if (key.startsWith("queue:jobs:")) {
    return {
      keyType: KeyType.JOB_QUEUE,
      domain: parts[2],
      app: parts[3],
      collection: parts[4],
      transformation: parts[5],
    };
  }

  if (key.startsWith("job:")) {
    return {
      keyType: KeyType.JOB_QUEUE, // Job status uses same type
      id: parts[1],
    };
  }

  // Handle regular keys
  if (parts.length < MIN_KEY_PARTS) {
    throw new Error(`Invalid key format: ${key}`);
  }

  const [domain, app, collection, id, ...rest] = parts;
  const components: Partial<KeyComponents> = { domain, app, collection };

  if (id) {
    components.id = id;
  }

  // Determine key type based on suffix
  if (rest.length === 0) {
    return { ...components, keyType: KeyType.BASE };
  }

  if (rest[0] === "latest") {
    return { ...components, keyType: KeyType.LATEST };
  }

  if (rest[0] === "version" && rest[1]) {
    return {
      ...components,
      keyType: KeyType.VERSION,
      version: Number.parseInt(rest[1], 10),
    };
  }

  if (rest[0] === "mutation" && rest[1]) {
    return {
      ...components,
      keyType: KeyType.MUTATION,
      mutation: rest[1],
    };
  }

  if (rest[0] === "transformation" && rest[1]) {
    return {
      ...components,
      keyType: KeyType.TRANSFORMATION,
      transformation: rest[1],
    };
  }

  throw new Error(`Unable to parse key: ${key}`);
}

/**
 * Generate a unique ID for new items
 * Uses timestamp + random component for uniqueness
 */
export function generateId(): string {
  const timestamp = Date.now().toString(BASE_36_RADIX);
  const random = Math.random().toString(BASE_36_RADIX).substring(RANDOM_STRING_START, RANDOM_STRING_END);
  return `${timestamp}_${random}`;
}

/**
 * Validate that a key follows canonical patterns
 */
export function validateKey(key: string): boolean {
  try {
    parseKey(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all possible keys for an item
 * Useful for cleanup operations
 */
export function getItemKeys(components: KeyComponents): string[] {
  if (!components.id) {
    throw new Error("ID is required to get item keys");
  }

  const keys = [
    buildBaseKey(components),
    buildLatestKey(components),
    buildAuditKey(components),
  ];

  // Add mutation keys if mutations are defined
  // Note: This would need collection config to be complete

  return keys;
}
