# Essential Sui Concepts You Should Learn

Based on your background in Aptos Move, Polkadot, and blockchain security, here are the critical Sui concepts you should master:

---

## 1. 🔥 Programmable Transaction Blocks (PTBs) - **THE GAME CHANGER**

### What Makes PTBs Revolutionary

PTBs are Sui's **killer feature** that doesn't exist on any other blockchain including Aptos.

```
┌────────────────────────────────────────────────────────┐
│  TRADITIONAL BLOCKCHAIN (Including Aptos)              │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Want to: Mint NFT → List on marketplace → Add royalty│
│                                                        │
│  Requires:                                             │
│  ┌────────┐    ┌────────┐    ┌────────┐              │
│  │  TX 1  │ →  │  TX 2  │ →  │  TX 3  │              │
│  │  Mint  │    │  List  │    │ Royalty│              │
│  └────────┘    └────────┘    └────────┘              │
│                                                        │
│  Result: 3 transactions, 3 gas payments, 3 wait times │
│                                                        │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│  SUI WITH PTBs                                         │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Want to: Mint NFT → List on marketplace → Add royalty│
│                                                        │
│  Requires:                                             │
│  ┌──────────────────────────────────────────────┐     │
│  │          ONE TRANSACTION BLOCK               │     │
│  │  ┌────────┐  ┌────────┐  ┌────────┐         │     │
│  │  │Command1│→ │Command2│→ │Command3│         │     │
│  │  │  Mint  │  │  List  │  │ Royalty│         │     │
│  │  └────────┘  └────────┘  └────────┘         │     │
│  └──────────────────────────────────────────────┘     │
│                                                        │
│  Result: 1 transaction, 1 gas payment, 1 wait time    │
│  All commands execute atomically!                      │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### PTB Capabilities

```
┌────────────────────────────────────────────────────────┐
│  PTB: Up to 1,024 commands in ONE transaction          │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Available Commands:                                   │
│  ├─ MoveCall: Call any public Move function           │
│  ├─ TransferObjects: Send objects to addresses        │
│  ├─ SplitCoins: Split coins into smaller amounts      │
│  ├─ MergeCoins: Combine coins together                │
│  ├─ MakeMoveVec: Create vectors of values             │
│  ├─ Publish: Deploy a new package                     │
│  └─ Upgrade: Upgrade existing package                 │
│                                                        │
│  Key Features:                                         │
│  ✓ Chain commands together                            │
│  ✓ Use output of one as input to next                 │
│  ✓ All succeed or all fail (atomic)                   │
│  ✓ Access ANY public function on-chain                │
│  ✓ Massive gas savings                                │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Real Example: DeFi in One PTB

```typescript
// ONE transaction that does multiple things:
const tx = new Transaction();

// 1. Split some SUI from gas coin
const [depositCoin] = tx.splitCoins(tx.gas, [1000]);

// 2. Deposit into lending protocol
const [accountReceipt] = tx.moveCall({
  target: '0x123::bank::deposit',
  arguments: [depositCoin],
});

// 3. Borrow USDC using the deposit
const [borrowedUSDC] = tx.moveCall({
  target: '0x123::bank::borrow',
  arguments: [accountReceipt, tx.pure.u64(500)],
});

// 4. Swap half the USDC for SUI on DEX
const [swappedSUI] = tx.moveCall({
  target: '0x456::dex::swap',
  arguments: [borrowedUSDC, tx.pure.u64(250)],
});

// 5. Add liquidity to pool
tx.moveCall({
  target: '0x456::dex::add_liquidity',
  arguments: [swappedSUI, borrowedUSDC],
});

// All this happens in ONE transaction!
```

### Why This Matters for You

```
As a security auditor, PTBs introduce NEW attack vectors:
├─ Command ordering vulnerabilities
├─ Reentrancy through PTB chaining
├─ Gas griefing via complex PTBs
├─ Front-running entire multi-step flows
└─ Object reference manipulation

As a developer, PTBs enable:
├─ Better UX (one-click complex operations)
├─ Atomic swaps without escrow contracts
├─ Composability without wrapper contracts
└─ Flash loan-like patterns natively
```

---

## 2. 🎯 Abilities in Sui Move (Different from Aptos!)

### The Four Abilities

