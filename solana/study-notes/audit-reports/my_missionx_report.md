# MissionX Security Audit — Week 2 Findings

**Program**: `missionx_tokens`
**Program ID**: `79Ltf6NgMwa7pdyBqTuyHmmoeHJ5bRYZsBRuWfa4voHG`
**Anchor version**: `0.30.1`
**Scope**: `src/` only

| Severity | Count |
|---|---|
| Critical | 2 |
| High | 2 |
| Medium | 3 |
| Low | 3 |
| Informational | 4 |

---

## Findings Summary

| # | Severity | Title | Affected Function(s) |
|---|---|---|---|
| 1 | Critical | MetadataPointer extension space allocated before extension is registered | `create_missionx` |
| 2 | Critical | `MigrateAccounts` and `ConfirmAccounts` exceed BPF stack frame limit — migration and mission completion broken at runtime | `migrate`, `complete_missionx` |
| 3 | High | Non-snapshotted config values (`fail_fee`, `fail_grace_period`, `trade_fee_bps`) retroactively affect all existing missions | `set_global_config`, `fail_missionx`, `fail_missionx_by_time`, `ensure_missionx_tradable`, `withdraw_from_missionx` |
| 4 | High | Pervasive unchecked integer arithmetic — sell fee underflow, AMM reserve corruption, virtual reserve overflow | `sell`, `buy`, `get_full_sol_reserve`, `get_full_token_reserve`, `get_token_reserved` |
| 5 | Medium | `fail_ts = 0` sentinel simultaneously blocks all sells and unlocks immediate owner drain — documented design, indistinguishable from rug pull | `switch_ban_to_failed`, `ensure_missionx_tradable`, `withdraw_from_missionx` |
| 6 | Medium | Buy slippage check occurs before migration cap recalculation — user receives fewer tokens than protected | `buy` |
| 7 | Medium | Sell slippage check compares gross `sol_out` before fee deduction — user can receive below `min_out` | `sell` |
| 8 | Low | Missing input validation on configuration parameters — `fail_fee` vs payout, zero-value `fee_recipient`/`v0`/`v1` | `init`, `set_global_config`, `fail_missionx`, `fail_missionx_by_time`, `moderate_initial` |
| 9 | Low | Moderator can permanently block migration by banning a `MigrationRequired` mission | `ban_active`, `migrate` |
| 10 | Low | SOL donated directly to `missionx_state` is permanently locked for missions ending in `Completed` or `Migrated` status | `withdraw_from_missionx`, `complete_missionx`, `migrate` |
| 11 | Informational | Token-2022 vault tokens permanently locked for censored missions — tokens have no value, only rent at risk | `moderate_initial`, `withdraw_from_missionx` |
| 12 | Informational | No account close mechanism — `missionx_state` and `token_vault_pda` rent locked permanently for every mission | all terminal instructions |
| 13 | Informational | Double-banning an already-blocked mission emits spurious event | `ban_active` |
| 14 | Informational | Timestamp additions unexploitable but unchecked | `ensure_missionx_tradable`, `withdraw_from_missionx`, `fail_missionx_by_time`, `accept_missionx` |

---

## Finding



**Severity**: Critical
**Category**: Logic bug — Token-2022 mint initialisation
**Affected function(s)**: `create_missionx`

## Description

In `create_missionx.rs`, the mint account size is calculated **before** the `MetadataPointer` extension is pushed into the `token_extensions` vec:

```rust
// space calculated with empty vec — no extensions
let mut token_extensions: Vec<ExtensionType> = vec![];
let mint_space = ExtensionType::try_calculate_account_len::<spl_token_2022::state::Mint>(&token_extensions)?;

// account allocated for 0 extensions
system_program::create_account(..., mint_space as u64, ...)?;

// extension pushed AFTER allocation — too late
if let Some(metadata_authority) = ctx.accounts.config.metadata_authority {
    token_extensions.push(ExtensionType::MetadataPointer); // ← too late
    token_interface::metadata_pointer_initialize(...)?;     // writes past allocated boundary
}
```

`MetadataPointer` requires additional bytes in the mint account layout. Because the account is allocated without those bytes, the Token-2022 CPI writes extension data past the allocated boundary and fails at runtime.

