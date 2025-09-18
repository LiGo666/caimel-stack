import type { RedisClientType } from "redis";
import type {
  KeyComponents,
  MutationResult,
  MutationConfig,
} from "../../types";
import { buildMutationKey } from "../key";
import { getLatest } from "../version";
import { safeJsonParse, safeJsonStringify } from "../../schema";

// Regex patterns defined at module level for performance
const MUTATION_REGEX = /:mutation:([^:]+)$/;

/**
 * Mutation system for Redis-Metastore
 *
 * Handles inline, synchronous data transformations:
 * - Pure functions that transform document data
 * - Results cached at canonical keys
 * - Fast execution for simple transformations
 */

/**
 * Execute a mutation function on document data
 */
export async function runMutation<T, R>(
  client: RedisClientType,
  components: KeyComponents,
  mutationName: string,
  mutationFn: MutationConfig<T>
): Promise<R> {
  if (!components.id) {
    throw new Error("ID is required to run mutation");
  }

  // Get the latest version of the document
  const item = await getLatest<T>(client, components);
  if (!item) {
    throw new Error(`Item not found: ${components.id}`);
  }

  try {
    // Execute the mutation function
    const result = mutationFn(item.data);
    return result as R;
  } catch (error) {
    throw new Error(
      `Mutation '${mutationName}' failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Execute and materialize a mutation (store result in Redis)
 */
export async function materializeMutation<T, R>(
  client: RedisClientType,
  components: KeyComponents,
  mutationName: string,
  options: { mutationFn: MutationConfig<T>; ttl?: number }
): Promise<MutationResult<R>> {
  if (!components.id) {
    throw new Error("ID is required to materialize mutation");
  }

  // Execute the mutation
  const result = await runMutation<T, R>(
    client,
    components,
    mutationName,
    options.mutationFn
  );

  // Create mutation result
  const mutationResult: MutationResult<R> = {
    id: components.id,
    mutation: mutationName,
    result,
    executedAt: new Date(),
  };

  // Store the result
  const mutationKey = buildMutationKey({
    ...components,
    mutation: mutationName,
  });
  const data = safeJsonStringify(mutationResult);

  const ttl = options.ttl;
  if (ttl && ttl > 0) {
    await client.set(mutationKey, data, { EX: ttl });
  } else {
    await client.set(mutationKey, data);
  }

  return mutationResult;
}

/**
 * Get a materialized mutation result
 */
export async function getMutation<R>(
  client: RedisClientType,
  components: KeyComponents,
  mutationName: string
): Promise<MutationResult<R> | null> {
  if (!components.id) {
    throw new Error("ID is required to get mutation");
  }

  const mutationKey = buildMutationKey({
    ...components,
    mutation: mutationName,
  });
  const data = await client.get(mutationKey);

  if (!data) {
    return null;
  }

  return safeJsonParse<MutationResult<R>>(data);
}

/**
 * Get just the result data from a materialized mutation
 */
export async function getMutationResult<R>(
  client: RedisClientType,
  components: KeyComponents,
  mutationName: string
): Promise<R | null> {
  const mutation = await getMutation<R>(client, components, mutationName);
  return mutation?.result || null;
}

/**
 * Check if a mutation result exists
 */
export async function mutationExists(
  client: RedisClientType,
  components: KeyComponents,
  mutationName: string
): Promise<boolean> {
  if (!components.id) {
    throw new Error("ID is required to check mutation existence");
  }

  const mutationKey = buildMutationKey({
    ...components,
    mutation: mutationName,
  });
  const exists = await client.exists(mutationKey);
  return exists === 1;
}

/**
 * Delete a materialized mutation
 */
export async function deleteMutation(
  client: RedisClientType,
  components: KeyComponents,
  mutationName: string
): Promise<boolean> {
  if (!components.id) {
    throw new Error("ID is required to delete mutation");
  }

  const mutationKey = buildMutationKey({
    ...components,
    mutation: mutationName,
  });
  const deleted = await client.del(mutationKey);
  return deleted === 1;
}

/**
 * List all materialized mutations for an item
 */
export async function listMutations(
  client: RedisClientType,
  components: KeyComponents
): Promise<string[]> {
  if (!components.id) {
    throw new Error("ID is required to list mutations");
  }

  // Build pattern to match all mutation keys for this item
  const baseKey = buildMutationKey({ ...components, mutation: "dummy" });
  const MUTATION_PATTERN = ":mutation:*";
  const pattern = baseKey.replace(":mutation:dummy", MUTATION_PATTERN);
  const keys = await client.keys(pattern);

  // Extract mutation names from keys
  const mutations: string[] = [];
  for (const key of keys) {
    const mutationMatch = key.match(MUTATION_REGEX);
    if (mutationMatch) {
      mutations.push(mutationMatch[1]);
    }
  }

  return mutations;
}

/**
 * Delete all mutations for an item
 */
export async function deleteAllMutations(
  client: RedisClientType,
  components: KeyComponents
): Promise<number> {
  if (!components.id) {
    throw new Error("ID is required to delete all mutations");
  }

  // Get all mutation keys
  const baseKey = buildMutationKey({ ...components, mutation: "dummy" });
  const MUTATION_PATTERN = ":mutation:*";
  const pattern = baseKey.replace(":mutation:dummy", MUTATION_PATTERN);
  const keys = await client.keys(pattern);

  if (keys.length === 0) {
    return 0;
  }

  // Delete all mutation keys
  return client.del(keys);
}

/**
 * Batch execute multiple mutations
 */
export async function runMutationBatch<T>(
  client: RedisClientType,
  components: KeyComponents,
  mutations: Array<{
    name: string;
    fn: MutationConfig<T>;
    materialize?: boolean;
    ttl?: number;
  }>
): Promise<Array<{ name: string; result: unknown; error?: string }>> {
  if (!components.id) {
    throw new Error("ID is required to run mutation batch");
  }

  // Get the document once for all mutations
  const item = await getLatest<T>(client, components);
  if (!item) {
    throw new Error(`Item not found: ${components.id}`);
  }

  const results: Array<{ name: string; result: unknown; error?: string }> = [];

  for (const mutation of mutations) {
    try {
      // Execute the mutation
      const result = mutation.fn(item.data);

      // Materialize if requested
      if (mutation.materialize) {
        await materializeMutation(client, components, mutation.name, {
          mutationFn: mutation.fn,
          ttl: mutation.ttl,
        });
      }

      results.push({
        name: mutation.name,
        result,
      });
    } catch (error) {
      results.push({
        name: mutation.name,
        result: null,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}

/**
 * Refresh a materialized mutation (re-execute and update)
 */
export function refreshMutation<T, R>(
  client: RedisClientType,
  components: KeyComponents,
  mutationName: string,
  options: { mutationFn: MutationConfig<T>; ttl?: number }
): Promise<MutationResult<R>> {
  // Simply re-materialize the mutation
  return materializeMutation<T, R>(client, components, mutationName, options);
}

/**
 * Get mutation statistics for an item
 */
export async function getMutationStats(
  client: RedisClientType,
  components: KeyComponents
): Promise<{
  totalMutations: number;
  mutations: Array<{
    name: string;
    executedAt: Date;
    size: number; // Approximate size in bytes
  }>;
}> {
  const mutationNames = await listMutations(client, components);

  const mutations = await Promise.all(
    mutationNames.map(async (name) => {
      const mutationKey = buildMutationKey({ ...components, mutation: name });
      const data = await client.get(mutationKey);
      const mutation = data
        ? safeJsonParse<MutationResult<unknown>>(data)
        : null;

      return {
        name,
        executedAt: mutation?.executedAt || new Date(0),
        size: data ? Buffer.byteLength(data, "utf8") : 0,
      };
    })
  );

  return {
    totalMutations: mutations.length,
    mutations,
  };
}
