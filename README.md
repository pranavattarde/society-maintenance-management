# Society Maintenance Tracker

A production-quality, full-stack Society Maintenance Management System that enables residents to raise maintenance complaints and administrators to manage, track, and resolve them efficiently.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router 7, Vite 6 |
| Backend | Node.js 20, Express 4 |
| Database | PostgreSQL 16 (Neon in production) |
| ORM | Prisma 6 |
| Authentication | JWT + bcrypt |
| File Storage | Cloudinary |
| Email | Resend |
| Deployment | Vercel (frontend), Render (backend) |
| Containerization | Docker + Docker Compose |

## Features

- 🔐 **Role-based authentication** — Resident and Admin roles with JWT
- 📝 **Complaint management** — Submit, track, and resolve complaints with photo upload
- 🔄 **Status lifecycle** — Open → In Progress → Resolved with full audit trail
- 📋 **Complaint history** — Every status change is recorded and traceable
- 🏷️ **Category & priority management** — Organize complaints by type and urgency
- 📌 **Notice board** — Pinned and regular announcements from administrators
- 📊 **Role-scoped dashboard** — Statistics tailored to resident or admin view
- ⚠️ **Overdue detection** — Automatically flags complaints past the resolution threshold
- 📧 **Email notifications** — Status updates and new notices delivered via Resend
- 🔍 **Filtering** — Filter complaints by status, category, and priority
- 📱 **Responsive design** — Mobile-friendly layout throughout

## Project Structure

```
society-maintenance-management/
├── client/           # React + Vite frontend
├── server/           # Node.js + Express backend
│   └── prisma/       # Database schema and seed
├── docs/             # Engineering documentation
├── docker-compose.yml
├── .env.example
└── README.md
```

See [`docs/architecture.md`](docs/architecture.md) for the full system design.

## Getting Started

### Prerequisites

- Node.js 20+
- Docker and Docker Compose (for local PostgreSQL)
- A [Cloudinary](https://cloudinary.com) account
- A [Resend](https://resend.com) account

### 1. Clone and install

```bash
git clone https://github.com/your-username/society-maintenance-management.git
cd society-maintenance-management

# Install backend dependencies
cd server && npm install

# Install frontend dependencies
cd ../client && npm install
```

### 2. Configure environment

```bash
# From project root
cp .env.example .env
```

Open `.env` and fill in the required values. See [`.env.example`](.env.example) for descriptions of every variable.

### 3. Start the database

```bash
# From project root
docker compose up -d
```

### 4. Set up the database schema

```bash
cd server

# Push schema to the database
npm run db:push

# Seed with default admin and resident accounts
npm run db:seed
```

**Default seed accounts:**

| Role | Email | Password |
|---|---|---|
| Admin | `admin@society.com` | `admin@123` |
| Resident | `resident@society.com` | `resident@123` |

> Change these immediately in any environment beyond local development.

### 5. Start development servers

```bash
# Terminal 1 — Backend (http://localhost:5000)
cd server && npm run dev

# Terminal 2 — Frontend (http://localhost:5173)
cd client && npm run dev
```

The frontend proxies API requests to the backend via `VITE_API_URL`.

## API

The backend exposes a RESTful API under `/api`. See [`docs/api.md`](docs/api.md) for the complete endpoint reference with request and response examples.

**Health check:** `GET /api/health`

## Documentation

| Document | Description |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | System design, component responsibilities, design decisions |
| [`docs/system-design.md`](docs/system-design.md) | High-level system design overview (modular, stateless design) |
| [`docs/api.md`](docs/api.md) | Complete endpoint reference with examples |
| [`docs/database.md`](docs/database.md) | ERD, model descriptions, enum values |
| [`docs/deployment.md`](docs/deployment.md) | Step-by-step production deployment guide |

## Deployment

| Layer | Platform | Guide |
|---|---|---|
| Frontend | Vercel | [`docs/deployment.md`](docs/deployment.md#frontend--vercel) |
| Backend | Render | [`docs/deployment.md`](docs/deployment.md#backend--render) |
| Database | Neon PostgreSQL | [`docs/deployment.md`](docs/deployment.md#database--neon) |

## License

MIT
