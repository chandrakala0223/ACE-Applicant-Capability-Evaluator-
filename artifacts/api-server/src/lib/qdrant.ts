import { QdrantClient } from "@qdrant/js-client-rest";
import { logger } from "./logger";

let client: QdrantClient | null = null;

export function getQdrantClient(): QdrantClient {
  if (client) return client;

  const url = process.env["QDRANT_URL"];
  const apiKey = process.env["QDRANT_API_KEY"]?.trim();

  if (!url) throw new Error("QDRANT_URL not configured");

  client = new QdrantClient({ url, apiKey });
  return client;
}

const COLLECTIONS = {
  RESUMES: "resumes",
  POLICIES: "hiring_policies",
  EVALUATIONS: "evaluation_docs",
} as const;

const VECTOR_DIM = 384;

export async function ensureCollections(): Promise<void> {
  const qdrant = getQdrantClient();

  for (const name of Object.values(COLLECTIONS)) {
    try {
      await qdrant.getCollection(name);
      logger.info({ collection: name }, "Qdrant collection exists");
    } catch {
      try {
        await qdrant.createCollection(name, {
          vectors: { size: VECTOR_DIM, distance: "Cosine" },
        });
        logger.info({ collection: name }, "Qdrant collection created");
      } catch (err) {
        logger.error({ err, collection: name }, "Failed to create collection");
      }
    }
  }
}

export async function upsertVector(
  collection: string,
  id: string,
  vector: number[],
  payload: Record<string, unknown>,
): Promise<void> {
  const qdrant = getQdrantClient();
  const numericId = Math.abs(hashString(id)) % 2147483647 + 1;
  await qdrant.upsert(collection, {
    wait: true,
    points: [{ id: numericId, vector, payload: { ...payload, originalId: id } }],
  });
}

export async function searchSimilar(
  collection: string,
  vector: number[],
  topK = 5,
  minScore = 0.5,
): Promise<Array<{ id: string | number; score: number; payload: Record<string, unknown> }>> {
  const qdrant = getQdrantClient();
  try {
    const results = await qdrant.search(collection, {
      vector,
      limit: topK,
      score_threshold: minScore,
      with_payload: true,
    });
    return results.map((r) => ({
      id: r.id,
      score: r.score,
      payload: (r.payload ?? {}) as Record<string, unknown>,
    }));
  } catch (err) {
    logger.warn({ err }, "Qdrant search failed, returning empty results");
    return [];
  }
}

export { COLLECTIONS };

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}
