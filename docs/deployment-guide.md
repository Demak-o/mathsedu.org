# Deployment Guide

## 1) Frontend on GitHub Pages

1. Push `main` branch.
2. In GitHub repo settings, open **Pages** and set source to **GitHub Actions**.
3. The workflow `.github/workflows/deploy-pages.yml` deploys `frontend/`.
4. After deploy, you get a URL like `https://demak-o.github.io/mathsedu.org/`.

## 2) Backend on Render

1. In Render, create a **Web Service** from your repo.
2. Render auto-detects `render.yaml`.
3. Set required environment vars:
   - `CORS_ORIGIN` = your frontend URL (later your Cloudflare domain)
4. Deploy and copy backend URL, for example `https://mathsedu-api.onrender.com`.

## 3) Connect frontend to backend

Update `frontend/src/config.js` so `API_BASE` points to your Render backend URL.

## 4) Cloudflare domain split

When your domain is ready, use subdomains:
- `www.yourdomain.com` -> GitHub Pages
- `api.yourdomain.com` -> Render service

Then set:
- frontend hosted at `www`
- backend CORS origin to `https://www.yourdomain.com`
- frontend `API_BASE = https://api.yourdomain.com`

## 5) SMS verification reality check

Current code uses dev OTP logging only.
Production SMS OTP requires a paid provider (Twilio/Firebase/etc.).
