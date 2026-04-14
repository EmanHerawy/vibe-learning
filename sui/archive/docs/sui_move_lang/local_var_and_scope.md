# Move Local Variables and Scope - Study Notes

## Core Concepts

**Lexical scoping:** Variables are statically scoped
**Shadowing:** New variables with `let` can shadow previous locals with the same name
**Mutability:** Locals marked as `mut` are mutable and can be updated directly or via mutable reference

---

## Declaring Local Variables

### `let` Bindings

**Basic syntax:**
```move
let x = 1;
let y = x + x;
```

**Uninitialized declaration:**
```move
let x;  // Can be assigned later
if (cond) {
    x = 1
} else {
    x = 0
}
```

**Use case:** Extracting values from loops when default values can't be provided
```move
let x;
let mut i = 0;
loop {
    let (res, cond) = foo(i);
    if (!cond) {
        x = res;
        break
    };
    i = i + 1;
}
```

**Mutable variables:**
```move
let mut x = 0;
if (cond) x = x + 1;
foo(&mut x);
```

---

### Variables Must Be Assigned Before Use

Move's type system prevents usage before assignment:

```move
let x;
x + x  // ✗ ERROR! x used before assignment

let x;
if (cond) x = 0;
x + x  // ✗ ERROR! x doesn't have value in all cases

let x;
while (cond) x = 0;
x + x  // ✗ ERROR! x doesn't have value in all cases
```

---

### Valid Variable Names

**Rules:**
- Can contain: underscores `_`, letters `a-z`, `A-Z`, digits `0-9`
- **Must start with:** underscore `_` or lowercase letter `a-z`
- **Cannot start with:** uppercase letters

**Valid examples:**
```move
let x = e;
let _x = e;
let _A = e;
let x0 = e;
let xA = e;
let foobar_123 = e;
```

**Invalid examples:**
```move
let X = e;    // ✗ ERROR!
let Foo = e;  // ✗ ERROR!
```

---

### Type Annotations

**Syntax:**
```move
let x: T = e;  // "Variable x of type T is initialized to expression e"
```

**Examples:**
```move
let u: u8 = 0;
let b: vector<u8> = b"hello";
let a: address = @0x0;
let (x, y): (&u64, &mut u64) = (&0, &mut 1);
let S { f, g: f2 }: S = S { f: 0, g: 1 };
```

**Important:** Type annotations must be to the **right** of the pattern:
```move
// ✗ ERROR!
let (x: &u64, y: &mut u64) = (&0, &mut 1);

// ✓ CORRECT
let (x, y): (&u64, &mut u64) = (&0, &mut 1);
```

---

### When Annotations Are Necessary

**1. Generic type arguments can't be inferred:**
```move
let _v1 = vector[];  // ✗ ERROR! Could not infer type
let v2: vector<u64> = vector[];  // ✓ Correct
```

**2. Divergent code (unreachable code):**
```move
let a: u8 = return ();
let b: bool = abort 0;
let c: signer = loop ();

let x = return ();  // ✗ ERROR! Type can't be inferred
let y = abort 0;    // ✗ ERROR! Type can't be inferred
let z = loop ();    // ✗ ERROR! Type can't be inferred
```

---

### Multiple Declarations with Tuples

**Basic usage:**
```move
let () = ();
let (x0, x1) = (0, 1);
let (y0, y1, y2) = (0, 1, 2);
let (z0, z1, z2, z3) = (0, 1, 2, 3);
```

**Constraints:**
- Tuple arity must match exactly
- Cannot declare multiple locals with same name
- Mutability can be mixed

```move
let (x, y) = (0, 1, 2);  // ✗ ERROR! Arity mismatch
let (x, x) = 0;  // ✗ ERROR! Duplicate name

let (mut x, y) = (0, 1);  // ✓ Mixed mutability
x = 1;
```

---

### Multiple Declarations with Structs

**Named fields:**
```move
public struct T { f1: u64, f2: u64 }

let T { f1: local1, f2: local2 } = T { f1: 1, f2: 2 };
// local1: u64
// local2: u64
```

**Positional structs:**
```move
public struct P(u64, u64)

let P(local1, local2) = P(1, 2);
// local1: u64
// local2: u64
```

**Field punning (shorthand):**
```move
let Y { x1, x2 } = e;
// Equivalent to:
let Y { x1: x1, x2: x2 } = e;
```

**Mutability with punning:**
```move
let Y { mut x1, x2 } = e;
// Equivalent to:
let Y { x1: mut x1, x2 } = e;
```

