# Move References - Study Notes

## Core Concept

**References** allow you to "show" a value to a function without transferring ownership. Think of it like showing someone your ID card - they can see it, but you keep it.

**Why references matter:**
- Retain ownership while allowing functions to read/modify data
- Avoid unnecessary moves and copies
- Enable flexible patterns like capability-based access control

---

## The Three Ways to Pass Values

### 1. Pass by Immutable Reference (`&T`)

**Syntax:** `&T`

**Characteristics:**
- Function can **READ** the value
- Function **CANNOT MODIFY** the value
- Original owner **RETAINS OWNERSHIP**
- Called "borrowing" the value

**Example:**
```move
/// Show the metro pass card to the inspector.
public fun is_valid(card: &Card): bool {
    card.uses > 0  // Can read, but cannot modify
}

// Usage:
let card = purchase();
let valid = is_valid(&card);  // Borrow the card
// card is still owned and usable here!
```

**Key points:**
- The `&` in the function signature means "I need to see this, but won't change it"
- Caller passes `&card` to create the reference
- After the function returns, the original owner can still use the value

---

### 2. Pass by Mutable Reference (`&mut T`)

**Syntax:** `&mut T`

**Characteristics:**
- Function can **READ AND MODIFY** the value
- Original owner **RETAINS OWNERSHIP**
- Can change the value's internal state
- Only one mutable reference can exist at a time

**Example:**
```move
/// Use the metro pass card at the turnstile to enter the metro.
public fun enter_metro(card: &mut Card) {
    assert!(card.uses > 0, ENoUses);
    card.uses = card.uses - 1;  // Modifies the card!
}

// Usage:
let mut card = purchase();  // Must declare as mutable
enter_metro(&mut card);  // Pass mutable reference
// card still owned here, but its state changed
```

**Key points:**
- The `&mut` means "I need to modify this, but I'll give it back"
- Variable must be declared as `mut` to take mutable references
- Caller passes `&mut card` to create the mutable reference

---

### 3. Pass by Value (Move)

**Syntax:** `T` (no `&`)

**Characteristics:**
- Function **TAKES OWNERSHIP**
- Original owner **LOSES ACCESS**
- Value is moved, not borrowed
- Can be destroyed or returned

**Example:**
```move
/// Recycle the metro pass card.
public fun recycle(card: Card) {
    assert!(card.uses == 0, EHasUses);
    let Card { uses: _ } = card;  // Unpack and destroy
}

// Usage:
let card = purchase();
recycle(card);  // card is MOVED
// card is NO LONGER accessible here! ✗
```

**Key points:**
- No `&` means ownership transfer
- Original variable becomes invalid after the call
- Used when you want to consume/destroy the value

---

## Metro Pass Example: Complete Flow

### Setup
```move
module book::metro_pass;

/// Error code for when the card is empty.
const ENoUses: u64 = 0;
/// Error code for when the card is not empty.
const EHasUses: u64 = 1;

/// Number of uses for a metro pass card.
const USES: u8 = 3;

/// A metro pass card
public struct Card { uses: u8 }
```

### Functions

**1. Purchase (by value return):**
```move
/// Purchase a metro pass card.
public fun purchase(/* pass a Coin */): Card {
    Card { uses: USES }
}
```
- Returns ownership of a new Card to the caller

**2. Validation (immutable reference):**
```move
/// Show the metro pass card to the inspector.
public fun is_valid(card: &Card): bool {
    card.uses > 0
}
```
- Borrows the card to read its state
- Cannot modify the card
- Owner keeps the card

**3. Usage (mutable reference):**
```move
/// Use the metro pass card at the turnstile to enter the metro.
public fun enter_metro(card: &mut Card) {
    assert!(card.uses > 0, ENoUses);
    card.uses = card.uses - 1;
}
```
- Borrows the card mutably to deduct a ride
- Modifies the card's state
- Owner keeps the card but state changed

