# Sui Transaction Authentication: A Deep Dive with Ethereum Comparison

## Executive Summary

Sui's transaction authentication system is built on industry-standard cryptographic practices (BIP-32, BIP-39, BIP-44) while introducing unique optimizations for its object-centric blockchain architecture. Unlike Ethereum's relatively simple ECDSA Secp256k1 signature scheme, Sui supports multiple signature schemes and employs BLS12381 for validator consensus, offering significant advantages in signature aggregation and verification speed.

---

## 1. Core Concepts Overview

### 1.1 The Three Pillars of Transaction Authentication

```
┌─────────────────────────────────────────────────────────────┐
│                 TRANSACTION AUTHENTICATION                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │              │    │              │    │              │  │
│  │  PRIVATE KEY │───▶│   ADDRESS    │◀───│  SIGNATURE   │  │
│  │              │    │              │    │              │  │
│  │  Controls    │    │  Identifies  │    │  Proves      │  │
│  │  ownership   │    │  accounts    │    │  ownership   │  │
│  │              │    │              │    │              │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Key Derivation: Hierarchical Deterministic Wallets

### 2.1 Sui's HD Wallet Structure (BIP-32/BIP-44)

**Derivation Path Format:**
```
m / purpose' / coin_type' / account' / change / address_index
```

**Sui-Specific Paths:**

| Signature Scheme | Derivation Path | Hardening Strategy |
|-----------------|----------------|-------------------|
| **Ed25519** | `m/44'/784'/account'/change'/address'` | All 5 levels hardened |
| **ECDSA Secp256k1** | `m/54'/784'/account'/change/address` | First 3 levels hardened |
| **ECDSA Secp256r1** | `m/74'/784'/account'/change/address` | First 3 levels hardened |

**Visual Representation:**

```
                    SEED (from mnemonic)
                           │
                    ┌──────┴──────┐
                    │  Master Key  │
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
    ┌─────▼─────┐    ┌─────▼─────┐    ┌─────▼─────┐
    │ Purpose   │    │ Purpose   │    │ Purpose   │
    │   44'     │    │   54'     │    │   74'     │
    │ (Ed25519) │    │(Secp256k1)│    │(Secp256r1)│
    └─────┬─────┘    └─────┬─────┘    └─────┬─────┘
          │                │                │
    ┌─────▼─────┐    ┌─────▼─────┐    ┌─────▼─────┐
    │ Coin Type │    │ Coin Type │    │ Coin Type │
    │   784'    │    │   784'    │    │   784'    │
    │   (SUI)   │    │   (SUI)   │    │   (SUI)   │
    └─────┬─────┘    └─────┬─────┘    └─────┬─────┘
          │                │                │
          ▼                ▼                ▼
     [Account 0']     [Account 0']     [Account 0']
          │                │                │
          ▼                ▼                ▼
      [Change 0']      [Change 0]       [Change 0]
          │                │                │
          ▼                ▼                ▼
     [Address 0']     [Address 0]      [Address 0]
```

### 2.2 Ethereum vs Sui Key Derivation

**Ethereum Standard Path:**
```
m/44'/60'/0'/0/address_index
```

**Comparison Table:**

| Feature | Ethereum | Sui |
|---------|----------|-----|
| **Standards** | BIP-32, BIP-44 | BIP-32, BIP-44, SLIP-0010 |
| **Signature Schemes** | ECDSA Secp256k1 only | Ed25519, ECDSA Secp256k1, ECDSA Secp256r1, Multisig, zkLogin, Passkey |
| **Purpose Values** | 44' only | 44' (Ed25519), 54' (Secp256k1), 74' (Secp256r1) |
| **Coin Type** | 60' | 784' |
| **Derivation Levels** | 5 levels (account-based) | 5 levels (hybrid UTXO/account) |
| **Ed25519 Derivation** | Not standard | SLIP-0010 (fully hardened) |

---

## 3. Address Generation

### 3.1 Sui Address Derivation Process

