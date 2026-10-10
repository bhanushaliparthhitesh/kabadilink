# KabadiLink frontend
`npm install && npm run dev`. Everything runs on a mock API in `src/api.ts`, persisted in localStorage (key `kabadilink-db-v1`; use the Admin page or clear storage to reset).
- `src/config.ts` rates, tiers, caps, catalog (all placeholders to validate) · `src/calc.ts` shared business logic · `src/api.ts` mock endpoints + seed data (20 households, 8 collectors, 5 recyclers, 50 pickups)
- Every "backend here (...)" comment in `src/api.ts` marks the call to replace with an AWS endpoint. Pages only call `api.*`, so they need no rewrite.
- Demo admin: Sign in, then use the "Demo admin account" button.

## Simulator (section on the home page, hidden once signed in)
- `src/sim.ts` is the whole story as one pure function, `derive(t, cfg)`. Both phones, the recycler console and the admin view read its output, so play, pause, scrub and replay always stay in sync. Edit `CH` (chapters), `CAPTIONS` and `LOG` there to change the script.
- `src/pages/Simulator.tsx` is the UI: step button, "Play the whole story", sticky video-style scrubber (click a chapter segment to seek), 0.5x/1x/2x speed, and a toggle for the dashed "backend here" markers. Tapping the pulsing button on a phone does the same as the Step button.
- `src/components/RouteMap.tsx` is an offline SVG map. The truck position is a function of `progress` (0..1); replace `ROUTE` and the `progress` prop with Amazon Location Service data later.
- The simulator uses the same `calc.ts` and rates as the real pages, but never writes to the demo database.
- `src/components/Charts.tsx` holds `Bars` (SVG bar chart, grouped or single), `HBars`, `Strip`, `Panel` and `Tabs`, used across the landing page and all dashboards.
