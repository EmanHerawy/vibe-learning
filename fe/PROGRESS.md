# Learning Progress

**Subject:** Fe smart contract language (development + security)
**Expert role:** Fe smart contract developer + Fe security auditor
**Started:** 2026-04-10
**Target:** Build and audit production-quality Fe contracts independently — 2026-04-22

## Curriculum Map (fe-lang.org guide + security layer)

| Part | Topic | Status |
|------|-------|--------|
| 1 | Getting started, key concepts, installation | ✅ |
| 2 | Language foundations — primitives, variables, ownership, functions, control flow | ✅ |
| 3 | Ingots & package management | ✅ (practical) |
| 4 | Compound types — tuples, structs (basic), enums, maps | ✅ |
| 5 | Effects & `uses` clause — all 6 effects, ceiling rule, propagation | ✅ |
| 6 | Messages & receive blocks — selectors, handlers, multiple msg types | ✅ |
| 7 | Contracts — declaration, storage, `init`, composition model | ✅ |
| 8 | **Structs & impl blocks** — `impl`, methods, associated functions, storage structs | ✅ |
| 9 | **Traits & generics** — trait definition, implementing, generic functions, bounds | ✅ |
| 10 | Events & logging | ✅ (basic — `#[event]`, `log.emit()`) |
| 11 | Error handling — `assert`, revert, `Option`/`Result` | 🔄 PARTIAL |
| 12 | Testing Fe contracts | ✅ (Fe `#[test]` + Hardhat) |
| 13 | Common patterns — token, allowance, pausable, upgradability | ⬜ |
| 14 | By example — ERC20, NFT, voting, DEX | ⬜ |
| SEC | **Security** — reentrancy (CEI + Mutex + TStorPtr), raw_call risks, delegate risks | ⬜ |

## Lesson Log

| # | Date | Topic | Goal | Status | Session file |
|---|------|-------|------|--------|--------------|
| 1 | 2026-04-10 | Fe v26 complete syntax (12 constructs) | Read effects/uses clause blast radius at a glance | ✅ | sessions/2026-04-10.md |
| 2 | 2026-04-10 | Counter contract from scratch | Write Counter with events + passing Fe test | ✅ | sessions/2026-04-10.md |
| 3 | 2026-04-11 | Escrow contract from scratch | Write Escrow with time-lock release + passing tests | ✅ | sessions/2026-04-11.md |
| 4 | 2026-04-11 | Hardhat integration testing | Test payable ETH behavior; discover #[payable] requires value > 0 | ✅ | sessions/2026-04-11.md |
| 5 | 2026-04-12 | Cross-contract calls — theory | Ctx/Call/Evm traits from source; call.call, call.static, call.delegate, raw_call | ✅ | sessions/2026-04-12.md |
| 6 | 2026-04-13 | Cross-contract calls — Arbiter/Vault | Write Arbiter+Vault from scratch; 7/7 Hardhat tests passing; ETH transfer workaround confirmed | ✅ | sessions/2026-04-13.md |
| 7 | 2026-04-13 | Events | Add #[event] + log.emit() to Vault and Arbiter; FundedEvent, ReleasedEvent, ApproveEvent | ✅ | sessions/2026-04-13.md |
| 8 | 2026-04-17 | Structs & impl blocks | EscrowRecord struct + impl block; storage slot ordering + upgrade safety | ✅ | sessions/2026-04-17.md |
| 9 | 2026-04-17 | Traits & generics | Checkable trait + generic validate(); effects system = traits; uses clause = capability ceiling | ✅ | sessions/2026-04-17.md |
| 10 | 2026-04-24 | Error handling — theory | assert vs revert vs Option vs Result; AbiSize+Encode<A> for custom errors; ownership gotcha on is_ok()/is_none() | 🔄 PARTIAL | sessions/2026-04-24.md |
| 11 | 2026-04-30 | `call.call()` definition + `raw_call` bare-ETH discovery | Confirm `call.raw_call(args_len:0)` as true bare-ETH-send; `message` always required in `call.call()` | ✅ | sessions/2026-04-30.md |
| 12 | 2026-05-12 | Fe 26.1 upgrade + Higher-Kinded Types (HKTs) | Understand 26.1 changes + fix fe-workbook 03-hkts.fe (kind bounds, Functor, Applicative) | ✅ | sessions/2026-05-12.md |

## Current Position
- Last lesson: Fe 26.1 upgrade + Higher-Kinded Types (HKTs) ✅
- Last session: 2026-05-12
- Goal status: ✅ ACHIEVED
- Next up: **Part 11 — Error handling (practice)** — write `try_deposit()` + `try_release()` using new 26.1 `#[error]` + `assert_msg`; run `fe test`
- After that: fe-workbook `04-borrows.fe`; then **Security — reentrancy** (CEI + Mutex)
- Open questions: 0

## Resume Checklist (start here next session)
- [ ] Write try_deposit() → Result<EscrowError, u256> using `#[error]` + `revert_error()` (no reference)
- [ ] Write try_release() → Result<EscrowError, ()> using `assert_msg`
- [ ] Run fe test — all pass
- [ ] /examiner --session to verify concepts
- [ ] /memory-drill
- [ ] /notes

## Open Questions / Known Limitations
- `call.raw_call(addr, gas, value, args_offset: 0, args_len: 0)` — ✅ fully confirmed: compiles + 7/7 Hardhat tests pass; always `assert(ok)` after calling it
- `selfbalance()` not available in Fe v26.0.0 installed version (found in cloned source, may be newer)
- ~~ETH transfer workaround: `call.call(addr: to, gas: G, value: V, message: SomeMsg::SomeVariant{})` — works for EOAs~~ → superseded by `raw_call(args_len: 0)`

## Archive
Previous sessions (2026-04-08, 2026-04-09) contained inaccuracies and gaps.
Archived to `sessions/archive/` on 2026-04-10. Starting clean.
