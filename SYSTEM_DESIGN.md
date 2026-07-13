# System Design Document

This document explains the core system design, technology selections, scalability, and structural trade-offs chosen for the Grand Arch Residences system.

---

## 1. System Architecture

The application uses a decoupled, stateless **client-server architecture**.
- **Frontend SPA:** Compiled static React bundle served via Nginx. Client-side routing is mapped entirely to `index.html` to allow direct URL path access.
- **Backend API:** Stateless Express application. The service layer decouples route handling from database interactions and external API execution (Groq, Resend, Cloudinary).

---

## 2. Technology Choices & Rationale

### why PostgreSQL?
- **Relational Integrity:** Maintenance tracking requires absolute consistency. A relational database allows foreign key constraints (e.g. mapping `ComplaintHistory` to `Complaint` and `User`) to ensure orphaned records or invalid references cannot exist.
- **Transactional Support:** Changing ticket statuses requires atomic database transactions to guarantee logs are written cleanly.

### Why Prisma?
- **Type Safety:** Prisma compiles a type-safe database client directly from the schema file, catching database field mapping bugs at compile-time instead of runtime.
- **Declarative Migrations:** The schema defines the single source of truth, automating database synchronization via `prisma db push` or schema migrations.

### Why Docker & Docker Compose?
- **Unified Local Environment:** Compose launches the Postgres database engine, Express backend, and Nginx frontend in isolated networks, ensuring consistent runtimes.
- **Deployment Portability:** Containerized builds build and execute identically on Render, AWS, or local developer workstations.

### Why stateless JWT Sessions?
- **Scalability:** The API server does not store session states in memory, allowing horizontal scaling behind load balancers.
- **Security:** Tokens are signed using a secure `JWT_SECRET` and parsed on each protected request, preventing database session lookups.

### Why the Groq AI Integration?
- **Autofill Utility:** Large Language Models (LLMs) help residents structure clear titles, select categories, and determine priority levels based on text descriptions.
- **Multi-Model Fallbacks:** High availability is guaranteed by querying models in a fallback sequence (`openai/gpt-oss-20b` → `meta-llama/llama-4-scout-17b-16e-instruct` → `llama-3.1-8b-instant`), resolving rate limits and downtime.

---

## 3. High Scale Bottlenecks & Scalability

### Pre-submission Duplicate Checking
To prevent the database from bloating with duplicate entries, the front-end intercepts submit actions to query recent unresolved tickets (limited to the last 30 issues from the last 60 days). Groq processes the text similarity check, ensuring the search is fast (token usage ~2,500) and accurate.

For higher scale deployments:
- **Optimization:** We can replace the LLM text similarity scan with local vector embeddings (`pgvector` extension) on the database, allowing instant index scans.

### Database Indexing
To prevent database bottlenecks during heavy loads:
- **Composite Indexing:** We add composite indexes on `Complaint(status, createdAt)` and `Notice(isPinned, createdAt)` to optimize dashboard lists and bulletin board queries.
