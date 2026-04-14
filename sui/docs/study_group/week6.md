# Week 6: Dynamic Fields, Collections & Events

## Overview
Week 6 covers Sui's powerful dynamic storage capabilities. While Week 4 taught "wrapping" (putting objects inside structs), this week teaches "dynamic attachment" - adding fields to objects at runtime without knowing them at compile time. This is essential for building scalable applications like marketplaces, games with inventories, and social platforms.

---

## Day 1: Dynamic Fields - The "Sticky Notes" Pattern

### What are Dynamic Fields?
**Dynamic Fields = Fields added to objects at runtime**

**Physical Analogy:**
- **Regular Struct Fields:** Built-in shelves in a cabinet (fixed at manufacturing)
- **Dynamic Fields:** Sticky notes you can attach/remove from any surface anytime

### Why Need Dynamic Fields?
**Problem with regular structs:**
```rust
public struct Player has key {
    id: UID,
    name: String,
    // What if player collects 10,000 items?
    // Can't define 10,000 fields at compile time!
}
```

**Solution:** Attach items dynamically at runtime

### Two Types of Dynamic Fields

| Type | Module | What It Stores | Key Lookup |
|------|--------|----------------|------------|
| **Dynamic Field** | `sui::dynamic_field` | Any value with `store` | By name (any type with `copy + drop + store`) |
| **Dynamic Object Field** | `sui::dynamic_object_field` | Only objects (`key + store`) | By name, but object keeps its ID |

### Key Difference: Regular vs Object Field

**Dynamic Field (`dynamic_field`):**
- Stored object loses its ID
- Becomes "wrapped" inside parent
- Cannot be accessed by ID anymore
- Cheaper gas for small values

**Dynamic Object Field (`dynamic_object_field`):**
- Object KEEPS its ID
- Still visible in explorer
- Can be transferred directly (after removal)
- Better for valuable NFTs

---

## Day 2: Dynamic Field Syntax

### Adding a Dynamic Field

```rust
use sui::dynamic_field as df;

public struct Character has key {
    id: UID,
    name: String,
}

public struct Sword has store {
    damage: u64,
}

// Add sword to character
public fun equip_sword(character: &mut Character, sword: Sword) {
    // Key can be any type with copy + drop + store
    df::add(&mut character.id, b"weapon", sword);
}
```

### Reading a Dynamic Field

```rust
// Immutable borrow
public fun get_sword_damage(character: &Character): u64 {
    let sword: &Sword = df::borrow(&character.id, b"weapon");
    sword.damage
}

// Mutable borrow
public fun upgrade_sword(character: &mut Character) {
    let sword: &mut Sword = df::borrow_mut(&mut character.id, b"weapon");
    sword.damage = sword.damage + 10;
}
```

### Removing a Dynamic Field

```rust
public fun unequip_sword(character: &mut Character): Sword {
    df::remove(&mut character.id, b"weapon")
}
```

### Checking if Field Exists

```rust
public fun has_weapon(character: &Character): bool {
    df::exists_(&character.id, b"weapon")
}

// With type check
public fun has_sword(character: &Character): bool {
    df::exists_with_type<vector<u8>, Sword>(&character.id, b"weapon")
}
```

---

## Day 3: Dynamic Object Fields

### When to Use Object Fields

Use `dynamic_object_field` when:
1. Object should remain visible/queryable by ID
2. Object might be transferred after removal
3. Object has significant independent value (NFTs)

```rust
use sui::dynamic_object_field as dof;

public struct Inventory has key {
    id: UID,
}

public struct Artifact has key, store {
    id: UID,
    power: u64,
}

// Add artifact - keeps its ID!
public fun store_artifact(inv: &mut Inventory, artifact: Artifact) {
    dof::add(&mut inv.id, b"rare_artifact", artifact);
}

// Remove and transfer
public fun retrieve_artifact(inv: &mut Inventory): Artifact {
    dof::remove(&mut inv.id, b"rare_artifact")
}
```

### Comparison Table

| Feature | `dynamic_field` | `dynamic_object_field` |
|---------|-----------------|------------------------|
| Object keeps ID | No | Yes |
| Visible in explorer | No (wrapped) | Yes |
| Can store non-objects | Yes | No (needs `key`) |
| Gas cost | Lower | Slightly higher |
| Best for | Primitive data, configs | NFTs, transferable assets |

