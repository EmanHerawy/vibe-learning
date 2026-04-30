# Solana Audit Gap Patterns — MissionX Week 2 Post-Mortem

> Source: Solana Audit Arena Week 2 — https://github.com/Frankcastleauditor/Solana-Audit-Arena
> Published report: die-kreatur (2026-03-26)
> Blind audit draft: eman.herawy (2026-04-23)
> Post-mortem: 2026-04-30

---

## Three Root Cause Patterns (extracted from misses)

```
┌─────────────────────────────────────────────────────────────────┐
│  PATTERN 1: State Machine BLACKLIST vs WHITELIST                │
│  PATTERN 2: Fund Sweep Without State Zeroing                    │
│  PATTERN 3: AMM Input Upper-Bound Missing                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Pattern 1 — State Machine Blacklist

> Source: `moderate.rs:105` — MissionX

### The Bug

```rust
// BLACKLIST — only excludes one status; everything else passes:
require!(missionx_state.missionx_status != MissionxStatus::Unverified, ...);

// CORRECT — whitelist of allowed statuses:
require!(
    matches!(missionx_state.missionx_status, MissionxStatus::Open | MissionxStatus::Accepted),
    MissionxErrors::WrongMissionxSatus
);
```

### Exploit Chains Enabled

| Entry | Via | Outcome |
|---|---|---|
| `Completed` mission | `ban_active` → `switch_ban_to_failed(immediate=true)` | Terminal state broken, owner drains |
| `Migrated` mission | `ban_active(ban_sell=false)` → `switch_ban_to_failed` | `trade_status=Open`, trading reopens |
| `MigrationRequired` | `ban_active(ban_sell=false)` → `switch_ban_to_failed` | Migration permanently blocked, trade continues |

### Audit Checklist Question

> "Does this instruction use a blacklist (NOT x) or a whitelist (matches!(x, A | B))?"
> "Which terminal states can still reach this instruction?"

---

## Pattern 2 — Fund Sweep Without State Zeroing

> Source: `migrate.rs:168–177` — MissionX

### The Bug

```rust
// migrate.rs — sweeps SOL but NEVER zeroes accounting fields:
let reserve = missionx_state.reserve0;
missionx_state.sub_lamports(reserve)?;        // ← SOL gone
executor.add_lamports(reserve - migration_fee)?;

