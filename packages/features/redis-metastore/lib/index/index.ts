/** biome-ignore-all lint/style/noMagicNumbers: <explanation> */
import type { RedisClientType } from "redis";
import type { KeyComponents } from "../../types";
import { buildIndexKey } from "../key";

// Constants for pagination and limits
const DEFAULT_LIMIT = 10;
const DEFAULT_OFFSET = 0;
const EXPECTED_KEY_PARTS = 4;
const APP_INDEX = 2;
const COLLECTION_INDEX = 3;

/**
 * Index management for Redis-Metastore
 *
 * Maintains discovery indexes for collections, items, and operations.
 * Uses Redis Sets for efficient membership testing and enumeration.
 */

/**
 * Add an item to the collection index
 */
export async function addToIndex(
  client: RedisClientType,
  components: KeyComponents,
  itemId: string
): Promise<void> {
  const indexKey = buildIndexKey(components);
  await client.sAdd(indexKey, itemId);
}

/**
 * Remove an item from the collection index
 */
export async function removeFromIndex(
  client: RedisClientType,
  components: KeyComponents,
  itemId: string
): Promise<boolean> {
  const indexKey = buildIndexKey(components);
  const removed = await client.sRem(indexKey, itemId);
  return removed === 1;
}

/**
 * Check if an item exists in the collection index
 */
export async function existsInIndex(
  client: RedisClientType,
  components: KeyComponents,
  itemId: string
): Promise<boolean> {
  const indexKey = buildIndexKey(components);
  return await client.sIsMember(indexKey, itemId);
}

/**
 * Get all items in a collection
 */
export async function getCollectionItems(
  client: RedisClientType,
  components: KeyComponents
): Promise<string[]> {
  const indexKey = buildIndexKey(components);
  return await client.sMembers(indexKey);
}

/**
 * Get collection size (number of items)
 */
export async function getCollectionSize(
  client: RedisClientType,
  components: KeyComponents
): Promise<number> {
  const indexKey = buildIndexKey(components);
  return await client.sCard(indexKey);
}

/**
 * Get paginated collection items
 */
export async function getCollectionItemsPaginated(
  client: RedisClientType,
  components: KeyComponents,
  options: {
    limit?: number;
    offset?: number;
  } = {}
): Promise<{
  items: string[];
  total: number;
  hasMore: boolean;
}> {
  const { limit = DEFAULT_LIMIT, offset = DEFAULT_OFFSET } = options;

  const indexKey = buildIndexKey(components);
  const total = await client.sCard(indexKey);

  if (offset >= total) {
    return {
      items: [],
      total,
      hasMore: false,
    };
  }

  // Redis doesn't have native pagination for sets, so we get all and slice
  // For large sets, consider using sorted sets with scores
  const allItems = await client.sMembers(indexKey);
  const items = allItems.slice(offset, offset + limit);

  return {
    items,
    total,
    hasMore: offset + items.length < total,
  };
}

/**
 * Get random items from a collection
 */
export async function getRandomCollectionItems(
  client: RedisClientType,
  components: KeyComponents,
  count = 1
): Promise<string[]> {
  const indexKey = buildIndexKey(components);
  const result = await client.sRandMember(indexKey, { COUNT: count });
  return Array.isArray(result)
    ? result
    : [result].filter((item): item is string => Boolean(item));
}

/**
 * Clear all items from a collection index
 */
export async function clearCollectionIndex(
  client: RedisClientType,
  components: KeyComponents
): Promise<boolean> {
  const indexKey = buildIndexKey(components);
  const deleted = await client.del(indexKey);
  return deleted > 0;
}

/**
 * Get intersection of multiple collections
 */
export async function getCollectionIntersection(
  client: RedisClientType,
  collections: KeyComponents[]
): Promise<string[]> {
  if (collections.length === 0) {
    return [];
  }

  if (collections.length === 1) {
    return await getCollectionItems(client, collections[0]);
  }

  const indexKeys = collections.map(buildIndexKey);
  return await client.sInter(indexKeys);
}

/**
 * Get union of multiple collections
 */
export async function getCollectionUnion(
  client: RedisClientType,
  collections: KeyComponents[]
): Promise<string[]> {
  if (collections.length === 0) {
    return [];
  }

  if (collections.length === 1) {
    return await getCollectionItems(client, collections[0]);
  }

  const indexKeys = collections.map(buildIndexKey);
  return await client.sUnion(indexKeys);
}

