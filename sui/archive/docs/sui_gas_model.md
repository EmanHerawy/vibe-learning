# Sui Gas Model

**Primary sources:**
- Sui Docs > Gas in Sui — https://docs.sui.io/concepts/tokenomics/gas-in-sui
- Sui Docs > Gas Optimization — https://docs.sui.io/guides/developer/sui-101/gas-optimization
- Move Book §8.6 Collections — https://move-book.com/programmability/collections

---

## The Two-Part Bill
> Source: Sui Docs > Gas in Sui — docs.sui.io/concepts/tokenomics/gas-in-sui

```
┌─────────────────────────────────────────────────────────────────────┐
│  Every Sui transaction has TWO separate fees                        │
├──────────────────────────┬──────────────────────────────────────────┤
│  COMPUTATION FEE         │  STORAGE FEE                            │
├──────────────────────────┼──────────────────────────────────────────┤
│  CPU work to execute     │  Bytes stored on-chain                  │
│  Dynamic — set each      │  Fixed: 1 byte = 100 storage units      │
│  epoch by validators     │  Refundable: 99% back when deleted      │
│                          │                                          │
│  Like: handling fee      │  Like: warehouse rent — paid upfront,   │
│  (what they DO)          │  mostly refunded when you leave         │
└──────────────────────────┴──────────────────────────────────────────┘

Net cost = computation + storage_written - (99% × storage_deleted)
```

---

## Gas Budget — Cap, Not Charge
> Source: Sui Docs > Gas in Sui — docs.sui.io/concepts/tokenomics/gas-in-sui

```
┌───────────────────────────────────────────────────────────────────┐
│  Common mistake: "Setting budget high = validators keep extra"    │
│  ❌ WRONG                                                         │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Gas budget = maximum ceiling, NOT a payment                     │
│                                                                   │
│  Budget: $100     Actual cost: $40                               │
│  ──────────────────────────────────────────────────              │
│  You pay: $40     Excess returned: $60      Validators get: $0  │
│                                                                   │
│  Budget: $100     Actual cost: $120                              │
│  ──────────────────────────────────────────────────              │
│  Transaction ABORTS. You pay the computation fee for the abort.  │
│                                                                   │
│  Think: restaurant tab limit. $100 max.                          │
│  If your food costs $40 → you pay $40.                           │
│  If your food costs $120 → kitchen cancels the order.            │
└───────────────────────────────────────────────────────────────────┘
```

---

## Reference Gas Price (RGP) — How Validators Set Fees
> Source: Sui Docs > Gas in Sui — docs.sui.io/concepts/tokenomics/gas-in-sui

```
Every epoch start:
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  All validators submit their reservation price                │
│        ↓                                                       │
│  Protocol sorts by stake weight                               │
│        ↓                                                       │
│  2/3 stake percentile = Reference Gas Price (RGP)             │
│        ↓                                                       │
│  ┌───────────────────────────────────────────────────────┐    │
│  │  Price at/below RGP  →  Boosted staking rewards       │    │
│  │  Price above RGP     →  Reduced staking rewards       │    │
│  └───────────────────────────────────────────────────────┘    │
│                                                                │
│  No hard cap — constraint is economic incentive.              │
│  Coordinated price attack = controlling >2/3 stake            │
│  (same threshold as network takeover)                         │
│                                                                │
└────────────────────────────────────────────────────────────────┘

Analogy: airport taxi price board. All taxis post their price.
Board shows the 2/3 stake price as standard fare.
Taxis charging more lose customers + bonus points.
Competition keeps it honest — no governance cap needed.
```

---

## Storage Rebates
> Source: Sui Docs > Gas in Sui — docs.sui.io/concepts/tokenomics/gas-in-sui

```
┌────────────────────────────────────────────────────────────────┐
│  CREATE object → pay storage fee (N bytes × 100 units/byte)   │
│  DELETE object → get 99% of original fee BACK                 │
│  1% stays in Storage Fund (permanent, non-refundable)          │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Ephemeral pattern:                                            │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐   │
│  │  create()    │ → │   use()      │ → │  delete()        │   │
│  │  pay N units │   │  no storage  │   │  get 99% back    │   │
│  └──────────────┘   └──────────────┘   └──────────────────┘   │
│  Net cost ≈ 1% of N units + computation. Nearly free.         │
│                                                                │
│  Analogy: deposit on a rental locker.                         │
│  Pay deposit when you rent.                                    │
│  Get 99% back when you return the key.                        │
│  1% is the admin fee, gone forever.                           │
└────────────────────────────────────────────────────────────────┘
```

### Hot Potato Storage Cost
> Source: Move Book §8.16 Hot Potato — move-book.com/programmability/hot-potato

```
public struct Receipt { amount: u64 }   ← no key ability

Receipt lives only in execution context (Move stack).
It NEVER enters the Sui object store.
Storage fee: ZERO.
Only computation cost applies.

Rule: no key ability = no object store entry = no storage fee.
```

---

## Shared vs Owned — Performance Cost
> Source: Sui Docs > Gas in Sui — docs.sui.io/concepts/tokenomics/gas-in-sui · Sui Docs > Object Ownership — docs.sui.io/concepts/object-ownership

