# Fe v26 vs Solidity — Limitations & Advantages

> Confirmed from rosetta/ examples and compiler errors during hands-on sessions (2026-04-10, 2026-04-11).
> Nothing invented — every item below was hit in practice or verified from source.

---

## Limitations (Fe v26 vs Solidity)

### 1. No ETH Transfer Primitive + Test VM Cannot Send ETH
- **Solidity:** `payable(addr).transfer(amount)` or `addr.call{value: x}("")`
- **Fe v26:** no equivalent — ETH received via `#[payable]` + `ctx.value()` can get stuck in the contract
- Every `call.call()` example in rosetta uses `value: 0`
- Workaround for transfer: none confirmed in v26
- **Test VM limitation:** `evm.call(value: x)` with x > 0 always reverts — the test account has 0 ETH. `ctx.value()` always returns 0 in tests. Payable behavior must be verified on a real network (Hardhat, Anvil, etc).
- **`#[payable]` implicit check (confirmed via Hardhat):** Fe's compiler inserts an implicit `require(CALLVALUE > 0)` guard on `#[payable]` handlers. Calling with value: 0 reverts. In Solidity, `payable` just allows ETH — value: 0 is fine. The Fe test VM masks this because all calls arrive with value: 0 (the guard never fires).

**Why `call.call()` can't replicate `addr.call{value: x}("")`:**
- Solidity's `addr.call{value: x}("")` sends ETH with **empty calldata** — target's `receive()` handles it
- Fe's `call.call()` requires a typed `message` argument — empty calldata is not possible in the typed system
- Fe contracts have no `receive()` or `fallback()` handler
- Raw EVM opcodes via `evm: mut Evm` could theoretically do it but no confirmed example exists

```fe
// What you'd want (doesn't exist in Fe v26):
call.call(addr: to, gas: 2300, value: amount)   // ❌ message arg required

// What exists (requires a typed message — useless for plain ETH send):
call.call(addr: to, gas: 100000, value: amount, message: SomeMsg::SomeVariant {})
```

---

### 2. No Typed Errors / Revert with Data
- **Solidity:**
  ```solidity
  error InsufficientBalance(uint256 have, uint256 want);
  revert InsufficientBalance(balance, amount);
  ```
- **Fe v26:** two options only:
  - `assert(condition)` — bare revert, no error selector, no data
  - `return false` — soft failure for bool-returning functions
- `#[error]` attribute does **not** exist in Fe v26
- **Auditor impact:** on-chain tooling sees bare reverts — harder to monitor and debug than Solidity custom errors

---

### 3. StorageMap Values Must Fit in One EVM Word
- **Solidity:** `mapping(address => MyStruct)` works natively
- **Fe v26:** map values must implement `WordRepr` trait:
  ```fe
  pub trait WordRepr {
      fn from_word(_: u256) -> Self
      fn to_word(own self) -> u256
  }
  ```
  Type must round-trip through a single `u256` (256 bits). Multi-field structs cannot implement this meaningfully.
- **Workaround:** separate maps per field
  ```fe
  // Instead of: StorageMap<Address, UserEscrow>
  struct Store {
      balances:      StorageMap<Address, u256>,
      release_times: StorageMap<Address, u256>,
      statuses:      StorageMap<Address, Status>,  // only if Status impls WordRepr
  }
  ```
- Enums CAN implement `WordRepr` (single discriminant fits in u256):
  ```fe
  impl WordRepr for Status {
      fn from_word(_ word: u256) -> Self {
          if word == 0 { Status::Empty }
          else if word == 1 { Status::Funded }
          else { Status::Released }
      }
      fn to_word(own self) -> u256 {
          match self {
              Status::Empty    => 0,
              Status::Funded   => 1,
              Status::Released => 2,
          }
      }
  }
  ```

---

### 4. No Inheritance or Override
- **Solidity:** `contract B is A`, `virtual`, `override`, multiple inheritance
- **Fe v26:** no inheritance at all — no `is`, no `virtual`, no `override`
- **Workaround:** composition via multiple `recv` blocks and shared `msg` types

---

### 5. No Function Modifiers
- **Solidity:** `modifier onlyOwner() { require(msg.sender == owner); _; }`
- **Fe v26:** no `modifier` keyword — guards must be inlined with `assert()` in every handler
  ```fe
  Release uses (mut store, ctx) {
      assert(ctx.caller() == store.owner)   // repeated in every restricted handler
      ...
  }
  ```

