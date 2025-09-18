import type { RedisClientType } from "redis";
import type { KeyComponents, RepoItem, VersionInfo } from "../../types";
import { buildLatestKey, buildVersionKey } from "../key";
import { safeJsonParse, safeJsonStringify } from "../../schema";

// Regex patterns defined at module level for performance
const VERSION_REGEX = /:(\d+)$/;

/**
 * Version management for Redis-Metastore
 *
 * Handles versioning logic including:
 * - Latest pointer management
 * - Version history
 * - Version retrieval
 * - Cleanup operations
 */

/**
 * Get the latest version number for an item
 */
export async function getLatestVersion(
  client: RedisClientType,
  components: KeyComponents
): Promise<number | null> {
  if (!components.id) {
    throw new Error("ID is required to get latest version");
  }

  const latestKey = buildLatestKey(components);
  const versionStr = await client.get(latestKey);

  if (!versionStr) {
    return null;
  }

  const versionNumber = Number.parseInt(versionStr, 10);
  return Number.isNaN(versionNumber) ? null : versionNumber;
}

/**
 * Set the latest version pointer
 */
export async function setLatestVersion(
  client: RedisClientType,
  components: KeyComponents,
  version: number,
  ttl?: number
): Promise<void> {
  if (!components.id) {
    throw new Error("ID is required to set latest version");
  }

  const latestKey = buildLatestKey(components);

  if (ttl && ttl > 0) {
    await client.set(latestKey, version.toString(), { EX: ttl });
  } else {
    await client.set(latestKey, version.toString());
  }
}

/**
 * Get the next version number for an item
 */
export async function getNextVersion(
  client: RedisClientType,
  components: KeyComponents
): Promise<number> {
  const currentVersion = await getLatestVersion(client, components);
  return (currentVersion || 0) + 1;
}

/**
 * Store a versioned item
 */
export async function storeVersion<T>(
  client: RedisClientType,
  components: KeyComponents,
  options: { version: number; item: RepoItem<T>; ttl?: number }
): Promise<void> {
  if (!components.id) {
    throw new Error("ID is required to store version");
  }

  const versionKey = buildVersionKey({
    ...components,
    version: options.version,
  });
  const data = safeJsonStringify(options.item);

  const ttl = options?.ttl;
  if (ttl && ttl > 0) {
    await client.set(versionKey, data, { EX: ttl });
  } else {
    await client.set(versionKey, data);
  }
}

/**
 * Retrieve a specific version of an item
 */
export async function getVersion<T = unknown>(
  client: RedisClientType,
  components: KeyComponents,
  version: number
): Promise<RepoItem<T> | null> {
  if (!components.id) {
    throw new Error("ID is required to get version");
  }

  const versionKey = buildVersionKey({ ...components, version });
  const data = await client.get(versionKey);

  if (!data) {
    return null;
  }

  return safeJsonParse<RepoItem<T>>(data);
}

/**
 * Get the latest version of an item
 */
export async function getLatest<T>(
  client: RedisClientType,
  components: KeyComponents
): Promise<RepoItem<T> | null> {
  const latestVersion = await getLatestVersion(client, components);

  if (!latestVersion) {
    return null;
  }

  return getVersion<T>(client, components, latestVersion);
}

/**
 * List all versions for an item
 */
/**
 * Helper function to process a single version key
 */
async function processVersionKey(
  client: RedisClientType,
  key: string
): Promise<VersionInfo | null> {
  const versionMatch = key.match(VERSION_REGEX);
  if (!versionMatch) {
    return null;
  }

  const versionNumber = Number.parseInt(versionMatch[1], 10);
  const ttl = await client.ttl(key);
  const data = await client.get(key);

  if (!data) {
    return null;
  }

  const item = safeJsonParse<RepoItem<unknown>>(data);
  if (!item) {
    return null;
  }

  return {
    version: versionNumber,
    createdAt: item.createdAt,
    ttl: ttl > 0 ? ttl : undefined,
  };
}

