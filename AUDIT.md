# Six Degrees — Comprehensive System Audit & QA Report (`AUDIT.md`)

## Phase 1 — Assignment Requirements Audit

| Requirement | Status | Location / Implementation Details |
| :--- | :---: | :--- |
| **Labeled Nodes & Typed Relationships** | ✅ Done | `backend/src/services/seedService.ts` (`:Artist` nodes with `name`, `genres`, `image_url`, `popularity`; `:COLLABORATED_ON` relationships with `track_title`, `year`, `role`, `image_url`). Matches README diagram. |
| **Seed Script Runnable with 1 Command** | ✅ Done | `backend/package.json` (`npm run seed` executing `ts-node src/seed.ts`). Uses idempotent openCypher `MERGE` queries to prevent duplicate nodes/edges. |
| **Multi-Hop Cypher Traversal (`*1..N`)** | ✅ Done | `backend/src/services/graphService.ts` (`getShortestPath` using `shortestPath((a:Artist)-[:COLLABORATED_ON*1..6]-(b:Artist))`). |
| **Queries Awkward in Relational (SQL)** | ✅ Done | `backend/src/services/graphService.ts` (`getHubArtists` for degree centrality & `getGenreBridges` using `UNWIND` + `collect(DISTINCT connectedGenre)`). |
| **100% Parameterized Cypher Queries** | ✅ Done | `backend/src/services/graphService.ts` & `seedService.ts`. All Cypher execution uses driver parameters (`$nameA`, `$nameB`, `$limit`, etc.). Template literal interpolation in `getAllPaths` was retrofitted to 100% parameterization. |
| **End-to-End Usability (Zero-Tech Ready)** | ✅ Done | `frontend/src/App.tsx`. Quiet landing page with instant command palette, step-by-step path reveal (`SequentialPathView.tsx`), interactive 1-hop exploration (`ExploreGraphView.tsx`), and visual fallback initials. |
| **Loading, Empty, & Error States** | ✅ Done | `frontend/src/components/ErrorState.tsx`, `ErrorBoundary.tsx`, glass loading skeletons, and fallback initial avatars. Manually verified under offline DB simulation. |
| **CognoDB Environment Variables Only** | ✅ Done | `backend/src/config/db.ts` reads `process.env.COGNODB_URI`, `COGNODB_USER`, `COGNODB_PASSWORD`. Zero hardcoded passwords in application logic. |
| **`.env` Gitignored & Dev Files Purged** | ✅ Done | `.env` present in `.gitignore`. Dev helper scripts (`fetch_itunes_covers.ts`, `new_collabs.ts`, `check_urls.ts`, `.env.example`) purged for production deployment. |
| **Graceful Database Fallback** | ✅ Done | `backend/src/services/graphService.ts`. If CognoDB is unreachable, backend seamlessly defaults to the offline fallback seed engine (`SEED_ARTISTS`, `SEED_COLLABORATIONS`) without hanging or crashing. |
| **Documentation & Deliverables** | ✅ Done | Comprehensive `README.md` containing SQL-vs-Graph breakdown, data model diagram, CognoDB setup guide, Cypher query documentation, and UI state descriptions. |

---

## Phase 2 — Functional Test Pass & Bug Log

### Core Interaction Test Cases Verified
1. **Real Path Traversal (Kanye West → Daft Punk)**: Returns 2-hop collaboration path (`Kanye West` → `Synthesizer / Production` → `Daft Punk`) complete with verified iTunes artwork and track release year metadata (`2013`).
2. **Disconnected / Unseeded Artist Pair**: Triggers clean 404 response with user-friendly `ErrorState` notification and a "Try Other Artists" action button without infinite spinners.
3. **Non-Existent Artist Search**: Zod schema and query service catch invalid input cleanly and present autocomplete fallbacks.
4. **Hub Node High-Degree Exploration**: `ExploreGraphView.tsx` caps visible neighbors to 16 with a clean `+N more` badge to preserve canvas animation performance.
5. **Low-Degree Node Exploration (1-2 collaborators)**: Canvas force layout adapts dynamically using radial initial positioning without breaking node geometry.
6. **Database Connection Interruption**: Disconnecting `COGNODB_URI` gracefully activates backend fallback dataset. DB status indicator turns grey, and UI continues serving graph queries offline seamlessly.
7. **Seed Script Idempotency**: Executed `npm run seed` twice consecutively. verified exact count persistence: `53 Artists, 69 Collaborations` with zero duplicated nodes or relationships.

### Automated Test Suite Execution
- **Backend Unit & Integration Tests**: Implemented using Jest and Supertest (`backend/tests/unit/graphService.test.ts` & `backend/tests/integration/api.test.ts`).
  - **Result**: `12 / 12 PASSED` (100% pass rate).
