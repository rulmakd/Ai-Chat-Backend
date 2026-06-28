# API Endpoints Documentation

This document provides a comprehensive guide to all available API endpoints for the Ai-Chat-Backend service.

## Table of Contents

- [Authentication](#authentication)
- [Base URL](#base-url)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Endpoints](#endpoints)
  - [Chat Endpoints](#chat-endpoints)
  - [User Endpoints](#user-endpoints)
  - [Conversation Endpoints](#conversation-endpoints)
  - [System Endpoints](#system-endpoints)

## Authentication

All requests to protected endpoints require a valid authentication token in the `Authorization` header.

```
Authorization: Bearer <your_token>
```

## Base URL

```
https://api.example.com/v1
```

## Response Format

All API responses are returned in JSON format with the following standard structure:

```json
{
  "success": true,
  "data": {},
  "message": "Success message",
  "timestamp": "2026-06-28T12:00:00Z"
}
```

## Error Handling

Error responses follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message"
  },
  "timestamp": "2026-06-28T12:00:00Z"
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication token |
| `FORBIDDEN` | 403 | User does not have permission to access this resource |
| `NOT_FOUND` | 404 | Resource not found |
| `BAD_REQUEST` | 400 | Invalid request parameters |
| `INTERNAL_ERROR` | 500 | Internal server error |
| `RATE_LIMITED` | 429 | Too many requests |

---

## Endpoints

### Chat Endpoints

#### Send Message

Send a message to the AI chat model.

```
POST /chat/message
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "conversationId": "conv_123",
  "message": "Hello, how are you?",
  "model": "gpt-4",
  "temperature": 0.7,
  "maxTokens": 2000
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "messageId": "msg_456",
    "conversationId": "conv_123",
    "response": "I'm doing well, thank you for asking!",
    "tokens": {
      "input": 15,
      "output": 12
    },
    "timestamp": "2026-06-28T12:00:00Z"
  },
  "message": "Message processed successfully"
}
```

**Query Parameters:**
- `conversationId` (required): The ID of the conversation
- `model` (optional): AI model to use (default: gpt-4)
- `temperature` (optional): Temperature for response creativity (0-1, default: 0.7)

**Status Codes:**
- `200` - Message processed successfully
- `400` - Invalid request parameters
- `401` - Unauthorized
- `429` - Rate limited

---

#### Stream Message Response

Stream the AI response to a message in real-time.

```
POST /chat/message/stream
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "conversationId": "conv_123",
  "message": "Explain quantum computing",
  "model": "gpt-4"
}
```

**Response Format (Server-Sent Events):**
```
data: {"token": "Quantum", "type": "text_chunk"}
data: {"token": " computing", "type": "text_chunk"}
data: {"done": true, "totalTokens": 450, "type": "completion"}
```

---

#### Get Chat History

Retrieve chat history for a conversation.

```
GET /chat/history/:conversationId
```

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit` (optional): Number of messages to return (default: 50, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "conversationId": "conv_123",
    "messages": [
      {
        "messageId": "msg_456",
        "role": "user",
        "content": "Hello",
        "timestamp": "2026-06-28T12:00:00Z"
      },
      {
        "messageId": "msg_457",
        "role": "assistant",
        "content": "Hi there!",
        "timestamp": "2026-06-28T12:00:05Z"
      }
    ],
    "total": 2,
    "page": 1
  }
}
```

---

### User Endpoints

#### Register User

Create a new user account.

```
POST /auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "username": "johndoe"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "userId": "user_789",
    "email": "user@example.com",
    "username": "johndoe",
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "refresh_token_..."
  }
}
```

**Status Codes:**
- `201` - User created successfully
- `400` - Invalid input
- `409` - User already exists

---

#### Login

Authenticate a user and obtain access tokens.

```
POST /auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "refresh_token_...",
    "expiresIn": 3600,
    "user": {
      "userId": "user_789",
      "email": "user@example.com",
      "username": "johndoe"
    }
  }
}
```

---

#### Get User Profile

Retrieve the authenticated user's profile.

```
GET /users/profile
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "userId": "user_789",
    "email": "user@example.com",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "avatar": "https://example.com/avatar.jpg",
    "createdAt": "2026-01-15T10:00:00Z",
    "updatedAt": "2026-06-28T12:00:00Z"
  }
}
```

---

#### Update User Profile

Update the authenticated user's profile information.

```
PUT /users/profile
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "firstName": "Jonathan",
  "lastName": "Smith",
  "avatar": "https://example.com/new-avatar.jpg"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "userId": "user_789",
    "email": "user@example.com",
    "firstName": "Jonathan",
    "lastName": "Smith",
    "updatedAt": "2026-06-28T12:30:00Z"
  }
}
```

---

### Conversation Endpoints

#### Create Conversation

Create a new conversation.

```
POST /conversations
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Project Discussion",
  "description": "Discussion about the new project",
  "model": "gpt-4"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "conversationId": "conv_123",
    "title": "Project Discussion",
    "description": "Discussion about the new project",
    "model": "gpt-4",
    "createdAt": "2026-06-28T12:00:00Z"
  }
}
```

---

#### List Conversations

Get all conversations for the authenticated user.

```
GET /conversations
```

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit` (optional): Number of conversations to return (default: 20, max: 100)
- `offset` (optional): Pagination offset (default: 0)
- `sortBy` (optional): Sort field (createdAt, updatedAt, title)
- `order` (optional): Sort order (asc, desc, default: desc)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "conversationId": "conv_123",
        "title": "Project Discussion",
        "description": "Discussion about the new project",
        "model": "gpt-4",
        "messageCount": 15,
        "createdAt": "2026-06-28T12:00:00Z",
        "updatedAt": "2026-06-28T13:00:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 20
  }
}
```

---

#### Get Conversation Details

Retrieve details of a specific conversation.

```
GET /conversations/:conversationId
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "conversationId": "conv_123",
    "title": "Project Discussion",
    "description": "Discussion about the new project",
    "model": "gpt-4",
    "messages": 15,
    "createdAt": "2026-06-28T12:00:00Z",
    "updatedAt": "2026-06-28T13:00:00Z"
  }
}
```

---

#### Update Conversation

Update a conversation's details.

```
PUT /conversations/:conversationId
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Updated Project Discussion",
  "description": "Updated description"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "conversationId": "conv_123",
    "title": "Updated Project Discussion",
    "description": "Updated description",
    "updatedAt": "2026-06-28T14:00:00Z"
  }
}
```

---

#### Delete Conversation

Delete a conversation.

```
DELETE /conversations/:conversationId
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (204):**
```
No Content
```

**Status Codes:**
- `204` - Conversation deleted successfully
- `404` - Conversation not found
- `403` - Unauthorized to delete

---

### System Endpoints

#### Health Check

Check the API server health status.

```
GET /health
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-06-28T12:00:00Z",
    "uptime": 86400,
    "version": "1.0.0"
  }
}
```

---

#### Get API Version

Get the current API version.

```
GET /version
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "version": "1.0.0",
    "buildNumber": 42,
    "releaseDate": "2026-06-01T00:00:00Z"
  }
}
```

---

#### Rate Limit Status

Get current rate limit information.

```
GET /rate-limit
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "limit": 1000,
    "remaining": 950,
    "reset": "2026-06-28T13:00:00Z"
  }
}
```

---

## Pagination

Endpoints that support pagination use the following parameters:

- `limit`: Number of results per page (default: 20, max: 100)
- `offset`: Number of items to skip (default: 0)

The response includes:
- `total`: Total number of items
- `page`: Current page number
- `pageSize`: Number of items returned

---

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Default Limit**: 1000 requests per hour
- **Premium Limit**: 10000 requests per hour

Rate limit information is included in response headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1656412800
```

---

## Webhooks

Webhooks allow you to receive real-time notifications for events.

### Supported Events

- `message.received` - New message in conversation
- `conversation.created` - New conversation created
- `conversation.deleted` - Conversation deleted
- `user.updated` - User profile updated

### Registering a Webhook

```
POST /webhooks
```

**Request Body:**
```json
{
  "url": "https://your-app.com/webhooks/chat",
  "events": ["message.received", "conversation.created"]
}
```

---

## Best Practices

1. **Always use HTTPS** - Never send credentials over unencrypted connections
2. **Store tokens securely** - Use secure storage for authentication tokens
3. **Implement retry logic** - Retry failed requests with exponential backoff
4. **Handle rate limits** - Implement rate limit handling in your client
5. **Validate input** - Always validate user input on the client side
6. **Use pagination** - Don't fetch all records at once
7. **Monitor usage** - Keep track of API usage to avoid rate limits

---

## Support

For issues or questions about the API:

- **Documentation**: https://docs.example.com
- **Email**: support@example.com
- **GitHub Issues**: https://github.com/rulmakd/Ai-Chat-Backend/issues

---

**Last Updated**: 2026-06-28  
**API Version**: 1.0.0
