# BCS Encoding & Signature Verification on Sui

**Primary sources:**
- Move Book §8.17 BCS — https://move-book.com/programmability/bcs
- Sui Docs > Cryptography > Signing — https://docs.sui.io/guides/developer/cryptography/signing
- Sui Docs > Cryptography > Hashing — https://docs.sui.io/guides/developer/cryptography/hashing

---

## BCS — What It Is
> Source: Move Book §8.17 BCS — move-book.com/programmability/bcs

```
┌─────────────────────────────────────────────────────────────────┐
│  BCS = Binary Canonical Serialization                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Purpose: Turn a Move struct into a byte vector                │
│           so you can hash it and sign it                        │
│                                                                 │
│  Properties:                                                    │
│  ├─ Deterministic: same struct → always same bytes             │
│  ├─ Compact: no padding, no wasted space                       │
│  ├─ NOT self-describing: no field names, no type tags          │
│  └─ Field-order-critical: bytes follow struct definition order │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## How Encoding Works
> Source: Move Book §8.17 BCS — move-book.com/programmability/bcs

```
Struct definition:
┌─────────────────────────────────────┐
│  public struct MintPermit {         │
│      user:   address,  ← field 1   │
│      amount: u64,      ← field 2   │
│  }                                  │
└─────────────────────────────────────┘

bcs::to_bytes(&permit) produces:
┌──────────────────────────────────────────────────────────────────┐
│  [ 32 bytes: address ] [ 8 bytes: u64 little-endian ]           │
│  └─────── field 1 ──────┘ └──────── field 2 ──────┘            │
│                                                                  │
│  Total = 40 bytes. No labels. No separators. Just raw bytes.   │
└──────────────────────────────────────────────────────────────────┘

Primitive sizes:
  u8       →  1 byte
  u64      →  8 bytes (little-endian)
  u128     →  16 bytes (little-endian)
  address  →  32 bytes
  bool     →  1 byte (0x00 or 0x01)
  vector   →  ULEB128 length prefix + elements
```

---

## Decoding — Order is Everything
> Source: Move Book §8.17 BCS — move-book.com/programmability/bcs

```
✅ CORRECT — peel in struct definition order:

  let mut d = bcs::new(bytes);
  let user   = d.peel_address();   ← field 1 first
  let amount = d.peel_u64();       ← field 2 second

❌ WRONG — reversed order:

  let mut d = bcs::new(bytes);
  let amount = d.peel_u64();       ← reads first 8 bytes as u64
  let user   = d.peel_address();   ← reads next 32 bytes as address
                                      but those bytes were the address!
                                      amount = garbage, user = garbage
```

```
┌──────────────────────────────────────────────────────────────────┐
│  ⚠️  CRITICAL: Wrong peel order = SILENT DATA CORRUPTION        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  BCS has no type tags. The decoder reads bytes blindly.         │
│  Wrong order → garbage values. NOT a guaranteed abort.          │
│                                                                  │
│  Compare:                                                        │
│  ├─ Solidity ABI.decode()  → reliable revert on type mismatch  │
│  │   (ABI encoding is self-describing, carries type offsets)    │
│  └─ BCS decoder            → silent garbage, maybe late abort  │
│      (raw bytes only, no schema embedded)                       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Hash Functions
> Source: Sui Docs > Cryptography > Hashing — docs.sui.io/guides/developer/cryptography/hashing · Move Book §std::hash

```
┌─────────────────────────────────────────────────────────────────────┐
│  Two modules, four functions                                        │
├───────────────┬─────────────────────────────┬───────────────────────┤
│  Module       │  Function                   │  Input                │
├───────────────┼─────────────────────────────┼───────────────────────┤
│  std::hash    │  sha2_256(bytes)             │  vector<u8> (owned)   │
│               │  sha3_256(bytes)             │  vector<u8> (owned)   │
├───────────────┼─────────────────────────────┼───────────────────────┤
│  sui::hash    │  keccak256(&bytes)           │  &vector<u8> (ref)    │
│               │  blake2b256(&bytes)          │  &vector<u8> (ref)    │
└───────────────┴─────────────────────────────┴───────────────────────┘

All return vector<u8> (32 bytes).
All are cryptographically adequate for signature verification.
```

