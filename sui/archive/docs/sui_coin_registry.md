# Sui Coin Registry — Creating Currencies

**Primary sources:**
- Sui Docs > Currency Standard — https://docs.sui.io/standards/currency
- Sui Docs > Create Currencies — https://docs.sui.io/guides/developer/coin/currency
- Sui Docs > Regulated Currencies — https://docs.sui.io/guides/developer/coin/regulated

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
│  NEW: coin_registry::new_currency_with_otw                          │
├─────────────────────────────────────────────────────────────────────┤
│  Registers metadata into CoinRegistry at address 0xc (singleton).  │
│  Any contract can look up any coin on-chain by type.               │
│  Wallets, DEXes, bridges all read from one shared source.          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Old vs New — Side by Side
> Source: Sui Docs > Currency Standard — docs.sui.io/standards/currency

```
OLD (deprecated):
┌──────────────────────────────────────────────────────────────────┐
│  use sui::coin;                                                   │
│                                                                  │
│  let (treasury_cap, metadata) = coin::create_currency<MY_COIN>( │
│      witness,                                                    │
│      6,              // decimals                                 │
│      b"MY_COIN",     // symbol — byte string                     │
│      b"My Coin",     // name                                     │
│      b"Description", // description                              │
│      option::some(url),                                          │
│      ctx                                                         │
│  );                                                              │
│  // metadata is a loose object — you freeze it yourself          │
└──────────────────────────────────────────────────────────────────┘

NEW (current):
┌──────────────────────────────────────────────────────────────────┐
│  use sui::coin_registry;                                         │
│                                                                  │
│  let (mut currency, treasury_cap) =                              │
│      coin_registry::new_currency_with_otw(                       │
│          otw,                                                    │
│          6,                        // decimals                   │
│          b"MY_COIN".to_string(),   // symbol — String now        │
│          b"My Coin".to_string(),   // name                       │
│          b"Description".to_string(),                             │
│          b"https://...icon".to_string(),                         │
│          ctx,                                                    │
│      );                                                          │
│                                                                  │
│  // Optional: configure before finalizing                        │
│  // let deny_cap = currency.make_regulated(true, ctx);           │
│                                                                  │
│  // Lock in and register at 0xc                                  │
│  currency.finalize_registration(treasury_cap, ctx);              │
└──────────────────────────────────────────────────────────────────┘
```

---

## Key Differences
> Source: Sui Docs > Currency Standard — docs.sui.io/standards/currency

| | Old | New |
|---|---|---|
| Import | `sui::coin` | `sui::coin_registry` |
| Metadata lives | Floating `CoinMetadata<T>` | Global `CoinRegistry` at `0xc` |
| Steps | One | Two (init → finalize) |
| String type | `&[u8]` / bytes | `String` (use `.to_string()`) |
| Regulated flow | Separate setup | `make_regulated()` before `finalize` |
| Discoverability | Off-chain indexers | Any on-chain contract |
| TreasuryCap | Returned directly | Returned from step 1, passed to `finalize` |

---

## Two-Step Flow Explained
> Source: Sui Docs > Create Currencies — docs.sui.io/guides/developer/coin/currency

```
Step 1 — new_currency_with_otw():
  ┌────────────────────────────────────────────────────────────┐
  │  Returns CurrencyInitializer<T> + TreasuryCap<T>          │
  │  Currency is NOT yet registered. You can still configure.  │
  └────────────────────────────────────────────────────────────┘
          │
          │  Optional config window:
          │  currency.make_regulated(true, ctx) → DenyCap<T>
          │
          ▼
Step 2 — finalize_registration():
  ┌────────────────────────────────────────────────────────────┐
  │  Consumes CurrencyInitializer<T> + TreasuryCap<T>         │
  │  Writes metadata into CoinRegistry at 0xc                 │
  │  Settings are now locked. TreasuryCap returned to caller.  │
  └────────────────────────────────────────────────────────────┘
```

---

## Standard Currency (non-regulated)

```move
module my_pkg::my_coin {
    use sui::coin_registry;

    public struct MY_COIN has drop {}

    fun init(otw: MY_COIN, ctx: &mut TxContext) {
        let (mut currency, treasury_cap) = coin_registry::new_currency_with_otw(
            otw,
            6,
            b"MYC".to_string(),
            b"My Coin".to_string(),
            b"A simple coin".to_string(),
            b"https://example.com/icon.png".to_string(),
            ctx,
        );
        currency.finalize_registration(treasury_cap, ctx);
        // TreasuryCap is now locked inside the registry
        // Retrieve it separately if you need to mint
    }
}
```

---

## Regulated Currency (with DenyCap)

```move
fun init(otw: MY_COIN, ctx: &mut TxContext) {
    let (mut currency, treasury_cap) = coin_registry::new_currency_with_otw(
        otw, 6,
        b"REGULATED".to_string(),
        b"Regulated Coin".to_string(),
        b"A regulated coin".to_string(),
        b"https://example.com/icon.png".to_string(),
        ctx,
    );

    // Must call make_regulated BEFORE finalize_registration
    let deny_cap = currency.make_regulated(true, ctx);

    currency.finalize_registration(treasury_cap, ctx);

    // Transfer deny_cap to admin — needed to manage the deny list
    transfer::public_transfer(deny_cap, ctx.sender());
}
```

---

## What Stays the Same

```
TreasuryCap<T>  →  mint / burn mechanics unchanged
coin::mint()    →  still the same call
coin::burn()    →  still the same call
DenyCap<T>      →  still controls deny list (same API)
OTW pattern     →  still required, still enforces one-time init
```

---

## Key Takeaways

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. Always use coin_registry::new_currency_with_otw for new coins. │
│     coin::create_currency is deprecated.                            │
│     Import: use sui::coin_registry;                                 │
│                                                                     │
│  2. Two steps: new_currency_with_otw() → finalize_registration().  │
│     Configure (make_regulated) between the two steps.              │
│                                                                     │
│  3. String params, not bytes. Use b"...".to_string().              │
│                                                                     │
│  4. TreasuryCap and DenyCap behavior unchanged after init.         │
│     Only initialization changes.                                    │
│                                                                     │
│  ⚠️  Verify finalize_registration signature against framework src  │
│     before production use — docs may lag deployed version.         │
└─────────────────────────────────────────────────────────────────────┘
```
