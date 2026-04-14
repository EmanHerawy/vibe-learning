# Sui Move Coin - Comprehensive Study Guide

Let me search for the most up-to-date information about Coin in Sui Move.Perfect! Now I have comprehensive information about Sui Move Coin. Let me create detailed study notes for you.

# Sui Move Coin - Complete Study Guide

## Overview

**What is Coin in Sui Move?**
Coin is Sui's **fungible token standard** - similar to ERC-20 on Ethereum but designed specifically for Sui's object model. It provides a standardized way to create, manage, and transfer fungible assets on the Sui blockchain.

**Key terminology:**
- **Coin:** A single object wrapper for fungible assets (like individual token instances)
- **Currency:** The metadata and properties describing the token type
- **Balance:** The actual numeric value held by a Coin
- **Supply:** Total amount of tokens in circulation

---

## Core Components

### 1. The `Coin<T>` Struct

```move
/// A coin of type `T` worth `value`. Transferable and storable
public struct Coin<phantom T> has key, store {
    id: UID,
    balance: Balance<T>
}
```

**Key characteristics:**
- **Phantom type parameter `T`:** Identifies the coin type (e.g., `Coin<USDC>`, `Coin<SUI>`)
- **`key` ability:** Can be stored as a Sui object with unique ID
- **`store` ability:** Can be stored inside other structs
- **Transferable:** Can be sent between addresses
- **Contains `Balance<T>`:** Wraps the actual numeric value

**Important:** Each `Coin<T>` is a separate object on Sui - not an account balance!

---

### 2. `Balance<T>` Struct

```move
/// Storable balance - an inner struct of a Coin type.
public struct Balance<phantom T> has store {
    value: u64
}
```

**Purpose:** Holds the actual numeric amount
**Type:** `u64` (0 to 18,446,744,073,709,551,615)

---

### 3. `TreasuryCap<T>` - The Minting Authority

```move
/// Capability allowing the bearer to mint and burn
/// coins of type `T`. Transferable
public struct TreasuryCap<phantom T> has key, store {
    id: UID,
    total_supply: Supply<T>
}
```

**Purpose:** Controls the power to create and destroy coins

**Characteristics:**
- **Singleton:** Only ONE per token type (enforced by One-Time Witness pattern)
- **Transferable:** Can be given to another address
- **Stores `Supply<T>`:** Tracks total circulating supply
- **Capability pattern:** Possession = permission to mint/burn

**Critical:** Whoever owns the `TreasuryCap` controls the token supply!

---

### 4. `Supply<T>` - Total Supply Tracker

```move
/// A Supply of T. Used for minting and burning.
/// Wrapped into a `TreasuryCap` in the `Coin` module.
public struct Supply<phantom T> has store {
    value: u64
}
```

**Purpose:** Tracks total amount of tokens in circulation
**Updates:** Automatically when minting/burning via `TreasuryCap`

---

### 5. `CoinMetadata<T>` - Token Information

```move
public struct CoinMetadata<phantom T> has key, store {
    id: UID,
    decimals: u8,              // Decimal places (e.g., 9 for SUI)
    name: String,              // Full name (e.g., "Sui")
    symbol: String,            // Ticker symbol (e.g., "SUI")
    description: String,       // Token description
    icon_url: Option<Url>      // Logo URL
}
```

**Purpose:** Stores display information about the token
**Common practice:** Freeze immediately after creation (make immutable)
**Display:** A coin with `value` 7002 and `decimals` 3 displays as 7.002

---

## Creating a Custom Coin

### Step 1: Define the Coin Type with One-Time Witness

```move
module my_project::my_coin {
    use sui::coin;
    use sui::tx_context::TxContext;
    use std::option;
    
    /// One-Time Witness - must match module name (in UPPERCASE)
    public struct MY_COIN has drop {}
    
    // ... rest of code
}
```

**One-Time Witness (OTW) Pattern:**
- Struct name must be **ALL CAPS** version of module name
- Must have **only** `drop` ability
- Automatically created ONCE when module is published
- Guarantees only ONE `TreasuryCap` can exist

---

### Step 2: Initialize in `init` Function

