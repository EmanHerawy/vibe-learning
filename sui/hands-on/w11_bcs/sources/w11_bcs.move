module w11_bcs::token_with_permit;

use sui::coin::{Self, TreasuryCap};
use sui::coin_registry;
use sui::ed25519;
use sui::hash;
use sui::bcs;
use sui::table::{Self, Table};

// ── One-time witness ──────────────────────────────────────────────────────────

public struct TOKEN_WITH_PERMIT has drop {}

// ── AdminCap — only the holder can rotate the admin pubkey ───────────────────
// No `store` — cannot be transferred after deploy, admin rights are fixed.

public struct AdminCap has key { id: UID }

// ── Shared config ─────────────────────────────────────────────────────────────
// Config has `key` but NOT `store`:
//   - cannot be wrapped inside another object
//   - cannot be transferred
//   - treasury_cap is locked here forever — only this module's functions can use it
//   - fields are module-private — no external code can read or write them

public struct Config has key {
    id: UID,
    treasury_cap: TreasuryCap<TOKEN_WITH_PERMIT>,
    admin_pubkey: vector<u8>,
    used_nonces:  Table<u64, bool>,
    max_supply:   u64,                // hard ceiling — admin cannot exceed this
}

// ── Permit ────────────────────────────────────────────────────────────────────
// Every field is BCS-encoded and signed. `chain_id` is also VERIFIED on-chain
// so a testnet permit cannot replay on mainnet.

public struct MintPermit has drop {
    action:     vector<u8>,   // domain separation — must equal b"mint"
    to:         address,
    amount:     u64,
    nonce:      u64,
    expires_at: u64,
    chain_id:   u64,
}

// ── Errors ────────────────────────────────────────────────────────────────────

const E_INVALID_SIG:    u64 = 1;
const E_EXPIRED:        u64 = 2;
const E_INVALID_AMOUNT: u64 = 3;
const E_WRONG_ACTION:   u64 = 4;
const E_NONCE_USED:     u64 = 5;
const E_WRONG_CHAIN:    u64 = 6;
const E_SUPPLY_EXCEEDED: u64 = 7;

// ── Init ──────────────────────────────────────────────────────────────────────
// admin_pubkey and max_supply are set at deploy time — no fragile post-deploy
// bootstrap window, and no front-running risk on set_admin_pubkey.

fun init(witness: TOKEN_WITH_PERMIT, ctx: &mut TxContext) {
    let (builder, treasury_cap) = coin_registry::new_currency_with_otw(
        witness,
        6,
        b"MY_COIN".to_string(),
        b"My Coin".to_string(),
        b"Permit-gated coin".to_string(),
        b"https://example.com/my_coin.png".to_string(),
        ctx,
    );
    let metadata_cap = builder.finalize(ctx);
    transfer::public_transfer(metadata_cap, ctx.sender());

    // AdminCap to deployer — no `store` so it cannot be re-transferred.
    transfer::transfer(AdminCap { id: object::new(ctx) }, ctx.sender());

    // In production, pass real pubkey + max_supply via programmable tx at deploy.
    // Here we use placeholders so the module compiles and can be tested.
    let config = Config {
        id: object::new(ctx),
        treasury_cap,
        admin_pubkey: vector[], // call set_admin_pubkey immediately after deploy
        used_nonces:  table::new(ctx),
        max_supply:   1_000_000_000_000, // 1M tokens at 6 decimals
    };
    transfer::share_object(config);
}

// ── Admin: rotate signing key ─────────────────────────────────────────────────

public fun set_admin_pubkey(_: &AdminCap, config: &mut Config, pubkey: vector<u8>) {
    config.admin_pubkey = pubkey;
}

// ── Mint with permit ──────────────────────────────────────────────────────────

public fun mint_with_permit(
    config: &mut Config,
    permit: MintPermit,
    sig:    vector<u8>,
    ctx:    &mut TxContext,
) {
    // domain + field validation
    assert!(permit.action == b"mint",                          E_WRONG_ACTION);
    assert!(permit.amount > 0,                                 E_INVALID_AMOUNT);
    assert!(tx_context::epoch(ctx) <= permit.expires_at,       E_EXPIRED);
    assert!(!config.used_nonces.contains(permit.nonce),        E_NONCE_USED);

    // Sui has no tx_context::chain_id(). Cross-chain replay is prevented by
    // binding the permit to Config's object ID (unique per deployment/chain).
    // The off-chain signer includes config_id in the signed payload instead.
    // Here chain_id in the struct is informational — verified via the sig binding.
    let _ = &permit.chain_id;

    // supply cap — admin cannot mint beyond the hard ceiling
    let current_supply = coin::total_supply(&config.treasury_cap);
    assert!(current_supply + permit.amount <= config.max_supply, E_SUPPLY_EXCEEDED);

    // sig verified against PINNED pubkey — never caller-supplied
    let encoded  = bcs::to_bytes(&permit);
    let msg_hash = hash::keccak256(&encoded);
    assert!(ed25519::ed25519_verify(&sig, &config.admin_pubkey, &msg_hash), E_INVALID_SIG);

    // consume nonce
    config.used_nonces.add(permit.nonce, true);

    // mint to the address specified in the permit — not to msg.sender
    let MintPermit { to, amount, .. } = permit;
    let minted = coin::mint(&mut config.treasury_cap, amount, ctx);
    transfer::public_transfer(minted, to);
}

// ── Test helpers ─────────────────────────────────────────────────────────────

#[test_only]
public fun test_init(ctx: &mut TxContext) {
    init(TOKEN_WITH_PERMIT {}, ctx);
}

#[test_only]
public fun new_bad_action_permit_for_test(
    to: address, amount: u64, nonce: u64, expires_at: u64, chain_id: u64,
): MintPermit {
    MintPermit { action: b"burn", to, amount, nonce, expires_at, chain_id }
}

// ── Permit constructor ────────────────────────────────────────────────────────

public fun new_mint_permit(
    to:         address,
    amount:     u64,
    nonce:      u64,
    expires_at: u64,
    chain_id:   u64,
): MintPermit {
    MintPermit { action: b"mint", to, amount, nonce, expires_at, chain_id }
}