### Which One to Use?

```
┌───────────────────────────────────────────────────────────────────┐
│  SELECTION RULE: Match the off-chain signer                      │
├──────────────────────┬────────────────────────────────────────────┤
│  Off-chain system    │  Use on-chain                              │
├──────────────────────┼────────────────────────────────────────────┤
│  EVM / Ethereum      │  keccak256    (EVM native hash)            │
│  Standard backend    │  sha2_256     (industry standard)          │
│  OpenSSL default     │  sha3_256     (OpenSSL default in recent v)│
│  Performance needed  │  blake2b256   (fastest of the four)        │
└──────────────────────┴────────────────────────────────────────────┘

⚠️  Mismatch = ALWAYS-FALSE verification
    Code compiles and runs. Every verify() call returns false.
    No error. No indication. Just silently broken.
```

---

## On-Chain Signature Verification Flow
> Source: Sui Docs > Cryptography > Signing — docs.sui.io/guides/developer/cryptography/signing

```
OFF-CHAIN (backend / admin)                ON-CHAIN (Move contract)
─────────────────────────────              ──────────────────────────

  ┌─────────────────────┐                   ┌─────────────────────┐
  │  MintPermit struct  │                   │  MintPermit struct  │
  │  { user, amount }   │                   │  { user, amount }   │
  └──────────┬──────────┘                   └──────────┬──────────┘
             │                                         │
             │ bcs::to_bytes()                         │ bcs::to_bytes()
             ↓                                         ↓
  ┌─────────────────────┐                   ┌─────────────────────┐
  │  40 bytes           │                   │  40 bytes           │
  │  (same bytes)       │                   │  (same bytes)       │
  └──────────┬──────────┘                   └──────────┬──────────┘
             │                                         │
             │ keccak256()                             │ keccak256()
             ↓                                         ↓
  ┌─────────────────────┐                   ┌─────────────────────┐
  │  32-byte hash       │                   │  32-byte hash       │
  │  (same hash)        │                   │  (same hash)  ◄─────┼─────┐
  └──────────┬──────────┘                   └─────────────────────┘     │
             │                                                           │
             │ sign with private key                    compare?         │
             ↓                                                           │
  ┌─────────────────────┐                   ┌─────────────────────┐     │
  │  64-byte Ed25519 sig│ ────────────────► │ ed25519_verify(     │ ────┘
  └─────────────────────┘                   │   &sig,             │
                                            │   &admin_pk,        │
                                            │   &msg_hash         │
                                            │ ) → bool            │
                                            └─────────────────────┘
```

### Sui vs Ethereum

```
┌───────────────────────────────────────────────────────────────────────┐
│  SUI                              ETHEREUM                            │
├──────────────────────────────────┬────────────────────────────────────┤
│  ed25519_verify(                 │  ecrecover(                        │
│    &sig,                         │    hash,                           │
│    &pk,      ← you provide it    │    v, r, s                         │
│    &hash                         │  ) → address  ← recovered for you  │
│  ) → bool    ← true or false     │                                    │
├──────────────────────────────────┼────────────────────────────────────┤
│  Algorithm: Ed25519              │  Algorithm: ECDSA secp256k1        │
│  You KNOW who to check against   │  You RECOVER who signed            │
│  Returns: boolean                │  Returns: signer address           │
└──────────────────────────────────┴────────────────────────────────────┘
```

---

## Replay Attacks
> Source: Sui Docs > Cryptography > Signing — docs.sui.io/guides/developer/cryptography/signing

