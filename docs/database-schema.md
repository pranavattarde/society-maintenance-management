# Database Schema & Models

This document details the relational database design, constraints, and migrations compiled using the Prisma schema for Grand Arch Residences.

---

## 1. Schema Diagram

```
  ┌──────────────┐          ┌─────────────────┐
  │    users     │          │   complaints    │
  ├──────────────┤          ├─────────────────┤
  │ id (PK)      │◄───┐     │ id (PK)         │◄───┐
  │ email (UK)   │    │     │ residentId (FK) │    │
  │ name         │    │     │ title           │    │
  │ role (Enum)  │    │     │ status (Enum)   │    │
  └──────────────┘    │     └─────────────────┘    │
         │            │              │             │
         │            └────────┐     │             │
         │                     │     ▼             │
         │              ┌──────┴──────────────┐    │
         │              │  complaint_history  │    │
         │              ├─────────────────────┤    │
         │              │ id (PK)             │    │
         │              │ complaintId (FK) ───┼────┘
         └─────────────►│ changedById (FK)    │
                        └─────────────────────┘
```

---

## 2. Models & Fields

### User (`users`)
Represents residents and administrators inside the society workspace.

| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| `id` | `String` | `PK`, Default CUID | Unique system identifier |
| `name` | `String` | Not Null | User's full name |
| `email` | `String` | `Unique`, Not Null | Log-in identifier |
| `password` | `String` | Not Null | Bcrypt hashed password |
| `role` | `Role` (Enum) | Default `RESIDENT` | Access scope: `RESIDENT` or `ADMIN` |
| `flatNumber`| `String` | Not Null | Residence unit number |
| `phone` | `String` | Nullable | Contact number |
| `createdAt` | `DateTime` | Default `now()` | Registration timestamp |
| `updatedAt` | `DateTime` | `updatedAt` | Auto-updating timestamp |

---

### Complaint (`complaints`)
Incidents raised by residents to request maintenance assistance.

| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| `id` | `String` | `PK`, Default CUID | Unique ticket identifier |
| `title` | `String` | Not Null | Short summary of the issue |
| `description`| `String` | Not Null | Detailed problem description |
| `category` | `Category` (Enum)| Not Null | `PLUMBING`, `ELECTRICAL`, `CLEANING`, etc. |
| `priority` | `Priority` (Enum)| Not Null | Urgency level: `LOW`, `MEDIUM`, `HIGH` |
| `status` | `Status` (Enum) | Default `OPEN` | Ticket status: `OPEN`, `IN_PROGRESS`, `RESOLVED` |
| `photoUrl` | `String` | Nullable | Cloudinary secure attachment link |
| `residentId`| `String` | `FK` -> `User.id` | The reporter of the incident |
| `createdAt` | `DateTime` | Default `now()` | Ticket creation timestamp |
| `updatedAt` | `DateTime` | `updatedAt` | Last modification timestamp |

---

### ComplaintHistory (`complaint_history`)
Append-only audit trail capturing every state change for tracking accountability.

| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| `id` | `String` | `PK`, Default CUID | Log entry identifier |
| `complaintId`| `String` | `FK` -> `Complaint.id` | The audited complaint |
| `changedById`| `String` | `FK` -> `User.id` | User executing the state change |
| `fromStatus`| `Status` (Enum) | Not Null | State before change |
| `toStatus` | `Status` (Enum) | Not Null | State after change |
| `remark` | `String` | Nullable | Admin comment or notes |
| `createdAt` | `DateTime` | Default `now()` | Update timestamp |

---

### Notice (`notices`)
Announcements published by administrators.

| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| `id` | `String` | `PK`, Default CUID | Announcement identifier |
| `title` | `String` | Not Null | Announcement title |
| `content` | `String` | Not Null | Announcement details |
| `isPinned` | `Boolean` | Default `false` | If true, pins notice to the top |
| `authorId` | `String` | `FK` -> `User.id` | Admin who created the notice |
| `createdAt` | `DateTime` | Default `now()` | Notice timestamp |
| `updatedAt` | `DateTime` | `updatedAt` | Update timestamp |

---

## 3. Database Indices & Relationships

- **Relational Integrity:** All foreign key constraints are strictly enforced via Prisma. Deleting a User or a Complaint cascades through the dependencies to prevent orphan history records.
- **Auto-index:** Primary keys and fields with `Unique` attributes (e.g. `User.email`) are indexed automatically in PostgreSQL.
