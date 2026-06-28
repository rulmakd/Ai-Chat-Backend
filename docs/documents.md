# Documents

All routes are mounted under `/api/documents` and require
`Authorization: Bearer <token>`.

## Upload a PDF

```
POST /api/documents/upload
Content-Type: multipart/form-data
```

**Form fields**

| Field | Type | Notes |
|-------|------|-------|
| `file`  | file   | required, PDF only, max size set by `MAX_FILE_SIZE` (default 10MB) |
| `title` | string | required |

**Response — 201 Created**

The document is created with `status: "processing"` immediately; text
extraction, chunking, and embedding happen asynchronously right after.

```json
{
  "success": true,
  "data": {
    "_id": "6701f4b1c2e4b1a2d3c4e5f7",
    "userId": "6701f3a9c2e4b1a2d3c4e5f6",
    "title": "Operating Systems Notes",
    "fileName": "os-notes.pdf",
    "filePath": "https://res.cloudinary.com/.../user_document/1719999999_os-notes.pdf",
    "publicId": "user_document/1719999999_os-notes",
    "fileSize": 482931,
    "extractedText": "",
    "chunks": [],
    "status": "processing",
    "uploadDate": "2026-06-29T10:20:00.000Z",
    "lastAccessed": "2026-06-29T10:20:00.000Z",
    "createdAt": "2026-06-29T10:20:00.000Z",
    "updatedAt": "2026-06-29T10:20:00.000Z"
  },
  "message": "Document uploaded successfully. Processing..."
}
```

Poll `GET /api/documents/:id` until `status` becomes `"ready"` (or `"failed"`)
before calling any AI endpoints on it.

**Response — 400 Bad Request**

```json
{ "success": false, "error": "Please provide a document title", "statusCode": 400 }
```

---

## List documents

```
GET /api/documents
```

Returns all of the current user's documents, newest first. `extractedText`
and `chunks` are excluded to keep the list light.

**Response — 200 OK**

```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "6701f4b1c2e4b1a2d3c4e5f7",
      "userId": "6701f3a9c2e4b1a2d3c4e5f6",
      "title": "Operating Systems Notes",
      "fileName": "os-notes.pdf",
      "filePath": "https://res.cloudinary.com/.../os-notes.pdf",
      "publicId": "user_document/1719999999_os-notes",
      "fileSize": 482931,
      "status": "ready",
      "uploadDate": "2026-06-29T10:20:00.000Z",
      "lastAccessed": "2026-06-29T10:21:00.000Z"
    }
  ]
}
```

---

## Get a single document

```
GET /api/documents/:id
```

Returns the full document, including extracted text and chunks (chunk vector
embeddings are excluded by default). Updates `lastAccessed`.

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "_id": "6701f4b1c2e4b1a2d3c4e5f7",
    "title": "Operating Systems Notes",
    "fileName": "os-notes.pdf",
    "status": "ready",
    "extractedText": "Chapter 1: Introduction to Operating Systems...",
    "chunks": [
      { "_id": "6701f4...", "content": "Chapter 1: Introduction...", "pageNumber": 0, "chunkIndex": 0 },
      { "_id": "6701f4...", "content": "An operating system manages...", "pageNumber": 0, "chunkIndex": 1 }
    ],
    "uploadDate": "2026-06-29T10:20:00.000Z",
    "lastAccessed": "2026-06-29T10:22:00.000Z"
  }
}
```

**Response — 404 Not Found**

```json
{ "success": false, "error": "Document not found", "statusCode": 404 }
```

---

## Delete a document

```
DELETE /api/documents/:id
```

Deletes the file from Cloudinary, removes its chat history, then deletes the
document record.

**Response — 200 OK**

```json
{ "success": true, "message": "Document deleted successfully" }
```
