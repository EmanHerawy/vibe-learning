# Security Audit: MissionX Protocol

## Overview
_Framework: Anchor 0.30.1 · Token-2022 compatible · Program ID: `79Ltf6NgMwa7pdyBqTuyHmmoeHJ5bRYZsBRuWfa4voHG`_

MissionX is an on-chain bounty marketplace where each mission is backed by a Token-2022 bonding-curve token. Anyone can post a mission by depositing a SOL payout. A moderator approves or censors it. Once open, players can accept the mission and trading begins. If the bonding curve accumulates enough SOL to reach the migration threshold, liquidity is swept by an executor. The protocol owner controls global configuration; moderators handle per-mission lifecycle transitions.

## Scope
`src/` only.

## Findings Summary

| ID | Severity | Title |
|----|----------|-------|
| F-01 | Critical | MetadataPointer extension space allocated before extension is registered |
| F-02 | Critical | `MigrateAccounts` and `ConfirmAccounts` exceed BPF stack frame limit |
| F-03 | High | Pervasive unchecked integer arithmetic across buy, sell, and reserve helpers |
| F-04 | High | Global config parameters retroactively affect all existing missions |
| F-05 | Medium | `fail_ts = 0` sentinel simultaneously locks selling and unlocks immediate owner withdrawal |
| F-06 | Medium | Buy slippage check fires before migration cap recalculates the token output |
| F-07 | Medium | Sell slippage check compares gross output before fee deduction |
| F-08 | Low | Missing cross-field and zero-value validation on configuration parameters |
| F-09 | Low | Moderator can permanently block migration by banning a `MigrationRequired` mission |
| F-10 | Low | SOL donated directly to `missionx_state` is permanently locked on successful missions |
| F-11 | Informational | Token vault is permanently locked for censored missions |
| F-12 | Informational | No account close mechanism — rent permanently locked per mission |
| F-13 | Informational | Double-banning an already-blocked mission emits a spurious event |

---

## Detailed Findings

### [F-01] MetadataPointer extension space allocated before extension is registered

In `create_missionx`, the mint account size is calculated against an empty extension list. The account is created at that size. Only then, inside a conditional block, is `MetadataPointer` pushed to the list and initialized.

```rust
let mut token_extensions: Vec<ExtensionType> = vec![];
let mint_space = ExtensionType::try_calculate_account_len::<...>(&token_extensions)?;
system_program::create_account(..., mint_space as u64, ...)?;

if let Some(metadata_authority) = ctx.accounts.config.metadata_authority {
    token_extensions.push(ExtensionType::MetadataPointer); // pushed after allocation
    token_interface::metadata_pointer_initialize(...)?;     // writes past allocated boundary
}
```

Token-2022 requires the full extension layout to be established at account creation time. Writing extension data into an account that was not sized for it causes the CPI to fail at runtime. When `config.metadata_authority` is `Some`, every call to `create_missionx` reverts at `metadata_pointer_initialize`. No missions can be created until the owner sets `metadata_authority = None`.

---

### [F-02] `MigrateAccounts` and `ConfirmAccounts` exceed BPF stack frame limit

The SBF VM enforces a hard 4096-byte stack frame limit per function. `cargo build-sbf` reports that both account validation functions exceed this limit and additionally overwrite caller frame data:

```
Error: ConfirmAccounts::try_accounts — stack offset 4104, exceeded by 8 bytes, frame 4352 bytes
Error: A function call in ConfirmAccounts::try_accounts overwrites values in the frame. (×3)

Error: MigrateAccounts::try_accounts — stack offset 5256, exceeded by 1160 bytes, frame 5568 bytes
```

The "overwrites values in the frame" messages indicate that function return values are placed over live stack slots — undefined behaviour in the BPF execution model. Any transaction invoking `complete_missionx` or `migrate` is rejected by the Solana runtime unconditionally, regardless of account state or parameters. The two instructions that represent the protocol's core success paths — completing a mission and migrating its liquidity — are permanently non-functional from deployment.

