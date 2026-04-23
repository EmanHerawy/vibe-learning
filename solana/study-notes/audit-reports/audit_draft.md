# StakeFlow Security Audit — Draft Report

**Program:** `stake-flow`
**Framework:** Anchor
**Auditor:** Learning audit (StakeFlow Audit Arena)
**Date:** 2026-04-22
**Severity Scale:** Critical · High · Medium · Low · Informational

---

## Summary Table

| ID | Title | Severity | Status |
|----|-------|----------|--------|
| SF-01 | Rug pull vector — `rebalance_pools` / `withdraw_reserves` have no floor, operator can drain all user principal | Critical | Open |
| SF-02 | `unstake_locked` ignores `reward_debt` — double reward payout | High | Open |
| SF-03 | Unchecked rate change mechanism — retroactive manipulation, underflow DoS, Jito MEV | High | Open |
| SF-04 | `donation_vault` has no outflow — tokens and rent permanently locked | Medium | Open |
| SF-05 | `instant_unlock` after lockup expiry silently forfeits all rewards | Low | Open |
| SF-06 | No Token-2022 extension checks — `TransferFee` breaks accounting, `TransferHook` enables reentrancy | Low | Open |
| SF-07 | Validator timestamp manipulation allows early lockup bypass | Informational | Open |
| SF-08 | `set_operator` / `set_liquidity_manager` accept zero pubkey | Informational | Open |
| SF-09 | `update_reward_rates` allows zero rate — rewards silently disabled | Informational | Open |
| SF-10 | `is_active` field is dead code — never set to false | Informational | Open |

---

## SF-01 — Rug Pull Vector: `rebalance_pools` / `withdraw_reserves` Have No Floor on `stake_vault`

**Severity:** Critical
**Location:** `rebalance_pools` line ~645, `withdraw_reserves` line ~582

### Description

`stake_vault` holds all user principal. `rebalance_pools` lets the operator move any amount
from `stake_vault` to `reserve_vault` with no lower-bound check. `withdraw_reserves` lets
the liquidity manager drain `reserve_vault` to an external wallet with no check either.
Combined, two privileged calls can move all user principal out of the protocol entirely.

When users later try to unstake, every withdrawal instruction checks only `stake_vault.amount`:

```rust
require!(
    ctx.accounts.stake_vault.amount >= total_out,
    StakeFlowError::InsufficientVaultBalance  // ← only stake_vault checked
);
```

`reserve_vault` balance is invisible to withdrawal logic. Users are blocked even if
`reserve_vault` is full.

### Attack Path (Rug Pull)

```
Total user principal: 1,000,000 X → stake_vault = 1,000,000

Step 1: operator calls rebalance_pools(900,000, stake→reserve)
        stake_vault  =   100,000  ← no guard, no floor enforced
        reserve_vault =  900,000

Step 2: liq_manager calls withdraw_reserves(900,000)
        reserve_vault =        0
        liq_manager wallet = 900,000  ← outside protocol

Step 3: users try to unstake 1,000,000
        stake_vault = 100,000 → InsufficientVaultBalance for 900,000 users
        reserve_vault = 0     → no fallback
        funds are permanently gone
```

Since `operator`, `liquidity_manager`, and `admin` all default to the same key at
initialization, a single compromised key executes the full sequence in two transactions.

### Missing Invariant

The entire protocol has no enforcement of:
```
stake_vault.amount >= config.total_locked   (at all times)
```

This invariant is broken by `rebalance_pools`, `withdraw_reserves`, and every reward payout
(all withdrawals use only `stake_vault`).

### Fix
The current design needs a revisit to ensure the protocol is secure and robust.
A patch-level fix (adding `require!` checks) is insufficient here because the trust assumption
itself is broken — the design relies on privileged roles behaving correctly. The recommended
fix is a trustless, automated vault architecture.

---

## SF-02 — `unstake_locked` Ignores `reward_debt` — Double Reward Payout

**Severity:** High
**Location:** `unstake_locked` line ~381

