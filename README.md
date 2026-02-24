# mathsedu.org

Monorepo starter for a friends-only portal with:
- Auth (email/password to start, phone verification flow scaffolded)
- Group messaging portal
- Game scoring + leaderboard API
- Static frontend for GitHub Pages
- Node backend for Render

## Architecture
- Frontend: static app in `frontend/` (GitHub Pages)
- Backend: Express API in `backend/` (Render)
- Domain: Cloudflare with split subdomains (`www` + `api`)

## Quick start
### 1) Backend
```bash
cd backend
npm install
npm run dev
```
Backend runs on `http://localhost:8787`.

### 2) Frontend
Serve `frontend/` with any static server.

If you have Python:
```bash
cd frontend
python3 -m http.server 4173
```
Then open `http://localhost:4173`.

Set API base in `frontend/src/config.js` if needed.

## Next implementation milestones
1. Replace in-memory storage with Postgres.
2. Add JWT refresh token rotation + secure cookie flow.
3. Add real SMS provider (Twilio/Firebase) for phone OTP.
4. Add websocket realtime events for portal messages.
5. Add moderation/admin controls.
