# Progress Log

## Current Position
- Last lesson: Phase 1-4 full review ✅
- Last session: 2026-04-13
- Goal status: ✅ ACHIEVED
- Next up: Phase 8.1 — Solana attack surface overview (Rektoff Security Roadmap)
- Open gaps: invoke_signed hands-on (raw CPI from scratch)

---

## Learning Roadmap

> Sources:
>   - A = "How to Get Started with Solana Dev 2026" (7-day series, transcript/day1–7)
>  -  B = "Full End-to-End Solana Bootcamp" (~3.5h, 4 projects, transcript/full...)
>   - C = rareskills.io/solana-tutorial
>   - D = Rektoff Security Roadmap for Solana
>
> Tailored for: EVM/Rust/Polkadot background, targeting Solana developer + security auditor
> Depth: Beginner → Intermediate → Advanced per topic. Ask before going deeper.

### Phase 1 — Core Mental Model & Tooling
| # | Topic | Source | Status |
|---|-------|--------|--------|
| 1.1 | What is Solana: validators, blocks, SOL, lamports | A-Day1 | ✅ (covered conceptually) |
| 1.2 | Solana CLI & keypairs setup | A-Day1 | ✅ |
| 1.3 | Accounts model: structure, owner, data | A-Day2, B | 🔄 PARTIAL (3 gaps closed) |
| 1.4 | Instructions & transactions anatomy | A-Day2, B | ✅ |
| 1.5 | Sending transactions with Solana Kit (TypeScript) | A-Day2 | ⏸ deferred — cover in Phase 2.4 (Anchor tests) and Phase 6 (frontend) |

### Phase 2 — First Program (Anchor)
| # | Topic | Source | Status |
|---|-------|--------|--------|
| 2.1 | Anchor project structure, macros, build | A-Day3, B | ✅ |
| 2.2 | Account ownership & state storage | A-Day3 | ✅ |
| 2.3 | Writing & deploying first program (mood/favorites) | A-Day3, B | ✅ |
| 2.4 | Testing on Devnet with Solana Explorer | A-Day3, B | ✅ |

### Phase 3 — PDAs, CPIs & Access Control ← MOST IMPORTANT
| # | Topic | Source | Status |
|---|-------|--------|--------|
| 3.1 | PDAs: derivation, seeds, bump, canonical bump | A-Day4, B, C | ✅ (vault-anchor) |
| 3.2 | CPIs: how programs call other programs | A-Day4, C | ✅ (cpi-demo) |
| 3.3 | PDA signing in CPI | A-Day4, C | ✅ (cpi-demo — new_with_signer) |
| 3.4 | Access control: signer checks, ownership checks | A-Day4, D | ✅ |
| 3.5 | Manually constructing instructions | A-Day4 | ✅ |

### Phase 4 — Tokens
| # | Topic | Source | Status |
|---|-------|--------|--------|
| 4.1 | Token model on Solana vs EVM (no deploy needed) | A-Day5 | ✅ |
| 4.2 | Mint accounts & token accounts | A-Day5, C | ✅ (token-minter-anchor) |
| 4.3 | SPL Token Program operations | A-Day5, C | ✅ (token-minter-anchor extended) |
| 4.4 | NFTs & Token-2022 extensions | A-Day5 | ✅ |

### Phase 5 — Under the Hood (Pinocchio & Serialization)
| # | Topic | Source | Status |
|---|-------|--------|--------|
| 5.1 | Serialization/deserialization of account data | A-Day6 | ⏳ |
| 5.2 | Writing a program without Anchor (Pinocchio) | A-Day6 | ⏳ |
| 5.3 | Codecs, raw bytes, account layout design | A-Day6, C | ⏳ |

