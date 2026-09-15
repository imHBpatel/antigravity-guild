# 📜 Living Decision Log (ADRs)

## ADR-001: Sovereign Living Memory Bank
- **Date:** 2026-09-15
- **Status:** Accepted
- **Context:** AI coding agents frequently experience session amnesia across chat turns, losing track of the active task, architectural constraints, and next steps.
- **Decision:** Establish a version-controlled living memory bank in `.openguild/` with structured files (`active_task.md`, `system_patterns.md`, `decision_log.md`).
- **Consequences:** Autonomous task continuity across chat windows and team-wide architectural alignment.
