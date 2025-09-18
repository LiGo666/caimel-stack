/** biome-ignore-all lint/style/noMagicNumbers: <explanation> */
/** biome-ignore-all lint/suspicious/noConsole: <explanation> */
import type { RedisClientType } from "redis";
import type { KeyComponents, AuditEntry } from "../../types";
import { buildAuditKey, generateId } from "../key";
import { safeJsonStringify } from "../../schema";

/**
 * Audit system for Redis-Metastore
 *
 * Provides optional audit trails for all operations:
 * - Append-only change logs using Redis Streams
 * - Complete history of all operations
 * - Configurable retention policies
 * - Query capabilities for audit data
 */

/**
 * Log an audit entry
 */
export async function logAudit(
  client: RedisClientType,
  components: KeyComponents,
  operation: AuditEntry["operation"],
  details: {
    version?: number;
    mutation?: string;
    transformation?: string;
    data?: unknown;
  } = {}
): Promise<string> {
  if (!components.id) {
    throw new Error("ID is required for audit logging");
  }

  const auditEntry: AuditEntry = {
    id: generateId(),
    domain: components.domain,
    app: components.app,
    collection: components.collection,
    itemId: components.id,
    operation,
    version: details.version,
    mutation: details.mutation,
    transformation: details.transformation,
    timestamp: new Date(),
    data: details.data,
  };

  const auditKey = buildAuditKey(components);

  // Use Redis Streams for audit logging
  const streamId = await client.xAdd(auditKey, "*", {
    entry: safeJsonStringify(auditEntry),
  });

  return streamId;
}

/**
 * Get audit entries for an item
 */
export async function getAuditEntries(
  client: RedisClientType,
  components: KeyComponents,
  options: {
    start?: string; // Stream ID to start from
    end?: string; // Stream ID to end at
    count?: number; // Maximum number of entries
    reverse?: boolean; // Read in reverse order
  } = {}
): Promise<AuditEntry[]> {
  if (!components.id) {
    throw new Error("ID is required to get audit entries");
  }

  const auditKey = buildAuditKey(components);
  const { start = "-", end = "+", count = 100, reverse = false } = options;

  try {
    // Define type for Redis stream entries
    let entries: Array<{ id: string; message: Record<string, string> }>;

    if (reverse) {
      // Read in reverse order (newest first)
      entries = await client.xRevRange(auditKey, end, start, { COUNT: count });
    } else {
      // Read in forward order (oldest first)
      entries = await client.xRange(auditKey, start, end, { COUNT: count });
    }

    const auditEntries: AuditEntry[] = [];

    for (const entry of entries) {
      try {
        const entryData = entry.message.entry;
        if (typeof entryData === "string") {
          const auditEntry = JSON.parse(entryData) as AuditEntry;
          // Convert timestamp back to Date object
          auditEntry.timestamp = new Date(auditEntry.timestamp);
          auditEntries.push(auditEntry);
        }
      } catch (_error) {
        // Skip invalid entries silently
        // We could add a logger here if needed
      }
    }

    return auditEntries;
  } catch (error) {
    // Stream might not exist yet
    if (error instanceof Error && error.message.includes("no such key")) {
      return [];
    }
    throw error;
  }
}

/**
 * Get audit entries by operation type
 */
export async function getAuditEntriesByOperation(
  client: RedisClientType,
  components: KeyComponents,
  operation: AuditEntry["operation"],
  options: {
    count?: number;
    reverse?: boolean;
  } = {}
): Promise<AuditEntry[]> {
  const allEntries = await getAuditEntries(client, components, {
    count: options.count ? options.count * 2 : 200, // Get more to filter
    reverse: options.reverse,
  });

  return allEntries
    .filter((entry) => entry.operation === operation)
    .slice(0, options.count || 100);
}

/**
 * Get audit entries within a time range
 */
export async function getAuditEntriesByTimeRange(
  client: RedisClientType,
  components: KeyComponents,
  options: {
    startTime: Date;
    endTime: Date;
    count?: number;
  }
): Promise<AuditEntry[]> {
  const allEntries = await getAuditEntries(client, components, {
    count: options.count ? options.count * 2 : 200, // Get more to filter
  });

  return allEntries
    .filter(
      (entry) => entry.timestamp >= options.startTime && entry.timestamp <= options.endTime
    )
    .slice(0, options.count || 100);
}

/**
 * Get the latest audit entry
 */
export async function getLatestAuditEntry(
  client: RedisClientType,
  components: KeyComponents
): Promise<AuditEntry | null> {
  const entries = await getAuditEntries(client, components, {
    count: 1,
    reverse: true,
  });

  return entries[0] || null;
}

/**
 * Get audit statistics
 */
