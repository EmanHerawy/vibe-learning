# Move Control Flow - Study Notes

## Part 1: Conditional Expressions

### Basic `if` Expression

**Purpose:** Execute code only when a condition is true

**Syntax:**
```move
if (condition) expression
if (condition) expression else expression
```

**Key rules:**
- Condition **must** be type `bool`
- Can return values (if expression has a result)
- Both branches must have **compatible types**

---

### Simple Conditionals

**Example 1: Statement form**
```move
if (x > 5) x = x - 5
```

**Example 2: With else clause**
```move
if (y <= 10) y = y + 1 else y = 10
```

**Example 3: Expression form (returns value)**
```move
let z = if (x < 100) x else 100;
```

---

### Default `else` Behavior

If `else` is omitted, the false branch defaults to unit `()`:

```move
if (condition) true_branch  // Equivalent to:
if (condition) true_branch else ()
```

**Important:** This means the true branch must also evaluate to `()`:

```move
// ✓ Valid - both branches are ()
if (condition) do_something();

// ✗ ERROR - true branch is u64, false branch (default) is ()
let y = if (maximum >= 10) maximum;
```

---

### Type Compatibility Rules

**Rule 1:** Both branches must have the same type

```move
// ✓ Valid - both branches are u64
let maximum: u64 = if (x > y) x else y;

// ✗ ERROR - different types (u8 vs u64)
let z = if (maximum < 10) 10u8 else 100u64;

// ✗ ERROR - true branch is u64, implicit false branch is ()
let y = if (maximum >= 10) maximum;
```

---

### Using Expression Blocks

Conditionals are often used with expression blocks `{...}`:

```move
let maximum = if (x > y) x else y;

if (maximum < 10) {
    x = x + 10;
    y = y + 10;
} else if (x >= 10 && y >= 10) {
    x = x - 10;
    y = y - 10;
}
```

---

### Else-If Chains

```move
if (x < 10) {
    x = x + 1
} else if (x < 20) {
    x = x + 2
} else if (x < 30) {
    x = x + 3
} else {
    x = 0
}
```

---

### Grammar

```
if-expression → if ( expression ) expression else-clause?
else-clause → else expression
```

---

## Part 2: Loops

### Overview

Move provides two loop constructs:
1. **`while`** - Condition-based loops
2. **`loop`** - Infinite loops with explicit breaks

Both support:
- **`break`** - Exit the loop
- **`continue`** - Skip to next iteration

---

## `while` Loops

### Basic Syntax

```move
while (condition) {
    // loop body (must be type unit)
}
```

**Characteristics:**
- Condition must be type `bool`
- Body executes while condition is `true`
- Body must be type `()` (unit)
- Always returns `()`

---

### Example: Sum Numbers

```move
fun sum(n: u64): u64 {
    let mut sum = 0;
    let mut i = 1;
    while (i <= n) {
        sum = sum + i;
        i = i + 1
    };
    
    sum  // Return statement after loop
}
```

---

### Infinite While Loop

```move
fun foo() {
    while (true) { }  // Runs forever
}
```

---

### Using `break` in While Loops

**Purpose:** Exit the loop early

```move
fun find_position(values: &vector<u64>, target_value: u64): Option<u64> {
    let size = values.length();
    let mut i = 0;
    let mut found = false;
    
    while (i < size) {
        if (values[i] == target_value) {
            found = true;
            break  // Exit loop immediately
        };
        i = i + 1
    };
    
    if (found) {
        option::some(i)
    } else {
        option::none<u64>()
    }
}
```

**Important:** `break` in `while` loops **cannot return a value** - while loops always return `()`

---

### Using `continue` in While Loops

**Purpose:** Skip the rest of the current iteration

```move
fun sum_even(values: &vector<u64>): u64 {
    let size = values.length();
    let mut i = 0;
    let mut even_sum = 0;
    
    while (i < size) {
        let number = values[i];
        i = i + 1;
        if (number % 2 == 1) continue;  // Skip odd numbers
        even_sum = even_sum + number;
    };
    even_sum
}
```

---

## `loop` Expressions

### Basic Syntax

```move
loop {
    // loop body
}
```

**Characteristics:**
- Runs indefinitely until `break`
- Can return values via `break`
- Without `break`, runs forever

---

### Example: Sum Numbers with Loop

