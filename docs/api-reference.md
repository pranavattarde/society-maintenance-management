# REST API Reference

The backend REST API is hosted at `/api`. All endpoints except auth routes require a valid JWT token passed in the `Authorization: Bearer <token>` header.

---

## 1. Authentication Endpoints

### Register User
`POST /api/auth/register`
- **Body:**
  ```json
  {
    "name": "Priya Sharma",
    "email": "priya@society.com",
    "password": "securepassword123",
    "role": "RESIDENT",
    "flatNumber": "A-101",
    "phone": "9876543210"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": "cuid12345",
      "name": "Priya Sharma",
      "email": "priya@society.com",
      "role": "RESIDENT",
      "flatNumber": "A-101"
    }
  }
  ```

### Log In
`POST /api/auth/login`
- **Body:**
  ```json
  {
    "email": "priya@society.com",
    "password": "securepassword123"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": "cuid12345",
      "name": "Priya Sharma",
      "email": "priya@society.com",
      "role": "RESIDENT",
      "flatNumber": "A-101"
    }
  }
  ```

---

## 2. Reported Issues Endpoints

### List Issues
`GET /api/complaints`
- **Query Parameters:** `status` (Enum), `category` (Enum), `date` (YYYY-MM-DD)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "complaints": [
      {
        "id": "clt123456",
        "title": "Water dripping from bathroom ceiling",
        "category": "PLUMBING",
        "priority": "MEDIUM",
        "status": "OPEN",
        "createdAt": "2026-07-12T12:00:00Z"
      }
    ]
  }
  ```

### Submit Issue
`POST /api/complaints`
- **Headers:** `Content-Type: multipart/form-data`
- **Multipart Fields:**
  - `title`: String (min 3 chars)
  - `description`: String (min 10 chars)
  - `category`: Enum (e.g. `PLUMBING`)
  - `priority`: Enum (e.g. `MEDIUM`)
  - `photo`: File (optional, max 5MB image)
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "complaint": {
      "id": "clt987654",
      "title": "Water dripping...",
      "photoUrl": "https://res.cloudinary.com/..."
    }
  }
  ```

---

## 3. Bulletin Board Endpoints

### Publish Notice
`POST /api/notices`
- **Body:**
  ```json
  {
    "title": "Water tank maintenance Wednesday",
    "content": "Supply suspended from 9 AM to 5 PM."
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "notice": {
      "id": "not123456",
      "title": "Water tank...",
      "isPinned": false
    }
  }
  ```

### Toggle Pin
`PATCH /api/notices/:id/pin`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "notice": {
      "id": "not123456",
      "isPinned": true
    }
  }
  ```