---

### Destructuring Against References

**Immutable references:**
```move
let t = T { f1: 1, f2: 2 };
let T { f1: local1, f2: local2 } = &t;
// local1: &u64
// local2: &u64
// Note: struct value `t` still exists
```

**Mutable references:**
```move
let mut t = T { f1: 1, f2: 2 };
let T { f1: local1, f2: local2 } = &mut t;
// local1: &mut u64
// local2: &mut u64
```

**Nested structs:**
```move
let mut y = Y { x1: new_x(), x2: new_x() };

let Y { x1: X(f), x2 } = &y;
assert!(*f + x2.0 == 2, 42);

let Y { x1: X(f1), x2: X(f2) } = &mut y;
*f1 = *f1 + 1;
*f2 = *f2 + 1;
```

---

### Ignoring Values

Variables starting with `_` are ignored and don't introduce new bindings:

```move
let (x1, _, z1) = three();
let (x2, _y, z2) = three();  // _y is ignored
```

**Why it's necessary:** Compiler warns about unused variables
```move
let (x1, y, z1) = three();  // ⚠ WARNING! Unused local 'y'
```

---

### General `let` Grammar

**BNF notation:**
```
let-binding → let pattern-or-list type-annotation? initializer?
pattern-or-list → pattern | ( pattern-list )
pattern-list → pattern ,? | pattern , pattern-list
type-annotation → : type
initializer → = expression

pattern → local-variable | struct-type { field-binding-list }
field-binding-list → field-binding ,? | field-binding , field-binding-list
field-binding → field | field : pattern
```

---

## Mutations

### Assignments

**Basic syntax:**
```move
x = e
```

**Key differences from `let`:**
- Assignments are **expressions** (not statements)
- Type is always `()` (unit)
- Can be used without braces

```move
let x;
if (cond) x = 1 else x = 2;  // Valid because assignment is an expression
```

**Pattern-based assignment:**
```move
let (mut x, mut y, mut f, mut g) = (0, 0, 0, 0);

(X { f }, X { f: x }) = (new_x(), new_x());
(x, y, f, _, g) = (0, 0, 0, 0, 0);
```

**Type constraint:** A local can only have one type
```move
let mut x;
x = 0;
x = false;  // ✗ ERROR! Type mismatch
```

---

### Mutating Through a Reference

**Direct mutation via mutable reference:**
```move
let mut x = 0;
let r = &mut x;
*r = 1;
assert!(x == 1, 42);
```

**Use cases:**

**1. Conditional modification:**
```move
let mut x = 0;
let mut y = 1;
let r = if (cond) &mut x else &mut y;
*r = *r + 1;
```

**2. Function modification:**
```move
let mut x = 0;
modify_ref(&mut x);
```

**3. Struct and vector modification:**
```move
let mut v = vector[];
vector::push_back(&mut v, 100);
assert!(*vector::borrow(&v, 0) == 100, 42);
```

---

## Scopes

### Basic Scope Rules

**Scope definition:** Declared with expression blocks `{...}`

**Rule 1:** Locals can't be used outside their scope
```move
let x = 0;
{
    let y = 1;
};
x + y  // ✗ ERROR! unbound local 'y'
```

**Rule 2:** Outer scope locals can be used in nested scopes
```move
{
    let x = 0;
    {
        let y = x + 1;  // ✓ Valid
    }
}
```

**Rule 3:** Mutations survive across scopes
```move
let mut x = 0;
x = x + 1;
assert!(x == 1, 42);
{
    x = x + 1;
    assert!(x == 2, 42);
};
assert!(x == 2, 42);  // Mutation persists
```

---

### Expression Blocks

**Definition:** Series of statements separated by semicolons

**Value:** Last expression in the block (or `()` if trailing semicolon)

**Examples:**
```move
{ let x = 1; let y = 1; x + y }  // Returns x + y

{ let x; let y = 1; x = 1; x + y }  // Assignments are valid statements

{ let v = vector[]; vector::push_back(&mut v, 1); v }  // Function calls as statements
```

**Any expression can be used as statement:**
```move
{
    let x = 0;
    x + 1;      // Value discarded
    x + 2;      // Value discarded
    b"hello";   // Value discarded
}
```

**Resource constraint:** Values without `drop` ability cannot be discarded
```move
{
    let x = 0;
    Coin { value: x };  // ✗ ERROR! Unused value without `drop` ability
    x
}
```

