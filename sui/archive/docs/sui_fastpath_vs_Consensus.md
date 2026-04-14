# Fastpath vs Consensus: Complete Guide

## The Fundamental Problem

```
When multiple people want to modify the same thing at the same time,
how do we decide the order?

Example:
┌─────────────────────────────────────────────────────────┐
│  Shared Bank Account (100 coins)                        │
│                                                         │
│  Alice: Withdraw 60 ──┐                                │
│                       ├──> Who goes first?             │
│  Bob: Withdraw 70 ────┘                                │
│                                                         │
│  If Alice first: 100 - 60 = 40 (Bob fails)             │
│  If Bob first: 100 - 70 = 30 (Alice fails)             │
│                                                         │
│  We need CONSENSUS to decide the order!                │
└─────────────────────────────────────────────────────────┘
```

---

## Sui's Two Paths

Sui gives you a **choice** based on whether your objects are shared or not:

```
┌────────────────────────────────────────────────────────────┐
│                    SUI'S TWO PATHS                         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Does your transaction touch shared objects?              │
│                                                            │
│         NO                              YES                │
│         │                               │                  │
│         ↓                               ↓                  │
│   ⚡ FASTPATH                     👥 CONSENSUS             │
│   (Simple & Fast)                (Coordinated & Slower)    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Fastpath Explained (Simple Transactions)

### What is Fastpath?

**Fastpath = "I own this, only I can touch it, no coordination needed"**

```
┌────────────────────────────────────────────────────────────┐
│  FASTPATH: Single-Owner Objects                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Alice owns Coin A (10 coins)                             │
│  Bob owns Coin B (20 coins)                               │
│                                                            │
│  ┌────────────┐                    ┌────────────┐         │
│  │  Coin A    │                    │  Coin B    │         │
│  │  Owner:    │                    │  Owner:    │         │
│  │  Alice     │                    │  Bob       │         │
│  │  Amount:10 │                    │  Amount:20 │         │
│  └────────────┘                    └────────────┘         │
│                                                            │
│  Alice transfers Coin A  ║  Bob transfers Coin B          │
│         │                ║         │                       │
│         │                ║         │                       │
│    NO CONFLICT!          ║    Execute independently       │
│    Different owners      ║    No coordination needed      │
│         │                ║         │                       │
│         ↓                ║         ↓                       │
│    ⚡ INSTANT             ║    ⚡ INSTANT                   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### How Fastpath Works

```
Step-by-step for Alice's transaction:

1. SUBMIT TRANSACTION
   ┌──────────────────┐
   │  Alice signs TX  │
   │  "Transfer my    │
   │   Coin A"        │
   └────────┬─────────┘
            │
            ↓
2. VALIDATOR CHECK (Simple & Quick)
   ┌──────────────────────────────────┐
   │  Validator checks:               │
   │  ✓ Is signature valid?           │
   │  ✓ Does Alice own Coin A?        │
   │  ✓ Is object version correct?    │
   │  ✓ Is transaction format valid?  │
   └────────┬─────────────────────────┘
            │
            ↓
3. EXECUTE IMMEDIATELY (No waiting!)
   ┌──────────────────────────────────┐
   │  ✓ Transfer executed             │
   │  ✓ Coin A owner → Charlie        │
   │  ✓ Version incremented           │
   │  ✓ Certificate issued            │
   └────────┬─────────────────────────┘
            │
            ↓
4. DONE! (Milliseconds!)
   ⚡ ~400ms total latency

No need to ask other validators "what order?"
Because only Alice can touch her coin!
```

### Fastpath Benefits