```
┌─────────────────────────────────────────────────────────────┐
│              SUI ADDRESS GENERATION FLOW                     │
└─────────────────────────────────────────────────────────────┘

Step 1: Signature Scheme Flag
┌───────────────────────────────────┐
│  Flag Byte (1 byte)               │
│  • 0x00 = Ed25519                 │
│  • 0x01 = ECDSA Secp256k1         │
│  • 0x02 = ECDSA Secp256r1         │
│  • 0x03 = Multisig                │
│  • 0x05 = zkLogin                 │
│  • 0x06 = Passkey                 │
└───────────────┬───────────────────┘
                │
Step 2: Concatenate    ▼
┌─────────────────────────────────────┐
│  flag || public_key_bytes           │
│  (1 byte + 32/33 bytes)             │
└───────────────┬─────────────────────┘
                │
Step 3: Hash       ▼
┌─────────────────────────────────────┐
│  BLAKE2b-256(flag || pk)            │
│  Output: 32 bytes (256 bits)        │
└───────────────┬─────────────────────┘
                │
Step 4: Result     ▼
┌─────────────────────────────────────┐
│  32-byte Sui Address                │
│  (0x prefix + 64 hex chars)         │
└─────────────────────────────────────┘
```

### 3.2 Ethereum vs Sui Address Generation

**Ethereum:**
```
Public Key (64 bytes) → Keccak-256 → Take last 20 bytes → 0x + 40 hex chars
```

**Sui:**
```
Flag (1 byte) + Public Key → BLAKE2b-256 → 32 bytes → 0x + 64 hex chars
```

**Key Differences:**

| Aspect | Ethereum | Sui |
|--------|----------|-----|
| **Hash Function** | Keccak-256 | BLAKE2b-256 |
| **Address Size** | 20 bytes (40 hex) | 32 bytes (64 hex) |
| **Scheme Identifier** | Not in address | Flag byte embedded |
| **Input** | Public key only | Flag + Public key |
| **Example** | `0x742d35Cc...` | `0x5991cf2d...` (longer) |

---

## 4. Signature Structure and Schemes

### 4.1 Sui Signature Format

```
┌────────────────────────────────────────────────────────────┐
│              SUI SIGNATURE STRUCTURE                        │
└────────────────────────────────────────────────────────────┘

     flag   │      sig       │         pk
    (1 byte)│  (varies)      │      (varies)
    ────────┼────────────────┼─────────────────
      0x00  │  64 bytes      │  32 bytes  (Ed25519)
      0x01  │  64 bytes      │  33 bytes  (Secp256k1)
      0x02  │  64 bytes      │  33 bytes  (Secp256r1)
      0x03  │  BCS serialized│  BCS serialized (Multisig)
      0x05  │  BCS serialized│  varies (zkLogin)
      0x06  │  BCS serialized│  33 bytes (Passkey)


Total Signature = flag || sig || pk (concatenated bytes)
```

### 4.2 Supported Signature Schemes Comparison

```
┌──────────────────────────────────────────────────────────────┐
│                 ETHEREUM vs SUI SIGNATURES                    │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ETHEREUM                        SUI                          │
│  ─────────                       ───                          │
│                                                               │
│  ┌─────────────────┐             ┌─────────────────┐         │
│  │ ECDSA Secp256k1 │             │  Ed25519 (0x00) │         │
│  │   (only one)    │             ├─────────────────┤         │
│  │                 │             │ Secp256k1(0x01) │         │
│  │  • 65 bytes     │             ├─────────────────┤         │
│  │  • v,r,s format │             │ Secp256r1(0x02) │         │
│  │  • Recoverable  │             ├─────────────────┤         │
│  │                 │             │ Multisig (0x03) │         │
│  └─────────────────┘             ├─────────────────┤         │
│                                  │  zkLogin (0x05) │         │
│                                  ├─────────────────┤         │
│                                  │ Passkey  (0x06) │         │
│                                  └─────────────────┘         │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 4.3 Signature Verification Flow

```
┌─────────────────────────────────────────────────────────────┐
│            TRANSACTION SIGNATURE VERIFICATION                │
└─────────────────────────────────────────────────────────────┘

1. Transaction Data
   │
   ▼
┌──────────────────────────┐
│  TransactionData struct  │
└────────────┬─────────────┘
             │
2. BCS Serialize
             ▼
┌──────────────────────────┐
│  Serialized tx bytes     │
└────────────┬─────────────┘
             │
3. Intent Message Construction
             ▼
┌──────────────────────────────────┐
│  3-byte Intent + Serialized TX   │
│  (Intent defines context/domain) │
└────────────┬─────────────────────┘
             │
4. Hash (BLAKE2b-256)
             ▼
┌──────────────────────────┐
│  32-byte digest          │
└────────────┬─────────────┘
             │
5. Sign with Private Key
             ▼