// missionx_state.reserve0 still holds pre-migration value ← PHANTOM RESERVE
// missionx_state.reserve1 still holds pre-migration value ← PHANTOM RESERVE
```

### Exploit

1. `ban_active(ban_sell=false)` on Migrated → `old_trade_status=None`
2. `switch_ban_to_failed` passes → `trade_status=Open`
3. `sell` quotes SOL from stale `reserve0` — but real SOL is gone
4. Payment comes from creator's `payout_amount` still on the PDA
5. Creator's escrowed SOL drained via phantom AMM pricing

### Audit Checklist Question

> "After this instruction sweeps funds, do the accounting variables (`reserve0`, `reserve1`, `totalAssets`) still reflect reality?"
> EVM analogy: like an ERC-4626 vault that transfers assets but forgets `totalAssets -= amount`.

---

## Pattern 3 — AMM Buy Amount Upper Bound

> Source: `buy.rs:149` — MissionX

### The Bug

```rust
// buy.rs — NO upper bound check:
pub fn buy(ctx: Context<BuyAccounts>, buy_amount: u64, pay_cap: u64) -> Result<()> {
    // ← no require!(buy_amount < missionx_state.reserve1)
    let effective_sol_spend = get_amount_in_sol(buy_amount, ...)?;
    ...
    missionx_state.reserve1 -= effective_buy_amount;  // underflows if buy_amount > reserve1
```

### What's at Risk

- `reserve1` only holds 98.5% of supply (MINT_AMOUNT minus `token_player_payout` + `token_creator_payout`)
- Attacker buys full supply → `reserve1` underflows → wraps to huge value OR panics
- Reserved payout tokens (player/creator) drained from vault

### Audit Checklist Question

> "Is there a `require!(buy_amount < reserve)` guard before the AMM math runs?"
> Arithmetic underflow protection alone doesn't help — the upper bound must be explicit.

---

## MissionX Finding Comparison Table

> Blind audit draft vs published report

| # | Finding | Yours | Published | Notes |
|---|---|---|---|---|
| F-01 | `fail_ts=0` sentinel — epoch rug pull | Medium (#2) | High | Published more correct — it's a defect |
| F-02 | Buy amount unbounded — reserve1 underflow | ❌ MISSED | High | Pattern 3 |
| F-03 | Completed mission re-failed and drained | ❌ MISSED | Medium | Pattern 1 — you had entry point comment, missed chain |
| F-04 | Migrated mission reopened + payout drained | ❌ MISSED | Medium | Pattern 1 + 2 combined |
| F-05 | MigrationRequired bypassed via ban_sell=false | Partial (#7) | Medium | You found ban_sell=true; missed ban_sell=false vector |
| F-06 | BPF stack overflow | Critical (#4) | Medium | You more correct — both core instructions broken |
| F-07 | Slippage gross vs net (buy + sell) | Medium (#9, #10) | Medium | ✅ Matched |
| F-08 | MetadataPointer DoS | Critical (#1) | Medium | You rated higher, valid |
| F-09 | Single player fills all 3 slots | ❌ MISSED | Low | Missing duplicate check in accept_missionx_multi |
| F-10 | v0/v1 unbounded AMM corruption | Low (partial in #6) | Low | ✅ Partial match |
| F-11 | Fee parameters unbounded | Low (#6) | Low | ✅ Matched |
| — | Non-snapshotted config retroactive | High (#3) | ❌ MISSED (they got it WRONG) | Published stated opposite |
| — | Censored vault tokens locked | Info (#8) | ❌ MISSED | Valid unique finding |
| — | Donated SOL locked in Completed | Low (#11) | ❌ MISSED | Valid |
| — | No account close / rent lock | Info (#12) | ❌ MISSED | Valid |

---

## Key Audit Checklist Additions

```
□ Every moderation/admin path: whitelist or blacklist? Which terminal states pass?
□ Every fund sweep: are accounting fields (reserve0, reserve1) zeroed after?
□ Every AMM buy: is there require!(buy_amount < reserve)?
□ Every config field: snapshotted per-mission at creation, or read live from global?
□ After flagging a suspicious line: trace the full call chain before stopping.
```

---

## The Meta-Lesson

```
Entry point ≠ Finding.

You flagged:  "Completed mission can be banned??"  ← correct observation
You stopped:  before tracing → switch_ban_to_failed → immediate=true → withdraw drain

The finding lives at the END of the call sequence.
Next time: always ask "what can an attacker call NEXT after this anomaly?"
```

---

## Config Snapshot Reference

> Source: `set_global_config.rs` + `Missionx` struct (`state/missionx.rs`)

| Config Field | In `Missionx` struct? | Read live from? | Retroactive? |
|---|---|---|---|
| `v0`, `v1` | ✅ (copied at create) | `missionx_state.v0` | ❌ |
| `migration_threshold` | ✅ | `missionx_state.migration_threshold` | ❌ |
| `migration_fee` | ✅ | `missionx_state.migration_fee` | ❌ |
| `token_player_payout` | ✅ | `missionx_state.token_player_payout` | ❌ |
| `token_creator_payout` | ✅ | `missionx_state.token_creator_payout` | ❌ |
| `fail_fee` | ❌ | `config.fail_fee` (live) | ✅ affects ALL missions |
| `fail_grace_period` | ❌ | `config.fail_grace_period` (live) | ✅ affects ALL missions |
| `trade_fee_bps` | ❌ | `config.trade_fee_bps` (live) | ✅ affects ALL missions |
