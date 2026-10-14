# 📜 Living Decision Log (ADRs)

## ADR-001: Sovereign Living Memory Bank
- **Date:** 2026-09-15
- **Status:** Accepted
- **Context:** AI coding agents frequently experience session amnesia across chat turns, losing track of the active task, architectural constraints, and next steps.
- **Decision:** Establish a version-controlled living memory bank in `.openguild/` with structured files (`active_task.md`, `system_patterns.md`, `decision_log.md`).
- **Consequences:** Autonomous task continuity across chat windows and team-wide architectural alignment.

## ADR-002: OmniUniverse Multi-Repo Constellation & Crash Recovery Engine
- **Date:** 2026-10-14
- **Status:** Accepted
- **Context:** Software developers and AI coding agents have fragmented visibility across 10-100+ separate repositories. Power cuts and IDE crashes cause disorientation (not knowing what was done vs stopped), while cross-repo context dumps burn hundreds of thousands of tokens and degrade LLM reasoning.
- **Decision:** Implement `lib/universe_mesh.js` providing:
  1. Sub-50ms universal multi-repo discovery across root and parent paths.
  2. Crash-proof flight recorder (`getRecoveryFlightRecorder`) identifying at-risk uncommitted files and in-flight goals.
  3. Hyper-compressed AST symbol & memory paging saving 96%+ LLM context window tokens.
  4. Multi-repo SAIF 2.0 security, uncommitted data loss, and sync drift auditing.
  5. 1-click global brain linking (`linkUniverse`).
- **Consequences:** Zero data loss during unexpected crashes or power failures; complete multi-repo visibility in under 50ms; instant token-efficient cross-repo querying.

