# Math-Related Vulnerabilities in Sui Move

Let me teach you about the most critical math vulnerabilities and how to prevent them!

---

## Part 1: Integer Overflow/Underflow

### The Problem

In many languages, integers can overflow:

```javascript
// JavaScript example
let x = 255; // u8 max
x = x + 1;   // Wraps to 0! ❌
```

### Sui Move's Protection

**Move aborts on overflow/underflow automatically!**

```move
public fun overflow_example() {
    let x: u8 = 255;
    let y = x + 1;  // ❌ ABORTS! Transaction fails
    // Move detects overflow and stops execution
}
```

**Result:** Transaction aborted, no state changes ✅

---

### Still Vulnerable: Overflow Before Check

```move
// ❌ VULNERABLE - Overflows before the check
public fun bad_deposit(
    vault: &mut Vault,
    amount: u64
) {
    let new_total = vault.balance + amount;  // ← Might overflow here!
    assert!(new_total <= MAX_BALANCE, E_EXCEEDS_MAX);
    vault.balance = new_total;
}
```

**Attack:**
```
vault.balance = u64::MAX - 100
amount = 200

Calculation: (u64::MAX - 100) + 200
❌ OVERFLOWS → Transaction aborts before check
```

---

### ✅ SAFE - Check Before Operation

```move
public fun safe_deposit(
    vault: &mut Vault,
    amount: u64
) {
    // Check BEFORE adding
    assert!(
        vault.balance <= MAX_BALANCE - amount,  // ← Safe check
        E_EXCEEDS_MAX
    );
    
    vault.balance = vault.balance + amount;  // ✓ Can't overflow
}
```

---

## Part 2: Division by Zero

### The Problem

```move
// ❌ VULNERABLE
public fun calculate_share(
    total: u64,
    shares: u64
) -> u64 {
    total / shares  // ← What if shares = 0?
    // ABORTS if shares is 0
}
```

---

### ✅ SAFE - Check Before Division

```move
const E_ZERO_SHARES: u64 = 0;

public fun safe_calculate_share(
    total: u64,
    shares: u64
) -> u64 {
    assert!(shares > 0, E_ZERO_SHARES);
    total / shares
}
```

---

### Real Example: LP Token Calculation

```move
module defi::pool {
    const E_ZERO_LIQUIDITY: u64 = 0;
    
    // ❌ VULNERABLE
    public fun calculate_bad(
        deposit_amount: u64,
        total_liquidity: u64,
        total_lp_tokens: u64
    ): u64 {
        // If total_liquidity = 0, division by zero!
        (deposit_amount * total_lp_tokens) / total_liquidity
    }
    
    // ✅ SAFE
    public fun calculate_safe(
        deposit_amount: u64,
        total_liquidity: u64,
        total_lp_tokens: u64
    ): u64 {
        assert!(total_liquidity > 0, E_ZERO_LIQUIDITY);
        (deposit_amount * total_lp_tokens) / total_liquidity
    }
}
```

---

## Part 3: Precision Loss / Rounding Errors

### The Problem - Integer Division Truncates

```move
public fun calculate_fee() {
    let amount = 100;
    let fee = amount / 3;  // fee = 33, not 33.333...
    // Lost 0.333... (truncated, not rounded)
}
```

---

### Vulnerability 1: Loss of Funds Due to Rounding

```move
// ❌ VULNERABLE - Users lose value
module swap::bad {
    public fun swap_tokens(
        amount_in: u64,
        price_numerator: u64,    // e.g., 3
        price_denominator: u64   // e.g., 2
    ): u64 {
        // Simple division - loses precision
        (amount_in * price_numerator) / price_denominator
    }
}

// Example:
// User swaps 100 tokens
// Price = 3/2 = 1.5
// Expected: 100 * 1.5 = 150
// Actual: (100 * 3) / 2 = 300 / 2 = 150 ✓ (lucky this time)

// But with amount_in = 101:
// Expected: 101 * 1.5 = 151.5
// Actual: (101 * 3) / 2 = 303 / 2 = 151 (lost 0.5!) ❌
```

---

### ✅ SAFE - Use Precision Multipliers

```move
module swap::good {
    // Use fixed-point arithmetic
    const PRECISION: u64 = 1_000_000_000; // 9 decimals
    
    public fun swap_tokens(
        amount_in: u64,
        price_numerator: u64,
        price_denominator: u64
    ): u64 {
        // Multiply by precision, then divide
        let scaled_amount = amount_in * PRECISION;
        let result = (scaled_amount * price_numerator) / price_denominator;
        result / PRECISION  // Scale back down
    }
}
```

---

