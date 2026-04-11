# Block 1 — Theory: Complete Fe v26+ Syntax

Ground truth source: `rosetta/` and `learn/fe/examples/`. Every example shown is from those files — nothing invented.

---

## The One-Sentence Mental Model

Before any syntax: **Fe is Solidity with Rust's discipline.**

- Solidity gives you power with loose guardrails
- Rust gives you discipline but targets native code
- Fe gives you Solidity's EVM target + Rust's "declare your intent upfront" philosophy

The entire syntax flows from one design decision: **every function must declare what it's allowed to touch.** That declaration is the `uses` clause. Everything else is in service of making that declaration meaningful.

---

## Construct 1 — Import System

**WHY:** Fe has a standard library (`std`). You pull in only what you need — no implicit globals.

```fe
use std::abi::sol              // gives you the sol() selector function
use std::evm::{Evm, Call}      // gives you Evm and Call effect types
use std::evm::effects::assert  // assert (though it's also in the prelude)
use std::evm::crypto::keccak256
```

**Rule of thumb:** Most contracts only need `use std::abi::sol`. You add more only when you need `Call`, `Log`, `Evm`, or crypto ops.

From the ERC20 — only one import:
```fe
use std::abi::sol
```

From Counter — three imports because it uses `Evm` in tests:
```fe
use std::abi::sol
use std::evm::{Evm, Call}
use std::evm::effects::assert
```

**Auditor lens:** Imports tell you immediately what capabilities a contract reaches for. A contract importing `Call` can make external calls. A contract with only `sol` cannot.

---

## Construct 2 — Contract Declaration + Contract-Level `uses`

**WHY:** The contract header is a **capability manifest** — it declares what the contract is allowed to access at all. Handlers can only use a subset of what the contract declares here.

```fe
pub contract Counter {                                       // no uses = storage only
pub contract Token uses (ctx: Ctx) {                         // can access blockchain context
pub contract Vault uses (ctx: Ctx, call: mut Call) {         // can call externally
pub contract SimpleAmm uses (ctx: Ctx, log: mut Log) {       // can emit events
```

**Solidity comparison:** In Solidity, every function can call anything — there's no contract-level permission manifest. In Fe, if the contract doesn't declare `call: mut Call`, **no handler in it can ever make an external call.** The restriction is enforced at the type level.

**Analogy:** Think of the contract header as the security clearance level for the whole building. Individual rooms (handlers) can have lower clearance, but never higher than the building's maximum.

**Syntax rule:** At contract level and in free functions, effects use the `name: Type` form:
```
ctx: Ctx        call: mut Call      log: mut Log      evm: mut Evm
```

---

## Construct 3 — Storage Struct + StorageMap

**WHY:** In Solidity, state variables scatter anywhere in the contract body. In Fe, all storage is **one named struct** — one place, one shape, full visibility.

```fe
struct CounterStore {
    value: u256,
}

struct TokenStore {
    total_supply: u256,
    balances: StorageMap<Address, u256>,
    allowances: StorageMap<(Address, Address), u256>,  // tuple key
}
```

The struct is then declared inside the contract:
```fe
pub contract Counter {
    mut store: CounterStore    // this is the ONLY storage the contract has
}
```

**StorageMap API** — always named arguments:
```fe
store.balances.get(key: account)                              // read
store.balances.set(key: account, value: n)                    // write
store.allowances.get(key: (owner, spender))                   // tuple key read
store.allowances.set(key: (from, spender), value: allowed - amount)
```

**What Fe guarantees:** Any function with only `uses (store)` **cannot write** to storage — the compiler enforces it. Any function that writes storage must declare `uses (mut store)`.

**What Fe does NOT guarantee:** It won't enforce the order of operations inside a `mut store` function. If you call an external contract before updating storage (CEI violation), Fe won't stop you.

---

## Construct 4 — `msg` Block + Selectors

**WHY:** In Solidity, the public interface is scattered — every `public`/`external` function is implicitly part of it. In Fe, the public interface is **explicit and typed**: one `msg` block declares all callable variants.

