# Sui Coin Registry — Creating Currencies

**Primary sources:**
- Sui Docs > Currency Standard — https://docs.sui.io/standards/currency
- Sui Docs > Create Fungible Tokens (Currency Standard) — https://docs.sui.io/guides/developer/coin/currency
- Sui Framework source — `sui::coin_registry` module

---

## Why `coin::create_currency` Was Deprecated
> Source: Sui Docs > Currency Standard — docs.sui.io/standards/currency

```
┌─────────────────────────────────────────────────────────────────────┐
│  OLD: coin::create_currency                                         │
├─────────────────────────────────────────────────────────────────────┤
│  Creates a floating CoinMetadata<T> object.                        │
│  No shared registry — wallets/DEXes must know your package address  │
│  to find your coin's metadata. Off-chain indexers only.             │
├─────────────────────────────────────────────────────────────────────┤
│  NEW: coin_registry::new_currency_with_otw / new_currency           │
├─────────────────────────────────────────────────────────────────────┤
│  Registers Currency<T> into CoinRegistry at address 0xc.           │
│  Any contract can look up any coin on-chain by type.               │
│  Wallets, DEXes, bridges all read from one shared source.          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Key Types
> Source: sui::coin_registry module source

| Type | What it is |
|------|-----------|
| `CurrencyInitializer<T>` | Hot potato — must be consumed by `finalize()`. Holds metadata before registration. |
| `Currency<T>` | The registered coin record. Sent to address 0xc by `finalize()`. |
| `MetadataCap<T>` | Capability returned by `finalize()`. Gates post-init name/symbol/description/icon updates. |
| `TreasuryCap<T>` | Unchanged — controls mint/burn. Transferred to sender in `init()`. |
| `DenyCapV2<T>` | Returned by `make_regulated()`. Controls the deny list. |
| `CoinRegistry` | Singleton shared object at address `0xc`. |

---

## Two Paths: OTW vs Non-OTW
> Source: Sui Framework source — `sui::coin_registry`

```
┌──────────────────────────────┬──────────────────────────────────────┐
│  OTW Path                    │  Non-OTW Path                        │
├──────────────────────────────┼──────────────────────────────────────┤
│  new_currency_with_otw()     │  new_currency()                      │
│  + finalize() in init tx     │  + finalize() in same tx             │
│  + finalize_registration()   │  (no second step needed)             │
│    in SEPARATE PTB           │                                      │
├──────────────────────────────┼──────────────────────────────────────┤
│  Required when: you need OTW │  Use when: no OTW required,         │
│  enforcement (one-time init  │  simpler flow, post-publish call     │
│  guarantee at package level) │                                      │
└──────────────────────────────┴──────────────────────────────────────┘
```

---

## OTW Flow — Three Stages
> Source: Sui Docs > Create Fungible Tokens · sui::coin_registry source

```
STAGE 1 — init() transaction (publish):
  ┌────────────────────────────────────────────────────────────────┐
  │  new_currency_with_otw(otw, decimals, symbol, name, desc,     │
  │                        icon_url, ctx)                          │
  │  → (CurrencyInitializer<T>, TreasuryCap<T>)                   │
  └───────────────────────┬────────────────────────────────────────┘
                          │
                          │  Optional config window:
                          │  builder.make_regulated(allow_pause, ctx)
                          │  → DenyCapV2<T>
                          │
                          ▼
  ┌────────────────────────────────────────────────────────────────┐
  │  builder.finalize(ctx)                                         │
  │  → MetadataCap<T>                                             │
  │                                                                │
  │  Side effect: transfers Currency<T> to address 0xc            │
  │  (not yet discoverable in CoinRegistry — needs step 2)        │
  └────────────────────────────────────────────────────────────────┘
          │
          │  transfer treasury_cap → ctx.sender()
          │  transfer metadata_cap → ctx.sender()
          │
          ▼  Package is now published. Currency<T> sits at 0xc unregistered.

