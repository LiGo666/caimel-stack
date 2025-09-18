import type { RedisClientType } from "redis";
import type { RepoConfig, RepoItem, RepoOptions } from "../types";
import { defineRepo } from "../lib/repo";

/**
 * Server Actions for Redis-Metastore
 * 
 * High-level API wrappers that expose repository functionality
 * for use in Next.js server actions, API routes, or other server-side code.
 * 
 * These actions provide a thin, opinionated interface that's ideal for
 * external consumption while maintaining type safety.
 */

/**
 * Create a new item in a collection
 */
export async function createItem<T = any>(
  client: RedisClientType,
  repoConfig: RepoConfig,
  collectionName: string,
  data: T,
  options?: RepoOptions
): Promise<{ id: string; version: number }> {
  const repo = defineRepo(repoConfig);
  const repoClient = repo.connect(client, options);
  const collection = repoClient[collectionName];
  
  if (!collection) {
    throw new Error(`Collection '${collectionName}' not found`);
  }
  
  return collection.create(data);
}

/**
 * Get an item from a collection
 */
export async function getItem<T = any>(
  client: RedisClientType,
  repoConfig: RepoConfig,
  collectionName: string,
  id: string,
  version?: number,
  options?: RepoOptions
): Promise<RepoItem<T> | null> {
  const repo = defineRepo(repoConfig);
  const repoClient = repo.connect(client, options);
  const collection = repoClient[collectionName];
  
  if (!collection) {
    throw new Error(`Collection '${collectionName}' not found`);
  }
  
  return collection.get(id, version ? { version } : undefined);
}

/**
 * Update an item in a collection
 */
export async function updateItem<T = any>(
  client: RedisClientType,
  repoConfig: RepoConfig,
  collectionName: string,
  id: string,
  data: Partial<T>,
  options?: RepoOptions
): Promise<{ version: number }> {
  const repo = defineRepo(repoConfig);
  const repoClient = repo.connect(client, options);
  const collection = repoClient[collectionName];
  
  if (!collection) {
    throw new Error(`Collection '${collectionName}' not found`);
  }
  
  return collection.update(id, data);
}

/**
 * Delete an item from a collection
 */
export async function deleteItem(
  client: RedisClientType,
  repoConfig: RepoConfig,
  collectionName: string,
  id: string,
  options?: RepoOptions
): Promise<boolean> {
  const repo = defineRepo(repoConfig);
  const repoClient = repo.connect(client, options);
  const collection = repoClient[collectionName];
  
  if (!collection) {
    throw new Error(`Collection '${collectionName}' not found`);
  }
  
  return collection.delete(id);
}

/**
 * List items in a collection
 */
export async function listItems<T = any>(
  client: RedisClientType,
  repoConfig: RepoConfig,
  collectionName: string,
  listOptions?: { limit?: number; offset?: number },
  repoOptions?: RepoOptions
): Promise<RepoItem<T>[]> {
  const repo = defineRepo(repoConfig);
  const repoClient = repo.connect(client, repoOptions);
  const collection = repoClient[collectionName];
  
  if (!collection) {
    throw new Error(`Collection '${collectionName}' not found`);
  }
  
  return collection.list(listOptions);
}

/**
 * Run a mutation on an item
 */
export async function runMutation<R = any>(
  client: RedisClientType,
  repoConfig: RepoConfig,
  collectionName: string,
  id: string,
  mutationName: string,
  options?: RepoOptions
): Promise<R> {
  const repo = defineRepo(repoConfig);
  const repoClient = repo.connect(client, options);
  const collection = repoClient[collectionName];
  
  if (!collection) {
    throw new Error(`Collection '${collectionName}' not found`);
  }
  
  return collection.runMutation<R>(id, mutationName);
}

/**
 * Materialize a mutation result
 */
export async function materializeMutation(
  client: RedisClientType,
  repoConfig: RepoConfig,
  collectionName: string,
  id: string,
  mutationName: string,
  options?: RepoOptions
): Promise<void> {
  const repo = defineRepo(repoConfig);
  const repoClient = repo.connect(client, options);
  const collection = repoClient[collectionName];
  
  if (!collection) {
    throw new Error(`Collection '${collectionName}' not found`);
  }
  
  return collection.materializeMutation(id, mutationName);
}

/**
 * Get a materialized mutation result
 */
export async function getMutation<R = any>(
  client: RedisClientType,
  repoConfig: RepoConfig,
  collectionName: string,
  id: string,
  mutationName: string,
  options?: RepoOptions
): Promise<R | null> {
  const repo = defineRepo(repoConfig);
  const repoClient = repo.connect(client, options);
  const collection = repoClient[collectionName];
  
  if (!collection) {
    throw new Error(`Collection '${collectionName}' not found`);
  }
  
  return collection.getMutation<R>(id, mutationName);
}

/**
 * Run a transformation on an item
 */