```fe
msg CounterMsg {
    #[selector = sol("increment()")]
    Increment,                                         // no fields, no return

    #[selector = sol("get()")]
    Get -> u256,                                       // no fields, returns u256
}

msg Erc20 {
    #[selector = sol("transfer(address,uint256)")]
    Transfer { to: Address, amount: u256 } -> bool,   // fields + return

    #[selector = sol("totalSupply()")]
    TotalSupply -> u256,
}
```

**`sol()` function:** Computes the standard Solidity-compatible 4-byte keccak selector at **compile time**. Same algorithm as Solidity — so a Fe ERC20 is ABI-compatible with Solidity callers.

**Auditor lens:** The `msg` block is the complete attack surface of the contract. One place, fully typed, no hidden functions. Compare to Solidity where you must grep the entire file for `public` and `external`.

**Multiple msg types:** A contract can implement more than one `msg` type — this is how you compose interfaces:
```fe
recv Erc20 { ... }
recv Mintable { ... }   // same contract, two separate interfaces
```

---

## Construct 5 — `recv` Handlers + Per-Variant `uses`

**WHY:** This is where dispatch happens. Each variant of the `msg` enum gets its own handler with its own effects declaration.

```fe
recv CounterMsg {
    Increment uses (mut store) {
        store.value = store.value + 1
    }

    Get -> u256 uses (store) {
        store.value         // implicit return — last expression
    }
}
```

Key points:
- **`uses` is per-variant** — `Increment` needs `mut store`, `Get` only needs `store`
- **Short form inside handlers** — no `name: Type`, just the short name: `store`, `mut store`, `ctx`, `mut call`, `mut log`
- **Implicit return** — last expression is the return value (Rust style), no `return` keyword needed (though `return` works too)
- **`init()` is the constructor** — same `uses` clause pattern:

```fe
init(beneficiary: Address, arbiter: Address) uses (mut store, ctx) {
    store.depositor = ctx.caller()
    store.beneficiary = beneficiary
    ...
}
```

---

## Construct 6 — Effects System (all 6)

This is the core of Fe's safety model. Two syntax forms — memorize both:

**Declaration form** (contract header, free functions):
```
ctx: Ctx        — access blockchain context (caller, value, block number, address)
call: mut Call  — make external contract calls (call.call or call.static)
log: mut Log    — emit events (log.emit)
evm: mut Evm    — raw EVM ops (tests: deploy/call; production: mstore, calldataload)
```

**Usage form** (inside handlers and init):
```
store       — read storage
mut store   — read + write storage
ctx         — access blockchain context
mut call    — make external contract calls
mut log     — emit events
```

**Why `mut` on Call/Log/Evm?** The capability object is consumed/advanced by each call. `mut` signals "this operation has side effects on the external world." It's not about mutating a struct — it's about capability discipline.

**`call.call()` vs `call.static()`** — both require `mut Call`:
```fe
call.call(addr: x, gas: 100000, value: 0, message: Erc20::Transfer {...})    // state-changing
call.static(addr: x, gas: 100000, message: TokenMsg::BalanceOf { account })  // read-only
```

Counter-intuitive: even a static (read-only) external call requires `mut Call`. The `mut` is about consuming the capability, not about what the target does.

---

## Construct 7 — Events

**WHY:** Events in Fe are typed structs, not loose `emit` calls. The shape is enforced at compile time.

```fe
#[event]
struct LiquidityAdded {
    amount_a: u256,
    amount_b: u256,
}

#[event]
struct Swap {
    #[indexed]
    direction: u256,    // indexed = like Solidity's indexed, filterable in logs
    amount_in: u256,
    amount_out: u256,
}
```

Emitting:
```fe
log.emit(LiquidityAdded { amount_a, amount_b })
log.emit(Swap { direction: 0, amount_in, amount_out })
```

Requires `mut log` in the handler's `uses` clause and `log: mut Log` in the contract header.

**Auditor lens:** `mut log` in a `uses` clause means this function can write to the transaction log. If a critical state change has no `mut log`, it can't emit — which may mean missing audit trails.

---

## Construct 8 — Enums + `match`

**WHY:** Fe enums are algebraic — like Rust, not like Solidity's uint enums. Used for typed state machines.

```fe
pub enum State {
    Empty,
    Funded,
    Released,
}
```

Pattern matching:
```fe
match s {
    State::Empty    => 0,
    State::Funded   => 1,
    State::Released => 2,
}
```