```
┌────────────────────────────────────────────────────────┐
│  FASTPATH ADVANTAGES                                   │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ⚡ Speed: ~400ms latency                             │
│     └─> No coordination = instant execution           │
│                                                        │
│  💰 Cost: Lower gas fees                              │
│     └─> Less computation, less validators involved    │
│                                                        │
│  📈 Scalability: Massive parallelism                  │
│     └─> Millions of independent transactions          │
│         can execute simultaneously                     │
│                                                        │
│  🎯 Simplicity: Straightforward logic                 │
│     └─> If you own it, you control it                │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Fastpath Requirements

```
Your transaction uses ONLY:
├─ Objects you exclusively own
├─ Immutable objects (anyone can read, no one can modify)
└─ No shared objects

Example Valid Fastpath Transactions:
✓ Transfer your NFT
✓ Transfer your coins
✓ Split your coin into smaller amounts
✓ Merge your coins together
✓ Read from immutable config objects
```

---

## Consensus Path Explained (Shared Objects)

### What is Consensus?

**Consensus = "Multiple people can access this, we need to agree on order"**

```
┌────────────────────────────────────────────────────────────┐
│  CONSENSUS: Shared Objects                                 │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Shared DEX Pool (1000 coins)                             │
│                                                            │
│  ┌──────────────────────────────┐                         │
│  │     Shared Trading Pool      │                         │
│  │     Anyone can trade         │                         │
│  │     Balance: 1000 coins      │                         │
│  └──────────────────────────────┘                         │
│              ↑         ↑                                   │
│              │         │                                   │
│    Alice: Buy 10   Bob: Buy 15                            │
│                                                            │
│  ⚠️  CONFLICT! Both want to modify same pool              │
│  👥 Need consensus to decide order                        │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### How Consensus Works

```
Step-by-step for shared object transaction:

1. SUBMIT TRANSACTION
   ┌──────────────────┐       ┌──────────────────┐
   │  Alice: Buy 10   │       │  Bob: Buy 15     │
   │  from Shared Pool│       │  from Shared Pool│
   └────────┬─────────┘       └────────┬─────────┘
            │                          │
            └──────────┬───────────────┘
                       ↓
2. SEND TO ALL VALIDATORS
   ┌────────────────────────────────────────┐
   │  Broadcast to validator committee      │
   │  ┌────┐  ┌────┐  ┌────┐  ┌────┐       │
   │  │ V1 │  │ V2 │  │ V3 │  │ V4 │  ...  │
   │  └────┘  └────┘  └────┘  └────┘       │
   │   All validators receive both TXs      │
   └────────────────────────────────────────┘
                       ↓
3. VALIDATORS VOTE ON ORDER
   ┌────────────────────────────────────────┐
   │  Validators agree on ordering:         │
   │  Majority decides:                     │
   │  1st: Alice's transaction              │
   │  2nd: Bob's transaction                │
   │                                        │
   │  Using Byzantine Fault Tolerant (BFT) │
   │  consensus protocol (Mysticeti)       │
   └────────────────────────────────────────┘
                       ↓
4. EXECUTE IN AGREED ORDER
   ┌────────────────────────────────────────┐
   │  Pool: 1000 coins                      │
   │  1. Execute Alice's: 1000 - 10 = 990  │
   │  2. Execute Bob's: 990 - 15 = 975     │
   │  ✓ Consistent state achieved           │
   └────────────────────────────────────────┘
                       ↓
5. DONE! (Slower due to coordination)
   ⏱️ ~500-800ms total latency

Need consensus because:
- Both modify the same shared pool
- Order matters for correctness
```

### Consensus Benefits

