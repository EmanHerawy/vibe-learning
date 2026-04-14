

# Type Identity and Package Binding in Move

## Part 1: Types Are Bound to Packages

### The Core Principle

**Every struct in Move is uniquely identified by its FULL TYPE PATH:**

```
Package Address :: Module Name :: Struct Name
```

**Example:**
```move
// Package A deployed at 0xAAAA
module 0xAAAA::vault {
    public struct OwnerCap has key, store {
        id: UID
    }
}

// Type path: 0xAAAA::vault::OwnerCap
```

**Even if you copy the exact code:**
```move
// Package B deployed at 0xBBBB (different address!)
module 0xBBBB::vault {
    public struct OwnerCap has key, store {
        id: UID  // Identical fields!
    }
}

// Type path: 0xBBBB::vault::OwnerCap
```

**These are COMPLETELY DIFFERENT TYPES!**

```
0xAAAA::vault::OwnerCap ≠ 0xBBBB::vault::OwnerCap

Even though:
- Same struct name ✓
- Same field names ✓
- Same field types ✓
- Same abilities ✓

They are DIFFERENT TYPES because different package addresses!
```

---

## Part 2: Why Cloning Doesn't Work

### Attack Attempt 1: Clone the Struct

```move
// Original package at 0x1111
module 0x1111::original {
    public struct OwnerCap has key, store {
        id: UID,
        vault_id: ID
    }
    
    public struct Vault has key {
        id: UID,
        owner_cap_id: ID,
        balance: Balance<SUI>
    }
    
    public fun withdraw(
        owner_cap: &OwnerCap,  // Type: 0x1111::original::OwnerCap
        vault: &mut Vault,
        amount: u64,
        ctx: &mut TxContext
    ): Coin<SUI> {
        assert!(
            object::id(owner_cap) == vault.owner_cap_id,
            E_ERROR
        );
        
        coin::take(&mut vault.balance, amount, ctx)
    }
}

// Attacker's package at 0x9999
module 0x9999::attacker {
    // Copy the EXACT same struct
    public struct OwnerCap has key, store {
        id: UID,
        vault_id: ID  // Identical!
    }
    
    public fun create_fake_cap(
        target_vault_id: ID,
        ctx: &mut TxContext
    ): OwnerCap {
        OwnerCap {
            id: object::new(ctx),
            vault_id: target_vault_id
        }
    }
}
```

**Attack:**
```typescript
// 1. Attacker creates fake cap
const fakeCap = tx.moveCall({
    target: '0x9999::attacker::create_fake_cap',
    arguments: [victimVaultId]
});

// 2. Try to withdraw using fake cap
tx.moveCall({
    target: '0x1111::original::withdraw',
    arguments: [
        fakeCap,      // Type: 0x9999::attacker::OwnerCap
        victimVault,  // Type: 0x1111::original::Vault
        1000
    ]
});
```

**Result:**
```
❌ TYPE ERROR - Transaction fails at validation!

Expected: &0x1111::original::OwnerCap
Got:      &0x9999::attacker::OwnerCap

These are DIFFERENT TYPES - transaction rejected!
```

---

### Visual Explanation

```
┌─────────────────────────────────────────────────────┐
│ Function Signature                                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│ public fun withdraw(                                │
│     owner_cap: &OwnerCap,  ← Expects specific type │
│     vault: &mut Vault,                              │
│     ...                                             │
│ )                                                   │
│                                                     │
│ Full type path required:                            │
│ &0x1111::original::OwnerCap                         │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ Attacker Provides                                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│ fakeCap: 0x9999::attacker::OwnerCap                 │
│                                                     │
│ Type mismatch! ❌                                   │
│                                                     │
│ 0x1111::original::OwnerCap                          │
│     ≠                                               │
│ 0x9999::attacker::OwnerCap                          │
└─────────────────────────────────────────────────────┘
```

---

## Part 3: The Type System Protection

### What Gets Checked

