# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repo Is

A structured learning workspace for mastering the **Fe smart contract language** — development and security auditing. The learner is a senior blockchain developer (6+ years, Solidity/Rust/Move) with zero prior Fe experience targeting production-grade mastery by 2026-04-22.

## Repository Layout

```
LEARNER.md          — learner profile, background, learning style, constraints
PROGRESS.md         — curriculum map + lesson log (source of truth for current position)
fe-vs-solidity.md   — confirmed Fe v26 limitations and advantages (hands-on verified)
sessions/           — per-session notes (theory, practice, memory cards, exam results)
sessions/archive/   — invalidated early sessions (contained inaccuracies — do not cite)
examples/           — hands-on Fe contracts + Hardhat integration tests
  escrow/           — Escrow contract with time-lock
  arbiter-vault/    — Arbiter + Vault cross-contract call example
references/         — external strategy docs
.claude/            — learner profile fragments (resources, constraints, course info)
```

## Fe Project Structure

Each example follows the Fe ingot format:

```
examples/<name>/
  fe.toml           — ingot manifest (name, version, optional deps)
  src/lib.fe        — contract source
  hardhat/          — Hardhat integration tests
    package.json
    hardhat.config.js
    test/
```

## Build & Test Commands

**Compile a Fe contract:**
```bash
fe build examples/<name>/
```

**Run Fe unit tests** (inline `#[test]` blocks inside `.fe` files):
```bash
fe test examples/<name>/
```

**Run Hardhat integration tests** (for payable/ETH behavior and cross-contract calls):
```bash
cd examples/<name>/hardhat
npm install
npx hardhat test
```

> The Fe test VM always has 0 ETH — `ctx.value()` always returns 0 and `#[payable]` guards always revert. Use Hardhat for any test involving ETH value or real payable behavior.

## Session Workflow

Each session follows a fixed structure (see any `sessions/YYYY-MM-DD.md`):

1. **Daily goal** — one concrete, measurable outcome
2. **Theory block** — WHY before HOW; always lead with analogy
3. **Practice block** — learner writes contracts from scratch
4. **Examiner** — `/examiner --session` to verify understanding
5. **Memory drill** — `/memory-drill` (mandatory every session — learner has poor retention)
6. **Notes** — `/notes` to compile session record

**Always run `/memory-drill` at end of session — non-negotiable.**

## Confirmed Resources (cite only these)

1. **Fe official guide** — https://fe-lang.org/ (14-part guide)
2. **Fe stdlib docs** — https://fe-lang.org/docs/ (covers `std::abi` only)
3. **Fe GitHub** — https://github.com/ethereum/fe
4. **Local Fe compiler source** (cloned from https://github.com/ethereum/fe)
   - Primary effects source: `fe/ingots/std/src/evm/effects.fe`
   - Core traits: `fe/ingots/core/src/`
   - Compiler integration tests: `fe/crates/fe/tests/fixtures/fe_test/`
5. **Local rosetta examples** (cloned from https://github.com/ethereum/fe, `rosetta/` directory) — side-by-side Fe + Solidity

**Hard rule: never invent examples or cite unconfirmed sources.**

## Fe v26 Key Constraints (confirmed in practice)

- **No ETH transfer primitive** — `call.call()` requires a typed `message`; bare ETH send to EOA has no confirmed workaround in v26
- **`#[payable]` implicit guard** — compiler inserts `require(CALLVALUE > 0)`; calling with `value: 0` reverts (opposite of Solidity)
- **StorageMap values must implement `WordRepr`** — single `u256` round-trip; multi-field structs cannot be map values; use separate maps per field
- **No inheritance, no modifiers** — use composition and inline `assert()` guards
- **No `block.timestamp`** — use `ctx.block_number()` (1 day ≈ 7200 blocks)
- **Named arguments required everywhere** — `store.set(key: k, value: v)`, not positional
- **`call.static()` still requires `mut Call`** — all external calls are treated as side effects
- **`#[selector = sol("name(types)")]`** required on every `msg` variant

## Fe Effects System (mental model)

```
Ctx      → read blockchain context (caller, value, block_number…)
Call     → make external calls (requires mut Call)
Log      → emit events
Create   → deploy contracts
RawMem   → mload/mstore
RawOps   → calldataload, keccak256, revert, etc.
Super    → all of the above combined
```

The contract-level `uses` clause is the **capability ceiling** — if `call: mut Call` is not declared on the contract, no handler can make external calls. This is the primary Fe security advantage over Solidity.

## Learner Constraints

- **Math/CS**: no CS degree — always break down CS/math step by step; never assume background knowledge
- **Memory**: poor retention — use spaced repetition, always end with `/memory-drill`
- **Depth progression**: always start at Beginner level; ask before going deeper (Beginner → Intermediate → Advanced)
- **Learning order**: WHY → analogy → HOW → hands-on practice → verification
