/**
 * Example: Textsplitter Repository
 * 
 * This example demonstrates how to use Redis-Metastore to create
 * a structured data repository for a text processing application.
 */
/** biome-ignore-all lint/suspicious/noConsole: <explanation> */

import { z } from "zod";
import type { RedisClientType } from "redis";
import { defineRepo } from "../lib/repo";
import { createWorker } from "../lib/transformation";
import { ObjectType, TransformationMode } from "../types";
import type { MutationConfig } from "../types";

// Regex patterns defined at module level for performance
const WORD_SPLIT_REGEX = /\s+/;
const HASHTAG_REGEX = /#\w+/g;
const SENTENCE_SPLIT_REGEX = /[.!?]+/;
const PARAGRAPH_SPLIT_REGEX = /\n\s*\n/;

/**
 * 1. Define schemas for type safety
 */
const TextSchema = z.object({
  name: z.string().min(1),
  content: z.string(),
  language: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const SessionSchema = z.object({
  userId: z.string(),
  preferences: z.record(z.string(), z.any()).optional(),
  lastActivity: z.date(),
});

type Text = z.infer<typeof TextSchema>;

/**
 * 2. Define the repository configuration
 */
export const TextsplitterRepo = defineRepo({
  domain: "caimel",
  app: "textsplitter",
  collections: {
    // Immutable text content with versioning
    texts: {
      objectType: ObjectType.TEXTS,
      schema: TextSchema,
      ttl: undefined, // No expiration - keep forever
      mutations: {
        // Split text into words
        textsplit: ((doc: unknown) => {
          const typedDoc = doc as Text;
          return typedDoc.content.split(WORD_SPLIT_REGEX).filter(Boolean);
        }) as MutationConfig<unknown, string[]>,
        
        // Count words
        wordcount: ((doc: unknown) => {
          const typedDoc = doc as Text;
          return typedDoc.content.split(WORD_SPLIT_REGEX).filter(Boolean).length;
        }) as MutationConfig<unknown, number>,
        
        // Extract hashtags
        hashtags: ((doc: unknown) => {
          const typedDoc = doc as Text;
          return typedDoc.content.match(HASHTAG_REGEX) || [];
        }) as MutationConfig<unknown, string[]>,
        
        // Get text statistics
        stats: ((doc: unknown) => {
          const typedDoc = doc as Text;
          return {
            characters: typedDoc.content.length,
            words: typedDoc.content.split(WORD_SPLIT_REGEX).filter(Boolean).length,
            lines: typedDoc.content.split('\n').length,
            paragraphs: typedDoc.content.split(PARAGRAPH_SPLIT_REGEX).length,
          };
        }) as MutationConfig<unknown, { characters: number; words: number; lines: number; paragraphs: number }>,
      },
      transformations: {
        // Heavy async operations
        summarize: { mode: TransformationMode.WORKER, timeout: 30, retries: 2 },
        translate: { mode: TransformationMode.WORKER, timeout: 60, retries: 1 },
        sentiment: { mode: TransformationMode.WORKER, timeout: 15, retries: 3 },
        keywords: { mode: TransformationMode.WORKER, timeout: 20, retries: 2 },
      },
    },
    
    // Ephemeral session state
    sessions: {
      objectType: ObjectType.STATE,
      schema: SessionSchema,
      ttl: 3600, // 1 hour expiration
    },
  },
});

/**
 * 3. Basic usage examples
 */
export async function basicUsageExamples(redisClient: RedisClientType) {
  // Connect to the repository
  const repo = TextsplitterRepo.connect(redisClient, {
    enableAudit: true, // Enable audit logging
  });

  // Create a new text document
  const { id: textId } = await repo.texts.create({
    name: "Sample Document",
    content: "Hello world! This is a #sample text for #testing purposes.",
    language: "en",
    tags: ["sample", "test"],
  });

  console.log(`Created text with ID: ${textId}`);

  // Read the document
  const text = await repo.texts.get(textId);
  console.log("Retrieved text:", text?.data ? (text.data as Text).name : undefined);

  // Update the document (creates new version)
  await repo.texts.update(textId, {
    content: "Updated content with more #hashtags and #keywords!",
    tags: ["sample", "test", "updated"],
  });

  // Get specific version
  const originalVersion = await repo.texts.getVersion(textId, 1);
  console.log("Original content:", originalVersion?.data ? (originalVersion.data as Text).content : undefined);

  // List all versions
  const versions = await repo.texts.listVersions(textId);
  console.log(`Document has ${versions.length} versions`);

  return textId;
}

/**
 * 4. Mutation examples (fast, inline operations)
 */
export async function mutationExamples(redisClient: RedisClientType, textId: string) {
  const repo = TextsplitterRepo.connect(redisClient);

  // Run mutations (execute immediately)
  const words = await repo.texts.runMutation<string[]>(textId, "textsplit");
  console.log("Words:", words);

  const wordCount = await repo.texts.runMutation<number>(textId, "wordcount");
  console.log("Word count:", wordCount);

  const hashtags = await repo.texts.runMutation<string[]>(textId, "hashtags");
  console.log("Hashtags:", hashtags);

  const stats = await repo.texts.runMutation(textId, "stats");
  console.log("Text statistics:", stats);

  // Materialize mutation results (store in Redis for later retrieval)
  await repo.texts.materializeMutation(textId, "textsplit");
  await repo.texts.materializeMutation(textId, "stats");

  // Retrieve materialized results
  const cachedWords = await repo.texts.getMutation<string[]>(textId, "textsplit");
  console.log("Cached words:", cachedWords);
}

/**
 * 5. Transformation examples (async, worker-backed operations)
 */
export async function transformationExamples(redisClient: RedisClientType, textId: string) {
  const repo = TextsplitterRepo.connect(redisClient);

  // Queue async transformations
  const summarizeJobId = await repo.texts.runTransformation(textId, "summarize");
  const sentimentJobId = await repo.texts.runTransformation(textId, "sentiment");
  
  console.log(`Queued summarization job: ${summarizeJobId}`);
  console.log(`Queued sentiment analysis job: ${sentimentJobId}`);

  // Later, retrieve results (after workers have processed them)
  const summary = await repo.texts.getTransformationByName<string>(textId, "summarize");
  const sentiment = await repo.texts.getTransformationByName<{ score: number; label: string }>(textId, "sentiment");

  if (summary) {
    console.log("Summary:", summary);
  }

  if (sentiment) {
    console.log("Sentiment:", sentiment);
  }
}

/**
 * 6. Session management example
 */
export async function sessionExamples(redisClient: RedisClientType) {
  const repo = TextsplitterRepo.connect(redisClient);

  // Create a session (will auto-expire after 1 hour)
  const { id: sessionId } = await repo.sessions.create({
    userId: "user123",
    preferences: {
      theme: "dark",
      language: "en",
    },
    lastActivity: new Date(),
  });

  console.log(`Created session: ${sessionId}`);

  // Update session activity
  await repo.sessions.update(sessionId, {
    lastActivity: new Date(),
    preferences: {
      theme: "light", // User changed theme
      language: "en",
    },
  });

  return sessionId;
}

/**
 * 7. Worker implementation examples
 */
export function setupWorkers(redisClient: RedisClientType) {
  // Summarization worker
  const summaryWorker = createWorker(
    redisClient,
    { domain: "caimel", app: "textsplitter", collection: "texts" },
    "summarize",
    {
      processor: (item, _job) => {
        // Simulate AI summarization
        const data = item.data as Text;
        const text = data.content;
        const words = text.split(WORD_SPLIT_REGEX).filter(Boolean);
        
        if (words.length <= 10) {
          return Promise.resolve(text); // Too short to summarize
        }
        
        // Simple extractive summary (first and last sentences)
        const sentences = text.split(SENTENCE_SPLIT_REGEX).filter((s: string) => s.trim());
        const MIN_SENTENCES = 2;
        if (sentences.length <= MIN_SENTENCES) {
          return Promise.resolve(text);
        }
        
        const lastSentence = sentences.at(-1);
        return Promise.resolve(`${sentences[0].trim()}... ${lastSentence?.trim()}.`);
      },
      config: {
        concurrency: 2,
        pollInterval: 1000,
        maxRetries: 2,
      }
    }
  );

  // Sentiment analysis worker
  const sentimentWorker = createWorker(
    redisClient,
    { domain: "caimel", app: "textsplitter", collection: "texts" },
    "sentiment",
    {
      processor: (item, _job) => {
        // Simulate sentiment analysis
        const data = item.data as Text;
        const text = data.content.toLowerCase();
        
        const positiveWords = ["good", "great", "excellent", "amazing", "wonderful", "happy"];
        const negativeWords = ["bad", "terrible", "awful", "horrible", "sad", "angry"];
        
        let score = 0;
        for (const word of positiveWords) {
          if (text.includes(word)) {
            score += 1;
          }
        }
        for (const word of negativeWords) {
          if (text.includes(word)) {
            score -= 1;
          }
        }
        
        const SENTIMENT_DIVISOR = 5;
        const POSITIVE_THRESHOLD = 0.2;
        const NEGATIVE_THRESHOLD = -0.2;
        const MIN_SCORE = -1;
        const MAX_SCORE = 1;
        const normalizedScore = Math.max(MIN_SCORE, Math.min(MAX_SCORE, score / SENTIMENT_DIVISOR));
        
        let label: string;
        if (normalizedScore > POSITIVE_THRESHOLD) {
          label = "positive";
        } else if (normalizedScore < NEGATIVE_THRESHOLD) {
          label = "negative";
        } else {
          label = "neutral";
        }
        
        return Promise.resolve({
          score: normalizedScore,
          label,
        });
      }
    }
  );

  // Translation worker
  const translationWorker = createWorker(
    redisClient,
    { domain: "caimel", app: "textsplitter", collection: "texts" },
    "translate",
    {
      processor: (item, _job) => {
        // Simulate translation (just reverse the text for demo)
        const data = item.data as Text;
        return Promise.resolve(data.content.split('').reverse().join(''));
      },
      config: {} // Add empty config to match expected structure
    }
  );

  return {
    summaryWorker,
    sentimentWorker,
    translationWorker,
  };
}

/**
 * 8. Complete workflow example
 */
export async function completeWorkflowExample(redisClient: RedisClientType) {
  console.log("=== Redis-Metastore Complete Workflow Example ===\n");

  // 1. Basic CRUD operations
  console.log("1. Creating and managing documents...");
  const textId = await basicUsageExamples(redisClient);

  // 2. Fast mutations
  console.log("\n2. Running inline mutations...");
  await mutationExamples(redisClient, textId);

  // 3. Setup workers for async operations
  console.log("\n3. Setting up transformation workers...");
  const workers = setupWorkers(redisClient);
  
  // Start workers (in a real app, these would run in separate processes)
  // workers.summaryWorker.start();
  // workers.sentimentWorker.start();
  // workers.translationWorker.start();

  // 4. Queue async transformations
  console.log("\n4. Queuing async transformations...");
  await transformationExamples(redisClient, textId);

  // 5. Session management
  console.log("\n5. Managing user sessions...");
  await sessionExamples(redisClient);

  console.log("\n=== Workflow Complete ===");
  
  return {
    textId,
    workers,
  };
}