**4. Recycling (by value):**
```move
/// Recycle the metro pass card.
public fun recycle(card: Card) {
    assert!(card.uses == 0, EHasUses);
    let Card { uses: _ } = card;
}
```
- Takes ownership to destroy the card
- Original owner loses access
- Card is unpacked and destroyed

---

## Complete Usage Example

```move
#[test]
fun test_card_2024() {
    // 1. Purchase: Get ownership of a new card
    let mut card = purchase();
    
    // 2. Enter metro: Pass mutable reference (modifies but doesn't move)
    card.enter_metro();
    
    // 3. Validate: Pass immutable reference (reads but doesn't move)
    assert!(card.is_valid());
    
    // 4. Use remaining rides
    card.enter_metro();
    card.enter_metro();
    
    // 5. Recycle: Move the card (give up ownership)
    card.recycle();
    
    // card is NO LONGER USABLE here!
}
```

---

## Reference vs Value: Visual Comparison

### Immutable Reference (`&T`)
```
Caller Scope          Function Scope
┌─────────────┐      ┌──────────────┐
│ card        │      │ card: &Card  │
│  ├─ uses: 3 │◄─────┤ (read-only)  │
└─────────────┘      └──────────────┘
     │                      │
     └──────────────────────┘
   Ownership stays with caller
   Function can only read
```

### Mutable Reference (`&mut T`)
```
Caller Scope          Function Scope
┌─────────────┐      ┌──────────────┐
│ mut card    │      │ card: &mut   │
│  ├─ uses: 3 │◄────►│ (can modify) │
└─────────────┘      └──────────────┘
     │                      │
     └──────────────────────┘
   Ownership stays with caller
   Function can read and modify
   After call: uses might be 2
```

### Pass by Value (Move)
```
Before call:
Caller Scope
┌─────────────┐
│ card        │
│  ├─ uses: 0 │
└─────────────┘

During call:
Caller Scope          Function Scope
┌─────────────┐      ┌──────────────┐
│ card (✗)    │      │ card: Card   │
│             │─────►│  ├─ uses: 0  │
└─────────────┘      └──────────────┘
  Invalid             Owns the card
  
After call:
Caller Scope          Function Scope
┌─────────────┐      ┌──────────────┐
│ card (✗)    │      │ (destroyed)  │
└─────────────┘      └──────────────┘
```

---

## Key Concepts

### Borrowing

**Definition:** Creating a reference to a value is called "borrowing"

**Analogy:** Like borrowing a book from a library
- You get to read it (immutable reference)
- You might get to write notes in it (mutable reference)
- But you must return it (ownership stays with library)

**Example from Option type:**
```move
// The standard library uses "borrow" terminology
public fun borrow<T>(opt: &Option<T>): &T {
    // Returns a reference to the inner value
}
```

---

### Wildcard Pattern (`_`)

**Purpose:** Ignore a field during destructuring while still consuming the value

**Why needed:** Move requires you to explicitly handle all struct fields

```move
// Must acknowledge all fields, even if unused
let Card { uses: _ } = card;  // ✓ Ignores 'uses' but destructs Card

// This would ERROR:
let Card { } = card;  // ✗ Missing field 'uses'
```

**Common usage:**
```move
public struct Point { x: u64, y: u64 }

// Only care about x
let Point { x, y: _ } = point;

// Ignore everything
let Point { x: _, y: _ } = point;
```

---

## Practical Patterns

### Pattern 1: Read-only Inspection
```move
// Inspector checks without modifying
public fun check_balance(account: &Account): u64 {
    account.balance  // Just reading
}
```

### Pattern 2: State Modification
```move
// Modify internal state without taking ownership
public fun deposit(account: &mut Account, amount: u64) {
    account.balance = account.balance + amount;
}
```

### Pattern 3: Conditional Ownership Transfer
```move
// Take ownership only if condition met
public fun withdraw_if_eligible(account: Account): Option<Coin> {
    if (account.balance > 100) {
        some(extract_coins(account))
    } else {
        return_account(account);
        none()
    }
}
```

