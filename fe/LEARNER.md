# Learner Profile

## Identity
- **Name:** Eman Herawy
- **Role:** Senior Blockchain Developer + Smart Contract Security Auditor
- **Experience:** 6+ years blockchain (since 2017)

## Subject
- **Learning:** Fe smart contract language — development + security auditing
- **Depth target:** C + D — production-grade mastery + academic depth
- **Current level in Fe:** Zero (complete beginner)
- **Background:**
  - Solidity: advanced
  - Rust: intermediate (Polkadot SDK, PBA Protocol Track 2025)
  - Move: some exposure
  - Smart contract security auditing: professional level
  - No CS degree — break down all CS/math step by step

## Expert Role
> **Fe smart contract developer + Fe security auditor**

## Learning Style

### Loves
- WHY before HOW, then hands-on practice
- Concrete, measurable end goal at the start of every session
- Real-world analogies before abstract theory
- Building something from scratch
- Understanding verified at the end of each topic

### Obstacles
- Bad memory → **run /memory-drill every session, no exceptions**
- Math-heavy explanations without analogies first → **always lead with analogy before equation**
- No CS degree → **break down all CS/math step by step, never assume**

### Retention
- Anki/flashcards (memory-drill) every session
- Practice + verify questions after every concept
- Spaced repetition

### Avoid
- Theory-only sessions
- Dumping advanced concepts before basics are solid
- Sessions without a concrete, achievable end goal

## Depth Progression
Always start at Beginner level. Explicitly ask before going deeper. Sequence: Beginner → Intermediate → Advanced.

## Confirmed Resources
1. **Fe official guide** — https://fe-lang.org/ (14-part guide, confirmed live and accurate as of 2026-04-13)
   - Parts 1–7: Getting started through contract composition — fe-lang.org/getting-started/... fe-lang.org/contracts/...
   - Part 8: Structs + impl blocks — fe-lang.org/structs/definition/ fe-lang.org/structs/impl-blocks/ fe-lang.org/structs/associated-functions/
   - Part 9: Traits + generics — fe-lang.org/traits/definition/ fe-lang.org/traits/implementing/ fe-lang.org/traits/generics/
   - Parts 10–14: Events, error handling, testing, patterns, examples
2. **Fe standard library docs** — https://fe-lang.org/docs/ (covers `std::abi` only — ABI encoding/decoding)
3. **Fe GitHub repository** — https://github.com/ethereum/fe
4. `rosetta/` (local) — side-by-side Fe + Solidity examples in this repo
5. `fe/` (local) — full Fe compiler source, cloned at `/Users/emanherawy/work/open_source/fe/fe/`
   - `fe/ingots/core/src/` — core traits: `EffectRef`, `ContractHost`, `Target`, `intrinsic`
   - `fe/ingots/std/src/evm/effects.fe` — **primary source** for `Ctx`, `Call`, `Log`, `Create`, `Evm`, `RawMem`, `RawStorage`, `RawOps`, `Super`
   - `fe/ingots/std/src/evm/storage_map.fe` — `StorageMap` impl
   - `fe/crates/fe/tests/fixtures/fe_test/` — compiler integration tests (confirmed behavior)

**Hard rule:** Only cite these resources. Never invent examples or cite unconfirmed sources.

## Schedule
- **Hours/day:** 8
- **Days:** No preference (daily available)
- **Session length:** Flexible within 8h/day

## Target
- **Milestone:** Build and audit production-quality Fe contracts independently; understand Fe's safety guarantees and identify Fe-specific vulnerabilities
- **Deadline:** 2026-04-22 (2 weeks from profile creation)
- **Started:** 2026-04-08
