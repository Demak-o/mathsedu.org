# Backend roadmap

## Current state
- In-memory prototype only
- Basic JWT auth
- Dev OTP logger instead of real SMS
- Group and message routes
- Game score and leaderboard routes

## Production work required
1. Postgres schema + migrations
2. Rate limiting + brute force protection
3. Replace OTP logger with provider
4. Realtime events via websocket
5. Audit logs + moderation + role controls
6. E2E + API integration tests
