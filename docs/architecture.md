# System Architecture

## Overview

The Society Maintenance Tracker is a full-stack web application with a clear separation between a React frontend, an Express REST API backend, and a PostgreSQL relational database. The system supports two user roles: **Resident** and **Admin**.

```
┌─────────────────────────────────────────────────────────────┐
│                         Client (React)                      │
│   React Router → Pages → Components → API wrapper (fetch)  │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP (JSON)
                           │ Authorization: Bearer <JWT>
┌──────────────────────────▼──────────────────────────────────┐
│                     Express REST API                        │
│  Routes → Middleware → Controllers → Services → Prisma ORM  │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│               PostgreSQL (Neon in production)               │
│         Users │ Complaints │ ComplaintHistory │ Notices     │
└─────────────────────────────────────────────────────────────┘

External services:
  Cloudinary ← photo upload (multipart via Multer memory storage)
  Resend     ← transactional email (status updates, notices)
```

---

## Component Responsibilities

### Frontend (`client/`)

| Module | Responsibility |
|---|---|
| `src/api/index.js` | Single source for all HTTP calls. Wraps native `fetch`, attaches JWT, normalises errors. |
| `src/context/AuthContext.jsx` | JWT state management. Exposes `user`, `token`, `login()`, `logout()`. |
| `src/components/ProtectedRoute.jsx` | Redirects unauthenticated users to `/login`. Supports optional role guard. |
| `src/components/Layout.jsx` | Shared shell (Navbar + Outlet) for authenticated pages. |
| `src/pages/` | One file per route. Thin — delegates all data fetching to API module. |
| `src/utils/constants.js` | Frontend enum maps and labels. Kept in sync with backend constants. |
| `src/styles/variables.css` | CSS custom properties — the single source of truth for all design tokens. |

### Backend (`server/`)

| Module | Responsibility |
|---|---|
| `app.js` | Registers middleware and mounts route groups. No business logic. |
| `server.js` | Opens database connection and starts HTTP listener. |
| `src/middleware/authenticate.js` | Verifies JWT, attaches `req.user`. |
| `src/middleware/authorize.js` | Role guard factory — `authorize('ADMIN')`. |
| `src/middleware/validate.js` | Runs a validation function, returns `400` on failure. |
| `src/middleware/upload.js` | Multer memory storage with MIME whitelist. |
| `src/middleware/errorHandler.js` | Centralised error response — last middleware in chain. |
| `src/controllers/` | Parse request, call service, respond. Contain no business logic. |
| `src/services/` | All business logic lives here. Called only by controllers. |
| `src/validations/` | Pure functions: accept a data object, return `string[]` of errors. |
| `src/config/db.js` | Prisma client singleton — shared across all services. |
| `src/utils/ApiError.js` | Custom error class with `statusCode`. Thrown in services, caught by `errorHandler`. |
| `src/utils/constants.js` | ROLES, STATUS, PRIORITY, CATEGORY, OVERDUE_THRESHOLD_DAYS, ALLOWED_STATUS_TRANSITIONS. |

---

## Request Lifecycle

```
Request
  → authenticate (verify JWT)
  → authorize   (check role, if required)
  → validate    (check request body)
  → controller  (parse params, call service, send response)
  → service     (business logic, Prisma queries, external calls)
  → errorHandler (catches anything thrown with ApiError)
```

---

## Overdue Detection

Overdue is not computed by a scheduler. It is calculated **at query time** using a configurable threshold:

```js
const OVERDUE_THRESHOLD_DAYS = 7;  // server/src/utils/constants.js

const cutoff = new Date();
cutoff.setDate(cutoff.getDate() - OVERDUE_THRESHOLD_DAYS);

// A complaint is overdue if:
//   status is OPEN or IN_PROGRESS
//   AND createdAt is before the cutoff date
```

This approach is stateless, always consistent, and requires no external scheduler.

---

## Status Transition Rules

```
OPEN  ──→  IN_PROGRESS  ──→  RESOLVED
OPEN  ─────────────────────→ RESOLVED
```

`RESOLVED` is the terminal state. Transitions are enforced in `complaint.service.js` using `ALLOWED_STATUS_TRANSITIONS` from `constants.js`. Every valid transition appends an immutable record to `ComplaintHistory`.

---

## Security Model

| Concern | Implementation |
|---|---|
| Password storage | bcrypt, cost factor 12 |
| Token | JWT, 7-day expiry, signed with `JWT_SECRET` |
| Token transport | `Authorization: Bearer <token>` header |
| Route protection | `authenticate` middleware on all private routes |
| Role enforcement | `authorize(ROLES.ADMIN)` middleware on admin-only routes |
| File upload safety | Multer MIME whitelist: `image/jpeg`, `image/png`, `image/webp`, max 5 MB |
| Input validation | Validation functions run before every write operation |
| Secrets | All credentials loaded from `.env` via `dotenv` |

---

## Key Engineering Decisions

| Decision | Rationale |
|---|---|
| Native `fetch` over Axios | Eliminates a dependency with no functional gap at this scale |
| Plain JS validation over Zod | Zero-dependency, equally readable, sufficient for this scope |
| No `ApiResponse` wrapper | `res.status(X).json({...})` is already the Express standard |
| Overdue via query threshold over node-cron | Stateless, consistent, configurable without a scheduler |
| `ComplaintHistory` as append-only table | Correct relational model for an immutable audit trail |
| Prisma client singleton in `config/db.js` | One connection pool shared across all services |
| CSS custom properties + BEM | Theming without a library; evaluator-readable |
