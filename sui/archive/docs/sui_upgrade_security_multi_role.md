# Sui Package Upgrade Security & Multi-Role Access Control

**Primary sources:**
- Sui Docs > Package Upgrades — https://docs.sui.io/concepts/sui-move-concepts/packages/upgrade
- Sui Framework > sui::package module — https://docs.sui.io/references/framework/sui_sui/package
- OpenZeppelin Notorious Bug Digest #8 — https://www.openzeppelin.com/news/the-notorious-bug-digest-8

---

## UpgradeCap — Structure & Abilities
> Source: docs.sui.io/references/framework/sui_sui/package

```move
public struct UpgradeCap has key, store {
    id: UID,       // object ID
    package: ID,   // original package ID this controls
    version: u64,  // upgrade count, starts at 0
    policy: u8,    // upgrade restriction level
}
```

```
Abilities:  key ✅   store ✅   drop ❌   copy ❌
                                  ↑
                              No drop = cannot use `let _ = cap`
                              Must call make_immutable(cap) to destroy
```

---

## Upgrade Policies
> Source: docs.sui.io/concepts/sui-move-concepts/packages/upgrade

```
┌──────────────────────────────────────────────────────────────┐
│                    UPGRADE POLICY LADDER                      │
├──────────────┬─────────┬────────────────────────────────────┤
│ Policy       │ Value   │ What's allowed                      │
├──────────────┼─────────┼────────────────────────────────────┤
│ compatible   │ 0       │ Change function bodies              │
│              │         │ Change/remove private/entry/friend  │
│              │         │ signatures                          │
│              │         │ Add new functions, types, modules   │
├──────────────┼─────────┼────────────────────────────────────┤
│ additive     │ 128     │ Add new functions or types anywhere │
│              │         │ Change dependencies                 │
│              │         │ Existing functions fully frozen     │
├──────────────┼─────────┼────────────────────────────────────┤
│ dep_only     │ 192     │ Change dependencies only            │
├──────────────┼─────────┼────────────────────────────────────┤
│ immutable    │ (none)  │ UpgradeCap destroyed — no upgrades │
└──────────────┴─────────┴────────────────────────────────────┘

Policy ratchet: can only go UP (more restrictive). Never loosen.
Default at publish: 0 (compatible) — always. Move.toml has NO policy field.
```

**Setting policy — on-chain only:**
```move
sui::package::only_additive_upgrades(&mut cap);  // → 128
sui::package::only_dep_upgrades(&mut cap);        // → 192
sui::package::make_immutable(cap);               // destroys cap → immutable
```

---

## Compatible Policy — What Actually Changes
> Source: docs.sui.io/concepts/sui-move-concepts/packages/upgrade

```
Compatible CAN change:              Compatible CANNOT change:
┌────────────────────────────┐      ┌──────────────────────────────┐
│ ✅ All function bodies      │      │ ❌ public function signatures │
│ ✅ private fn signatures    │      │ ❌ Struct fields (BCS layout) │
│ ✅ entry fn signatures      │      │ ❌ Struct abilities           │
│ ✅ public(friend) sigs      │      └──────────────────────────────┘
│ ✅ Add functions/types/mods │
└────────────────────────────┘

⚠️  AUDITOR TRAP: "compatible policy" ≠ safe.
    Fee %, sig verification, recipient address, access checks —
    all can be silently changed under compatible with the same public API.
```

---

## Destroying UpgradeCap — Only Valid Method
> Source: docs.sui.io/references/framework/sui_sui/package

```move
// ✅ Only valid method
sui::package::make_immutable(cap);   // takes by value, calls object::delete

// ❌ COMPILE ERROR — UpgradeCap has no `drop`
let _ = cap;

// ❌ COMPILE ERROR — private fields, wrong module
let UpgradeCap { id, .. } = cap;
```

```
store ≠ drop:
  store = moving truck (can be wrapped / public_transferred)
  drop  = trash can    (can be discarded with _)
UpgradeCap has a truck but no trash can.
```

---

## CLI — Auditor On-Chain Verification
> Source: Sui CLI

```bash
# 1. Inspect UpgradeCap: policy + owner
sui client object <UPGRADE_CAP_ID> --json
#   .content.fields.policy      → 0/128/192
#   .owner.AddressOwner         → controlling wallet
#   "error: Object not found"   → cap destroyed → immutable ✅

# 2. Verify multi-sig address
sui keytool multi-sig-address \
  --pks <PK1> <PK2> <PK3> \
  --weights 1 1 1 \
  --threshold 2
# If derived address == .owner.AddressOwner → confirmed multi-sig

# 3. Find all caps owned by an address
sui client objects <ADDR> --json | jq '.[] | select(.type | contains("Cap"))'
```

**Owner type reference:**
```
{ "AddressOwner": "0x..." } → wallet (EOA or multi-sig)
{ "ObjectOwner":  "0x..." } → wrapped inside another object
{ "Shared": { ... } }       → shared object
```

---

## Multi-Role Access Control Pattern
> Source: Sui Object Model + Session 2026-04-24

