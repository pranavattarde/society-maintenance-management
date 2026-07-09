# API Reference

Base URL: `http://localhost:5000/api` (development)

All authenticated endpoints require the header:
```
Authorization: Bearer <token>
```

All responses use `Content-Type: application/json`.

---

## Auth

### POST `/auth/register`

Register a new user account.

**Access:** Public

**Request body:**
```json
{
  "name": "Priya Sharma",
  "email": "priya@example.com",
  "password": "securepassword",
  "role": "RESIDENT",
  "flatNumber": "B-202",
  "phone": "9876543210"
}
```

**Validation rules:**
- `name` — required, minimum 2 characters
- `email` — required, valid email format
- `password` — required, minimum 8 characters
- `role` — required, one of `RESIDENT | ADMIN`
- `flatNumber` — required

**Success `201`:**
```json
{
  "message": "Account created successfully",
  "token": "<jwt>",
  "user": { "id": "...", "name": "Priya Sharma", "email": "...", "role": "RESIDENT", "flatNumber": "B-202" }
}
```

**Error `400`:** Validation failed or email already exists.

---

### POST `/auth/login`

Authenticate and receive a JWT.

**Access:** Public

**Request body:**
```json
{
  "email": "priya@example.com",
  "password": "securepassword"
}
```

**Success `200`:**
```json
{
  "message": "Login successful",
  "token": "<jwt>",
  "user": { "id": "...", "name": "Priya Sharma", "email": "...", "role": "RESIDENT", "flatNumber": "B-202" }
}
```

**Error `401`:** Invalid credentials.

---

### GET `/auth/me`

Return the currently authenticated user's profile.

**Access:** Authenticated

**Success `200`:**
```json
{
  "user": { "id": "...", "name": "Priya Sharma", "email": "...", "role": "RESIDENT", "flatNumber": "B-202", "phone": "..." }
}
```

---

## Complaints

### POST `/complaints`

Submit a new complaint. Supports optional photo upload via `multipart/form-data`.

**Access:** Resident only

**Request body** (`multipart/form-data`):
```
title       string  required
description string  required
category    string  required — PLUMBING | ELECTRICAL | CLEANING | SECURITY | LIFT | PARKING | OTHER
priority    string  required — LOW | MEDIUM | HIGH
photo       file    optional — JPEG, PNG, WebP, max 5 MB
```

**Success `201`:**
```json
{
  "message": "Complaint submitted successfully",
  "complaint": { "id": "...", "title": "...", "status": "OPEN", ... }
}
```

---

### GET `/complaints`

List complaints. Admins see all; residents see only their own.

**Access:** Authenticated

**Query parameters:**
| Param | Values | Description |
|---|---|---|
| `status` | `OPEN \| IN_PROGRESS \| RESOLVED` | Filter by status |
| `category` | `PLUMBING \| ELECTRICAL \| ...` | Filter by category |
| `priority` | `LOW \| MEDIUM \| HIGH` | Filter by priority |

**Success `200`:**
```json
{
  "complaints": [
    { "id": "...", "title": "...", "status": "OPEN", "priority": "HIGH", "category": "PLUMBING", "createdAt": "...", "resident": { "name": "...", "flatNumber": "..." } }
  ]
}
```

---

### GET `/complaints/:id`

Get a single complaint with its full status history.

**Access:** Authenticated (resident can only access own complaints)

**Success `200`:**
```json
{
  "complaint": {
    "id": "...",
    "title": "...",
    "description": "...",
    "status": "IN_PROGRESS",
    "priority": "HIGH",
    "category": "PLUMBING",
    "photoUrl": "https://res.cloudinary.com/...",
    "createdAt": "...",
    "updatedAt": "...",
    "resident": { "name": "...", "flatNumber": "..." },
    "history": [
      { "fromStatus": "OPEN", "toStatus": "IN_PROGRESS", "remark": "Plumber dispatched", "changedBy": { "name": "Admin" }, "createdAt": "..." }
    ]
  }
}
```

---

### PATCH `/complaints/:id/status`

Update the status of a complaint. Appends a history record and sends an email to the resident.

**Access:** Admin only

**Request body:**
```json
{
  "status": "IN_PROGRESS",
  "remark": "Plumber has been dispatched."
}
```

**Validation:**
- `status` — required, must be a valid forward transition from current status
- `remark` — optional

**Success `200`:**
```json
{
  "message": "Status updated successfully",
  "complaint": { "id": "...", "status": "IN_PROGRESS", ... }
}
```

**Error `400`:** Invalid status transition (e.g. attempting to move from `RESOLVED`).

---

## Notices

### GET `/notices`

List all notices. Pinned notices appear first.

**Access:** Authenticated

**Success `200`:**
```json
{
  "notices": [
    { "id": "...", "title": "...", "content": "...", "isPinned": true, "createdAt": "...", "author": { "name": "Admin" } }
  ]
}
```

---

### POST `/notices`

Create a new notice. Sends an email to all residents.

**Access:** Admin only

**Request body:**
```json
{
  "title": "Water Supply Shutdown",
  "content": "Water supply will be interrupted on 15th July from 9 AM to 1 PM for maintenance."
}
```

**Success `201`:**
```json
{
  "message": "Notice published successfully",
  "notice": { "id": "...", "title": "...", ... }
}
```

---

### PATCH `/notices/:id`

Edit an existing notice.

**Access:** Admin only

**Request body:**
```json
{
  "title": "Updated title",
  "content": "Updated content"
}
```

**Success `200`:**
```json
{ "message": "Notice updated successfully", "notice": { ... } }
```

---

### PATCH `/notices/:id/pin`

Toggle the `isPinned` flag on a notice.

**Access:** Admin only

**Success `200`:**
```json
{ "message": "Notice pinned", "notice": { "isPinned": true, ... } }
```

---

### DELETE `/notices/:id`

Delete a notice permanently.

**Access:** Admin only

**Success `200`:**
```json
{ "message": "Notice deleted successfully" }
```

---

## Dashboard

### GET `/dashboard`

Return role-scoped statistics. The response shape differs by role.

**Access:** Authenticated

**Resident response `200`:**
```json
{
  "totalComplaints": 12,
  "byStatus": { "OPEN": 3, "IN_PROGRESS": 5, "RESOLVED": 4 },
  "overdueCount": 2
}
```

**Admin response `200`:**
```json
{
  "totalComplaints": 120,
  "byStatus": { "OPEN": 30, "IN_PROGRESS": 45, "RESOLVED": 45 },
  "byCategory": {
    "PLUMBING": 20, "ELECTRICAL": 15, "CLEANING": 18,
    "SECURITY": 10, "LIFT": 22, "PARKING": 15, "OTHER": 20
  },
  "overdueCount": 12
}
```

---

## System

### GET `/api/health`

Health check endpoint.

**Access:** Public

**Response `200`:**
```json
{ "status": "ok", "timestamp": "2026-07-09T14:00:00.000Z" }
```

---

## Error Responses

All errors follow this shape:

```json
{ "message": "Human-readable error message" }
```

Validation errors include an `errors` array:

```json
{
  "message": "Validation failed",
  "errors": ["Email is required", "Password must be at least 8 characters"]
}
```

### HTTP Status Codes

| Code | Meaning |
|---|---|
| `200` | Success |
| `201` | Resource created |
| `400` | Bad request / validation error |
| `401` | Unauthenticated |
| `403` | Forbidden (insufficient role) |
| `404` | Resource not found |
| `500` | Internal server error |
