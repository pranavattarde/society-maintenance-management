# Database Schema & Models

This document details the relational database design, data models, field constraints, and relationships configured inside the Prisma schema file.

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
  │ avatarUrl    │    │     └─────────────────┘    │
  └──────────────┘    │              │             │
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
Represents residents and administrators inside the society.

| Field Name | Type | Constraints | Description |
|---|---|---|---|
| `id` | `String` | `PK`, Default CUID | Unique system identifier |
| `name` | `String` | Not Null | User's full name |
| `email` | `String` | `Unique`, Not Null | Log-in identifier |
| `password` | `String` | Not Null | Bcrypt hashed password |
| `role` | `Role` (Enum) | Default `RESIDENT` | Access scopes: `RESIDENT` or `ADMIN` |
| `flatNumber`| `String` | Not Null | Residence unit identifier (e.g., A-101) |
| `phone` | `String` | Nullable | Contact phone number |
| `avatarUrl` | `String` | Nullable | Link to Cloudinary-hosted profile avatar image |
| `createdAt` | `DateTime` | Default `now()` | Registration timestamp |
| `updatedAt` | `DateTime` | `updatedAt` | Auto-updating modification timestamp |

---

### Complaint (`complaints`)
Maintenance issues raised by residents.

| Field Name | Type | Constraints | Description |
|---|---|---|---|
| `id` | `String` | `PK`, Default CUID | Unique ticket identifier |
| `title` | `String` | Not Null | Short summary of the reported issue |
| `description`| `String` | Not Null | Detailed description of the problem |
| `category` | `Category` (Enum)| Not Null | Mappings: `PLUMBING`, `ELECTRICAL`, `CLEANING`, `SECURITY`, `OTHER` |
| `priority` | `Priority` (Enum)| Not Null | Mappings: `LOW`, `MEDIUM`, `HIGH` |
| `status` | `Status` (Enum) | Default `OPEN` | Mappings: `OPEN`, `IN_PROGRESS`, `RESOLVED` |
| `photoUrl` | `String` | Nullable | Link to Cloudinary-hosted ticket attachment image |
| `residentId`| `String` | `FK` -> `User.id` | The reporter of the complaint ticket |
| `createdAt` | `DateTime` | Default `now()` | Ticket creation timestamp |
| `updatedAt` | `DateTime` | `updatedAt` | Last update timestamp |

---

### ComplaintHistory (`complaint_history`)
An append-only audit log tracking ticket status transitions.

| Field Name | Type | Constraints | Description |
|---|---|---|---|
| `id` | `String` | `PK`, Default CUID | Log entry identifier |
| `complaintId`| `String` | `FK` -> `Complaint.id` | The audited complaint ticket |
| `changedById`| `String` | `FK` -> `User.id` | User executing the state transition |
| `fromStatus`| `Status` (Enum) | Not Null | Ticket status state before the change |
| `toStatus` | `Status` (Enum) | Not Null | Ticket status state after the change |
| `remark` | `String` | Nullable | Commentary or resolution notes appended during change |
| `createdAt` | `DateTime` | Default `now()` | Log creation timestamp |

---

### Notice (`notices`)
Bulletin board announcements created by administrators.

| Field Name | Type | Constraints | Description |
|---|---|---|---|
| `id` | `String` | `PK`, Default CUID | Notice identifier |
| `title` | `String` | Not Null | Announcement title |
| `content` | `String` | Not Null | Notice announcement body text |
| `isPinned` | `Boolean` | Default `false` | If true, pins the notice to the top of list queries |
| `authorId` | `String` | `FK` -> `User.id` | Administrator who published the notice |
| `createdAt` | `DateTime` | Default `now()` | Notice publication timestamp |
| `updatedAt` | `DateTime` | `updatedAt` | Last edit timestamp |

---

## 3. Relational Integrity & Cascades

- **Cascade Deletions:** Deleting a User or a Complaint cascades through the schema. For example, if a `Complaint` record is deleted, all related history logs in `ComplaintHistory` are deleted automatically, preventing database reference leaks.
- **Indexes:** Primary keys and fields marked unique (e.g. `User.email`) are indexed automatically in PostgreSQL.
