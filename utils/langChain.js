import dotenv from "dotenv";
dotenv.config();

import { z } from "zod";
import { TaskType } from "@google/generative-ai";
import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { HumanMessage, AIMessage } from "@langchain/core/messages";

if (!process.env.GEMINI_API_KEY) {
  throw new Error(
    "GEMINI_API_KEY is not set. Please add it to your .env file before starting the server.",
  );
}

const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || "gemini-2.5-flash-lite";
const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";

/* -------------------------------------------------------------------------- */
/*  Model singletons                                                          */
/* -------------------------------------------------------------------------- */

let chatModel;
/**
 * Returns a shared ChatGoogleGenerativeAI instance (LangChain's wrapper around Gemini).
 */
export const getChatModel = () => {
  if (!chatModel) {
    chatModel = new ChatGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY,
      model: CHAT_MODEL,
      temperature: 0.3,
    });
  }
  return chatModel;
};

let documentEmbeddings;
/**
 * Embeddings model tuned for indexing document chunks (RETRIEVAL_DOCUMENT task type).
 */
const getDocumentEmbeddingsModel = () => {
  if (!documentEmbeddings) {
    documentEmbeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GEMINI_API_KEY,
      model: EMBEDDING_MODEL,
      taskType: TaskType.RETRIEVAL_DOCUMENT,
    });
  }
  return documentEmbeddings;
};

let queryEmbeddings;
/**
 * Embeddings model tuned for embedding a user's search/chat query (RETRIEVAL_QUERY task type).
 * Using a matching asymmetric task type for queries vs. documents noticeably improves
 * retrieval relevance compared to embedding everything the same way.
 */
const getQueryEmbeddingsModel = () => {
  if (!queryEmbeddings) {
    queryEmbeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GEMINI_API_KEY,
      model: EMBEDDING_MODEL,
      taskType: TaskType.RETRIEVAL_QUERY,
    });
  }
  return queryEmbeddings;
};

/* -------------------------------------------------------------------------- */
/*  Chunking + embeddings (replaces the old word-count chunker + keyword       */
/*  search in textChunker.js with a real splitter + vector similarity)        */
/* -------------------------------------------------------------------------- */

/**
 * Split raw document text into overlapping chunks using LangChain's
 * RecursiveCharacterTextSplitter (splits on paragraph/sentence/word boundaries
 * where possible, instead of a naive fixed word count).
 * @param {string} text
 * @param {number} chunkSize - target size per chunk, in characters
 * @param {number} chunkOverlap - overlap between consecutive chunks, in characters
 * @returns {Promise<Array<{content: string, chunkIndex: number, pageNumber: number}>>}
 */
export const splitTextIntoChunks = async (text, chunkSize = 1500, chunkOverlap = 200) => {
  if (!text || !text.trim()) return [];

  const splitter = new RecursiveCharacterTextSplitter({ chunkSize, chunkOverlap });
  const pieces = await splitter.splitText(text);

  return pieces
    .map((content) => content.trim())
    .filter((content) => content.length > 0)
    .map((content, index) => ({
      content,
      chunkIndex: index,
      pageNumber: 0,
    }));
};

/**
 * Embed a batch of document chunk strings. The embeddings model batches
 * internally (Gemini's API caps batches at 100 inputs), so any number of
 * chunks can be passed in here.
 * @param {string[]} texts
 * @returns {Promise<number[][]>}
 */
export const embedTexts = async (texts) => {
  if (!texts || texts.length === 0) return [];
  return getDocumentEmbeddingsModel().embedDocuments(texts);
};

/**
 * Embed a single query string (e.g. a chat question or "explain this concept" prompt).
 * @param {string} text
 * @returns {Promise<number[]>}
 */
export const embedQuery = async (text) => {
  return getQueryEmbeddingsModel().embedQuery(text);
};

/**
 * Cosine similarity between two equal-length vectors.
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}
 */
