# Testing Strategy

This document is the **canonical location** for all testing decisions. For architecture WHY decisions, see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Philosophy

Tests are a safety net, not a tax. Every test should justify its existence by catching a real class of bug. If a test only catches typos that the compiler already catches, delete it.

**Go's type system is the first line of defense.** Struct fields, interfaces, and compile errors catch 60% of what Node.js tests had to catch. Our Go tests focus on the remaining 40%: runtime behavior, integration correctness, and edge cases.

---

## Three Layers

| Layer | What | How | When |
|-------|------|-----|------|
| **0 — Compile + Vet** | Type errors, unused imports, suspicious constructs | `go build` + `go vet` | Every commit (CI) |
| **1 — Unit Tests** | Package-level behavior, edge cases, contracts | `go test ./...` with `-race` | Every commit (CI) |
| **2 — Smoke Test** | Full server: endpoints respond, panels load, auth works | Start binary → curl endpoints → verify JSON | Before release |

### Layer 0: Compile + Vet (automatic)
The Go compiler rejects bad code. `go vet` catches subtle issues (printf format strings, unreachable code, struct tag errors). Both run in CI on every push. Zero configuration.

### Layer 1: Unit Tests
Standard `testing` package. No test frameworks. No assertion libraries.

**Conventions:**
- Test files live next to the code they test: `auth.go` → `auth_test.go`
- Use `t.Run()` subtests for related cases
- Use `t.Parallel()` where safe (no shared state)
- Use `t.Setenv()` for environment variable tests (auto-cleaned)
- Use `os.MkdirTemp()` for filesystem tests (auto-cleaned with `t.Cleanup`)
- Table-driven tests for input/output variations
- `-race` flag in CI catches data races in concurrent code (hooks engine, WebSocket)

**What to test:**
- Auth: HMAC validation, cookie signing/verification, TEST_MODE bypass
- Data: metrics collection returns valid structures
- Hooks: filter chaining, action firing, thread safety, nil handling
- Panels: discovery from core/custom/plugins, override logic, invalid manifests
- Schema: error formatting
- Server: every HTTP endpoint, middleware (gzip, security headers, rate limiting), auth flows

**What NOT to test:**
- Go stdlib behavior (don't test that `json.Marshal` works)
- Simple getters/setters with no logic
- Code that would need mocking 5 dependencies to test one line

### Layer 2: Smoke Test
Not yet implemented. Planned for v3 when the server has more moving parts (store, forms).

Design: start the binary with `TEST_MODE=true`, curl every endpoint, verify HTTP status codes and JSON shape. Shell script, no Go test binary needed.

---

## CI Pipeline

`.github/workflows/test.yml` runs on every push and PR to `main`:

```yaml
- go build .        # Layer 0: compiles
- go test ./... -race -count=1  # Layer 1: unit tests with race detection
- go vet ./...      # Layer 0: static analysis
```

Matrix: Go 1.22, 1.23, 1.24 on ubuntu-latest.

---

## Coverage by Package

| Package | Test File | What's Covered |
|---------|-----------|---------------|
| `internal/auth` | `auth_test.go` | Init, HMAC initData validation, login widget validation, cookie sign/verify, cookie extraction |
| `internal/data` | `metrics_test.go` | System metrics collection returns valid CPU/memory/disk/processes |
| `internal/hooks` | `hooks_test.go` | Single filter, filter chaining, nil data, original unchanged, no-listener passthrough, actions, multiple actions, no-listener emit, concurrent safety |
| `internal/panels` | `registry_test.go` | Core discovery, manifest schema validation, plugin discovery, custom overrides core, plugin override behavior, no/empty plugins dir, invalid manifests, panel list building |
| `internal/schema` | `panels_test.go` | Error formatting with panel ID, fix text, references, uniqueness |
| `internal/server` | `server_test.go` | Root, dashboard, health, mode (normal+test), version, config, panels list, panel data, panel 404, auth POST, dev login (off+on), logout, gzip, security headers, rate limiting, 404, custom routes, theme, custom panels, plugin panels |

**Current count: 45 tests across 6 packages.**

---

## Adding Tests for New Features

When you add a feature:

1. **New endpoint** → add test in `server_test.go` (use `httptest.NewRecorder`)
2. **New data source** → add test in the relevant `data/*_test.go`
3. **New hook behavior** → add test in `hooks_test.go`
4. **New panel discovery logic** → add test in `registry_test.go`
5. **New auth flow** → add test in `auth_test.go`

If your feature doesn't fit any existing test file, create a new `*_test.go` in the same package.

---

## Visual Testing (v3+)

**Decision:** DOM assertions for current version. AI-based visual review for v3+.

**Rejected:** Pixelmatch/screenshot diffing — too brittle for live data dashboards where numbers change every 2 seconds. False positives would train developers to ignore test failures.

**Planned:** When the frontend has forms and multi-page routing (v3-v4), add visual testing via screenshot → vision model comparison. The model understands "this panel should show a form with 3 fields" better than pixel comparison.

---

## Decisions Log

| Decision | Rationale | Date |
|----------|-----------|------|
| Standard `testing` only, no testify/gomega | Zero deps principle. `t.Run` + `if got != want` is sufficient. | 2026-02-27 |
| `-race` flag in CI | Hooks engine and WebSocket broadcast use goroutines. Race detector catches data races that unit tests miss. | 2026-02-27 |
| No mock frameworks | Interfaces + manual test doubles. Keeps tests readable and debuggable. | 2026-02-27 |
| Co-located test files | `auth.go` + `auth_test.go` in same dir. Go convention. No separate `test/` directory. | 2026-02-27 |
| Table-driven tests preferred | Go idiom. Reduces boilerplate for input/output variation tests. | 2026-02-27 |
| No pixelmatch for visual testing | Live data dashboards have changing numbers. Pixel comparison = false positives. AI vision model comparison planned for v3+. | 2026-02-27 |