### Pattern 4: Multiple References
```move
public fun compare_cards(card1: &Card, card2: &Card): bool {
    card1.uses > card2.uses
}

// Usage:
let valid = compare_cards(&my_card, &other_card);
// Both cards still owned by caller!
```

---

## Rules and Restrictions

### Mutability Rules

**Rule 1:** At any time, you can have EITHER:
- One mutable reference (`&mut T`), OR
- Multiple immutable references (`&T`)

**Rule 2:** References must always be valid (no dangling references)

**Rule 3:** Cannot have mutable and immutable references simultaneously

```move
let mut card = purchase();

let ref1 = &card;        // ✓ Immutable borrow
let ref2 = &card;        // ✓ Another immutable borrow (OK!)

let ref_mut = &mut card; // ✗ ERROR! Already borrowed immutably
```

---

### Declaration Requirements

**For mutable references, variable must be declared `mut`:**

```move
let card = purchase();
enter_metro(&mut card);  // ✗ ERROR! card is not mutable

let mut card = purchase();
enter_metro(&mut card);  // ✓ Correct
```

---

## Common Use Cases in Sui

### 1. Capability Pattern (Immutable Reference)
```move
public struct AdminCap has key, store { id: UID }

// Check capability without consuming it
public fun admin_action(_cap: &AdminCap, param: u64) {
    // Only callable if caller has AdminCap
    // Cap is not consumed, can be reused
}
```

### 2. Object Mutation (Mutable Reference)
```move
public struct NFT has key, store {
    id: UID,
    metadata: String
}

// Modify NFT without transferring ownership
public fun update_metadata(nft: &mut NFT, new_data: String) {
    nft.metadata = new_data;
}
```

### 3. Reading Object State (Immutable Reference)
```move
public fun get_nft_owner(nft: &NFT): address {
    // Just read the owner field
    object::owner(nft)
}
```

---

## Quick Reference Table

| Pass Type | Syntax | Can Read? | Can Modify? | Keeps Ownership? | Use Case |
|-----------|--------|-----------|-------------|------------------|----------|
| Immutable Reference | `&T` | ✅ Yes | ❌ No | ✅ Yes | Inspect/validate |
| Mutable Reference | `&mut T` | ✅ Yes | ✅ Yes | ✅ Yes | Modify state |
| By Value | `T` | ✅ Yes | ✅ Yes | ❌ No | Consume/destroy |

---

## Common Mistakes and Solutions

### Mistake 1: Forgetting to declare as mutable
```move
// ✗ Wrong
let card = purchase();
enter_metro(&mut card);  // ERROR

// ✓ Correct
let mut card = purchase();
enter_metro(&mut card);
```

### Mistake 2: Moving when you meant to borrow
```move
// ✗ Wrong - card is moved
let card = purchase();
is_valid(card);  // Oops! Moved the card
enter_metro(&mut card);  // ERROR: card was moved

// ✓ Correct - borrow the card
let card = purchase();
is_valid(&card);  // Just borrowed
enter_metro(&mut card);  // Still have ownership
```

### Mistake 3: Trying to use after moving
```move
// ✗ Wrong
let card = purchase();
recycle(card);  // card is moved here
is_valid(&card);  // ERROR: card no longer exists

// ✓ Correct - check before recycling
let card = purchase();
is_valid(&card);  // Check first
recycle(card);  // Then move/destroy
```

---

## Key Takeaways

1. **References = Borrowing:** You show the value without giving up ownership
2. **Immutable `&T`:** Read-only access, multiple borrows allowed
3. **Mutable `&mut T`:** Read-write access, only one mutable borrow at a time
4. **By Value:** Transfers ownership, original becomes inaccessible
5. **Move 2024 syntax:** Use dot notation like `card.enter_metro()` for methods
6. **Capability Pattern:** References enable powerful access control patterns
7. **Memory efficiency:** References avoid unnecessary copying

References are fundamental to Move's safety guarantees and enable efficient, secure smart contract development!