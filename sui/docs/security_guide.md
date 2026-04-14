# Sui Security Audit Guide: Critical Focus Areas for Auditors

## 🎯 Executive Summary for Security Auditors

As a security auditor transitioning to Sui from other blockchain ecosystems, you need to understand that **Sui's object-centric model introduces unique attack vectors** that differ significantly from Ethereum's account-based model. This guide covers critical vulnerabilities, audit methodologies, and best practices specific to Sui Move.

---

## 📋 TABLE OF CONTENTS

1. [Sui-Specific Attack Surface](#sui-specific-attack-surface)
2. [Critical Vulnerabilities by Category](#critical-vulnerabilities-by-category)
3. [Object Model Vulnerabilities](#object-model-vulnerabilities)
4. [Move Language Security Patterns](#move-language-security-patterns)
5. [Authentication & Authorization Issues](#authentication--authorization-issues)
6. [Transaction-Level Vulnerabilities](#transaction-level-vulnerabilities)
7. [PTB (Programmable Transaction Block) Security](#ptb-security)
8. [Capability-Based Security](#capability-based-security)
9. [Common Anti-Patterns](#common-anti-patterns)
10. [Audit Checklist](#comprehensive-audit-checklist)
11. [Testing & Verification](#testing--verification)
12. [Real-World Exploit Patterns](#real-world-exploit-patterns)

---

## 1. Sui-Specific Attack Surface

### Key Differences from Ethereum that Create New Vulnerabilities:

```
ETHEREUM SECURITY MODEL          SUI SECURITY MODEL
├─ Reentrancy attacks           ├─ Shared object contention
├─ Storage collisions           ├─ Object wrapping/unwrapping
├─ Delegate call issues         ├─ Transfer to object attacks
├─ Integer overflow/underflow   ├─ Capability leakage
├─ Front-running (MEV)          ├─ Equivocation (parallel tx)
└─ Access control bugs          └─ Type confusion attacks
```

### Unique to Sui:

1. **Object Ownership Model** - Objects can be owned, shared, or immutable
2. **Parallel Execution** - Transactions on different objects execute in parallel
3. **PTBs (Programmable Transaction Blocks)** - Complex multi-command transactions
4. **No Reentrancy** - Move's design prevents traditional reentrancy
5. **Capabilities** - Unforgeable tokens for authorization
6. **Transfer to Object (TTO)** - Objects can own other objects (DAG structure)

---

## 2. Critical Vulnerabilities by Category

### 🔴 CRITICAL (Immediate Fund Loss)

| Vulnerability | Impact | Sui-Specific? |
|--------------|--------|---------------|
| **Unauthorized Ownership Transfer** | Direct theft | ✅ Yes |
| **Object Deletion Without Validation** | Permanent fund loss | ✅ Yes |
| **Capability Leakage** | Full contract control | ✅ Yes |
| **Shared Object Race Conditions** | Double-spend, fund theft | ✅ Yes |
| **Type Confusion in Generics** | Bypass security checks | ✅ Yes |
| **Unsafe TTO Patterns** | Locked funds | ✅ Yes |

### 🟠 HIGH (Functional Bypass)

| Vulnerability | Impact | Sui-Specific? |
|--------------|--------|---------------|
| **Missing Signer Checks** | Unauthorized actions | ⚠️ Common in Move |
| **Incorrect Ability Declarations** | Unintended object behavior | ✅ Yes |
| **Dynamic Field Injection** | State manipulation | ✅ Yes |
| **Version Lock Issues** | Upgrade bypass | ✅ Yes |
| **Clock Manipulation** | Time-based exploit | ✅ Yes |

### 🟡 MEDIUM (Logic Errors)

| Vulnerability | Impact | Sui-Specific? |
|--------------|--------|---------------|
| **Insufficient Event Emission** | Monitoring blind spots | ⚠️ Common |
| **Unsafe Borrowing Patterns** | Reference confusion | ⚠️ Move-specific |
| **Missing Abort Conditions** | Invalid state | ⚠️ Common |
| **Precision Loss in Math** | Economic attacks | ⚠️ Common |

---

## 3. Object Model Vulnerabilities

### 3.1 Object Ownership Exploits

#### ❌ **CRITICAL: Unauthorized Transfer**

```move
// VULNERABLE CODE
public fun steal_nft(nft: NFT) {
    // No ownership check - anyone can call this!
    transfer::public_transfer(nft, @attacker);
}

// SECURE CODE
public entry fun transfer_nft(nft: NFT, ctx: &mut TxContext) {
    // Only the transaction sender (owner) can transfer
    transfer::public_transfer(nft, tx_context::sender(ctx));
}
```

**Audit Focus:**
- ✅ Every function that transfers objects MUST verify ownership
- ✅ Check for `public` vs `public entry` - public can be called in PTB without signer
- ✅ Ensure `TxContext` is used to validate the caller

#### ❌ **CRITICAL: Object Deletion Without Checks**

```move
// VULNERABLE CODE
public fun burn_coin(coin: Coin<SUI>) {
    // Destroys coin without checking value or ownership!
    let Coin { id, balance } = coin;
    object::delete(id);
    balance::destroy_zero(balance); // Will abort if balance > 0, but still vulnerable
}

// SECURE CODE
public entry fun burn_coin(coin: Coin<SUI>, ctx: &TxContext) {
    assert!(coin::value(&coin) > 0, E_CANNOT_BURN_ZERO);
    // Additional checks...
    coin::burn(coin, ctx);
}
```

**Audit Focus:**
- ✅ Check all `object::delete()` calls
- ✅ Verify balances/values are properly handled before deletion
- ✅ Ensure no valuable state is lost

### 3.2 Shared Object Vulnerabilities

#### ❌ **CRITICAL: Race Conditions on Shared Objects**

```move
// VULNERABLE CODE - Race condition
public entry fun claim_reward(
    pool: &mut RewardPool,  // Shared object
    ctx: &mut TxContext
) {
    let user = tx_context::sender(ctx);
    
    // VULNERABLE: Two transactions can read same state in parallel
    assert!(pool.available_rewards > 0, E_NO_REWARDS);
    
    // Race condition window here!
    
    let reward = mint_reward(ctx);
    pool.available_rewards = pool.available_rewards - 1;
    transfer::public_transfer(reward, user);
}

// SECURE CODE - Proper synchronization
public entry fun claim_reward(
    pool: &mut RewardPool,
    ctx: &mut TxContext
) {
    let user = tx_context::sender(ctx);
    
    // Atomic check-and-decrement
    assert!(pool.available_rewards > 0, E_NO_REWARDS);
    pool.available_rewards = pool.available_rewards - 1;  // Decrement FIRST
    
    let reward = mint_reward(ctx);
    transfer::public_transfer(reward, user);
}
```

**Audit Focus:**
- ✅ Identify all shared objects (`&mut SharedObject`)
- ✅ Check for TOCTOU (Time-of-Check-Time-of-Use) vulnerabilities
- ✅ Verify atomic operations on critical state
- ✅ Look for parallel transaction exploits

#### ❌ **HIGH: Shared Object Denial of Service**

```move
// VULNERABLE CODE
public entry fun process_batch(
    shared_registry: &mut Registry,  // Shared - bottleneck!
    data: vector<Data>,
    ctx: &mut TxContext
) {
    // All transactions touch same shared object = serialization
    let i = 0;
    while (i < vector::length(&data)) {
        registry::add(shared_registry, *vector::borrow(&data, i));
        i = i + 1;
    }
}

// BETTER: Minimize shared object interaction
public entry fun process_batch(
    shared_registry: &mut Registry,
    batch_id: ID,  // Use owned object for most work
    ctx: &mut TxContext
) {
    // Batch processing in owned object, then single update to shared
    registry::commit_batch(shared_registry, batch_id);
}
```

**Audit Focus:**
- ✅ Identify unnecessary shared object usage
- ✅ Check if owned objects could be used instead
- ✅ Verify batching strategies are efficient

### 3.3 Transfer to Object (TTO) Issues

#### ❌ **CRITICAL: Funds Locked in Objects**

```move
// VULNERABLE CODE
public fun receive_payment(
    shop: &mut Shop,
    payment: Coin<SUI>
) {
    // Payment transferred to object - how to retrieve?
    transfer::transfer(payment, object::uid_to_inner(&shop.id));
    // Now payment is stuck in shop object!
}

// SECURE CODE - Proper handling
public fun receive_payment(
    shop: &mut Shop,
    payment: Coin<SUI>
) {
    // Add to balance or use dynamic fields
    balance::join(&mut shop.balance, coin::into_balance(payment));
}
```

**Audit Focus:**
- ✅ Check all `transfer::transfer(object, object_id)` calls
- ✅ Verify objects receiving transfers have withdrawal mechanisms
- ✅ Ensure funds aren't permanently locked

---

## 4. Move Language Security Patterns

### 4.1 Ability Declarations (KEY, STORE, COPY, DROP)

#### ❌ **CRITICAL: Incorrect Abilities**

```move
// VULNERABLE CODE
struct AdminCap has key, store, copy, drop {  // WRONG!
    id: UID
}
// 'copy' and 'drop' make this capability duplicatable and destroyable!

// SECURE CODE
struct AdminCap has key, store {  // Correct
    id: UID
}
// Can only be transferred, cannot be copied or dropped
```

**Ability Security Rules:**

```
┌──────────────────────────────────────────────────────────┐
│              MOVE ABILITIES SECURITY MATRIX              │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  key   - Can be owned/transferred (object)               │
│  store - Can be stored inside other objects              │
│  copy  - Can be duplicated (⚠️ DANGEROUS for caps!)      │
│  drop  - Can be destroyed (⚠️ DANGEROUS for caps!)       │
│                                                           │
│  CAPABILITIES should NEVER have 'copy' or 'drop'!        │
│                                                           │
│  Safe Pattern for Capabilities:                          │
│  ✅ struct Cap has key, store { id: UID }                │
│                                                           │
│  Dangerous Patterns:                                     │
│  ❌ struct Cap has key, store, copy { ... }              │
│  ❌ struct Cap has key, store, drop { ... }              │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

**Audit Focus:**
- ✅ **CRITICAL**: Check ALL capability/admin structs for `copy` or `drop`
- ✅ Verify only intended types have these abilities
- ✅ Ensure valuable assets don't have `drop` ability

### 4.2 Reference Safety

#### ❌ **HIGH: Unsafe Mutable References**

```move
// VULNERABLE CODE
public fun get_admin_cap(registry: &mut Registry): &mut AdminCap {
    // Returns mutable reference - caller can modify!
    &mut registry.admin_cap
}

// SECURE CODE
public fun check_admin(registry: &Registry, cap: &AdminCap): bool {
    // Read-only, no reference leakage
    object::id(cap) == registry.admin_cap_id
}
```

**Audit Focus:**
- ✅ Check all functions returning `&mut` references
- ✅ Verify references don't leak sensitive data
- ✅ Ensure mutable borrows are properly scoped

### 4.3 Generic Type Safety

#### ❌ **CRITICAL: Type Confusion in Generics**

```move
// VULNERABLE CODE
public fun swap<CoinA, CoinB>(
    pool: &mut LiquidityPool,
    coin_in: Coin<CoinA>,
    ctx: &mut TxContext
): Coin<CoinB> {
    // No verification that CoinA and CoinB match pool!
    // Attacker could swap USDC pool but pass in fake token
    balance::join(&mut pool.balance_a, coin::into_balance(coin_in));
    coin::from_balance(balance::split(&mut pool.balance_b, 100), ctx)
}

// SECURE CODE
public fun swap<CoinA, CoinB>(
    pool: &mut LiquidityPool<CoinA, CoinB>,  // Type-safe pool
    coin_in: Coin<CoinA>,
    amount_out: u64,
    ctx: &mut TxContext
): Coin<CoinB> {
    // Types are enforced by pool generic parameters
    balance::join(&mut pool.balance_a, coin::into_balance(coin_in));
    coin::from_balance(balance::split(&mut pool.balance_b, amount_out), ctx)
}
```

**Audit Focus:**
- ✅ **CRITICAL**: Verify generic type parameters are constrained
- ✅ Check that type witnesses are used for verification
- ✅ Ensure pools/vaults use type-safe generics

---

## 5. Authentication & Authorization Issues

### 5.1 Missing Signer Checks

#### ❌ **CRITICAL: No Ownership Validation**

```move
// VULNERABLE CODE
public entry fun withdraw(
    vault: &mut Vault,
    amount: u64,
    recipient: address,
    ctx: &mut TxContext
) {
    // CRITICAL: Anyone can call this and drain vault!
    let coins = coin::take(&mut vault.balance, amount, ctx);
    transfer::public_transfer(coins, recipient);
}

// SECURE CODE
public entry fun withdraw(
    vault: &mut Vault,
    amount: u64,
    ctx: &mut TxContext
) {
    let sender = tx_context::sender(ctx);
    
    // Verify ownership
    assert!(vault.owner == sender, E_NOT_OWNER);
    
    let coins = coin::take(&mut vault.balance, amount, ctx);
    transfer::public_transfer(coins, sender);  // Only to sender
}
```

**Audit Focus:**
- ✅ **Every state-changing function must validate the caller**
- ✅ Check for `tx_context::sender(ctx)` usage
- ✅ Verify ownership/permission checks before operations

### 5.2 Capability-Based Access Control

#### ❌ **CRITICAL: Capability Leakage**

```move
// VULNERABLE CODE
public fun get_admin_cap(ctx: &mut TxContext): AdminCap {
    // CRITICAL: Anyone can get admin capability!
    AdminCap {
        id: object::new(ctx)
    }
}

// SECURE CODE - One-time initialization
fun init(ctx: &mut TxContext) {
    // AdminCap created ONCE in init, transferred to deployer
    let admin_cap = AdminCap {
        id: object::new(ctx)
    };
    transfer::transfer(admin_cap, tx_context::sender(ctx));
}

// Protected function requires the capability
public entry fun admin_function(
    _admin_cap: &AdminCap,  // Capability proves authorization
    registry: &mut Registry,
    ctx: &mut TxContext
) {
    // Only callable by holder of AdminCap
    // ...
}
```

**Audit Focus:**
- ✅ **CRITICAL**: Verify capabilities are created only in `init` or by admin
- ✅ Check that capabilities cannot be minted by users
- ✅ Ensure capability functions require the actual capability object

### 5.3 Witness Pattern Vulnerabilities

#### ❌ **HIGH: Missing One-Time Witness Check**

```move
// VULNERABLE CODE
public fun create_currency<T>(
    ctx: &mut TxContext
): TreasuryCap<T> {
    // No witness check - anyone can create treasury!
    coin::create_currency(/* ... */)
}

// SECURE CODE
public fun create_currency<T: drop>(
    witness: T,  // One-time witness
    ctx: &mut TxContext
): TreasuryCap<T> {
    // Witness proves this is called from module's init
    let (treasury, metadata) = coin::create_currency(
        witness,
        /* ... */
    );
    treasury
}
```

**Audit Focus:**
- ✅ Check all `create_currency` calls use one-time witness
- ✅ Verify witness types have `drop` ability
- ✅ Ensure witnesses are only available in `init`

---

## 6. Transaction-Level Vulnerabilities

### 6.1 PTB (Programmable Transaction Block) Attacks

#### ❌ **CRITICAL: PTB Flash Loan Attack**

```move
// VULNERABLE CODE - Can be exploited in PTB
public fun borrow_uncollateralized(
    pool: &mut LendingPool,
    amount: u64,
    ctx: &mut TxContext
): Coin<SUI> {
    // Allows borrowing without collateral in same PTB!
    coin::take(&mut pool.balance, amount, ctx)
}

public fun repay(
    pool: &mut LendingPool,
    payment: Coin<SUI>
) {
    balance::join(&mut pool.balance, coin::into_balance(payment));
}

// ATTACK PTB:
// 1. Call borrow_uncollateralized(1000 SUI)
// 2. Use borrowed SUI for manipulation
// 3. Call repay(1000 SUI)
// All in one transaction!
```

**Secure Pattern: Hot Potato**

```move
// SECURE CODE - Hot Potato pattern
struct Loan {
    amount: u64,
    // No abilities! Must be consumed in same PTB
}

public fun borrow(
    pool: &mut LendingPool,
    amount: u64,
    ctx: &mut TxContext
): (Coin<SUI>, Loan) {
    let coins = coin::take(&mut pool.balance, amount, ctx);
    let loan = Loan { amount };
    (coins, loan)  // Must return loan receipt
}

public fun repay(
    pool: &mut LendingPool,
    payment: Coin<SUI>,
    loan: Loan  // Must consume the loan receipt
) {
    let Loan { amount } = loan;
    assert!(coin::value(&payment) >= amount, E_INSUFFICIENT_REPAYMENT);
    balance::join(&mut pool.balance, coin::into_balance(payment));
}
```

**Audit Focus:**
- ✅ **CRITICAL**: Identify functions that can be chained in PTBs
- ✅ Check for uncollateralized lending
- ✅ Verify Hot Potato pattern for flash operations
- ✅ Look for state manipulation within single PTB

### 6.2 Clock Manipulation

#### ❌ **HIGH: Trusting Block Timestamp**

```move
// VULNERABLE CODE
public entry fun claim_vested_tokens(
    vesting: &mut VestingSchedule,
    clock: &Clock,  // Clock object passed by user!
    ctx: &mut TxContext
) {
    let now = clock::timestamp_ms(clock);
    
    // VULNERABLE: In testnet, clock can be set by user
    assert!(now >= vesting.unlock_time, E_NOT_UNLOCKED);
    
    // Transfer tokens
}

// SECURE CODE
public entry fun claim_vested_tokens(
    vesting: &mut VestingSchedule,
    clock: &Clock,
    ctx: &mut TxContext
) {
    // Use shared Clock object (immutable system object)
    let now = clock::timestamp_ms(clock);
    
    // Additional validation
    assert!(object::id(clock) == @0x6, E_INVALID_CLOCK);  // Verify system clock
    assert!(now >= vesting.unlock_time, E_NOT_UNLOCKED);
}
```

**Audit Focus:**
- ✅ Verify Clock object is the system clock (`@0x6`)
- ✅ Check time-dependent logic for manipulation
- ✅ Consider delayed finality for critical operations

---

## 7. PTB (Programmable Transaction Block) Security

### 7.1 Understanding PTB Attack Vectors

```
┌────────────────────────────────────────────────────────┐
│         PROGRAMMABLE TRANSACTION BLOCK (PTB)           │
│         Single Transaction, Multiple Commands          │
└────────────────────────────────────────────────────────┘

A single PTB can:
1. Call multiple functions across different modules
2. Pass objects between function calls
3. Manipulate state atomically
4. Execute complex DeFi strategies

ATTACK SCENARIOS:
├─ Flash loans without collateral checks
├─ Price oracle manipulation in single block
├─ Reentrancy-like behavior (but different mechanism)
├─ State snapshot + exploit + restore
└─ Cross-protocol atomic exploits
```

### 7.2 PTB Security Patterns

#### ✅ **SECURE: Hot Potato Pattern**

```move
// Forces proper cleanup in PTB

struct Receipt {
    // No abilities - can't be stored, copied, or dropped
    // MUST be consumed in the same PTB
}

public fun start_operation(): Receipt {
    Receipt {}
}

public fun finish_operation(receipt: Receipt) {
    let Receipt {} = receipt;  // Consumes the receipt
}

// Usage in PTB:
// let receipt = start_operation();
// // ... do work ...
// finish_operation(receipt);  // MUST call this or PTB fails
```

#### ✅ **SECURE: State Commitment Pattern**

```move
public fun begin_swap(
    pool: &mut Pool,
    amount_in: u64
): SwapCommitment {
    // Lock state
    pool.locked = true;
    
    SwapCommitment {
        expected_state_hash: pool.state_hash,
        amount_in
    }
}

public fun complete_swap(
    pool: &mut Pool,
    commitment: SwapCommitment,
    coins_in: Coin<SUI>
): Coin<USDC> {
    // Verify state hasn't changed
    assert!(pool.state_hash == commitment.expected_state_hash, E_STATE_CHANGED);
    
    let SwapCommitment { expected_state_hash: _, amount_in } = commitment;
    
    // Execute swap
    // ...
    
    pool.locked = false;
}
```

---

## 8. Capability-Based Security

### 8.1 Capability Anti-Patterns

```move
// ❌ CRITICAL: Capability with 'copy'
struct AdminCap has key, store, copy {  // NEVER DO THIS
    id: UID
}

// ❌ CRITICAL: Capability with 'drop'
struct AdminCap has key, store, drop {  // NEVER DO THIS
    id: UID
}

// ❌ HIGH: Returning capability from public function
public fun get_admin_cap(): AdminCap {  // NEVER DO THIS
    // Anyone can call and get admin rights
}

// ❌ HIGH: Not consuming capability
public fun admin_function(_cap: &AdminCap) {  // Reference, not ownership
    // Attacker can use same cap multiple times
}

// ✅ CORRECT: Proper capability usage
struct AdminCap has key, store {  // Only key + store
    id: UID
}

fun init(ctx: &mut TxContext) {
    let admin_cap = AdminCap { id: object::new(ctx) };
    transfer::transfer(admin_cap, tx_context::sender(ctx));
}

public entry fun admin_function(
    admin_cap: &AdminCap,  // Requires ownership proof
    target: &mut SomeObject
) {
    // Only AdminCap holder can call
}
```

### 8.2 Capability Delegation Vulnerabilities

#### ❌ **CRITICAL: Unrestricted Delegation**

```move
// VULNERABLE CODE
public fun delegate_admin(
    _admin_cap: &AdminCap,
    to: address,
    ctx: &mut TxContext
) {
    // Creates new admin cap - unlimited delegation!
    let new_cap = AdminCap { id: object::new(ctx) };
    transfer::transfer(new_cap, to);
}

// SECURE CODE - Time-limited delegation
struct TimeLimitedCap has key, store {
    id: UID,
    expires_at: u64,
    permissions: u8  // Bitfield for specific permissions
}

public fun delegate_limited(
    _admin_cap: &AdminCap,
    to: address,
    duration: u64,
    permissions: u8,
    clock: &Clock,
    ctx: &mut TxContext
) {
    let expires_at = clock::timestamp_ms(clock) + duration;
    let limited_cap = TimeLimitedCap {
        id: object::new(ctx),
        expires_at,
        permissions
    };
    transfer::transfer(limited_cap, to);
}

public entry fun admin_with_limited_cap(
    cap: &TimeLimitedCap,
    clock: &Clock,
    target: &mut SomeObject
) {
    // Verify not expired
    assert!(clock::timestamp_ms(clock) < cap.expires_at, E_CAP_EXPIRED);
    
    // Verify permissions
    assert!(cap.permissions & PERMISSION_MODIFY != 0, E_NO_PERMISSION);
    
    // Execute...
}
```

**Audit Focus:**
- ✅ Check if capabilities can be arbitrarily created
- ✅ Verify delegation mechanisms are controlled
- ✅ Look for time-bounds and permission scoping

---

## 9. Common Anti-Patterns

### 9.1 Unsafe Math Operations

```move
// ❌ VULNERABLE: Unchecked arithmetic
public fun calculate_fee(amount: u64): u64 {
    amount * FEE_RATE / 10000  // Can overflow!
}

// ✅ SECURE: Checked arithmetic
public fun calculate_fee(amount: u64): u64 {
    let fee_numerator = (amount as u128) * (FEE_RATE as u128);
    let fee = fee_numerator / 10000;
    assert!(fee <= (MAX_U64 as u128), E_FEE_OVERFLOW);
    (fee as u64)
}
```

### 9.2 Unsafe Vector Operations

```move
// ❌ VULNERABLE: No bounds checking
public fun get_item(vec: &vector<Item>, index: u64): &Item {
    vector::borrow(vec, index)  // Aborts if out of bounds, but no graceful error
}

// ✅ SECURE: Proper validation
public fun get_item(vec: &vector<Item>, index: u64): &Item {
    assert!(index < vector::length(vec), E_INDEX_OUT_OF_BOUNDS);
    vector::borrow(vec, index)
}
```

### 9.3 Missing Event Emissions

```move
// ❌ VULNERABLE: No events
public entry fun transfer_ownership(
    registry: &mut Registry,
    new_owner: address,
    _admin_cap: &AdminCap
) {
    registry.owner = new_owner;
    // No event - hard to track ownership changes!
}

// ✅ SECURE: Proper event emission
struct OwnershipTransferred has copy, drop {
    old_owner: address,
    new_owner: address,
    timestamp: u64
}

public entry fun transfer_ownership(
    registry: &mut Registry,
    new_owner: address,
    _admin_cap: &AdminCap,
    clock: &Clock
) {
    let old_owner = registry.owner;
    registry.owner = new_owner;
    
    event::emit(OwnershipTransferred {
        old_owner,
        new_owner,
        timestamp: clock::timestamp_ms(clock)
    });
}
```

**Audit Focus:**
- ✅ Verify all critical state changes emit events
- ✅ Check events include all relevant data
- ✅ Ensure events can't be used for attacks (e.g., spam)

---

## 10. Comprehensive Audit Checklist

### Phase 1: Initial Review

```
┌─────────────────────────────────────────────────────────┐
│              PRELIMINARY SECURITY AUDIT                  │
└─────────────────────────────────────────────────────────┘

□ Review project architecture and data flow
□ Identify all entry points (public entry functions)
□ Map object ownership model
□ List all capabilities and admin functions
□ Identify shared vs owned objects
□ Document external dependencies
□ Review upgrade/migration strategy
```

### Phase 2: Code Analysis

#### A. Object Model Security

```
□ Verify all ownership transfers check sender
□ Check for unauthorized object deletion
□ Validate TTO (Transfer to Object) patterns
□ Ensure no funds can be locked in objects
□ Review dynamic field usage
□ Check for object wrapping/unwrapping issues
```

#### B. Type Safety

```
□ Verify generic type constraints
□ Check type witness usage
□ Validate coin/token type safety
□ Review struct ability declarations
□ Ensure no type confusion possible
```

#### C. Access Control

```
□ Verify signer checks in all state-changing functions
□ Review capability declarations (no copy/drop)
□ Check capability initialization (only in init)
□ Validate permission checks before operations
□ Review delegation mechanisms
```

#### D. Shared Object Analysis

```
□ Identify all shared objects
□ Check for race conditions (TOCTOU)
□ Verify atomic operations
□ Look for DoS via shared object bottlenecks
□ Check consensus ordering issues
```

#### E. PTB Security

```
□ Identify PTB-exploitable function chains
□ Check for flash loan vulnerabilities
□ Verify hot potato pattern usage
□ Look for atomic state manipulation
□ Check for cross-protocol exploits
```

#### F. Math & Economics

```
□ Verify all arithmetic for overflow/underflow
□ Check precision loss in divisions
□ Validate fee calculations
□ Review rounding errors
□ Check for economic attacks (slippage, MEV, etc.)
```

#### G. External Interactions

```
□ Review oracle usage
□ Check clock usage (system vs user)
□ Validate cross-module calls
□ Review event emissions
□ Check for front-running vulnerabilities
```

### Phase 3: Testing

```
□ Write property-based tests
□ Create exploit scenarios
□ Test edge cases (zero amounts, max values)
□ Test with malicious inputs
□ Fuzz test critical functions
□ Test upgrade scenarios
□ Simulate parallel transactions
□ Test PTB attack vectors
```

---

## 11. Testing & Verification

### 11.1 Unit Testing Critical Paths

```move
#[test]
fun test_unauthorized_withdrawal_fails() {
    let scenario = test_scenario::begin(@attacker);
    
    // Setup
    let ctx = test_scenario::ctx(&mut scenario);
    let vault = Vault {
        id: object::new(ctx),
        owner: @owner,
        balance: balance::zero()
    };
    
    // Try to withdraw as attacker
    test_scenario::next_tx(&mut scenario, @attacker);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        
        // Should abort with E_NOT_OWNER
        withdraw(&mut vault, 100, ctx);  // Expected to fail
    };
    
    test_scenario::end(scenario);
}
```

### 11.2 Property-Based Testing

```move
#[test]
fun property_total_supply_constant() {
    // Property: Total supply should never change except via mint/burn
    
    let scenario = test_scenario::begin(@admin);
    
    // Record initial supply
    let initial_supply = get_total_supply();
    
    // Perform various operations
    transfer_tokens(...);
    swap_tokens(...);
    stake_tokens(...);
    
    // Verify supply unchanged
    assert!(get_total_supply() == initial_supply, E_SUPPLY_CHANGED);
    
    test_scenario::end(scenario);
}
```

### 11.3 Fuzzing Critical Functions

```rust
// Using Rust-based fuzzing
#[cfg(test)]
mod fuzz_tests {
    use proptest::prelude::*;
    
    proptest! {
        #[test]
        fn fuzz_swap_amounts(
            amount_in in 1u64..1_000_000u64,
            amount_out in 1u64..1_000_000u64
        ) {
            // Test swap with random amounts
            // Should never panic or lose funds
        }
    }
}
```

---

## 12. Real-World Exploit Patterns

### 12.1 Shared Object Race Condition Exploit

**Vulnerability:**
```move
public entry fun claim_airdrop(
    airdrop: &mut Airdrop,  // Shared object
    ctx: &mut TxContext
) {
    let user = tx_context::sender(ctx);
    
    // Check eligibility
    assert!(!table::contains(&airdrop.claimed, user), E_ALREADY_CLAIMED);
    assert!(airdrop.remaining > 0, E_NO_TOKENS);
    
    // RACE CONDITION WINDOW HERE
    // Multiple transactions can pass both checks in parallel
    
    // Mint and transfer
    let tokens = mint_tokens(100, ctx);
    transfer::public_transfer(tokens, user);
    
    // Update state
    table::add(&mut airdrop.claimed, user, true);
    airdrop.remaining = airdrop.remaining - 100;
}
```

**Attack:**
```
Attacker submits 10 transactions in parallel:
├─ Tx1: claim_airdrop() - reads remaining = 1000
├─ Tx2: claim_airdrop() - reads remaining = 1000
├─ Tx3: claim_airdrop() - reads remaining = 1000
├─ ...all pass initial checks in parallel...
└─ All 10 transactions succeed, user gets 1000 tokens instead of 100!
```

**Fix:**
```move
public entry fun claim_airdrop(
    airdrop: &mut Airdrop,
    ctx: &mut TxContext
) {
    let user = tx_context::sender(ctx);
    
    // Atomic check-and-claim
    assert!(airdrop.remaining >= 100, E_NO_TOKENS);
    airdrop.remaining = airdrop.remaining - 100;  // Deduct FIRST
    
    assert!(!table::contains(&airdrop.claimed, user), E_ALREADY_CLAIMED);
    table::add(&mut airdrop.claimed, user, true);
    
    let tokens = mint_tokens(100, ctx);
    transfer::public_transfer(tokens, user);
}
```

### 12.2 Type Confusion in DEX

**Vulnerability:**
```move
public fun swap<CoinIn, CoinOut>(
    pool: &mut Pool,
    coin_in: Coin<CoinIn>,
    min_out: u64,
    ctx: &mut TxContext
): Coin<CoinOut> {
    // No type checking - attacker can specify any CoinOut!
    
    let amount_in = coin::value(&coin_in);
    balance::join(&mut pool.balance_generic, coin::into_balance(coin_in));
    
    // Calculate amount out (vulnerable)
    let amount_out = calculate_output(amount_in, min_out);
    
    // Return ANY coin type requested
    coin::from_balance(
        balance::split(&mut pool.balance_generic, amount_out),
        ctx
    )
}
```

**Attack:**
```
1. Create fake token FakeSUI
2. Call swap<FakeSUI, SUI>(pool, fake_coins, ...)
3. Receive real SUI from pool
4. Profit!
```

**Fix:**
```move
struct Pool<phantom CoinA, phantom CoinB> has key {
    id: UID,
    balance_a: Balance<CoinA>,
    balance_b: Balance<CoinB>,
    // Type parameters enforce correctness
}

public fun swap<CoinA, CoinB>(
    pool: &mut Pool<CoinA, CoinB>,  // Type-safe pool
    coin_in: Coin<CoinA>,
    min_out: u64,
    ctx: &mut TxContext
): Coin<CoinB> {
    // Types are enforced by compiler
    balance::join(&mut pool.balance_a, coin::into_balance(coin_in));
    
    let amount_out = calculate_output(...);
    coin::from_balance(balance::split(&mut pool.balance_b, amount_out), ctx)
}
```

### 12.3 PTB Flash Loan Exploit

**Vulnerability:**
```move
// Lending protocol
public fun borrow(
    pool: &mut Pool,
    amount: u64,
    ctx: &mut TxContext
): Coin<SUI> {
    // No collateral check!
    coin::take(&mut pool.balance, amount, ctx)
}

public fun repay(pool: &mut Pool, payment: Coin<SUI>) {
    balance::join(&mut pool.balance, coin::into_balance(payment));
}

// Price oracle (vulnerable)
public fun get_price(pool: &Pool): u64 {
    // Uses pool reserves for price
    pool.reserve_a / pool.reserve_b
}
```

**Attack PTB:**
```move
// Single PTB executing:
ptb {
    // 1. Borrow large amount
    let borrowed = borrow(lending_pool, 1_000_000_SUI);
    
    // 2. Manipulate DEX price
    let coins_out = swap(dex_pool, borrowed);
    // Price is now manipulated
    
    // 3. Exploit manipulated price
    let profit = arbitrage_using_oracle(oracle);
    
    // 4. Swap back
    let repay_coins = swap(dex_pool, coins_out);
    
    // 5. Repay loan
    repay(lending_pool, repay_coins);
    
    // 6. Keep profit
    transfer::public_transfer(profit, attacker);
}
```

**Fix: Hot Potato Pattern**
```move
struct FlashLoan {
    amount: u64,
    fee: u64
    // No abilities - must be consumed
}

public fun flash_borrow(
    pool: &mut Pool,
    amount: u64,
    ctx: &mut TxContext
): (Coin<SUI>, FlashLoan) {
    let fee = calculate_fee(amount);
    let coins = coin::take(&mut pool.balance, amount, ctx);
    let receipt = FlashLoan { amount, fee };
    (coins, receipt)
}

public fun flash_repay(
    pool: &mut Pool,
    payment: Coin<SUI>,
    receipt: FlashLoan
) {
    let FlashLoan { amount, fee } = receipt;
    
    let repay_amount = amount + fee;
    assert!(coin::value(&payment) >= repay_amount, E_INSUFFICIENT);
    
    balance::join(&mut pool.balance, coin::into_balance(payment));
}
```

---

## 13. Advanced Security Patterns

### 13.1 Two-Step Ownership Transfer

```move
struct Registry has key {
    id: UID,
    owner: address,
    pending_owner: Option<address>
}

public entry fun initiate_transfer(
    registry: &mut Registry,
    new_owner: address,
    ctx: &TxContext
) {
    assert!(tx_context::sender(ctx) == registry.owner, E_NOT_OWNER);
    option::fill(&mut registry.pending_owner, new_owner);
    
    event::emit(OwnershipTransferInitiated {
        current_owner: registry.owner,
        pending_owner: new_owner
    });
}

public entry fun accept_ownership(
    registry: &mut Registry,
    ctx: &TxContext
) {
    let sender = tx_context::sender(ctx);
    assert!(option::contains(&registry.pending_owner, &sender), E_NOT_PENDING);
    
    let old_owner = registry.owner;
    registry.owner = sender;
    registry.pending_owner = option::none();
    
    event::emit(OwnershipTransferred {
        old_owner,
        new_owner: sender
    });
}
```

### 13.2 Pausable Pattern

```move
struct Pausable has key {
    id: UID,
    paused: bool,
    admin: address
}

public entry fun pause(
    pausable: &mut Pausable,
    _admin_cap: &AdminCap
) {
    pausable.paused = true;
    event::emit(ContractPaused {});
}

public entry fun unpause(
    pausable: &mut Pausable,
    _admin_cap: &AdminCap
) {
    pausable.paused = false;
    event::emit(ContractUnpaused {});
}

public entry fun protected_function(
    pausable: &Pausable,
    // ...
) {
    assert!(!pausable.paused, E_PAUSED);
    // ... rest of function
}
```

### 13.3 Upgrade Safety Pattern

```move
struct VersionedRegistry has key {
    id: UID,
    version: u64,
    data: Table<ID, Data>
}

const CURRENT_VERSION: u64 = 2;

public entry fun migrate_v1_to_v2(
    registry: &mut VersionedRegistry,
    _admin_cap: &AdminCap
) {
    assert!(registry.version == 1, E_WRONG_VERSION);
    
    // Perform migration logic
    migrate_data(&mut registry.data);
    
    // Update version
    registry.version = 2;
    
    event::emit(MigrationCompleted {
        from_version: 1,
        to_version: 2
    });
}

public entry fun use_registry(registry: &VersionedRegistry) {
    assert!(registry.version == CURRENT_VERSION, E_OUTDATED);
    // ... use registry
}
```

---

## 14. Security Tools & Resources

### 14.1 Static Analysis Tools

```bash
# Move Prover (formal verification)
sui move prove

# Move Linter
move-analyzer

# Custom security scanner
cargo install sui-security-scanner  # (if available)
```

### 14.2 Testing Tools

```bash
# Unit tests
sui move test

# Integration tests with gas profiling
sui move test --gas-profile

# Test coverage
sui move test --coverage
```

### 14.3 Monitoring & Detection

```move
// Runtime checks
#[cfg(not(feature = "production"))]
fun debug_check_invariant(pool: &Pool) {
    assert!(
        pool.total_deposited == pool.balance_a + pool.balance_b,
        E_INVARIANT_VIOLATED
    );
}
```

---

## 15. Final Audit Report Template

```markdown
# Security Audit Report: [Project Name]

## Executive Summary
- **Project**: [Name]
- **Audit Date**: [Date]
- **Auditor**: [Your Name]
- **Commit Hash**: [Hash]

## Findings Summary
- Critical: X
- High: X
- Medium: X
- Low: X
- Informational: X

## Critical Findings

### [C-01] Unauthorized Ownership Transfer
**Severity**: Critical
**Location**: `module::function` (line X)
**Description**: [Detailed description]
**Impact**: Direct fund theft possible
**Recommendation**: [Fix recommendation]
**Status**: [Open/Fixed/Acknowledged]

## Detailed Findings
[For each finding...]

## Architecture Review
[System design analysis]

## Testing Recommendations
[Suggested test cases]

## Conclusion
[Overall assessment]
```

---

## 🎯 Key Takeaways for Sui Security Auditors

### Top 10 Critical Checks:

1. ✅ **Verify ALL ownership transfers check sender**
2. ✅ **Check capabilities NEVER have `copy` or `drop`**
3. ✅ **Validate generic types are properly constrained**
4. ✅ **Identify and analyze ALL shared objects**
5. ✅ **Test PTB attack vectors**
6. ✅ **Verify math operations for overflow**
7. ✅ **Check for race conditions in parallel execution**
8. ✅ **Validate clock usage (system vs user)**
9. ✅ **Ensure hot potato pattern for flash operations**
10. ✅ **Review dynamic field security**

### Unique Sui Vulnerabilities to Master:

- **Object Model Issues** (ownership, TTO, deletion)
- **Shared Object Race Conditions** (parallel execution)
- **PTB Exploits** (atomic multi-call attacks)
- **Capability Leakage** (ability declarations)
- **Type Confusion** (generic parameters)

### Different from Ethereum:

- ❌ No reentrancy (Move prevents it)
- ✅ BUT parallel execution creates new race conditions
- ❌ No delegate call issues
- ✅ BUT capability delegation is new attack surface
- ❌ No storage collision
- ✅ BUT dynamic fields have their own issues

---

**Remember**: Sui's object-centric model and parallel execution create fundamentally different security challenges than Ethereum. Traditional smart contract auditing knowledge helps, but you must deeply understand Move's type system and Sui's execution model to be effective.

Good luck with your audits! 🔒