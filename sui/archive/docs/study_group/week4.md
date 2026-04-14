# Week 4: Sui Object Model & Ownership

## 📚 Overview
Week 4 is the most "Sui-specific" week. Previous weeks taught "Move." This week teaches "Sui." You'll master the "Physical Architecture" of Sui, understand how Sui achieves massive speed (Parallelism) through object handling, and learn the 4 ways an object can exist in the universe.

---

## 🏛️ The Four Types of Ownership

**As an auditor, immediately ask:** "Who owns the objects being passed here?"

| Ownership Type | Code Definition | Behavior | Auditor's Security Note |
|---------------|----------------|----------|------------------------|
| **Address-Owned** | `transfer::transfer(obj, recipient)` | Only that address can sign transaction using this object | 🔒 **Private.** Most secure for personal assets |
| **Immutable** | `transfer::freeze_object(obj)` | No one can ever change or delete it again. Read-only forever | 🧊 **Unchangeable.** Great for global configs or logic constants |
| **Shared** | `transfer::share_object(obj)` | Anyone can try to access/mutate it. Requires **Consensus** (slower) | ⚠️ **The "Honey Pot".** High risk of "Race Conditions" or "Contention" |
| **Wrapped/Dynamic** | `let box = Box { item: obj }` | Object is "inside" another. No longer exists as top-level ID | 👻 **Hidden.** Must "unwrap" to interact with it again |

---

## ⚡ Performance: Fast-Path vs. Consensus

**Sui is fast because of Owned Objects**

### Fast-Path (Owned Objects)
**Scenario:** I send you a Coin

**Process:**
- I am the ONLY one who needs to sign
- Sui doesn't need to ask whole world for permission
- **Result:** Lightning fast, low gas

**Technical Detail:**
- No global ordering required
- Parallel execution possible
- Only affected parties involved

### Consensus (Shared Objects)
**Scenario:** 100 people try to swap on DEX (Shared Object) simultaneously

**Process:**
- Sui needs "sequencer" to decide who goes first
- Must establish global ordering
- **Result:** Slower, more expensive gas

**Technical Detail:**
- Requires Byzantine agreement
- Sequential processing
- Higher latency

### 🔍 Auditor Insight
**If developer makes everything a "Shared Object" just because it's easier:**
- Destroying app's performance
- Increasing gas costs for users
- Missing Sui's core advantage
- **This is a DESIGN FLAW**

---

## 💻 Practical Task 4: The "Parent-Child" Relationship (Wrapping)

### Object Wrapping Explained
**How you build complex systems** (like a Chest containing a Sword)

### Task: Create a Box that can hold a Car

```rust
module mastery::storage {
    // Modern Sui - common types auto-imported

    public struct Car has key, store {
        id: UID,
        speed: u64,
    }

    public struct Box has key {
        id: UID,
        car: Option<Car>, // This is "Wrapping"
    }

    // 1. Create a Box (empty)
    public fun create_box(ctx: &mut TxContext) {
        let box = Box {
            id: object::new(ctx),
            car: option::none(),
        };
        transfer::share_object(box);
    }

    // 2. Put a car inside (Consumption)
    // Notice: We take 'Car' by VALUE. It is now "wrapped"
    public fun put_in_box(box: &mut Box, car: Car) {
        box.car.fill(car);  // Modern method syntax
    }

    // 3. Take the car out
    public fun take_from_box(box: &mut Box): Car {
        box.car.extract()  // Modern method syntax
    }
}
```

**Modern Syntax Notes:**
- `std::option::none()` → `option::none()` (auto-imported)
- `std::option::fill(&mut box.car, car)` → `box.car.fill(car)` (method syntax)
- `std::option::extract(&mut box.car)` → `box.car.extract()` (method syntax)

### Key Concepts in Example

**1. The `store` Ability:**
```rust
public struct Car has key, store {
```
- `Car` needs `store` to be wrapped
- Without `store`, cannot be field in another struct

**2. Consumption Pattern:**
```rust
public fun put_in_box(box: &mut Box, car: Car)
```
- Takes `Car` by VALUE (not reference)
- Car is consumed/wrapped
- Car's ID becomes "hidden"