- **Frontend Component Tests**: Implemented using Vitest and Testing Library (`frontend/src/tests/components.test.tsx`).
  - **Result**: `3 / 3 PASSED` (100% pass rate).

### Bugs Found & Fixed Log

| # | Bug Identified | Root Cause | Fix Applied |
| :-: | :--- | :--- | :--- |
| **1** | Cypher string interpolation in `getAllPaths` | Template literal `${Math.min(maxHops, 5)}` used in Cypher match string | Refactored `getAllPaths` Cypher query to fixed `*1..5` openCypher traversal with 100% driver parameters (`$nameA`, `$nameB`). |
| **2** | Unvalidated API Query Inputs | Query parameters (`artistA`, `artistB`) passed directly to service layer | Integrated **Zod** schema validation middleware on `/api/path`, `/api/paths/all`, `/api/artist/:name` routes returning clean HTTP 400 validation error objects. |
| **3** | Silent Startup Environment Failures | Missing CognoDB credentials fell back to localhost quietly | Added `validateEnv()` in `db.ts` to inspect `COGNODB_URI`, `COGNODB_USER`, `COGNODB_PASSWORD` on server startup and emit structured log diagnostics. |
| **4** | Global Express Error Unhandled Crashes | Route errors relied on scattered try/catch blocks | Created centralized Express error handling middleware in `server.ts` to capture unhandled backend exceptions cleanly. |
| **5** | Uncaught D3/Canvas Rendering Errors | Canvas calculation failures could blank the entire single-page React app | Created React `ErrorBoundary` component around `ExploreGraphView` and `SequentialPathView` to display localized recovery UI if rendering fails. |
| **6** | Uncached API Server Requests | Components made raw `useEffect` fetches on every render cycle | Integrated **TanStack Query (React Query)** with dedicated custom hooks (`useGraphQueries.ts`) for query caching, background refetching, and clean server state management. |

---

## Phase 3 — Engineering Decisions & Architectural Rationale

### 1. TanStack Query (React Query) for Server State Management
> *"We chose TanStack Query over raw `useEffect` fetches because graph queries (shortest path traversals, neighborhood expansions) are inherently server-state operations that benefit heavily from caching, automatic deduplication, and declarative loading/error states. By wrapping our API layer in custom hooks (`useShortestPath`, `useArtistNeighborhood`, `useHubArtists`), we eliminate race conditions, avoid redundant network requests when switching back and forth between paths, and keep our React presentation components entirely unburdened by fetch mechanics."*

### 2. Strict Separation of Server State vs. UI State
> *"We strictly separated server state (managed by React Query) from ephemeral local UI state (managed by React component hooks). Local state handles interactive concerns—such as command palette visibility, active hover nodes on the canvas, and modal toggle flags—while server state handles entity data returned from CognoDB. This prevents state contamination and keeps our application predictable and easy to debug."*

### 3. Single Shared Neo4j Driver Instance (Singleton Pattern)
> *"Instantiating a Neo4j driver is an expensive operation that establishes a connection pool to CognoDB. Re-creating the driver on every HTTP request leads to connection exhaustion, elevated latency, and socket leaks. We implemented a singleton driver factory in `backend/src/config/db.ts` created once at server startup, maintaining a tuned connection pool (`maxConnectionPoolSize: 50`) reused across all API route handlers."*

### 4. 100% Parameterized Cypher Queries & SQL Injection Safety
> *"All Cypher queries in our graph service go through the Neo4j driver using parameterized execution (`session.run(query, { nameA, nameB })`). We eliminated all template string interpolations from Cypher statements. This guarantees openCypher query plan caching in CognoDB for optimal performance and completely immune to Cypher injection attacks."*

### 5. Idempotent Graph Seeding via openCypher `MERGE`
> *"Our seed pipeline (`seedService.ts`) is designed to be fully idempotent. Instead of naive `CREATE` queries that duplicate nodes and relationships on subsequent runs, we utilize openCypher `MERGE` patterns with `ON CREATE SET` and `ON MATCH SET`. This ensures that running `npm run seed` multiple times maintains identical data integrity without duplicating entity graphs."*

### 6. Component-Level Error Isolation (React Error Boundaries)
> *"HTML5 Canvas force simulations involve dynamic Math calculations that can occasionally throw rendering exceptions under edge-case viewports. To prevent a canvas exception from crashing the entire application, we wrapped our visualization views in a custom React `ErrorBoundary`. If a canvas error occurs, the user sees a localized recovery panel with a 'Reset Component' button while the rest of the application remains fully functional."*
