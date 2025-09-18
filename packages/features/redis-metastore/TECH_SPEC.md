# Redis-Metastore Technical Specification

## Overview

Redis-Metastore is a convention-driven layer on top of RedisJSON that provides structured JSON storage with enforced patterns, versioning, and type safety. It implements a repository-first workflow that guarantees consistency across applications.

## Core Principles

1. **Canonical Key Grammar** - No ad-hoc keys, all keys follow strict patterns
2. **Auto-Versioning** - Every update creates immutable history
3. **Mutation System** - Pure, fast inline functions for data transformation
4. **Transformation System** - Worker-backed pipelines for heavy async tasks
5. **Schema Validation** - Every collection enforces a contract
6. **TTL & Object Type Policies** - Different behaviors by design
7. **Discoverability** - Indexes for users, apps, mutations, transformations
8. **Auditability** - Optional streams for every change

## Architecture

### Package Structure

```
packages/features/redis-metastore/
├── lib/                    # Core Runtime
│   ├── key/               # Canonical key management
│   ├── repo/              # Repository factory and client
│   ├── mutation/          # Inline mutation system
│   ├── transformation/    # Async transformation system
│   ├── version/           # Version management
│   ├── index/             # Index maintenance
│   └── audit/             # Audit stream integration
├── types/                 # Shared Contracts
├── actions/               # High-Level Server Actions
├── schema/                # Zod schemas
└── index.ts               # Main exports
```

### Key Patterns

All keys follow a canonical grammar:

```
Base Key: {domain}:{app}:{collection}:{id}
Latest:   {domain}:{app}:{collection}:{id}:latest
Version:  {domain}:{app}:{collection}:{id}:version:{n}
Mutation: {domain}:{app}:{collection}:{id}:mutation:{name}
Transform: {domain}:{app}:{collection}:{id}:transformation:{name}
Index:    idx:{domain}:{app}:{collection}
Audit:    stream:audit:{domain}:{app}:{collection}:{id}
```

### Object Types & TTL Policies

- **config** - Long-lived configuration data (no TTL)
- **settings** - User/app settings (long TTL, 30 days)
- **state** - Session/temporary state (short TTL, 1 hour)
- **texts** - Immutable content (no TTL, versioned forever)

## Core Components

### 1. Repository Definition

```typescript
export const TextsplitterRepo = defineRepo({
  domain: "caimel",
  app: "textsplitter",
  collections: {
    texts: {
      objectType: "texts",
      schema: { name: "string" },
      ttl: undefined,   // immutable
      mutations: {
        textsplit: (doc: { name: string }) =>
          doc.name.split(/\s+/).filter(Boolean),
      },
      transformations: {
        summarize: { mode: "worker" },
      },
    },
    sessions: {
      objectType: "state",
      ttl: 3600, // ephemeral
    },
  },
});
```

### 2. Repository Client

```typescript
const repo = TextsplitterRepo.connect(redisClient);

// CRUD Operations
const { id } = await repo.texts.create({ name: "Jacob Smith" });
await repo.texts.update(id, { name: "Marta Smith" });
const item = await repo.texts.get(id);
const historical = await repo.texts.get(id, { version: 1 });

// Mutations (inline, fast)
const parts = await repo.texts.runMutation(id, "textsplit");
await repo.texts.materializeMutation(id, "textsplit");

// Transformations (async, worker-backed)
await repo.texts.runTransformation(id, "summarize");
const result = await repo.texts.getTransformationByName(id, "summarize");
```

### 3. Worker Integration

```typescript
Worker.forRepo(TextsplitterRepo, "texts", "summarize")
  .process(async (doc) => {
    return `Summary: ${doc.name}`;
  });
```

## Implementation Plan

### Phase 1: Core Foundation
1. **Types & Enums** - Define all TypeScript interfaces and enums
2. **Key Management** - Implement canonical key builder
3. **Repository Factory** - Create `defineRepo()` and connection logic

### Phase 2: Data Operations
4. **CRUD Operations** - Basic create, read, update, delete with versioning
5. **Version Management** - Handle `:latest` pointers and version history
6. **Schema Validation** - Integrate Zod for type safety

### Phase 3: Advanced Features
7. **Mutation System** - Inline, synchronous data transformations
8. **Transformation System** - Async worker-backed operations
9. **Index Management** - Maintain discovery indexes

### Phase 4: Observability
10. **Audit System** - Optional change streams
11. **Server Actions** - High-level API wrappers
12. **Testing & Examples** - Comprehensive test suite and usage examples

## Data Flow

### Create Operation
1. Generate unique ID
2. Validate data against schema
3. Apply TTL policy based on object type
4. Store at versioned key (`{base}:version:1`)
5. Update latest pointer (`{base}:latest`)
6. Add to collection index
7. Optional: Append to audit stream

### Update Operation
1. Increment version number
2. Validate patch against schema
3. Store new version (`{base}:version:N`)
4. Update latest pointer
5. Preserve all previous versions
6. Optional: Append to audit stream

### Mutation Operation
1. Load document from latest version
2. Execute pure function transformation
3. Store result at mutation key (`{base}:mutation:{name}`)
4. Return transformed data

### Transformation Operation
1. Queue job in Redis Stream/List
2. Worker picks up job
3. Worker processes document
4. Worker stores result at transformation key (`{base}:transformation:{name}`)
5. Client polls or gets notified of completion

## Error Handling

- **Schema Validation Errors** - Thrown before any Redis operations
- **Connection Errors** - Propagated with context
- **Version Conflicts** - Handled with optimistic locking
- **Worker Failures** - Retry logic with exponential backoff

## Performance Considerations

- **Batch Operations** - Support for bulk creates/updates
- **Connection Pooling** - Reuse Redis connections
- **Key Expiration** - Automatic cleanup based on TTL policies
- **Index Maintenance** - Efficient set operations for discovery

## Security

- **Input Validation** - All data validated before storage
- **Key Sanitization** - Prevent injection attacks
- **Access Control** - Repository-level permissions (future)
- **Audit Trails** - Complete change history when enabled

## Monitoring & Observability

- **Metrics** - Operation counts, latencies, error rates
- **Logging** - Structured logs for all operations
- **Health Checks** - Connection and operation health endpoints
- **Tracing** - Distributed tracing support

## Migration Strategy

- **Backward Compatibility** - Support for existing Redis data
- **Schema Evolution** - Versioned schemas with migration paths
- **Data Migration** - Tools for converting existing data to new format

## Future Enhancements

- **Multi-Redis Support** - Sharding across multiple Redis instances
- **Caching Layer** - In-memory caching for frequently accessed data
- **GraphQL Integration** - Auto-generated GraphQL resolvers
- **Real-time Subscriptions** - WebSocket support for live updates