┌──────────────────────────────────┐
│  Signature (flag || sig || pk)   │
└────────────┬─────────────────────┘
             │
6. Verify
             ▼
┌──────────────────────────────────┐
│  Validator checks:                │
│  • Signature matches public key   │
│  • Public key hashes to sender    │
│  • Transaction data unchanged     │
└──────────────────────────────────┘
```

---

## 5. Internal Hashing Schemes

### 5.1 Double Hashing in Sui

**Critical Understanding:** Sui uses **two layers of hashing**

```
External Hash (by user/wallet):
BLAKE2b-256(intent_message) → 32-byte digest
                 │
                 ▼
Internal Hash (by signing algorithm):
┌────────────────────────────────────┐
│ Ed25519:  SHA-512(digest)          │
│ ECDSA:    SHA-256(digest)          │
└────────────────────────────────────┘
```

### 5.2 Ethereum vs Sui Hashing

**Ethereum:**
```
Transaction → RLP Encode → Keccak-256 → Sign with ECDSA
```

**Sui:**
```
Transaction → BCS → Intent Message → BLAKE2b-256 → Internal Hash → Sign
                                                    (SHA-256/512)
```

**Why the Difference?**

| Reason | Ethereum | Sui |
|--------|----------|-----|
| **Encoding** | RLP (Recursive Length Prefix) | BCS (Binary Canonical Serialization) |
| **External Hash** | Keccak-256 | BLAKE2b-256 |
| **Internal Hash** | N/A (direct ECDSA) | SHA-256 (ECDSA) / SHA-512 (Ed25519) |
| **Purpose** | Bitcoin compatibility | HSM/Apple compatibility + Standards |
| **Intent System** | EIP-712 (typed data) | Built-in intent signing |

---

## 6. ECDSA Signature Requirements

### 6.1 Sui's Strict ECDSA Requirements

```
┌─────────────────────────────────────────────────────────────┐
│               ECDSA SIGNATURE CONSTRAINTS                    │
└─────────────────────────────────────────────────────────────┘

Signature Format: [r || s] (64 bytes total)
                   ↑     ↑
              32 bytes  32 bytes


Constraint 1: r Range
┌────────────────────────────────────────────┐
│  0x1 ≤ r ≤ (curve_order - 1)              │
└────────────────────────────────────────────┘

Constraint 2: Low-s Requirement (BIP-62)
┌────────────────────────────────────────────┐
│  s must be in lower half of curve order   │
│  If s > curve_order/2:                     │
│      s_low = curve_order - s               │
└────────────────────────────────────────────┘

Curve Orders:
• Secp256k1: 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
• Secp256r1: 0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551

Constraint 3: Deterministic Nonce (RFC6979)
┌────────────────────────────────────────────┐
│  k = HMAC_DRBG(private_key, message)       │
│  Prevents nonce reuse attacks              │
└────────────────────────────────────────────┘
```

**Ethereum Comparison:**

Ethereum also uses low-s requirement but allows signature malleability in older transactions. Sui enforces this strictly from the start.

---

## 7. Authority Signatures (Validator Layer)

### 7.1 Three Key Pairs Per Validator

```
┌─────────────────────────────────────────────────────────────┐
│              VALIDATOR KEY PAIR ARCHITECTURE                 │
└─────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│                    VALIDATOR NODE                          │
├───────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────────┐  ┌──────────────────┐              │
│  │ PROTOCOL KEY     │  │ ACCOUNT KEY      │              │
│  │ (BLS12-381)      │  │ (Ed25519)        │              │
│  ├──────────────────┤  ├──────────────────┤              │
│  │ Purpose:         │  │ Purpose:         │              │
│  │ • Sign user txs  │  │ • Receive staking│              │
│  │ • Consensus votes│  │   rewards        │              │
│  │ • Can aggregate  │  │ • Payment ops    │              │
│  │   signatures     │  │                  │              │
│  │                  │  │                  │              │
│  │ Public: 96 bytes │  │ Public: 32 bytes │              │
│  │ Sig:    48 bytes │  │ Sig:    64 bytes │              │
│  └──────────────────┘  └──────────────────┘              │
│                                                            │
│  ┌────────────────────────────────────────┐              │
│  │ NETWORK KEY (Ed25519)                  │              │
│  ├────────────────────────────────────────┤              │
│  │ Purpose:                               │              │
│  │ • TLS handshake                        │              │
│  │ • Validator identity                   │              │
│  │ • P2P networking                       │              │
│  │                                        │              │
│  │ Public: 32 bytes                       │              │
│  │ Sig:    64 bytes                       │              │
│  └────────────────────────────────────────┘              │
│                                                            │
└───────────────────────────────────────────────────────────┘
```

### 7.2 BLS12-381 Signature Aggregation

**The Magic of BLS Signatures:**

```
Individual Validator Signatures:
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│ V1  │ │ V2  │ │ V3  │ │ V4  │ │ V5  │  ... (2f+1 validators)
│ 48B │ │ 48B │ │ 48B │ │ 48B │ │ 48B │
└─────┘ └─────┘ └─────┘ └─────┘ └─────┘
   │       │       │       │       │
   └───────┴───────┴───────┴───────┘
               │
               ▼
    ┌──────────────────┐
    │ AGGREGATED SIG   │
    │     48 bytes     │  + Bitmap (identifies signers)
    └──────────────────┘