### Description

`unstake_locked` computes rewards as `amount × rate × duration / denom` using the full elapsed
time from `stake_timestamp` but never subtracts `reward_debt`. Every other reward-paying
instruction (`claim_rewards`, `partial_unstake`) correctly subtracts `reward_debt` to avoid
double-paying already-settled rewards. `unstake_locked` is the odd one out.

### Vulnerable Code

```rust
// unstake_locked — reward_debt never read or subtracted
let rewards = (amount as u128)
    .checked_mul(config.locked_reward_rate_bps as u128)?
    .checked_mul(duration as u128)?
    .checked_div((SECONDS_PER_YEAR as u128).checked_mul(BPS_DENOMINATOR as u128)?)?
    as u64;
let total_out = amount.checked_add(rewards)?;  // ❌ full rewards, ignores reward_debt

// claim_rewards — correct pattern for comparison
let pending_rewards = total_rewards
    .checked_sub(user_stake.reward_debt)?;      // ✓ subtracts debt
```

### Attack Scenario (10% APR)

```
T=0:    stake 1,000,000 tokens, reward_debt = 0
T=180d: claim_rewards → receives 49,315 tokens, reward_debt = 49,315
T=270d: call unstake_locked

  Actual payout:  1,000,000 + (1,000,000 × 10% × 270/365) = 1,073,973
  Correct payout: 1,000,000 + (73,973 - 49,315)           = 1,024,658
  Stolen:         49,315 tokens
```

Attacker maximises by calling `claim_rewards` repeatedly to build `reward_debt`,
then calling `unstake_locked` to double-collect the full accumulated debt.

### Fix

```rust
let pending = rewards
    .checked_sub(user_stake.reward_debt)
    .ok_or(StakeFlowError::ArithmeticOverflow)?;
let total_out = amount.checked_add(pending)?;
```

---

## SF-03 — Unchecked Rate Change Mechanism

**Severity:** High
**Location:** `update_reward_rates` line ~522, all reward calculation sites

### Description

`update_reward_rates` has three compounding problems that together make it a critical attack
surface: the rate applies retroactively to full stake history, rate drops can permanently lock
users out, and there is no timelock or pause requirement before changes take effect.

---

### Attack Vector A — Retroactive Rate Manipulation

The reward formula everywhere uses the **current** rate applied to the **full elapsed period**
from `stake_timestamp`. There is no per-user rate snapshot or checkpoint system.

```rust
let total_accrued = (amount as u128)
    .checked_mul(config.locked_reward_rate_bps as u128)  // ← current rate, not rate at stake time
    .checked_mul(elapsed as u128)
    .checked_div(SECONDS_PER_YEAR * BPS_DENOM)?;
```

**Operator self-enrichment:**
```
1. Operator stakes large personal position at 10% APR
2. Raises rate to MAX 50% APR — instantly rewrites reward history for all users
3. Calls claim_rewards → receives 50% × full_duration retroactively
4. Drops rate back to 10% — vault partially drained, other users unaware
```

**Silent user slashing:**
```
Users staked 11 months at 50% APR, expecting large payout.
Operator drops rate to 1% one block before mass claims.
Users receive: amount × 1% × 1yr ≈ nothing
Lost: ~11 months of 50% APR rewards — silently gone
```

---

### Attack Vector B — Rate Drop Causes Permanent Underflow DoS

`reward_debt` is stored as an absolute token amount computed at the rate active at claim time.
If the operator lowers the rate after a user has claimed, `total_accrued` (smaller rate × same
elapsed) falls below `reward_debt`, causing `checked_sub` to underflow permanently.

```rust
// After rate drop:
let total_rewards = amount × new_low_rate × elapsed / denom;  // e.g. 300
let pending = total_rewards
    .checked_sub(user_stake.reward_debt)  // 300 - 500 = UNDERFLOW → reverts forever
    .ok_or(StakeFlowError::ArithmeticOverflow)?;
```

**Affected instructions:**

