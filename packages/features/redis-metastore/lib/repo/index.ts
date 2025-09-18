import type { RedisClientType } from "redis";
import type {
  RepoConfig,
  CollectionConfig,
  Repository,
  RepoClient,
  CollectionClient,
  RepoItem,
  RepoOptions,
} from "../../types";
import { TTL_POLICIES } from "../../types";
import {
  validateRepoConfig,
  validateData,
  validatePartialData,
} from "../../schema";
import { generateId } from "../key";
import {
  getLatest,
  getVersion,
  storeVersion,
  setLatestVersion,
  getNextVersion,
  listVersions,
  deleteAllVersions,
} from "../version";
import {
  addToIndex,
  removeFromIndex,
  getCollectionItemsPaginated,
} from "../index";
import {
  runMutation,
  materializeMutation,
  getMutationResult,
  deleteAllMutations,
} from "../mutation";
import {
  runTransformation,
  getTransformation,
  getTransformationByName,
} from "../transformation";
import { logAudit } from "../audit";

/**
 * Repository implementation for Redis-Metastore
 *
 * Provides the main API for working with structured data:
 * - CRUD operations with versioning
 * - Schema validation
 * - TTL management
 * - Mutation and transformation support
 * - Audit logging
 */

/**
 * Collection client implementation
 */
class CollectionClientImpl<T = unknown> implements CollectionClient<T> {
  private readonly client: RedisClientType;
  private readonly domain: string;
  private readonly app: string;
  private readonly collectionName: string;
  private readonly config: CollectionConfig<T>;
  private readonly options: RepoOptions;

  constructor(
    client: RedisClientType,
    options: {
      domain: string;
      app: string;
      collectionName: string;
      config: CollectionConfig<T>;
      repoOptions?: RepoOptions;
    }
  ) {
    this.client = client;
    this.domain = options.domain;
    this.app = options.app;
    this.collectionName = options.collectionName;
    this.config = options.config;
    this.options = options.repoOptions || {};
  }

  private getComponents(id?: string) {
    return {
      domain: this.domain,
      app: this.app,
      collection: this.collectionName,
      id,
    };
  }

  private getTTL(): number | undefined {
    // Use collection-specific TTL if set, otherwise use object type policy
    if (this.config.ttl !== undefined) {
      return this.config.ttl;
    }

    return TTL_POLICIES[this.config.objectType];
  }

  async create(data: T): Promise<{ id: string; version: number }> {
    // Validate data against schema
    const validatedData = validateData(data, this.config.schema);

    // Generate unique ID
    const id = generateId();
    const version = 1;
    const now = new Date();
    const ttl = this.getTTL();

    // Create repository item
    const item: RepoItem<T> = {
      id,
      version,
      data: validatedData,
      createdAt: now,
      updatedAt: now,
      ttl,
    };

    const components = this.getComponents(id);

    // Store versioned item
    await storeVersion(this.client, components, {
      version,
      item,
      ttl,
    });

    // Update latest pointer
    await setLatestVersion(this.client, components, version, ttl);

    // Add to collection index
    await addToIndex(this.client, components, id);

    // Log audit entry if enabled
    if (this.options.enableAudit) {
      await logAudit(this.client, components, "create", {
        version,
        data: validatedData,
      });
    }

    return { id, version };
  }

  async get(
    id: string,
    options?: { version?: number }
  ): Promise<RepoItem<T> | null> {
    const components = this.getComponents(id);

    if (options?.version) {
      return await getVersion<T>(this.client, components, options.version);
    }
    return await getLatest<T>(this.client, components);
  }

  async update(id: string, data: Partial<T>): Promise<{ version: number }> {
    const components = this.getComponents(id);

    // Get current item
    const currentItem = await getLatest<T>(this.client, components);
    if (!currentItem) {
      throw new Error(`Item not found: ${id}`);
    }

    // Validate partial data
    const validatedData = validatePartialData(data, this.config.schema);

    // Merge with existing data
    const mergedData = { ...currentItem.data, ...validatedData } as T;

    // Validate merged data against full schema
    const finalData = validateData(mergedData, this.config.schema);

    // Get next version
    const version = await getNextVersion(this.client, components);
    const now = new Date();
    const ttl = this.getTTL();

    // Create updated item
    const updatedItem: RepoItem<T> = {
      id,
      version,
      data: finalData,
      createdAt: currentItem.createdAt,
      updatedAt: now,
      ttl,
    };

    // Store updated version
    await storeVersion(this.client, components, {
      version,
      item: updatedItem,
      ttl,
    });

    // Update latest pointer
    await setLatestVersion(this.client, components, version, ttl);

    // Log audit entry if enabled
    if (this.options.enableAudit) {
      await logAudit(this.client, components, "update", {
        version,
        data: validatedData,
      });
    }

    return { version };
  }

  async delete(id: string): Promise<boolean> {
    const components = this.getComponents(id);

    // Check if item exists
    const item = await getLatest<T>(this.client, components);
    if (!item) {
      return false;
    }

    // Delete all versions
    const deletedVersions = await deleteAllVersions(this.client, components);

    // Remove from index
    await removeFromIndex(this.client, components, id);

    // Delete all mutations
    await deleteAllMutations(this.client, components);

    // Log audit entry if enabled
    if (this.options.enableAudit) {
      await logAudit(this.client, components, "delete", { data: item.data });
    }

    return deletedVersions > 0;
  }