---

## Day 4: Table & Bag - High-Level Collections

### Why Tables and Bags?
Dynamic fields are low-level. Sui provides higher-level abstractions:

- **Table<K, V>:** Homogeneous collection (all values same type)
- **Bag:** Heterogeneous collection (values can be different types)
- **ObjectTable<K, V>:** Table storing objects (keeps IDs)
- **ObjectBag:** Bag storing objects (keeps IDs)

### Table Example

```rust
use sui::table::{Self, Table};

public struct Leaderboard has key {
    id: UID,
    scores: Table<address, u64>,
}

public fun create_leaderboard(ctx: &mut TxContext) {
    let leaderboard = Leaderboard {
        id: object::new(ctx),
        scores: table::new(ctx),
    };
    transfer::share_object(leaderboard);
}

public fun add_score(board: &mut Leaderboard, player: address, score: u64) {
    if (table::contains(&board.scores, player)) {
        let current = table::borrow_mut(&mut board.scores, player);
        *current = score;
    } else {
        table::add(&mut board.scores, player, score);
    }
}

public fun get_score(board: &Leaderboard, player: address): u64 {
    *table::borrow(&board.scores, player)
}
```

### Bag Example (Heterogeneous)

```rust
use sui::bag::{Self, Bag};

public struct PlayerData has key {
    id: UID,
    data: Bag,  // Can store different types!
}

public fun set_name(player: &mut PlayerData, name: String) {
    if (bag::contains(&player.data, b"name")) {
        bag::remove<vector<u8>, String>(&mut player.data, b"name");
    };
    bag::add(&mut player.data, b"name", name);
}

public fun set_level(player: &mut PlayerData, level: u64) {
    bag::add(&mut player.data, b"level", level);
}
```

### Important: Destroying Collections

**Collections must be empty to destroy:**

```rust
// This will ABORT if table is not empty!
public fun destroy_leaderboard(board: Leaderboard) {
    let Leaderboard { id, scores } = board;
    table::destroy_empty(scores);  // Aborts if not empty
    object::delete(id);
}
```

**Security Implication:** Cannot accidentally lose assets stored in collections.

---

## Day 5: Events - The "Broadcast System"

### What are Events?
**Events = Immutable logs emitted during transactions**

- NOT stored on-chain (saves gas)
- Indexed by fullnodes for querying
- Perfect for off-chain tracking
- Cannot be read by smart contracts

### Why Events?

| Use Case | Why Events? |
|----------|-------------|
| Activity tracking | Frontend can show "Alice bought NFT" |
| Analytics | Track volume, popular items |
| Notifications | Trigger webhooks on certain events |
| Audit trail | Permanent record of actions |

### Event Syntax

```rust
use sui::event;

// Define event struct - just needs `copy` and `drop`
public struct ItemPurchased has copy, drop {
    item_id: ID,
    buyer: address,
    price: u64,
    timestamp: u64,
}

public fun purchase_item(
    item: Item,
    payment: Coin<SUI>,
    clock: &Clock,
    ctx: &mut TxContext
) {
    // ... purchase logic ...

    // Emit event
    event::emit(ItemPurchased {
        item_id: object::id(&item),
        buyer: ctx.sender(),
        price: coin::value(&payment),
        timestamp: clock::timestamp_ms(clock),
    });
}
```

### Event Best Practices

**1. Include relevant IDs:**
```rust
public struct Transfer has copy, drop {
    object_id: ID,      // What was transferred
    from: address,      // Who sent
    to: address,        // Who received
}
```

**2. Use descriptive event names:**
```rust
// Good
public struct NFTMinted has copy, drop { ... }
public struct AuctionEnded has copy, drop { ... }

// Avoid generic names
public struct Event has copy, drop { ... }  // Too vague
```

**3. Events are NOT for contract logic:**
```rust
// BAD - Events can't be read by contracts
public fun check_history(...) {
    // IMPOSSIBLE: Cannot read past events in Move
}

// GOOD - Use state for contract logic
public struct History has key {
    id: UID,
    transfers: vector<TransferRecord>,
}
```

---

## Day 6: Practical Patterns

### Pattern 1: Typed Keys for Dynamic Fields

**Problem:** String keys are error-prone
```rust
// Easy to typo
df::add(&mut obj.id, b"waepon", sword);  // Oops!
df::borrow(&obj.id, b"weapon");           // Won't find it
```

