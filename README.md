# API Documentation

Base URL (local): `http://localhost:8000/api`

## Contents

- [Authentication](./authentication.md) — register, login, profile
- [Documents](./documents.md) — upload, list, fetch, delete PDFs
- [AI / Chat](./ai.md) — document info, summary, RAG chat, concept explanations

## Conventions

**Auth header.** Every route except `POST /auth/register` and `POST /auth/login`
requires a JWT in the `Authorization` header:

```
Authorization: Bearer <token>
```

**Success response shape.**

```json
{
  "success": true,
  "data": { /* endpoint-specific payload */ },
  "message": "Optional human-readable message"
}
```

`message` is included on most write/AI endpoints; some read endpoints omit it.
List endpoints also include a top-level `count`.

**Error response shape.**

```json
{
  "success": false,
  "error": "Human-readable error message",
  "statusCode": 400
}
```

Validation errors (registration) additionally include an `errors` array with
one entry per failed field:

```json
{
  "success": false,
  "error": "Username must be at least 3 characters",
  "errors": [
    { "field": "username", "message": "Username must be at least 3 characters" }
  ],
  "statusCode": 400
}
```

**Status codes used throughout:**

| Code | Meaning |
|------|---------|
| 200  | Success |
| 201  | Resource created |
| 400  | Bad request / validation error |
| 401  | Not authenticated / invalid credentials / bad or missing token |
| 404  | Resource not found |
| 500  | Unexpected server error |

## Health check

```
GET /api/health
```

```json
{ "success": true, "message": "OK" }
```