### Vulnerability 2: Rounding Direction Benefits Wrong Party

```move
// ❌ VULNERABLE - Rounding favors user, drains pool
module pool::bad {
    public fun calculate_withdrawal(
        lp_tokens: u64,
        total_lp: u64,
        pool_balance: u64
    ): u64 {
        // User gets MORE than they should due to rounding
        (lp_tokens * pool_balance) / total_lp
    }
}

// Attack:
// total_lp = 1000
// pool_balance = 1000
// User deposits 1, gets 1 LP token
// User withdraws: (1 * 1000) / 1000 = 1 ✓
// But if done many times with rounding up, user profits
```

---

### ✅ SAFE - Round in Favor of Pool

```move
module pool::good {
    /// Calculate withdrawal (rounds DOWN to protect pool)
    public fun calculate_withdrawal(
        lp_tokens: u64,
        total_lp: u64,
        pool_balance: u64
    ): u64 {
        assert!(total_lp > 0, E_ZERO_LIQUIDITY);
        
        // Multiply first, divide last (minimizes rounding)
        let amount = (lp_tokens * pool_balance) / total_lp;
        
        // Could add additional safety: round down by 1 wei if needed
        amount
    }
    
    /// Calculate deposit (rounds UP to protect pool)
    public fun calculate_lp_tokens(
        deposit_amount: u64,
        pool_balance: u64,
        total_lp: u64
    ): u64 {
        if (total_lp == 0) {
            // First deposit - simple 1:1
            return deposit_amount
        };
        
        assert!(pool_balance > 0, E_ZERO_BALANCE);
        
        // Round DOWN LP tokens given (user gets slightly less)
        (deposit_amount * total_lp) / pool_balance
    }
}
```

**Rule of thumb:**
- Withdrawals: Round DOWN (user gets less, pool protected)
- Deposits: Round DOWN LP tokens (user gets less, pool protected)
- Fees: Round UP (user pays slightly more, protocol protected)

---

## Part 4: Order of Operations

### Vulnerability: Multiply After Divide

```move
// ❌ VULNERABLE - Loses precision
public fun calculate_bad(
    amount: u64,
    rate_numerator: u64,
    rate_denominator: u64,
    fee_percentage: u64  // e.g., 3 for 3%
): u64 {
    let after_rate = amount / rate_denominator * rate_numerator;
    //               ^^^^^^^^^^^^^^^^^^^^^^^ DIVIDE FIRST = BAD
    let fee = after_rate * fee_percentage / 100;
    after_rate - fee
}
```

---

### ✅ SAFE - Multiply Before Divide

```move
// ✅ SAFE - Preserves precision
public fun calculate_good(
    amount: u64,
    rate_numerator: u64,
    rate_denominator: u64,
    fee_percentage: u64
): u64 {
    let after_rate = (amount * rate_numerator) / rate_denominator;
    //               ^^^^^^^^^^^^^^^^^^^^^^^^^ MULTIPLY FIRST = GOOD
    let fee = (after_rate * fee_percentage) / 100;
    after_rate - fee
}
```

**Golden Rule:** Always multiply before dividing!

---

## Part 5: Token Decimal Mismatches

### The Problem

```move
module swap::vulnerable {
    use sui::coin::{Self, Coin};
    
    public struct TokenA has drop {} // 9 decimals
    public struct TokenB has drop {} // 6 decimals
    
    // ❌ VULNERABLE - Doesn't account for decimals
    public fun swap_bad(
        coin_a: Coin<TokenA>,  // e.g., 1000 (= 0.000001 tokens)
        ctx: &mut TxContext
    ): Coin<TokenB> {
        let amount_a = coin::value(&coin_a);
        
        // 1:1 swap - WRONG!
        // 1000 units of TokenA (9 decimals) = 0.000001 tokens
        // 1000 units of TokenB (6 decimals) = 0.001 tokens
        // User gets 1000x more value!
        mint_token_b(amount_a, ctx)
    }
}
```

---

### ✅ SAFE - Account for Decimals

```move
module swap::safe {
    const TOKEN_A_DECIMALS: u64 = 9;
    const TOKEN_B_DECIMALS: u64 = 6;
    const PRECISION: u64 = 1_000_000_000;
    
    public fun swap_safe(
        coin_a: Coin<TokenA>,
        exchange_rate: u64,  // e.g., 1.5 * PRECISION
        ctx: &mut TxContext
    ): Coin<TokenB> {
        let amount_a = coin::value(&coin_a);
        
        // Normalize to same decimals
        let normalized_a = if (TOKEN_A_DECIMALS > TOKEN_B_DECIMALS) {
            amount_a / power(10, TOKEN_A_DECIMALS - TOKEN_B_DECIMALS)
        } else {
            amount_a * power(10, TOKEN_B_DECIMALS - TOKEN_A_DECIMALS)
        };
        
        // Apply exchange rate
        let amount_b = (normalized_a * exchange_rate) / PRECISION;
        
        mint_token_b(amount_b, ctx)
    }
}
```

