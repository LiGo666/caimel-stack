# Redis-Metastore

A convention-driven layer on top of Redis for structured JSON storage with enforced patterns, versioning, and type safety.

## Features

- **🔑 Canonical Key Grammar** - No ad-hoc keys, all keys follow strict patterns
- **📝 Auto-Versioning** - Every update creates immutable history  
- **⚡ Mutations** - Pure, fast inline functions for data transformation
- **🔄 Transformations** - Worker-backed pipelines for heavy async tasks
- **🛡️ Schema Validation** - Every collection enforces a contract
- **⏰ TTL & Object Type Policies** - Different behaviors by design
- **🔍 Discoverability** - Indexes for users, apps, mutations, transformations
- **📊 Auditability** - Optional streams for every change

## Installation

```bash
pnpm add @caimel/redis-metastore
```

## Quick Start

### 1. Define a Repository

```typescript
import { defineRepo, ObjectType, TransformationMode } from "@caimel/redis-metastore";
import { z } from "zod";

const TextSchema = z.object({
  name: z.string().min(1),
  content: z.string(),
  language: z.string().optional(),
});

export const MyRepo = defineRepo({
  domain: "myapp",
  app: "textsplitter", 
  collections: {
    texts: {
      objectType: ObjectType.TEXTS,
      schema: TextSchema,
      mutations: {
        wordcount: (doc) => doc.content.split(/\s+/).length,
        textsplit: (doc) => doc.content.split(/\s+/).filter(Boolean),
      },
      transformations: {
        summarize: { mode: TransformationMode.WORKER, timeout: 30 },
      },
    },
  },
});
```

### 2. Connect and Use

```typescript
import { redis } from "@caimel/redis"; // Your Redis client

const repo = MyRepo.connect(redis, { enableAudit: true });

// Create new item (ID auto-generated, version=1)
const { id } = await repo.texts.create({
  name: "My Document",
  content: "Hello world! This is a sample text.",
});

// Update (version auto-bumps to 2)
await repo.texts.update(id, {
  content: "Updated content with more text!",
});

// Read latest or historical
const latest = await repo.texts.get(id);              // Version 2
const original = await repo.texts.get(id, { version: 1 }); // Version 1
```

### 3. Mutations (Fast, Inline)

```typescript
// Execute immediately
const wordCount = await repo.texts.runMutation(id, "wordcount");
const words = await repo.texts.runMutation(id, "textsplit");

// Materialize result for caching
await repo.texts.materializeMutation(id, "wordcount");
const cachedCount = await repo.texts.getMutation(id, "wordcount");
```

### 4. Transformations (Async, Worker-backed)

```typescript
// Queue async job
const jobId = await repo.texts.runTransformation(id, "summarize");

// Later, retrieve result (after worker processes it)
const summary = await repo.texts.getTransformationByName(id, "summarize");
```

### 5. Worker Setup

```typescript
import { createWorker } from "@caimel/redis-metastore";

const worker = createWorker(
  redis,
  { domain: "myapp", app: "textsplitter", collection: "texts" },
  "summarize",
  async (item) => {
    // Your AI/ML processing logic here
    return `Summary of: ${item.data.content}`;
  }
);

// Start processing (typically in a separate process)
await worker.start();
```

## Core Concepts

### Object Types & TTL Policies

- **`ObjectType.CONFIG`** - Long-lived configuration (no TTL)
- **`ObjectType.SETTINGS`** - User/app settings (30 days TTL)  
- **`ObjectType.STATE`** - Session/temporary state (1 hour TTL)
- **`ObjectType.TEXTS`** - Immutable content (no TTL, versioned forever)

### Key Patterns

All Redis keys follow canonical patterns:

```
Item:         myapp:textsplitter:texts:abc123:latest
Version:      myapp:textsplitter:texts:abc123:version:2  
Mutation:     myapp:textsplitter:texts:abc123:mutation:wordcount
Transform:    myapp:textsplitter:texts:abc123:transformation:summarize
Index:        idx:myapp:textsplitter:texts
Audit:        stream:audit:myapp:textsplitter:texts:abc123
```

### Versioning

Every update creates a new immutable version:

```typescript
// Version 1
const { id } = await repo.texts.create({ name: "Doc", content: "Hello" });

// Version 2  
await repo.texts.update(id, { content: "Hello World" });

// Access any version
const v1 = await repo.texts.get(id, { version: 1 });
const v2 = await repo.texts.get(id); // Latest

// List all versions
const versions = await repo.texts.listVersions(id);
```

## Advanced Usage

### Server Actions

For Next.js server actions or API routes:

```typescript
import { createItem, getItem, runMutation } from "@caimel/redis-metastore/actions";

export async function createDocument(data: any) {
  return createItem(redis, MyRepo.config, "texts", data);
}

export async function getDocument(id: string) {
  return getItem(redis, MyRepo.config, "texts", id);
}
```

### Batch Operations

```typescript
// Create multiple items
const results = await Promise.all([
  repo.texts.create({ name: "Doc 1", content: "..." }),
  repo.texts.create({ name: "Doc 2", content: "..." }),
]);

// Batch mutations
const mutations = await repo.texts.runMutationBatch(id, [
  { name: "wordcount", fn: (doc) => doc.content.split(/\s+/).length },
  { name: "charcount", fn: (doc) => doc.content.length },
]);
```

### Audit Trails

```typescript
// Enable audit logging
const repo = MyRepo.connect(redis, { enableAudit: true });

// Get audit history
const entries = await getAuditEntries(redis, { 
  domain: "myapp", 
  app: "textsplitter", 
  collection: "texts", 
  id 
});

// Filter by operation
const updates = await getAuditEntriesByOperation(redis, components, "update");
```

### Collection Management

```typescript
// List all items in collection
const items = await repo.texts.list({ limit: 50, offset: 0 });

// Get collection statistics  
const stats = await getCollectionStats(redis, MyRepo.config, "texts");

// Collection-level operations
const allTextIds = await getCollectionItems(redis, {
  domain: "myapp",
  app: "textsplitter", 
  collection: "texts"
});
```

## API Reference

### Repository Definition

- `defineRepo(config)` - Create a repository factory
- `repo.connect(client, options?)` - Connect to Redis and get client

### Collection Operations

- `collection.create(data)` - Create new item
- `collection.get(id, options?)` - Get item (latest or specific version)
- `collection.update(id, data)` - Update item (creates new version)
- `collection.delete(id)` - Delete item and all versions
- `collection.list(options?)` - List items with pagination

### Versioning

- `collection.getVersion(id, version)` - Get specific version
- `collection.listVersions(id)` - List all versions

### Mutations

- `collection.runMutation(id, name)` - Execute mutation
- `collection.materializeMutation(id, name)` - Cache mutation result
- `collection.getMutation(id, name)` - Get cached result

### Transformations

- `collection.runTransformation(id, name)` - Queue async job
- `collection.getTransformation(id, name)` - Get full result object
- `collection.getTransformationByName(id, name)` - Get result data only

### Workers

- `createWorker(client, components, name, processor, config?)` - Create worker
- `worker.start()` - Start processing jobs
- `worker.stop()` - Stop worker

## Configuration

### Repository Config

```typescript
interface RepoConfig {
  domain: string;           // App domain (e.g., "caimel")
  app: string;             // App name (e.g., "textsplitter")  
  collections: {
    [name: string]: {
      objectType: ObjectType;
      schema?: ZodSchema;    // Optional validation
      ttl?: number;         // Override default TTL
      mutations?: {         // Inline functions
        [name: string]: (doc: any) => any;
      };
      transformations?: {   // Async operations
        [name: string]: {
          mode: TransformationMode;
          timeout?: number;
          retries?: number;
        };
      };
    };
  };
}
```

### Worker Config

```typescript
interface WorkerConfig {
  concurrency?: number;     // Parallel workers (default: 1)
  pollInterval?: number;    // Poll frequency in ms (default: 1000)
  maxRetries?: number;      // Max retry attempts (default: 3)
  retryDelay?: number;      // Retry delay in ms (default: 5000)
}
```

## Error Handling

```typescript
try {
  const { id } = await repo.texts.create(invalidData);
} catch (error) {
  if (error instanceof ZodError) {
    // Schema validation failed
  } else {
    // Other errors (Redis connection, etc.)
  }
}
```

## Performance Tips

1. **Use Mutations for Fast Operations** - Simple transformations should be mutations
2. **Use Transformations for Heavy Work** - AI/ML, external APIs, etc.
3. **Batch Operations** - Use Promise.all for multiple operations
4. **TTL Policies** - Set appropriate expiration for temporary data
5. **Index Management** - Collections are automatically indexed for discovery

## Migration & Compatibility

The framework is designed to be backward compatible:

- Existing Redis data can coexist
- Schema evolution through versioning
- Migration tools for converting existing data

## Examples

See the [examples directory](./examples/) for complete working examples:

- **Textsplitter** - Text processing with mutations and transformations
- **User Management** - Session handling with TTL policies
- **Document Store** - Versioned document management

## License

MIT
