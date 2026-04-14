# Week 3: Abilities & The Type System (Deep Dive)

## 📚 Overview
Week 3 dives into the technical foundation of Move's security. In other languages, "Types" just tell computer how much memory to use. In Move, **Abilities define the lifecycle of data**.

---

## 🛠️ The Four Abilities: Technical Specifications

### A. copy (The Duplicator)

**Technicality:** Allows value to be duplicated via `copy` keyword or by multiple assignments

**Auditor Detail:** 
- If struct has `copy`, it can be used in a "Double Spend"
- In Sui, `UID` does NOT have `copy`
- Any object with an ID is globally unique

**🚨 Security Risk:**
**NEVER** allow `copy` on:
- Anything representing a balance
- Permission (Capability)
- Unique identifier

---

### B. drop (The Garbage Collector)

**Technicality:** Allows value to be "popped" off stack at end of scope without being explicitly handled

**Auditor Detail:**
- If struct lacks `drop`, it is a **Resource**
- Compiler enforces **Linear Logic**: must be consumed (moved, wrapped, or destroyed)

**🚨 Security Risk:**
If a "Receipt" for a loan has `drop`:
- User can just ignore the receipt
- Never pay back the loan
- Complete loss of accountability

---

### C. store (The Suitcase)

**Technicality:** Allows value to be stored inside another struct that has `key` ability

**Auditor Detail:**
- Without `store`, object cannot be put into:
  - Table
  - Bag
  - Wrapped inside another object

**Sui Specific - Critical Transfer Rules:**

| Function | Object Requirement | Who Can Call |
|----------|-------------------|--------------|
| `transfer::transfer` | `key` only | Only defining module |
| `transfer::public_transfer` | `key + store` | Any module |

**Security Implications:**
- `key` only = Module controls all transfers (soulbound NFTs, controlled assets)
- `key + store` = Anyone can transfer (freely tradeable assets)
- This is how you create "soulbound" or "non-transferrable" tokens!

---

### D. key (The Passport)

**Technicality:** Allows struct to be used as top-level Sui Object

**Requirement:** First field MUST be `id: UID`

**Auditor Detail:**
Only `key` objects can be:
- Owned by addresses
- Shared on-chain

---

## 🔬 Internal Constraints: The "Infection" Rule

### The Critical Rule
**A struct can only have an ability if ALL its fields have that same ability**

### Example of Failure

```rust
public struct Weapon has copy, drop {
    power: u64,
}

public struct Player has copy {
    id: UID,        // ERROR: UID does not have 'copy'
    weapon: Weapon  // This part is fine
}
```

**Compiler Error:** Cannot give `Player` the `copy` ability because `UID` doesn't have `copy`

### 🔒 Why This Matters for Security
**Prevents developer from accidentally making "Copyable" Player if Player contains Unique ID**

**Safety "bubbles up":** From smallest field to largest struct

**The Infection Effect:**
- If ANY field lacks an ability
- The entire struct cannot have that ability
- Automatic safety enforcement

---

## 🥔 The "Hot Potato" Pattern - Architectural Security

### What is Hot Potato?
**A struct with ZERO abilities**

```rust
public struct Request {
    amount: u64,
    fee: u64
}
```

### Why It's a Security Masterpiece

**It cannot be:**
1. ❌ **Saved:** Can't put in Table (needs `store`)
2. ❌ **Ignored:** Can't let function end (needs `drop`)
3. ❌ **Cloned:** Can't duplicate request (needs `copy`)
4. ❌ **Sent to wallet:** Can't transfer it (needs `key`)

**The ONLY way to get rid of it:**
Pass it into function in same module that "destroys" it by unpacking

### Security Implications
**Forces caller to:**
- Complete the full transaction flow
- Cannot abandon half-completed operations
- Must follow intended sequence
- Compiler enforces proper cleanup

---

## 💻 Practical Lab: Flash Loan Architecture

### The Flash Loan Pattern
**Goal:** User borrows "Value," gets a "Potato," must return "Value" to destroy "Potato"

```rust
module mastery::flash_loan {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};

    // The "Hot Potato" - No abilities!
    public struct Receipt {
        amount: u64
    }

    public struct Pool has key {
        id: UID,
        funds: Balance<SUI>
    }

    const EInvalidRepayment: u64 = 1;

    // 1. Borrow the money. Return the Coin AND the Potato.
    public fun borrow(
        pool: &mut Pool,
        amount: u64,
        ctx: &mut TxContext
    ): (Coin<SUI>, Receipt) {
        let borrowed_balance = pool.funds.split(amount);
        (
            coin::from_balance(borrowed_balance, ctx),
            Receipt { amount }
        )
    }

    // 2. The ONLY way to "kill" the potato.
    // Notice how we "unpack" the receipt: let Receipt { amount } = receipt;
    public fun repay(
        pool: &mut Pool,
        payment: Coin<SUI>,
        receipt: Receipt
    ) {
        let Receipt { amount } = receipt; // Potato is now destroyed

        // AUDITOR CHECK: Is payment enough?
        assert!(payment.value() >= amount, EInvalidRepayment);

        pool.funds.join(payment.into_balance());
    }
}
```

**Note on Modern Syntax:** Sui 2024 edition supports method syntax:
- `balance::split(&mut pool.funds, amount)` → `pool.funds.split(amount)`
- `coin::value(&payment)` → `payment.value()`
- `coin::into_balance(payment)` → `payment.into_balance()`

### Key Security Features

