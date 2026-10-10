# KabadiLink frontend
`npm install && npm run dev`. Everything runs on a mock API in `src/api.ts`, persisted in localStorage (key `kabadilink-db-v1`; use the Admin page or clear storage to reset).
- `src/config.ts` rates, tiers, caps, catalog (all placeholders to validate) · `src/calc.ts` shared business logic · `src/api.ts` mock endpoints + seed data (20 households, 8 collectors, 5 recyclers, 50 pickups)
- Every "backend here (...)" comment in `src/api.ts` marks the call to replace with an AWS endpoint. Pages only call `api.*`, so they need no rewrite.
- Demo admin: Sign in, then use the "Demo admin account" button.
