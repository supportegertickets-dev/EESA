# EESA Deployment (Vercel + Render + Brevo)

## 1. Frontend: Vercel
- Framework preset: `Other`
- Root directory: repository root
- Build command: `npm run build`
- Output directory: `frontend/dist`
- **Do NOT set** `VITE_API_BASE_URL` in Vercel environment variables.
  API requests are proxied through Vercel rewrites (see `vercel.json`) so
  cookies stay first-party and work on all mobile browsers.

## 2. Backend: Render
Use the included `render.yaml` or create a Web Service with:
- Build command: `npm install`
- Start command: `node backend/server.js`
- Health check path: `/api/health`

Required Render environment variables:
- `NODE_ENV=production`
- `FRONTEND_URL=https://your-vercel-project.vercel.app`
- `MONGODB_URI=...`
- `SESSION_SECRET=...`
- `CLOUDINARY_CLOUD_NAME=...`
- `CLOUDINARY_API_KEY=...`
- `CLOUDINARY_API_SECRET=...`
- `SMTP_HOST=smtp-relay.brevo.com`
- `SMTP_PORT=587`
- `SMTP_USER=your_brevo_login@email.com`
- `SMTP_PASS=your_brevo_smtp_key`
- `SMTP_FROM=EESA Portal <noreply@yourdomain.com>`
- `MPESA_CONSUMER_KEY=...`
- `MPESA_CONSUMER_SECRET=...`
- `MPESA_SHORTCODE=174379`
- `MPESA_PASSKEY=...`
- `MPESA_CALLBACK_URL=https://your-render-service.onrender.com/api/payments/mpesa/callback`
- `MPESA_ENV=sandbox`

## 3. Brevo
In Brevo, create an SMTP key and use it as `SMTP_PASS`.

## 4. Important behavior already configured
- API requests are proxied through Vercel rewrites (`/api/*` → Render)
  so session cookies are first-party — no third-party cookie issues on mobile
- Browser sessions are sent with `credentials: include`
- Backend CORS accepts `FRONTEND_URL`
- Production cookies use `SameSite=None` and `Secure`