```
Transaction Validation (BEFORE execution):
    ↓
1. Parse function signature
   → Expects: &0x1111::original::OwnerCap
    ↓
2. Check argument types
   → Got: &0x9999::attacker::OwnerCap
    ↓
3. Compare types
   → 0x1111::original::OwnerCap vs 0x9999::attacker::OwnerCap
    ↓
4. MISMATCH DETECTED! ❌
    ↓
5. Reject transaction (doesn't execute)
```

---

### Attack Attempt 2: Try to Forge the Package Address

**Can the attacker deploy at the same address?**

```
NO! Package addresses are determined by:
1. Transaction digest (hash of deployment transaction)
2. Deployer's address
3. Deployed code hash
4. Counter/nonce

Result: Cryptographically impossible to deploy at same address
```

**Analogy:**
```
It's like trying to forge someone's fingerprint.
Even with identical code, you get a different package address.
```

---

## Part 4: Real-World Example

### Setup: Legitimate Vault System

```move
// Deployed at 0xABCD1234...
module 0xABCD1234::vault_system {
    public struct VaultOwnerCap has key, store {
        id: UID,
        vault_id: ID
    }
    
    public struct Vault has key {
        id: UID,
        owner_cap_id: ID,
        balance: Balance<SUI>
    }
    
    // Create vault and cap together
    public fun create_vault(ctx: &mut TxContext): (Vault, VaultOwnerCap) {
        let vault = Vault {
            id: object::new(ctx),
            owner_cap_id: object::id_from_address(@0x0),  // Set below
            balance: balance::zero()
        };
        
        let cap = VaultOwnerCap {
            id: object::new(ctx),
            vault_id: object::id(&vault)
        };
        
        vault.owner_cap_id = object::id(&cap);
        
        (vault, cap)
    }
    
    // Withdraw with verification
    public fun withdraw(
        owner_cap: &VaultOwnerCap,  // Type: 0xABCD1234::vault_system::VaultOwnerCap
        vault: &mut Vault,
        amount: u64,
        ctx: &mut TxContext
    ): Coin<SUI> {
        // Verify cap belongs to vault
        assert!(
            object::id(owner_cap) == vault.owner_cap_id,
            E_WRONG_CAP
        );
        
        coin::take(&mut vault.balance, amount, ctx)
    }
}
```

---

### Attack: Malicious Clone Package

```move
// Attacker deploys identical code at 0x9999EEEE...
module 0x9999EEEE::fake_vault {
    // EXACT SAME CODE as original!
    public struct VaultOwnerCap has key, store {
        id: UID,
        vault_id: ID
    }
    
    public struct Vault has key {
        id: UID,
        owner_cap_id: ID,
        balance: Balance<SUI>
    }
    
    // Can create fake caps
    public fun create_fake_cap(
        target_vault_id: ID,
        ctx: &mut TxContext
    ): VaultOwnerCap {
        VaultOwnerCap {
            id: object::new(ctx),
            vault_id: target_vault_id  // Points to victim's vault!
        }
    }
}
```

---

### Attack Execution

```typescript
// Alice has legitimate vault and cap from 0xABCD1234
const aliceVault = '0xVAULT_ALICE';
const aliceRealCap = '0xCAP_ALICE';

// Bob tries to attack
// Step 1: Bob creates fake cap using attacker package
const tx = new Transaction();

const bobFakeCap = tx.moveCall({
    target: '0x9999EEEE::fake_vault::create_fake_cap',
    arguments: [tx.pure(aliceVault)]  // Target Alice's vault
});

// Step 2: Bob tries to withdraw from Alice's vault using fake cap
tx.moveCall({
    target: '0xABCD1234::vault_system::withdraw',
    arguments: [
        bobFakeCap,   // Type: 0x9999EEEE::fake_vault::VaultOwnerCap
        aliceVault,   // Type: 0xABCD1234::vault_system::Vault
        tx.pure(1000)
    ]
});

// Step 3: Try to execute
await client.signAndExecuteTransaction({ 
    transaction: tx,
    signer: bob 
});
```

