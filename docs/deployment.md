# Deployment Guide

## Architecture Overview

| Layer | Platform | Notes |
|---|---|---|
| Frontend | **Vercel** | Auto-deploy on push to `main` |
| Backend | **Render** | Docker container, always-on |
| Database | **Neon PostgreSQL** | Serverless, connection pooling via connection string |
| Storage | **Cloudinary** | Photo uploads |
| Email | **Resend** | Transactional email |

---

## Database — Neon

1. Create a free account at [neon.tech](https://neon.tech)
2. Create a new project: `society-maintenance`
3. Copy the **Connection string** from the Neon dashboard
4. The connection string format:
   ```
   postgresql://user:password@host.neon.tech/dbname?sslmode=require
   ```
5. Set this as `DATABASE_URL` in your backend environment

---

## Backend — Render

### Initial setup

1. Push your repository to GitHub
2. Go to [render.com](https://render.com) → **New → Web Service**
3. Connect your GitHub repository
4. Configure the service:

| Setting | Value |
|---|---|
| **Name** | `society-maintenance-server` |
| **Root directory** | `server` |
| **Runtime** | Docker |
| **Dockerfile path** | `./Dockerfile` |
| **Instance type** | Free (or Starter for production) |

### Environment variables (Render dashboard)

Set all variables from `.env.example` in the **Environment** tab:

```
NODE_ENV=production
DATABASE_URL=<Neon connection string>
JWT_SECRET=<secure random string>
JWT_EXPIRES_IN=7d
CLIENT_URL=<Vercel frontend URL>
CLOUDINARY_CLOUD_NAME=<value>
CLOUDINARY_API_KEY=<value>
CLOUDINARY_API_SECRET=<value>
RESEND_API_KEY=<value>
FROM_EMAIL=<verified sender>
```

### Post-deploy database setup

After first deploy, open the Render **Shell** tab and run:

```bash
npx prisma db push
node prisma/seed.js
```

---

## Frontend — Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repository
3. Configure:

| Setting | Value |
|---|---|
| **Framework Preset** | Vite |
| **Root directory** | `client` |
| **Build command** | `npm run build` |
| **Output directory** | `dist` |

### Environment variable (Vercel dashboard)

```
VITE_API_URL=https://society-maintenance-server.onrender.com/api
```

The `client/vercel.json` file handles SPA routing rewrites automatically.

---

## Local Production Test with Docker

To test the full production stack locally:

```bash
# Build and run server in Docker (requires .env at project root)
docker compose up --build
```

Then run the frontend dev server against the Docker backend:
```bash
VITE_API_URL=http://localhost:5000/api npm run dev
```

---

## Checklist Before Deployment

- [ ] `.env` is not committed to Git
- [ ] `JWT_SECRET` is a cryptographically random string (minimum 32 chars)
- [ ] `DATABASE_URL` includes `?sslmode=require` for Neon
- [ ] `FROM_EMAIL` domain is verified in Resend
- [ ] `CLIENT_URL` on the backend matches the exact Vercel URL (including `https://`)
- [ ] Prisma schema has been pushed and seed has been run
- [ ] Health check endpoint responds: `GET /api/health`
