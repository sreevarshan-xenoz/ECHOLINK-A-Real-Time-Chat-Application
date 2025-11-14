## Scope
- Run static checks, dynamic tests, and harden security across frontend, backend, signaling server, and Electron.

## Static Analysis & Type Safety
- Run `npm run health-check` and fix ESLint/TypeScript errors, focusing on mixed JS/TS, `any` usages, and `@ts-ignore`.
- Align TypeScript with `@types/react` and React 18: upgrade TypeScript or pin types; resolve Jest/JSDOM version mismatch.

## Security Hardening
- Remove `REACT_APP_GITHUB_CLIENT_SECRET` and all secrets from the frontend config; move to server-only `.env` (no REACT_APP prefix for server secrets).
- Remove `window.process = { env: { ...process.env } }` from `src/index.tsx`; use explicit config injection.
- Replace OAuth query-string token return with secure HTTP-only cookie/session on `/auth/github/callback` and add state/CSRF validation.
- Replace all `innerHTML` UI injections with safe DOM/React rendering.
- Restrict CORS and Socket.IO origins; use `https`/`wss` in production.
- Stop persisting AI API keys in `localStorage` and Supabase in plaintext; if needed, store encrypted server-side and fetch via short-lived tokens.
- Keep Electron `contextIsolation: true` and avoid `nodeIntegration` in renderer.

## Networking & Infrastructure
- Parameterize signaling URLs via `environment.ts`; ensure no hard-coded `http://`/`ws://` remain for production.
- Replace demo TURN credentials with managed TURN (e.g., Twilio/Nginx Coturn) and load from server-side secrets.

## Dynamic Testing
- Start all services (`dev:all`), run Jest tests and coverage; add runtime smoke tests for login, chat, GitHub flows, and WebRTC handshake.
- Measure performance (React Profiler, Lighthouse) on Dashboard/Chat; fix bottlenecks (memoization, virtualization already present).

## Documentation & Dependencies
- Correct README claims (Firebase vs Supabase, message persistence, setup), and add accurate OAuth setup instructions.
- Run `npm audit` (root/server/signaling-server), upgrade vulnerable/outdated packages with `npm-check-updates`, verify licenses.

## Deliverables
- A fixed codebase passing type-check, lint, tests; hardened security; updated docs; and a short report summarizing changes, remaining risks, and follow-ups.