**Solution:** Use marker structs as keys
```rust
public struct WeaponKey has copy, drop, store {}
public struct ArmorKey has copy, drop, store {}

public fun equip_weapon(char: &mut Character, sword: Sword) {
    df::add(&mut char.id, WeaponKey {}, sword);
}

public fun get_weapon(char: &Character): &Sword {
    df::borrow(&char.id, WeaponKey {})
}
```

**Benefits:**
- Typos caught at compile time
- IDE autocomplete works
- Type safety for different field types

### Pattern 2: Object Extensions

**Extend objects without modifying original module:**

```rust
// Original module (can't modify)
module game::character {
    public struct Character has key {
        id: UID,
        name: String,
    }
}

// Your extension module
module your_pkg::character_ext {
    use game::character::Character;

    public struct Stats has store {
        strength: u64,
        agility: u64,
    }

    public struct StatsKey has copy, drop, store {}

    public fun add_stats(char: &mut Character, stats: Stats) {
        df::add(character::uid_mut(char), StatsKey {}, stats);
    }
}
```

### Pattern 3: Lazy Initialization

```rust
public fun get_or_create_inventory(player: &mut Player, ctx: &mut TxContext): &mut Bag {
    let key = InventoryKey {};

    if (!df::exists_(&player.id, key)) {
        df::add(&mut player.id, key, bag::new(ctx));
    };

    df::borrow_mut(&mut player.id, key)
}
```

---

## Day 7: Security Considerations

### 1. Dynamic Field Access Control

**Problem:** Anyone with `&mut UID` can add/remove fields

```rust
// DANGEROUS if uid_mut is public
public fun uid_mut(obj: &mut MyObject): &mut UID {
    &mut obj.id
}
```

**Solution:** Control who can access UID

```rust
// Better: Require capability
public fun add_field_admin(
    _: &AdminCap,  // Proof of authority
    obj: &mut MyObject,
    key: String,
    value: u64
) {
    df::add(&mut obj.id, key, value);
}
```

### 2. Key Collision

**Problem:** Different modules might use same key

```rust
// Module A
df::add(&mut obj.id, b"data", value_a);

// Module B (different package)
df::add(&mut obj.id, b"data", value_b);  // Overwrites A!
```

**Solution:** Use typed keys with module-specific structs

```rust
// Module A
public struct ModuleADataKey has copy, drop, store {}
df::add(&mut obj.id, ModuleADataKey {}, value_a);

// Module B
public struct ModuleBDataKey has copy, drop, store {}
df::add(&mut obj.id, ModuleBDataKey {}, value_b);
// Different keys - no collision!
```

### 3. Orphaned Dynamic Fields

**Problem:** Deleting parent without removing children

```rust
// Fields attached to character
df::add(&mut character.id, key1, valuable_item);
df::add(&mut character.id, key2, another_item);

// Later: Delete character
object::delete(character.id);  // Items are now ORPHANED!
```

**Best Practice:** Remove all fields before deleting

```rust
public fun delete_character(character: Character) {
    // Remove all dynamic fields first
    let item1: Item = df::remove(&mut character.id, key1);
    let item2: Item = df::remove(&mut character.id, key2);

    // Handle removed items (transfer, destroy, etc.)
    transfer::public_transfer(item1, @recipient);
    transfer::public_transfer(item2, @recipient);

    // Now safe to delete
    let Character { id, name: _ } = character;
    object::delete(id);
}
```

---

## Auditor Checklist - Week 6

### Dynamic Fields
- [ ] Is `uid_mut` access properly controlled?
- [ ] Are typed keys used instead of strings?
- [ ] Can different modules collide on keys?
- [ ] Are fields removed before object deletion?
- [ ] Is there potential for unbounded growth?

### Collections
- [ ] Are Tables/Bags properly destroyed when empty?
- [ ] Is there a way to remove all items if needed?
- [ ] Could collection size cause gas issues?
- [ ] Are access controls on collection modifications?

### Events
- [ ] Do events include all relevant IDs?
- [ ] Is sensitive data excluded from events?
- [ ] Are events used for logging, not logic?
- [ ] Can events be used to reconstruct state?

---

## Key Takeaways

### Dynamic Fields
- Add fields at runtime without compile-time knowledge
- `dynamic_field` wraps values (hides ID)
- `dynamic_object_field` preserves object ID
- Use typed keys for safety