```
ANTI-PATTERN: Single cap gates everything
┌─────────────────────────────────────────────┐
│  AdminCap has key, store                    │
│  Compromised → total protocol takeover      │
│  set_fee, pause, mint, upgrade — one key    │
└─────────────────────────────────────────────┘

CORRECT: Separated by blast radius
┌──────────────┬──────────────┬────────────────────────────────┐
│ Cap          │ Abilities    │ Gates                          │
├──────────────┼──────────────┼────────────────────────────────┤
│ AdminCap     │ key only     │ Governance: fees, delegation   │
│ OperatorCap  │ key only     │ Ops: oracle, params            │
│ MinterCap    │ key only     │ Minting only                   │
│ PauserCap    │ key only     │ Emergency pause                │
└──────────────┴──────────────┴────────────────────────────────┘
None have `store` → non-transferable by external code
```

---

## `store` Ability — Transfer Enforcement
> Source: Sui Framework — transfer module

```
transfer::public_transfer<T: key + store>(obj: T, addr)
                              ↑
                     Type constraint in fn signature
                     No `store` → compile error at call site
                     Not runtime. Not a check. A constraint.

key + store → any module/PTB can call public_transfer → attacker steals cap
key only    → only defining module can call transfer::transfer → cap locked
```

---

## Two Cap Extraction Vulnerabilities
> Source: Session 2026-04-24

```
VULN A — Unguarded cap construction (mint-on-demand backdoor)
┌──────────────────────────────────────────────────────────┐
│ public fun emergency_recover(ctx: &mut TxContext): AdminCap │
│     AdminCap { id: object::new(ctx) }  // no guard!     │
│ }                                                         │
│                                                           │
│ Grep: `CapType { id: object::new(ctx) }` in public fun   │
│ Any match = CRITICAL                                      │
└──────────────────────────────────────────────────────────┘

VULN B — Unguarded struct destructure (extract-from-wrapper)
┌──────────────────────────────────────────────────────────┐
│ public fun emergency_extract(protocol: Protocol): AdminCap │
│     let Protocol { id, admin_cap } = protocol; // no guard│
│     object::delete(id);                                   │
│     admin_cap                                             │
│ }                                                         │
│                                                           │
│ Grep: `let ContainerType {` in public fun                 │
│ Any match = CRITICAL                                      │
└──────────────────────────────────────────────────────────┘
```

---

## Real-World Bug: Pawtato Finance (Jan 2026)
> Source: OpenZeppelin Notorious Bug Digest #8 — openzeppelin.com/news/the-notorious-bug-digest-8

```move
// ❌ VULNERABLE
entry fun create_new_admin_cap(
    _upgrade_cap: &UpgradeCap,  // framework type — EVERY developer has one
    recipient: address,
    ctx: &mut TxContext,
)
// Attack: deploy trivial contract → get UpgradeCap → call this → get AdminCap
// Cost: fractions of a cent in gas

// ✅ FIX 1: custom type (type exclusivity)
entry fun create_new_admin_cap(_: &PawtatoAdminCap, ...) { ... }

// ✅ FIX 2: validate which package
assert!(
    package::upgrade_package(upgrade_cap) == object::id_from_address(@pawtato_pkg),
    E_WRONG_UPGRADE_CAP,
);
```

**Root cause:** `sui::package::UpgradeCap` is a shared framework type. Owning one proves you deployed _something_ — not that you deployed _this_ protocol.

---

## Sui Multi-sig vs Ethereum Gnosis Safe
> Source: docs.sui.io/concepts/cryptography/transaction-auth/multisig

```
┌──────────────────┬─────────────────────┬────────────────────┐
│                  │ Sui Multi-sig        │ Ethereum Safe      │
├──────────────────┼─────────────────────┼────────────────────┤
│ Implementation   │ Protocol primitive   │ Smart contract     │
│ Deployment       │ None required        │ Separate deploy    │
│ Address type     │ Deterministic hash   │ Contract address   │
│ Asset storage    │ Cap owned by address │ Assets in Safe     │
│ Verification     │ sui keytool CLI      │ On-chain state     │
└──────────────────┴─────────────────────┴────────────────────┘

Address = Blake2b-256(0x03 || signers+weights || threshold)
```

---

## Audit Checklist — Quick Reference

```
UPGRADECAP
□ Query policy on-chain (not docs) — 0/128/192/gone?
□ Owner: single EOA or multi-sig?
□ Timelock on upgrade path?
□ Protocol claims immutable but cap still exists? → CRITICAL LIE

CAPABILITY DESIGN
□ Any cap has `store`? → who can public_transfer it?
□ Single AdminCap for everything? → blast radius finding
□ Grep `CapType { id: object::new(ctx) }` in every public fun → Vuln A
□ Grep `let ContainerType {` in every public fun → Vuln B
□ init() distributes caps correctly?
□ Recovery path if key-only cap sent to dead address?
□ PauserCap separate from AdminCap?
```

---

## Key Takeaways

> **"Compatible upgrade policy locks the public API, not the behavior. A protocol with a live compatible UpgradeCap can be silently gutted while its signatures stay identical."**

1. **Upgrade policy is on-chain in UpgradeCap.policy — Move.toml has no policy field.** Query the object; never trust documentation. *Source: docs.sui.io/concepts/sui-move-concepts/packages/upgrade*
2. **No `store` on a capability is the primary non-transferability defense — enforced by the compiler at the call site of `public_transfer`, not at runtime.** *Source: Sui transfer module*
3. **Every public function in a module is a potential cap extraction path — grep for struct construction AND struct destructuring, not just role checks.** *Source: Session 2026-04-24 + Pawtato Finance exploit*
