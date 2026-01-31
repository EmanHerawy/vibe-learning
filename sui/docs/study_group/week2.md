# Week 2: Functions, Visibility & Control Flow

## 📚 Overview
Week 2 teaches how to build "The Vault" - controlling who can call your code, how to move objects in and out of functions, and how to handle errors so the "physics" of your contract don't break.

---

## 🔑 1. Visibility & Entry Points: Who Has the Keys?

**Default:** Functions are **private** by default. Must be intentional about opening doors.

### Visibility Modifiers

| Visibility | Who Can Call It? | Auditor's Note |
|-----------|-----------------|----------------|
| **(none)** | Only this module | 🔒 Most restrictive, safest |
| **public** | Any Move module | ⚠️ Dangerous if it moves assets! |
| **public(package)** | Only modules in same package | ✅ Great for "internal" helpers |

### Entry Modifier (Separate Concept!)

**`entry` is NOT a visibility modifier** - it marks functions as transaction entry points.

| Combination | Who Can Call Via Transaction? | Who Can Call From Code? |
|-------------|------------------------------|------------------------|
| **entry fun** | Users (CLI/Wallet) | Only this module |
| **public entry fun** | Users (CLI/Wallet) | Any module |
| **public fun** | Cannot call directly | Any module |

**Key Insight:**
- `entry` = "Can be called as transaction entry point"
- `public` = "Can be called by other modules"
- These are independent and can be combined!

---

## 🛠️ 2. References: "Borrowing" vs. "Owning"

Think of it like a physical car:

| Syntax | Meaning | What You Can Do |
|--------|---------|----------------|
| `Car` | Give you the actual car. You own it now. | Full ownership - can destroy, transfer, modify |
| `&Car` | Let you look at the car (Read-only) | Can see the speed, but can't change it |
| `&mut Car` | Give you the keys for a moment (Mutable) | Can paint it or drive it, must return when function ends |

### Key Principle
**Ownership vs. Borrowing:**
- `&` = "look"
- `&mut` = "touch" 
- No symbol = "taking it home"

---

## 💻 Practical Task 2: Build the "Smart Garage"

### Complete Garage Module

```rust
module my_first_package::garage {
    // Modern Sui (2024 edition) - common imports are automatic

    public struct Car has key {
        id: UID,
        speed: u64,
        color: u64, // 1 for Red, 2 for Blue
    }

    // ENTRY: User can call this via transaction to get a car
    public entry fun collect_car(ctx: &mut TxContext) {
        let new_car = Car {
            id: object::new(ctx),
            speed: 0,
            color: 1
        };
        transfer::transfer(new_car, ctx.sender());
    }

    // READ-ONLY: Anyone can look at the speed (&Car)
    public fun check_speed(car: &Car): u64 {
        car.speed
    }

    // MUTABLE: Change the color (&mut Car)
    public entry fun paint_car(car: &mut Car, new_color: u64) {
        car.color = new_color;
    }
}
```

---

## 🧐 Understanding Check Questions

### Question 1: Why &mut Car instead of Car?

**Q:** In `paint_car`, why use `&mut Car` instead of just `Car`?

**A:** Ownership implications:

**Using `Car` (by value):**
- Function "eats" the car (takes ownership)
- Since `Car` doesn't have `drop`, function MUST either:
  - Delete it, OR
  - Transfer it
- Car would be destroyed or moved

**Using `&mut Car` (mutable reference):**
- Like handing someone the keys while you stand there
- They can modify it
- Must give keys back when done
- Original owner keeps the car

**Memory Hook:** Passing `Car` = giving someone your car. Passing `&mut Car` = handing them keys temporarily.

### Question 2: Module-Only Functions

**Q:** If I want function that only my other modules can use, but user's wallet cannot see, which visibility?

**A:** `public(package)`

**Why:**
- Creates "internal security wall" for Sui
- Accessible within package
- Not exposed to external callers
- Perfect for helper functions

### Question 3: Security Risk - Unprotected Entry

**Scenario:**
```rust
public entry fun withdraw_all_funds(vault: &mut Vault)
```

**Q:** Is there a problem? Who can call this?

**A:** CRITICAL SECURITY VULNERABILITY

**The Problem:**
- If `Vault` is a Shared Object, **anyone** with wallet can call this
- No authentication/authorization check
- Anyone can drain all funds

