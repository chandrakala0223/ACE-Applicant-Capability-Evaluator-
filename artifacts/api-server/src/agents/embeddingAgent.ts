import { generateEmbedding, callLLM } from "../lib/llm";
import { upsertVector, searchSimilar, COLLECTIONS } from "../lib/qdrant";
import { logger } from "../lib/logger";

export interface EmbeddingAgentOutput {
  success: boolean;
  vectorId: string;
  contextChunks?: string[];
}

export async function runEmbeddingAgent(
  candidateId: string,
  resumeText: string,
): Promise<EmbeddingAgentOutput> {
  try {
    // Chunk resume at 500 chars as per SRS
    const chunks = chunkText(resumeText, 500);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const vector = await generateEmbedding(chunk);
      await upsertVector(COLLECTIONS.RESUMES, `${candidateId}-chunk-${i}`, vector, {
        candidateId,
        chunkIndex: i,
        text: chunk,
        type: "resume",
      });
    }

    logger.info({ candidateId, chunks: chunks.length }, "Resume embedded successfully");

    return {
      success: true,
      vectorId: `${candidateId}-chunk-0`,
    };
  } catch (err) {
    logger.error({ err, candidateId }, "Embedding agent failed");
    return { success: false, vectorId: "" };
  }
}

export async function retrieveContext(
  query: string,
  topK = 5,
): Promise<string[]> {
  try {
    const vector = await generateEmbedding(query);
    const results = await searchSimilar(COLLECTIONS.POLICIES, vector, topK, 0.5);

    if (results.length === 0) {
      // Also search resumes for similar candidates context
      const resumeResults = await searchSimilar(COLLECTIONS.RESUMES, vector, topK, 0.5);
      return resumeResults.map((r) => String(r.payload["text"] || "")).filter(Boolean);
    }

    return results.map((r) => String(r.payload["text"] || "")).filter(Boolean);
  } catch (err) {
    logger.warn({ err }, "RAG context retrieval failed, returning empty context");
    return [];
  }
}

function chunkText(text: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks.length > 0 ? chunks : [text];
}

export async function embedDocument(
  id: string,
  text: string,
  collection: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const chunks = chunkText(text, 1000); // Policy chunks at 1000 chars
  for (let i = 0; i < chunks.length; i++) {
    const vector = await generateEmbedding(chunks[i]);
    await upsertVector(collection, `${id}-${i}`, vector, {
      ...metadata,
      text: chunks[i],
      chunkIndex: i,
    });
  }
}