### Phase 6 — Projects (End-to-End)
| # | Topic | Source | Status |
|---|-------|--------|--------|
| 6.1 | Project: Favorites (PDA basics, Solana Playground) | B ~0:12-0:45 | ⏳ |
| 6.2 | Project: Voting DApp (multi-PDA, constraints) | B ~1:00-1:45 | ⏳ |
| 6.3 | Solana Actions & Blinks | B ~2:00-2:30 | ⏳ |
| 6.4 | Project: CRUD Journal (full-stack + React) | B ~2:34-3:24 | ⏳ |

### Phase 7 — Testing & Production
| # | Topic | Source | Status |
|---|-------|--------|--------|
| 7.1 | Local testing with solana-test-validator | A-Day7 | ⏳ |
| 7.2 | Anchor test framework | A-Day7, B | ⏳ |
| 7.3 | Vibe coding & AI-assisted Solana dev | A-Day7 | ⏳ |

### Phase 8 — Security Auditor Track
> Source: D = Rektoff Security Roadmap for Solana

| # | Topic | Status |
|---|-------|--------|
| 8.1 | Solana-specific attack surface overview | ⏳ |
| 8.2 | Account validation vulnerabilities | ⏳ |
| 8.3 | Missing signer / owner checks | ⏳ |
| 8.4 | PDA seed collisions & arbitrary CPI | ⏳ |
| 8.5 | Re-initialization attacks | ⏳ |
| 8.6 | Integer overflow / arithmetic bugs | ⏳ |
| 8.7 | Auditing real Solana programs | ⏳ |
| 8.8 | CTF / audit challenges | ⏳ |

---

## Session History

| # | Date | Topic | Goal | Status | Notes File |
|---|------|-------|------|--------|------------|
| 1 | 2026-03-23 | Solana core mental model | Understand accounts, programs, System Program, why explicit accounts | 🔄 PARTIAL | sessions/2026-03-23.md |
| 2 | 2026-03-24 | Gap closure + PDAs | Close 3 gaps from session 1 + understand PDAs end-to-end | 🔄 PARTIAL | sessions/2026-03-24.md |
| 3 | 2026-03-24 | Solana CLI & keypairs (1.2) | Set up CLI, keypair management, devnet tooling | ✅ ACHIEVED | sessions/2026-03-24-b.md |
| 4 | 2026-03-24 | Instructions & transactions anatomy (1.4) | Understand instruction/transaction structure, atomicity, blockhash, compute budget | ✅ ACHIEVED | sessions/2026-03-24-c.md |
| 5 | 2026-03-25 | Anchor Phase 2.1 — macros, PDA counter, error codes | Build working Anchor program with PDA-based accounts, custom errors, failure tests | ✅ ACHIEVED | sessions/2026-03-24-d.md |
| 6 | 2026-03-26 | Phase 2.2–2.4 + 3.1 — vault-anchor | SOL vault with deposit (CPI) + withdraw (lamport manipulation), checked arithmetic | ✅ ACHIEVED | sessions/2026-03-25.md |
| 7 | 2026-03-26 | Phase 3.2/3.3 — cpi-demo | Two-program CPI, PDA signing with new_with_signer | ✅ ACHIEVED | — |
| 8 | 2026-03-26 | Phase 3.4/3.5 — Access control + raw invoke | Signer/identity/ownership checks, invoke vs invoke_signed, blind signing attack | ✅ ACHIEVED | sessions/2026-03-26.md |
| 9 | 2026-03-26 | Phase 4.1/4.2 — SPL Token model + token-minter-anchor | Mint/ATA model, PDA as mint_authority, mint_to CPI, max supply enforcement | ✅ ACHIEVED | sessions/2026-03-26.md |
| 10 | 2026-03-27 | Phase 4.3/4.4 — SPL Token ops + NFTs + Token-2022 | freeze/thaw/transfer, NFT lifecycle, collection membership, TransferHook audit surface | ✅ ACHIEVED | sessions/2026-03-26.md |
| 11 | 2026-04-13 | Phase 1-4 full review + gap closure | Re-teach PDAs/CPIs/access control/SPL Token/NFTs/Token-2022, find and fix all gaps | ✅ ACHIEVED | sessions/2026-04-13.md |
