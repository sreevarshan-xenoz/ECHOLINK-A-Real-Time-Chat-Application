## Goals
- Get all unit/integration tests passing by fixing ESM resolution for `react-router-dom` and correcting Supabase service mocks.

## Jest/ESM Configuration
- Update `jest.config.js` to allow transforming ESM packages:
  - Add `transformIgnorePatterns: ['node_modules/(?!(react-router-dom|@remix-run/router)/)']`.
  - Keep `babel-jest` for `js|jsx|ts|tsx` transform.
- Add `babel.config.js` with presets: `@babel/preset-env`, `@babel/preset-react`, `@babel/preset-typescript` to ensure ESM and TS are transpiled under Jest.
- Align Jest environment versions:
  - Remove explicit `jest-environment-jsdom` devDep or pin to Jest 27-compatible version.
  - Keep `testEnvironment: 'jsdom'` in `jest.config.js`.

## Supabase Service Test Strategy
- Refactor tests to mock the exported functions from `../services/supabase-service` instead of `@supabase/supabase-js` internals.
  - Example: `jest.mock('../services/supabase-service', () => ({ signUp: jest.fn(), signIn: jest.fn(), signOut: jest.fn(), getCurrentUser: jest.fn() }))`.
  - In each test, set the mock resolved values and assert the wrapper behavior.
- Alternatively (if preferred), modify `supabase-service` to accept an injected client for easier stubbing in tests, but prioritize test-only mocks first to avoid touching production code paths.

## Re-run and Validate
- Run `npm test` to confirm test suites pass.
- Run `npm run type-check` and `npm run lint` to ensure no new issues.

## Optional Cleanups
- Reduce lint warnings by removing unused imports/vars and fixing `react-hooks/exhaustive-deps` warnings in key components.
- Parameterize y-websocket URL (`ws://localhost:1234`) via `environment.ts` for production TLS parity.

## QA
- After tests pass, run dev (`npm start`) and `npm run build`; perform smoke tests for routing, auth, chat, and GitHub flows.
- Ensure no secrets in client bundle and no unsafe DOM usage remains.

## Deliverables
- Updated Jest/Babel config, corrected tests, green test suite, and a short summary of changes and confirmations.