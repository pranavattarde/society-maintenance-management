# Production Deployment Guide — Society Maintenance Management

This guide documents the deployment steps for hosting the application on SaaS and Cloud platforms (Vercel, Render, and Neon).

## Live Deployed URLs

- **React Client (Vercel):** [https://society-maintenance-management.vercel.app](https://society-maintenance-management.vercel.app)
- **Express API (Render):** [https://society-maintenance-backend-i9g2.onrender.com](https://society-maintenance-backend-i9g2.onrender.com)

---

## 1. Database: Neon PostgreSQL

Neon hosts the serverless relational database engine.
1. Sign up at [Neon](https://neon.tech) and create a project.
2. Under **Connection String**, copy the URI. (Using the Connection Pooler option is recommended for serverless API environments).
3. The string will look like:
   ```
   postgresql://user:password@ep-snowflake-12345.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. Save this value as `DATABASE_URL` in the backend service environment parameters.

---

## 2. Backend API: Render Service

The backend runs inside a container on Render.
1. Sign up at [Render](https://render.com) and link your GitHub repository.
2. Click **New +** → **Web Service**.
3. Point to your repository branch.
4. Configure the build parameters:
   - **Runtime:** `Docker`
   - **Dockerfile Path:** `server/Dockerfile`
5. Click **Advanced** and declare the following variables:
   - `PORT`: `6000` (or your custom port)
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: *(Your Neon Connection String)*
   - `JWT_SECRET`: *(A long secure key)*
   - `JWT_EXPIRES_IN`: `7d`
   - `CLIENT_URL`: *(Your deployed Vercel frontend URL)*
   - `CLOUDINARY_CLOUD_NAME`: *(Your Cloudinary account name)*
   - `CLOUDINARY_API_KEY`: *(Your Cloudinary API key)*
   - `CLOUDINARY_API_SECRET`: *(Your Cloudinary API secret key)*
   - `RESEND_API_KEY`: *(Your Resend API key)*
   - `FROM_EMAIL`: *(Your verified Resend sender address)*
   - `GROQ_API_KEY`: *(Your Groq API key)*
6. The Dockerfile executes database push commands automatically on launch:
   ```bash
   npx prisma db push --accept-data-loss && npm run db:seed && node server.js
   ```
7. Click **Create Web Service**.

---

## 3. Frontend Client: Vercel Static Hosting

The React frontend is compiled to a static bundle and served by Vercel's edge network.
1. Sign up at [Vercel](https://vercel.com).
2. Click **Add New** → **Project** and import your repository.
3. In the setup wizard:
   - Set **Root Directory** to `client`.
   - Set **Framework Preset** to `Vite`.
4. Add the client environment variable:
   - `VITE_API_URL`: *(Your deployed Render API endpoint, e.g., `https://society-maintenance-backend-i9g2.onrender.com/api`)*
5. Click **Deploy**.
6. The client contains a `vercel.json` routing configuration that handles SPA path redirection, preventing 404 errors when reloading deep URLs.