**Result:**
```
❌ TRANSACTION REJECTED

Error: Type mismatch for parameter 'owner_cap'
Expected: &0xABCD1234::vault_system::VaultOwnerCap
Got:      &0x9999EEEE::fake_vault::VaultOwnerCap

Transaction aborted before execution.
No state changes. No gas wasted (except validation gas).
```

---

## Part 5: Why Both Type Check AND Assert Are Needed

### Layer 1: Type System (Package-Level Security)

**Protects against:**
- ✅ Fake caps from different packages
- ✅ Cloned structs from attacker packages
- ✅ Cross-package confusion

```move
// This fails at type checking:
public fun withdraw(
    owner_cap: &0xAAAA::vault::OwnerCap,  // Expects from 0xAAAA
    vault: &mut Vault,
    ...
)

// Attacker provides:
0xBBBB::vault::OwnerCap  // From 0xBBBB
// ❌ Type mismatch - rejected!
```

---

### Layer 2: Object ID Assert (Instance-Level Security)

**Protects against:**
- ✅ Using Cap A for Vault B (same package, wrong instance)
- ✅ Using legitimate cap on wrong resource
- ✅ Confusion between multiple instances

```move
// This passes type checking:
public fun withdraw(
    owner_cap: &OwnerCap,  // Correct type ✓
    vault: &mut Vault,     // Correct type ✓
    ...
) {
    // But need to verify THIS cap for THIS vault
    assert!(object::id(owner_cap) == vault.owner_cap_id, E_ERROR);
}

// Without assert, could use:
Cap A (legitimate, from same package) on Vault B
// Types match ✓, but wrong instance!
```

---

### Complete Security Model

```
┌─────────────────────────────────────────────────────┐
│ LAYER 1: Type System (Package Binding)              │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Prevents:                                           │
│ • Fake caps from other packages ✓                   │
│ • Cloned structs ✓                                  │
│ • Cross-package attacks ✓                           │
│                                                     │
│ Checked: Before transaction execution               │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ LAYER 2: Ownership Check (Runtime)                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Prevents:                                           │
│ • Using objects user doesn't own ✓                  │
│ • Passing invalid object IDs ✓                      │
│                                                     │
│ Checked: Before transaction execution               │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ LAYER 3: Object ID Assert (Your Code)               │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Prevents:                                           │
│ • Using Cap A for Vault B (same package) ✓          │
│ • Cross-instance confusion ✓                        │
│ • Multiple resource mix-ups ✓                       │
│                                                     │
│ Checked: During transaction execution               │
└─────────────────────────────────────────────────────┘
```

---

## Part 6: Common Misconceptions

### Misconception 1: "Same Fields = Same Type"

```move
// Package A
public struct Token has key, store {
    id: UID,
    value: u64
}

// Package B (exact copy)
public struct Token has key, store {
    id: UID,
    value: u64
}

// These are DIFFERENT types!
// Cannot be used interchangeably
```

---

### Misconception 2: "I Can Create Objects With Any ID"

```move
// ❌ IMPOSSIBLE - Can't control UID creation
public fun create_fake_cap_with_specific_id(
    target_id: ID,  // Want to match legitimate cap's ID
    ctx: &mut TxContext
): OwnerCap {
    OwnerCap {
        // object::new(ctx) creates RANDOM UID
        // Can't specify the ID!
        id: object::new(ctx),  // Always random!
        vault_id: /* ... */
    }
}
```

**Why it's impossible:**
```rust
// Sui's object::new implementation (conceptual)
public fun new(ctx: &mut TxContext): UID {
    let tx_digest = ctx.digest();  // Current transaction hash
    let counter = ctx.ids_created();  // Counter
    
    // Hash: tx_digest + counter → unique ID
    let id_bytes = hash(tx_digest, counter);
    
    UID { id: ID { bytes: id_bytes } }
}

// Result: Cryptographically impossible to predict or forge
```

