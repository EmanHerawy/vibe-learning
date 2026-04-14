Ah, great question! Let me clarify **why the assertion exists** even though the OTW is automatically enforced.

## The Confusion

You're right to be confused! The Sui runtime **already guarantees** that:
- `init()` receives a valid OTW
- It only runs once at publish time
- No one else can construct the witness

So why add `assert!(is_one_time_witness(&witness), EBadWitness)`?

## The Real Reason: Defense in Depth

The assertion is **redundant but defensive**. Here's why projects still use it:

### 1. **Explicit Documentation**
```move
fun init(witness: TURBOS, ctx: &mut TxContext) {
    // Makes it CRYSTAL CLEAR to auditors/readers:
    // "This MUST be an OTW, we're verifying it"
    assert!(sui::types::is_one_time_witness(&witness), EBadWitness);
    
    let (treasury, metadata) = coin::create_currency(witness, ...);
}
```

### 2. **Future-Proofing Against Bugs**
If there's ever a bug in the Move VM or Sui framework that somehow allows `init` to be called incorrectly, this catches it.

### 3. **Protocol Requirements**
Some functions (like `coin::create_currency`) **internally require** an OTW but don't enforce it themselves - they rely on YOU to check:

```move
// Inside sui::coin module (simplified)
public fun create_currency<T: drop>(
    witness: T,  // Assumes you verified it's an OTW!
    decimals: u8,
    // ...
) {
    // Doesn't check is_one_time_witness itself
    // Trusts the caller to verify
}
```

### 4. **Pattern Consistency**
Some modules pass the witness to **other functions** where the check is actually necessary:

```move
fun init(witness: TURBOS, ctx: &mut TxContext) {
    assert!(sui::types::is_one_time_witness(&witness), EBadWitness);
    
    // Pass witness to multiple places
    create_token(witness, ctx);
    create_metadata(witness, ctx);
    register_protocol(witness);
}
```

## When Is It Actually Necessary?

The check is **truly necessary** when:

```move
// Public function that accepts a witness parameter
public fun register<T: drop>(witness: T) {
    // ⚠️ MUST check! Anyone can call this with any type
    assert!(sui::types::is_one_time_witness(&witness), EBadWitness);
    
    // Now safe to use witness for registration
}
```

But in `init()` specifically? It's **defensive programming**, not strictly required.

## Modern Practice

Many newer Sui contracts **skip the assertion in init()**:

```move
// Minimal version (relies on runtime guarantees)
fun init(witness: TURBOS, ctx: &mut TxContext) {
    let (treasury, metadata) = coin::create_currency(witness, 9, ...);
    // No assertion - trust the runtime
}
```

But conservative projects (especially those handling money) **keep it** for extra safety and clarity.

**TL;DR**: The assertion in `init()` is **technically redundant** but serves as defensive programming and explicit documentation that this witness is special. It's a "better safe than sorry" approach, especially for financial contracts.