---

## Part 6: Front-Running via Price Calculation

### Vulnerability: Stale or Manipulable Prices

```move
// ❌ VULNERABLE to sandwich attacks
module dex::vulnerable {
    public struct Pool has key {
        id: UID,
        token_a: Balance<TokenA>,
        token_b: Balance<TokenB>
    }
    
    public fun swap(
        pool: &mut Pool,
        coin_a: Coin<TokenA>,
        ctx: &mut TxContext
    ): Coin<TokenB> {
        let amount_in = coin::value(&coin_a);
        
        // Current ratio - can be manipulated!
        let reserve_a = pool.token_a.value();
        let reserve_b = pool.token_b.value();
        
        // Simple calculation - no slippage protection
        let amount_out = (amount_in * reserve_b) / reserve_a;
        
        coin::put(&mut pool.token_a, coin_a);
        coin::take(&mut pool.token_b, amount_out, ctx)
    }
}
```

**Attack:**
1. Attacker sees user's swap in mempool
2. Attacker front-runs with large swap (moves price)
3. User's swap executes at worse price
4. Attacker back-runs (reverse swap, profits)

---

### ✅ SAFE - Slippage Protection

```move
module dex::safe {
    const E_SLIPPAGE_EXCEEDED: u64 = 0;
    
    public fun swap_with_slippage(
        pool: &mut Pool,
        coin_a: Coin<TokenA>,
        min_amount_out: u64,  // ← User specifies minimum
        ctx: &mut TxContext
    ): Coin<TokenB> {
        let amount_in = coin::value(&coin_a);
        
        let reserve_a = pool.token_a.value();
        let reserve_b = pool.token_b.value();
        
        // Calculate output with constant product formula
        let amount_out = calculate_output(amount_in, reserve_a, reserve_b);
        
        // Slippage check
        assert!(amount_out >= min_amount_out, E_SLIPPAGE_EXCEEDED);
        
        coin::put(&mut pool.token_a, coin_a);
        coin::take(&mut pool.token_b, amount_out, ctx)
    }
    
    fun calculate_output(
        amount_in: u64,
        reserve_in: u64,
        reserve_out: u64
    ): u64 {
        // Constant product: x * y = k
        // With 0.3% fee
        let amount_in_with_fee = amount_in * 997; // 99.7%
        let numerator = amount_in_with_fee * reserve_out;
        let denominator = (reserve_in * 1000) + amount_in_with_fee;
        numerator / denominator
    }
}
```

---

## Part 7: Reentrancy-Like Issues with Math

### The Problem: State Changes Before Calculation

```move
// ❌ VULNERABLE - Updates state before calculating
module vault::bad {
    public fun withdraw(
        vault: &mut Vault,
        amount: u64,
        ctx: &mut TxContext
    ): Coin<SUI> {
        // Update balance FIRST
        vault.total_balance = vault.total_balance - amount;
        
        // Then calculate fee based on NEW balance
        let fee = calculate_fee(vault.total_balance); // ← WRONG!
        
        // Fee calculation is based on post-withdrawal balance
        coin::take(&mut vault.balance, amount - fee, ctx)
    }
}
```

---

### ✅ SAFE - Calculate Before State Change

```move
module vault::good {
    public fun withdraw(
        vault: &mut Vault,
        amount: u64,
        ctx: &mut TxContext
    ): Coin<SUI> {
        // Calculate fee FIRST (on current state)
        let fee = calculate_fee(vault.total_balance); // ✓ Correct
        
        // Then update state
        vault.total_balance = vault.total_balance - amount;
        
        coin::take(&mut vault.balance, amount - fee, ctx)
    }
}
```

---

## Part 8: Percentage Calculations

### Common Mistakes

```move
// ❌ VULNERABLE - Percentage calculation issues

// Issue 1: Overflow in multiplication
public fun calculate_fee_bad(amount: u64, fee_bps: u64): u64 {
    (amount * fee_bps) / 10000  // ← Can overflow if amount is large!
}

// Issue 2: Precision loss
public fun calculate_discount_bad(price: u64): u64 {
    price - (price * 10 / 100)  // ← Divides before multiply!
}

// Issue 3: Rounding benefits user
public fun calculate_yield_bad(
    principal: u64,
    rate_bps: u64
): u64 {
    (principal * rate_bps) / 10000  // ← Rounds down, protocol loses
}
```