---

### [F-03] Pervasive unchecked integer arithmetic across buy, sell, and reserve helpers

The original `Cargo.toml` contains no `[profile.release]` section and no `overflow-checks = true`. In Rust release builds, integer overflow and underflow wrap silently — no panic, no revert, just a wrong value propagated through the protocol.

In `sell`, `sol_out - trading_fee` (`sell.rs:154`) is a bare subtraction. If `trade_fee_bps >= BPS (10_000)`, `trading_fee >= sol_out` and the result wraps to a near-`u64::MAX` value, causing every sell call on every mission to revert permanently.

Reserve mutations in `buy` and `sell` use bare `+=` and `-=`. In `sell`, `reserve0 -= sol_out` can underflow when `sol_out` is quoted from a large virtual reserve (`v0 + reserve0`) but real `reserve0` is small. The subtraction wraps while `sub_lamports(sol_out)` still succeeds — payout SOL is drained silently through the bonding curve and all future AMM prices are corrupted.

The migration threshold check in `buy` (`reserve0 + effective_sol_spend`) is also unchecked. On overflow the comparison becomes false, permanently suppressing migration for that mission. The virtual reserve helpers `get_full_sol_reserve`, `get_full_token_reserve`, and `get_token_reserved` use bare `+`. `get_token_reserved` feeds directly into `MINT_AMOUNT - get_token_reserved()` at mission creation — overflow corrupts `reserve1` for every new mission silently.

| Location | Operation | Effect |
|---|---|---|
| `sell.rs:154` | `sol_out - trading_fee` | All sells revert protocol-wide if `trade_fee_bps ≥ BPS` |
| `sell.rs:129` | `reserve0 -= sol_out` | Payout SOL drained via AMM, state permanently corrupted |
| `buy.rs:148-149` | `reserve0 +=`, `reserve1 -=` | AMM state corrupted |
| `buy.rs:122` | `reserve0 + sol_spend` | Migration never triggers on overflow |
| `missionx.rs:53,56` | `v0 + reserve0`, `v1 + reserve1` | Wrong AMM inputs on every trade |
| `global_config.rs:29` | `creator_payout + player_payout` | Corrupted `reserve1` at mission creation |

---

### [F-04] Global config parameters retroactively affect all existing missions

Three parameters — `fail_fee`, `trade_fee_bps`, and `fail_grace_period` — are never snapshotted into the `Missionx` account at creation. They are always read live from the global `Configuration` PDA, which the owner can update at any time. By contrast, `v0`, `v1`, `token_player_payout`, `token_creator_payout`, `migration_threshold`, and `migration_fee` are properly isolated per mission.

`fail_fee` is read in `refund_payout` (mod.rs:217), the terminal step of every mission-failure path. If the owner raises `fail_fee` above any active `payout_amount`, `checked_sub` overflows and the instruction reverts. `fail_missionx`, `fail_missionx_by_time`, `moderate_initial`, and `switch_ban_to_failed` all become permanently broken for affected missions. Because `fail_ts` is never written, the grace period never starts and the `Failed` withdrawal path is also blocked. Payout SOL is frozen until the owner corrects the config.

`trade_fee_bps` is read in both `buy` (buy.rs:144) and `sell` (sell.rs:110). Setting it at or above `BPS (10_000)` makes `checked_mul` overflow in both instructions, causing every trade on every active mission to revert. A single `set_global_config` call is a complete protocol-wide trading DoS.

`fail_grace_period` is read in `ensure_missionx_tradable` (sell gate) and `withdraw_from_missionx` (withdraw gate). Setting it to zero collapses the sell window for every mission currently in `Failed` state simultaneously — token holders cannot sell, and the owner can immediately drain every failed mission. Setting it to an excessively large value locks every failed mission's funds indefinitely.