```
┌─────────────────────────────────────────────────────────────────┐
│                      TWO EXECUTION PATHS                        │
├──────────────────────────────┬──────────────────────────────────┤
│  OWNED OBJECT (fast path)    │  SHARED OBJECT (consensus)       │
├──────────────────────────────┼──────────────────────────────────┤
│  Only you can touch it       │  Anyone can touch it             │
│  Skip validator consensus    │  Multi-round validator agreement  │
│  ~100ms latency              │  ~500ms+ latency                 │
│  Parallel: no coordination   │  Serialized: one at a time       │
│  Lower gas                   │  Higher gas                      │
└──────────────────────────────┴──────────────────────────────────┘

Under high load:
  Owned  → thousands of txs execute in parallel. No bottleneck.
  Shared → all txs queue through one consensus gate.
           1000 users on one shared object = 1000 sequential rounds.
```

### Sharding — The Fix for Hot Shared Objects
> Source: Sui Docs > Gas Optimization — docs.sui.io/guides/developer/sui-101/gas-optimization

```
ONE shared object:
  [OrderBook] ← all 10,000 users queue here → serialized, slow

SHARDED (16 copies):
  [OrderBook_0]  [OrderBook_1]  ...  [OrderBook_15]
  ↑               ↑                   ↑
  Route by hash(asset_pair) % 16

Result: 16x throughput. Each shard has its own consensus queue.

Analogy: opening multiple checkout lanes.
One lane = queue. 16 lanes = 16x parallel throughput.
Same store, same products, parallel processing.
```

---

## Gas Optimization Checklist — Audit View
> Source: Sui Docs > Gas Optimization — docs.sui.io/guides/developer/sui-101/gas-optimization · Move Book §8.6 — move-book.com/programmability/collections

```
┌──────────────────────────────────────────────────────────────────────┐
│  Pattern                        │ Severity │ Why it's a problem      │
├─────────────────────────────────┼──────────┼─────────────────────────┤
│  Unbounded iteration (Table/    │ CRITICAL │ Gas grief: attacker     │
│  vector with no size cap)       │          │ inflates → lock funds   │
│  distribute_rewards loops over  │          │                         │
│  all users                      │          │                         │
├─────────────────────────────────┼──────────┼─────────────────────────┤
│  Historical data in live objects│ HIGH     │ Storage bloat: no       │
│  (growing vector<T> never       │          │ delete path = no rebate │
│  cleaned up)                    │          │ Use events instead      │
├─────────────────────────────────┼──────────┼─────────────────────────┤
│  Hot shared object under load   │ HIGH     │ Serializes all txs.     │
│  (all users → one shared state) │          │ Shard if > N users      │
├─────────────────────────────────┼──────────┼─────────────────────────┤
│  Shared Table + iteration loop  │ CRITICAL │ Compound: consensus     │
│  (both patterns together)       │ stacked  │ cost + unbounded loop   │
│                                 │          │ Fix BOTH or neither     │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Compound Vulnerability — Shared + Unbounded Iteration
> Source: Move Book §8.6 — move-book.com/programmability/collections · Sui Docs > Gas in Sui — docs.sui.io/concepts/tokenomics/gas-in-sui

```
ATTACK SCENARIO:
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│  Protocol: shared Table of all stakers                            │
│  Function: distribute_rewards() iterates entire Table             │
│                                                                    │
│  Step 1: Attacker opens 10,000 cheap stake accounts               │
│          (owned object txs — fast path, low cost)                 │
│          ↓                                                         │
│  Step 2: distribute_rewards() now must iterate 10,000 entries     │
│          Each call: consensus (~500ms) + 10,000 iterations         │
│          ↓                                                         │
│  Step 3: Gas cost exceeds any budget → ABORT                      │
│          Rewards locked forever. Protocol bricked.                │
│                                                                    │
│  Cost to attacker: cheap (owned object writes, no consensus)      │
│  Cost to protocol: catastrophic (consensus + unbounded iteration) │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

Fix requires BOTH:
  1. Pull-over-push → removes the loop (users claim their own rewards)
  2. Per-user owned Balance → removes consensus overhead

Fixing only one leaves the other attack vector open.

Analogy: flooding + fire
  Unbounded iteration alone = drowning protocol
  Shared object alone = slowing protocol
  Together: flood makes evacuation impossible, fire makes staying impossible
```

---

## Key Formulas
> Source: Sui Docs > Gas in Sui — docs.sui.io/concepts/tokenomics/gas-in-sui

```
Net gas cost:
  total = computation + storage_created - (99% × storage_deleted)

Storage fee:
  bytes × 100 storage_units/byte × price_per_unit

Ephemeral net cost:
  ~1% × original_storage_fee + computation

RGP:
  2/3 stake-weighted percentile of all validator bids
```

---

## Key Takeaways

```
┌─────────────────────────────────────────────────────────────────────┐
│  REMEMBER                                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Storage fee is a deposit. Delete objects → 99% back.          │
│     Ephemeral patterns and cleanup are near-free.                  │
│                                                                     │
│  2. Gas budget = ceiling. Validators never keep the excess.        │
│     You pay actual cost or the tx aborts.                          │
│                                                                     │
│  3. Shared objects = consensus = serialized traffic.               │
│     One hot shared object bottlenecks the whole protocol.          │
│     Shard when load is high.                                       │
│                                                                     │
│  4. Shared Table + loop = compound CRITICAL.                       │
│     Fix both (pull-over-push AND owned objects) or fix neither.   │
│                                                                     │
│  One sentence: "Storage is a deposit. Budget is a ceiling.        │
│  Shared objects cost consensus. Delete to reclaim."               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```