Space Saved: (2f+1) × 48 bytes → 48 bytes + bitmap
```

**Ethereum vs Sui Consensus Signatures:**

| Aspect | Ethereum (PoS) | Sui |
|--------|----------------|-----|
| **Signature Scheme** | BLS12-381 | BLS12-381 |
| **Aggregation** | Committee signatures | Validator signatures (2f+1 threshold) |
| **Public Key Size** | 48 bytes (compressed) | 96 bytes (minSig mode) |
| **Signature Size** | 96 bytes | 48 bytes (minSig mode) |
| **Optimization** | Minimize pubkey size | Minimize signature size |
| **Rationale** | Pubkeys broadcast frequently | Signatures broadcast frequently |
| **KOSK Protection** | Yes | Yes + address commitment |

---

## 8. Intent Signing

### 8.1 Intent Message Structure

```
┌─────────────────────────────────────────────────────────────┐
│                   INTENT MESSAGE FORMAT                      │
└─────────────────────────────────────────────────────────────┘

Intent (3 bytes) + Transaction Data (BCS serialized)
    │                       │
    ├─ Byte 0: Intent Scope (e.g., 0x00 = TransactionData)
    ├─ Byte 1: Intent Version (e.g., 0x00)
    └─ Byte 2: App ID (e.g., 0x00 = Sui)


Purpose:
• Prevent cross-chain replay attacks
• Distinguish transaction types
• Add context to signatures
• Enable domain separation
```

**Comparison with Ethereum EIP-712:**

| Feature | Ethereum EIP-712 | Sui Intent Signing |
|---------|------------------|-------------------|
| **Purpose** | Typed structured data signing | Domain separation + context |
| **Format** | JSON schema with domain | 3-byte prefix + BCS |
| **Adoption** | Optional (for dApps) | Mandatory (built-in) |
| **Use Case** | Off-chain messages, permits | All transactions |
| **Complexity** | High (type definitions) | Low (fixed prefix) |

---

## 9. Advanced Signature Schemes

### 9.1 zkLogin Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    zkLogin FLOW                              │
└─────────────────────────────────────────────────────────────┘

User Signs in with OAuth (Google, Apple, etc.)
              │
              ▼
┌──────────────────────────────┐
│  JWT Token from Provider     │
│  (contains iss, sub, etc.)   │
└──────────────┬───────────────┘
              │
              ▼
┌──────────────────────────────┐
│  Generate ZK Proof           │
│  • Proves JWT ownership      │
│  • Hides sensitive data      │
│  • Derives address seed      │
└──────────────┬───────────────┘
              │
              ▼
┌──────────────────────────────┐
│  zkLogin Signature (0x05)    │
│  • ZK proof                  │
│  • Ephemeral signature       │
│  • Max epoch                 │
└──────────────────────────────┘

Sui Address = hash(flag || iss_length || iss || address_seed)
```

**Ethereum Has Nothing Comparable** - Sui's zkLogin is unique in enabling Web2 authentication for Web3 transactions without users managing private keys.

### 9.2 Passkey Integration (WebAuthn)

```
┌─────────────────────────────────────────────────────────────┐
│                    PASSKEY SIGNATURE (0x06)                  │
└─────────────────────────────────────────────────────────────┘

Browser/Device Biometric Authentication
              │
              ▼
┌──────────────────────────────────────┐
│  WebAuthn Credential                 │
│  • Biometric verification            │
│  • Hardware security module          │
│  • FIDO2 compatible                  │
└──────────────┬───────────────────────┘
              │
              ▼
┌──────────────────────────────────────┐
│  Passkey Signature Components:       │
│  • authenticatorData                 │
│  • clientDataJSON                    │
│  • userSignature                     │
│  All BCS serialized                  │
└──────────────────────────────────────┘
```

