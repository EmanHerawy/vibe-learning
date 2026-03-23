# Progress Log

## Current Position
- Last lesson: Solana core mental model (accounts, programs, System Program, parallelization)
- Last session: 2026-03-23
- Next up: Resolve 3 gaps → advance to PDAs

---

## Learning Roadmap

> Derived from: Solana Bootcamp transcript (~3.5h, 4 projects) + rareskills.io/solana-tutorial + Rektoff security roadmap
> Tailored for: EVM/Rust/Polkadot background, targeting Solana developer + security auditor role
> Depth: Beginner → Intermediate → Advanced per topic. Ask before going deeper.

### Phase 1 — Solana Core Mental Model
| # | Topic | Bootcamp Ref | Status |
|---|-------|-------------|--------|
| 1.1 | Accounts model vs Ethereum | ~0:00-0:12 | 🔄 PARTIAL (3 gaps) |
| 1.2 | Program Derived Addresses (PDAs) | ~0:09-0:12, rareskills | ⏳ next |
| 1.3 | Transactions & Instructions anatomy | ~0:07 | ⏳ |
| 1.4 | Rent, space, and account sizing | ~2:37 | ⏳ |

### Phase 2 — Anchor Framework & First Program
| # | Topic | Bootcamp Ref | Status |
|---|-------|-------------|--------|
| 2.1 | Anchor project structure & macros | ~0:11-0:15 | ⏳ |
| 2.2 | Project: Favorites (save/update on-chain data) | ~0:12-0:45 | ⏳ |
| 2.3 | Deploying to Devnet, Solana Explorer | ~0:30-0:35 | ⏳ |
| 2.4 | Testing Anchor programs | ~0:33 | ⏳ |

### Phase 3 — Intermediate Programs
| # | Topic | Bootcamp Ref | Status |
|---|-------|-------------|--------|
| 3.1 | Local dev setup (Anchor CLI, Solana CLI) | ~1:00 | ⏳ |
| 3.2 | Project: Voting DApp (multi-PDA, constraints) | ~1:00-1:45 | ⏳ |
| 3.3 | CPI — Cross-Program Invocation | rareskills | ⏳ |
| 3.4 | SPL Tokens & Token Program | rareskills | ⏳ |

### Phase 4 — Full-Stack DApps
| # | Topic | Bootcamp Ref | Status |
|---|-------|-------------|--------|
| 4.1 | Solana Actions & Blinks | ~2:00-2:30 | ⏳ |
| 4.2 | Project: CRUD App / Journal (full-stack) | ~2:34-3:24 | ⏳ |
| 4.3 | Frontend: wallet adapter, account queries | ~3:00-3:24 | ⏳ |

### Phase 5 — Security Auditor Track
> Source: Rektoff Security Roadmap for Solana
| # | Topic | Status |
|---|-------|--------|
| 5.1 | Solana-specific attack surface overview | ⏳ |
| 5.2 | Account validation vulnerabilities | ⏳ |
| 5.3 | Missing signer / owner checks | ⏳ |
| 5.4 | PDA seed collisions & arbitrary CPI | ⏳ |
| 5.5 | Re-initialization attacks | ⏳ |
| 5.6 | Integer overflow / arithmetic bugs | ⏳ |
| 5.7 | Reading & auditing real Solana programs | ⏳ |
| 5.8 | CTF / audit challenges | ⏳ |

---

## Session History

| # | Date | Topic | Goal | Status | Notes File |
|---|------|-------|------|--------|------------|
| 1 | 2026-03-23 | Solana core mental model | Understand accounts, programs, System Program, why explicit accounts | 🔄 PARTIAL | sessions/2026-03-23.md |