**3. Option Type:**
```rust
car: Option<Car>
```
- Allows Box to be empty or full
- Can check if Box contains car
- Safe extraction pattern

---

## 🔍 Detailed Audit Checks (Week 4)

### Question 1: The "Ghost" Object

**Scenario:** Car is put inside the Box

**Q:** Can you find Car's ID by looking at owner's address in block explorer?

**A:** NO

**Why:**
- Car is now "wrapped"
- Its ID is "off-market"
- Not a top-level object anymore
- Cannot be directly accessed
- Invisible to address queries

**Must extract from Box to make visible again**

**Auditor Implications:**
- Wrapped objects don't show in wallet
- Users might think they lost their assets
- Need UI to show wrapped contents
- Recovery requires unwrapping

---

### Question 2: The Delete Trap

**Scenario:** Try to delete the Box while Car is still inside

**Q:** What happens to the Car?

**A:** CANNOT DELETE - Compiler prevents it!

**Critical Move Logic:**
You **CANNOT** delete a struct that contains another struct that doesn't have `drop`

**Why:**
1. `Car` doesn't have `drop`
2. `Box` contains `Car`
3. Deleting `Box` would destroy `Car`
4. Compiler blocks this

**Must extract Car first:**
```rust
let car = take_from_box(&mut box);
// Now can delete empty box
// Or transfer car first
```

**🔒 This is Unbreakable Safety:**
- Prevents accidental asset destruction
- Compiler enforces at compile time
- No runtime checks needed
- Impossible to bypass

---

## 🧐 Check-in Discussion (Mentorship)

### Question 1: Twitter Clone - Fast-Path or Consensus?

**Scenario:** Twitter clone on Sui
- Every "Post" is object owned by user
- "Likes" are sent as transactions

**Q:** Fast-Path or Consensus?

**A:** FAST-PATH

**Why:**
- Each Post is owned by individual user
- Only that user can modify their posts
- Likes are separate transactions
- No shared state requiring coordination
- Parallel execution possible

**Performance:**
- ✅ Lightning fast
- ✅ Low gas costs
- ✅ Scales with users

---

### Question 2: Global High Score Board - Fast-Path or Consensus?

**Scenario:** Global High Score board that everyone in world writes to

**Q:** Fast-Path or Consensus?

**A:** CONSENSUS

**Why:**
- Single shared object (the scoreboard)
- Everyone competing to update it
- Need to determine ordering
- Must prevent race conditions
- Sequential processing required

**Performance:**
- ⚠️ Slower than owned objects
- ⚠️ Higher gas costs
- ⚠️ Potential bottleneck

**Design Consideration:**
- Consider alternative architectures
- Maybe per-user scores (owned)
- Aggregate periodically
- Use events for leaderboard

---

### Question 3: Vault vs. Global Shared Table

**Q:** Why is it better to have user "Wrap" their assets into "Vault" object they own, rather than storing in "Global Shared Table"?

**A:** Multiple critical advantages:

**1. Performance:**
- **Owned Vault:** Fast-path transactions
- **Shared Table:** Requires consensus
- Vault = parallel execution
- Table = sequential bottleneck

**2. Gas Costs:**
- **Owned Vault:** Minimal gas
- **Shared Table:** High gas (consensus overhead)

**3. Scalability:**
- **Owned Vault:** Scales linearly with users
- **Shared Table:** Becomes bottleneck as it grows
- Table size affects ALL users
- Vault only affects owner

**4. Security:**
- **Owned Vault:** User controls access
- **Shared Table:** Attack surface for all users
- Exploit in table affects everyone
- Bug in vault isolated to that user

**5. Privacy:**
- **Owned Vault:** Private by default
- **Shared Table:** Publicly visible state
- Vault contents can be hidden
- Table is transparent

**6. Upgradeability:**
- **Owned Vault:** Users can migrate individually
- **Shared Table:** Coordinated upgrade needed
- Version conflicts in table
- Smooth migration for vaults