**Ethereum:** Requires account abstraction (EIP-4337) to achieve similar functionality. Sui has it natively.

---

## 10. Multisig Deep Dive

### 10.1 Multisig Structure

```
┌─────────────────────────────────────────────────────────────┐
│                MULTISIG TRANSACTION FLOW                     │
└─────────────────────────────────────────────────────────────┘

Multisig Address Creation:
┌────────────────────────────────────────────────────┐
│  Participants: [PK1, PK2, PK3]                     │
│  Weights:      [1,   2,   1]                       │
│  Threshold:    3                                   │
│                                                     │
│  Multisig Address = BLAKE2b(0x03 || BCS(config))  │
└────────────────────────────────────────────────────┘

Signing Process:
PK1 signs (weight 1) ──┐
                        ├──→ Combined Weight: 3 ≥ 3 ✓
PK2 signs (weight 2) ──┘     Transaction Valid!

OR

PK2 signs (weight 2) ──┐
                        ├──→ Combined Weight: 3 ≥ 3 ✓
PK3 signs (weight 1) ──┘     Transaction Valid!


Multisig Signature (0x03):
┌────────────────────────────────────────┐
│  Flag (0x03) || BCS serialized data:   │
│  • All signatures that participated    │
│  • All public keys of participants     │
│  • Size varies based on # signers      │
└────────────────────────────────────────┘
```

**Ethereum vs Sui Multisig:**

| Aspect | Ethereum | Sui |
|--------|----------|-----|
| **Implementation** | Smart contract (e.g., Gnosis Safe) | Native protocol support |
| **Gas Cost** | High (contract execution) | Lower (native validation) |
| **Weights** | Usually 1:1 | Flexible weights |
| **Schemes** | External contract logic | BCS-serialized native |
| **Address Type** | Contract address | Hash of multisig config |

---

## 11. Security Considerations

### 11.1 Rogue Key Attack Prevention (BLS)

```
┌─────────────────────────────────────────────────────────────┐
│           KOSK (Knowledge of Secret Key) PROOF               │
└─────────────────────────────────────────────────────────────┘

Validator Registration Process:
┌────────────────────────────────────┐
│ 1. Validator generates BLS keypair │
│    Private: sk                     │
│    Public:  PK = g^sk              │
└────────────┬───────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────┐
│ 2. Create Proof of Possession (PoP)           │
│    PoP = Sign(hash(PK || address), sk)        │
│                                                │
│    Sui Enhancement: Commits to ADDRESS too!   │
└────────────┬───────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│ 3. Submit to protocol              │
│    • Verify PoP                    │
│    • Check address commitment      │
│    • Register if valid             │
└────────────────────────────────────┘

Why Commit to Address?
─────────────────────
Prevents malicious validator from reusing another
validator's BLS public key with different address
```

### 11.2 Nonce Reuse Prevention (ECDSA)

**Deterministic Nonce (RFC6979):**

```
Bad (Random Nonce):
┌──────────────────────────────────────┐
│  k = random()  ← DANGEROUS!          │
│                                       │
│  If same k used twice:               │
│  Private key can be recovered!       │
└──────────────────────────────────────┘

Good (Deterministic):
┌──────────────────────────────────────┐
│  k = HMAC_DRBG(private_key, message) │
│                                       │
│  Properties:                         │
│  • Deterministic (same input → same k)│
│  • Unique per message                │
│  • Cannot predict from signature     │
└──────────────────────────────────────┘
```

---

## 12. Practical Examples

### 12.1 Address Derivation Example

**Ed25519:**
```bash
# Using Sui CLI
sui keytool import "your mnemonic words here" ed25519 "m/44'/784'/0'/0'/0'"

# Path breakdown:
# m/      - Master key
# 44'/    - Ed25519 purpose
# 784'/   - Sui coin type
# 0'/     - Account 0
# 0'/     - Change 0
# 0'      - Address index 0
```

**ECDSA Secp256k1:**
```bash
sui client new-address secp256k1 "m/54'/784'/0'/0/0"

# Note: Last two levels NOT hardened
```

### 12.2 Signature Size Comparison

