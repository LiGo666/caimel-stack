import type { RedisClientType } from "redis";
import type {
  KeyComponents,
  TransformationJob,
  TransformationResult,
  TransformationConfig,
  WorkerProcessor,
  WorkerConfig,
} from "../../types";
import { JobStatus } from "../../types";
import {
  buildTransformationKey,
  buildJobQueueKey,
  buildJobStatusKey,
  generateId,
} from "../key";
import { getLatest } from "../version";
import { safeJsonParse, safeJsonStringify } from "../../schema";

// Regex patterns defined at module level for performance
const TRANSFORMATION_REGEX = /:transformation:([^:]+)$/;

/**
 * Transformation system for Redis-Metastore
 *
 * Handles async, worker-backed data transformations:
 * - Jobs queued in Redis Streams or Lists
 * - Workers process jobs and store results
 * - Results cached at canonical keys
 * - Support for retries and error handling
 */

/**
 * Queue a transformation job
 */
export async function runTransformation(
  client: RedisClientType,
  components: KeyComponents,
  transformationName: string,
  _options?: { config?: TransformationConfig }
): Promise<string> {
  if (!components.id) {
    throw new Error("ID is required to run transformation");
  }

  // Check if item exists
  const item = await getLatest(client, components);
  if (!item) {
    throw new Error(`Item not found: ${components.id}`);
  }

  // Config is available for future use
  // const config = options?.config;

  // Generate job ID
  const jobId = generateId();

  // Create transformation job
  const job: TransformationJob = {
    id: jobId,
    domain: components.domain,
    app: components.app,
    collection: components.collection,
    itemId: components.id,
    transformation: transformationName,
    status: JobStatus.QUEUED,
    createdAt: new Date(),
    retries: 0,
  };

  // Store job status
  const jobStatusKey = buildJobStatusKey(jobId);
  await client.set(jobStatusKey, safeJsonStringify(job));

  // Queue the job
  const queueKey = buildJobQueueKey({
    ...components,
    transformation: transformationName,
  });
  await client.lPush(queueKey, jobId);

  return jobId;
}

/**
 * Get transformation job status
 */
export async function getTransformationJob(
  client: RedisClientType,
  jobId: string
): Promise<TransformationJob | null> {
  const jobStatusKey = buildJobStatusKey(jobId);
  const data = await client.get(jobStatusKey);

  if (!data) {
    return null;
  }

  return safeJsonParse<TransformationJob>(data);
}

/**
 * Update transformation job status
 */