Each parameter creates a distinct retroactive attack against the entire live mission set: raising `fail_fee` freezes payouts, setting `trade_fee_bps ≥ BPS` halts all trading in one transaction, and zeroing `fail_grace_period` lets the owner simultaneously sweep every currently-failed mission before token holders can execute a single sell.

---

### [F-05] `fail_ts = 0` sentinel simultaneously locks selling and unlocks immediate owner withdrawal

`switch_ban_to_failed(immediate=true)` sets `fail_ts = Some(0)` — Unix epoch 0. After this call, `trade_status` is restored to `Open` and `is_blocked` is cleared, making the mission appear live to off-chain tooling.

```rust
// moderate.rs:201-204
missionx_state.fail_ts = if immediate { Some(0) } else { Some(clock.unix_timestamp as u64) };
missionx_state.trade_status = MissionxTradeStatus::Open;
missionx_state.is_blocked = false;
```

Both the sell gate and the withdraw gate derive their deadline as `fail_ts + fail_grace_period`. With `fail_ts = 0`, this deadline equals the raw grace period in seconds (e.g. 2,592,000 for 30 days) — an absolute timestamp in early 1970, permanently in the past relative to current chain time (~1.7 billion seconds since epoch). The two gates then fire in opposite directions: `ensure_missionx_tradable` requires `current_time <= 0 + grace_period`, which is always false, so every sell call reverts immediately. `withdraw_from_missionx` requires `0 + grace_period < current_time`, which is always true, so withdrawal is permitted immediately.

The owner controls the moderator role via `update_moderator`. A single actor holding both keys can enable their own moderator, ban any open mission, call `switch_ban_to_failed(immediate=true)`, and in the same block call `withdraw_from_missionx` to sweep the entire vault — all Token-2022 tokens and all SOL (`payout_amount + reserve0`). Token holders see `trade_status = Open` off-chain but every sell reverts on-chain with a grace period error. The protocol documents `immediate = true` as intentional, but the on-chain effect is indistinguishable from a rug pull against any active mission.

---

### [F-06] Buy slippage check fires before migration cap recalculates the token output

`buy` validates `effective_sol_spend <= pay_cap` before the migration cap logic, which may silently reduce the spend and recalculate the token output:

```rust
require!(effective_sol_spend <= pay_cap, MissionxErrors::SlippageLimit);

if migration_threshold <= (reserve0 + effective_sol_spend) {
    effective_sol_spend = migration_threshold - reserve0; // silently reduced
    effective_buy_amount = get_amount_out_tokens(..., effective_sol_spend, ...)?;
}
// no second slippage check
```

At the migration boundary, `effective_sol_spend` is clamped to `migration_threshold - reserve0` and the token output is recalculated from the new (lower) spend. The slippage check already passed on the original values — the user receives materially fewer tokens than their `pay_cap` implies with no on-chain protection. Additionally, if `reserve1 < effective_buy_amount` after recalculation, the unchecked `reserve1 -= effective_buy_amount` underflows and permanently corrupts AMM state for the mission.

---

### [F-07] Sell slippage check compares gross output before fee deduction

`sell` validates `sol_out >= min_out` before computing and deducting `trading_fee`. The user receives `sol_out - trading_fee`, not `sol_out`.

```rust
require!(sol_out >= min_out, MissionxErrors::SlippageLimit); // checks gross amount

let trading_fee = sol_out.checked_mul(config.trade_fee_bps)? / BPS;
ctx.accounts.user.add_lamports(sol_out - trading_fee)?;      // user receives net
```

The slippage guard does not account for the fee. With `trade_fee_bps` settable by the owner with no upper bound, even a 10% fee on a 10 SOL quote with `min_out = 9.5 SOL` delivers 9.0 SOL to the user — below the declared minimum — while the check passes. Combined with front-running, a sandwich attack that barely clears `min_out` gross still delivers a sub-`min_out` net amount.

---

### [F-08] Missing cross-field and zero-value validation on configuration parameters