---

### Misconception 3: "I Can Upgrade Package to Same Address"

```move
// Original package at 0xABCD
module 0xABCD::vault {
    public struct OwnerCap has key, store { /* ... */ }
}

// After upgrade, types include version!
0xABCD::vault::OwnerCap  // Version 1
0xABCD::vault::OwnerCap  // Version 2 (if struct changed)

// If struct didn't change, type stays compatible
// But can't deploy completely new package at same address
```

---

## Part 7: Advanced Type System Features

### Generic Types Also Include Package Address

```move
// Package A
module 0xAAAA::tokens {
    public struct Token<phantom T> has key, store {
        id: UID,
        value: u64
    }
}

// Package B
module 0xBBBB::tokens {
    public struct Token<phantom T> has key, store {
        id: UID,
        value: u64
    }
}

// These are different:
0xAAAA::tokens::Token<SUI> ≠ 0xBBBB::tokens::Token<SUI>
```

---

### Witness Types Are Package-Specific

```move
// Package A at 0xAAAA
module 0xAAAA::nft {
    public struct NFT has drop {}
    
    fun init(witness: NFT, ctx: &mut TxContext) {
        // Only runs once for package 0xAAAA
    }
}

// Package B at 0xBBBB (clone)
module 0xBBBB::nft {
    public struct NFT has drop {}  // Same name!
    
    fun init(witness: NFT, ctx: &mut TxContext) {
        // Runs once for package 0xBBBB
        // But witness is 0xBBBB::nft::NFT, not 0xAAAA::nft::NFT
    }
}

// These witnesses are DIFFERENT types!
```

---

## Part 8: Practical Security Implications

### What You MUST Do

✅ **Always verify object relationships with assert**
```move
assert!(object::id(cap) == resource.cap_id, E_ERROR);
```
- Protects against same-package, wrong-instance attacks
- Type system doesn't help here

✅ **Trust the type system for package boundaries**
- No need to verify package addresses
- Type system guarantees it

✅ **Use specific types, not generic addresses**
```move
// ✅ Good
public fun withdraw(owner_cap: &OwnerCap, vault: &mut Vault)

// ❌ Bad - loses type safety
public fun withdraw(owner_addr: address, vault: &mut Vault)
```

---

### What You DON'T Need to Do

❌ **Don't verify package addresses**
```move
// ❌ Unnecessary
assert!(type_name::get<OwnerCap>().package() == @0xABCD, E_ERROR);
// Type system already guarantees this!
```

❌ **Don't worry about cloned packages**
- Clones have different addresses
- Type system prevents cross-usage
- Automatic protection

---

## Summary

### Question: "If I clone the OwnerCap struct, will it pass the runtime check?"

**Answer: NO! It will fail at type checking, before runtime.**

**Why:**
```
1. Cloned package has different address
   Original: 0xABCD::vault::OwnerCap
   Clone:    0x9999::vault::OwnerCap

2. Function expects specific type
   Expected: 0xABCD::vault::OwnerCap
   Got:      0x9999::vault::OwnerCap

3. Type mismatch detected
   → Transaction rejected
   → Doesn't reach runtime checks
   → No gas wasted (except validation)
```

### The Three Layers of Security

```
Layer 1: Type System
    → Prevents cross-package attacks
    → Automatic, can't be bypassed
    → No cloning attacks possible

Layer 2: Ownership Check (Sui Runtime)
    → Verifies user owns the object
    → Automatic by Sui
    → Can't use objects you don't own

Layer 3: Object ID Assert (Your Code)
    → Verifies correct cap for correct resource
    → YOU must implement this
    → Protects against same-package, wrong-instance
```

**The OwnerCap struct IS tightly bound to the package through the type system!** Any clone will have a different type path and cannot be used with the original package's functions. 🔒