STAGE 2 — separate PTB after publish:
  ┌────────────────────────────────────────────────────────────────┐
  │  coin_registry::finalize_registration<T>(                      │
  │      registry: &mut CoinRegistry,    // @0xc                  │
  │      currency: Receiving<Currency<T>>,                         │
  │      _ctx: &mut TxContext,                                     │
  │  )                                                             │
  │                                                                │
  │  Effect: Currency<T> promoted to derived shared object.       │
  │  Now discoverable on-chain by any contract.                   │
  └────────────────────────────────────────────────────────────────┘
```

**Why two transactions?** `finalize_registration()` needs `&mut CoinRegistry` (a shared object at 0xc). Shared objects can't be created and mutated in the same init transaction. So `finalize()` parks the `Currency<T>` at 0xc in init, and then a PTB promotes it.

---

## Function Signatures (Actual Source)
> Source: sui::coin_registry module source

```move
// Step 1 — call inside init()
public fun new_currency_with_otw<T: drop>(
    otw: T,
    decimals: u8,
    symbol: String,
    name: String,
    description: String,
    icon_url: String,
    ctx: &mut TxContext,
): (CurrencyInitializer<T>, TreasuryCap<T>)

// Optional — call on builder BEFORE finalize()
public fun make_regulated<T>(
    init: &mut CurrencyInitializer<T>,
    allow_global_pause: bool,
    ctx: &mut TxContext,
): DenyCapV2<T>

// Step 2 — call inside init(), after optional make_regulated()
public fun finalize<T>(
    builder: CurrencyInitializer<T>,
    ctx: &mut TxContext,
): MetadataCap<T>
// Side effect: transfers Currency<T> to 0xc

// Step 3 — SEPARATE PTB after publish
public fun finalize_registration<T>(
    registry: &mut CoinRegistry,          // @0xc
    currency: Receiving<Currency<T>>,
    _ctx: &mut TxContext,
)
```

---

## OTW Code Pattern — Standard (Unregulated)
> Source: Sui Docs > Create Fungible Tokens

```move
module my_pkg::my_coin {
    use sui::coin_registry;
    use sui::transfer;

    public struct MY_COIN has drop {}

    fun init(witness: MY_COIN, ctx: &mut TxContext) {
        let (builder, treasury_cap) = coin_registry::new_currency_with_otw(
            witness,
            6,
            b"MYC".to_string(),
            b"My Coin".to_string(),
            b"A simple unregulated coin".to_string(),
            b"https://example.com/icon.png".to_string(),
            ctx,
        );
        // No make_regulated() here — standard coin

        let metadata_cap = builder.finalize(ctx);
        // Currency<T> now at 0xc, waiting for finalize_registration

        transfer::public_transfer(treasury_cap, ctx.sender());
        transfer::public_transfer(metadata_cap, ctx.sender());
    }
}
```

Then run this PTB after publish:
```sh
sui client ptb \
    --assign @<CREATED_CURRENCY_OBJECT_ID> currency_to_promote \
    --move-call 0x2::coin_registry::finalize_registration \
        <PACKAGE>::my_coin::MY_COIN \
        @0xc \
        currency_to_promote
