# AI / Chat

All routes are mounted under `/api/ai` and require
`Authorization: Bearer <token>`. The target document must have
`status: "ready"` (see [Documents](./documents.md)).

Under the hood, these endpoints are powered by LangChain (`utils/langChain.js`):
Gemini chat model + embeddings, a real text splitter for chunking, cosine-
similarity retrieval over chunk embeddings for chat/explain, and structured
(Zod-validated) output for the document-info endpoint.

## Generate document info

```
POST /api/ai/generate-document-info
```

Generates a headline, plain-language overview, and a set of education cards
for a document. Cached after the first call — subsequent calls return the
stored result instantly instead of calling Gemini again.

**Body**

```json
{ "documentId": "6701f4b1c2e4b1a2d3c4e5f7" }
```

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "_id": "6701f5...",
    "userId": "6701f3a9c2e4b1a2d3c4e5f6",
    "documentId": "6701f4b1c2e4b1a2d3c4e5f7",
    "headline": "An introduction to operating system fundamentals",
    "about": "This document introduces what operating systems are and the core problems they solve...",
    "cards": [
      { "topic": "Process Management", "summary": "How the OS schedules and isolates running programs." },
      { "topic": "Memory Management", "summary": "How physical and virtual memory are allocated to processes." }
    ],
    "createdAt": "2026-06-29T10:25:00.000Z",
    "updatedAt": "2026-06-29T10:25:00.000Z"
  },
  "message": "Document information generated successfully"
}
```

(On a cache hit, `message` is `"Document info (cached)"`.)

---

## Generate summary

```
POST /api/ai/generate-summary
```

**Body**

```json
{ "documentId": "6701f4b1c2e4b1a2d3c4e5f7" }
```

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "documentId": "6701f4b1c2e4b1a2d3c4e5f7",
    "title": "Operating Systems Notes",
    "summary": "This document covers the core responsibilities of an operating system, including process scheduling, memory management, and file systems. Key concepts include..."
  },
  "message": "Summary generated successfully"
}
```

---

## Chat with a document

```
POST /api/ai/chat
```

Embeds the question, retrieves the most semantically relevant chunks via
cosine similarity (not keyword matching), and answers using those chunks plus
the last few turns of conversation history for context.

**Body**

```json
{
  "documentId": "6701f4b1c2e4b1a2d3c4e5f7",
  "question": "What is the difference between a process and a thread?"
}
```

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "question": "What is the difference between a process and a thread?",
    "answer": "A process is an independent program in execution with its own memory space, while a thread is a lighter-weight unit of execution that runs within a process and shares its memory with other threads in the same process...",
    "relevantChunks": [4, 5, 12],
    "chatHistoryId": "6701f6..."
  },
  "message": "Response generated successfully"
}
```

`relevantChunks` are the `chunkIndex` values of the document chunks used as
context, in case the client wants to highlight or link to them.

**Response — 404 Not Found**

```json
{ "success": false, "error": "Document not found or not ready", "statusCode": 404 }
```

---

## Explain a concept

```
POST /api/ai/explain-concept
```

Same retrieval approach as chat, but framed as a teaching explanation of a
named concept rather than an answer to a free-form question.

**Body**

```json
{
  "documentId": "6701f4b1c2e4b1a2d3c4e5f7",
  "concept": "virtual memory"
}
```

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "concept": "virtual memory",
    "explanation": "Virtual memory is a technique that gives each process the illusion of having its own large, contiguous block of memory, even though physical RAM may be smaller or fragmented...",
    "relevantChunks": [7, 8]
  },
  "message": "Explanation generated successfully"
}
```

---

## Get chat history

```
GET /api/ai/chat-history/:documentId
```

**Response — 200 OK**

```json
{
  "success": true,
  "data": [
    {
      "role": "user",
      "content": "What is the difference between a process and a thread?",
      "timestamp": "2026-06-29T10:30:00.000Z",
      "relevantChunks": []
    },
    {
      "role": "assistant",
      "content": "A process is an independent program in execution...",
      "timestamp": "2026-06-29T10:30:02.000Z",
      "relevantChunks": [4, 5, 12]
    }
  ],
  "message": "Chat history retrieved successfully"
}
```

If no chat history exists yet for that document, `data` is `[]` with message
`"No chat history found for this document"`.