export const cosineSimilarity = (a, b) => {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * Find the most semantically relevant chunks for a query embedding using cosine
 * similarity. This replaces the old keyword/regex matching in textChunker.js with
 * real vector search, so retrieval understands meaning, not just shared words.
 * @param {Array<{content, chunkIndex, pageNumber, embedding}>} chunks
 * @param {number[]} queryEmbedding
 * @param {number} maxChunks
 * @returns {Array<{content, chunkIndex, pageNumber, _id, score}>}
 */
export const findRelevantChunks = (chunks, queryEmbedding, maxChunks = 3) => {
  if (!chunks?.length || !queryEmbedding?.length) return [];

  return chunks
    .filter((chunk) => Array.isArray(chunk.embedding) && chunk.embedding.length > 0)
    .map((chunk) => ({
      content: chunk.content,
      chunkIndex: chunk.chunkIndex,
      pageNumber: chunk.pageNumber,
      _id: chunk._id,
      score: cosineSimilarity(chunk.embedding, queryEmbedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxChunks);
};

/* -------------------------------------------------------------------------- */
/*  LangChain prompt chains (replaces direct ai.models.generateContent() calls */
/*  + fragile regex parsing in the old geminiService.js)                      */
/* -------------------------------------------------------------------------- */

// Structured schema for document info — Gemini is forced to return exactly this
// shape, so there's no more hand-rolled regex parsing of "headline:" / "---" markers.
const documentInfoSchema = z.object({
  headline: z.string().describe("One concise headline summarizing the document, 6-12 words"),
  about: z
    .string()
    .describe("A 4-5 sentence summary of the document, written in simple, plain language"),
  cards: z
    .array(
      z.object({
        topic: z.string().describe("Short topic title, 3-6 words"),
        summary: z.string().describe("Simple 1-2 sentence explanation of the topic"),
      }),
    )
    .describe("Bite-sized education cards covering the key ideas in the document"),
});

const documentInfoPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "You are an expert study-guide writer. You read documents and distill them into " +
      "a short headline, a plain-language overview, and a set of bite-sized education cards.",
  ],
  [
    "human",
    "Analyze the following document text and generate a headline, an about section, " +
      "and exactly {count} education cards.\n\nText:\n{text}",
  ],
]);

/**
 * Generate a headline, plain-language overview, and education cards for a document.
 * @param {string} text - Document text
 * @param {number} count - Number of education cards to generate
 * @returns {Promise<{headline: string, about: string, cards: Array<{topic, summary}>}>}
 */
export const generateDocumentInfo = async (text, count = 9) => {
  try {
    const structuredModel = getChatModel().withStructuredOutput(documentInfoSchema, {
      name: "DocumentInfo",
    });
    const chain = documentInfoPrompt.pipe(structuredModel);

    const result = await chain.invoke({ count, text: text.substring(0, 20000) });

    return {
      headline: result.headline,
      about: result.about,
      cards: result.cards.slice(0, count),
    };
  } catch (error) {
    console.error("LangChain error (generateDocumentInfo):", error);
    throw new Error("Failed to generate document info");
  }
};

const summaryPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "You are a helpful study assistant who writes clear, well-structured summaries.",
  ],
  [
    "human",
    "Provide a concise summary of the following text, highlighting the key concepts, " +
      "main ideas, and important points. Keep the summary clear and structured.\n\nText:\n{text}",
  ],
]);

/**
 * Generate a summary for a document.
 * @param {string} text - Document text
 * @returns {Promise<string>}
 */
export const generateSummary = async (text) => {
  try {
    const chain = summaryPrompt.pipe(getChatModel()).pipe(new StringOutputParser());
    return await chain.invoke({ text: text.substring(0, 20000) });
  } catch (error) {
    console.error("LangChain error (generateSummary):", error);
    throw new Error("Failed to generate summary");
  }
};

const chatPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "You are a helpful assistant answering questions about a specific document. " +
      "Base your answer only on the provided context. If the answer is not contained " +
      "in the context, say so honestly instead of guessing.",
  ],
  new MessagesPlaceholder("history"),
  ["human", "Context from the document:\n{context}\n\nQuestion: {question}"],
]);

/**
 * Answer a question about a document using retrieved context chunks and recent
 * conversation history, so follow-up questions ("what about the second one?")
 * actually have memory of the conversation instead of being answered in isolation.
 * @param {Object} params
 * @param {string} params.question
 * @param {Array<{content: string}>} params.chunks - relevant chunks from findRelevantChunks
 * @param {Array<{role: "user"|"assistant", content: string}>} [params.history] - prior turns
 * @returns {Promise<string>}
 */
export const chatWithContext = async ({ question, chunks, history = [] }) => {
  try {
    const context = chunks.length
      ? chunks.map((c, i) => `[Excerpt ${i + 1}]\n${c.content}`).join("\n\n")
      : "No relevant excerpts were found in the document for this question.";

    const formattedHistory = history.map((m) =>
      m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content),
    );

    const chain = chatPrompt.pipe(getChatModel()).pipe(new StringOutputParser());
    return await chain.invoke({ context, question, history: formattedHistory });
  } catch (error) {
    console.error("LangChain error (chatWithContext):", error);
    throw new Error("Failed to process chat request");
  }
};

const explainConceptPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "You are a clear, patient teacher. Explain concepts simply and include examples " +
      "where they help understanding.",
  ],
  [
    "human",
    'Explain the concept of "{concept}" based on the following context from a document. ' +
      "If the context does not fully cover it, explain using your general knowledge but " +
      "say so.\n\nContext:\n{context}",
  ],
]);

/**
 * Explain a specific concept using relevant context pulled from a document.
 * @param {Object} params
 * @param {string} params.concept
 * @param {string} params.context
 * @returns {Promise<string>}
 */
export const explainConcept = async ({ concept, context }) => {
  try {
    const chain = explainConceptPrompt.pipe(getChatModel()).pipe(new StringOutputParser());
    return await chain.invoke({ concept, context: context.substring(0, 10000) });
  } catch (error) {
    console.error("LangChain error (explainConcept):", error);
    throw new Error("Failed to explain concept");
  }
};
