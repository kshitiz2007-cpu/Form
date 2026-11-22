# MCQ Test Portal

A mobile-friendly quiz platform for Telegram audiences. React + Vite frontend, Express API, PostgreSQL.

## Local setup
1. Install Node.js 20+
2. `npm install`
3. Copy `.env.example` to `.env` and fill values
4. `npm run dev`

Frontend runs on `http://localhost:5173`, API on `http://localhost:4000.

## Admin
Set `ADMIN_PASSWORD` and `JWT_SECRET` in `.env`. Admin entry: `/admin`.

## Deploy
Use Render Blueprint (`render.yaml`). Configure environment variables before deploying.