**The Auditor's Fix:**
Pass a "Capability" (like a Keycard) to prove caller is Admin:

```rust
public entry fun withdraw(
    admin_cap: &AdminCap, 
    vault: &mut Vault
)
```

**Rule:** No keycard? No money.

---

## 🛠️ Practical Challenge: The Race Function

### Task Requirements
1. Create `race` function taking two cars (`&Car`, `&Car`)
2. Use `assert!` to check both cars have `speed > 0`
3. If speed is 0, transaction fails with error code 0
4. Return `u64` speed of winner

### Solution

```rust
// Constants for error codes (Best practice!)
const ECarNotReady: u64 = 0;

public fun race(car1: &Car, car2: &Car): u64 {
    // Check if cars are ready (speed > 0)
    assert!(car1.speed > 0, ECarNotReady);
    assert!(car2.speed > 0, ECarNotReady);
    
    // Compare speeds and return winner's speed
    if (car1.speed > car2.speed) {
        car1.speed
    } else {
        car2.speed
    }
}
```

---

## 🔍 Error Handling Deep Dive

### Transaction Atomicity

**Critical Move Logic:**
When `assert!` fails or `abort` happens, **entire transaction is undone** (atomicity). It's like it never happened.

**Example Scenario:**
1. Command A: Paint car Red
2. Command B: Race (fails due to assertion)

**Q:** Is the car still Red?

**A:** NO! Everything rolls back.

**Why This Matters:**
- This is why Move is so secure for finance
- No partial state changes
- Either everything succeeds or nothing happens

### Best Practices for Error Handling

**Always use Constants for error codes:**
```rust
const ENOT_OWNER: u64 = 1;
const EINSUFFICIENT_BALANCE: u64 = 2;
const EINVALID_AMOUNT: u64 = 3;
```

**Why:**
- Makes debugging easier after not looking at code for weeks
- Self-documenting
- Consistent error messages
- Easy to reference in tests

---

## 💡 Design Question: Return Value vs. Return Object

**Q:** Why is it better to return `u64` speed rather than the `Car` itself in a race?

**A:** Ownership and resource management:

**Returning `Car`:**
- Transfers ownership to caller
- Caller must handle the car (transfer, store, or destroy)
- Creates unnecessary complexity
- Original owner loses the car

**Returning `u64`:**
- Just returns data (the speed)
- Original owners keep their cars
- No ownership transfer needed
- Clean, simple interface
- Caller doesn't need to manage resources

**General Principle:** 
- Return references or primitive data when possible
- Only transfer objects when ownership change is intentional
- Keeps resource management explicit and clear

---

## 📝 Key Takeaways - Week 2

### References
**Use them when you don't need to destroy or move the object:**
- Gas efficient
- Safer
- Preserves ownership

### Assertions
**`assert!(condition, error_code)` is your best friend:**
- Acts as "Guard" at the door
- Ensures preconditions are met
- Triggers transaction rollback on failure

### Constants
**Always name your errors:**
```rust
const ENOT_OWNER: u64 = 1;
```
- Makes debugging easier
- Self-documenting code
- Consistent error handling

### Entry Functions
**These are ONLY functions user can trigger directly from transaction:**
- Must be carefully secured
- Need proper access control
- First point of attack surface

### Safety
**Move prevents you from:**
- Holding reference (`&`) while object is being destroyed
- Partial state changes (atomicity)
- Resource leaks

---

## 🎯 Memory Hooks

### The Three Types of Access
1. **Ownership (`Car`):** Taking it home
2. **Read (`&Car`):** Just looking
3. **Modify (`&mut Car`):** Borrowing the keys

### Visibility Levels
- **public:** Open to all modules (be careful!)
- **entry:** User-facing (needs security)
- **public(package):** Internal only (safest for helpers)

### Error Handling
- **assert!** = Guard at the door
- **abort** = Emergency stop
- **Atomicity** = All or nothing

### Security Patterns
**Always ask:**
1. Who can call this function?
2. What objects does it access?
3. Are there proper authorization checks?
4. What happens if it fails?

---

## 🚀 Next Steps

Week 3 will cover:
- Deep dive into Abilities System
- Type Safety and the Type System
- The "Hot Potato" Pattern
- Flash Loan security architecture
- Linear Logic enforcement