| Instruction | Uses `reward_debt`? | DoS'd by rate drop? |
|---|---|---|
| `claim_rewards` | Yes | ❌ permanent revert |
| `partial_unstake` | Yes | ❌ permanent revert |
| `unstake_locked` | No (SF-01 bug) | ✅ still works (overpays) |
| `instant_unlock` | No | ✅ works — but forfeits all rewards |

**Critical fix-ordering dependency:** If SF-01 is fixed (adding `reward_debt` subtraction to
`unstake_locked`) WITHOUT fixing this issue, `unstake_locked` also becomes permanently DoS'd
after a rate drop. The user's only remaining exit is `instant_unlock`, which forfeits all earned
rewards. If still within lockup, they have zero exit — completely frozen.


**Worst case timeline:**
```
T=30d: User claims rewards → reward_debt = 500
T=31d: Operator drops rate

- claim_rewards   → reverts (underflow)
- partial_unstake → reverts (underflow)
- unstake_locked  → if `SF-02` fixed, it reverts (underflow) 
- instant_unlock  → works, but forfeits ALL earned rewards

User has no path to recover rewards.
```

---

### Attack Vector C — No Timelock, No Pause Required, Jito MEV

`update_reward_rates` takes effect instantly with no delay or announcement period.
On Solana mainnet, ~50% of validators use the Jito block engine (equivalent of Flashbots).
An operator with Jito access can atomically in a single bundle:

```
tx1: update_reward_rates(new_locked = 50%)  ← raise to max
tx2: claim_rewards                           ← retroactive windfall at 50%
tx3: update_reward_rates(new_locked = 10%)  ← drop back, appear normal
```

All three execute atomically in one block. No front-run opportunity for users, no on-chain
warning. The emitted `RewardRatesUpdated` event is the only trace.

---

### Attack Vector D — Zero Rate Allowed

Both `new_liquid_rate_bps` and `new_locked_rate_bps` can be set to `0`. Upper bound and relative
order are checked but no lower bound exists:

```rust
require!(new_liquid_rate_bps <= MAX_REWARD_RATE_BPS, ...);  // ✓ upper bound
require!(new_locked_rate_bps <= MAX_REWARD_RATE_BPS, ...);  // ✓ upper bound
require!(new_locked_rate_bps >= new_liquid_rate_bps, ...);  // ✓ 0 >= 0 passes
// ❌ no lower bound — zero is accepted
```

Zero rate silently disables all reward accrual. Users continue staking, expecting rewards
that have stopped accumulating with no protocol pause, no forced announcement, no user alert.

---

### Fixes

1. **Checkpoint rewards at each rate change** — compute and store `settled_rewards` for all
   users at the old rate before switching, so `reward_debt` invariant is never violated
2. **Store `rate_at_stake_time` in `UserStake`** — each user earns at the rate active when they staked
3. **Add timelock** — minimum 24–48h between rate announcement and activation
4. **Require pause** before rate changes can be applied
5. **Enforce `> 0` lower bound** on both rates

---

## SF-03 — `donation_vault` Has No Outflow: Tokens and Rent Permanently Locked

**Severity:** Medium
**Location:** `donate` instruction line ~720, `Donate` context line ~1312

### Description

The `donate` instruction transfers any SPL token into a PDA-controlled ATA. No withdrawal
instruction exists anywhere in the program. The vault's authority is `protocol_config` — a PDA
that can only sign via `CpiContext::new_with_signer`. Since no instruction constructs that
signer context for the donation vault, no one can ever move those tokens out.

The token account also cannot be closed while non-empty (to recover ~0.002 SOL rent).
Every donated mint creates a new permanently locked ATA.

| What is locked | Why |
|---|---|
| All donated token balances | No withdrawal instruction with PDA signer |
| ~0.002 SOL rent per vault | Cannot close non-empty token account |

**If program is immutable:** escalates to Critical — no recovery ever.
**If program is upgradeable:** Medium — recoverable via a future upgrade.

### Fix

