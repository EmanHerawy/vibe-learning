# Sui Migration Patterns

**Primary sources:**
- Move Book — Upgradeability Practices — https://move-book.com/guides/upgradeability-practices/
- Move Book — Dynamic Fields — https://move-book.com/programmability/dynamic-fields.html
- Sui Framework — package.move — https://github.com/MystenLabs/sui/blob/main/crates/sui-framework/packages/sui-framework/sources/package.move
- Session notes 2026-04-24 — UpgradeCap security & multi-role access control
- Session notes 2026-04-26 — Migration best practices deep-dive

---

## The Two "Versions" — Critical Distinction

> Source: Sui Framework (package.move) + Move Book upgradeability guide

```
┌──────────────────────────────────┬──────────────────────────────────────────┐
│  Sui Runtime Version             │  App-Level version Field                 │
├──────────────────────────────────┼──────────────────────────────────────────┤
│  Managed by: Sui VM              │  Managed by: developer in Move           │
│  Trigger: every object mutation  │  Trigger: explicit migrate() call        │
│  Purpose: lamport clock,         │  Purpose: which package schema this      │
│           concurrency control    │           object is compatible with       │
│  Accessible from Move: NO        │  Accessible from Move: YES (u64 field)   │
│  Example: object touched 47×     │  Example: "this object is on V2 schema"  │
└──────────────────────────────────┴──────────────────────────────────────────┘
```

---

## Pattern 1 — Object Versioning

> Source: move-book.com/guides/upgradeability-practices/

```move
const VERSION: u64 = 2;
const E_WRONG_VERSION: u64 = 0;

public struct Protocol has key {
    id: UID,
    version: u64,   // ← MUST be present from first publish. Cannot be added later.
}

// Every entry point — forced migration
public entry fun deposit(p: &mut Protocol, ...) {
    assert!(p.version == VERSION, E_WRONG_VERSION);
    ...
}

// Graceful migration — accept any version >= minimum
public entry fun deposit_graceful(p: &mut Protocol, ...) {
    assert!(p.version >= MIN_VERSION, E_WRONG_VERSION);
    ...
}

// Post-upgrade admin function
public fun migrate(_: &AdminCap, p: &mut Protocol) {
    assert!(p.version == VERSION - 1, E_WRONG_VERSION); // idempotency guard
    p.version = VERSION;
    // one-time data transforms here
}
```

```
Forced vs Graceful:
┌──────────────┬──────────────────────────────────┬──────────────────────────┐
│ Mode         │ Version assert                   │ Use case                 │
├──────────────┼──────────────────────────────────┼──────────────────────────┤
│ Forced       │ == VERSION                       │ Security patch, breaking │
│ Graceful     │ >= MIN_VERSION                   │ Non-critical, user-kind  │
└──────────────┴──────────────────────────────────┴──────────────────────────┘
```

**⚠️ Launch requirement:** Add `version: u64` before first publish. Struct fields are frozen under compatible policy — this field cannot be retrofitted.

---

## Pattern 2 — Anchor / Config Pattern (Dynamic Fields)

> Source: move-book.com/guides/upgradeability-practices/ + dynamic-fields

Struct fields can never be added or changed under compatible policy. Dynamic fields can.

```move
use sui::dynamic_field as df;

// Stable anchor — public signature never changes
public struct Protocol has key { id: UID, version: u64 }

// V1 Config — original package
public struct ConfigV1 has store { fee_bps: u64, recipient: address }

// V2 Config — upgraded package adds fields
public struct ConfigV2 has store {
    fee_bps: u64,
    recipient: address,
    max_deposit: u64,   // ← new: impossible to add as struct field
    paused: bool,       // ← new
}

// ✅ ALWAYS use a typed struct key — never raw vector<u8>/String
public struct ConfigKey has copy, drop, store {}

// Access
public fun fee_bps(p: &Protocol): u64 {
    df::borrow<ConfigKey, ConfigV2>(&p.id, ConfigKey {}).fee_bps
}

// Migration: V1 → V2
public fun migrate(_: &AdminCap, p: &mut Protocol) {
    let ConfigV1 { fee_bps, recipient } =
        df::remove<ConfigKey, ConfigV1>(&mut p.id, ConfigKey {});
    df::add(&mut p.id, ConfigKey {}, ConfigV2 {
        fee_bps, recipient, max_deposit: 1_000_000, paused: false,
    });
    p.version = 2;
}
```