**Implicit unit values:**
```move
{ x = x + 1; 1 / x; }      // Equivalent to
{ x = x + 1; 1 / x; () }

{ }       // Equivalent to
{ () }
```

**Blocks as expressions:**
```move
let my_vector: vector<vector<u8>> = {
    let mut v = vector[];
    vector::push_back(&mut v, b"hello");
    vector::push_back(&mut v, b"goodbye");
    v
};
```

---

### Shadowing

**Definition:** When `let` introduces a variable name already in scope, the previous variable becomes inaccessible

**Basic shadowing:**
```move
let x = 0;
assert!(x == 0, 42);

let x = 1;  // x is shadowed
assert!(x == 1, 42);
```

**Type can change:**
```move
let x = 0;
assert!(x == 0, 42);

let x = b"hello";  // Type changed
assert!(x == b"hello", 42);
```

**Critical for non-drop types:** Shadowed value still exists but is inaccessible
```move
fun unused_coin(): Coin {
    let x = Coin { value: 0 };  // ✗ ERROR!
    // This local still contains value without `drop` ability
    x.value = 1;
    let x = Coin { value: 10 };  // Shadows previous x
    x
}
```

**Scope-limited shadowing:**
```move
let x = 0;
{
    let x = 1;
    assert!(x == 1, 42);
};
assert!(x == 0, 42);  // Original x restored

// Type can change in inner scope
let x = 0;
{
    let x = b"hello";
    assert!(x == b"hello", 42);
};
assert!(x == 0, 42);
```

---

## Move and Copy

### Core Semantics

**Two ways to use local variables:**
1. **Copy:** Creates new copy, original remains usable
2. **Move:** Takes value out, original becomes unavailable

**Compiler inference:** If not specified, compiler infers `move` or `copy`

---

### Copy Semantics

**Behavior:** Creates new copy of value, local remains usable

```move
let x = 0;
let y = copy x + 1;
let z = copy x + 2;  // x still usable
```

**Rule:** Any value with `copy` ability can be copied
**Default:** Values with `copy` ability are copied implicitly

---

### Move Semantics

**Behavior:** Takes value without copying, local becomes unavailable

```move
let x = 1;
let y = move x + 1;
//      ------ Local moved here
let z = move x + 2;  // ✗ ERROR! Invalid usage of local 'x'
```

**Important:** After move, local is unavailable even if type has `copy` ability

---

### Safety

Type system prevents using values after they're moved (same as preventing use before assignment)

---

### Inference Algorithm

**Simple rules:**
1. Any value with `copy` ability → **copy**
2. Any reference (`&` or `&mut`) → **copy**
   - Exception: Special cases for borrow checker errors when reference no longer used
3. Any other value → **move**

**Examples:**
```move
public struct Foo has copy, drop, store { f: u64 }
public struct Coin has store { value: u64 }

let s = b"hello";
let foo = Foo { f: 0 };
let coin = Coin { value: 0 };
let coins = vector[Coin { value: 0 }, Coin { value: 0 }];

let s2 = s;        // copy (has copy ability)
let foo2 = foo;    // copy (has copy ability)
let coin2 = coin;  // move (no copy ability)
let coins2 = coins; // move (vector of non-copy)

let x = 0;
let b = false;
let addr = @0x42;
let x_ref = &x;
let coin_ref = &mut coin2;

let x2 = x;            // copy (primitive with copy)
let b2 = b;            // copy (primitive with copy)
let addr2 = @0x42;     // copy (address with copy)
let x_ref2 = x_ref;    // copy (reference)
let coin_ref2 = coin_ref; // copy (reference)
```

---

## Quick Reference

| Concept | Key Points |
|---------|-----------|
| **Declaration** | `let x = value;` or `let mut x = value;` |
| **Mutability** | Must declare `mut` to modify after initialization |
| **Assignment** | Expression with type `()`, uses patterns |
| **Type annotation** | `let x: type = value;` - goes right of pattern |
| **Tuple unpacking** | `let (x, y) = (1, 2);` |
| **Struct unpacking** | `let S { f1, f2 } = s;` or `let S { f1: x, f2: y } = s;` |
| **Ignore values** | Use `_` prefix: `let (x, _) = tuple;` |
| **Shadowing** | New `let` with same name hides previous |
| **Scope** | Defined by `{...}` blocks |
| **Copy** | Implicit for `copy` ability types |
| **Move** | Default for non-`copy` types |
| **References** | Always copied (unless special borrow checker case) |