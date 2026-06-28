# AI Document Chat — Backend

A Node.js + Express REST API for uploading PDF documents and chatting with them
using Google Gemini through LangChain. Upload a PDF, get an AI-generated
overview and summary, then ask questions about it in a real RAG (retrieval-
augmented generation) chat with conversational memory.

## Stack

- **Express 5** — REST API
- **MongoDB / Mongoose** — users, documents, chat history
- **Cloudinary** — PDF file storage
- **LangChain (`@langchain/google-genai`)** — Gemini chat model + embeddings,
  prompt templates, structured output, RAG orchestration
- **Gemini `gemini-2.5-flash-lite`** — chat model
- **Gemini `gemini-embedding-001`** — embeddings model, used for semantic search

## Architecture

```
PDF upload → Cloudinary storage → text extraction (pdf-parse)
           → chunking (LangChain RecursiveCharacterTextSplitter)
           → embedding every chunk (Gemini embeddings, stored on the Document)

Chat question → embed the question → cosine-similarity search over stored
              chunk embeddings → top matches + recent chat history fed into
              a LangChain prompt chain → Gemini → answer (+ saved to history)
```

Auth is JWT-based (Bearer token), passwords hashed with bcrypt.

## Setup

```bash
npm install
cp .env.example .env   # then fill in your real values
npm run dev             # or: npm start
```

Required env vars are documented in `.env.example`. You'll need:
- A MongoDB connection string
- A [Gemini API key](https://aistudio.google.com/apikey)
- Cloudinary credentials (cloud name, API key, API secret)

## API docs

Full endpoint reference with example requests/responses: see [`docs/`](./docs).

## What was fixed in this pass

This backend came with a real LangChain "integration" that was just an empty
file (`utils/langChain.js`), Gemini calls made directly via the raw SDK with
fragile regex-parsed responses, and keyword-matching instead of real
retrieval. It also could not start at all. Fixed:

- **App couldn't boot** — `server.js` imported `flashcardRoutes.js`,
  `quizRoutes.js`, `progressRoutes.js`, and `postRouters.js`, none of which
  existed in this codebase (`ERR_MODULE_NOT_FOUND` on startup). Same for
  `Flashcard`/`Quiz` model imports in `documentController.js`. Removed —
  out of scope for this chat app and the source files don't exist here.
- **LangChain integration built from scratch** — `utils/langChain.js` now
  wraps Gemini through `ChatGoogleGenerativeAI`, uses a real
  `RecursiveCharacterTextSplitter` for chunking, generates embeddings per
  chunk for semantic search, and uses prompt templates + structured Zod
  output instead of regex-parsing Gemini's raw text.
- **Chat had no real retrieval or memory** — questions are now embedded and
  matched against chunk embeddings by cosine similarity (instead of keyword
  overlap), and the last few turns of conversation are passed back to Gemini
  so follow-up questions work.
- **`explainConcept` bug** — was joining `chunk.concept` (a field that doesn't
  exist on chunks) into the prompt context, so the model always got `undefined`.
- **User password hook bug** — the pre-save hook never called `next()` when a
  password *was* changed, which would hang any save indefinitely.
- **Auth middleware silent failure** — an invalid/malformed token (anything
  other than an expired one) got no response at all, hanging the request.
- **Register endpoint** — only checked email uniqueness, so "Username already
  taken" could never actually fire even though the code implied it would.
- **CORS misconfiguration** — `origin: "*"` with `credentials: true` is invalid
  per spec; removed `credentials` since auth uses a Bearer token, not cookies.
- **PDF parsing** — `pdf-parse` v2's `PDFParse` class takes a `{ data }` options
  object, not a raw buffer, and the page count is `result.total`, not
  `result.numPages`. Also added cleanup (`parser.destroy()`) and made sure the
  downloaded temp file is always deleted, even when extraction fails.
- **Cloudinary file deletion** — was reconstructing the file's `public_id` by
  splitting the stored URL on `.`, which silently breaks for any filename that
  contains a dot. Now the `public_id` is stored directly on the `Document` at
  upload time and reused as-is.
- Plus a handful of typos and inconsistent response shapes across endpoints,
  now standardized to `{ success, data, message }` / `{ success: false, error, statusCode }`.

### ⚠️ About your `.env` file

The `.env` you uploaded contained live credentials — a MongoDB password, JWT
secret, Cloudinary secret, and two Gemini API keys — all in plain text. Since
that file passed through this chat, treat those credentials as compromised:
**rotate all of them** (new Mongo user password, new JWT secret, regenerate
the Cloudinary API secret and Gemini API keys) before using this in anything
beyond local testing, and especially before pushing this repo anywhere public.
This project ships a `.env.example` instead, and `.gitignore` now excludes
`.env` so it won't get committed going forward.