```
┌─────────────────────────────────────────────────────────────────┐
│  WHAT IS A REPLAY ATTACK?                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  A valid signature is reused in a context the signer           │
│  never intended.                                                │
│                                                                 │
│  Types:                                                         │
│  ├─ Same-function replay: call mint_with_permit twice           │
│  │   with the same sig → double mint                            │
│  ├─ Cross-function replay: use mint sig to call burn            │
│  │   → user loses tokens they were supposed to receive         │
│  └─ Cross-chain replay: use testnet sig on mainnet             │
│      → drain mainnet funds with testnet-level security         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Three Required Defenses

```
┌──────────────────────────────────────────────────────────────────────┐
│  DEFENSE 1: NONCE (prevents same-function replay)                   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Add nonce: u64 to the permit struct.                               │
│  On-chain: track used nonces in Table<u64, bool>.                   │
│  assert!(!table::contains(&config.used_nonces, permit.nonce), ...); │
│  table::add(&mut config.used_nonces, permit.nonce, true);           │
│                                                                      │
│  First submission: nonce not in table → passes, nonce recorded.     │
│  Second submission: nonce in table → ABORT.                         │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│  DEFENSE 2: EXPIRY (limits valid window)                            │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Add expires_at: u64 to the permit struct.                          │
│  assert!(tx_context::epoch(ctx) <= permit.expires_at, E_EXPIRED);   │
│                                                                      │
│  Without expiry: a compromised/leaked signature is valid forever.   │
│  Severity: MEDIUM (requires admin to sign a bad permit first)       │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│  DEFENSE 3: DOMAIN SEPARATION (prevents cross-function replay)      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Add action: vector<u8> to the permit struct.                       │
│  Set to b"mint" for mint, b"burn" for burn.                         │
│  The signed bytes now include the action tag.                       │
│  A mint signature and a burn signature are DIFFERENT bytes.         │
│  Cross-function replay is cryptographically impossible.             │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Domain Separation — Visual
> Source: Sui Docs > Cryptography > Signing — docs.sui.io/guides/developer/cryptography/signing

```
WITHOUT domain separation:

  MintPermit { user: Alice, amount: 100 }
  ────────────────────────────────────────
  BCS bytes:  [ Alice address ] [ 100 as u64 ]
  Hash:       0xABCD...
  Signature:  0x1234...

  Same bytes → same hash → same signature

  mint_with_permit(sig=0x1234...)  ← admin intended this ✓
  burn_with_permit(sig=0x1234...)  ← attacker calls this ✓ (contract accepts!)


WITH domain separation:

  MintPermit { action: b"mint", user: Alice, amount: 100 }
  ──────────────────────────────────────────────────────────
  BCS bytes:  [4][m][i][n][t] [ Alice address ] [ 100 as u64 ]
  Hash:       0xABCD... (different because "mint" prefix is in bytes)
  Signature:  0x1234...

  BurnPermit { action: b"burn", user: Alice, amount: 100 }
  ──────────────────────────────────────────────────────────
  BCS bytes:  [4][b][u][r][n] [ Alice address ] [ 100 as u64 ]
  Hash:       0xEF01... (different bytes → different hash)
  Signature:  0x5678... (different signature required)

  mint_with_permit(sig=0x1234...) checks action == b"mint" → ✓
  burn_with_permit(sig=0x1234...) checks action == b"burn" → ABORT
                                  (0x1234 was signed over "mint", not "burn")
```

---

## Full Replay-Safe Permit Pattern
> Source: Sui Docs > Cryptography > Signing — docs.sui.io/guides/developer/cryptography/signing · Move Book §8.17 BCS — move-book.com/programmability/bcs

