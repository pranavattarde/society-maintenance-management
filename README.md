# Society Maintenance Management System

A web-based platform designed to coordinate maintenance requests and community announcements within a residential building complex. The system enables residents to submit complaints, check for duplicate issues, and upload attachments, while providing administrators with a central management dashboard, audit trails, and pinned community notices.

## Live Demo

- **Web Application:** [https://societymaintenance.pancred.space](https://societymaintenance.pancred.space)

## Features

### Authentication
- Role-based access control separating Residents from Administrators.
- Secure session management using JSON Web Tokens (JWT) and cookies.

### Complaint Management
- Multi-step status transitions (`OPEN` → `IN_PROGRESS` → `RESOLVED` / `UNRESOLVED`) with mandatory action remarks.
- Image uploads for visual proof of maintenance issues.
- Detailed audit logs capturing every status update, time, and admin remark.

### Admin Dashboard
- Consolidated operations dashboard displaying status metrics and SLA tracking for overdue complaints.
- User directory console for managing user accounts and roles.

### AI Features
- Real-time complaint suggestions (title, category, priority, and polished description) to streamline submission.
- Semantic duplicate detection to flag matching open complaints and reduce backlog clutter.
- Natural language search query parsing into structural query filters.
- Scheduled operational insights compiled directly from recent complaint logs.
- AI-assisted announcement formatting for bulletin board notices.

### Notifications
- Automatic email updates dispatched to residents when their submitted complaints change status.
- Pinned and broadcasted critical notice announcements.

### Deployment
- Containerized configuration for local orchestration and testing.
- Single-page application router rewrites optimized for production hosting.

## Tech Stack

- **Frontend:** React, Vite, React Router, Vanilla CSS
- **Backend:** Node.js, Express
- **Database:** PostgreSQL
- **AI:** Groq API (Llama models)
- **Cloud:** Cloudinary (Asset Hosting), Resend (Transactional Email)
- **Deployment:** Vercel (Frontend), Render (Backend), Neon (Serverless Database)
- **Containerization:** Docker, Docker Compose

## Screenshots

1. **Resident Dashboard**
   ![Resident Dashboard](https://placehold.co/800x450?text=Resident+Dashboard)

2. **Create Complaint with AI Assistant**
   ![Create Complaint with AI Assistant](https://placehold.co/800x450?text=Create+Complaint+with+AI+Assistant)

3. **Admin Dashboard**
   ![Admin Dashboard](https://placehold.co/800x450?text=Admin+Dashboard)

4. **Complaint Management & Detail View**
   ![Complaint Detail](https://placehold.co/800x450?text=Complaint+Management+/+Complaint+Detail)

5. **Notice Board & User Management**
   ![Notice Board & User Management](https://placehold.co/800x450?text=Notice+Board+/+User+Management)

## Demo Video

- **Walkthrough Demonstration:** [Demo Video Placeholder](https://placehold.co/800x450?text=Demo+Video+Placeholder)

## Project Architecture

```mermaid
graph TD
    React[React Frontend]
    Express[Express Backend]
    Prisma[Prisma ORM]
    PostgreSQL[(PostgreSQL)]
    Cloudinary[Cloudinary]
    Groq[Groq LLM]
    Resend[Resend]

    React --> Express
    Express --> Prisma
    Prisma --> PostgreSQL
    Express --> Cloudinary
    Express --> Groq
    Express --> Resend
```

## AI Features

### Complaint Assistant
Suggests a concise title, category, priority level, and refined description based on free-text user descriptions.

### Duplicate Detection
Compares incoming complaints against the database's recent open tickets using semantic search to prevent duplicate entries.

### Natural Language Search
Parses free-text search queries (e.g., "high priority plumbing leaks in Tower A") into database filter parameters.

### Operations Insights
Generates periodic action points and trend summaries for admins based on recent unresolved tickets.

### AI Notice Generator
Drafts and formats professional announcement content based on admin prompts.

## Local Setup

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/society-maintenance-management.git
cd society-maintenance-management
```

### 2. Install Dependencies
```bash
# Install backend dependencies
cd server && npm install

# Install frontend dependencies
cd ../client && npm install
```

### 3. Environment Variables
Create a `.env` file in the `server` directory:
```env
PORT=6000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/society_db"
JWT_SECRET="your-jwt-secret-key"
JWT_EXPIRES_IN=7d
CLIENT_URL="http://localhost:5173"
CLOUDINARY_CLOUD_NAME="your-cloudinary-name"
CLOUDINARY_API_KEY="your-cloudinary-key"
CLOUDINARY_API_SECRET="your-cloudinary-secret"
RESEND_API_KEY="your-resend-key"
FROM_EMAIL="noreply@yourdomain.com"
GROQ_API_KEY="your-groq-key"
```

Create a `.env` file in the `client` directory:
```env
VITE_API_URL="http://localhost:6000/api"
```

### 4. Database Initialization
```bash
cd ../server
npx prisma db push
npm run db:seed
```

### 5. Start Development Servers
```bash
# Start backend (from server directory)
npm run dev

# Start frontend (from client directory in a new terminal)
cd ../client && npm run dev
```

## Deployment

- **Frontend:** Deployed on **Vercel** with custom routing definitions.
- **Backend:** Deployed on **Render** linked to continuous deployment pipelines.
- **Database:** Serverless PostgreSQL hosted on **Neon**.

## Testing

Run unit and integration tests from the `server` directory:
```bash
cd server
npm run test
```
All external network dependencies (Groq, Resend, Cloudinary) and database actions are mocked, allowing tests to run completely offline.

## Folder Structure

```
society-maintenance-management/
├── client/
│   ├── public/         # Static assets (Favicons, logos)
│   ├── src/
│   │   ├── api/        # Fetch wrappers
│   │   ├── components/ # Shared UI elements
│   │   ├── context/    # Auth state
│   │   └── pages/      # Route templates
│   └── Vite config
└── server/
    ├── prisma/         # Schema and seeds
    ├── src/
    │   ├── config/     # Database and SDK startup
    │   ├── routes/     # Route endpoints
    │   ├── services/   # Business logic and integrations
    │   └── validations/# Schema structures
    └── server.js
```

## License

MIT
