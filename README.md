# Society Maintenance Management

A full-stack application designed to coordinate maintenance requests and community notices inside a residential building complex. Residents can file issues, upload images, and check for similar issues pre-submission. Administrators can track, categorize, and transition issue tickets through a dashboard with a chronological log of changes.

## Deployed Applications

- **Frontend Application:** [https://society-maintenance-management.vercel.app](https://society-maintenance-management.vercel.app)
- **Backend API Service:** [https://society-maintenance-backend-i9g2.onrender.com](https://society-maintenance-backend-i9g2.onrender.com)

---

## 1. Project Overview & Problem Statement

### Problem Statement
Managing building maintenance via paper forms, group chats, or unindexed spreadsheets introduces operational overhead:
1. **No Structured Tracking:** Tickets lack categories, priority tags, and dedicated assignees.
2. **Duplicate Submissions:** Multiple residents file separate tickets for shared infrastructure issues (e.g., lift failures, corridor lighting).
3. **Lack of Transparency:** Residents cannot monitor ticket progress, and admins lack operational logs.

### Solution
This application addresses these issues through:
- A role-based authentication flow separating residents from facility admins.
- A central board with searchable, filterable complaint tickets.
- An **AI Assistant** using Llama-3.1 on Groq to suggest titles, categories, and priority levels.
- A **Semantic Duplicate Detector** that flags unresolved identical issues pre-submission.
- An append-only **Audit History Log** tracking status updates (`OPEN` → `IN_PROGRESS` → `RESOLVED`) and remarks.
- A **Bulletin Board** for pinned announcements.

---

## 2. Technology Stack

- **Frontend:** React 19, React Router 7, Vite 6, Vanilla CSS.
- **Backend:** Node.js 20, Express 4.
- **Database:** PostgreSQL 16 (hosted on Neon in production).
- **ORM:** Prisma 6.
- **Authentication:** JSON Web Tokens (JWT) and bcrypt password hashing.
- **File Storage:** Cloudinary (for resident profile pictures and ticket attachments).
- **Email Service:** Resend (notifies residents when ticket status changes).
- **AI Service:** Groq API (on-demand text analysis and semantic similarity checking).
- **Containerization:** Docker & Docker Compose.

---

## 3. Project Folder Structure

```
society-maintenance-management/
├── client/                     # React Frontend Single Page Application
│   ├── src/
│   │   ├── api/                # REST API request handlers using native fetch
│   │   ├── components/         # Reusable layouts, modals, and badges
│   │   ├── context/            # AuthContext managing local session state
│   │   ├── pages/              # Dashboards, boards, notice creation, settings
│   │   ├── styles/             # CSS variable design system
│   │   └── utils/              # Helper utilities and enum mappings
│   ├── Dockerfile              # Container runner utilizing Nginx static server
│   ├── nginx.conf              # SPA URL routing rewrite directives
│   └── vercel.json             # Deployment routing rules for Vercel
├── server/                     # Express REST API Backend Workspace
│   ├── prisma/                 # Database schema definitions and seed data
│   │   ├── schema.prisma       # Database design
│   │   └── seed.js             # Seeding script containing realistic mock tickets
│   ├── src/
│   │   ├── config/             # Cloudinary, Prisma, and database bootstrap config
│   │   ├── controllers/        # Express request controllers
│   │   ├── middleware/         # Auth verification and input validation middlewares
│   │   ├── routes/             # REST route registers
│   │   ├── services/           # Service integrations (Groq fallback, Resend, Cloudinary)
│   │   ├── validations/        # Request parameter validator schemas
│   │   └── utils/              # Constants and API response helpers
│   ├── Dockerfile              # Multi-stage production Node.js builder
│   └── server.js               # Express application entry point
├── docs/                       # High-level architecture and guide references
├── docker-compose.yml          # Container configuration for local stack orchestration
└── SYSTEM_DESIGN.md            # System architecture design decisions
```

---

## 4. Key Features

### Resident Features
- **File Complaint:** Submit complaints with title, description, category, priority, and an optional photo attachment.
- **Interactive AI Helper:** Click **✨ Analyze with AI** to suggest structured titles, categories, and priority values from the description.
- **My Profile Settings:** Update name, contact phone number, flat unit assignment, and upload a profile picture.
- **Issue Tracking:** Monitor progress via a chronological history log on the ticket detail view.
- **View Bulletins:** Browse announcements published by the management team.

### Admin Features
- **Operations Dashboard:** Track metrics (Total open, unresolved, resolved, and SLA overdue tickets).
- **Triage Incident Queue:** Review list of all complaints across the society, filterable by category, urgency, status, and reporter date.
- **Notice Management:** Publish, edit, delete, and pin announcements on the community bulletin board.
- **User Directory Console:** Promote residents to administrators or demote administrator roles (self-demotion is restricted).
- **Update Ticket Status:** Transition tickets and append notes/remarks to the history audit trail.

### AI Features
- **On-Demand Suggestions:** Processes issue descriptions using the Groq API to auto-fill parameters.
- **Confidence Scores:** Renders visual confidence rankings (High, Medium, Low) for the suggestions.
- **Semantic Similarity Detection:** Runs once during ticket creation to check the title and description against the last 30 unresolved issues from the last 60 days. Flags similar tickets without blocking submission, using Llama-3.1 on Groq.
- **Duplicate Summaries:** Offers a privacy-preserving modal detail sheet for matched duplicate tickets, showing category, priority, status, and AI descriptions without exposing the reporter's flat number or identity.

---

## 5. API Endpoint Summary

All protected endpoints require passing a valid JWT token in the `Authorization: Bearer <token>` header.

### Authentication
- `POST /api/auth/register` — Register a new account (forced to the `RESIDENT` role).
- `POST /api/auth/login` — Log in and receive a stateless JWT token.
- `GET /api/auth/me` — Retrieve the currently logged-in user profile.

### Users & Directory (Settings)
- `GET /api/users` — List all registered users (Admin only).
- `PATCH /api/users/:id/role` — Update a user's role (Admin only).
- `PATCH /api/users/profile` — Update the logged-in user's profile information and avatar.

### Complaint Tickets
- `GET /api/complaints` — Retrieve complaints list based on filter and page/limit query parameters.
- `POST /api/complaints` — Submit a ticket (multipart/form-data with photo upload).
- `GET /api/complaints/:id` — Retrieve details and chronological history log of a ticket.
- `PATCH /api/complaints/:id/status` — Transition ticket status, override priority, and append remarks (Admin only).

### Bulletin Notices
- `GET /api/notices` — Retrieve notices list based on page/limit queries (pinned notices appear first).
- `POST /api/notices` — Publish a new bulletin notice (Admin only).
- `PATCH /api/notices/:id` — Edit an existing bulletin notice (Admin only).
- `DELETE /api/notices/:id` — Delete a notice (Admin only).
- `PATCH /api/notices/:id/pin` — Toggle the pinned status of a notice (Admin only).

### AI Integration
- `POST /api/ai/analyze-complaint` — Process description text and return suggestions.
- `POST /api/ai/detect-duplicates` — Semantically compare description text against recent open tickets.

---

## 6. Database Overview

```mermaid
erDiagram
    User ||--o{ Complaint : "raises"
    User ||--o{ ComplaintHistory : "updates"
    User ||--o{ Notice : "creates"
    Complaint ||--o{ ComplaintHistory : "contains"

    User {
        string id PK
        string name
        string email UK
        string password
        enum role
        string flatNumber
        string phone
        string avatarUrl
        datetime createdAt
    }

    Complaint {
        string id PK
        string title
        string description
        enum category
        enum priority
        enum status
        string photoUrl
        string residentId FK
        datetime createdAt
    }

    ComplaintHistory {
        string id PK
        string complaintId FK
        string changedById FK
        enum fromStatus
        enum toStatus
        string remark
        datetime createdAt
    }

    Notice {
        string id PK
        string title
        string content
        boolean isPinned
        string authorId FK
        datetime createdAt
    }
```

---

## 7. Environment Variables

Create a `.env` file in both `client` and `server` folders using the templates below.

### Backend Configurations (`server/.env`)
```env
PORT=6000
DATABASE_URL="postgresql://user:password@localhost:5432/society_maintenance"
JWT_SECRET="generate-a-secure-random-key"
JWT_EXPIRES_IN=7d
CLIENT_URL="http://localhost:3000"

# Third-party Integrations
CLOUDINARY_CLOUD_NAME="your-cloudinary-name"
CLOUDINARY_API_KEY="your-cloudinary-key"
CLOUDINARY_API_SECRET="your-cloudinary-secret"

RESEND_API_KEY="re_your_resend_api_key"
FROM_EMAIL="noreply@yourdomain.com"

GROQ_API_KEY="gsk_your_groq_api_key"
```

### Frontend Configurations (`client/.env`)
```env
VITE_API_URL="http://localhost:6000/api"
```

---

## 8. Quick Start & Local Setup

### Running with Docker Compose
To build and run the entire stack (PostgreSQL, Express backend, React client):
1. Configure your `.env` file in the root directory.
2. Run the orchestrator:
   ```bash
   docker compose up --build
   ```
3. The React application will be served at `http://localhost:3000`. The server runs at `http://localhost:6000`.

### Running Locally (Without Docker)

#### Prerequisites
- Node.js (v20.x)
- A running PostgreSQL instance

#### Setup Database and Server
1. Navigate to the server folder and install dependencies:
   ```bash
   cd server
   npm install
   ```
2. Run migrations to setup tables:
   ```bash
   npx prisma db push
   ```
3. Populate database with seed users and incident history logs:
   ```bash
   npm run db:seed
   ```
4. Start the backend developer API server:
   ```bash
   npm run dev
   ```

#### Setup Client Application
1. Open a new terminal window, navigate to the client folder, and install dependencies:
   ```bash
   cd client
   npm install
   ```
2. Start the Vite hot-reloading development server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:5173` in your browser.

#### Running Tests
Automated tests can be executed inside the `server` directory:
```bash
cd server
npm run test
```
All unit and integration tests utilize mocking stubs for third-party endpoints and database drivers, allowing verification checks to complete successfully without a live PostgreSQL engine or active internet connection.

---

## 9. Demo Logins

| Profile | Email | Password | Flat/Unit |
|---|---|---|---|
| **Admin (Operations)** | `admin@society.com` | `admin@123` | OFFICE-01 |
| **Admin (Committee)** | `admin2@society.com` | `admin@123` | OFFICE-02 |
| **Resident (Primary)** | `resident@society.com` | `resident@123` | A-101 |
| **Resident (Additional)**| `aravind@society.com` | `resident@123` | B-304 |

---

## 10. License

Licensed under the [MIT License](LICENSE).