```
┌──────────────────────────────────────────────────────────┐
│              SIGNATURE SIZES ON THE WIRE                  │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Ethereum (ECDSA Secp256k1):                             │
│  ├─ v (1 byte) + r (32 bytes) + s (32 bytes) = 65 bytes │
│  └─ Total: 65 bytes                                      │
│                                                           │
│  Sui Ed25519:                                            │
│  ├─ flag (1) + sig (64) + pk (32) = 97 bytes            │
│  └─ Total: 97 bytes                                      │
│                                                           │
│  Sui ECDSA Secp256k1:                                    │
│  ├─ flag (1) + sig (64) + pk (33) = 98 bytes            │
│  └─ Total: 98 bytes                                      │
│                                                           │
│  Sui Multisig (3 signers, Ed25519):                      │
│  ├─ flag (1) + BCS(3 × 97 bytes + metadata)             │
│  └─ Total: ~300+ bytes                                   │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

---

## 13. Key Takeaways

### 13.1 Sui's Advantages Over Ethereum

1. **Multiple Signature Schemes**: Ed25519, Secp256k1, Secp256r1, zkLogin, Passkey, Multisig
   - Ethereum: Only ECDSA Secp256k1

2. **Native Multisig**: Built into protocol with flexible weights
   - Ethereum: Requires smart contracts

3. **zkLogin**: Web2 OAuth for Web3 wallets
   - Ethereum: No native solution

4. **BLS Aggregation**: Efficient consensus with 48-byte aggregated signatures
   - Ethereum: Similar, but different optimization trade-offs

5. **Intent Signing**: Built-in domain separation
   - Ethereum: Optional EIP-712

6. **Passkey Support**: Native WebAuthn integration
   - Ethereum: Needs account abstraction

### 13.2 Sui's Design Philosophy

```
┌─────────────────────────────────────────────────────────────┐
│             SUI AUTHENTICATION DESIGN PRINCIPLES             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. FLEXIBILITY                                              │
│     Multiple signature schemes for different use cases      │
│                                                              │
│  2. SECURITY                                                 │
│     Strict requirements, deterministic nonces, KOSK proofs  │
│                                                              │
│  3. EFFICIENCY                                               │
│     BLS aggregation, compact signatures                     │
│                                                              │
│  4. USER EXPERIENCE                                          │
│     zkLogin, Passkeys, familiar standards (BIP-32/39/44)    │
│                                                              │
│  5. STANDARDS COMPLIANCE                                     │
│     RFC6979, ZIP215, BIP-62, SLIP-0010                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 14. Summary Comparison Table

| Feature | Ethereum | Sui |
|---------|----------|-----|
| **Signature Schemes** | ECDSA Secp256k1 | Ed25519, ECDSA Secp256k1/r1, Multisig, zkLogin, Passkey |
| **Address Size** | 20 bytes | 32 bytes |
| **Hash Function** | Keccak-256 | BLAKE2b-256 |
| **HD Wallet** | BIP-32/44 | BIP-32/44 + SLIP-0010 |
| **Multisig** | Smart contracts | Native protocol |
| **Social Login** | Via account abstraction | Native zkLogin |
| **Biometric** | Via account abstraction | Native Passkey |
| **Intent Signing** | EIP-712 (optional) | Built-in (mandatory) |
| **Validator Sigs** | BLS12-381 | BLS12-381 (different optimization) |
| **Signature Encoding** | RLP | BCS |
| **Signature Recovery** | Yes (ECDSA) | No (includes public key) |

---

## 15. Resources

**Official Documentation:**
- Sui Transaction Auth: https://docs.sui.io/concepts/transactions/transaction-auth
- BIP-32: https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki
- BIP-44: https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki
- SLIP-0010: https://github.com/satoshilabs/slips/blob/master/slip-0010

**Standards:**
- RFC6979 (Deterministic ECDSA): https://www.rfc-editor.org/rfc/rfc6979
- RFC8032 (Ed25519): https://www.rfc-editor.org/rfc/rfc8032
- ZIP215 (Ed25519 Validation): https://github.com/zcash/zips/blob/main/zips/zip-0215.rst
- BIP-62 (Low-s): https://github.com/bitcoin/bips/blob/master/bip-0062.mediawiki

---

*This analysis was prepared for blockchain developers transitioning from Ethereum to Sui or seeking to understand Sui's advanced cryptographic authentication system.*