export async function listVersions(
  client: RedisClientType,
  components: KeyComponents
): Promise<VersionInfo[]> {
  if (!components.id) {
    throw new Error("ID is required to list versions");
  }

  // Build pattern to match all version keys
  const baseKey = buildVersionKey({ ...components, version: 1 }).replace(
    ":version:1",
    ":version:*"
  );
  const keys = await client.keys(baseKey);

  // Process all keys in parallel
  const versionPromises = keys.map((key) => processVersionKey(client, key));
  const versionResults = await Promise.all(versionPromises);

  // Filter out null results and sort by version number
  const versions = versionResults.filter((v): v is VersionInfo => v !== null);
  return versions.sort((a, b) => a.version - b.version);
}

/**
 * Check if a specific version exists
 */
export async function versionExists(
  client: RedisClientType,
  components: KeyComponents,
  version: number
): Promise<boolean> {
  if (!components.id) {
    throw new Error("ID is required to check version existence");
  }

  const versionKey = buildVersionKey({ ...components, version });
  const exists = await client.exists(versionKey);
  return exists === 1;
}

/**
 * Delete a specific version
 */
export async function deleteVersion(
  client: RedisClientType,
  components: KeyComponents,
  version: number
): Promise<boolean> {
  if (!components.id) {
    throw new Error("ID is required to delete version");
  }

  const versionKey = buildVersionKey({ ...components, version });
  const deleted = await client.del(versionKey);
  return deleted === 1;
}

/**
 * Delete all versions for an item
 */
export async function deleteAllVersions(
  client: RedisClientType,
  components: KeyComponents
): Promise<number> {
  if (!components.id) {
    throw new Error("ID is required to delete all versions");
  }

  // Get all version keys
  const baseKey = buildVersionKey({ ...components, version: 1 }).replace(
    ":version:1",
    ":version:*"
  );
  const keys = await client.keys(baseKey);

  if (keys.length === 0) {
    return 0;
  }

  // Delete all version keys
  const deleted = await client.del(keys);

  // Also delete the latest pointer
  const latestKey = buildLatestKey(components);
  await client.del(latestKey);

  return deleted;
}

/**
 * Cleanup old versions based on retention policy
 */
export async function cleanupOldVersions(
  client: RedisClientType,
  components: KeyComponents,
  keepVersions = 10
): Promise<number> {
  if (!components.id) {
    throw new Error("ID is required to cleanup versions");
  }

  if (Number.isNaN(keepVersions) || keepVersions < 1) {
    throw new Error("Must keep at least 1 version");
  }

  const versions = await listVersions(client, components);

  if (versions.length <= keepVersions) {
    return 0; // Nothing to cleanup
  }

  // Sort by version (oldest first) and determine which to delete
  const sortedVersions = versions.sort((a, b) => a.version - b.version);
  const versionsToDelete = sortedVersions.slice(
    0,
    versions.length - keepVersions
  );

  let deletedCount = 0;

  for (const versionInfo of versionsToDelete) {
    const deleted = await deleteVersion(
      client,
      components,
      versionInfo.version
    );
    if (deleted) {
      deletedCount++;
    }
  }

  return deletedCount;
}

/**
 * Get version statistics for an item
 */
export async function getVersionStats(
  client: RedisClientType,
  components: KeyComponents
): Promise<{
  totalVersions: number;
  latestVersion: number | null;
  oldestVersion: number | null;
  totalSize: number; // Approximate size in bytes
}> {
  const versions = await listVersions(client, components);
  const latestVersion = await getLatestVersion(client, components);

  let totalSize = 0;

  // Calculate approximate total size
  for (const versionInfo of versions) {
    const versionKey = buildVersionKey({
      ...components,
      version: versionInfo.version,
    });
    const data = await client.get(versionKey);
    if (data) {
      totalSize += Buffer.byteLength(data, "utf8");
    }
  }

  return {
    totalVersions: versions.length,
    latestVersion,
    oldestVersion:
      versions.length > 0 ? Math.min(...versions.map((v) => v.version)) : null,
    totalSize,
  };
}