---

### ✅ SAFE - Proper Percentage Math

```move
module math::percentage {
    const BPS_BASE: u64 = 10_000; // Basis points (100% = 10000)
    const E_OVERFLOW: u64 = 0;
    
    /// Calculate fee (rounds UP to protect protocol)
    public fun calculate_fee(amount: u64, fee_bps: u64): u64 {
        // Check for overflow before multiplication
        assert!(
            amount <= (18_446_744_073_709_551_615 / fee_bps),
            E_OVERFLOW
        );
        
        let fee = (amount * fee_bps) / BPS_BASE;
        
        // Round up if there's a remainder
        if ((amount * fee_bps) % BPS_BASE > 0) {
            fee + 1
        } else {
            fee
        }
    }
    
    /// Calculate discount (rounds DOWN to protect seller)
    public fun calculate_discounted_price(
        price: u64,
        discount_bps: u64
    ): u64 {
        assert!(discount_bps <= BPS_BASE, E_INVALID_PERCENTAGE);
        
        // Multiply first, divide last
        let discount = (price * discount_bps) / BPS_BASE;
        price - discount  // Rounds down naturally
    }
    
    /// Multiply by percentage (safe from overflow)
    public fun mul_percentage(
        value: u64,
        percentage_bps: u64
    ): u64 {
        assert!(percentage_bps <= BPS_BASE, E_INVALID_PERCENTAGE);
        
        // Check overflow
        assert!(
            value <= 18_446_744_073_709_551_615 / percentage_bps,
            E_OVERFLOW
        );
        
        (value * percentage_bps) / BPS_BASE
    }
}
```

---

## Part 9: Complete Safe Math Library

```move
module utils::safe_math {
    const E_OVERFLOW: u64 = 0;
    const E_UNDERFLOW: u64 = 1;
    const E_DIVIDE_BY_ZERO: u64 = 2;
    
    /// Safe addition (checks overflow)
    public fun add(a: u64, b: u64): u64 {
        assert!(a <= 18_446_744_073_709_551_615 - b, E_OVERFLOW);
        a + b
    }
    
    /// Safe subtraction (checks underflow)
    public fun sub(a: u64, b: u64): u64 {
        assert!(a >= b, E_UNDERFLOW);
        a - b
    }
    
    /// Safe multiplication (checks overflow)
    public fun mul(a: u64, b: u64): u64 {
        if (a == 0 || b == 0) return 0;
        assert!(a <= 18_446_744_073_709_551_615 / b, E_OVERFLOW);
        a * b
    }
    
    /// Safe division (checks zero)
    public fun div(a: u64, b: u64): u64 {
        assert!(b > 0, E_DIVIDE_BY_ZERO);
        a / b
    }
    
    /// Multiply then divide (preserves precision)
    public fun mul_div(a: u64, b: u64, c: u64): u64 {
        assert!(c > 0, E_DIVIDE_BY_ZERO);
        
        // Check multiplication won't overflow
        if (a == 0 || b == 0) return 0;
        assert!(a <= 18_446_744_073_709_551_615 / b, E_OVERFLOW);
        
        (a * b) / c
    }
    
    /// Calculate square root (useful for LP tokens)
    public fun sqrt(x: u64): u64 {
        if (x == 0) return 0;
        
        let mut z = (x + 1) / 2;
        let mut y = x;
        
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        };
        
        y
    }
    
    /// Minimum of two numbers
    public fun min(a: u64, b: u64): u64 {
        if (a < b) a else b
    }
    
    /// Maximum of two numbers
    public fun max(a: u64, b: u64): u64 {
        if (a > b) a else b
    }
}
```

---

## Summary: Key Vulnerabilities & Fixes

| Vulnerability | ❌ Bad Practice | ✅ Good Practice |
|---------------|----------------|------------------|
| **Overflow** | Check after operation | Check before operation |
| **Division by zero** | No check | `assert!(denominator > 0)` |
| **Precision loss** | Divide then multiply | Multiply then divide |
| **Rounding** | Favor user | Favor protocol |
| **Decimals** | Ignore decimals | Normalize decimals |
| **Slippage** | No protection | User sets `min_out` |
| **Percentages** | `amount * pct / 100` | Use basis points, check overflow |

### Golden Rules

```
1. Always multiply before dividing
2. Check denominators before division
3. Check for overflow before operations
4. Round in favor of the protocol
5. Account for token decimals
6. Use slippage protection
7. Calculate on current state, then update
8. Use safe math libraries
```

Move's automatic overflow/underflow protection is great, but **you still need to be careful about the order of operations and rounding!** 🔢