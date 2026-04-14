I'll fetch that page and create study notes for you.# Move Functions - Study Notes

## Function Declaration

**Syntax structure:**
```
<visibility>? <entry>? <macro>? fun <identifier><[type_parameters: constraint],*>([identifier: type],*): <return_type> <function_body>
```

**Example:**
```move
fun foo<T1, T2>(x: u64, y: T1, z: T2): (T2, T1, u64) { (z, y, x) }
```

---

## Visibility Modifiers

### Default (Internal/Private)
- Functions without visibility modifiers can **only** be called within the same module
- Cannot be accessed from other modules or as entry points

### `public`
- Accessible from any module
- Can be called as entry points for execution
- Most permissive visibility level

**Example:**
```move
module a::m {
    public fun foo(): u64 { 0 }
}
module b::other {
    fun calls_m_foo(): u64 {
        a::m::foo() // ✓ Valid
    }
}
```

### `public(package)`
- More restricted than `public`
- Callable only from modules in the **same package (same address)**
- Cannot be called from modules in different packages

**Example:**
```move
module a::m {
    public(package) fun foo(): u64 { 0 }
}
module a::n {
    fun calls_m_foo(): u64 {
        a::m::foo() // ✓ Valid (same package `a`)
    }
}
module b::other {
    fun calls_m_foo(): u64 {
        a::m::foo() // ✗ ERROR - different package
    }
}
```

### `public(friend)` - DEPRECATED
- Legacy visibility modifier (replaced by `public(package)`)
- Required explicit enumeration of allowed modules

---

## Entry Modifier

**Purpose:** Define entry points for execution without exposing to other modules

**Key characteristics:**
- Can still be called by other Move functions within the same module
- Cannot be called from other modules
- Define "main" functions of a module
- May have deployment-specific restrictions on parameters/return types

**Example:**
```move
module a::m {
    entry fun foo(): u64 { 0 }
    fun calls_foo(): u64 { foo() } // ✓ Valid
}
module a::n {
    fun calls_m_foo(): u64 {
        a::m::foo() // ✗ ERROR - entry is internal
    }
}
```

**Testing exception:** Entry functions CAN be called from `#[test]` and `#[test_only]` contexts

---

## Macro Modifier

**Key concept:** Macro functions don't exist at runtime - they're **inline substituted** during compilation

**Special capability:** Can accept lambda-style functions as arguments

**Example:**
```move
macro fun n_times($n: u64, $body: |u64| -> ()) {
    let n = $n;
    let mut i = 0;
    while (i < n) {
        $body(i);
        i = i + 1;
    }
}

fun example() {
    let mut sum = 0;
    n_times!(10, |x| sum = sum + x);
}
```

---

## Function Components

### Naming Rules
- Start with lowercase letters (a-z)
- After first character: underscores, letters (a-z, A-Z), digits (0-9)

**Valid examples:**
```move
fun fOO() {}
fun bar_42() {}
fun bAZ_19() {}
```

### Type Parameters
```move
fun id<T>(x: T): T { x }
fun example<T1: copy, T2>(x: T1, y: T2): (T1, T1, T2) { (copy x, x, y) }
```

### Parameters
- Declared as: `name: type`
- Functions can have zero parameters
- Common pattern for constructors

```move
fun add(x: u64, y: u64): u64 { x + y }
fun useless() { }  // No parameters
```

### Return Types
- Specified after parameters with `: type`
- Can return multiple values using tuples
- **Unit type `()`** is implicit if no return type specified

```move
fun zero(): u64 { 0 }
fun one_two_three(): (u64, u64, u64) { (0, 1, 2) }
fun just_unit() { }  // Returns ()
```

**Important:** Unit values don't exist at runtime - functions returning `()` return no actual value during execution

---

## Native Functions

**Definition:** Functions without body implementation - provided by the VM

**Characteristics:**
- Marked with `native` keyword
- Cannot be added by programmers (requires VM source code modification)
- Used for standard library or environment-specific functionality

**Example from standard library:**
```move
module std::vector {
    native public fun length<Element>(v: &vector<Element>): u64;
}
```

---

## Calling Functions

### Name resolution (all equivalent):
```move
a::example::zero();  // Fully qualified
example::zero();     // Module alias
zero();              // Direct import
```

### Arguments
- Must provide argument for every parameter
- Type arguments can be specified or inferred

```move
a::example::id(0);        // Type inferred
a::example::id<u64>(0);   // Type explicit
```

---

## Returning Values

### Implicit returns
The last expression in function body is the return value

```move
fun add(x: u64, y: u64): u64 {
    x + y  // Implicit return
}

fun double_and_add(x: u64, y: u64): u64 {
    let double_x = x * 2;
    let double_y = y * 2;
    double_x + double_y  // Last expression = return value
}
```