export async function runTransformation(
  client: RedisClientType,
  repoConfig: RepoConfig,
  collectionName: string,
  id: string,
  transformationName: string,
  options?: RepoOptions
): Promise<string> {
  const repo = defineRepo(repoConfig);
  const repoClient = repo.connect(client, options);
  const collection = repoClient[collectionName];
  
  if (!collection) {
    throw new Error(`Collection '${collectionName}' not found`);
  }
  
  return collection.runTransformation(id, transformationName);
}

/**
 * Get a transformation result
 */
export async function getTransformation<R = any>(
  client: RedisClientType,
  repoConfig: RepoConfig,
  collectionName: string,
  id: string,
  transformationName: string,
  options?: RepoOptions
): Promise<R | null> {
  const repo = defineRepo(repoConfig);
  const repoClient = repo.connect(client, options);
  const collection = repoClient[collectionName];
  
  if (!collection) {
    throw new Error(`Collection '${collectionName}' not found`);
  }
  
  return collection.getTransformationByName<R>(id, transformationName);
}

/**
 * Get item versions
 */
export async function getItemVersions(
  client: RedisClientType,
  repoConfig: RepoConfig,
  collectionName: string,
  id: string,
  options?: RepoOptions
) {
  const repo = defineRepo(repoConfig);
  const repoClient = repo.connect(client, options);
  const collection = repoClient[collectionName];
  
  if (!collection) {
    throw new Error(`Collection '${collectionName}' not found`);
  }
  
  return collection.listVersions(id);
}

/**
 * Batch operations for efficiency
 */

/**
 * Create multiple items in a collection
 */
export async function createItems<T = any>(
  client: RedisClientType,
  repoConfig: RepoConfig,
  collectionName: string,
  items: T[],
  options?: RepoOptions
): Promise<Array<{ id: string; version: number }>> {
  const repo = defineRepo(repoConfig);
  const repoClient = repo.connect(client, options);
  const collection = repoClient[collectionName];
  
  if (!collection) {
    throw new Error(`Collection '${collectionName}' not found`);
  }
  
  // Execute creates in parallel
  return Promise.all(
    items.map(item => collection.create(item))
  );
}

/**
 * Get multiple items by their IDs
 */
export async function getItems<T = any>(
  client: RedisClientType,
  repoConfig: RepoConfig,
  collectionName: string,
  ids: string[],
  options?: RepoOptions
): Promise<Array<RepoItem<T> | null>> {
  const repo = defineRepo(repoConfig);
  const repoClient = repo.connect(client, options);
  const collection = repoClient[collectionName];
  
  if (!collection) {
    throw new Error(`Collection '${collectionName}' not found`);
  }
  
  // Execute gets in parallel
  return Promise.all(
    ids.map(id => collection.get(id))
  );
}

/**
 * Update multiple items
 */
export async function updateItems<T = any>(
  client: RedisClientType,
  repoConfig: RepoConfig,
  collectionName: string,
  updates: Array<{ id: string; data: Partial<T> }>,
  options?: RepoOptions
): Promise<Array<{ id: string; version: number }>> {
  const repo = defineRepo(repoConfig);
  const repoClient = repo.connect(client, options);
  const collection = repoClient[collectionName];
  
  if (!collection) {
    throw new Error(`Collection '${collectionName}' not found`);
  }
  
  // Execute updates in parallel
  const results = await Promise.all(
    updates.map(async ({ id, data }) => {
      const result = await collection.update(id, data);
      return { id, version: result.version };
    })
  );
  
  return results;
}

/**
 * Delete multiple items
 */
export async function deleteItems(
  client: RedisClientType,
  repoConfig: RepoConfig,
  collectionName: string,
  ids: string[],
  options?: RepoOptions
): Promise<Array<{ id: string; deleted: boolean }>> {
  const repo = defineRepo(repoConfig);
  const repoClient = repo.connect(client, options);
  const collection = repoClient[collectionName];
  
  if (!collection) {
    throw new Error(`Collection '${collectionName}' not found`);
  }
  
  // Execute deletes in parallel
  const results = await Promise.all(
    ids.map(async (id) => {
      const deleted = await collection.delete(id);
      return { id, deleted };
    })
  );
  
  return results;
}

/**
 * Utility functions
 */

/**
 * Check if an item exists
 */
export async function itemExists(
  client: RedisClientType,
  repoConfig: RepoConfig,
  collectionName: string,
  id: string,
  options?: RepoOptions
): Promise<boolean> {
  const item = await getItem(client, repoConfig, collectionName, id, undefined, options);
  return item !== null;
}

/**
 * Get collection statistics
 */
export async function getCollectionStats(
  client: RedisClientType,
  repoConfig: RepoConfig,
  collectionName: string,
  options?: RepoOptions
): Promise<{
  totalItems: number;
  sampleItems: RepoItem<any>[];
}> {
  const items = await listItems(client, repoConfig, collectionName, { limit: 10 }, options);
  
  // Get total count by listing all items (this could be optimized with a separate count operation)
  const allItems = await listItems(client, repoConfig, collectionName, { limit: 10000 }, options);
  
  return {
    totalItems: allItems.length,
    sampleItems: items,
  };
}