```
┌────────────────────────────────────────────────────────┐
│  CONSENSUS ADVANTAGES                                  │
├────────────────────────────────────────────────────────┤
│                                                        │
│  👥 Multi-Party Access                                │
│     └─> Multiple users can interact with same object  │
│                                                        │
│  🔒 Trustless Coordination                            │
│     └─> No need for trusted third party               │
│                                                        │
│  ✅ Automatic Ordering                                │
│     └─> Blockchain handles ordering logic             │
│                                                        │
│  🎮 Perfect for:                                      │
│     ├─ DEX pools                                      │
│     ├─ Shared game state                             │
│     ├─ DAOs with shared treasury                     │
│     └─ Multi-sig wallets                             │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Consensus Trade-offs

```
┌────────────────────────────────────────────────────────┐
│  CONSENSUS COSTS                                       │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ⏱️ Higher Latency: ~500-800ms                        │
│     └─> Need time for validators to agree             │
│                                                        │
│  💰 Higher Gas: More computation                      │
│     └─> All validators process the transaction        │
│                                                        │
│  🐌 Potential Contention                              │
│     └─> Very popular objects may have delays          │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## Visual Comparison: Fastpath vs Consensus

```
FASTPATH (Single-Owner):
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Alice's TX ──> Validator 1 ──> ✓ Execute ──> Done    │
│                    │                                    │
│                    └─> Simple check, instant execution │
│                                                         │
│  Time: ⚡ ~400ms                                       │
│  Gas: 💰 Low                                           │
│                                                         │
└─────────────────────────────────────────────────────────┘

CONSENSUS (Shared Object):
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Alice's TX ──┬──> Validator 1 ──┐                     │
│               ├──> Validator 2 ──┤                     │
│               ├──> Validator 3 ──┼──> Vote on order    │
│               ├──> Validator 4 ──┤                     │
│               └──> Validator N ──┘                     │
│                         │                               │
│                         ↓                               │
│                   Reach agreement                       │
│                         │                               │
│                         ↓                               │
│                   Execute in order                      │
│                         │                               │
│                         ↓                               │
│                      Done                               │
│                                                         │
│  Time: ⏱️ ~500-800ms                                   │
│  Gas: 💰💰 Higher                                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Now Let's Compare to Aptos

### Aptos Model (No Fastpath!)

```
┌────────────────────────────────────────────────────────────┐
│  APTOS: All Transactions Go Through Consensus             │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Aptos doesn't have a "Fastpath"                          │
│  Everything uses consensus ordering                        │
│                                                            │
│  Even if Alice transfers her own coin to Bob:             │
│  1. Submit transaction                                     │
│  2. Goes to consensus (Block-STM execution)               │
│  3. Validators order all transactions                      │
│  4. Execute in blocks                                      │
│  5. Finalize                                               │
│                                                            │
│  BUT: Aptos is SMART about parallelism                    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Aptos Block-STM (Parallel Execution)

```
┌────────────────────────────────────────────────────────────┐
│  APTOS: Block-STM (Software Transactional Memory)         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  1. OPTIMISTIC EXECUTION (Try parallel first)             │
│                                                            │
│  Block contains 100 transactions:                          │
│  TX1, TX2, TX3, TX4, ... TX100                            │
│                                                            │
│  Execute ALL in parallel optimistically:                   │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐                            │
│  │TX1 │ │TX2 │ │TX3 │ │TX4 │ ... (all at once)          │
│  └────┘ └────┘ └────┘ └────┘                            │
│                                                            │
│  2. DETECT CONFLICTS                                       │
│                                                            │
│  Did any transactions touch the same resource?             │
│  ├─ TX1 & TX2: Different accounts → ✓ OK                 │
│  ├─ TX3 & TX4: Same account → ⚠️ CONFLICT                │
│  └─ TX5 & TX6: Different accounts → ✓ OK                 │
│                                                            │
│  3. RE-EXECUTE CONFLICTS (in order)                       │
│                                                            │
│  TX3 → TX4 (sequential, correct order)                    │
│                                                            │
│  4. VALIDATE & COMMIT                                      │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Detailed Aptos Flow

```
Scenario: 1000 transactions in a block

