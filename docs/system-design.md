# System Design

## 1. Architectural Overview
The Society Maintenance Tracker is designed as a three-tier, web-based system prioritizing modularity, security, and stateless execution:

1. **Presentation Layer (Frontend)**: A React SPA built with Vite. It handles routing client-side (via React Router) and coordinates state (auth token, user info) locally. It connects to the backend through a unified, native `fetch`-based HTTP client.
2. **Application Layer (Backend)**: A Node.js Express REST API. It is structured using the Controller-Service pattern:
   - **Controllers**: Parse request params, pass parameters to services, and send HTTP responses.
   - **Services**: Handle all business logic, database transactions, and integrations.
3. **Data Layer**: PostgreSQL database managed via Prisma ORM.

## 2. Key Component Design

### 2.1 Authentication & Authorization
- **Authentication**: JWT-based stateless authentication. Passwords are encrypted using bcrypt (cost factor: 12) on register/login.
- **Authorization**: Role-based access control (RBAC). Middelwares check user roles (`RESIDENT` or `ADMIN`) before forwarding requests to sensitive handlers.

### 2.2 Complaint Lifecycle & Audit Log
- **State Transition**: Enforced via transition matrix: `OPEN` -> `IN_PROGRESS` or `RESOLVED`, and `IN_PROGRESS` -> `RESOLVED`.
- **History Audit Log**: Status changes write an audit entry into a separate, append-only `ComplaintHistory` table. This operation is wrapped in a Prisma `$transaction` block to guarantee atomic consistency.

### 2.3 Overdue Detection
Overdue status is calculated dynamically. An unresolved complaint is marked overdue if its `createdAt` timestamp is older than `OVERDUE_THRESHOLD_DAYS` (configurable via environment variable, defaulting to 7). This avoids cron jobs or database synchronization issues, keeping the server completely stateless.

### 2.4 Notice Board Pinning
Admins can pin/unpin notices. Pinning triggers a fire-and-forget notification email via Resend to all registered residents. The query orders notices by `isPinned DESC` and `createdAt DESC`, guaranteeing that pinned notices always appear at the top.

### 2.5 Photo Upload
Uses Multer memory storage. Uploads are streamed directly from the file buffer into Cloudinary CDN using Node streams. This bypasses local disk writes, aligning with cloud-native, stateless environment practices.

## 3. Reliability & Error Handling
- **Non-blocking Operations**: Email dispatches are treated as non-blocking promises (fire-and-forget). Failure to deliver an email does not delay or fail the primary API request.
- **Error Boundaries**: A centralized middleware catches all errors. Expected operations throw custom `ApiError` instances containing HTTP status codes.
