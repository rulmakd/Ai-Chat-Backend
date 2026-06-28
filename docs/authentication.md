# Authentication

All routes are mounted under `/api/auth`.

## Register

```
POST /api/auth/register
```

Public. Creates a new user and returns a JWT.

**Body**

```json
{
  "username": "rahul_dev",
  "email": "rahul@example.com",
  "password": "secret123"
}
```

| Field    | Rules |
|----------|-------|
| username | required, trimmed, min 3 characters |
| email    | required, valid email format, normalized |
| password | required, min 6 characters |

**Response — 201 Created**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "6701f3a9c2e4b1a2d3c4e5f6",
      "username": "rahul_dev",
      "email": "rahul@example.com",
      "profileImage": null,
      "createdAt": "2026-06-29T10:15:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "User registered successfully"
}
```

**Response — 400 Bad Request** (validation failure)

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

**Response — 400 Bad Request** (duplicate email/username)

```json
{
  "success": false,
  "error": "Email is already registered",
  "statusCode": 400
}
```

---

## Login

```
POST /api/auth/login
```

Public.

**Body**

```json
{
  "email": "rahul@example.com",
  "password": "secret123"
}
```

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "6701f3a9c2e4b1a2d3c4e5f6",
      "username": "rahul_dev",
      "email": "rahul@example.com",
      "profileImage": null
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login successful"
}
```

**Response — 401 Unauthorized**

```json
{
  "success": false,
  "error": "Invalid credentials",
  "statusCode": 401
}
```

---

## Get profile

```
GET /api/auth/profile
```

Requires `Authorization: Bearer <token>`.

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "id": "6701f3a9c2e4b1a2d3c4e5f6",
    "username": "rahul_dev",
    "email": "rahul@example.com",
    "profileImage": null,
    "createdAt": "2026-06-29T10:15:00.000Z",
    "updatedAt": "2026-06-29T10:15:00.000Z"
  }
}
```

---

## Update profile

```
PUT /api/auth/profile
```

Requires auth. Any subset of the fields below may be sent.

**Body**

```json
{
  "username": "rahul_codes",
  "profileImage": "https://res.cloudinary.com/.../avatar.png"
}
```

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "id": "6701f3a9c2e4b1a2d3c4e5f6",
    "username": "rahul_codes",
    "email": "rahul@example.com",
    "profileImage": "https://res.cloudinary.com/.../avatar.png"
  },
  "message": "Profile updated successfully"
}
```

---

## Change password

```
POST /api/auth/change-password
```

Requires auth.

**Body**

```json
{
  "currentPassword": "secret123",
  "newPassword": "evenSecreter456"
}
```

**Response — 200 OK**

```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Response — 401 Unauthorized**

```json
{
  "success": false,
  "error": "Current password is incorrect",
  "statusCode": 401
}
```