```rust
pub fn withdraw_donation(ctx: Context<WithdrawDonation>, amount: u64) -> Result<()> {
    require!(ctx.accounts.admin.key() == ctx.accounts.protocol_config.admin,
             StakeFlowError::Unauthorized);
    token_interface::transfer_checked(
        CpiContext::new_with_signer(..., signer_seeds),
        amount,
        decimals,
    )?;
}
```

---

## SF-04 — `instant_unlock` After Lockup Expiry Silently Forfeits All Rewards

**Severity:** Low
**Location:** `instant_unlock` line ~748

### Description

`instant_unlock` is an emergency exit returning principal only, with no yield. It has no check
for whether the lockup has already expired. A user who calls `instant_unlock` after expiry —
confused about which instruction to use — permanently forfeits all accrued rewards with no
warning. The account is closed and there is no recovery path.

### Vulnerable Code

```rust
pub fn instant_unlock(ctx: Context<InstantUnlock>) -> Result<()> {
    // ❌ No check: clock.unix_timestamp < user_stake.lockup_expiry
    let amount = user_stake.amount;
    // Pays principal only, rewards silently lost forever
    // Account closed via `close = user`
```

### Fix

```rust
// Block instant_unlock once lockup has expired
require!(
    clock.unix_timestamp < user_stake.lockup_expiry,
    StakeFlowError::LockupAlreadyExpired  // "Use unstake_locked to claim rewards"
);
```

---

## SF-05 — No Token-2022 Extension Checks: `TransferFee` Breaks Accounting, `TransferHook` Enables Reentrancy

**Severity:** Low
**Location:** All `token_interface::transfer_checked` calls (~10 locations), `initialize`

### Description

The program uses `TokenInterface` which accepts both SPL Token and Token-2022 mints. Token-2022
introduces extensions that silently corrupt accounting or introduce reentrancy vectors. None are
checked at initialization or at any instruction site.

| Extension | Risk | Impact |
|---|---|---|
| `TransferFee` | Vault receives less than `amount` | `total_staked` / `total_locked` overcount → insolvency |
| `TransferHook` | Arbitrary CPI fires mid-transfer | Reentrancy before state is written |
| `PermanentDelegate` | Third party can drain vaults | Total fund loss |
| `ConfidentialTransfer` | Amounts hidden | Vault balance tracking unreliable |
| `NonTransferable` | Every transfer reverts | Protocol unusable |

### Concrete Accounting Break (`TransferFee`)

```
Stake token has 1% TransferFee.

stake_locked(1,000,000):
  transfer_checked executes → fee applied → vault receives 990,000
  config.total_locked += 1,000,000  ← recorded 1,000,000, only 990,000 arrived

unstake_locked later:
  tries to send 1,000,000 back
  stake_vault.amount = 990,000 → InsufficientVaultBalance → user cannot withdraw principal
```

Accumulated across many stakers, the accounting gap grows proportionally with total volume
until the protocol is structurally insolvent — identical in consequence to SF-02.

### Fix

At `initialize`, reject mints with dangerous extensions:
```rust
// Use spl_token_2022::extension::StateWithExtensions to inspect mint extensions
// Reject: TransferFee, TransferHook, PermanentDelegate, ConfidentialTransfer
// Or: restrict to plain SPL Token only and document explicitly
```

---

## SF-06 — Validator Timestamp Manipulation Allows Early Lockup Bypass

**Severity:** Informational
**Location:** `stake_locked` line ~257, `unstake_locked` line ~366, `partial_unstake` line ~820

### Description

Lockup expiry and reward elapsed time rely entirely on `Clock::get()?.unix_timestamp`. On
Solana, the block leader can skew the timestamp by ~1–2 seconds per slot. A colluding validator
can set the timestamp slightly ahead, allowing a user's lockup check to pass a few slots before
true wall-clock expiry and slightly inflating elapsed time for reward calculations.

Impact is bounded (seconds to low minutes under normal conditions, larger drift on testnet or
with a colluding validator). This is a known Solana platform constraint, not a bug unique to
this program, but worth documenting for completeness.