```move
fun sum(n: u64): u64 {
    let mut sum = 0;
    let mut i = 1;
    
    loop {
        i = i + 1;
        if (i >= n) break;  // Exit when done
        sum = sum + i;
    };
    
    sum
}
```

---

### Infinite Loop (No Break)

```move
fun foo() {
    let mut i = 0;
    loop { i = i + 1 }  // Runs forever!
}
```

---

### Using `break` with Values

**Key difference from `while`:** `loop` can return values via `break`!

```move
fun find_position(values: &vector<u64>, target_value: u64): Option<u64> {
    let size = values.length();
    let mut i = 0;
    
    loop {
        if (values[i] == target_value) {
            break option::some(i)  // Return immediately with value
        } else if (i >= size) {
            break option::none()   // Return None
        };
        i = i + 1;
    }
}
```

**The loop's type is determined by the `break` value!**

---

### Using `continue` in Loop

```move
fun sum_even(values: &vector<u64>): u64 {
    let size = values.length();
    let mut i = 0;
    let mut even_sum = 0;
    
    loop {
        if (i >= size) break;
        let number = values[i];
        i = i + 1;
        if (number % 2 == 1) continue;  // Skip odd numbers
        even_sum = even_sum + number;
    };
    even_sum
}
```

---

## Type Rules for Loops

### While Loop Type

**Always type `()`:**

```move
let () = while (i < 10) { i = i + 1 };
```

---

### Loop Expression Type

**Case 1: Loop with `break` (no value)**
```move
(loop { if (i < 10) i = i + 1 else break }: ());
let () = loop { if (i < 10) i = i + 1 else break };
```

**Case 2: Loop with `break` returning value**
```move
let x: u64 = loop { if (i < 10) i = i + 1 else break 5 };
let x: u64 = loop { if (i < 10) { i = i + 1; continue } else break 5 };
```

**Case 3: Multiple breaks must have same type**
```move
// ✗ ERROR - first break returns (), second returns 5
let x: u64 = loop { if (i < 10) break else break 5 };

// ✓ Valid - both breaks return u64
let x: u64 = loop { if (i < 10) break 0 else break 5 };
```

**Case 4: Loop without break can have any type**
```move
(loop (): u64);
(loop (): address);
(loop (): &vector<vector<u8>>);
```

This is similar to `return`, `abort` - they can have any type because they diverge (never actually produce a value).

---

## Part 3: Labeled Control Flow

### Overview

Labels provide precise control over nested loops and blocks:
- **Loop labels:** Used with `break` and `continue`
- **Block labels:** Used with `return`

**Syntax:** `'label_name:`

---

## Labeled Loops

### Basic Example: Breaking Outer Loop

```move
fun sum_until_threshold(input: &vector<vector<u64>>, threshold: u64): u64 {
    let mut sum = 0;
    let mut i = 0;
    let input_size = input.length();
    
    'outer: loop {
        // Breaks to outer (closest enclosing loop)
        if (i >= input_size) break sum;
        
        let vec = &input[i];
        let size = vec.length();
        let mut j = 0;
        
        while (j < size) {
            let v_entry = vec[j];
            if (sum + v_entry < threshold) {
                sum = sum + v_entry;
            } else {
                // Break the OUTER loop with value
                break 'outer sum
            };
            j = j + 1;
        };
        i = i + 1;
    }
}
```

**Key point:** `break 'outer sum` exits the outer loop from within the inner while loop.

---

### Complex Nested Loop Control

```move
let x = 'outer: loop {
    // ... outer loop logic
    'inner: while (cond) {
        // ... inner loop logic
        
        if (cond0) { break 'outer value };  // Exit outer loop
        
        if (cond1) { continue 'inner }      // Continue inner loop
        else if (cond2) { continue 'outer } // Continue outer loop
        
        // ... more logic
    }
    // ... more outer loop logic
};
```

**Use cases:**
- Breaking out of nested loops
- Continuing specific loops in nested structures
- Precise control flow in complex iteration

---

### Macro Alternative

The docs suggest using macros for cleaner code:

```move
// With labeled loops:
fun sum_until_threshold(input: &vector<vector<u64>>, threshold: u64): u64 {
    'outer: {
        (*input).fold!(0, |sum, inner_vec| {
            inner_vec.fold!(sum, |sum, num| 
                if (sum + num < threshold) sum + num 
                else return 'outer sum
            )
        })
    }
}
```

