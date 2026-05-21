# Propel Stack AI — Life OS

The AI personal assistant for your whole life.
Company: Propel Stack AI, LLC.

This repository is built session by session per the Claude Build Guide.

## What's in this scaffold (Session 1.5)

Project skeleton with everything the feature sessions need to plug into:

- **Frontend** — React 18 + TypeScript + Vite + Wouter (hash routing) + TanStack Query v5 + Tailwind
- **Backend** — Node.js + Express + TypeScript (bundles to `dist/index.cjs`)
- **Database** — SQLite via `sql.js` (pure-WASM — zero native build, runs on any Node version), versioned migrations, synchronous query surface
- **AI gateway** — single chokepoint at `server/ai-gateway.ts` with token-budget enforcement and crisis/injury detection
- **Reduced-motion CSS** — already at the top of the global stylesheet (seizure safety, Session 6 requirement applied from day one)
- **Branded shell** — header, sidebar, emergency button, brand colors, Cabinet Grotesk + Plus Jakarta Sans via Fontshare

## Hard rules in force

1. Hash routing only — `Router hook={useHashLocation}` in `App.tsx`
2. No browser storage — `localStorage` / `sessionStorage` / `indexedDB` / cookies are never used
3. TanStack Query v5 object form — `useQuery({ queryKey: [...], queryFn: ... })`
4. `apiRequest()` returns parsed JSON — callers never call `.json()`
5. SQLite is synchronous — `.get()` for single rows, `.all()` for arrays, no `await`

(Rule 5 applies through Session 7. Session 8 migrates to Postgres and switches to async.)

The DB engine is `sql.js` (WebAssembly SQLite), wrapped to keep the synchronous
`.get()`/`.all()`/`.run()` surface. The only async step is a single `initDb()` at
startup (loads the WASM module); the in-memory image is persisted to `data/propel.db`
on a debounced write after each change.

## Local development

```bash
# 1. Install (one-time)
npm install
cd client && npm install && cd ..

# 2. Copy env template
cp .env.example .env

# 3. Run server + client together (port 5000 + 5173)
npm run dev
```

Open <http://localhost:5173>. The Vite dev server proxies `/api/*` to the Express server on port 5000.

## Production build

```bash
npm run build    # bundles client to client/dist and server to dist/index.cjs
npm start        # serves both from port 5000
```

## Layout

```
propel-stack-app/
├── server/
│   ├── index.ts          # Express entry, mounts routes
│   ├── db.ts             # sql.js (WASM SQLite) + migrations; sync surface, async init
│   └── ai-gateway.ts     # All AI calls go through here
├── client/
│   ├── index.html        # Fontshare links
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx       # Hash-routed Switch
│   │   ├── components/
│   │   │   ├── AppLayout.tsx
│   │   │   └── PagePlaceholder.tsx
│   │   ├── pages/        # One file per route; expanded session by session
│   │   ├── lib/
│   │   │   ├── apiRequest.ts
│   │   │   └── queryClient.ts
│   │   └── styles/
│   │       └── globals.css  # Reduced-motion rules FIRST
│   └── vite.config.ts    # Proxies /api to Express
├── data/                 # SQLite image (sql.js) persisted here (gitignored)
├── package.json
└── tsconfig.json
```

## What's next

Session 2 — Personal CRM. The route, navigation entry, and placeholder are already wired; Session 2 expands the page into a working capture + list + detail flow with `contacts` and `contact_interactions` tables added via migration.