┌─────────────────────────────────────────────────────────┐
│  STEP 1: OPTIMISTIC PARALLEL EXECUTION                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Try to execute all 1000 transactions in parallel:     │
│                                                         │
│  Thread 1: TX1, TX11, TX21, TX31 ...                   │
│  Thread 2: TX2, TX12, TX22, TX32 ...                   │
│  Thread 3: TX3, TX13, TX23, TX33 ...                   │
│  Thread 4: TX4, TX14, TX24, TX34 ...                   │
│  ...                                                    │
│  Thread N: TX10, TX20, TX30, TX40 ...                  │
│                                                         │
│  Each thread tracks reads & writes                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────────────────────┐
│  STEP 2: CONFLICT DETECTION                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Check if any transactions conflict:                    │
│                                                         │
│  TX5: Read Account A, Write Account A                  │
│  TX47: Read Account A, Write Account A                 │
│  ⚠️ CONFLICT! Both modified Account A                  │
│                                                         │
│  TX10: Write Account B                                  │
│  TX99: Write Account C                                  │
│  ✓ NO CONFLICT - Different accounts                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────────────────────┐
│  STEP 3: RE-EXECUTE CONFLICTS                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  For conflicting transactions (TX5 & TX47):            │
│  Execute in sequential order:                           │
│  1. TX5 (earlier in block)                             │
│  2. TX47 (later in block)                              │
│                                                         │
│  Keep results from non-conflicting transactions        │
│                                                         │
└─────────────────────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────────────────────┐
│  STEP 4: COMMIT FINAL STATE                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  All transactions executed correctly                    │
│  State is consistent                                    │
│  Block finalized                                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Direct Comparison: Sui vs Aptos

```
┌─────────────────────────────────────────────────────────────┐
│                  EXECUTION MODELS                           │
├──────────────────────────┬──────────────────────────────────┤
│  SUI                     │  APTOS                           │
├──────────────────────────┼──────────────────────────────────┤
│  Two paths:              │  One path:                       │
│  ├─ Fastpath (no consensus) │  └─ Block-STM (optimistic)   │
│  └─ Consensus (ordering) │                                  │
├──────────────────────────┼──────────────────────────────────┤
│  FASTPATH:               │  BLOCK-STM:                      │
│  Single-owner objects    │  Try parallel first              │
│  ├─ Instant execution    │  ├─ Detect conflicts             │
│  ├─ ~400ms latency       │  ├─ Re-execute if needed         │
│  └─ Very low gas         │  └─ ~600-1000ms latency          │
├──────────────────────────┼──────────────────────────────────┤
│  CONSENSUS:              │  ALL TRANSACTIONS:               │
│  Shared objects          │  Go through consensus            │
│  ├─ Validator voting     │  ├─ Ordered in blocks            │
│  ├─ ~500-800ms latency   │  ├─ Parallel execution attempted │
│  └─ Higher gas           │  └─ Sequential fallback          │
└──────────────────────────┴──────────────────────────────────┘
```

### Scenario Comparison

```
SCENARIO 1: Transfer your own coin
┌─────────────────────────────────────────────────────────┐
│  SUI:                                                   │
│  └─> Fastpath                                           │
│      ⚡ ~400ms, very low gas                           │
│      No consensus needed                                │
│                                                         │
│  APTOS:                                                 │
│  └─> Consensus + Block-STM                             │
│      ⏱️ ~600-1000ms, normal gas                        │
│      Goes through block ordering                        │
└─────────────────────────────────────────────────────────┘

SCENARIO 2: Swap on DEX (shared pool)
┌─────────────────────────────────────────────────────────┐
│  SUI:                                                   │
│  └─> Consensus (shared object)                         │
│      ⏱️ ~500-800ms, higher gas                         │
│      Validators order transactions                      │
│                                                         │
│  APTOS:                                                 │
│  └─> Consensus + Block-STM                             │
│      ⏱️ ~600-1000ms, normal gas                        │
│      If multiple swaps: detect conflicts, re-execute    │
└─────────────────────────────────────────────────────────┘

SCENARIO 3: 1000 independent transfers (different people)
┌─────────────────────────────────────────────────────────┐
│  SUI:                                                   │
│  └─> All use Fastpath                                   │
│      ⚡⚡⚡ Massive parallelism                         │
│      Each executes independently ~400ms                 │
│      TRUE parallel execution                            │
│                                                         │
│  APTOS:                                                 │
│  └─> Block-STM parallelization                         │
│      ⚡⚡ Good parallelism                              │
│      Optimistic execution, no conflicts detected        │
│      All execute in parallel ~600-1000ms                │
│      Need to wait for block consensus first             │
└─────────────────────────────────────────────────────────┘
```