```
┌────────────────────────────────────────────────────────┐
│  ABILITY SYSTEM: Compiler-enforced type behavior      │
├─────────────┬──────────────────────────────────────────┤
│  ABILITY    │  MEANING                                 │
├─────────────┼──────────────────────────────────────────┤
│  key        │  Can be stored on-chain as object        │
│             │  MUST have id: UID as first field        │
├─────────────┼──────────────────────────────────────────┤
│  store      │  Can be stored inside other objects      │
│             │  Can be transferred                       │
├─────────────┼──────────────────────────────────────────┤
│  copy       │  Can be duplicated                       │
│             │  Usually for simple data types           │
├─────────────┼──────────────────────────────────────────┤
│  drop       │  Can be discarded/destroyed              │
│             │  Value can go out of scope               │
└─────────────┴──────────────────────────────────────────┘
```

### Critical Differences: Sui vs Aptos

```
┌────────────────────────────────────────────────────────────┐
│  SUI: key = Object (MUST have id: UID)                     │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  struct Sword has key, store {                            │
│    id: UID,          // ← REQUIRED as first field         │
│    power: u64,                                            │
│  }                                                         │
│                                                            │
│  UID has ONLY store (no copy, no drop)                    │
│  Therefore: NO objects can have copy or drop!             │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  APTOS: key = Resource (stored in global storage)         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  struct Sword has key {                                   │
│    power: u64,       // ← No UID required                 │
│  }                                                         │
│                                                            │
│  Resources accessed via borrow_global                      │
│  Sui has NO global storage!                                │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Common Ability Patterns

```
┌────────────────────────────────────────────────────────┐
│  PATTERN 1: Object/Asset (NFT, Coin, etc.)             │
├────────────────────────────────────────────────────────┤
│  struct NFT has key, store {                           │
│    id: UID,                                            │
│    name: String,                                       │
│  }                                                     │
│                                                        │
│  ✓ Can be object (key)                                │
│  ✓ Can be transferred (store)                         │
│  ✗ Cannot be copied (valuable asset)                  │
│  ✗ Cannot be dropped (must handle explicitly)         │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│  PATTERN 2: Capability/Witness (Admin cap, etc.)      │
├────────────────────────────────────────────────────────┤
│  struct AdminCap has key, store {                     │
│    id: UID,                                            │
│  }                                                     │
│                                                        │
│  Same as asset, used for authorization                 │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│  PATTERN 3: Pure Data (no value)                       │
├────────────────────────────────────────────────────────┤
│  struct Metadata has copy, drop, store {              │
│    description: String,                                │
│    url: String,                                        │
│  }                                                     │
│                                                        │
│  ✓ Can be copied (safe to duplicate)                  │
│  ✓ Can be dropped (no value lost)                     │
│  ✓ Can be stored (metadata in objects)                │
│  ✗ Cannot be object (no key, no UID)                  │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│  PATTERN 4: One-Time Witness (OTW)                     │
├────────────────────────────────────────────────────────┤
│  struct MY_COIN has drop {}                           │
│                                                        │
│  Used ONCE in init function                            │
│  ✓ Can be dropped (single use)                        │
│  ✗ No other abilities (single purpose)                │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│  PATTERN 5: Hot Potato (must be consumed)             │
├────────────────────────────────────────────────────────┤
│  struct Request {                                      │
│    // NO abilities at all!                            │
│    data: vector<u8>,                                   │
│  }                                                     │
│                                                        │
│  ✗ Cannot be copied                                    │
│  ✗ Cannot be dropped                                   │
│  ✗ Cannot be stored                                    │
│  ✗ Cannot be object                                    │
│                                                        │
│  MUST be consumed by module that created it!           │
│  Used for enforcing action completion                  │
└────────────────────────────────────────────────────────┘
```

### Security Implications

```
┌────────────────────────────────────────────────────────┐
│  CRITICAL SECURITY RULES                               │
├────────────────────────────────────────────────────────┤
│                                                        │
│  1. Objects without drop MUST be:                     │
│     ├─ Transferred to someone                         │
│     ├─ Deleted explicitly                             │
│     └─ Consumed by another function                   │
│                                                        │
│  2. Hot potatoes FORCE completion:                     │
│     └─ Must call specific function to consume         │
│                                                        │
│  3. store ability controls transfer:                   │
│     ├─ Without store: only module can transfer        │
│     └─ With store: anyone can transfer               │
│                                                        │
│  4. UID uniqueness is guaranteed:                      │
│     └─ Bytecode verifier ensures fresh UIDs           │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 3. 📦 No Global Storage (Major Difference!)

### Aptos Model (What You Know)