**Typed key collision safety:**
```
Field address = hash(parent.id || key_value || KeyType)
                                                ↑
                             Type is included — two different structs
                             with same content → different field address
```

---

## Pattern 3 — Dynamic Fields vs Dynamic Object Fields

> Source: move-book.com/programmability/dynamic-fields

```
┌────────────────────────────┬──────────────────────────────────┐
│  dynamic_field (df)        │  dynamic_object_field (dof)      │
├────────────────────────────┼──────────────────────────────────┤
│  Value ability: store      │  Value ability: key + store      │
│  Visible in Explorer: NO   │  Visible in Explorer: YES        │
│  Direct access by ID: NO   │  Direct access by ID: YES        │
│  Gas cost: lower           │  Gas cost: higher                │
│  Use: config, scalars      │  Use: sub-objects users need     │
└────────────────────────────┴──────────────────────────────────┘
```

**Limit:** Max 1,000 dynamic fields created per transaction.

---

## Pattern 4 — Hot Potato Atomic Upgrade

> Source: github.com/MystenLabs/sui — package.move

The upgrade is a hot-potato chain — cannot be split across transactions:

```
Transaction boundary:
┌────────────────────────────────────────────────────────────────────┐
│  authorize_upgrade(cap, policy, digest)                            │
│      → UpgradeTicket  (no drop, no store — hot potato)            │
│                                                                    │
│  [Sui runtime verifies bytecode matches digest]                    │
│      → UpgradeReceipt (no drop, no store — hot potato)            │
│                                                                    │
│  commit_upgrade(cap, receipt)                                      │
│      → cap.version++, cap.package = new_package_id                │
└────────────────────────────────────────────────────────────────────┘
```

- Cannot authorize and delay — ticket must be consumed in same tx
- Cannot fake receipt — issued only by Sui runtime on valid bytecode
- Full upgrade is atomic: all-or-nothing

---

## Pattern 5 — Upgrade Governance (Wrapping UpgradeCap)

> Source: package.move + session 2026-04-24

### 5A — Timelock

```move
public struct TimelockCap has key {
    id: UID,
    upgrade_cap: UpgradeCap,        // wrapped — not transferable externally
    delay_ms: u64,                  // e.g. 604_800_000 = 7 days
    pending_digest: Option<vector<u8>>,
    scheduled_at: Option<u64>,
}

// Phase 1 — admin schedules (starts user exit window)
public fun schedule(_: &AdminCap, tl: &mut TimelockCap, digest: vector<u8>, clock: &Clock) {
    tl.pending_digest = option::some(digest);
    tl.scheduled_at = option::some(clock::timestamp_ms(clock));
}

// Phase 2 — anyone executes after delay expires
public fun execute(tl: &mut TimelockCap, clock: &Clock): UpgradeTicket {
    let elapsed = clock::timestamp_ms(clock) - *option::borrow(&tl.scheduled_at);
    assert!(elapsed >= tl.delay_ms, E_TOO_EARLY);
    package::authorize_upgrade(&mut tl.upgrade_cap, COMPATIBLE,
        option::extract(&mut tl.pending_digest))
}
```

```
Timelock periods by protocol type:
  24h    → fast protocols, hot-wallet ops
  7 days → DeFi, token protocols
  30 days → high-value vaults, bridges
```

### 5B — Multi-sig Ownership (no code change needed)

```bash
sui keytool multi-sig-address --pks <PK1> <PK2> <PK3> --weights 1 1 1 --threshold 2
sui client transfer --to <MULTISIG_ADDR> --object-id <UPGRADE_CAP_ID>
```

---

## Publisher Object — Persists Across All Upgrades

> Source: package.move (MystenLabs/sui)

```move
// init() — runs ONCE on first publish only
fun init(witness: MY_PACKAGE, ctx: &mut TxContext) {
    let publisher = package::claim(witness, ctx);
    // Publisher survives ALL future upgrades — it is permanent proof of ownership
    transfer::public_transfer(publisher, ctx.sender());
}
```

```
Publisher properties:
├─ Issued: once, on first publish via OTW
├─ Survives: all package upgrades
├─ Used for: Display standard registration, type exclusivity checks
├─ If lost: cannot re-issue — Display and ownership proofs are gone
└─ Pawtato fix: package::upgrade_package(cap) == @pkg_addr ← equivalent check
```

---

## Orphaned Dynamic Field — Silent Data Loss

> Source: move-book.com/programmability/dynamic-fields