## Impact

If `config.metadata_authority` is `Some` — i.e., the protocol is configured with a metadata authority — **every call to `create_missionx` fails**. No missions can be created. The protocol is completely non-functional until the owner sets `metadata_authority = None`.

---

## Finding



**Severity**: Critical
**Category**: Runtime crash — BPF stack frame limit exceeded
**Affected function(s)**: `migrate`, `complete_missionx`

## Description

The SBF VM enforces a hard 4096-byte stack frame limit per function. The `cargo build-sbf` linker verifier reports that two account validation functions exceed this limit and additionally overwrite caller frame data:

```
Error: ConfirmAccounts::try_accounts
  Stack offset 4104 exceeded max 4096 by 8 bytes
  Frame size: 4352 bytes
  + 3x "A function call overwrites values in the frame"

Error: MigrateAccounts::try_accounts
  Stack offset 5256 exceeded max 4096 by 1160 bytes
  Frame size: 5568 bytes
```

These errors are emitted by the BPF verifier during compilation — not just as warnings but as `Error:` level output. The "overwrites values in the frame" messages indicate that function call return values are being placed over live stack slots, which is undefined behaviour in the BPF execution model. The Solana runtime will reject any transaction that triggers a stack violation during execution.

## Impact

- **`MigrateAccounts` (+1160 bytes)**: The `migrate` instruction fails unconditionally at runtime. All missions that reach `MigrationRequired` status cannot be migrated. `reserve0` SOL and all Token-2022 tokens (including `token_player_payout` and `token_creator_payout`) are permanently locked in the PDA.

- **`ConfirmAccounts` (+8 bytes)**: The `complete_missionx` instruction fails unconditionally at runtime. Missions that are accepted cannot be completed. The payout SOL locked at creation cannot be released to the winning player.

Together, the two most critical user-facing outcomes of the protocol — mission completion and liquidity migration — are completely non-functional.

---

## Finding



**Severity**: High
**Category**: Logic bug — Configuration / State isolation
**Affected function(s)**: `set_global_config`, `fail_missionx`, `fail_missionx_by_time`, `moderate_initial`, `ensure_missionx_tradable`, `withdraw_from_missionx`, `buy`, `sell`

## Description

Several protocol parameters that govern individual mission behaviour are **never snapshotted into the `Missionx` account at creation**. They are always read live from the global `Configuration` PDA:

| Parameter | Read live in | Effect if changed after mission creation |
|---|---|---|
| `fail_fee` | `refund_payout` (mod.rs:217) | All missions with `payout < new fail_fee` can never be failed or censored |
| `fail_grace_period` | `ensure_missionx_tradable` (mod.rs:64,67), `withdraw_from_missionx` (withdraw.rs:71,77) | Retroactively changes sell window and withdrawal timing for every existing failed mission simultaneously |
| `trade_fee_bps` | `buy` (buy.rs:144), `sell` (sell.rs:110) | Changes fee charged on every trade of every mission retroactively |

For comparison, these values ARE snapshotted and properly isolated per-mission: `v0`, `v1`, `token_player_payout`, `token_creator_payout`, `migration_threshold`, `migration_fee`.

## Impact

**Scenario A — `fail_fee` increased above existing mission payouts:**

`set_global_config(fail_fee = X)` where `X > missionx_payout_min` causes:
```rust
// refund_payout:
payout.checked_sub(config.fail_fee) // MathOverflow → revert
```
Every existing mission with `payout_amount < X`:
- Cannot be voluntarily cancelled (`fail_missionx` reverts).
- Cannot be failed by time (`fail_missionx_by_time` reverts — `fail_ts` never set → grace period never starts).
- Cannot be censored by moderator (`moderate_initial` reverts).

Because `fail_ts` is never written, `withdraw_from_missionx` uses the `Open` path (checks `open_timestamp + open_duration + grace_period < now`). Once that window passes, the owner can sweep both SOL and all Token-2022 tokens from the vault while the player and creator receive nothing.

**Scenario B — `fail_grace_period` reduced to zero:**