```
┌────────────────────────────────────────────────────────┐
│  APTOS: Global Storage                                 │
├────────────────────────────────────────────────────────┤
│                                                        │
│  module my_module {                                    │
│    struct Token has key {                             │
│      balance: u64                                     │
│    }                                                   │
│                                                        │
│    public fun get_balance(addr: address): u64 {       │
│      borrow_global<Token>(addr).balance               │
│    }                                                   │
│  }                                                     │
│                                                        │
│  Can access ANY account's Token resource!             │
│  Global namespace: address x type → value             │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Sui Model (What You Need to Learn)

```
┌────────────────────────────────────────────────────────┐
│  SUI: NO Global Storage                               │
├────────────────────────────────────────────────────────┤
│                                                        │
│  module my_module {                                    │
│    struct Token has key, store {                      │
│      id: UID,                                         │
│      balance: u64                                     │
│    }                                                   │
│                                                        │
│    public fun get_balance(token: &Token): u64 {       │
│      token.balance                                    │
│    }                                                   │
│  }                                                     │
│                                                        │
│  Can ONLY access objects passed as arguments!         │
│  All objects passed explicitly to functions           │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Impact on Design

```
APTOS Pattern:
├─ Store data in accounts
├─ Access via borrow_global<T>(address)
├─ One large mapping of address → resource
└─ Implicit access to any account

SUI Pattern:
├─ Objects exist independently
├─ Pass objects explicitly as parameters
├─ Each object has unique ID
└─ Explicit ownership and access
```

---

## 4. 🔐 Transfer Functions (Public vs Private)

### The Two Categories

```
┌────────────────────────────────────────────────────────┐
│  PRIVATE TRANSFER (Module-Only)                        │
├────────────────────────────────────────────────────────┤
│                                                        │
│  transfer::transfer(obj, recipient)                   │
│  transfer::freeze_object(obj)                         │
│  transfer::share_object(obj)                          │
│                                                        │
│  Requirements:                                         │
│  ├─ T must have key                                   │
│  ├─ T defined in SAME module                          │
│  └─ Only this module can call these                   │
│                                                        │
│  Use Case: Restrict who can transfer your objects     │
│                                                        │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│  PUBLIC TRANSFER (Anyone Can Call)                     │
├────────────────────────────────────────────────────────┤
│                                                        │
│  transfer::public_transfer(obj, recipient)            │
│  transfer::public_freeze_object(obj)                  │
│  transfer::public_share_object(obj)                   │
│                                                        │
│  Requirements:                                         │
│  ├─ T must have key + store                           │
│  ├─ Can be from any module                            │
│  └─ Anyone can call these                             │
│                                                        │
│  Use Case: Freely transferable assets (NFTs, coins)   │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Example

```move
module my_nft::nft {
  struct NFT has key, store {
    id: UID,
    name: String,
  }

  struct SoulboundNFT has key {  // NO store!
    id: UID,
    owner: address,
  }

  // NFT: Anyone can transfer (has store)
  public fun anyone_can_transfer(nft: NFT, to: address) {
    transfer::public_transfer(nft, to);  // ✓ Works
  }

  // SoulboundNFT: Only this module can transfer (no store)
  public fun only_we_can_transfer(sbt: SoulboundNFT, to: address) {
    transfer::transfer(sbt, to);  // ✓ Works (private transfer)
    // transfer::public_transfer(sbt, to);  // ✗ Error! No store
  }
}

// From another module:
module other::user {
  fun try_transfer(nft: NFT, sbt: SoulboundNFT) {
    transfer::public_transfer(nft, @0x123);  // ✓ Works
    transfer::transfer(sbt, @0x123);  // ✗ Error! Wrong module
  }
}
```

---

## 5. 🎪 Entry Functions (PTB Restrictions)

### Entry vs Public

```
┌────────────────────────────────────────────────────────┐
│  PUBLIC FUNCTION                                       │
├────────────────────────────────────────────────────────┤
│  public fun swap(coin: Coin<SUI>): Coin<USDC>         │
│                                                        │
│  ✓ Callable from other Move modules                   │
│  ✓ Callable in PTBs                                    │
│  ✓ Can return any value                               │
│  ✓ Can be chained in PTBs                             │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│  ENTRY FUNCTION                                        │
├────────────────────────────────────────────────────────┤
│  entry fun claim_reward(ctx: &mut TxContext)          │
│                                                        │
│  ✓ Callable as transaction entry point                │
│  ✗ NOT callable from other Move modules               │
│  ✗ Can only return types with drop                    │
│  ⚠ Limited composability                              │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│  PUBLIC ENTRY (Both!)                                  │
├────────────────────────────────────────────────────────┤
│  public entry fun mint_nft(ctx: &mut TxContext)       │
│                                                        │
│  ✓ Callable as transaction entry                      │
│  ✓ Callable in PTBs                                    │
│  ✗ Still limited return types                         │
└────────────────────────────────────────────────────────┘
```

### When to Use Entry

```
Use entry for:
├─ Randomness functions (prevent back-running)
├─ Functions that should be terminal (end of PTB)
├─ Admin functions you don't want composable
└─ Security-sensitive operations