export async function getAuditStats(
  client: RedisClientType,
  components: KeyComponents
): Promise<{
  totalEntries: number;
  operationCounts: Record<string, number>;
  firstEntry?: Date;
  lastEntry?: Date;
  streamLength: number;
}> {
  if (!components.id) {
    throw new Error("ID is required to get audit stats");
  }

  const auditKey = buildAuditKey(components);

  try {
    // Get stream length
    const streamLength = await client.xLen(auditKey);

    if (streamLength === 0) {
      return {
        totalEntries: 0,
        operationCounts: {},
        streamLength: 0,
      };
    }

    // Get all entries to calculate statistics
    const entries = await getAuditEntries(client, components, {
      count: streamLength,
    });

    const operationCounts: Record<string, number> = {};
    let firstEntry: Date | undefined;
    let lastEntry: Date | undefined;

    for (const entry of entries) {
      // Count operations
      operationCounts[entry.operation] =
        (operationCounts[entry.operation] || 0) + 1;

      // Track first and last entries
      if (!firstEntry || entry.timestamp < firstEntry) {
        firstEntry = entry.timestamp;
      }
      if (!lastEntry || entry.timestamp > lastEntry) {
        lastEntry = entry.timestamp;
      }
    }

    return {
      totalEntries: entries.length,
      operationCounts,
      firstEntry,
      lastEntry,
      streamLength,
    };
  } catch (error) {
    // Stream might not exist yet
    if (error instanceof Error && error.message.includes("no such key")) {
      return {
        totalEntries: 0,
        operationCounts: {},
        streamLength: 0,
      };
    }
    throw error;
  }
}

/**
 * Trim audit stream to keep only recent entries
 */
export async function trimAuditStream(
  client: RedisClientType,
  components: KeyComponents,
  maxLength: number
): Promise<number> {
  if (!components.id) {
    throw new Error("ID is required to trim audit stream");
  }

  const auditKey = buildAuditKey(components);

  try {
    // Trim stream to keep only the most recent entries
    // Use an object parameter for xTrim
    return await client.sendCommand([
      'XTRIM',
      auditKey,
      'MAXLEN',
      '~',
      maxLength.toString()
    ]);
  } catch (error) {
    // Stream might not exist yet
    if (error instanceof Error && error.message.includes("no such key")) {
      return 0;
    }
    throw error;
  }
}

/**
 * Delete audit stream entirely
 */
export async function deleteAuditStream(
  client: RedisClientType,
  components: KeyComponents
): Promise<boolean> {
  if (!components.id) {
    throw new Error("ID is required to delete audit stream");
  }

  const auditKey = buildAuditKey(components);
  const deleted = await client.del(auditKey);
  return deleted === 1;
}

/**
 * Get audit entries for multiple items
 */
export async function getMultiItemAuditEntries(
  client: RedisClientType,
  itemComponents: KeyComponents[],
  options: {
    count?: number;
    reverse?: boolean;
  } = {}
): Promise<Array<{ itemId: string; entries: AuditEntry[] }>> {
  // Filter out components without an id
  const validComponents = itemComponents.filter(components => components.id);
  
  // Note: filtered out items without IDs silently
  // In a production environment, this could be logged with a proper logger
  
  const results = await Promise.all(
    validComponents.map(async (components) => ({
      itemId: components.id as string, // Safe cast since we filtered
      entries: await getAuditEntries(client, components, options),
    }))
  );

  return results;
}

/**
 * Search audit entries by content
 */
export async function searchAuditEntries(
  client: RedisClientType,
  components: KeyComponents,
  searchTerm: string,
  options: {
    count?: number;
    operation?: AuditEntry["operation"];
  } = {}
): Promise<AuditEntry[]> {
  const allEntries = await getAuditEntries(client, components, {
    count: options.count ? options.count * 2 : 200,
  });

  return allEntries
    .filter((entry) => {
      // Filter by operation if specified
      if (options.operation && entry.operation !== options.operation) {
        return false;
      }

      // Search in serialized data
      const entryText = JSON.stringify(entry).toLowerCase();
      return entryText.includes(searchTerm.toLowerCase());
    })
    .slice(0, options.count || 100);
}

/**
 * Export audit entries to JSON
 */
export async function exportAuditEntries(
  client: RedisClientType,
  components: KeyComponents,
  options: {
    startTime?: Date;
    endTime?: Date;
    operations?: AuditEntry["operation"][];
  } = {}
): Promise<string> {
  let entries = await getAuditEntries(client, components);

  // Apply filters
  if (options.startTime || options.endTime) {
    entries = entries.filter((entry) => {
      if (options.startTime && entry.timestamp < options.startTime) {
        return false;
      }
      if (options.endTime && entry.timestamp > options.endTime) {
        return false;
      }
      return true;
    });
  }

  if (options.operations && options.operations.length > 0) {
    const operations = options.operations; // Create a local variable to avoid TypeScript error
    entries = entries.filter((entry) =>
      operations.includes(entry.operation)
    );
  }

  return JSON.stringify(entries, null, 2);
}
