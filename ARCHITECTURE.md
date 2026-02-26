# Architecture Decisions

This document explains **WHY** Clawboard is built the way it is. For **WHAT** the rules are, see [CONTRACTS.md](./CONTRACTS.md).

Each decision includes what would make us change our mind. Architecture should evolve, not fossilize.

---

### Why Preact+HTM over Lit/Vanilla/React

**Decision:** Preact 10 + HTM 3 (~5KB vendored)

**Why:** Shadow DOM breaks Android WebView + Telegram Mini App. React is 40KB, Preact is 4KB with the same API. HTM = tagged templates, no JSX build step. AI agents write best React/Preact (most training data of any framework).

**Considered:** Vanilla JS (too limited for v3+ forms/CRUD), Lit (Shadow DOM breaks WebView), React (too heavy), Svelte (less AI training data, needs compiler)

**Would change if:** Preact stops being maintained, or a lighter framework with equal AI training coverage emerges.

---

### Why CJS server / ESM browser

**Decision:** api.js + routes + hooks = CommonJS. ui.js + test.js = ESM.

**Why:** Node Express ecosystem is CJS-native. Browsers are ESM-native. Mixing them creates real bugs. Keeping them separate is intentional.

**Considered:** All-ESM (Node ESM support is still rough for Express plugins), All-CJS (browsers need ESM for imports)

**Would change if:** Node ecosystem fully migrates to ESM (unlikely before v3).

---

### Why panels are vertical slices

**Decision:** Each panel = folder with manifest.json + api.js + ui.js + test.js

**Why:** AI agents can understand one folder completely without loading the whole codebase. Adding a panel = adding a folder, no touching core. Removing = deleting a folder, nothing breaks. Each file has a single clear purpose.

**Considered:** Monolithic panels file, component library approach

**Would change if:** Panel count exceeds ~50 and discovery becomes slow (unlikely — lazy loading planned for v4).

---

### Why no build step

**Decision:** No webpack, no Vite, no bundler. ESM imports in browser, CJS in Node.

**Why:** AI agents can't reliably run build tools. Debugging bundled code is harder for both humans and AI. ESM imports work natively in all modern browsers. "Clone and run" — zero tooling required.

**Considered:** esbuild (fast but adds complexity), Vite (great DX but agents struggle with config)

**Would change if:** Browser ESM performance becomes a bottleneck with 50+ panels (would add optional bundling, never required).

---

### Why SQLite for v3 store

**Decision:** SQLite as default store, adapter pattern for alternatives.

**Why:** Zero setup — single file, ships with Node via better-sqlite3. Matches "clone and run" philosophy. Adapter pattern means swap to PostgreSQL/MySQL without panel code changes.

**Considered:** PostgreSQL (overkill for single-user dashboards), JSON files (no queries), LevelDB (less familiar to AI agents)

**Would change if:** Multi-user concurrent writes become a requirement (v5 team features may need PostgreSQL adapter).

---

### Why hooks are all async

**Decision:** Every hook handler is async. Sync functions auto-wrapped.

**Why:** One sync hook blocks the entire server event loop. Async by default is safe. Plugin authors don't need to think about it — write sync or async, both work. Filter chains use `await` uniformly.

**Considered:** Sync-only (simpler but dangerous), mixed sync/async (confusing edge cases)

**Would change if:** Never. This is a safety decision.

---

### Why cls() instead of CSS-in-JS or CSS modules

**Decision:** `cls('metric')` → `'p-cpu-metric'` — simple string prefix function.

**Why:** Zero runtime cost (just string concatenation). No build step needed. Predictable output — AI agents and humans can read the generated class names in DevTools. Namespace isolation without Shadow DOM.

**Considered:** CSS Modules (need bundler), styled-components (runtime overhead + build step), Shadow DOM (breaks WebView), BEM manual naming (error-prone, verbose)

**Would change if:** A zero-build CSS scoping solution with better DX emerges.

---

### Why capabilities field exists

**Decision:** Panels declare `capabilities: ["fetch"]` in manifest. Core validates against current version.

**Why:** Prevents "works on my machine" — a v3 panel needing `store` won't silently fail on v2. Forward-compatible: new capabilities added per version without breaking existing panels. Clear error messages at startup.

**Considered:** No validation (let it fail at runtime), version field only (too coarse — a panel might need store but not pages)

**Would change if:** Capability list exceeds ~10 items (would group into capability sets).