Use public for:
├─ DeFi functions (swaps, deposits, etc.)
├─ NFT operations
├─ Anything that should be composable
└─ Functions you want in PTBs
```

---

## 6. 🎨 Display Standard (NFT Metadata)

```
┌────────────────────────────────────────────────────────┐
│  Sui Display: Off-chain Metadata for Objects          │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Unlike Aptos, Sui has a built-in Display standard    │
│  that lets you define how objects appear in wallets   │
│                                                        │
│  module my_nft::nft {                                 │
│    struct NFT has key, store {                        │
│      id: UID,                                         │
│      name: String,                                    │
│      image_url: String,                               │
│    }                                                  │
│                                                       │
│    fun init(otw: NFT, ctx: &mut TxContext) {         │
│      let publisher = package::claim(otw, ctx);        │
│      let display = display::new<NFT>(&publisher, ctx);│
│                                                       │
│      display::add(&mut display, string::utf8(b"name"),│
│        string::utf8(b"{name}"));                      │
│      display::add(&mut display, string::utf8(b"image_url"),│
│        string::utf8(b"{image_url}"));                 │
│                                                       │
│      display::update_version(&mut display);           │
│      transfer::public_transfer(display, tx_context::sender(ctx));│
│    }                                                  │
│  }                                                    │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 7. 🔄 Dynamic Fields (Sui's Storage Solution)

Since there's no global storage, Sui uses dynamic fields for extensible storage:

```move
module my_module::storage {
  use sui::dynamic_field as df;
  use sui::dynamic_object_field as dof;

  struct Container has key {
    id: UID,
  }

  // Add data dynamically
  public fun add_data(container: &mut Container, key: String, value: u64) {
    df::add(&mut container.id, key, value);
  }

  // Add objects dynamically
  public fun add_object<T: key + store>(
    container: &mut Container, 
    key: String, 
    obj: T
  ) {
    dof::add(&mut container.id, key, obj);
  }

  // Read
  public fun read(container: &Container, key: String): &u64 {
    df::borrow(&container.id, key)
  }
}
```

---

## Priority Learning Path

```
┌────────────────────────────────────────────────────────┐
│  RECOMMENDED LEARNING ORDER                            │
├────────────────────────────────────────────────────────┤
│                                                        │
│  1. ⭐⭐⭐ PTBs (Unique to Sui, game-changing)          │
│  2. ⭐⭐⭐ Abilities (Different from Aptos)              │
│  3. ⭐⭐⭐ No Global Storage (Major paradigm shift)      │
│  4. ⭐⭐ Transfer functions (Public vs Private)          │
│  5. ⭐⭐ Dynamic Fields (Storage mechanism)              │
│  6. ⭐ Entry functions (PTB considerations)             │
│  7. ⭐ Display standard (Nice to have)                  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## Quick Comparison Cheat Sheet

```
┌───────────────────────┬─────────────────┬─────────────────┐
│  FEATURE              │  APTOS          │  SUI            │
├───────────────────────┼─────────────────┼─────────────────┤
│  Transaction Model    │  Single action  │  PTB (1024 cmd) │
├───────────────────────┼─────────────────┼─────────────────┤
│  Global Storage       │  Yes            │  No             │
├───────────────────────┼─────────────────┼─────────────────┤
│  Object ID            │  Optional       │  UID required   │
├───────────────────────┼─────────────────┼─────────────────┤
│  key ability          │  = Resource     │  = Object       │
├───────────────────────┼─────────────────┼─────────────────┤
│  Data access          │  borrow_global  │  Pass as param  │
├───────────────────────┼─────────────────┼─────────────────┤
│  Ownership            │  Account-based  │  Object-based   │
├───────────────────────┼─────────────────┼─────────────────┤
│  Shared state         │  Via accounts   │  Shared objects │
└───────────────────────┴─────────────────┴─────────────────┘
```

---

## Resources for Deep Dive

1. **Official Sui Move Book**: https://move-book.com
2. **Sui Move Intro Course**: https://github.com/sui-foundation/sui-move-intro-course
3. **PTB Examples**: Practice building complex PTBs
4. **Sui Framework Code**: Read the source code
5. **Security Audits**: Study Sui-specific vulnerabilities

---

## Your Next Steps

Given your security background:

```
1. Build a complex PTB application
   └─> Understand new attack vectors

2. Study hot potato patterns
   └─> Used extensively in Sui DeFi

3. Analyze ability combinations
   └─> Each combo is a security model

4. Compare to Aptos patterns
   └─> Understand trade-offs

5. Review Sui security audits
   └─> Learn Sui-specific issues
```