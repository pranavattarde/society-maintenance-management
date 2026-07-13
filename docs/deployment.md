# Production Deployment Guide

This guide provides step-by-step instructions to deploy Grand Arch Residences to Cloud / SaaS provider platforms (Vercel, Render, and Neon).

---

## 1. Database: Neon PostgreSQL

1. Sign up at [Neon](https://neon.tech) and create a new PostgreSQL project.
2. In the Neon dashboard, navigate to **Connection String**.
3. Choose the connection mode (Pooled connection is recommended for serverless runtimes).
4. Copy the connection string. It will look like:
   ```
   postgresql://alex:password@ep-cool-snowflake-12345.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
5. Save this as `DATABASE_URL` in your backend environment configuration.

---

## 2. Backend: Render Deployment

1. Sign up at [Render](https://render.com) and link your GitHub repository.
2. Click **New +** and select **Web Service**.
3. Connect your repository.
4. Set the following build properties:
   - **Runtime:** `Docker`
   - **Dockerfile Path:** `server/Dockerfile`
5. Expand **Advanced** and add the following Environment Variables:
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: *(Your Neon Connection String)*
   - `JWT_SECRET`: *(A random 32-character key)*
   - `JWT_EXPIRES_IN`: `7d`
   - `CLIENT_URL`: *(The URL of your deployed frontend on Vercel)*
   - `CLOUDINARY_CLOUD_NAME`: *(Your Cloudinary account name)*
   - `CLOUDINARY_API_KEY`: *(Your Cloudinary API key)*
   - `CLOUDINARY_API_SECRET`: *(Your Cloudinary secret key)*
   - `RESEND_API_KEY`: *(Your Resend API key)*
   - `FROM_EMAIL`: *(Your verified Resend sender email address)*
   - `GROQ_API_KEY`: *(Your Groq API key)*
6. Set the **Start Command** inside Docker to handle Prisma migrations automatically on launch:
   ```bash
   npx prisma db push --accept-data-loss && npm run db:seed && node server.js
   ```
7. Click **Create Web Service**. Render will build and deploy the Docker container.

---

## 3. Frontend: Vercel Deployment

1. Sign up at [Vercel](https://vercel.com).
2. Click **Add New** → **Project** and import your repository.
3. In the project setup wizard:
   - Set **Root Directory** to `client`.
   - Set **Framework Preset** to `Vite`.
4. Add the following Environment Variable:
   - `VITE_API_URL`: *(The URL of your deployed backend on Render, e.g. `https://your-service.onrender.com/api`)*
5. Click **Deploy**. Vercel will build the React application and deploy the static assets to edge servers.
6. The `client/vercel.json` file handles routing redirects, ensuring SPA paths resolve correctly without 404s.