export async function updateTransformationJob(
  client: RedisClientType,
  jobId: string,
  updates: Partial<TransformationJob>
): Promise<void> {
  const job = await getTransformationJob(client, jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  const updatedJob = { ...job, ...updates };
  const jobStatusKey = buildJobStatusKey(jobId);
  await client.set(jobStatusKey, safeJsonStringify(updatedJob));
}

/**
 * Get transformation result
 */
export async function getTransformation<R>(
  client: RedisClientType,
  components: KeyComponents,
  transformationName: string
): Promise<TransformationResult<R> | null> {
  if (!components.id) {
    throw new Error("ID is required to get transformation");
  }

  const transformationKey = buildTransformationKey({
    ...components,
    transformation: transformationName,
  });
  const data = await client.get(transformationKey);

  if (!data) {
    return null;
  }

  return safeJsonParse<TransformationResult<R>>(data);
}

/**
 * Get just the result data from a transformation
 */
export async function getTransformationByName<R>(
  client: RedisClientType,
  components: KeyComponents,
  transformationName: string
): Promise<R | null> {
  const transformation = await getTransformation<R>(
    client,
    components,
    transformationName
  );
  return transformation?.result || null;
}

/**
 * Store transformation result
 */
export async function storeTransformationResult<R>(
  client: RedisClientType,
  components: KeyComponents,
  transformationName: string,
  options: { result: R; jobId: string; ttl?: number }
): Promise<TransformationResult<R>> {
  if (!components.id) {
    throw new Error("ID is required to store transformation result");
  }

  const transformationResult: TransformationResult<R> = {
    id: components.id,
    transformation: transformationName,
    result: options.result,
    completedAt: new Date(),
    jobId: options.jobId,
  };

  const transformationKey = buildTransformationKey({
    ...components,
    transformation: transformationName,
  });
  const data = safeJsonStringify(transformationResult);

  const ttl = options?.ttl;
  if (ttl && ttl > 0) {
    await client.set(transformationKey, data, { EX: ttl });
  } else {
    await client.set(transformationKey, data);
  }

  return transformationResult;
}

/**
 * Check if a transformation result exists
 */
export async function transformationExists(
  client: RedisClientType,
  components: KeyComponents,
  transformationName: string
): Promise<boolean> {
  if (!components.id) {
    throw new Error("ID is required to check transformation existence");
  }

  const transformationKey = buildTransformationKey({
    ...components,
    transformation: transformationName,
  });
  const exists = await client.exists(transformationKey);
  return exists === 1;
}

/**
 * Delete a transformation result
 */
export async function deleteTransformation(
  client: RedisClientType,
  components: KeyComponents,
  transformationName: string
): Promise<boolean> {
  if (!components.id) {
    throw new Error("ID is required to delete transformation");
  }

  const transformationKey = buildTransformationKey({
    ...components,
    transformation: transformationName,
  });
  const deleted = await client.del(transformationKey);
  return deleted === 1;
}

/**
 * List all transformations for an item
 */
export async function listTransformations(
  client: RedisClientType,
  components: KeyComponents
): Promise<string[]> {
  if (!components.id) {
    throw new Error("ID is required to list transformations");
  }

  // Build pattern to match all transformation keys for this item
  const baseKey = buildTransformationKey({
    ...components,
    transformation: "dummy",
  });
  const TRANSFORMATION_PATTERN = ":transformation:*";
  const pattern = baseKey.replace(
    ":transformation:dummy",
    TRANSFORMATION_PATTERN
  );
  const keys = await client.keys(pattern);

  // Extract transformation names from keys
  const transformations: string[] = [];
  for (const key of keys) {
    const transformationMatch = key.match(TRANSFORMATION_REGEX);
    if (transformationMatch) {
      transformations.push(transformationMatch[1]);
    }
  }

  return transformations;
}

/**
 * Worker class for processing transformation jobs
 */
export class TransformationWorker<T = unknown, R = unknown> {
  private readonly client: RedisClientType;
  private readonly components: KeyComponents;
  private readonly transformationName: string;
  private readonly processor: WorkerProcessor<T, R>;
  private readonly config: WorkerConfig;
  private isRunning = false;
  private stopRequested = false;

  constructor(
    client: RedisClientType,
    components: KeyComponents,
    transformationName: string,
    options: { processor: WorkerProcessor<T, R>; config?: WorkerConfig }
  ) {
    this.client = client;
    this.components = components;
    this.transformationName = transformationName;
    this.processor = options.processor;
    this.config = {
      concurrency: 1,
      pollInterval: 1000, // 1 second
      maxRetries: 3,
      retryDelay: 5000, // 5 seconds
      ...options.config,
    };
  }

  /**
   * Start processing jobs
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error("Worker is already running");
    }

    this.isRunning = true;
    this.stopRequested = false;

    // Start concurrent workers
    const workers = Array.from(
      { length: this.config.concurrency || 1 },
      (_, i) => this.workerLoop(i)
    );

    await Promise.all(workers);
  }

  /**
   * Stop processing jobs
   */
  stop(): void {
    this.stopRequested = true;
  }

  /**
   * Worker loop for processing jobs
   */
  private async workerLoop(workerId: number): Promise<void> {
    const queueKey = buildJobQueueKey({
      ...this.components,
      transformation: this.transformationName,
    });

    while (!this.stopRequested) {
      try {
        // Pop job from queue (blocking with timeout)
        const MILLISECONDS_TO_SECONDS = 1000;
        const DEFAULT_POLL_INTERVAL = 1000;
        const pollIntervalSeconds =
          (this.config.pollInterval || DEFAULT_POLL_INTERVAL) /
          MILLISECONDS_TO_SECONDS;
        const result = await this.client.brPop(queueKey, pollIntervalSeconds);

        if (!result) {
          continue; // Timeout, try again
        }

        const jobId = result.element;
        await this.processJob(jobId, workerId);
      } catch (error) {
        // Log error and continue processing other jobs
        // In production, use proper logging instead of console
        if (process.env.NODE_ENV === "development") {
          // biome-ignore lint/suspicious/noConsole: Development logging
          console.error(`Worker ${workerId} error:`, error);
        }
      }
    }

    this.isRunning = false;
  }

  /**
   * Process a single job
   */
  private async processJob(jobId: string, _workerId: number): Promise<void> {
    try {
      // Get job details
      const job = await getTransformationJob(this.client, jobId);
      if (!job) {
        // Log error - in production use proper logging
        if (process.env.NODE_ENV === "development") {
          // biome-ignore lint/suspicious/noConsole: Development logging
          console.error(`Job not found: ${jobId}`);
        }
        return;
      }

      // Update job status to running
      await updateTransformationJob(this.client, jobId, {
        status: JobStatus.RUNNING,
        startedAt: new Date(),
      });

      // Get the item data
      const itemComponents = {
        domain: job.domain,
        app: job.app,
        collection: job.collection,
        id: job.itemId,
      };

      const item = await getLatest<T>(this.client, itemComponents);
      if (!item) {
        throw new Error(`Item not found: ${job.itemId}`);
      }

      // Process the job
      const result = await this.processor(item, job);

      // Store the result
      await storeTransformationResult(
        this.client,
        itemComponents,
        job.transformation,
        { result, jobId }
      );

      // Update job status to done
      await updateTransformationJob(this.client, jobId, {
        status: JobStatus.DONE,
        completedAt: new Date(),
      });
    } catch (error) {
      // Handle job failure
      await this.handleJobFailure(jobId, error);
    }
  }

  /**
   * Handle job failure with retry logic
   */
  private async handleJobFailure(jobId: string, error: unknown): Promise<void> {
    const job = await getTransformationJob(this.client, jobId);
    if (!job) {
      return;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    const retries = job.retries + 1;

    const MAX_RETRIES = 3;
    if (retries <= (this.config.maxRetries || MAX_RETRIES)) {
      // Retry the job
      await updateTransformationJob(this.client, jobId, {
        status: JobStatus.QUEUED,
        retries,
        error: errorMessage,
      });

      // Re-queue the job with delay
      const RETRY_DELAY = 5000;
      setTimeout(async () => {
        const queueKey = buildJobQueueKey({
          ...this.components,
          transformation: this.transformationName,
        });
        await this.client.lPush(queueKey, jobId);
      }, this.config.retryDelay || RETRY_DELAY);
    } else {
      // Mark job as failed
      await updateTransformationJob(this.client, jobId, {
        status: JobStatus.FAILED,
        error: errorMessage,
        completedAt: new Date(),
      });
    }
  }
}

/**
 * Factory function to create a worker for a specific transformation
 */
export function createWorker<T = unknown, R = unknown>(
  client: RedisClientType,
  components: KeyComponents,
  transformationName: string,
  options: { processor: WorkerProcessor<T, R>; config?: WorkerConfig }
): TransformationWorker<T, R> {
  return new TransformationWorker(
    client,
    components,
    transformationName,
    options
  );
}

/**
 * Get transformation statistics for an item
 */
export async function getTransformationStats(
  client: RedisClientType,
  components: KeyComponents
): Promise<{
  totalTransformations: number;
  transformations: Array<{
    name: string;
    completedAt: Date;
    size: number; // Approximate size in bytes
  }>;
}> {
  const transformationNames = await listTransformations(client, components);

  const transformations = await Promise.all(
    transformationNames.map(async (name) => {
      const transformationKey = buildTransformationKey({
        ...components,
        transformation: name,
      });
      const data = await client.get(transformationKey);
      const transformation = data
        ? safeJsonParse<TransformationResult<unknown>>(data)
        : null;

      return {
        name,
        completedAt: transformation?.completedAt || new Date(0),
        size: data ? Buffer.byteLength(data, "utf8") : 0,
      };
    })
  );

  return {
    totalTransformations: transformations.length,
    transformations,
  };
}

/**
 * Get queue statistics
 */
export async function getQueueStats(
  client: RedisClientType,
  components: KeyComponents,
  transformationName: string
): Promise<{
  queueLength: number;
  pendingJobs: string[];
}> {
  const queueKey = buildJobQueueKey({
    ...components,
    transformation: transformationName,
  });
  const queueLength = await client.lLen(queueKey);
  const pendingJobs = await client.lRange(queueKey, 0, -1);

  return {
    queueLength,
    pendingJobs,
  };
}