```move
fun init(witness: MY_COIN, ctx: &mut TxContext) {
    // Create the currency
    let (treasury_cap, metadata) = coin::create_currency(
        witness,                           // One-Time Witness
        9,                                 // decimals
        b"MYC",                           // symbol
        b"My Coin",                       // name
        b"My awesome custom coin",        // description
        option::none(),                   // icon URL (optional)
        ctx
    );
    
    // Freeze metadata (make immutable)
    transfer::public_freeze_object(metadata);
    
    // Transfer TreasuryCap to publisher
    transfer::public_transfer(treasury_cap, ctx.sender());
}
```

**What happens:**
1. `create_currency` validates the witness is OTW
2. Creates `TreasuryCap<MY_COIN>` with initial supply of 0
3. Creates `CoinMetadata<MY_COIN>` with token info
4. Returns both objects
5. Metadata is frozen (becomes immutable shared object)
6. TreasuryCap is sent to deployer (who can then mint/burn)

---

### Step 3: Add Mint Function

```move
public fun mint(
    treasury_cap: &mut TreasuryCap<MY_COIN>,
    amount: u64,
    recipient: address,
    ctx: &mut TxContext
) {
    let coin = coin::mint(treasury_cap, amount, ctx);
    transfer::public_transfer(coin, recipient);
}
```