Two classes of missing validation exist in `init` and `set_global_config`. `fail_fee` is never compared against `missionx_payout_min`. When `fail_fee > payout_amount`, every failure path reverts inside `refund_payout` on `checked_sub`. Because `fail_ts` is never written, the grace period never starts and the `Failed` withdrawal path is also permanently blocked — mission payout SOL is frozen until the owner corrects the config.

`fee_recipient`, `v0`, and `v1` accept zero values without error. A zero `fee_recipient` silently routes all protocol fees to the system burn address, permanently destroying them. A zero `v0` causes `get_full_sol_reserve()` to return only `reserve0`; at mission start `reserve0 = 0`, so the first `buy` divides by zero and panics. A zero `v1` produces the same failure on the token side. Both defects also apply to `set_global_config`, which can update these fields at any time without re-validation.

---

### [F-09] Moderator can permanently block migration by banning a `MigrationRequired` mission

`ban_active` guards only against `Unverified` status, imposing no restriction on `trade_status`. A moderator can call it on a mission in `MigrationRequired` state with `ban_sell=true`, which saves `MigrationRequired` into `old_trade_status` and sets `trade_status = Banned`. `migrate` requires `trade_status == MigrationRequired` — with `Banned` it reverts permanently. Recovery requires the same moderator to voluntarily call `unban_active`, creating an uncontrolled external dependency. A moderator can freeze any mission at the migration boundary, locking all `reserve0` SOL and the full token vault indefinitely and preventing player and creator token payouts, which are distributed only at migration.

---

### [F-10] SOL donated directly to `missionx_state` is permanently locked on successful missions

All SOL accounting is done through `reserve0`. SOL sent directly to `missionx_state` via `system_program::transfer` increases its lamport balance but leaves `reserve0` unchanged. `withdraw_from_missionx` is restricted to `Open` and `Failed` statuses and returns `false` for `Completed` and `Migrated`. No other instruction sweeps residual lamports. For missions that succeed, `complete_missionx` subtracts only `payout_amount` and `migrate` sweeps only `reserve0` — any excess lamports remain on the PDA permanently with no exit path. While unprofitable for an attacker (they also lose the donated SOL), it creates irrecoverable on-chain waste at protocol scale and a persistent discrepancy between the PDA lamport balance and protocol accounting that can mislead off-chain indexers.

---

### [F-11] Token vault is permanently locked for censored missions

`moderate_initial(block=true)` sets `missionx_status = Censored` and calls `refund_payout` to return the SOL deposit to the creator. The `token_vault_pda` is not touched — it holds the full `MINT_AMOUNT` minted at creation. No subsequent instruction provides a path to drain or burn it. `withdraw_from_missionx` returns `false` for all statuses other than `Open` and `Failed`. Trading instructions require `trade_status = Open`, which a censored mission never reaches. Every censored mission permanently locks `MINT_AMOUNT` Token-2022 tokens and the vault rent (~0.002 SOL) with no recovery path. At protocol scale with active moderation, cumulative locked rent grows without bound.

---

### [F-12] No account close mechanism — rent permanently locked per mission

No instruction in the program uses a `close =` constraint on any PDA. Every mission creates `missionx_state` (~0.002–0.003 SOL rent) and `token_vault_pda` (~0.002 SOL rent), neither of which can ever be closed. None of the terminal instructions — `complete_missionx`, `migrate`, `withdraw_from_missionx`, `moderate_initial` — return rent to the creator or owner. Approximately 0.004–0.005 SOL is permanently burned per mission with no recovery path for creators or the protocol.

---

### [F-13] Double-banning an already-blocked mission emits a spurious event

`ban_active` does not check `is_blocked` before setting it to `true`. A moderator can call it repeatedly on the same mission. The `old_trade_status` field is guarded (`if is_none()`) so the saved status is not overwritten, but the function succeeds and emits a `MissionxBan` event on every call regardless of prior state. There is no fund risk — the impact is limited to off-chain indexers potentially miscounting ban actions.
