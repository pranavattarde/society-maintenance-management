# REST API Reference — Society Maintenance Management

All endpoints are prefix-registered under `/api`. Protected routes require a valid JSON Web Token passed inside the `Authorization: Bearer <token>` header.

---

## 1. Authentication Endpoints

### Register User
`POST /api/auth/register`
Creates a user account, defaulting their role to `RESIDENT`. Admins cannot be registered.
- **Body Payload:**
  ```json
  {
    "name": "Priya Sharma",
    "email": "priya@society.com",
    "password": "securepassword123",
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
- **Body Payload:**
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
      "flatNumber": "A-101",
      "avatarUrl": "https://res.cloudinary.com/..."
    }
  }
  ```

### Current User Profile
`GET /api/auth/me`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "user": {
      "id": "cuid12345",
      "name": "Priya Sharma",
      "email": "priya@society.com",
      "role": "RESIDENT",
      "flatNumber": "A-101",
      "phone": "9876543210",
      "avatarUrl": "https://res.cloudinary.com/..."
    }
  }
  ```

---

## 2. Directory & Profile Endpoints

### List Users
`GET /api/users` (Admin Only)
Retrieve list of registered users.
- **Query Parameters (Optional):** `search` (searches name, email, or flat number)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "users": [
      {
        "id": "cuid123",
        "name": "Aravind Nair",
        "email": "aravind@society.com",
        "role": "RESIDENT",
        "flatNumber": "B-304",
        "phone": "9998887770",
        "createdAt": "2026-07-12T12:00:00Z"
      }
    ]
  }
  ```

### Promote/Demote User Role
`PATCH /api/users/:id/role` (Admin Only)
- **Body Payload:**
  ```json
  {
    "role": "ADMIN" // or "RESIDENT"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "user": {
      "id": "cuid123",
      "name": "Aravind Nair",
      "role": "ADMIN"
    }
  }
  ```
- **Error (400 Bad Request):** If admin tries to demote themselves.

### Update Profile
`PATCH /api/users/profile`
Updates profile details and optionally uploads a profile avatar.
- **Headers:** `Content-Type: multipart/form-data`
- **Multipart Fields:**
  - `name`: String (min 2 chars, optional)
  - `phone`: String (optional)
  - `flatNumber`: String (optional)
  - `avatar`: File (optional image, max 2MB)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "user": {
      "id": "cuid123",
      "name": "Aravind Nair",
      "phone": "9998887770",
      "flatNumber": "B-304",
      "avatarUrl": "https://res.cloudinary.com/..."
    }
  }
  ```

---

## 3. Complaint Tickets Endpoints

### List Complaints
`GET /api/complaints`
Retrieve complaints list.
- **Query Parameters (Optional):** `status` (OPEN, IN_PROGRESS, RESOLVED), `category` (PLUMBING, etc.), `priority` (LOW, MEDIUM, HIGH), `search` (text), `date` (YYYY-MM-DD)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "complaints": [
      {
        "id": "clt12345",
        "title": "Water leakage in flat",
        "category": "PLUMBING",
        "priority": "HIGH",
        "status": "OPEN",
        "createdAt": "2026-07-12T12:00:00Z"
      }
    ]
  }
  ```

### Submit Complaint
`POST /api/complaints`
- **Headers:** `Content-Type: multipart/form-data`
- **Multipart Fields:**
  - `title`: String (min 3 chars)
  - `description`: String (min 10 chars)
  - `category`: Category Enum
  - `priority`: Priority Enum
  - `photo`: File (optional attachment, max 5MB)
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "complaint": {
      "id": "clt98765",
      "title": "Water leakage in flat",
      "photoUrl": "https://res.cloudinary.com/..."
    }
  }
  ```

### Fetch Complaint Detail
`GET /api/complaints/:id`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "complaint": {
      "id": "clt12345",
      "title": "Water leakage in flat",
      "description": "Pipe dripping water behind flush tank",
      "category": "PLUMBING",
      "priority": "HIGH",
      "status": "OPEN",
      "photoUrl": null,
      "resident": {
        "name": "Priya Sharma",
        "flatNumber": "A-101"
      },
      "history": [
        {
          "id": "hist999",
          "fromStatus": "OPEN",
          "toStatus": "IN_PROGRESS",
          "remark": "Plumbing contractor assigned",
          "createdAt": "2026-07-12T15:00:00Z",
          "changedBy": {
            "name": "Operations Admin"
          }
        }
      ]
    }
  }
  ```

### Transition Ticket Status
`PATCH /api/complaints/:id/status` (Admin Only)
- **Body Payload:**
  ```json
  {
    "status": "IN_PROGRESS",
    "remark": "Plumber scheduled for afternoon visit"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "complaint": {
      "id": "clt12345",
      "status": "IN_PROGRESS"
    }
  }
  ```

---

## 4. Bulletin Board Endpoints

### List Notices
`GET /api/notices`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "notices": [
      {
        "id": "not123",
        "title": "Annual Generator Servicing",
        "content": "Power cuts expected between 2 PM and 4 PM",
        "isPinned": true,
        "createdAt": "2026-07-12T09:00:00Z"
      }
    ]
  }
  ```

### Publish Notice
`POST /api/notices` (Admin Only)
- **Body Payload:**
  ```json
  {
    "title": "Annual Generator Servicing",
    "content": "Power cuts expected between 2 PM and 4 PM"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "notice": {
      "id": "not123",
      "title": "Annual Generator Servicing",
      "isPinned": false
    }
  }
  ```

### Toggle Pin Status
`PATCH /api/notices/:id/pin` (Admin Only)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "notice": {
      "id": "not123",
      "isPinned": true
    }
  }
  ```

---

## 5. AI Integration Endpoints

### Auto-Analyze Text
`POST /api/ai/analyze-complaint`
- **Body Payload:**
  ```json
  {
    "text": "Water leakage in bathroom pipe dripping behind flush tank"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "title": "Water leakage in bathroom flush tank",
      "category": "PLUMBING",
      "priority": "HIGH",
      "reasoning": "Leakage involves water waste and requires fast resolution.",
      "confidence": "HIGH",
      "summary": "Resident reports water dripping from a pipe behind the bathroom flush tank."
    }
  }
  ```

### Check Semantic Duplicates
`POST /api/ai/detect-duplicates`
- **Body Payload:**
  ```json
  {
    "text": "Elevator in Tower B stopped working"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "complaintId": "clt555",
        "title": "Tower B Lift Outage",
        "category": "OTHER",
        "status": "OPEN",
        "priority": "HIGH",
        "similarity": 85,
        "description": "Lift in Tower B has stopped on floor 4.",
        "residentId": "cuid999",
        "createdAt": "2026-07-14T10:00:00Z"
      }
    ]
  }
  ```