Stored in storage like any other type:
```fe
struct EscrowStore {
    state: State,
    ...
}

store.state = State::Empty
store.state = State::Funded
```

**Helper functions** (from Escrow):
```fe
fn is_empty(s: State)  -> bool { state_disc(s) == 0 }
fn is_funded(s: State) -> bool { state_disc(s) == 1 }
```

---

## Construct 9 — Free Functions + `uses`

**WHY:** Logic that doesn't need to be in a handler — shared computation, pure math, or functions that need their own effects.

**Pure function** (no `uses` clause):
```fe
fn swap_amount(reserve_in: u256, reserve_out: u256, amount_in: u256) -> u256 {
    if amount_in == 0 || reserve_in == 0 || reserve_out == 0 { 0 }
    else { reserve_out * amount_in / (reserve_in + amount_in) }
}
```

**Function with effects** (declaration form — full `name: Type`):
```fe
fn token_balance(_ token: Address, _ account: Address) -> u256
    uses (call: mut Call)
{
    call.static(addr: token, gas: 100000, message: TokenMsg::BalanceOf { account })
}
```

**`_` prefix on parameters** — makes the argument positional at the call site (no label needed):
```fe
// declaration: _ means no label required at call site
fn token_balance(_ token: Address, _ account: Address) -> u256 ...

// call site: no label
token_balance(store.token, ctx.caller())
```

Without `_`, Fe requires named arguments at the call site.

---

## Construct 10 — `#[payable]` + `ctx` API

**`#[payable]`** — marks a handler as able to receive ETH. Without it, any ETH sent reverts.

```fe
recv EscrowMsg {
    #[payable]
    Deposit uses (mut store, ctx) {
        assert(is_empty(s: store.state))
        store.balance = ctx.value()   // read ETH sent with this call
        store.state = State::Funded
    }
}
```

**Full `ctx` API:**
```
ctx.caller()        — msg.sender equivalent (Address)
ctx.value()         — msg.value equivalent (u256, ETH in wei)
ctx.block_number()  — block.number equivalent (u256)
ctx.address()       — address(this) equivalent (Address)
```

---

## Construct 11 — Named Arguments (pervasive)

Fe uses named arguments almost everywhere. This is not optional syntax — it's the standard:

```fe
// StorageMap
store.balances.get(key: account)
store.balances.set(key: from, value: bal - amount)

// cross-contract call
call.call(addr: token, gas: 100000, value: 0, message: Erc20::TransferFrom { from, to, amount })

// test deployment
evm.create2<Token>(value: 0, args: (1000, owner), salt: 0)

// test call
evm.call(addr: token, gas: 100000, value: 0, message: Erc20::TotalSupply {})

// event emit
log.emit(Swap { direction: 0, amount_in, amount_out })
```

When a field name matches the variable name, you can use shorthand: `{ amount_in }` instead of `{ amount_in: amount_in }`.

---

## Construct 12 — Testing API

```fe
#[test]
fn test_counter() uses (evm: mut Evm) {
    // Deploy
    let addr = evm.create2<Counter>(value: 0, args: (), salt: 0)
    assert(addr.inner != 0)

    // Call (read)
    let val: u256 = evm.call(
        addr: addr, gas: 100000, value: 0,
        message: CounterMsg::Get {}
    )
    assert(val == 0)

    // Call (write)
    evm.call(addr: addr, gas: 100000, value: 0, message: CounterMsg::Increment {})

    // Address literal
    let alice = Address { inner: 0xA11CE }
}
```

`evm.create2<T>(value:, args:, salt:)` — deploys contract T. `args` is a tuple matching `init()` params. `salt` is for CREATE2 deterministic addressing.

---

## Theory Complete — Checkpoint

Before writing Counter, answer these without looking at source:

**Q1.** You're auditing a Fe contract. A handler's signature is:
```
Transfer { to, amount } -> bool uses (mut store, ctx)
```
State its complete blast radius in one sentence.

**Q2.** What's wrong with this contract header?
```fe
pub contract Vault {
    mut store: VaultStore
    recv VaultMsg {
        Deposit uses (mut call) { ... }
    }
}
```

**Q3.** A free function needs to make a read-only cross-contract call. What does its `uses` clause look like — and why is it surprising?
