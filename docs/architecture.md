# System Architecture & Design Document

This document outlines the software architecture, design patterns, and interface boundaries for the Grand Arch Residences system.

---

## 1. High-Level Component Layout

The platform uses a decoupled client-server architecture. All operations are stateless, using a relational database layer and third-party media and messaging integrations.

```
                  ┌────────────────────────┐
                  │   Vite React SPA (UI)  │
                  └───────────┬────────────┘
                              │ HTTPS (JWT Auth)
                              ▼
                  ┌────────────────────────┐
                  │    Express REST API    │
                  └────┬──────┬──────┬─────┘
                       │      │      │
        ┌──────────────┘      │      └──────────────┐
        ▼ (Prisma ORM)        ▼ (SDK/Fetch)         ▼ (HTTP API)
 ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
 │  PostgreSQL  │     │  Cloudinary  │     │   Groq AI    │
 └──────────────┘     └──────────────┘     └──────────────┘
```

### Component Details
- **Client Workspace (Vite + React SPA):** Served by Nginx in a container or static edge networks (Vercel). Handles all visual renders, AI debounce triggers, and pre-submission checks.
- **Server API (Node.js + Express):** Stateless runtime exposing RESTful endpoints. Implements JWT filters, body validators, and acts as the gatekeeper for DB access.
- **Database (PostgreSQL):** Relational store containing tables for users, complaints, audit history logs, and notices. Managed via Prisma.
- **AI Integrations (Groq API):** Evaluates description content on the fly. Returns structural JSON output or lists duplicate warnings using fallback models.
- **Media Uploads (Cloudinary):** Files uploaded as multipart/form-data are streamed to Cloudinary, storing only the secure link in the DB.

---

## 2. Server Architectural Layers

The backend follows a strict **Controller-Service-Repository** pattern:

1. **Routing Layer (`server/src/routes`):** Declares endpoints, maps route patterns, and binds JWT middlewares and body validation constraints.
2. **Validation Middleware (`server/src/middleware/validate`):** Uses validator scripts to intercept requests. Rejects invalid forms (400 Bad Request) before hitting controllers.
3. **Controller Layer (`server/src/controllers`):** Extracts payloads, manages HTTP request/response loops, and delegates actions to services.
4. **Service Layer (`server/src/services`):** Contains the business logic. Manages external integration configurations (Groq, Resend) and model fallback logic.
5. **Database ORM (`server/src/config/db`):** Interacts with PostgreSQL using Prisma Client queries.

---

## 3. Design Decisions & Trade-offs

### Stateless Authentication (JWT)
- **Decision:** JWT token stored in memory on the client, passed via `Authorization: Bearer <token>` headers.
- **Trade-off:** Fast, stateless, and horizontally scalable. However, instant token revocation requires blacklisting (not implemented, solved by setting short token expirations).

### Decoupled client-side AI analysis
- **Decision:** Description typing triggers an AI check only after a 1.5s debounce delay and a 30-character threshold.
- **Trade-off:** Reduces API rate limiting costs on Groq while maintaining a responsive autocomplete UI.

### pre-submission duplicate warning
- **Decision:** Submissions trigger a database query for recent unresolved issues and uses Groq to perform semantic similarity matches.
- **Trade-off:** A pure database search might miss synonyms (e.g. "elevator broken" vs "lift malfunctioning"). Using Groq matches semantics but adds minor overhead (~1.5s latency). The check is non-blocking to prevent UI friction.