### Explicit `return` expression
- Early exit from functions
- Especially useful in control flow

```move
fun safe_sub(x: u64, y: u64): u64 {
    if (y > x) return 0;  // Early return
    x - y
}

fun index_of<T>(v: &vector<T>, target: &T): Option<u64> {
    let mut i = 0;
    let n = v.length();
    while (i < n) {
        if (&v[i] == target) return option::some(i);
        i = i + 1
    };
    option::none()
}
```

**Shorthand:** `return` without argument = `return ()`

---

## Quick Reference Summary

| Modifier | Accessibility |
|----------|--------------|
| (none) | Same module only |
| `public` | Any module |
| `public(package)` | Same package only |
| `entry` | Entry point, same module calls |
| `macro` | Compile-time inline substitution |
| `native` | VM-provided implementation |




Great questions! Let me clarify both:

## Native Functions

**You do NOT define native functions in your Move package.** They are provided by the Move VM/runtime environment.

**Key points:**

1. **VM-Provided:** Native functions are implemented in the VM's source code (typically in Rust), not in Move
2. **Pre-existing:** They're part of standard libraries or the specific Move environment you're using
3. **Just Call Them:** You only need to import and call them

**Example - Using native functions:**
```move
module my_module {
    use std::vector;  // Import the module with native functions
    
    fun example() {
        let mut v = vector[];
        vector::push_back(&mut v, 10);  // Calling native function
        let len = vector::length(&v);   // Calling another native function
    }
}
```

**How they're defined (in standard library):**
```move
module std::vector {
    // You see this declaration but the body is in VM code
    native public fun length<Element>(v: &vector<Element>): u64;
    native public fun push_back<Element>(v: &mut vector<Element>, e: Element);
}
```

**You cannot:**
- Create your own native functions (unless you modify the VM)
- See the implementation (it's in Rust/VM code, not Move)

---

## `public entry` vs `entry` (without public)

This is an important distinction for function visibility!

### `entry` (without public)

```move
module a::m {
    entry fun foo(): u64 { 0 }
}
```

**Accessibility:**
- ✅ Can be called as an **entry point for execution** (from outside Move, e.g., transactions)
- ✅ Can be called from **within the same module**
- ✅ Can be called from **test functions**
- ❌ **CANNOT** be called from **other modules**

**Use case:** Entry points that should only be used to initiate execution, not as library functions

---

### `public entry` 

```move
module a::m {
    public entry fun foo(): u64 { 0 }
}
```

**Accessibility:**
- ✅ Can be called as an **entry point for execution**
- ✅ Can be called from **within the same module**
- ✅ Can be called from **other modules** (because it's `public`)
- ✅ Can be called from **test functions**

**Use case:** Functions that serve both as entry points AND as library functions that other modules can call

---

### Comparison Table

| Feature | `entry` | `public entry` |
|---------|---------|----------------|
| **Entry point execution** | ✅ Yes | ✅ Yes |
| **Same module calls** | ✅ Yes | ✅ Yes |
| **Other module calls** | ❌ No | ✅ Yes |
| **Test function calls** | ✅ Yes | ✅ Yes |

---

### Practical Example

```move
module game::chess {
    // Entry only - can start a game via transaction, but other modules can't call it
    entry fun start_game(player1: address, player2: address) {
        // Initialize game...
    }
    
    // Public entry - can start via transaction AND other modules can call it
    public entry fun make_move(game_id: u64, move: vector<u8>) {
        // Make move...
    }
    
    // Public (not entry) - other modules can call, but NOT an entry point
    public fun get_game_state(game_id: u64): GameState {
        // Return state...
    }
    
    // Private - only callable within this module
    fun validate_move(move: vector<u8>): bool {
        // Validation logic...
    }
}

module game::tournament {
    use game::chess;
    
    fun create_tournament() {
        // ✅ Can call public entry
        chess::make_move(1, b"e2e4");
        
        // ✅ Can call public
        let state = chess::get_game_state(1);
        
        // ❌ CANNOT call entry (not public)
        // chess::start_game(@0x1, @0x2);  // ERROR!
        
        // ❌ CANNOT call private
        // chess::validate_move(b"e2e4");  // ERROR!
    }
}
```

---

### When to Use Each

**Use `entry`:**
- Functions meant ONLY as transaction entry points
- You want to prevent other modules from calling it programmatically
- Example: initialization functions, user-facing actions

**Use `public entry`:**
- Functions that serve both as entry points AND library functions
- You want flexibility for both direct execution and module composition
- Example: common actions that might be part of larger workflows

**Sui-specific note:** Entry functions on Sui have additional restrictions on parameter and return types (must be primitive types, objects by reference, etc.)