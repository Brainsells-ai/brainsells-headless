# Latest Phase Hand-off

This file always points to the most recent phase memo. Read it at the
start of any new Claude Code session to know where the project is.

**Current latest:** [handoff-phase-3.md](./handoff-phase-3.md) — Phase 3
(PDP), merged 2026-05-12.

| Phase | Memo | PR | Merge commit | Status |
|---|---|---|---|---|
| 3 — PDP implementation | [handoff-phase-3.md](./handoff-phase-3.md) | #12 | `4d1e896` | ✅ merged |
| 3 — Prep infrastructure | [handoff-phase-3.md](./handoff-phase-3.md) | #11 | `7d46f0c` | ✅ merged |
| 2 — Homepage | [handoff-phase-2.md](./handoff-phase-2.md) | #5 | `c6c679e` | ✅ merged |
| 1.5b — Payload bootstrap | [handoff-phase-1.5b.md](./handoff-phase-1.5b.md) | #4 | `2de0ab8` | ✅ merged |
| 1.5a — Playwright scaffolding | [handoff-phase-1.5a.md](./handoff-phase-1.5a.md) | #3 | `8d5c741` | ✅ merged |
| 1 — Layout system | [handoff-phase-1.md](./handoff-phase-1.md) | #2 | `82dcb34` | ✅ merged |
| 0 — Setup | (no memo) | #1 | `a3c7c0f` | ✅ merged |

## Build-pipeline hotfixes (Phase 2 series)

Three small CI / Vercel infrastructure fixes that landed alongside Phase 2 to
unblock `main`:

| PR | Commit | Fixes |
|---|---|---|
| #6 | `f099b61` | `turbo.json` env declarations — Vercel build |
| #7 | `6e283ac` | `.github/workflows/test.yml` env block — CI build step |
| #8 | `2bb8c47` | `pnpm <script> -- <args>` forwarding bug — CI Playwright step |

See "The build-pipeline incident" section of `handoff-phase-2.md` for the
full sequence.

## Update protocol

When closing a phase: bump the "Current latest" pointer + add a row to the
table here. The full narrative belongs in `handoff-phase-N.md`, not this
file.