/**
 * Get difference between collections (items in first but not in others)
 */
export async function getCollectionDifference(
  client: RedisClientType,
  collections: KeyComponents[]
): Promise<string[]> {
  if (collections.length === 0) {
    return [];
  }

  if (collections.length === 1) {
    return await getCollectionItems(client, collections[0]);
  }

  const indexKeys = collections.map(buildIndexKey);
  return await client.sDiff(indexKeys);
}

/**
 * Domain-level operations
 */

/**
 * Get all collections in a domain
 */
export async function getDomainCollections(
  client: RedisClientType,
  domain: string
): Promise<Array<{ app: string; collection: string }>> {
  const pattern = `idx:${domain}:*`;
  const keys = await client.keys(pattern);

  const collections: Array<{ app: string; collection: string }> = [];

  for (const key of keys) {
    // Parse key: idx:domain:app:collection
    const parts = key.split(":");
    if (parts.length === EXPECTED_KEY_PARTS && parts[0] === "idx" && parts[1] === domain) {
      collections.push({
        app: parts[APP_INDEX],
        collection: parts[COLLECTION_INDEX],
      });
    }
  }

  return collections;
}

/**
 * Get all collections in an app
 */
export async function getAppCollections(
  client: RedisClientType,
  domain: string,
  app: string
): Promise<string[]> {
  const pattern = `idx:${domain}:${app}:*`;
  const keys = await client.keys(pattern);

  const collections: string[] = [];

  for (const key of keys) {
    // Parse key: idx:domain:app:collection
    const parts = key.split(":");
    if (
      parts.length === 4 &&
      parts[0] === "idx" &&
      parts[1] === domain &&
      parts[2] === app
    ) {
      collections.push(parts[3]);
    }
  }

  return collections;
}

/**
 * Get statistics for all collections in a domain
 */
export async function getDomainStats(
  client: RedisClientType,
  domain: string
): Promise<
  Array<{
    app: string;
    collection: string;
    itemCount: number;
  }>
> {
  const collections = await getDomainCollections(client, domain);

  const stats = await Promise.all(
    collections.map(async ({ app, collection }) => {
      const components = { domain, app, collection };
      const itemCount = await getCollectionSize(client, components);
      return { app, collection, itemCount };
    })
  );

  return stats;
}

/**
 * Get statistics for all collections in an app
 */
export async function getAppStats(
  client: RedisClientType,
  domain: string,
  app: string
): Promise<
  Array<{
    collection: string;
    itemCount: number;
  }>
> {
  const collections = await getAppCollections(client, domain, app);

  const stats = await Promise.all(
    collections.map(async (collection) => {
      const components = { domain, app, collection };
      const itemCount = await getCollectionSize(client, components);
      return { collection, itemCount };
    })
  );

  return stats;
}

/**
 * Batch operations for efficiency
 */

/**
 * Add multiple items to index in a single operation
 */
export async function addManyToIndex(
  client: RedisClientType,
  components: KeyComponents,
  itemIds: string[]
): Promise<number> {
  if (itemIds.length === 0) {
    return await 0;
  }

  const indexKey = buildIndexKey(components);
  return client.sAdd(indexKey, itemIds);
}

/**
 * Remove multiple items from index in a single operation
 */
export async function removeManyFromIndex(
  client: RedisClientType,
  components: KeyComponents,
  itemIds: string[]
): Promise<number> {
  if (itemIds.length === 0) {
    return await 0;
  }

  const indexKey = buildIndexKey(components);
  return client.sRem(indexKey, itemIds);
}

/**
 * Rebuild collection index by scanning for existing items
 */
export async function rebuildCollectionIndex(
  client: RedisClientType,
  components: KeyComponents
): Promise<number> {
  // Clear existing index
  await clearCollectionIndex(client, components);

  // Find all items by scanning for version keys
  const { domain, app, collection } = components;
  const pattern = `${domain}:${app}:${collection}:*:version:*`;
  const keys = await client.keys(pattern);

  const itemIds = new Set<string>();

  // Extract unique item IDs from version keys
  for (const key of keys) {
    // Parse key: domain:app:collection:id:version:n
    const parts = key.split(":");
    if (parts.length >= 6 && parts[4] === "version") {
      const itemId = parts[3];
      itemIds.add(itemId);
    }
  }

  // Add all found items to index
  if (itemIds.size > 0) {
    return addManyToIndex(client, components, Array.from(itemIds));
  }

  return 0;
}