```

---

## OTW Code Pattern — Regulated (with DenyCap)
> Source: Sui Docs > Create Fungible Tokens

```move
fun init(witness: MY_COIN, ctx: &mut TxContext) {
    let (mut builder, treasury_cap) = coin_registry::new_currency_with_otw(
        witness, 6,
        b"REGULATED".to_string(),
        b"Regulated Coin".to_string(),
        b"A regulated coin".to_string(),
        b"https://example.com/icon.png".to_string(),
        ctx,
    );

    // make_regulated BEFORE finalize — order is enforced by hot potato
    let deny_cap = builder.make_regulated(true, ctx);

    let metadata_cap = builder.finalize(ctx);

    transfer::public_transfer(treasury_cap, ctx.sender());
    transfer::public_transfer(metadata_cap, ctx.sender());
    transfer::public_transfer(deny_cap, ctx.sender());
}
// Then run finalize_registration PTB (same as unregulated)
```

---

## Non-OTW Flow — Simpler, Single Transaction
> Source: sui::coin_registry module source

No OTW enforcement. Can be called from any function, not just `init()`. Calls `finalize()` internally, which shares the object directly — no second PTB needed.

```move
public fun new_currency(registry: &mut CoinRegistry, ctx: &mut TxContext): Coin<MyCoin> {
    let (mut currency, mut treasury_cap) = coin_registry::new_currency(
        registry,              // pass CoinRegistry directly
        6,
        b"MyCoin".to_string(),
        b"My Coin".to_string(),
        b"Description".to_string(),
        b"https://example.com/icon.png".to_string(),
        ctx,
    );
    let total_supply = treasury_cap.mint(TOTAL_SUPPLY, ctx);
    currency.make_supply_burn_only(treasury_cap);  // lock supply state
    let metadata_cap = currency.finalize(ctx);
    transfer::public_transfer(metadata_cap, ctx.sender());
    total_supply
}
```

---

## Key Differences: Old vs New
> Source: Sui Docs > Currency Standard · sui::coin_registry source

| | Old (`coin::create_currency`) | New (`coin_registry`) |
|---|---|---|
| Import | `sui::coin` | `sui::coin_registry` |
| Metadata object | Floating `CoinMetadata<T>` | `Currency<T>` in `CoinRegistry` at `0xc` |
| Steps (OTW) | 1 | 3 (new → finalize in init → finalize_registration in PTB) |
| Steps (non-OTW) | 1 | 2 (new → finalize, same tx) |
| String params | `&[u8]` bytes | `String` — use `b"...".to_string()` |
| Regulated setup | `coin::create_regulated_currency` | `make_regulated()` before `finalize()` |
| DenyCap type | `DenyCap<T>` | `DenyCapV2<T>` |
| Metadata updates | `CoinMetadata` directly | `MetadataCap<T>` required |
| Discoverability | Off-chain indexers only | Any on-chain contract, any wallet |
| TreasuryCap fate | Returned directly | Returned from step 1, transferred to sender |

---

## Common Mistakes
> Source: sui::coin_registry module source

| Mistake | What Happens | Fix |
|---------|-------------|-----|
| Calling `finalize_registration()` inside `init()` | Compile error / runtime abort — `CoinRegistry` is a shared object, can't be passed to init tx | Call it in a separate PTB after publish |
| Calling `make_regulated()` after `finalize()` | Impossible — `builder` is consumed by `finalize()` (hot potato) | Call `make_regulated()` BEFORE `finalize()` |
| Passing `TreasuryCap` to `finalize()` | Wrong — `finalize()` only takes `CurrencyInitializer<T>`. `TreasuryCap` goes to `transfer::public_transfer` | Transfer TreasuryCap to sender separately |
| Skipping `finalize_registration()` PTB | Currency<T> parks at 0xc but is never promoted — not discoverable by other contracts | Always run the PTB after publish |

---

## What Stays the Same

```
TreasuryCap<T>   →  mint / burn mechanics unchanged
coin::mint()     →  still the same call
coin::burn()     →  still the same call
DenyCapV2<T>     →  controls deny list (new type, same concept)
OTW pattern      →  still required for OTW path, enforces one-time init
```

---

## Key Takeaways

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. coin::create_currency is deprecated. Use coin_registry.         │
│     Import: use sui::coin_registry;                                  │
│                                                                     │
│  2. OTW path = THREE steps:                                         │
│     a) new_currency_with_otw() in init()                            │
│     b) [optional] make_regulated() on builder                       │
│     c) builder.finalize(ctx) in init() → MetadataCap<T>            │
│     d) finalize_registration() in SEPARATE PTB after publish        │
│                                                                     │
│  3. finalize() ≠ finalize_registration()                            │
│     finalize(): consumes builder, parks Currency<T> at 0xc         │
│     finalize_registration(): promotes Currency<T> to shared object  │
│                                                                     │
│  4. Non-OTW (new_currency): simpler — no second PTB needed.        │
│                                                                     │
│  5. MetadataCap<T> gates post-init metadata updates.               │
│     TreasuryCap<T> gates mint/burn — unchanged.                     │
│                                                                     │
│  ⚠️  finalize_registration() takes Receiving<Currency<T>>,          │
│     NOT TreasuryCap. The old docs were wrong about this.           │
└─────────────────────────────────────────────────────────────────────┘
```