---

## Labeled Blocks

### Purpose

Return values from arbitrary blocks, especially useful with macros.

---

### Basic Example

```move
fun named_return(n: u64): vector<u8> {
    let x = 'a: {
        if (n % 2 == 0) {
            return 'a b"even"  // Early return from block
        };
        b"odd"  // Default value
    };
    x
}
```

**Flow:**
1. If `n` is even: block returns `b"even"` immediately
2. If `n` is odd: block continues to `b"odd"`
3. Either way, `x` gets the result

---

### Labeled Blocks with Macros

**Define a macro:**
```move
macro fun for_ref<$T>($vs: &vector<$T>, $f: |&$T|) {
    let vs = $vs;
    let mut i = 0;
    let end = vs.length();
    while (i < end) {
        $f(vs.borrow(i));
        i = i + 1;
    }
}
```

**Use with labeled block:**
```move
fun find_first_even(vs: vector<u64>): Option<u64> {
    'result: {
        for_ref!(&vs, |n| if (*n % 2 == 0) { 
            return 'result option::some(*n)  // Exit block early
        });
        option::none()  // Default if no even number found
    }
}
```

**How it works:**
- Lambda expression can `return` from the labeled block
- Allows early exit from macro-based iteration
- Makes control flow macros very powerful

---

## Restrictions

### Loop Labels

**Can use:** `break`, `continue`
**Cannot use:** `return`

```move
fun bad_loop() {
    'name: loop {
        return 'name 5  // ✗ ERROR: Cannot use 'return' with loop label
    }
}
```

---

### Block Labels

**Can use:** `return`
**Cannot use:** `break`, `continue`

```move
fun bad_block() {
    'name: {
        continue 'name;  // ✗ ERROR: Cannot use 'continue' with block label
        break 'name;     // ✗ ERROR: Cannot use 'break' with block label
    }
}
```

---

## Summary Tables

### Loop Comparison

| Feature | `while` | `loop` |
|---------|---------|--------|
| **Condition** | Required | None |
| **Returns value** | No (always `()`) | Yes (via `break`) |
| **Infinite by default** | No | Yes |
| **Use case** | Condition-based iteration | Custom exit conditions |

---

### Control Flow Keywords

| Keyword | Use with | Purpose | Returns value? |
|---------|----------|---------|----------------|
| `break` | Loops | Exit loop | `while`: No, `loop`: Yes |
| `continue` | Loops | Skip to next iteration | No |
| `return` | Blocks | Exit labeled block | Yes |

---

### Label Types

| Label Type | Keywords Allowed | Purpose |
|------------|------------------|---------|
| Loop label (`'name: loop`) | `break`, `continue` | Control nested loops |
| Block label (`'name: {}`) | `return` | Return from blocks |

---

## Practical Examples

### Example 1: Find First Match in 2D Vector
```move
fun find_in_matrix(matrix: &vector<vector<u64>>, target: u64): Option<(u64, u64)> {
    let mut i = 0;
    
    'outer: while (i < matrix.length()) {
        let row = &matrix[i];
        let mut j = 0;
        
        while (j < row.length()) {
            if (row[j] == target) {
                break 'outer option::some((i, j))
            };
            j = j + 1;
        };
        i = i + 1;
    };
    
    option::none()
}
```

### Example 2: Conditional Early Return
```move
fun process_data(data: &vector<u8>): u64 {
    'processing: {
        let mut sum = 0;
        let mut i = 0;
        
        while (i < data.length()) {
            let val = data[i];
            if (val > 100) return 'processing sum;  // Early exit
            sum = sum + (val as u64);
            i = i + 1;
        };
        
        sum
    }
}
```

---

## Key Takeaways

1. **Conditionals:** Both branches must have compatible types; omitted `else` defaults to `()`
2. **While loops:** Always return `()`; good for simple condition-based iteration
3. **Loop expressions:** Can return values via `break`; better for custom exit logic
4. **Labels:** Provide precise control in nested structures and work across macro boundaries
5. **Loop labels:** Use `break`/`continue`
6. **Block labels:** Use `return`
7. **Modern Move:** Consider using macros instead of loops for cleaner, more functional code