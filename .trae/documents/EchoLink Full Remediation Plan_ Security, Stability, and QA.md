## Objectives
- Identify and fix all critical bugs, security flaws, and performance issues.
- Preserve existing features and APIs; avoid regressions.
- Establish reliable tests and QA gates covering dev and prod builds.

## Findings Summary (Triaged)
- Critical: Frontend secret exposure (`REACT_APP_GITHUB_CLIENT_SECRET`), env leak via `window.process.env`, OAuth token in URL, unsafe `innerHTML` injection, permissive signaling CORS, Electron insecure flags, hard-coded `http/ws` endpoints, plaintext AI keys.
- High: Demo TURN creds, client-side GitHub token usage, inconsistent TS/Jest versions.
- Medium: Mixed JS/TS duplication (`ai-service.js/.ts`), `@ts-ignore` in hooks, README inaccuracies.

## Prioritized Fixes
1) Security hardening (secrets, OAuth, DOM XSS, CORS/TLS, Electron isolation, tokens). 
2) Networking reliability (TURN config, parameterized endpoints). 
3) Type safety and test compatibility (TS/Jest alignment, duplicate services cleanup). 
4) Documentation accuracy and setup guidance.

## Implementation Steps
### Phase 1: Security
- Remove client-side access to secrets in `src/config/environment.ts`; keep only non-sensitive IDs.
- Remove `window.process = { env: ... }` from `src/index.tsx`; expose only needed, non-sensitive config.
- Update OAuth: add `state` param, validate on callback; return session via HTTP-only cookie; remove `accessToken` from query.
- Replace all `innerHTML` usage with DOM-safe rendering or React components.
- Restrict CORS for server and signaling server; enforce HTTPS/WSS in production.
- Electron: set `contextIsolation: true`, disable `nodeIntegration` in renderer; use preload and secure IPC.
- Move AI keys server-side; if persisted, encrypt at rest; stop storing in `localStorage`.

### Phase 2: Networking & Config
- Parameterize signaling/WS/AI endpoints via `environment.ts`; avoid hard-coded `http://`.
- Replace demo TURN with managed credentials loaded from server env.

### Phase 3: Type & Test Alignment
- Upgrade or pin TypeScript to match `@types/react`; align Jest `jsdom` version with CRA.
- Consolidate duplicate services (`ai-service.js/.ts`) into typed TS; remove `@ts-ignore` in hooks with proper typing.

### Phase 4: Documentation & DX
- Update README to reflect Supabase, persistence model, accurate setup, OAuth instructions.
- Add security notes (no client secrets; cookies for sessions; production TLS requirements).

## Testing Strategy
- Unit tests: auth flow, OAuth callback state validation, WebRTC UI (no `innerHTML` injections), Supabase settings (no plaintext keys).
- Integration tests: login → dashboard → chat; GitHub operations via backend proxy.
- System tests: start `dev:all`, verify signaling, chat send/receive, file/voice messaging.
- Performance: React Profiler and Lighthouse on `Dashboard` and `Chat`.
- Environments: run tests on dev and built production (`npm run build` + served), and Electron.

## Backward Compatibility
- Maintain Redux slice shapes and public component props.
- Keep REST/Socket.IO payloads stable; add versioned endpoints if needed.
- Feature flags to toggle new security behaviors (e.g., cookie auth) with fallbacks.

## VCS & Documentation of Changes
- Use atomic commits per area (security, networking, typing, docs) with clear messages.
- Add CHANGELOG entries summarizing fixes and any user-facing changes.

## QA & Release
- Run `npm run health-check`, unit/integration/system tests, and coverage gates.
- Manual exploratory QA across primary flows.
- Final checklist: no secrets in client bundle, CORS/HTTPS enforced, no `innerHTML`, OAuth cookie-based, tests pass.

## Risk & Rollback
- If auth cookie integration causes breakage, provide fallback to token-based behind a feature flag (disabled by default).
- Rollback plan: revert to previous release tags; retain DB schema compatibility.

## Deliverables
- Hardened codebase with verified tests and accurate docs.
- Summary report of changes, residual risks, and follow-ups.