A single `set_global_config(fail_grace_period = 0)` call collapses the grace period for **every mission in the protocol simultaneously**:
```rust
// ensure_missionx_tradable — sell gate:
require!(current_time <= (fail_ts + 0)); // false for any failed mission → REVERT

// withdraw_from_missionx:
fail_ts + 0 < current_time;  // true immediately → owner can withdraw
```
- All `sell` calls on all failed missions revert — token holders cannot recover SOL.
- Owner can immediately call `withdraw_from_missionx` on every failed mission.
- Each withdrawal sweeps the entire vault: trading tokens + player payout tokens + creator payout tokens → owner ATA.

This is strictly more powerful than the `switch_ban_to_failed(immediate=true)` attack — instead of targeting one mission, it collapses the entire protocol in one transaction and steals both SOL and Token-2022 payouts from all failed missions at once.

---

## Finding



**Severity**: High
**Category**: Arithmetic — Integer overflow / Underflow
**Affected function(s)**: `buy`, `sell`, `get_full_sol_reserve`, `get_full_token_reserve`, `get_token_reserved`

## Description

The original `Cargo.toml` had no `[profile.release]` section and no `overflow-checks = true`. In Rust release builds without this flag, integer overflow and underflow **silently wrap** (two's complement) — no panic, no revert, just a wrong value propagated through the protocol. Every bare `+`, `-`, `*` on `u64` financial variables is unchecked.

### Sub-issue 1 — Sell fee underflow: `sell.rs:154` [High]

```rust
// sell.rs:109-110
let trading_fee = sol_out
    .checked_mul(ctx.accounts.config.trade_fee_bps)?
    .checked_div(BPS)?;   // BPS = 10_000

// sell.rs:154 — bare subtraction, no overflow-checks
ctx.accounts.user.add_lamports(sol_out - trading_fee)?;
```

`trade_fee_bps` is set by the owner via `set_global_config` with zero validation. If `trade_fee_bps >= BPS (10_000)`, then `trading_fee >= sol_out` and `sol_out - trading_fee` wraps to a huge `u64` (original code) or panics (with overflow-checks). Every sell on every mission permanently reverts.

### Sub-issue 2 — AMM reserve state mutations: `buy.rs:148-149`, `sell.rs:129-130` [Medium]

```rust
// buy.rs
missionx_state.reserve0 += effective_sol_spend;   // unchecked +=
missionx_state.reserve1 -= effective_buy_amount;  // unchecked -=

// sell.rs
missionx_state.reserve0 -= sol_out;    // unchecked -= (underflow risk)
missionx_state.reserve1 += sell_amount; // unchecked +=
```

`sol_out` is derived from `full_sol_reserve = v0 + reserve0`. When `v0` is large and `reserve0` is small, the AMM can quote `sol_out > reserve0`. The unchecked `reserve0 -= sol_out` wraps to a huge value while `sub_lamports(sol_out)` succeeds (the PDA also holds payout SOL and rent). This silently drains payout SOL through the bonding curve and permanently corrupts all future AMM prices.

### Sub-issue 3 — Migration threshold arithmetic: `buy.rs:122-123` [Medium]

```rust
if migration_threshold <= (reserve0 + effective_sol_spend) {  // unchecked +
    effective_sol_spend = migration_threshold - reserve0;      // unchecked -
}
```

If `reserve0 + effective_sol_spend` overflows, the comparison becomes false and migration is never triggered — permanently blocking the migration mechanism for that mission.

### Sub-issue 4 — Virtual reserve helpers: `missionx.rs:53,56`, `global_config.rs:29` [Low]

```rust
fn get_full_sol_reserve(&self) -> u64   { self.v0 + self.reserve0 }   // unchecked +
fn get_full_token_reserve(&self) -> u64 { self.v1 + self.reserve1 }   // unchecked +
fn get_token_reserved(&self) -> u64     { self.token_creator_payout + self.token_player_payout } // unchecked +
```

`get_token_reserved()` feeds into `MINT_AMOUNT - get_token_reserved()` in `create_missionx`. If payouts wrap on overflow, the result produces a corrupted `reserve1` at mission creation silently misconfiguring the AMM for every new mission.

## Impact

| # | Location | Operation | Risk | Original behaviour |
|---|---|---|---|---|
| 1 | `sell.rs:154` | `sol_out - trading_fee` | Underflow if `trade_fee_bps >= BPS` | Silent wrap → DoS on all sells |
| 2 | `sell.rs:129` | `reserve0 -= sol_out` | Underflow if `sol_out > reserve0` | Silent wrap → payout SOL drained via AMM |
| 3 | `buy.rs:148` | `reserve0 += sol_spend` | Overflow | Silent wrap → AMM state corrupted |
| 4 | `buy.rs:149` | `reserve1 -= buy_amount` | Underflow | Silent wrap → AMM state corrupted |
| 5 | `sell.rs:130` | `reserve1 += sell_amount` | Overflow | Silent wrap → AMM state corrupted |
| 6 | `buy.rs:122` | `reserve0 + sol_spend` (compare) | Overflow | Silent wrap → migration never triggered |
| 7 | `buy.rs:123` | `threshold - reserve0` | Underflow | Silent wrap → wrong cap amount |
| 8 | `missionx.rs:53,56` | `v0 + reserve0`, `v1 + reserve1` | Overflow | Silent wrap → wrong AMM input |
| 9 | `global_config.rs:29` | `creator_payout + player_payout` | Overflow | Silent wrap → corrupted reserve1 at creation |

---

## Finding



**Severity**: Medium
**Category**: Logic bug — Grace period bypass via epoch-0 timestamp sentinel
**Affected function(s)**: `switch_ban_to_failed`, `ensure_missionx_tradable`, `withdraw_from_missionx`

## Description

### Root cause

`switch_ban_to_failed(immediate=true)` uses Unix epoch 0 as a sentinel value for "grace period already elapsed":

```rust
// moderate.rs:201
missionx_state.fail_ts = if immediate { Some(0) } else { Some(clock.unix_timestamp as u64) };
missionx_state.trade_status = MissionxTradeStatus::Open; // ← restored so sell gate runs
missionx_state.is_blocked = false;
```

Both the sell gate and the withdraw gate derive their deadline as `fail_ts + fail_grace_period`. When `fail_ts = 0`, this deadline is `fail_grace_period` seconds since Unix epoch — an absolute timestamp in early 1970, always in the past relative to the current chain time (~1.7 billion seconds since epoch):

| Gate | Expression | With `fail_ts = 0` | Result |
|---|---|---|---|
| Sell allowed | `current_time <= fail_ts + grace_period` | `1_746_000_000 <= 2_592_000` | **FALSE → sell reverts** |
| Withdraw allowed | `fail_ts + grace_period < current_time` | `2_592_000 < 1_746_000_000` | **TRUE → drain allowed** |

The two gates fire in opposite directions simultaneously: sells are permanently blocked while withdrawal is permanently unlocked, the instant `switch_ban_to_failed(immediate=true)` is executed.

### Attack path

The owner controls the moderator role — `update_moderator` is an owner-only instruction, so a single actor can hold both keys:

```
1. Owner enables a moderator key they control (update_moderator).

2. Moderator calls ban_active(ban_sell=false) on any Open mission.
   → is_blocked = true. trade_status remains Open (no old_trade_status saved).

   OR ban_active(ban_sell=true):
   → old_trade_status = Some(Open), trade_status = Banned.

3. Moderator calls switch_ban_to_failed(immediate=true).
   Precondition: old_trade_status.map_or(true, |s| s == Open) ✓
   → missionx_status = Failed
   → fail_ts = Some(0)           ← epoch sentinel
   → trade_status = Open         ← restored, sell gate will run
   → is_blocked = false

4. In the same block, owner calls withdraw_from_missionx:
   fail_graced = 0 + fail_grace_period (e.g. 2_592_000)
   2_592_000 < current_time        → allowed_to_withdraw = true ✓

5. withdraw sweeps:
   - token_vault_pda.amount       → owner_ata (ALL Token-2022 tokens)
   - missionx_state.lamports - rent → owner wallet
     (includes payout_amount + reserve0 — all SOL deposited by creator and traders)
```

### What token holders see

`trade_status = Open` after step 3, so any off-chain UI shows the mission as tradable. The first sell attempt hits `ensure_missionx_tradable`:

```rust
// current_time (1.7B) <= 0 + 2_592_000 → FALSE → FailedMissionxTradeGracePeriodExpired
require!(current_time <= (fail_ts + config.fail_grace_period), ...);
```

Token holders' sell transactions revert with a grace-period error while the mission appears open. They have no sell window and no on-chain recourse.

## Impact

A single actor controlling the owner key and any enabled moderator key can:
- Instantly drain **all SOL** from any active mission (`payout_amount` + full `reserve0` from all prior buys) to the owner wallet.
- Instantly drain **all Token-2022 tokens** from the vault (`token_player_payout` + `token_creator_payout` + full trading supply) to the owner ATA.
- Leave token holders with worthless tokens they cannot sell and no SOL refund.

Affected parties per mission: every buyer who deposited SOL via the bonding curve, the mission player (loses token payout), and the mission creator (loses token payout + payout SOL). The attack applies to any mission that has ever had `trade_status = Open` — i.e., every approved, actively-traded mission in the protocol.

The protocol documents `immediate = true` as intentional. This is noted as a Medium finding because it is a known trust assumption rather than an unintended code defect — but the on-chain effect is indistinguishable from a rug pull, and no timelock or multi-sig guards the `immediate` path.

---

## Finding



**Severity**: Medium
**Category**: Logic bug — Slippage protection bypass
**Affected function(s)**: `buy`

## Description

The slippage check in `buy` validates `effective_sol_spend` against the caller's `pay_cap` **before** the migration cap logic that may reduce `effective_sol_spend` and recalculate `effective_buy_amount`:

```rust
// buy.rs — order of operations:
// 1. slippage check (against original effective_sol_spend)
require!(effective_sol_spend <= pay_cap, MissionxErrors::SlippageLimit);

// 2. migration cap — may REDUCE effective_sol_spend
if migration_threshold <= (reserve0 + effective_sol_spend) {
    effective_sol_spend = migration_threshold - reserve0;  // ← new, lower value
    // 3. effective_buy_amount recalculated from the new spend
    effective_buy_amount = get_amount_out_tokens(..., effective_sol_spend, ...)?;
}

// 4. no second slippage check after recalculation
missionx_state.reserve0 += effective_sol_spend;
missionx_state.reserve1 -= effective_buy_amount;
```

The user submits `pay_cap` as their maximum acceptable spend. After the migration cap fires, `effective_sol_spend` is silently reduced to `migration_threshold - reserve0`. `effective_buy_amount` is recalculated from this new (lower) spend against the bonding curve — yielding fewer tokens than the user expected for the portion of SOL they originally authorised. There is no second `require!(effective_buy_amount >= min_tokens_out)` check after this recalculation, so the user has no on-chain protection against receiving far fewer tokens than intended at the migration boundary.

Additionally, if `reserve1 < effective_buy_amount` after the recalculation (possible when virtual reserves inflate the quoted amount beyond real holdings), the unchecked `reserve1 -= effective_buy_amount` underflows, corrupting protocol state.

## Impact

At the migration boundary:
- User submits a buy expecting `N` tokens for up to `pay_cap` SOL.
- Migration cap fires: actual spend is clamped to a lower value.
- Recalculated `effective_buy_amount` may be significantly fewer tokens than expected.
- The slippage check already passed on the original value — the user has no recourse.
- In the underflow case (original code, no overflow-checks): `reserve1` wraps to a huge value, permanently corrupting all future AMM prices for this mission.

---

## Finding



**Severity**: Medium
**Category**: Logic bug — Slippage protection bypass
**Affected function(s)**: `sell`

## Description

The slippage check in `sell` compares the **gross** AMM output against the user's `min_out`, before the trading fee is deducted:

```rust
// sell.rs
let sol_out = get_amount_out_sol(sell_amount, ...)?;

require!(sol_out >= min_out, MissionxErrors::SlippageLimit);  // ← checks gross amount

let trading_fee = sol_out
    .checked_mul(config.trade_fee_bps)? / BPS;

ctx.accounts.user.add_lamports(sol_out - trading_fee)?;  // ← user receives net amount
```

The user specifies `min_out` as the minimum SOL they are willing to receive. The check passes if the AMM quotes `sol_out >= min_out`, but the user actually receives `sol_out - trading_fee`. With a sufficiently high `trade_fee_bps`, the net amount delivered to the user falls below `min_out` while the slippage check still passes.

## Impact

The slippage protection does not account for the fee. With `trade_fee_bps` settable by the owner with no upper bound (see Finding #4):

- Owner sets `trade_fee_bps = 5_000` (50%).
- User sets `min_out = 9.5 SOL` expecting at most 5% slippage from a 10 SOL quote.
- Slippage check: `10 SOL >= 9.5 SOL` → passes ✅.
- User receives: `10 - 5 = 5 SOL` — 47% below their declared minimum with no error.

Even at legitimate fee levels, this means the slippage parameter offers weaker protection than users expect: front-running or sandwich attacks that move the price such that `sol_out` just barely clears `min_out` will still deliver `sol_out - fee` which is below `min_out`.

---

## Finding



**Severity**: Low
**Category**: Missing input validation — Configuration and initialisation
**Affected function(s)**: `init`, `set_global_config`, `fail_missionx`, `fail_missionx_by_time`, `moderate_initial`, `switch_ban_to_failed`

## Description

Several configuration parameters accepted by `init` and `set_global_config` have no cross-field or zero-value validation, each with a distinct failure mode.

### Sub-issue 1 — `fail_fee > missionx_payout_min` blocks all failure paths

`refund_payout` in `mod.rs` distributes the creator's refund as:

```rust
// mod.rs:203-207
missionx_state.sub_lamports(payout)?;
fee_recipient.add_lamports(config.fail_fee)?;
missionx_creator.add_lamports(
    payout.checked_sub(config.fail_fee).ok_or(MissionxErrors::MathOverflow)?
)?;
```

`config.fail_fee` is read live from the global `Configuration` PDA. If `fail_fee > payout_amount`, `checked_sub` returns `Err(MathOverflow)` and the instruction reverts atomically (no funds are lost in that transaction). **However**, `refund_payout` is the terminal step of every mission-failure path: `fail_missionx`, `fail_missionx_by_time`, `moderate_initial(block=true)`, and `switch_ban_to_failed`. There is no guard in `init` or `set_global_config` preventing `fail_fee > missionx_payout_min`.

### Sub-issue 2 — Zero-value `fee_recipient`, `v0`, `v1` accepted silently

`init` accepts these fields with no zero-value guards:

```rust
// init.rs — no guards on:
cfg.fee_recipient = fee_recipient;  // zero pubkey silently accepted
cfg.v0 = v0;                        // zero silently accepted
cfg.v1 = v1;                        // zero silently accepted
```

- `fee_recipient = Pubkey::default()` — all protocol fees are sent to the system burn address and permanently lost with no error.
- `v0 = 0` — `get_full_sol_reserve()` returns `reserve0` only; at mission start `reserve0 = 0`, so `get_amount_out` computes with a zero denominator, causing a divide-by-zero panic on the first buy.
- `v1 = 0` — same on the token side; infinite effective token price at zero supply.

Both defects are also present in `set_global_config`, which can update these fields at any time without re-validation.

## Impact

**Sub-issue 1:** If `fail_fee > missionx_payout_min` (even accidentally):
- Creators cannot voluntarily cancel missions (`fail_missionx` reverts).
- Expired missions cannot be formally failed (`fail_missionx_by_time` reverts — `fail_ts` is never written).
- Because `fail_ts` is never written, the grace period never starts and `withdraw_from_missionx` via the `Failed` path is permanently blocked.
- Moderators cannot censor `Unverified` missions — they remain open forever.
- SOL deposited as payout is locked until the owner corrects the configuration.

**Sub-issue 2:** Zero `v0`/`v1` permanently breaks the bonding curve for every mission created while the bad config is live. Zero `fee_recipient` silently burns all trading and creation fees.

---

## Finding



**Severity**: Low
**Category**: Centralization risk — Moderator privilege
**Affected function(s)**: `ban_active`, `migrate`

## Description

`ban_active` permits banning a mission regardless of its `trade_status`, including `MigrationRequired`:

```rust
// moderate.rs:105
require!(missionx_state.missionx_status != MissionxStatus::Unverified, ...);
// no restriction on trade_status

// moderate.rs:118-119 (when ban_sell=true):
missionx_state.old_trade_status = Some(missionx_state.trade_status); // saves MigrationRequired
missionx_state.trade_status = MissionxTradeStatus::Banned;
```

The executor's `migrate` instruction requires:

```rust
// migrate.rs:115-117
require!(
    missionx_state.trade_status == MissionxTradeStatus::MigrationRequired,
    MissionxErrors::MissionxNotMigrationReady
);
```

With `trade_status = Banned`, `migrate` permanently reverts. Recovery requires a moderator to call `unban_active`.

## Impact

A moderator can call `ban_active(ban_sell=true)` on any mission that has accumulated enough trading volume to reach the migration threshold. This:
- Blocks the executor from calling `migrate`, locking all `reserve0` SOL and `reserve1` tokens inside the `Missionx` PDA.
- Prevents the player and creator from receiving their Token-2022 token payouts (only distributed at migration via `do_token_payout`).
- The funds remain inaccessible unless a moderator voluntarily unbans — creating an uncontrolled dependency on moderator cooperation.

The moderator role is broader than necessary: migration is an executor-only concern and a moderator should not be able to block it unilaterally.

---

## Finding



**Severity**: Low
**Category**: Logic bug — SOL accounting / Missing sweep path
**Affected function(s)**: `withdraw_from_missionx`, `complete_missionx`, `migrate`

## Description

All SOL accounting in the protocol is done through `reserve0` — the AMM's tracked real reserve. Every buy adds `effective_sol_spend` to `reserve0`; every sell subtracts `sol_out` from `reserve0`.

On Solana, anyone can transfer SOL to any account including a PDA via `system_program::transfer`. If SOL is sent directly to `missionx_state`, its lamport balance increases but `reserve0` does not. The "donated" SOL has no path out of the account in the common successful-mission flow:

```rust
// withdraw_from_missionx — the only instruction that sweeps lamports:
let allowed_to_withdraw = match missionx_state.missionx_status {
    MissionxStatus::Open   => { /* grace period check */ },
    MissionxStatus::Failed => { /* grace period check */ },
    _ => false   // Completed, Accepted, Migrated, Censored → blocked
};
```

For missions that end in `Completed` or `Migrated` — the normal success path — no instruction sweeps residual lamports:
- `complete_missionx` only subtracts `payout_amount` from lamports, leaving rent + reserve0 + donated SOL.
- `migrate` sweeps `reserve0` SOL to the executor but does not touch excess lamports.
- After either, `withdraw_from_missionx` is permanently blocked (`_ => false`).

The result: any SOL donated to a `missionx_state` account on a mission that succeeds is locked in the account forever with no recovery path.

## Impact

Griefing vector: an attacker can permanently lock small amounts of SOL inside any active mission's PDA at low cost (minimum 1 lamport). The attacker also loses the donated SOL, so this is not profitable — but it creates irrecoverable on-chain waste. At protocol scale with many missions, the cumulative locked SOL grows without bound and cannot be reclaimed by the protocol or the owner.

Additionally, if the donated amount is significant, it causes a permanent discrepancy between `missionx_state.lamports` and the protocol's expected invariant (`rent + payout + reserve0`), which could confuse off-chain accounting tools or indexers.

---

## Finding



**Severity**: Informational
**Category**: Protocol design — Missing cleanup path
**Affected function(s)**: `moderate_initial` (censor path), `withdraw_from_missionx`

## Description

When `moderate_initial` censors a mission (`block=true`), only the SOL payout is refunded to the creator:

```rust
// moderate.rs:68-75
if block {
    missionx_state.missionx_status = MissionxStatus::Censored;
    refund_payout(...)  // refunds SOL payout only — no Token-2022 handling
}
```

At the point of censoring, the `token_vault_pda` already holds `MINT_AMOUNT` (1,000,000,000 × 10^9) Token-2022 tokens created by `create_missionx`. These tokens have no exit path once `missionx_status = Censored`:

- `buy` / `sell`: require `trade_status == Open` — censored missions have `trade_status == Closed`.
- `migrate`: requires `trade_status == MigrationRequired`.
- `withdraw_from_missionx`: explicitly returns `false` for all statuses other than `Open` and `Failed`:

```rust
// withdraw_from_missionx:
let allowed_to_withdraw = match missionx_state.missionx_status {
    MissionxStatus::Open   => { ... },
    MissionxStatus::Failed => { ... },
    _ => false  // Censored falls here — withdrawal blocked forever
};
```

## Impact

For every censored mission:
- `MINT_AMOUNT` Token-2022 tokens are permanently locked in `token_vault_pda` with no recovery path.
- The rent for the vault account (~0.002 SOL) is also permanently locked.
- The vault account cannot be closed.

While these tokens have no established market value at the time of censoring (trading never opened for a `Closed` mission), the SOL rent is a guaranteed loss per censored mission. At protocol scale with active moderation, this accumulates into a meaningful cumulative SOL burn with no way to reclaim it.

---

## Finding



**Severity**: Informational
**Category**: Protocol design — Missing account lifecycle / Permanent rent lock
**Affected function(s)**: `complete_missionx`, `migrate`, `withdraw_from_missionx`, `moderate_initial`

## Description

There is no `close =` constraint anywhere in the program. A search of all instruction account structs confirms zero occurrences:

```
grep -rn "close =" src/   →   (no output)
```

Every mission creates two persistent accounts:
- `missionx_state` PDA — stores mission state (~200+ bytes → ~0.002–0.003 SOL rent)
- `token_vault_pda` — stores the Token-2022 vault (~165 bytes → ~0.002 SOL rent)

None of the terminal instructions (`complete_missionx`, `migrate`, `withdraw_from_missionx`, `moderate_initial`) close either account or return the rent to the creator or owner. Once a mission reaches any terminal status, all funds are distributed but the accounts remain on-chain indefinitely with their rent lamports locked inside, unreachable by any instruction.

## Impact

Every mission permanently burns ~0.004–0.005 SOL in locked rent with no recovery path. At protocol scale:

| Missions | Rent locked per mission | Total permanent loss |
|---|---|---|
| 1,000 | ~0.005 SOL | ~5 SOL |
| 10,000 | ~0.005 SOL | ~50 SOL |
| 100,000 | ~0.005 SOL | ~500 SOL |

The affected parties are the mission creators (who funded the accounts at creation) and the protocol (which cannot reclaim the rent to reinvest or redistribute it). There is no user-facing path to recover this SOL even if the protocol is deprecated.

---

## Finding



**Severity**: Informational
**Category**: Access control — Duplicate operation
**Affected function(s)**: `ban_active`

## Description

`ban_active` does not check whether the mission is already blocked before setting `is_blocked = true`:

```rust
// moderate.rs — no guard:
missionx_state.is_blocked = true;
// emits BanActive event even if already blocked
```

The `old_trade_status` field does have a guard (`if is_none()` prevents overwriting the saved status), but the function succeeds and emits a `BanActive` event on every call regardless of prior state.

## Impact

No fund risk. A moderator can double-ban a mission, emitting a spurious `BanActive` event that off-chain indexers may misinterpret as a new ban action. Duplicate events could cause incorrect ban counts in analytics or trigger redundant alerts. Wasted compute per redundant call.

---

## Finding



**Severity**: Informational
**Category**: Arithmetic — Unchecked timestamp arithmetic
**Affected function(s)**: `ensure_missionx_tradable`, `withdraw_from_missionx`, `fail_missionx_by_time`, `accept_missionx`

## Description

Several instructions perform unchecked addition on Unix timestamp values:

```rust
// ensure_missionx_tradable
require!(current_time <= (fail_ts + config.fail_grace_period), ...);

// accept_missionx
require!(clock.unix_timestamp <= (open_timestamp + open_duration), ...);
```

`fail_grace_period`, `open_duration`, and `fail_ts` are all `u64`. If any combination of these values overflows, the deadline wraps to a small value, potentially allowing operations after their intended window has expired.

## Impact

In practice, timestamp values in use are orders of magnitude below `u64::MAX` and overflow is unexploitable in normal operation. However, an owner setting an extreme `fail_grace_period` or `open_duration` via `set_global_config` could cause an overflow that silently extends or removes a deadline. All additions should use `checked_add` to be consistent with the protocol's intent to use safe arithmetic throughout.