1. **Hot Potato Receipt:**
   - Cannot be stored or ignored
   - MUST be consumed by `repay` function
   - Guarantees loan is repaid

2. **Unpacking Syntax:**
   ```rust
   let Receipt { amount } = receipt;
   ```
   - This is the ONLY way to destroy a resource
   - Extracts field values
   - Consumes the struct

3. **Validation Check:**
   - Assert payment >= borrowed amount
   - Prevents underpayment
   - Atomic transaction ensures safety

---

## 🧐 Detailed Check-in (Testing Auditor Brain)

### Question 1: The Unpacking Rule

**Scenario:**
```rust
public fun repay(
    pool: &mut Pool, 
    payment: Coin<SUI>, 
    receipt: &Receipt  // Changed to reference!
)
```

**Q:** Would the Potato be destroyed?

**A:** NO

**Why:**
- References do NOT consume values
- `&Receipt` is just a borrow
- Potato still exists after function ends
- Must pass by VALUE to consume: `receipt: Receipt`

**Critical Insight:** Only passing by value allows unpacking and destruction

---

### Question 2: The Metadata Leak

**Scenario:**
```rust
public struct User has key, drop { 
    id: UID, 
    age: u8 
}
```

**Q:** If user "drops" this object, what happens to the UID? Why does Sui prevent this?

**A:** Sui PREVENTS this entirely

**Why:**
1. **UID does NOT have `drop`**
2. **Infection Rule applies:**
   - If `User` contains `UID` (no drop)
   - `User` CANNOT have `drop`
3. **Compiler Error:** Code won't compile

**If it WERE allowed (it's not):**
- UID would disappear
- Object ID would be orphaned
- Blockchain state would be corrupted
- No way to track object history

**Security Protection:** Type system prevents this at compile time

---

### Question 3: The "Store" Mystery

**Scenario:**
```rust
public struct Vault { 
    coin: Coin<SUI> 
}
```

`Coin` has `store`, but `Vault` is missing `store` ability

**Q:** Can I put the Vault inside another object?

**A:** NO

**Why:**
1. **Parent must have `store` to be stored**
2. Even though `Coin<SUI>` has `store`
3. `Vault` itself lacks `store`
4. **Infection works both ways:**
   - Fields must have abilities parent requires
   - Parent must have ability to be used in certain ways

**Fix:**
```rust
public struct Vault has store { 
    coin: Coin<SUI> 
}
```

---

## 📝 Master Study Notes (Memory Reinforcement)

### Linear Logic
**No drop = Must be destroyed manually by "unpacking"**

**Unpacking Syntax:**
```rust
let Struct { field1, field2 } = instance;
```
- This is the ONLY way to delete a resource
- Extracts all fields
- Consumes the struct
- Compiler enforces completeness

### Sui Object Requirements
**To be a Sui Object:**
1. Must have `key` ability
2. First field must be `id: UID`

```rust
public struct MyObject has key {
    id: UID,
    // other fields...
}
```

### Ability Infection
**A struct is only as "capable" as its most restricted field**

**Examples:**

**Infection Downward (Field restricts parent):**
```rust
// UID has no copy
public struct Container has copy {  // ERROR!
    id: UID  // Blocks copy ability
}
```

**Infection Upward (Parent needs field to have ability):**
```rust
// Coin has store
public struct Vault {  // Missing store
    coin: Coin<SUI>  // Has store, but Vault can't be stored
}
```

### The Hot Potato Pattern

**Zero Abilities = Maximum Control**

```rust
public struct HotPotato {
    data: u64
}
```

**Properties:**
- Cannot store (no `store`)
- Cannot drop (no `drop`)
- Cannot copy (no `copy`)
- Cannot transfer (no `key`)
- **Must** be unpacked in same transaction

**Use Cases:**
- Flash loans
- Multi-step operations
- Enforcing transaction sequences
- Preventing abandonment

---

## 🎯 Security Patterns

### Pattern 1: Preventing Double Spend
**Never allow `copy` on:**
- Currency/tokens
- Capabilities/permissions
- Unique identifiers

### Pattern 2: Preventing Accidental Loss
**Be careful with `drop` on:**
- Valuable assets
- Receipts/proofs
- Account objects

**Safe to use `drop` on:**
- Witness types (one-time use)
- Temporary markers
- Events/logs

### Pattern 3: Enforcing Sequences
**Use Hot Potato to:**
- Force completion of multi-step operations
- Prevent partial transactions
- Ensure proper cleanup
- Lock users into intended flow

### Pattern 4: Wrapping Protection
**Remember `store` is needed to:**
- Put object in another object
- Store in Tables/Bags
- Use `transfer::public_transfer`

---

## 🎓 Auditor Checklist

When reviewing code, check:

### Abilities
- ✅ Does struct with value have `copy`? (RED FLAG)
- ✅ Does receipt/proof have `drop`? (RED FLAG)
- ✅ Does wrapped object have `store`? (Required)
- ✅ Do all fields support parent's abilities? (Infection check)

### Hot Potatoes
- ✅ Is there unpacking function in same module?
- ✅ Are all fields validated before unpacking?
- ✅ Can user abandon the potato? (Should be NO)

### Resource Handling
- ✅ Are all resources properly consumed?
- ✅ Is unpacking syntax correct?
- ✅ Are references vs. values used appropriately?

---

## 🚀 Next Steps

Week 4 will cover:
- Sui Object Model deep dive
- The Four Types of Ownership
- Performance: Fast-Path vs. Consensus
- Object Wrapping patterns
- Parent-Child relationships
- Parallelism and scalability