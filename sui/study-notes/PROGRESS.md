# Progress Tracker

## Current Position
- Phase: 5 — Audit Readiness
- Week: W15 — Real audit reports + mini design exercises
- Status: ✅ Migration deep-dive ACHIEVED (2026-04-26)
- Last session: 2026-04-26 (deep-dive research ✅ — object versioning, anchor/config pattern, hot potato atomicity, timelock governance, orphaned fields, cross-package deps)
- Next up: W15 — Real audit reports (MoveSecure + OtterSec) + 4 mini design exercises
- Open gaps: 3 — (1) grep-pattern audit technique (Vuln A/B) needs practice rep; (2) TimelockCap hands-on implementation; (3) anchor pattern V1→V2 migration exercise

## Plan Change (2026-04-24)
- W12 + W13 + W14 merged into one session: W13 already done (covered in W11 Part 2); W12 upgrade content alone was too thin
- Merged session covers: upgrade policies, UpgradeCap security, multi-role access control (AdminCap/OperatorCap/MinterCap), multi-sig patterns

## Session Log
| Date | Topic | Goal | Status |
|------|-------|------|--------|
| 2026-04-12 | W7: Collections & Dynamic Fields | Choose correct collection type + explain gas-grief risk | ✅ ACHIEVED (extended) |
| 2026-04-14 | W8: Coin Standard & Token Economics | Trace Coin lifecycle + flag ≥2 TreasuryCap/DenyCap vulnerabilities | ✅ ACHIEVED |
| 2026-04-15 | W9: Events, Display & NFT Standards | Design NFT with Display + events + Kiosk/TransferPolicy + Soulbound | ✅ ACHIEVED |
| 2026-04-16 | W10: PTBs & Testing | Decompose DeFi PTB + write Move test_scenario tests | ✅ ACHIEVED |
| 2026-04-17 | W11 Part 1: Gas Model & Performance | Explain gas model + spot 2 optimization opportunities | ✅ ACHIEVED |
| 2026-04-18 | W11 Part 2: Cryptography & BCS | Explain sig verification + encode with BCS + find ≥2 crypto vulnerabilities | ✅ ACHIEVED |
| 2026-04-24 | W12+W14 merged: Upgrade Security & Multi-Role Access Control | Upgrade policies + UpgradeCap security + multi-role caps + build w12_multi_role module | ✅ ACHIEVED |
| 2026-04-26 | Migration Patterns Deep-Dive (research session) | Object versioning, anchor/config pattern, hot potato, timelock governance, orphaned fields, cross-package deps | ✅ ACHIEVED |

## Completed Weeks
- Weeks 1–6: Completed via diagnostic (2026-04-12) — skipped, foundations confirmed solid
- Week 7: Collections & Dynamic Fields — ✅ ACHIEVED (extended session, all gaps resolved)
- Week 8: Coin Standard & Token Economics — ✅ ACHIEVED (2026-04-14, 2 nuance gaps captured as Anki cards)
- Week 9: Events, Display & NFT Standards — ✅ ACHIEVED (2026-04-15, 0 gaps, POC code reviewed)
- Week 10: PTBs & Testing — ✅ ACHIEVED (2026-04-16, 3 passing tests, PTB client-side distinction clarified)
- Week 11: Gas Model + Cryptography/BCS — ✅ ACHIEVED (2026-04-17 + 2026-04-18)
- Week 12+14 (merged): Upgrade Security & Multi-Role Access Control — ✅ ACHIEVED (2026-04-24, score 3.5/5, 12 Anki cards, w12_multi_role module built)

## Extended Plan (Phase 5 — added 2026-04-16 from gap analysis)
- Week 13: Signature verification & BCS encoding (deeper — now partially covered in W11 Part 2)
- Week 14: Multi-sig & upgrade security (Publisher across versions, UpgradeCap)
- Week 15: Real audit reports (MoveSecure + OtterSec) + 4 mini design exercises

## Mini Design Exercises
| Week | Exercise | Status |
|------|----------|--------|
| 3 | Token system: ability design | ⬜ |
| 4 | NFT collection with parent-child relationships | ⬜ |
| 6 | DAO treasury with multi-sig + hot potato voting | ⬜ |
| 9 | NFT marketplace: Kiosk + Transfer Policy + events | 🔄 pending |