```move
public struct MintPermit has drop {
    action:      vector<u8>,   // domain separation: b"mint"
    contract:    address,      // bind to this specific contract
    chain_id:    u64,          // prevent cross-chain replay
    user:        address,      // intended recipient
    amount:      u64,          // authorized amount
    nonce:       u64,          // one-time use marker
    expires_at:  u64,          // expiry (epoch or timestamp)
}

public fun mint_with_permit<T>(
    config: &mut AdminConfig,
    cap: &mut TreasuryCap<T>,
    permit: MintPermit,
    sig: vector<u8>,
    ctx: &mut TxContext,
) {
    // 1. Verify signature
    let encoded  = bcs::to_bytes(&permit);
    let msg_hash = hash::keccak256(&encoded);
    assert!(ed25519::ed25519_verify(&sig, &config.admin_pk, &msg_hash), E_INVALID_SIG);

    // 2. Domain separation
    assert!(permit.action == b"mint", E_WRONG_ACTION);

    // 3. Expiry
    assert!(tx_context::epoch(ctx) <= permit.expires_at, E_EXPIRED);

    // 4. Nonce (replay prevention)
    assert!(!table::contains(&config.used_nonces, permit.nonce), E_REPLAY);
    table::add(&mut config.used_nonces, permit.nonce, true);

    // 5. Amount enforcement (easy to miss!)
    let MintPermit { action: _, contract: _, chain_id: _, user, amount, nonce: _, expires_at: _ } = permit;
    let minted = coin::mint(cap, amount, ctx);
    transfer::public_transfer(minted, user);
}
```

---

## Common Audit Findings — Severity Reference
> Source: Sui Docs > Cryptography > Signing — docs.sui.io/guides/developer/cryptography/signing

```
┌──────────────────────────────────────────────────────────────────────┐
│  Finding                          │ Severity │ Why                   │
├───────────────────────────────────┼──────────┼───────────────────────┤
│  No nonce (same-function replay)  │ CRITICAL │ Unlimited minting     │
│  No domain separation             │ CRITICAL │ Mint sig = burn sig   │
│  No chain_id                      │ CRITICAL │ Cross-chain reuse     │
│  Amount not verified in burn      │ HIGH     │ Any amount burned     │
│  No expiry                        │ MEDIUM   │ Leaked sig = forever  │
│  Wrong hash function              │ HIGH     │ Always-false verify   │
│  BCS decode wrong order           │ HIGH     │ Silent corruption     │
│  admin_pk stored mutable          │ HIGH     │ Admin key rotatable   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Cross-Contract Replay — Move's Limitation
> Source: Sui Docs > Cryptography > Signing — docs.sui.io/guides/developer/cryptography/signing

```
┌─────────────────────────────────────────────────────────────────────┐
│  Move DOES prevent:                                                 │
│  └─ Reentrancy (no mid-execution callbacks)                        │
│                                                                     │
│  Move does NOT prevent:                                             │
│  └─ Cross-contract replay                                          │
│                                                                     │
│  If two contracts both accept:                                      │
│    MintPermit { user, amount } + same admin_pk                      │
│                                                                     │
│  Contract A's permit is valid for Contract B.                       │
│  Domain separation must include the destination contract address.   │
│  This is NOT automatic.                                             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Key Takeaways

```
┌─────────────────────────────────────────────────────────────────────┐
│  REMEMBER                                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. BCS = raw bytes in struct order. Wrong peel = silent garbage.  │
│     Unlike Solidity ABI — no reliable revert on mismatch.          │
│                                                                     │
│  2. Hash function must match the signer. Mismatch = always false.  │
│     keccak256 for EVM, sha2/sha3 for standard backends.            │
│                                                                     │
│  3. ed25519_verify returns bool. You provide the pubkey.           │
│     Ethereum ecrecover recovers the address. Different pattern.    │
│                                                                     │
│  4. A valid signature proves approval of a message.               │
│     It does NOT limit how many times it can be used (nonce),       │
│     which function it applies to (domain), or which chain (chain_id)│
│     You enforce all three yourself.                                │
│                                                                     │
│  5. Chain_id ≠ replay-safe. Nonce prevents double-submission.     │
│     Both required. Bridge hacks often come from missing nonces.   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```
