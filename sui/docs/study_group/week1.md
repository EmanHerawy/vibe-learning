# Week 1: Move Fundamentals & Resource Thinking

## 📚 Overview
Week 1 focuses on understanding why Move is the "safest" language for money and how to create your first digital "physical" assets (Structs) on the Sui blockchain.

---

## 🧠 Core Concept: What is "Resource-Oriented"?

### Traditional Approach (Solidity)
**Money = Spreadsheet**
- Send $10: subtract 10 from my row, add 10 to yours
- **Bug Risk:** Might subtract from sender but forget to add to receiver
- **Result:** Money just disappears

### Move Approach
**Money = Physical Object (like a gold coin)**
- ✅ Cannot be deleted by accident
- ✅ Cannot be copied (duplicated) out of thin air
- ✅ Must always be "somewhere" (either in variable or storage)

### 🔒 Security Auditor Perspective
In Move, "Double Spending" or "Accidental Burning" is often prevented by the **compiler itself**, not just programmer's logic.

---

## 🛠️ The "Abilities" System - Physical Laws for Data

Think of Abilities as "Physical Laws" you assign to your data. There are 4 labels you can apply to a struct:

| Ability | Plain English Meaning | Why Auditor Cares |
|---------|---------------------|-------------------|
| **copy** | You can make a photocopy of this data | ⚠️ Real money should NEVER have this |
| **drop** | You can throw this away (ignore it) | ⚠️ If NFT has this, user could accidentally delete it |
| **store** | Can be put inside a box (another struct) | ✅ Required for objects living inside other objects |
| **key** | A "Global Object" with its own ID on Sui | ✅ Makes it searchable, ownable "Sui Object" |

---

## 💻 Practical Task 1: Your First "Asset"

### Creating a Car as Sui Object

```rust
module my_first_package::garage {
    // Modern Sui syntax (2024 edition) - simplified imports
    use sui::object::UID;

    // This is a "Sui Object" because:
    // 1. Has 'key' ability
    // 2. First field is 'id: UID'
    public struct Car has key {
        id: UID,
        speed: u64,
    }

    // Function to create car and give to sender
    public entry fun create_car(ctx: &mut TxContext) {
        let new_car = Car {
            id: object::new(ctx),
            speed: 100,
        };
        // MUST do something with new_car
        // Can't just let function end - compiler will error!
        transfer::transfer(new_car, ctx.sender());
    }
}
```

**Note on Imports:** Modern Sui (2024 edition) auto-imports common types like `TxContext`, `transfer`, and `object`. The `ctx.sender()` method syntax replaces the older `tx_context::sender(ctx)`.

---

## 🔍 The "Physics" Tests

### Test 1: The Vanishing Act
**Question:** If I remove `transfer::transfer(...)` line, will code compile?

**Answer:** NO - Code will not compile

**Why:** 
- `Car` does NOT have `drop` ability
- It's a "Resource"
- Cannot just let it vanish
- Compiler enforces you must handle it

**Lesson:** In other languages, unused variables are garbage collected. In Move, if object doesn't have `drop`, compiler **forces** you to deal with it. This prevents "leaking" assets.

### Test 2: The Duplicate Glitch
**Scenario:** Add `copy` ability to Car

```rust
public struct Car has key, copy {
    id: UID,
    speed: u64,
}
```

**Try to clone:**
```rust
let new_car = Car { id: object::new(ctx), speed: 100 };
let car_clone = new_car;
transfer::transfer(new_car, tx_context::sender(ctx));
transfer::transfer(car_clone, tx_context::sender(ctx));
```

**Result:** Build FAILS

**Why:**
- Even though you added `copy`, the field `id: UID` cannot be copied
- A Sui Object is only as flexible as its weakest field
- Since Unique ID (UID) must be unique, you can't copy a struct containing one

**🔒 Security Feature:** This is a MASSIVE security protection built into the type system.

---

## 📝 Key Takeaways - Week 1

### Move Philosophy
**Data = Physical Objects, not just numbers**

### Core Components

1. **Structs:** The "containers" for your data

2. **UID:** The unique "social security number" for every Sui Object

3. **Resource Safety:** 
   - If struct doesn't have `drop`, you MUST:
     - Transfer it, OR
     - Wrap it, OR
     - Destroy it manually
   - You cannot ignore it

### Compiler as Auditor
- Compiler checks if you "lost" an object before deployment
- UID Protection: Cannot copy or drop anything containing UID
- Ensures Sui objects remain unique and permanent unless explicitly destroyed

### Abilities are "Opt-in"
- By default, Move structs are very restrictive
- Must intentionally add permissions (copy, drop, store)

---

## 🧐 Understanding Check Questions

### Question 1: Gift Card App
**Scenario:** Building "Gift Card" app where users can throw away cards with $0 balance

**Q:** Which ability must I add to Gift Card struct?

**A:** `drop`

**Why:** Allows users to discard/ignore the card when it has no value

### Question 2: GoldCoin Security
**Scenario:** See this definition:
```rust
public struct GoldCoin has key, copy, drop
```

**Q:** Why would security auditor write "High Severity" finding?

**A:** Multiple critical issues:

1. **`copy` on money:** Users could duplicate money infinitely
2. **`drop` on money:** Total supply could disappear without trace
3. **However:** If it contains `UID`, it actually CAN'T have copy/drop (compiler prevents)
4. **The Real Issue:** If it WERE possible, it would be catastrophic

**Auditor Finding:** Even attempting to give money `copy` and `drop` shows fundamental misunderstanding of resource safety.

### Question 3: UID as Security Guard
**Q:** Why is `id: UID` field like a "security guard"?

**A:** UID "infects" the struct with safety:

1. **Because UID does NOT have `copy`:**
   - Your struct cannot be copied
   
2. **Because UID does NOT have `drop`:**
   - Your struct cannot be accidentally deleted
   
3. **Forced Explicit Handling:**
   - Must use `sui::object::delete` function to remove
   - Creates "paper trail" on blockchain

**The Infection Effect:** UID forces programmer to use proper destruction, providing audit trail.

---

## 🎯 Memory Hooks

**Resource = Physical Object**
- Can't duplicate
- Can't vanish
- Must always be somewhere

**UID = Uniqueness Enforcer**
- Prevents copying
- Prevents dropping
- Requires explicit destruction

**Abilities = Opt-in Permissions**
- Default: Very restrictive
- Must explicitly grant capabilities

**Compiler = First Line of Defense**
- Catches resource leaks before deployment
- Enforces linear logic
- Prevents accidental loss

---

## 🚀 Next Steps

Week 2 will cover:
- Functions and Visibility (the "Doors and Locks")
- Reference types (&, &mut)
- Control flow and error handling
- Entry points and access control