**What this does:**
1. Takes mutable reference to `TreasuryCap` (doesn't consume it!)
2. Calls `coin::mint` to create new `Coin<MY_COIN>` object
3. Increases `total_supply` automatically
4. Transfers coin to recipient

**Result:** New `Coin<MY_COIN>` object created with balance = amount

---

### Step 4: Add Burn Function

```move
public fun burn(
    treasury_cap: &mut TreasuryCap<MY_COIN>,
    coin: Coin<MY_COIN>
): u64 {
    coin::burn(treasury_cap, coin)
}
```

**What this does:**
1. Takes `Coin<MY_COIN>` by value (consumes it!)
2. Destroys the coin object
3. Decreases `total_supply` automatically
4. Returns the amount burned

---

## Complete Example: Managed Coin

```move
module my_project::managed_coin {
    use sui::coin::{Self, TreasuryCap, Coin};
    use sui::tx_context::{Self, TxContext};
    use std::option;
    
    /// One-Time Witness
    public struct MANAGED_COIN has drop {}
    
    /// Module initializer - called once on publish
    fun init(witness: MANAGED_COIN, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            6,                                    // 6 decimals
            b"MGC",                              // symbol
            b"Managed Coin",                     // name
            b"An example managed coin",          // description
            option::none(),                      // no icon
            ctx
        );
        
        // Freeze metadata so it's immutable
        transfer::public_freeze_object(metadata);
        
        // Transfer TreasuryCap to sender
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }
    
    /// Mint new coins
    public fun mint(
        treasury_cap: &mut TreasuryCap<MANAGED_COIN>,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let coin = coin::mint(treasury_cap, amount, ctx);
        transfer::public_transfer(coin, recipient);
    }
    
    /// Burn existing coins
    public fun burn(
        treasury_cap: &mut TreasuryCap<MANAGED_COIN>,
        coin: Coin<MANAGED_COIN>
    ): u64 {
        coin::burn(treasury_cap, coin)
    }
}
```

---

## Common Coin Operations

### Creating Coins

```move
// Mint (requires TreasuryCap)
let coin = coin::mint(&mut treasury_cap, 1000, ctx);

// From balance
let coin = coin::from_balance(balance, ctx);
```

---

### Destroying Coins

```move
// Burn (requires TreasuryCap)
let amount = coin::burn(&mut treasury_cap, coin);

// Destroy zero-value coin (no cap needed)
coin::destroy_zero(coin);  // Only works if value is 0

// Into balance
let balance = coin::into_balance(coin);
```

---

### Reading Coin Values

```move
// Get coin value
let amount = coin::value(&coin);

// Get total supply
let total = coin::total_supply(&treasury_cap);
```

---

### Splitting and Merging

```move
// Split coin into two
let coin2 = coin::split(&mut coin1, 500, ctx);
// coin1 now has (original - 500), coin2 has 500

// Merge two coins
coin::join(&mut coin1, coin2);
// coin1 now has combined value, coin2 is destroyed
```

---

### Extracting Balance

```move
// Take some balance from coin
let balance = coin::balance_mut(&mut coin);
let extracted = balance::split(balance, 100);
// coin now has 100 less
```

---

## Important Coin Patterns

### Pattern 1: Pure Functions (Best Practice)

**DON'T** transfer inside core functions:

```move
// ✗ BAD - transfers inside function
public fun bad_mint(
    treasury_cap: &mut TreasuryCap<MY_COIN>,
    amount: u64,
    recipient: address,
    ctx: &mut TxContext
) {
    let coin = coin::mint(treasury_cap, amount, ctx);
    transfer::public_transfer(coin, recipient);  // ✗ Not composable!
}
```

**DO** return the coin:

```move
// ✓ GOOD - returns coin for caller to handle
public fun good_mint(
    treasury_cap: &mut TreasuryCap<MY_COIN>,
    amount: u64,
    ctx: &mut TxContext
): Coin<MY_COIN> {
    coin::mint(treasury_cap, amount, ctx)  // ✓ Composable!
}
```

**Why?** Returning allows:
- Use in Programmable Transaction Blocks (PTBs)
- Composition with other functions
- Flexibility for caller

---

### Pattern 2: Zero-Value Coin Handling

```move
// Always check for zero before operations
if (coin::value(&coin) == 0) {
    coin::destroy_zero(coin);
} else {
    // Process non-zero coin
}
```

---

### Pattern 3: Split with Remainder

```move
public fun split_exact(
    coin: &mut Coin<T>,
    amount: u64,
    ctx: &mut TxContext
): Coin<T> {
    assert!(coin::value(coin) >= amount, E_INSUFFICIENT_BALANCE);
    coin::split(coin, amount, ctx)
}
```

---

## Sui-Specific Coin Features

### 1. Regulated Currencies

**For compliance (KYC, sanctions, etc.):**

```move
// Create regulated currency with deny capability
let (treasury_cap, deny_cap, metadata) = coin::create_regulated_currency_v2(
    witness,
    decimals,
    symbol,
    name,
    description,
    icon_url,
    allow_global_pause,  // Can pause all transfers?
    ctx
);

// Add address to deny list
coin::deny_list_v2_add(&mut deny_cap, &mut deny_list, addr);

// Remove from deny list
coin::deny_list_v2_remove(&mut deny_cap, &mut deny_list, addr);
```

**Capabilities:**
- **`DenyCapV2<T>`:** Can deny specific addresses
- **`FreezeCapV2<T>`:** Can freeze addresses (prevent as input)
- **Global pause:** Stop all transfers (if enabled)

---

### 2. Programmable Transaction Blocks (PTBs)

**Unique to Sui:** Combine up to 1,024 operations in one transaction!

```javascript
// Example: Mint, split, and send in ONE transaction
const tx = new Transaction();

// Mint 1000 coins
const [coin] = tx.moveCall({
    target: `${packageId}::my_coin::mint`,
    arguments: [tx.object(treasuryCapId), tx.pure(1000)]
});

// Split into two coins
const [coin1, coin2] = tx.splitCoins(coin, [tx.pure(600)]);

// Transfer both
tx.transferObjects([coin1], recipient1);
tx.transferObjects([coin2], recipient2);

// Execute all at once!
await client.signAndExecuteTransaction({ transaction: tx });
```

**Benefits:**
- **Lower gas costs:** One transaction vs multiple
- **Atomic execution:** All or nothing
- **Higher composability:** Chain operations seamlessly

---

## Coin vs Balance vs Supply

| Type | Purpose | Where Used | Can Transfer? |
|------|---------|------------|---------------|
| `Coin<T>` | Transferable token object | Individual wallets, transactions | ✅ Yes (entire object) |
| `Balance<T>` | Numeric value holder | Inside `Coin<T>`, inside pools | ❌ No (just data) |
| `Supply<T>` | Total circulation tracker | Inside `TreasuryCap<T>` | ❌ No (singleton) |

---

## Deployment Example

### Deploy the Package

```bash
# Build
sui move build

# Publish
sui client publish --gas-budget 100000000

# Save package ID
export PACKAGE_ID=<package_id_from_output>
export TREASURY_CAP_ID=<treasury_cap_id_from_output>
```

---

### Mint Coins

```bash
sui client call \
    --package $PACKAGE_ID \
    --module my_coin \
    --function mint \
    --args $TREASURY_CAP_ID 1000000000 <recipient_address> \
    --gas-budget 10000000
```

---

### Burn Coins

```bash
# First get the coin ID
export COIN_ID=<coin_object_id>

# Burn it
sui client call \
    --package $PACKAGE_ID \
    --module my_coin \
    --function burn \
    --args $TREASURY_CAP_ID $COIN_ID \
    --gas-budget 10000000
```

---

## Common Errors and Solutions

### Error: `EBadWitness`

**Cause:** Witness passed to `create_currency` is not a One-Time Witness

**Solution:**
- Ensure struct name matches module name (uppercase)
- Struct must have only `drop` ability
- Call only in `init` function

---

### Error: `EInvalidArg` (split)

**Cause:** Trying to split more than coin's balance

**Solution:**
```move
assert!(coin::value(&coin) >= amount, E_INSUFFICIENT);
let split_coin = coin::split(&mut coin, amount, ctx);
```

---

### Error: `ENonZero`

**Cause:** Trying to destroy non-zero balance

**Solution:**
```move
// Check before destroying
if (balance::value(&balance) == 0) {
    balance::destroy_zero(balance);
} else {
    // Handle non-zero case
}
```

---

## Best Practices

### 1. Always Freeze Metadata

```move
// ✓ DO THIS
transfer::public_freeze_object(metadata);

// ✗ DON'T leave it mutable
transfer::public_transfer(metadata, someone);
```

---

### 2. Secure TreasuryCap

```move
// Option 1: Transfer to deployer
transfer::public_transfer(treasury_cap, ctx.sender());

// Option 2: Share object (anyone can mint - risky!)
transfer::share_object(treasury_cap);

// Option 3: Custom access control
public struct MintCap has key, store { id: UID }

public fun mint_with_cap(
    _cap: &MintCap,
    treasury_cap: &mut TreasuryCap<T>,
    amount: u64,
    ctx: &mut TxContext
): Coin<T> {
    coin::mint(treasury_cap, amount, ctx)
}
```

---

### 3. Handle Zero Coins

```move
// Return excess coins even if zero
public fun process_payment(
    mut coin: Coin<SUI>,
    amount: u64,
    ctx: &mut TxContext
): Coin<SUI> {
    let payment = coin::split(&mut coin, amount, ctx);
    // Process payment...
    coin  // Return remainder (even if zero)
}
```

---

### 4. Use Appropriate Decimals

```move
// SUI native coin
decimals: 9  // 1 SUI = 1_000_000_000 MIST

// Stablecoin (like USDC)
decimals: 6  // 1 USDC = 1_000_000 smallest units

// NFT / whole numbers only
decimals: 0  // No fractional amounts
```

---

## Comparison: Sui Coin vs Other Standards

| Feature | Sui `Coin<T>` | ERC-20 | Solana SPL Token |
|---------|---------------|---------|------------------|
| **Model** | Object-based | Account-based | Account-based |
| **Each token** | Separate object | Balance in mapping | Token account |
| **Minting** | Creates new object | Increases balance | Mints to account |
| **Transfer** | Object ownership change | Balance update | Account transfer |
| **Gas efficiency** | Very high (parallel execution) | Medium | High |
| **Composability** | PTBs (1024 ops) | Limited | Medium |

---

## Key Takeaways

1. **`Coin<T>` is an object:** Each coin is a separate Sui object with unique ID
2. **One-Time Witness pattern:** Ensures only ONE `TreasuryCap` per token type
3. **Phantom types:** `T` identifies the coin type without storing data
4. **Capability pattern:** `TreasuryCap` ownership = minting permission
5. **Freeze metadata:** Make token info immutable after creation
6. **Pure functions:** Return coins rather than transferring internally
7. **PTBs are powerful:** Combine multiple operations atomically
8. **Objects > Balances:** Sui's object model enables parallel execution
9. **Regulated options:** Built-in support for compliance features
10. **Type safety:** Move's type system prevents mixing different coin types

The Sui Coin standard leverages Sui's unique object model and parallel execution capabilities to provide a secure, efficient, and highly composable token standard!
Excellent questions! These show deep thinking about Sui Move's mechanics. Let me answer each one in detail:

---

## 1. TreasuryCap Ownership & Security Checks

**Q: Is `treasury_cap` owned by msg.sender? When we call mint, does it check ownership?**

### Understanding Ownership in Sui

**Short answer:** Yes, `TreasuryCap` is owned by an address, and ownership is checked **automatically by the Sui runtime** when you call the function, NOT inside the `mint` function itself!

### How It Works

```move
public fun mint(
    treasury_cap: &mut TreasuryCap<MY_COIN>,  // ← Takes mutable reference
    amount: u64,
    recipient: address,
    ctx: &mut TxContext
) {
    let coin = coin::mint(treasury_cap, amount, ctx);
    transfer::public_transfer(coin, recipient);
}
```

**Ownership check happens BEFORE the function executes:**

1. **Transaction sender** tries to call `mint`
2. **Sui runtime checks:** "Does this sender own the `TreasuryCap` object?"
3. **If YES:** Function executes
4. **If NO:** Transaction fails BEFORE the function even runs

**Analogy:** It's like showing your ID at the door - you can't even enter the room (function) if you don't own the key (TreasuryCap).

### Where Ownership is Enforced

```rust
// This is what happens in the Sui runtime (conceptually):

// Step 1: You submit transaction
tx.call_function(
    package_id,
    module: "my_coin",
    function: "mint",
    arguments: [treasury_cap_id, 1000, recipient]
)

// Step 2: Sui runtime checks (BEFORE function executes)
let treasury_cap = get_object(treasury_cap_id);
if (treasury_cap.owner != tx.sender) {
    abort("You don't own this TreasuryCap!")  // ← Fails here!
}

// Step 3: Only if check passes, function executes
my_coin::mint(&mut treasury_cap, 1000, recipient, ctx)
```

### Example: Trying to Use Someone Else's TreasuryCap

```bash
# Alice owns TreasuryCap (ID: 0xABC123)
# Bob tries to use it

$ sui client call \
    --function mint \
    --args 0xABC123 1000 <recipient> \
    --gas-budget 10000000

# ❌ ERROR: Transaction failed
# InvalidObjectOwnership: Object 0xABC123 is not owned by Bob
```

### No Explicit Check Needed in Code

```move
// ✓ CORRECT - No ownership check needed
public fun mint(
    treasury_cap: &mut TreasuryCap<MY_COIN>,
    amount: u64,
    recipient: address,
    ctx: &mut TxContext
) {
    // Runtime already verified ownership!
    // Just use it directly
    let coin = coin::mint(treasury_cap, amount, ctx);
    transfer::public_transfer(coin, recipient);
}

// ✗ UNNECESSARY - Ownership already checked
public fun mint_redundant(
    treasury_cap: &mut TreasuryCap<MY_COIN>,
    amount: u64,
    recipient: address,
    ctx: &mut TxContext
) {
    // This check is redundant!
    assert!(/* check owner somehow */, E_NOT_OWNER);
    
    let coin = coin::mint(treasury_cap, amount, ctx);
    transfer::public_transfer(coin, recipient);
}
```

### Shared Objects Exception

**Important exception:** If `TreasuryCap` is a **shared object**, anyone can access it!

```move
// In init function
fun init(witness: MY_COIN, ctx: &mut TxContext) {
    let (treasury_cap, metadata) = coin::create_currency(/*...*/);
    
    // Option 1: Owned object (only owner can use)
    transfer::public_transfer(treasury_cap, ctx.sender());
    
    // Option 2: Shared object (ANYONE can use!)
    transfer::share_object(treasury_cap);  // ⚠️ Dangerous!
}
```

If you share it, you need **manual permission checks**:

```move
public struct AdminCap has key, store { id: UID }

public fun mint_with_permission(
    _admin_cap: &AdminCap,  // ← Manual capability check
    treasury_cap: &mut TreasuryCap<MY_COIN>,
    amount: u64,
    recipient: address,
    ctx: &mut TxContext
) {
    // Only works if caller has AdminCap
    let coin = coin::mint(treasury_cap, amount, ctx);
    transfer::public_transfer(coin, recipient);
}
```

---

## 2. Initial Supply: Creating Coins at Genesis

**Q: What if I want 1000 initial supply instead of 0?**

### The Standard Pattern

`create_currency` always starts at **supply = 0**. To have initial supply, **mint immediately in `init`**:

```move
fun init(witness: MY_COIN, ctx: &mut TxContext) {
    let (mut treasury_cap, metadata) = coin::create_currency(
        witness,
        9,
        b"MYC",
        b"My Coin",
        b"My awesome coin",
        option::none(),
        ctx
    );
    
    // Supply is 0 here
    
    // Mint initial supply (e.g., 1,000,000 tokens)
    let initial_supply = 1_000_000 * 1_000_000_000; // 1M tokens with 9 decimals
    let initial_coin = coin::mint(&mut treasury_cap, initial_supply, ctx);
    
    // Options for initial supply:
    
    // Option 1: Give all to deployer
    transfer::public_transfer(initial_coin, ctx.sender());
    
    // Option 2: Split among multiple addresses
    let coin2 = coin::split(&mut initial_coin, 500_000_000_000_000, ctx);
    transfer::public_transfer(initial_coin, address1);
    transfer::public_transfer(coin2, address2);
    
    // Option 3: Put in a treasury/pool
    transfer::public_transfer(initial_coin, treasury_address);
    
    // Freeze metadata
    transfer::public_freeze_object(metadata);
    
    // Transfer or share TreasuryCap
    transfer::public_transfer(treasury_cap, ctx.sender());
}
```

### Complete Example: Fixed Supply Token

```move
module my_project::fixed_supply_coin {
    use sui::coin::{Self, TreasuryCap, Coin};
    use sui::tx_context::{Self, TxContext};
    use std::option;
    
    const TOTAL_SUPPLY: u64 = 1_000_000_000_000_000; // 1M tokens (9 decimals)
    
    public struct FIXED_SUPPLY_COIN has drop {}
    
    fun init(witness: FIXED_SUPPLY_COIN, ctx: &mut TxContext) {
        let (mut treasury_cap, metadata) = coin::create_currency(
            witness,
            9,
            b"FSC",
            b"Fixed Supply Coin",
            b"A coin with fixed supply",
            option::none(),
            ctx
        );
        
        // Mint entire supply
        let total_supply_coin = coin::mint(&mut treasury_cap, TOTAL_SUPPLY, ctx);
        
        // Give to deployer
        transfer::public_transfer(total_supply_coin, ctx.sender());
        
        transfer::public_freeze_object(metadata);
        
        // DESTROY the TreasuryCap so no more can be minted!
        transfer::public_freeze_object(treasury_cap);
        // Or truly destroy it:
        // let TreasuryCap { id, total_supply } = treasury_cap;
        // object::delete(id);
        // balance::destroy_supply(total_supply);
    }
}
```

### Why Not Built Into `create_currency`?

**Design reasons:**
1. **Flexibility:** Different distribution strategies (airdrop, vesting, pools)
2. **Gas costs:** Splitting/distributing might be expensive
3. **Atomic operations:** You might want to do other setup before minting
4. **Standard pattern:** Most tokens start at 0 and mint as needed

---

## 3. Why Decimals = 9?

**Q: Is 9 decimals a Sui standard?**

### Short Answer

**9 decimals is Sui's convention for the native SUI token**, but it's **NOT mandatory** for custom tokens!

### SUI Token Standard

```move
// sui::sui module
const EAlreadyMinted: u64 = 0;
const MIST_PER_SUI: u64 = 1_000_000_000; // 10^9

// SUI has 9 decimals
// 1 SUI = 1,000,000,000 MIST
```

### Choosing Decimals for Your Token

| Decimals | Use Case | Example | Smallest Unit |
|----------|----------|---------|---------------|
| **0** | Whole numbers only | NFTs, tickets, votes | 1 |
| **2** | Traditional currency cents | Points, credits | 0.01 |
| **6** | Stablecoins | USDC, USDT | 0.000001 |
| **8** | Bitcoin standard | Wrapped BTC | 0.00000001 |
| **9** | Sui standard | SUI, similar tokens | 0.000000001 |
| **18** | Ethereum standard | ETH-like tokens | 0.000000000000000001 |

### Examples

```move
// Gaming token (no fractions)
let (treasury_cap, metadata) = coin::create_currency(
    witness,
    0,      // ← 0 decimals (whole numbers only)
    b"GEM",
    b"Game Gems",
    b"In-game currency",
    option::none(),
    ctx
);
// User has 100 GEM = displays as "100"

// Stablecoin (6 decimals like USDC)
let (treasury_cap, metadata) = coin::create_currency(
    witness,
    6,      // ← 6 decimals
    b"USC",
    b"USD Coin",
    b"Stablecoin pegged to USD",
    option::none(),
    ctx
);
// User has 1_500_000 = displays as "1.50" USD

// SUI-like token (9 decimals)
let (treasury_cap, metadata) = coin::create_currency(
    witness,
    9,      // ← 9 decimals (Sui convention)
    b"MYSUI",
    b"My Sui Token",
    b"Similar to native SUI",
    option::none(),
    ctx
);
// User has 2_500_000_000 = displays as "2.5" tokens
```

### Display Formula

```
Display Value = Raw Value / (10 ^ decimals)

// Examples:
Raw: 7002, Decimals: 3 → Display: 7002 / 1000 = 7.002
Raw: 1_000_000_000, Decimals: 9 → Display: 1_000_000_000 / 1_000_000_000 = 1.0
Raw: 1_500_000, Decimals: 6 → Display: 1_500_000 / 1_000_000 = 1.5
```

### Best Practices

**Use 9 decimals if:**
- Creating a general-purpose token
- Want consistency with SUI
- Need high precision

**Use fewer decimals if:**
- Token represents whole items (NFTs, tickets)
- Want simpler user experience
- Lower precision is sufficient

**Use more decimals (18) if:**
- Porting from Ethereum
- Need extremely high precision
- Interoperating with Ethereum-based systems

---

## 4. Non-Entry Functions as Transactions

**Q: `public fun mint` is not entry function, how can it be called as transaction?**

### Great Catch! You Found the Issue

**You're absolutely right!** A `public fun` by itself **CANNOT** be called directly as a transaction entry point.

### Three Ways to Make Functions Callable

#### Option 1: Mark as `entry`

```move
// ✓ Can be called directly in transactions
public entry fun mint(
    treasury_cap: &mut TreasuryCap<MY_COIN>,
    amount: u64,
    recipient: address,
    ctx: &mut TxContext
) {
    let coin = coin::mint(treasury_cap, amount, ctx);
    transfer::public_transfer(coin, recipient);
}
```

**Restrictions for `entry` functions:**
- Can only return types with `drop` ability (or nothing)
- Parameters must be primitives, objects, or references

#### Option 2: Use Programmable Transaction Blocks (PTBs)

```javascript
// Even without 'entry', you can call via PTB!
const tx = new Transaction();

// Call the public function
tx.moveCall({
    target: `${packageId}::my_coin::mint`,
    arguments: [
        tx.object(treasuryCapId),
        tx.pure(1000, 'u64'),
        tx.pure(recipientAddress, 'address')
    ]
});

await client.signAndExecuteTransaction({ transaction: tx });
```

**This works because PTBs have special privileges!**

#### Option 3: Pure Function + Entry Wrapper

```move
// Pure function - returns Coin (composable)
public fun mint(
    treasury_cap: &mut TreasuryCap<MY_COIN>,
    amount: u64,
    ctx: &mut TxContext
): Coin<MY_COIN> {
    coin::mint(treasury_cap, amount, ctx)
}

// Entry wrapper - for direct transactions
public entry fun mint_and_transfer(
    treasury_cap: &mut TreasuryCap<MY_COIN>,
    amount: u64,
    recipient: address,
    ctx: &mut TxContext
) {
    let coin = mint(treasury_cap, amount, ctx);
    transfer::public_transfer(coin, recipient);
}
```

**Best practice:** Provide both!
- `mint()` - composable, returns coin
- `mint_and_transfer()` - convenience entry function

### Why the Confusion?

In the documentation examples, they often show:

```bash
sui client call \
    --function mint \
    --module my_coin \
    --args ...
```

This works because `sui client call` uses PTBs under the hood! It can call `public` functions.

### Complete Best Practice Pattern

```move
module my_project::my_coin {
    use sui::coin::{Self, TreasuryCap, Coin};
    use sui::tx_context::TxContext;
    
    public struct MY_COIN has drop {}
    
    // Core logic - pure, composable (no entry)
    public fun mint(
        treasury_cap: &mut TreasuryCap<MY_COIN>,
        amount: u64,
        ctx: &mut TxContext
    ): Coin<MY_COIN> {
        coin::mint(treasury_cap, amount, ctx)
    }
    
    // Convenience wrapper - direct transaction (entry)
    public entry fun mint_and_transfer(
        treasury_cap: &mut TreasuryCap<MY_COIN>,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let coin = mint(treasury_cap, amount, ctx);
        transfer::public_transfer(coin, recipient);
    }
    
    // Another entry wrapper - mint to self
    public entry fun mint_to_sender(
        treasury_cap: &mut TreasuryCap<MY_COIN>,
        amount: u64,
        ctx: &mut TxContext
    ) {
        let coin = mint(treasury_cap, amount, ctx);
        transfer::public_transfer(coin, ctx.sender());
    }
}
```

---

## 5. Init Called Only Once?

**Q: Is `init` called only once in package lifetime?**

### Short Answer

**YES! `init` is called exactly ONCE when the package is published**, never again.

### How Init Works

```move
fun init(witness: MY_COIN, ctx: &mut TxContext) {
    // This runs EXACTLY ONCE when package is deployed
    let (treasury_cap, metadata) = coin::create_currency(/*...*/);
    
    transfer::public_freeze_object(metadata);
    transfer::public_transfer(treasury_cap, ctx.sender());
}
```

**Timeline:**

1. **You run:** `sui client publish`
2. **Sui runtime:**
   - Publishes package to blockchain
   - **Automatically calls `init()` once**
   - Creates One-Time Witness
   - Passes it to `init()`
3. **After deployment:** `init()` never runs again

### What Happens on Upgrade?

```bash
# First deployment
sui client publish

# Later upgrade
sui client upgrade

# ❌ init() does NOT run again on upgrade!
```

**Important:** Package upgrades do **NOT** call `init()` again!

### One-Time Witness Guarantee

```move
public struct MY_COIN has drop {}

fun init(witness: MY_COIN, ctx: &mut TxContext) {
    // 'witness' can only exist here, once!
    let (treasury_cap, metadata) = coin::create_currency(
        witness,  // ← Consumed here
        // ...
    );
}

// ❌ Can't call this again - witness is gone!
// ❌ Can't create another MY_COIN instance
```

The One-Time Witness pattern ensures:
- Only ONE `TreasuryCap` per token type
- Only ONE call to `create_currency`
- Only ONE `init` execution

### Testing Init

```move
#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    // Test helper that mimics init
    init(MY_COIN {}, ctx);
}

#[test]
fun test_initialization() {
    let mut scenario = test_scenario::begin(@0x1);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        init_for_testing(ctx);
    };
    // Verify TreasuryCap was created, etc.
    test_scenario::end(scenario);
}
```

### What If You Need Re-Initialization?

**You don't!** Design your system differently:

```move
// ✗ BAD - trying to re-init
public fun reinit() {
    // Can't do this - init is one-time only
}

// ✓ GOOD - separate admin function
public struct AdminCap has key { id: UID }

public fun update_config(
    _admin: &AdminCap,
    config: &mut Config,
    new_value: u64
) {
    config.value = new_value;
}
```

---

## Summary Table

| Question | Answer |
|----------|--------|
| **TreasuryCap ownership check?** | Automatic by Sui runtime BEFORE function executes |
| **Initial supply?** | Start at 0, mint in `init()` if you want initial supply |
| **Why 9 decimals?** | SUI convention, not mandatory - choose what fits your token |
| **Public fun as transaction?** | Use `entry` keyword OR call via PTB OR create entry wrapper |
| **Init once?** | YES - exactly once at publish, never on upgrade |

These are fundamental Sui Move concepts that differentiate it from other blockchain platforms. Understanding them is key to writing secure and efficient Sui smart contracts!