  async list(options?: {
    limit?: number;
    offset?: number;
  }): Promise<RepoItem<T>[]> {
    const components = this.getComponents();

    // Get paginated item IDs from index
    const { items: itemIds } = await getCollectionItemsPaginated(
      this.client,
      components,
      options
    );

    // Fetch latest version of each item
    const items = await Promise.all(
      itemIds.map(async (itemId) => {
        const itemComponents = this.getComponents(itemId);
        return await getLatest<T>(this.client, itemComponents);
      })
    );

    // Filter out null results
    return items.filter((item): item is RepoItem<T> => item !== null);
  }

  getVersion(id: string, version: number): Promise<RepoItem<T> | null> {
    const components = this.getComponents(id);
    return getVersion<T>(this.client, components, version);
  }

  listVersions(id: string) {
    const components = this.getComponents(id);
    return listVersions(this.client, components);
  }

  async runMutation<R = unknown>(id: string, mutation: string): Promise<R> {
    const components = this.getComponents(id);

    // Get mutation function from config
    const mutationFn = this.config.mutations?.[mutation];
    if (!mutationFn) {
      throw new Error(`Mutation '${mutation}' not found in collection config`);
    }

    const result = await runMutation<T, R>(
      this.client,
      components,
      mutation,
      mutationFn
    );

    // Log audit entry if enabled
    if (this.options.enableAudit) {
      await logAudit(this.client, components, "mutation", { mutation });
    }

    return result;
  }

  async materializeMutation(id: string, mutation: string): Promise<void> {
    const components = this.getComponents(id);

    // Get mutation function from config
    const mutationFn = this.config.mutations?.[mutation];
    if (!mutationFn) {
      throw new Error(`Mutation '${mutation}' not found in collection config`);
    }

    const ttl = this.getTTL();
    await materializeMutation(this.client, components, mutation, {
      mutationFn,
      ttl,
    });

    // Log audit entry if enabled
    if (this.options.enableAudit) {
      await logAudit(this.client, components, "mutation", { mutation });
    }
  }

  getMutation<R = unknown>(id: string, mutation: string): Promise<R | null> {
    const components = this.getComponents(id);
    return getMutationResult<R>(this.client, components, mutation);
  }

  async runTransformation(id: string, transformation: string): Promise<string> {
    const components = this.getComponents(id);

    // Get transformation config
    const transformationConfig = this.config.transformations?.[transformation];
    if (!transformationConfig) {
      throw new Error(
        `Transformation '${transformation}' not found in collection config`
      );
    }

    const jobId = await runTransformation(
      this.client,
      components,
      transformation,
      { config: transformationConfig }
    );

    // Log audit entry if enabled
    if (this.options.enableAudit) {
      await logAudit(this.client, components, "transformation", {
        transformation,
      });
    }

    return jobId;
  }

  getTransformation<R = unknown>(id: string, transformation: string) {
    const components = this.getComponents(id);
    return getTransformation<R>(this.client, components, transformation);
  }

  getTransformationByName<R = unknown>(
    id: string,
    transformation: string
  ): Promise<R | null> {
    const components = this.getComponents(id);
    return getTransformationByName<R>(this.client, components, transformation);
  }
}

/**
 * Repository client implementation
 */
class RepoClientImpl implements RepoClient {
  [collectionName: string]: CollectionClient;

  constructor(
    client: RedisClientType,
    config: RepoConfig,
    options: RepoOptions = {}
  ) {
    // Create collection clients
    for (const [collectionName, collectionConfig] of Object.entries(
      config.collections
    )) {
      this[collectionName] = new CollectionClientImpl(client, {
        domain: config.domain,
        app: config.app,
        collectionName,
        config: collectionConfig,
        repoOptions: options,
      });
    }
  }
}

/**
 * Repository implementation
 */
class RepositoryImpl implements Repository {
  readonly config: RepoConfig;

  constructor(config: RepoConfig) {
    this.config = config;
    // Validate configuration
    validateRepoConfig(config);
  }

  connect(client: RedisClientType, options?: RepoOptions): RepoClient {
    return new RepoClientImpl(client, this.config, options);
  }
}

/**
 * Define a repository with the given configuration
 */
export function defineRepo(config: RepoConfig): Repository {
  return new RepositoryImpl(config);
}

/**
 * Helper function to create a worker for a repository transformation
 */
export const Worker = {
  forRepo<T = unknown, R = unknown>(
    repo: Repository,
    collectionName: string,
    transformationName: string
  ) {
    const collectionConfig = repo.config.collections[collectionName];
    if (!collectionConfig) {
      throw new Error(`Collection '${collectionName}' not found in repository`);
    }

    const transformationConfig =
      collectionConfig.transformations?.[transformationName];
    if (!transformationConfig) {
      throw new Error(
        `Transformation '${transformationName}' not found in collection '${collectionName}'`
      );
    }

    return {
      process: (processor: (doc: RepoItem<T>) => Promise<R>) => {
        // This would typically be implemented as a separate worker process
        // For now, we return the processor function
        return processor;
      },
    };
  },
};