### Fix

- Document the accepted timestamp tolerance
- For high-value lockups, add a small safety buffer: `lockup_expiry = stake_timestamp + LOCKUP_DURATION + TIMESTAMP_TOLERANCE`

---

## SF-07 — `set_operator` / `set_liquidity_manager` Accept Zero Pubkey

**Severity:** Informational
**Location:** `set_operator` line ~121, `set_liquidity_manager` line ~137

### Description

Both instructions accept `Pubkey::default()` (`11111111111111111111111111111111` — the System
Program) as the new role address. No private key corresponds to the zero pubkey, so setting
either role to it permanently bricks that role. The admin can fix this by calling the instruction
again with a valid key, keeping severity Low. Additional gaps: no check for no-op updates
(`new == current`) or role confusion (`new == admin`).

### Fix

```rust
require!(new_operator != Pubkey::default(), StakeFlowError::ZeroAddress);
require!(new_operator != config.operator,   StakeFlowError::NoChange);
```

---

## SF-08 — `update_reward_rates` Allows Zero Rate

**Severity:** Informational
**Location:** `update_reward_rates` line ~522

### Description

Upper bound and relative ordering of rates are enforced, but no lower bound exists. Both rates
can be set to `0` — `0 >= 0` satisfies the `locked >= liquid` check. A zero rate silently
disables all reward accrual with no protocol pause, no announcement, and no user alert. Users
continue staking against a promise of rewards that stopped accruing.

```rust
require!(new_liquid_rate_bps <= MAX_REWARD_RATE_BPS, ...);  // ✓ upper bound
require!(new_locked_rate_bps <= MAX_REWARD_RATE_BPS, ...);  // ✓ upper bound
require!(new_locked_rate_bps >= new_liquid_rate_bps, ...);  // ✓ 0 >= 0 passes
// ❌ no lower bound
```

### Fix

```rust
require!(new_liquid_rate_bps > 0, StakeFlowError::ZeroRate);
require!(new_locked_rate_bps > 0, StakeFlowError::ZeroRate);
```

---

## SF-09 — `is_active` Field Is Dead Code

**Severity:** Informational
**Location:** `UserStake` struct line ~1511, all `require!(user_stake.is_active, ...)` checks

### Description

`is_active` is set to `true` once in `stake_locked` and never set to `false` anywhere. The
`require!(is_active)` guard in `unstake_locked`, `claim_rewards`, `instant_unlock`, and
`partial_unstake` is therefore unreachable:

- If the `UserStake` account exists → `is_active` is always `true` → guard always passes
- If the account was closed → Anchor fails at deserialization before the guard is reached

The developer left an `// audit:Q` comment acknowledging this (line ~754).

### Fix

Remove the field and all `require!(is_active)` checks entirely, or implement a genuine
lifecycle with explicit transitions if future instructions need to deactivate without closing.

---

## Appendix — Rate Invariant Enforcement Locations

Both rate invariants (`<= 50% APR` and `locked >= liquid`) are enforced in exactly two places:

```rust
// initialize (lines 78–89)
require!(liquid_reward_rate_bps  <= MAX_REWARD_RATE_BPS, ...);
require!(locked_reward_rate_bps  <= MAX_REWARD_RATE_BPS, ...);
require!(locked_reward_rate_bps  >= liquid_reward_rate_bps, ...);

// update_reward_rates (lines 528–539)
require!(new_liquid_rate_bps <= MAX_REWARD_RATE_BPS, ...);
require!(new_locked_rate_bps <= MAX_REWARD_RATE_BPS, ...);
require!(new_locked_rate_bps >= new_liquid_rate_bps, ...);
```

**Gaps not enforced anywhere:**
- `> 0` lower bound (see SF-10)
- Maximum delta per update (no rate-change speed limit)
- Timelock between announcement and activation (see SF-03 Vector C)

---

*End of Draft Report — SF-01 through SF-10*

