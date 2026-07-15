# System Architecture — Society Maintenance Management

This document details the software architecture, modular layering, and structural interfaces of the Society Maintenance Management application.

---

## 1. High-Level Component Layout

The system follows a stateless client-server architecture model. 

```
┌─────────────────────────────────┐
│       Vite React SPA (UI)       │
└────────────────┬────────────────┘
                 │ HTTPS (Bearer JWT Token)
                 ▼
┌─────────────────────────────────┐
│     Node.js Express API Server  │
└──────┬────────┬────────┬────────┘
       │        │        │
       │        │        └──────────────┐
       ▼ (ORM)  ▼ (SDK)                 ▼ (HTTP)
┌──────────┐ ┌──────────┐          ┌──────────┐
│PostgreSQL│ │Cloudinary│          │ Groq AI  │
└──────────┘ └──────────┘          └──────────┘
```

### Component Details
- **Client Workspace (Vite + React SPA):** Served by Nginx inside a container or hosted on edge networks (Vercel). Manages routing in client memory and triggers on-demand AI analysis or duplicate checks during submissions.
- **Server API (Node.js + Express):** Stateless endpoint gateway. Authenticates sessions via JWT, validates incoming bodies, and handles queries to database services.
- **Database Layer (PostgreSQL):** Stores application tables. Schema structural integrity is maintained via foreign keys.
- **AI Service (Groq API):** Processes classification and duplicate search requests using Llama models.
- **Media Assets (Cloudinary):** Stores binary files (avatars, ticket images) to preserve stateless server operation.

---

## 2. Server Architectural Layers

The backend codebase follows a Controller-Service-Repository structural pattern:

```
Request ──► Routing ──► JWT / Validate ──► Controller ──► Service ──► Prisma (DB)
```

1. **Routing Layer (`server/src/routes`):** Exposes API paths, binds JWT auth guards, and assigns validation middleware.
2. **Validation Middleware (`server/src/middleware`):** Validates incoming payload shapes, returning a `400 Bad Request` instantly if validations fail, avoiding database hits.
3. **Controller Layer (`server/src/controllers`):** Processes incoming requests, extracts headers and query properties, and coordinates response envelopes.
4. **Service Layer (`server/src/services`):** Implements business logic (coordinate transactions, configure Groq model fallback loops, construct email parameters).
5. **Database Configuration (`server/src/config`):** Instantiates the Prisma Client pool to connect with PostgreSQL.

---

## 3. Key Design Patterns

### Stateless Sessions
The Express API stores no session state. Instead, authentication utilizes cryptographic JSON Web Tokens (JWT) signed by a server-side secret key. The React client passes this token inside the `Authorization: Bearer <token>` header of REST requests. This allows the backend API to scale horizontally behind a load balancer without session data synchronization overhead.

### Third-Party File Stream Pipeline
To maintain ephemeral container operations, the Express backend does not save files to disk. Instead, files uploaded as multipart forms are piped directly as a memory stream buffer to Cloudinary using the Cloudinary SDK, returning a hosted URL that is written to PostgreSQL.
