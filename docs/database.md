# Database Schema

## Entity Relationship Overview

```
User ──< Complaint (residentId)
User ──< ComplaintHistory (changedById)
User ──< Notice (authorId)
Complaint ──< ComplaintHistory (complaintId)
```

---

## Enums

### `Role`
| Value | Description |
|---|---|
| `RESIDENT` | Standard tenant — can submit and view own complaints |
| `ADMIN` | Society administrator — manages all complaints and notices |

### `Status`
| Value | Description |
|---|---|
| `OPEN` | Complaint submitted, awaiting action |
| `IN_PROGRESS` | Admin has acknowledged and started resolution |
| `RESOLVED` | Issue resolved — terminal state, no further transitions |

### `Priority`
| Value | Description |
|---|---|
| `LOW` | Minor inconvenience, no urgency |
| `MEDIUM` | Moderate impact, resolve within SLA |
| `HIGH` | Significant impact, prioritise immediately |

### `Category`
| Value | Description |
|---|---|
| `PLUMBING` | Water supply, leaks, drainage |
| `ELECTRICAL` | Power, lighting, wiring |
| `CLEANING` | Common areas, waste disposal |
| `SECURITY` | Access control, CCTV, guards |
| `LIFT` | Elevator maintenance and breakdowns |
| `PARKING` | Parking area issues |
| `OTHER` | Issues not covered by above categories |

---

## Models

### `User`
| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | String | PK, `cuid()` | |
| `name` | String | Required | Full name |
| `email` | String | Required, unique | Used as login identifier |
| `password` | String | Required | bcrypt hash — never stored in plaintext |
| `role` | Role | Default: `RESIDENT` | |
| `flatNumber` | String | Required | e.g. `A-101`, `OFFICE` |
| `phone` | String | Optional | |
| `createdAt` | DateTime | `now()` | |
| `updatedAt` | DateTime | Auto-updated | |

### `Complaint`
| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | String | PK, `cuid()` | |
| `title` | String | Required | Short summary |
| `description` | String | Required | Full description |
| `category` | Category | Required | |
| `priority` | Priority | Required | |
| `status` | Status | Default: `OPEN` | |
| `photoUrl` | String | Optional | Cloudinary CDN URL |
| `residentId` | String | FK → User | Submitting resident |
| `createdAt` | DateTime | `now()` | Used for overdue detection |
| `updatedAt` | DateTime | Auto-updated | |

### `ComplaintHistory`
| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | String | PK, `cuid()` | |
| `complaintId` | String | FK → Complaint | |
| `changedById` | String | FK → User | Admin who made the change |
| `fromStatus` | Status | Required | Status before transition |
| `toStatus` | Status | Required | Status after transition |
| `remark` | String | Optional | Admin's note |
| `createdAt` | DateTime | `now()` | Immutable audit timestamp |

> `ComplaintHistory` records are **append-only**. No record is ever updated or deleted.

### `Notice`
| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | String | PK, `cuid()` | |
| `title` | String | Required | |
| `content` | String | Required | |
| `isPinned` | Boolean | Default: `false` | Pinned notices appear first |
| `authorId` | String | FK → User | Must be an ADMIN |
| `createdAt` | DateTime | `now()` | |
| `updatedAt` | DateTime | Auto-updated | |

---

## Overdue Detection Query

No `isOverdue` field is stored on `Complaint`. Overdue status is derived at query time:

```sql
WHERE status IN ('OPEN', 'IN_PROGRESS')
  AND "createdAt" < NOW() - INTERVAL '7 days'
```

The threshold (`7` days) is defined as `OVERDUE_THRESHOLD_DAYS` in `server/src/utils/constants.js`.

---

## Prisma Table Mapping

| Model | Table |
|---|---|
| `User` | `users` |
| `Complaint` | `complaints` |
| `ComplaintHistory` | `complaint_history` |
| `Notice` | `notices` |
