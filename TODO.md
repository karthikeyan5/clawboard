# Velboard — Future Improvements

## Sessions Panel
- [ ] Show running sub-agents (currently ephemeral, not in sessions.json — needs live OpenClaw session API query)
- [ ] Sub-agent progress tracking (task description, runtime, status)
- [ ] Session search/filter

## General
- [ ] Error toast/notification system for panel fetch failures (currently silent)
- [ ] Deploy verification hook — auto-test panels after restart (see vel-project-notes/queue/06-deploy-verification-error-hooks.md)
- [ ] Panel loading skeleton/shimmer instead of blank state

## History / Tracking
- 2026-03-06: Sessions panel — added collapsible groups, user info, model chips
- 2026-03-06: Token-swap + updates panels — fixed r.ok checks, error logging
- 2026-03-06: All panels — fixed Telegram Mini App compatibility (api.fetch header fix was in Vel core)