**Design Pattern:**
```rust
// GOOD: Owned Vault
public struct UserVault has key {
    id: UID,
    assets: vector<Asset>
}

// AVOID: Global Shared Table
public struct GlobalTable has key {
    id: UID,
    user_assets: Table<address, vector<Asset>>
}
```

---

## 📝 Master Study Notes (Memory Reinforcement)

### Ownership Types

**1. Owned Objects = Fast & Private**
- Single owner can modify
- No consensus needed
- Parallel execution
- Low gas costs
- **Best for:** Personal assets, user data

**2. Shared Objects = Collaborative but Slower**
- Anyone can access
- Requires consensus
- Sequential execution
- Higher gas costs
- **Best for:** DEXs, DAOs, public registries

**3. Immutable Objects = Permanent & Free**
- Cannot be modified
- No consensus needed
- Very low gas
- **Best for:** Constants, configs, public data

**4. Wrapped Objects = Hidden**
- Not directly accessible
- Must unwrap to use
- Composability pattern
- **Best for:** Complex systems, inventories

### Wrapping Mechanics

**Wrapping:**
- Putting one object inside another
- Inner object's ID becomes inaccessible
- Must have `store` ability
- Changes ownership model

**Unwrapping:**
- Extracting object from container
- Restores top-level ID
- Makes object accessible again
- Can transfer after extraction

### Sui Guarantees

**Compiler Enforces:**
1. Cannot delete wrapped object without extracting
2. Cannot destroy resource without `drop`
3. Cannot access wrapped object's ID
4. Cannot bypass ownership model

**This provides:**
- Memory safety
- Asset safety
- State consistency
- Predictable behavior

---

## 🎯 Performance Optimization Patterns

### Pattern 1: Prefer Owned Over Shared
```rust
// GOOD: Each user owns their data
public struct UserProfile has key {
    id: UID,
    data: ProfileData
}

// AVOID: Everyone shares one object
public struct GlobalProfiles has key {
    id: UID,
    profiles: Table<address, ProfileData>
}
```

### Pattern 2: Use Wrapping for Composition
```rust
// GOOD: Wrap related objects
public struct Inventory has key {
    id: UID,
    items: vector<Item>  // Items are wrapped
}

// AVOID: Separate objects for each item
// Creates management overhead
```

### Pattern 3: Immutable for Constants
```rust
// GOOD: Freeze configuration
public fun create_config(ctx: &mut TxContext) {
    let config = Config { ... };
    transfer::freeze_object(config);
}
```

### Pattern 4: Events for Aggregation
```rust
// GOOD: Emit events, aggregate off-chain
sui::event::emit(ScoreUpdate { ... });

// AVOID: Shared scoreboard object
// Creates consensus bottleneck
```

---

## 🎓 Auditor Checklist

### Ownership Analysis
- ✅ Are objects appropriately owned vs. shared?
- ✅ Is shared state minimized?
- ✅ Can owned objects be used instead?
- ✅ Is consensus overhead justified?

### Wrapping Safety
- ✅ Do wrapped objects have `store` ability?
- ✅ Can objects be safely extracted?
- ✅ Is deletion properly prevented?
- ✅ Are wrapped assets visible to users?

### Performance Review
- ✅ Is fast-path utilized where possible?
- ✅ Are consensus costs justified?
- ✅ Will system scale with users?
- ✅ Are there bottlenecks?

### Design Patterns
- ✅ Is architecture Sui-optimized?
- ✅ Are gas costs reasonable?
- ✅ Is parallelism maximized?
- ✅ Is state management efficient?

---

## 🚀 Next Steps

**Phase 1 Complete!** 

You now understand:
- Move fundamentals and resources
- Functions, visibility, and control flow
- Abilities and type safety
- Sui object model and ownership

**Phase 2 Preview:** Advanced Patterns
- Week 5: Generics and Type Parameters
- Phantom Types
- Witness Pattern
- One-Time Witnesses
- Publisher Authority

These advanced patterns build on everything learned in Phase 1 and are essential for expert-level Sui development and security auditing.