---

## Key Insights

### Sui's Advantage

```
┌────────────────────────────────────────────────────────┐
│  SUI WINS when:                                        │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ✓ Most transactions are single-owner                 │
│    └─> Fastpath gives massive speed boost             │
│                                                        │
│  ✓ You want lowest possible latency                   │
│    └─> Fastpath ~400ms vs Block-STM ~600-1000ms      │
│                                                        │
│  ✓ High throughput of independent transactions        │
│    └─> True parallelism, no block waiting             │
│                                                        │
│  ✓ Simple transfers, payments, NFT trades             │
│    └─> Fastpath is perfect for these                  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Aptos's Advantage

```
┌────────────────────────────────────────────────────────┐
│  APTOS WINS when:                                      │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ✓ You don't want to think about ownership models     │
│    └─> One unified execution model                    │
│                                                        │
│  ✓ Complex shared state interactions                  │
│    └─> Block-STM handles conflicts elegantly          │
│                                                        │
│  ✓ Developer simplicity                               │
│    └─> Don't need to optimize for fastpath           │
│                                                        │
│  ✓ Predictable performance                            │
│    └─> All transactions treated similarly             │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## Real-World Analogy

```
SUI is like a POST OFFICE with TWO LINES:
┌────────────────────────────────────────────────────┐
│                                                    │
│  EXPRESS LANE (Fastpath):                         │
│  ├─ Pre-stamped letters                           │
│  ├─ Address already validated                     │
│  ├─ Just drop and go                              │
│  └─> INSTANT processing                            │
│                                                    │
│  REGULAR LANE (Consensus):                        │
│  ├─ Packages needing sorting                      │
│  ├─ Multiple handlers coordinate                  │
│  ├─ Need to agree on processing order             │
│  └─> Takes more time                               │
│                                                    │
└────────────────────────────────────────────────────┘

APTOS is like AMAZON FULFILLMENT:
┌────────────────────────────────────────────────────┐
│                                                    │
│  ONE SYSTEM for everything:                       │
│  ├─ Receives all packages                         │
│  ├─ Sorts them automatically                      │
│  ├─ Processes many in parallel                    │
│  ├─ Re-sorts if conflicts detected                │
│  └─> Efficient, but all go through same system    │
│                                                    │
│  Smart optimization:                               │
│  ├─ Try parallel first                            │
│  ├─ Handle conflicts when found                   │
│  └─> Good throughput overall                       │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## Summary

```
┌─────────────────────────────────────────────────────────┐
│  KEY TAKEAWAYS                                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  SUI: Two-path approach                                │
│  ├─ Fastpath: Single-owner = instant (~400ms)          │
│  └─ Consensus: Shared objects = coordinated (~500-800ms)│
│                                                         │
│  APTOS: One-path approach                              │
│  └─ Block-STM: Everything through consensus (~600-1000ms)│
│      ├─ Optimistic parallel execution                  │
│      └─ Handle conflicts automatically                 │
│                                                         │
│  SUI is FASTER for simple single-owner transactions    │
│  APTOS is SIMPLER with unified execution model         │
│                                                         │
│  Both achieve parallelism:                             │
│  ├─ Sui: Via fastpath for independent objects          │
│  └─ Aptos: Via Block-STM optimistic execution          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```