---

### 6. Selector Clash Prevention Not Implemented
- Fe's design goal was to fix Solidity's 4-byte selector clash risk
- **Fe v26 reality:** uses standard Solidity-compatible 4-byte selectors — same clash risk as Solidity today
- `#[selector = sol("...")]` computes identical keccak4 as Solidity

---

### 7. `call.static()` Requires `mut Call`
- **Solidity:** `staticcall` has no special caller requirement
- **Fe v26:** even a read-only external call requires declaring `call: mut Call` at contract level
  ```fe
  fn token_balance(...) -> u256 uses (call: mut Call) {
      call.static(...)   // read-only, but still needs mut Call
  }
  ```
- Reason: any external call crosses a trust boundary — Fe treats it as a side effect regardless

---

### 8. CEI Order Not Enforced
- **Solidity:** same problem
- **Fe v26:** `uses (mut store)` declares write capability but doesn't enforce when writes happen
- Reentrancy still possible if you make external calls before updating storage
- Fe's effects system shows you WHO can write, not WHEN they write

---

### 9. No Upgrade Safety Beyond Solidity
- Storage struct uses sequential slot assignment — same rules as Solidity
- Append-only, no-reorder discipline still required manually
- No built-in proxy/upgrade pattern or storage collision protection

---

### 10. No `block.timestamp` Confirmed
- **Solidity:** `block.timestamp` for time-based logic
- **Fe v26:** only `ctx.block_number()` confirmed in examples
- No timestamp equivalent found in any rosetta source
- **Workaround:** use block numbers (1 day ≈ 7200 blocks at 12s/block)

---

### 11. `#[selector]` Must Be Written Manually
- **Solidity:** selectors auto-computed from function signatures — invisible to developer
- **Fe v26:** `#[selector = sol("functionName(types)")]` required on every `msg` variant
- Whether omitting it causes a compiler error or auto-generates is **unconfirmed**

---

### 12. Named Arguments Required Everywhere
- **Solidity:** positional arguments — `set(key, value)`
- **Fe v26:** named arguments — `set(key: k, value: v)` — mandatory unless parameter has `_` prefix
- Not a safety issue but a syntax difference that catches Solidity developers off guard

---

## What Fe Adds Over Solidity

### Capability Ceiling at Contract Level
```fe
pub contract Vault uses (ctx: Ctx, call: mut Call) { ... }
```
If `call: mut Call` is not declared, NO handler can make external calls — enforced by compiler. Solidity has no equivalent.

### Complete Attack Surface in One Place
The `msg` block lists every callable function in one place — fully typed, no hidden `public`/`external` functions scattered across the file.

### Blast Radius Visible from Signature
```fe
Transfer { to, amount } -> bool uses (mut store, ctx)
```
From the `uses` clause alone you know: reads+writes storage, reads blockchain context, cannot emit events, cannot call externally. No need to read the function body.

### No Implicit Type Conversions
All casts are explicit — `u256(x)`, not silent widening. Mismatches are compiler errors.

### Typed Events
`#[event]` structs enforce event shape at compile time. No loose `emit` calls.

### Named Arguments = Fewer Argument-Order Bugs
`store.allowances.set(key: (owner, spender), value: amount)` — impossible to swap key and value silently.

---

## Quick Reference Card

| Feature | Solidity | Fe v26 |
|---|---|---|
| ETH transfer | `addr.transfer(x)` | ❌ none |
| Typed errors | `error E(); revert E()` | ❌ `assert()` only |
| Mapping to struct | `mapping(A => S)` | ❌ separate maps per field |
| Inheritance | `contract B is A` | ❌ none |
| Modifiers | `modifier m() { _; }` | ❌ inline `assert()` |
| Selector clash guard | ❌ none | ❌ none (planned) |
| Capability ceiling | ❌ none | ✅ contract-level `uses` |
| Attack surface | scattered | ✅ one `msg` block |
| Blast radius visible | ❌ read body | ✅ read `uses` clause |
| Implicit type cast | ✅ (risky) | ❌ explicit only |
| Block timestamp | `block.timestamp` | ❓ unconfirmed |
| Custom ABI dispatch | ❌ | ❓ planned, not in v26 |
