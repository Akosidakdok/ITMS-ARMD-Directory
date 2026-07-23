# PNP ITMS PAIS 2.0 Backend Service

High-performance, RESTful Node.js + Express backend service for the **PNP ITMS Administrative & Resource Management Directory System (PAIS 2.0)**.

---

## Architectural Highlights

- **Repository Pattern Architecture**: Data access logic is completely encapsulated within `backend/store/repository.js`.
- **Database-Ready Design**: Designed so that connecting a SQL database (PostgreSQL, MySQL, SQLite via Prisma/Knex) or MongoDB (via Mongoose) requires **zero changes** to controllers, routes, or frontend client code.
- **RESTful Resource Management**: Full CRUD capabilities for 7 core domain entities:
  - Personnel (201 Master File)
  - Orders (Special Orders, Assignment Orders, Movement Orders)
  - Duty Assignments
  - Academic & IT Certifications
  - Time-In-Grade & Promotion Records
  - Specialized Technical Training Bootcamps
  - Leave Applications & Approvals

---

## Getting Started

### 1. Running the Backend Server

Start the Node.js backend server on port `5000`:

```bash
npm run server
```

Or run directly:

```bash
node backend/server.js
```

### 2. Verifying Server Health

Navigate to `http://localhost:5000/api/health` or run:

```bash
curl http://localhost:5000/api/health
```

Expected Response:
```json
{
  "status": "online",
  "system": "PNP-ITMS PAIS 2.0 Backend Service",
  "databaseAdapter": "In-Memory Repository (Database Ready)",
  "timestamp": "2026-07-23T13:51:50.000Z",
  "endpoints": [
    "/api/personnel",
    "/api/orders",
    "/api/assignments",
    "/api/education",
    "/api/promotions",
    "/api/training",
    "/api/leave"
  ]
}
```

---

## API Documentation & Endpoints

### 1. Personnel (`/api/personnel`)
- `GET /api/personnel` — Fetch all personnel (Supports query params: `?division=CSD`, `?search=DELA`, `?status=Active`)
- `GET /api/personnel/:id` — Fetch personnel by ID
- `POST /api/personnel` — Register new personnel record
- `PUT /api/personnel/:id` — Update personnel details
- `DELETE /api/personnel/:id` — Remove personnel record

### 2. Orders (`/api/orders`)
- `GET /api/orders` — List all official orders
- `GET /api/orders/:id` — Get order details
- `POST /api/orders` — Create new Special / Assignment / Movement order
- `PUT /api/orders/:id` — Update order details
- `DELETE /api/orders/:id` — Delete order

### 3. Assignments (`/api/assignments`)
- `GET /api/assignments` — List duty postings (Supports `?personnelId=pnp-001`)
- `POST /api/assignments` — Issue new duty posting assignment
- `DELETE /api/assignments/:id` — Delete assignment record

### 4. Education (`/api/education`)
- `GET /api/education` — List academic degrees & IT certs (Supports `?personnelId=pnp-001`)
- `POST /api/education` — Add education/certification entry
- `DELETE /api/education/:id` — Delete education record

### 5. Promotions (`/api/promotions`)
- `GET /api/promotions` — List promotion history (Supports `?personnelId=pnp-001`)
- `POST /api/promotions` — Log rank promotion (automatically updates personnel rank and last promotion date)
- `DELETE /api/promotions/:id` — Delete promotion entry

### 6. Training (`/api/training`)
- `GET /api/training` — List specialized training logs (Supports `?personnelId=pnp-001`)
- `POST /api/training` — Add training course record
- `DELETE /api/training/:id` — Delete training record

### 7. Leave (`/api/leave`)
- `GET /api/leave` — List leave applications (Supports `?personnelId=pnp-001`)
- `POST /api/leave` — File new leave request
- `PATCH /api/leave/:id/status` — Update leave status (e.g. Approved / Rejected)
- `DELETE /api/leave/:id` — Delete leave record

---

## Future Database Migration Guide

To replace the in-memory repository with a real persistent database:

1. **Install ORM / Query Builder**:
   ```bash
   npm install @prisma/client prisma
   # OR
   npm install pg knex
   ```
2. **Update `backend/store/repository.js`**:
   Replace `this.personnel` array methods with database queries (e.g., `prisma.personnel.findMany()`, `prisma.personnel.create()`).
3. **No further changes required** — your controllers and routes will work seamlessly out of the box!