```move
// ❌ WRONG — fields silently stranded on-chain forever
public fun destroy(p: Protocol) {
    let Protocol { id, version: _ } = p;
    object::delete(id);   // config and stats still exist, now unreachable
}

// ✅ CORRECT — drain dynamic fields before deleting parent
public fun destroy(p: Protocol) {
    let config = df::remove<ConfigKey, Config>(&mut p.id, ConfigKey {});
    drop_config(config);
    let stats = df::remove<StatsKey, Stats>(&mut p.id, StatsKey {});
    drop_stats(stats);
    let Protocol { id, version: _ } = p;
    object::delete(id);
}
```

Orphaned fields: permanently inaccessible, still accrue storage rebate liability.

---

## Cross-Package Dependency Migration

> Source: Sui Move package model

```
Dependency graph:
  PackageA (token) ← PackageB (staking) ← PackageC (rewards)

  PackageA upgrades → B and C must republish (pinned address is stale)
```

```toml
# Move.toml — update after PackageA upgrade
[addresses]
token = "0x<NEW_PACKAGE_ADDRESS>"
```

Upgrading a root package = coordinated republish event. Plan it as a migration event, not a routine deploy.

---

## Common Migration Mistakes — Severity Ranking

> Source: move-book upgradeability guide + session 2026-04-24

| # | Mistake | Consequence |
|---|---------|-------------|
| 1 | No `version` field at launch | No migration path — protocol is stuck forever |
| 2 | Inline struct config (fee, address, limits) | Cannot evolve — must rewrite protocol |
| 3 | `UpgradeCap has key, store` in hot wallet | Stealable via PTB — one phishing = full control |
| 4 | No timelock on upgrades | Instant upgrade + drain possible |
| 5 | `&mut UID` exposed in public function | Any module can add/remove dynamic fields |
| 6 | `df::remove` in unauthenticated `public fun` | Anyone strips config off your objects |
| 7 | Deleting parent without removing dynamic fields | Orphaned fields, permanent storage leak |
| 8 | Delaying `migrate()` after upgrade deploy | Window where old + new code co-exist; inconsistent state |
| 9 | Bumping version before data transform completes | Version says migrated; state says not yet |

---

## Auditor Grep Checklist

> Source: session 2026-04-26

```bash
# 1. Live object version vs code's expected VERSION constant
sui client object <PROTOCOL_ID> --json | jq '.content.fields.version'
grep -r "VERSION\s*=" sources/

# 2. Are all entry points version-gated?
grep -rn "public entry fun\|entry fun" sources/
# → manually verify each calls assert!(p.version == VERSION, ...)

# 3. Dynamic field writes — are they all privileged?
grep -rn "df::add\|df::remove\|dynamic_field::add\|dynamic_field::remove" sources/

# 4. Is migrate() guarded?
grep -rn "fun migrate\|fun upgrade\|fun set_version" sources/

# 5. UID exposure
grep -rn "&mut.*\.id\b" sources/

# 6. Timelock on authorize_upgrade?
grep -rn "authorize_upgrade" sources/

# 7. Orphaned fields — any object::delete without df::remove before it?
grep -rn "object::delete" sources/
```

---

## The Full Upgrade Exploit Chain

> Source: session 2026-04-24 + upgradeability guide synthesis

```
Step 1: Attacker controls UpgradeCap
        (owned directly, or stolen via Vuln A unguarded mint / Vuln B unguarded extract)
    ↓
Step 2: Publishes compatible upgrade
        Changes fee recipient → attacker address
        Changes ed25519_verify → always returns true
        Public API unchanged — auditors see no signature diff
    ↓
Step 3: Calls migrate() immediately after upgrade
        All users on old version now abort on every call
    ↓
Step 4: All protocol revenue flows to attacker
        All auth checks bypassed

"Compatible policy" is not a safety signal.
```

---

## Key Takeaways

```
┌──────────────────────────────────────────────────────────────────────────┐
│  1. version: u64 field must exist from first publish — add it always.   │
│  2. Dynamic field typed keys prevent collisions — never use raw bytes.  │
│  3. Wrapping UpgradeCap in a timelock is the minimum governance bar     │
│     for any protocol holding user funds.                                │
│  4. Orphaned dynamic fields are permanent — drain before delete.        │
│  5. Compatible upgrade + forced migrate() = full logic swap on all      │
│     users in one transaction. "Compatible" ≠ safe.                      │
└──────────────────────────────────────────────────────────────────────────┘
```
