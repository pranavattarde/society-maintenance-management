# System Design Document — Society Maintenance Management

This document details the requirements, design decisions, technology selections, and architectural trade-offs made in the implementation of the Society Maintenance Management system.

---

## 1. Requirements

### Functional Requirements
1. **Role-Based Workspaces:** Support distinct features for Residents (raise tickets, view bulletins, update profile) and Admins (triage incident queues, update ticket statuses, manage bulletins, edit user roles).
2. **AI-Assisted Ticketing:** Process unstructured ticket descriptions to suggest structured titles, categories, and priority metrics.
3. **Semantic Duplicate Check:** Warn residents of possible duplicate active complaints before they submit a ticket.
4. **Chronological Audit History:** Automatically maintain an append-only log of all status transitions (`OPEN` → `IN_PROGRESS` → `RESOLVED`) along with assignee notes.
5. **Bulletin Notice System:** Support publishing and pinning community announcements.

### Non-Functional Requirements
1. **Privacy-Safe Data Exposure:** Limit data shown on matching duplicates. Mask private resident fields (names, flat numbers) for tickets filed by other residents.
2. **stateless Scalability:** Keep the application server stateless to simplify horizontal scaling.
3. **Responsiveness:** Optimize layout reflows and minimize UI shift when the navigation sidebar collapses or viewports resize.

---

## 2. Component Architecture

The platform is structured as a decoupled client-server architecture:

```
┌─────────────────────────────────┐
│     Vite React SPA Client       │
└────────────────┬────────────────┘
                 │ HTTPS / REST (JWT in headers)
                 ▼
┌─────────────────────────────────┐
│    Node Express API Gateway     │
└────────┬───────┬────────┬───────┘
         │       │        │
         │       │        └──────────────┐
         ▼ (Prisma)      ▼ (SDK)        ▼ (HTTP REST)
┌────────────┐  ┌────────────┐  ┌────────────┐
│ PostgreSQL │  │ Cloudinary │  │  Groq API  │
└────────────┘  └────────────┘  └────────────┘
```

- **React SPA:** Handles all rendering and routing in client-side memory.
- **Express API Gateway:** Intercepts incoming requests, applies schema validators and auth guards, and coordinates services.
- **PostgreSQL Database:** Stores relational tables under constraints enforced via Prisma.
- **Cloudinary Storage:** Persists resident avatars and ticket attachments directly via stream uploads.
- **Groq API:** Orchestrates on-demand text completion prompts and semantic similarity checks.

---

## 3. Design Decisions & Rationale

### Why PostgreSQL?
- **Data Integrity:** Ticket logging requires strict relational consistency. Using foreign keys ensures that history logs (`ComplaintHistory`) cannot point to non-existent tickets or deleted users.
- **Transactional History:** Changing a complaint status requires writing to the ticket table and appending to the history logs simultaneously. PostgreSQL allows executing these operations in atomic transactions, preventing split-state scenarios.

### Why Prisma ORM?
- **Typesafe Client:** Prisma generates type definitions matching the schema exactly, catching database field mismatches at compile time rather than runtime.
- **Declarative Database Sync:** Prisma schema acts as the single source of truth. Synchronizing tables via `npx prisma db push` guarantees that local developer databases match production Neon environments.

### Why Stateless JWT Authentication?
- **Horizontal Scalability:** Storing sessions in stateless tokens instead of server memory allows incoming requests to hit different backend instances without session replication synchronization.
- **Security:** Each token is signed using `JWT_SECRET` and carries short expiration limits, eliminating the database lookup latency needed for session validation.

### Why Cloudinary Stream Uploads?
- **Stateless Storage:** Because deployed Render instances are stateless and ephemeral, storing uploaded photos on local disk is not viable. Cloudinary stores media assets permanently, returning a secure URL persisted in the database.

---

## 4. AI Service Integration & Fallback Strategy

The application integrates with the Groq API to perform text classifications. 

### Multi-Model Fallback Queue
To handle rate limits or API downtime, requests pass through a sequential fallback pipeline:
1. `openai/gpt-oss-20b` (Primary fallback)
2. `meta-llama/llama-4-scout-17b-16e-instruct` (Secondary fallback)
3. `llama-3.1-8b-instant` (Tertiary fallback)

This queue ensures the application degrades gracefully and continues functioning if a specific model endpoint fails.

---

## 5. Architectural Trade-offs

### Non-Blocking Semantic Duplicate Detection
- **Trade-off:** Rather than performing duplicate checks client-side using simple string matching (which misses synonyms like "lift down" vs "elevator broken"), we run a prompt on Groq comparing description semantics. While this introduces API latency (~1.5s), we execute it as a non-blocking check during initial form submission. This gives residents immediate warning of duplicate tickets while retaining the option to click "Continue Anyway".

### Short Token Expirations vs Session Revocation
- **Trade-off:** Using stateless JWTs prevents instant session revocation (e.g., if a user is demoted or suspended mid-session, they remain logged in until the token expires). We compromise by setting token expirations to a moderate duration (`7d`) to balance session length with access security.