### Collections
- `Table<K,V>` for homogeneous data
- `Bag` for heterogeneous data
- Must be empty to destroy
- Built on dynamic fields

### Events
- Off-chain logging (not stored on-chain)
- Cannot be read by smart contracts
- Perfect for indexing and analytics
- Need `copy + drop` abilities

### Security
- Control access to `&mut UID`
- Use module-specific typed keys
- Remove dynamic fields before deletion
- Events don't provide security guarantees

---

## Next Steps

Week 7 will cover:
- Transfer Policies and Kiosk Framework
- NFT royalty enforcement
- Custom transfer rules
- Display Standard for metadata
- Package upgrades and versioning

This is the exact "Aha!" moment every Sui developer needs to have. You are looking at the code and asking: *"If I'm a hacker, why can't I just keep the receipt in my own contract and never pay back the pool?"*

Here is the answer, and it lies in the **Abilities** of that struct.

### 1. The Force: Linear Logic

Look at the definition of the receipt again:

```rust
struct FlashSwapReceipt<phantom CoinTypeA, phantom CoinTypeB> {
    pool_id: ID,
    a_to_b: bool,
    pay_amount: u64,
}

```

Notice what is **missing**. There is no `has drop, store, key, copy`.
Because it has **no abilities**, it is a **Hot Potato**.

**Why you can't "consume" it in your own contract:**
In Move, to "consume" or "destroy" a struct, you have two options:

1. **Drop it:** Requires the `drop` ability (which this doesn't have).
2. **Unpack it:** This means writing `let FlashSwapReceipt { ... } = receipt;`.

**The Golden Rule of Move:** > **Only the module that defines a struct can unpack it.**

Because the `FlashSwapReceipt` is defined in the `pool` module:

* Your "Custom Logic" contract **cannot** write `let FlashSwapReceipt { ... } = receipt;`. The compiler will throw an error saying "Cannot unpack struct from another module."
* Your "Custom Logic" contract **cannot** just let the variable go out of scope, because it doesn't have `drop`.
* Your "Custom Logic" contract **cannot** save it to a field in your own struct because it doesn't have `store`.

**Conclusion:** The **only** way to get that `FlashSwapReceipt` out of your transaction's memory is to pass it back into a function in the `pool` module that is allowed to unpack it.

---

### 2. The Only "Exit"

Looking at the code you provided, the only function that can "kill" the potato is `repay_flash_swap`:

```rust
public fun repay_flash_swap(...) {
    // ...
    // THIS LINE is what destroys the potato
    let FlashSwapReceipt { pool_id, a_to_b, pay_amount } = receipt; 
    // ...
}

```

If you don't call this function, the transaction **physically cannot end**. The Sui VM will look at the execution stack, see a "Hot Potato" still sitting there, and abort the whole transaction (reverting your borrow).

---

### 3. Audit Lesson: The "Custom Logic" Fallacy

You said: *"I can have my custom logic contract that can consume the receipt."*

As an auditor, you should verify:

1. **Does the receipt have `drop`?** (If yes, you can ignore it).
2. **Does the receipt have `store`?** (If yes, you can "hide" it in another object and finish the transaction).
3. **Is there any other function in the `pool` module that unpacks the receipt without requiring payment?** If the answer to all three is **NO**, then the user is **legally forced** by the laws of Move physics to pay the pool back.

---

### 📝 Study Notes: The Hot Potato "Contract"

* **Definition:** A struct with no abilities.
* **The Constraint:** It cannot be dropped, stored, or copied.
* **The Scope:** It must be created and destroyed in the same **Atomic Transaction**.
* **The Unpacker:** Only the module that **owns** the struct can destroy it. This is why you can't "consume" it in your own contract—you don't have the "permission" to open the box.

---

### Double-Check: Memory Test

1. If I try to write a function in *my* module: `public fun destroy_receipt(r: pool::FlashSwapReceipt) { let FlashSwapReceipt { ... } = r; }`, why will the compiler stop me?
2. If I borrow 10,000 BTC and the `repay_flash_swap` function requires 10,100 BTC, but I only have 10,000 BTC left, what happens to the `FlashSwapReceipt`? Can I just "delete" it to get out of the debt?

**Ready to move back to Wrapping and Initializers, or did this clear up the "Force" of the Hot Potato?**