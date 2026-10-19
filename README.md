# KabadiLink

> **Turn your waste into cash.**
>
> KabadiLink is a role-based waste collection and recycling marketplace prototype for households, collectors, recyclers, and operations administrators. It models the complete journey from segregating waste and requesting a pickup to doorstep weigh-in, household payout, Green Points, inventory creation, and recycler purchase.

[![Live demo](https://img.shields.io/badge/Live%20demo-AWS%20Amplify-orange?logo=amazon-aws)](https://main.d1xs42dc227atv.amplifyapp.com/)
[![Built with React](https://img.shields.io/badge/Built%20with-React%20%2B%20TypeScript-3178C6?logo=typescript)](https://react.dev/)
[![Bundled with Vite](https://img.shields.io/badge/Bundled%20with-Vite-646CFF?logo=vite)](https://vitejs.dev/)

## Live application

**Open KabadiLink:** [https://main.d1xs42dc227atv.amplifyapp.com/](https://main.d1xs42dc227atv.amplifyapp.com/)

The deployed build currently presents the demo experience with an **“Demo fallback · Offline”** indicator when the configured AWS API is unavailable or when the application is intentionally running without a backend. This is expected: the frontend is designed to remain explorable using seeded local data while clearly distinguishing demo data from live API data.

## Product overview

KabadiLink connects four participants in one waste-value loop:

| Role | Main responsibility | Available experience |
| --- | --- | --- |
| **Household** | Sort waste, schedule pickups, track collection, receive money and points | Dashboard, pickup scheduling, history, workflow tracking, rewards and points ledger |
| **Collector** | Discover nearby requests, accept jobs, travel to households and weigh waste | Overview, request queue, pickup status actions, weigh-in, payout calculation and inventory |
| **Recycler** | Purchase sorted material lots created after collection | Marketplace filters, available lots, purchase flow and orders |
| **Admin** | Inspect operations and adjust pilot configuration | KPI dashboards, rates and points configuration, user management, audit trail and demo reset |

The public landing experience also explains segregation rules for plastic, wet waste, and e-waste; displays rates and points; shows the workflow; and includes an interactive simulator that demonstrates the same pickup state on household and collector phone mockups.

## Feature walkthrough

### Public landing page

The home page is the product narrative and demo entry point. It includes:

- Hero section with calls to schedule a pickup, open the simulator, explore the workflow, or sign in.
- Live-looking rates and points table driven by `src/config.ts` and the shared calculator.
- “How it works” steps from segregation through recycler purchase.
- A read-only workflow view showing the same pickup record from request through sale.
- Impact charts based on completed seeded pickups.
- Three-bag segregation guide for plastic, wet waste, and e-waste.
- Role responsibility matrix for households, collectors, recyclers, and admins.
- FAQ content and role-specific sign-in entry points.

### Interactive simulator

The simulator is a 48-second, deterministic product story. It is intentionally implemented as a pure state derivation rather than as a collection of unrelated animations:

- `src/sim.ts` defines the timeline, chapters, captions, backend event log, sample weights, and `derive(t, cfg)`.
- Household and collector phone views read the same derived state, keeping the two screens synchronized while playing, pausing, seeking, replaying, or changing speed.
- The simulator also renders recycler and admin consoles, a run-of-show table, and a backend event stream.
- Backend markers such as `createPickup`, `acceptPickup`, `recordWeighIn`, and `purchaseLot` make the intended production integration visible.
- `src/components/RouteMap.tsx` provides an offline SVG route map with a deterministic truck position.

### Household flow

A household can:

1. Select plastic, wet waste, and/or e-waste.
2. Enter estimated weights and see cash and Green Points estimates.
3. Choose a date, time slot, address, and optional instructions.
4. Request or cancel a pickup when the status permits.
5. Follow the workflow from request to acceptance, travel, weigh-in, payment, and recycler sale.
6. Review pickup history and actual versus estimated weights.
7. View the points balance, tier progress, badges, scratch cards, rewards catalog, redemptions, and ledger.

Wet waste is points-only and is limited by the configured daily household cap. Plastic and e-waste create cash payouts; all supported categories contribute points.

### Collector flow

Collectors can:

- Toggle online/offline status.
- Review nearby unassigned requests.
- Accept or decline requests.
- Mark an accepted pickup as “On the way”.
- Record separate weigh-in values for each material.
- See the calculated cash payout and points before confirming.
- Create plastic and e-waste lots automatically after a successful weigh-in.
- Review collected kilograms, completed pickups, activity, inventory, and sales history.

### Recycler marketplace

Recyclers can filter available lots by:

- Material category.
- Minimum kilograms.
- Maximum asking price per kilogram.
- Location.

Each lot includes its identifier, material, quantity, asking rate, total price, supplier, location, and quality label. Purchasing a lot changes its state to sold and creates an order record.

### Admin operations

The demo admin console exposes:

- Household, collector, recycler, pickup, cash-out, revenue, and reward-liability KPIs.
- Pickup status and material-volume charts.
- Daily pickup and margin views.
- Configurable buying rates, points-per-kilogram, and other pilot values.
- User search, role filtering, activation toggles, and status inspection.
- Recent pickup event audit trail.
- A complete demo-data reset action.

The UI explicitly labels mock prices and demo values as placeholders; it does not claim production revenue, compliance certification, or verified EPR certificates.

## Architecture

KabadiLink is a client-rendered React application with a clean seam between UI, shared domain calculations, and API integration.

```text
Browser
  |
  v
src/main.tsx
  |
  +-- HashRouter
        |
        +-- src/App.tsx                 routes, shell, role guards, navigation
        |
        +-- src/pages/Public.tsx        landing page and demo sign-in
        +-- src/pages/Household.tsx     household dashboard, schedule, history, rewards
        +-- src/pages/Roles.tsx         collector, recycler, and admin consoles
        +-- src/pages/Detail.tsx        pickup detail view
        +-- src/pages/Shared.tsx        notifications and profile
        +-- src/pages/Simulator.tsx     synchronized product-story simulator
        |
        +-- src/api.ts                  API client, local database, demo seed, mutations
        +-- src/calc.ts                 payouts, points, tiers, margin, liability
        +-- src/config.ts               categories, rates, tiers, catalog, route constants
        +-- src/types.ts                shared domain types
        +-- src/sim.ts                  pure simulator state machine
        |
        +-- src/components/
              Charts.tsx                 SVG charts, stat strips, panels, tabs
              RouteMap.tsx               offline SVG route and truck position
              Workflow.tsx               pickup lifecycle viewer
              ui.tsx                     theme toggle, clock, simulator navigation
        |
        +-- localStorage: kabad​ilink-db-v1
        +-- optional AWS API Gateway + Lambda backend
```

### Runtime and data flow

1. `src/main.tsx` mounts the application inside `HashRouter`, which keeps the static Amplify deployment compatible with client-side navigation.
2. `src/App.tsx` defines the public routes, role-specific routes, common shell, navigation, and role guards.
3. Pages read the shared database through `useDb()` and call mutations through the `api` object exported by `src/api.ts`.
4. `src/api.ts` first attempts the configured API Gateway base URL when one is available. If the request fails and demo fallback is enabled, it restores or uses seeded data and labels the source as demo. When fallback is disabled, backend failures are surfaced as unavailable instead of silently replacing live data.
5. Local demo state is persisted in `localStorage` under `kabadilink-db-v1`; browser-tab storage events synchronize changes between tabs.
6. `src/calc.ts` is the single calculation layer for cash, points, tiers, wet-waste caps, recycler margins, and reward liability. Pages do not independently reimplement payout rules.
7. The simulator uses `derive(t, cfg)` from `src/sim.ts` and never writes its story state into the demo database.

## Repository layout

```text
.
├── index.html                 Vite HTML entry point and Google Fonts
├── package.json               scripts and runtime dependencies
├── package-lock.json          reproducible npm dependency tree
├── vite.config.ts             Vite + React plugin configuration
├── tsconfig.json              TypeScript compiler configuration
├── .env.example               documented API and fallback variables
├── src/
│   ├── main.tsx               React bootstrap and HashRouter
│   ├── App.tsx                routing, shell, navigation, role guards
│   ├── api.ts                 API adapter, demo database, seed data, mutations
│   ├── calc.ts                shared business calculations
│   ├── config.ts              rates, categories, slots, tiers, rewards
│   ├── sim.ts                 deterministic simulator state derivation
│   ├── types.ts               domain model interfaces and unions
│   ├── index.css              complete visual system and responsive styles
│   ├── components/
│   │   ├── Charts.tsx         SVG charts and reusable data-display primitives
│   │   ├── RouteMap.tsx        offline map and route interpolation
│   │   ├── Workflow.tsx        pickup lifecycle visualization
│   │   └── ui.tsx              shared UI helpers
│   └── pages/
│       ├── Public.tsx         landing page and sign-in
│       ├── Household.tsx      household product area
│       ├── Detail.tsx         pickup detail
│       ├── Roles.tsx          collector, recycler, and admin areas
│       ├── Shared.tsx         notifications and profile
│       └── Simulator.tsx      interactive simulator
├── test-workflow.mjs          integration-style fallback, workflow, build, and TypeScript suite
├── test-api.mjs               basic API Gateway pickup-list probe
├── test_boto3.py              DynamoDB Decimal serialization experiment
└── dist/                      generated Vite production output
```

`node_modules/` is a generated dependency directory and should not be treated as application source. `dist/` is also generated by the production build and can be regenerated at any time.

## Technology stack

- **Language:** TypeScript, with small JavaScript and Python utility/test scripts.
- **UI:** React with JSX/TSX.
- **Routing:** React Router with `HashRouter`.
- **Build tool:** Vite and `@vitejs/plugin-react`.
- **Charts and map:** Custom SVG/HTML components; no charting or mapping SaaS is required for the demo.
- **State:** A lightweight external-store pattern using `useSyncExternalStore`, backed by an in-memory database and `localStorage` persistence.
- **Backend integration seam:** JSON requests through `fetch` to an AWS API Gateway base URL, with the documented endpoint currently targeting the `ap-south-1` region.
- **Deployment:** Static frontend deployment on AWS Amplify.
- **Typography:** Google Fonts using EB Garamond and Figtree, configured in `index.html`.

## Getting started

### Requirements

- Node.js with npm.
- A modern browser.
- AWS credentials are **not** required for the default offline demo.

### Install and run the development server

```bash
git clone https://github.com/bhanushaliparthhitesh/kabadilink.git
cd kabadilink
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

### Production build and preview

```bash
npm run build
npm run preview
```

### Run the automated workflow suite

```bash
npm test
```

The `test` script runs `test-workflow.mjs`, which starts a local mock HTTP server and Vite SSR module loader, then checks backend success, HTTP failure fallback, unreachable-backend fallback, collector filtering, empty API results, collector actions, weigh-in and lot creation, honest fallback-disabled behavior, household actions, TypeScript compilation, and the production Vite build.

For a direct API Gateway pickup-list probe, run:

```bash
node test-api.mjs
```

That script targets the API URL hard-coded for the current prototype and should only be used when the endpoint is available.

## Environment variables

Copy the example file when configuring a local or Amplify build:

```bash
cp .env.example .env.local
```

| Variable | Purpose | Example |
| --- | --- | --- |
| `VITE_API_BASE_URL` | API Gateway base URL. Leave empty for fully offline demo mode. | `https://xzox8eatg9.execute-api.ap-south-1.amazonaws.com` |
| `VITE_ENABLE_DEMO_FALLBACK` | Allows local seeded data when the configured API is unreachable or returns an error. | `true` |

Important Vite security rule: only variables prefixed with `VITE_` are exposed to browser code and embedded into the build. **Never put AWS access keys, private tokens, passwords, or other secrets in `.env.local` or Amplify frontend environment variables.**

### AWS Amplify configuration

In the Amplify app settings, add the variables above under **App settings → Environment variables**, then trigger a new build. Vite embeds these values at build time, so changing an Amplify environment variable does not change an already-published static bundle until it is rebuilt and redeployed.

## Demo accounts

The public sign-in screen is intentionally passwordless for the prototype. Choose a role and a seeded user, then sign in:

- **Household:** examples include Asha Verma, Rohit Sharma, and Priya Singh.
- **Collector:** examples include Ramesh Prasad, Imran Sheikh, and Lakshmi Bai.
- **Recycler:** examples include GreenLoop Recyclers and Noida PlastiCycle.
- **Admin:** use the **Demo admin account** button on the sign-in page.

The seeded dataset creates households, collectors, recyclers, demo pickups, ledger entries, lots, orders, notifications, and rewards so each dashboard is populated on first load.

To reset the browser-local demo state, use the admin **Reset demo data** action or clear the `kabadilink-db-v1` local-storage key.

## Configuration and domain rules

Pilot values are centralized in `src/config.ts`. The current prototype includes:

- Plastic, wet waste, and e-waste categories.
- Three pickup slots: `8–10 AM`, `10 AM–12 PM`, and `4–6 PM`.
- Category cash rates and points-per-kilogram.
- A wet-waste daily cap.
- Green Point tiers and multipliers.
- Reward catalog items such as UPI cashback and mobile recharge.
- Recycler asking rates and collection-cost placeholders.

`src/calc.ts` applies these rules consistently:

- Wet waste is capped at the configured daily limit.
- Cash is calculated for plastic and e-waste; wet waste is points-only.
- Points use the active tier multiplier plus streak and quality bonuses.
- Completed weigh-ins add ledger entries and create saleable plastic/e-waste lots.
- Recycler margin is calculated as sell price minus household buying rate minus collection cost.
- Reward liability is estimated from the points ledger and configured point value.

The values are explicitly marked in the source as pilot placeholders. They should be validated with real collection economics before production use.

## Backend integration roadmap

The frontend already exposes a clear replacement seam for production services. Pages call `api.*`; they do not need to know whether the result came from AWS or the demo store.

The `backend here (...)` markers identify intended service boundaries, including:

- `createPickup` and pickup retrieval.
- Nearby collector discovery and notifications.
- Conditional pickup acceptance so only one collector claims a request.
- Status transitions such as accepted, on-the-way, and weigh-in.
- Atomic payout and Green Point ledger writes.
- Lot creation and conditional lot purchase.
- Notifications and live collector location.
- Admin statistics, configuration, and audit views.

The simulator references AWS-oriented concepts such as API Gateway, Lambda, DynamoDB, SNS, and Amazon Location Service as the intended production architecture. The current repository, however, is primarily a frontend prototype with mock/local behavior and should not be described as a complete production backend.

## Current limitations and important caveats

- The public sign-in is a mock role selector; no password or real Cognito authentication is implemented.
- Demo data and most fallback mutations are local-only and are not persisted to AWS.
- The API adapter supports the configured JSON endpoints, but the complete backend implementation is not present in this repository.
- Photo selection in the household scheduling flow records file names only; uploading requires backend/storage work.
- The route map is a stylized offline SVG. Replace it with Amazon Location Service route and location data for production.
- Notification delivery is represented locally in demo mode; real push delivery requires an AWS notification integration.
- Prices, costs, reward values, tier multipliers, contact details, and policy links include placeholders.
- The marketplace quality field is currently not a verified grading or compliance system.
- The EPR certificate area is intentionally a tracking placeholder and makes no compliance claim.
- `dist/` and `node_modules/` are generated artifacts; source changes should be made under `src/` and rebuilt.

## Development notes

- Keep business rules in `src/calc.ts` and configuration in `src/config.ts`; do not duplicate payout calculations inside pages.
- Keep UI components data-driven so the simulator and real dashboards can share charts and workflow views.
- Preserve the `dataSource` indicator when adding backend calls so users can distinguish live, demo, and unavailable states.
- When adding API integrations, handle both an empty successful response and an error response. An empty live pickup list must remain empty rather than being replaced by mock records.
- Keep demo fallback messages honest: local actions should say “Demo · Local only” and must not imply AWS persistence.
- Run `npm test` and `npm run build` before publishing a change.

## License

No license is currently declared in the repository. Add a license file before distributing KabadiLink outside the project or using it as a shared dependency.

## Questions to explore next

- How should the AWS API and DynamoDB schema implement idempotent weigh-ins and conditional lot purchases?
- What authentication, authorization, and audit requirements should replace the passwordless role selector?
- Which pilot rates, tier multipliers, reward costs, wet-waste cap, and recycler margins should replace the current placeholders?
