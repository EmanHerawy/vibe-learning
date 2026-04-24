/*
/// Module: w12_multi_role
module w12_multi_role::w12_multi_role;
*/

// For Move coding conventions, see
// https://docs.sui.io/concepts/sui-move-concepts/conventions

//   STRUCTS
//     AdminCap   — governance: set fee, delegate caps. key only, no store.
//     OperatorCap — update oracle price. key only, no store.
//     MinterCap  — mint tokens. key only, no store.
//     PauserCap  — emergency pause. key only, no store.
//     Config     — shared object. holds: fee_bps, oracle_price, paused, supply_minted, max_supply.
//                  key only, no store.

//   FUNCTIONS (gate each with exactly the right cap)
//     init()              — mint all 4 caps to deployer. share Config.
//     set_fee()           — AdminCap. update fee_bps.
//     delegate_operator() — AdminCap. transfer OperatorCap to a new address.
//     update_oracle()     — OperatorCap. update oracle_price.
//     mint()              — MinterCap + !paused + supply cap enforced.
//     pause() / unpause() — PauserCap.

//   CONSTRAINTS
//     □ No cap has `store`
//     □ delegate_operator() uses transfer::transfer (not public_transfer)
//     □ mint() aborts if paused
//     □ mint() aborts if supply_minted + amount > max_supply
//     □ No function constructs a cap without an auth guard

module w12_multi_role::token_cap_multi_role ;
use sui::coin::{Self, TreasuryCap};
use sui::coin_registry;
use sui::coin::Coin;
// use sui::Address

// OTW 

public struct TOKEN_CAP_MULTI_ROLE has drop {}
public struct AdminCap has key { id: UID }
public struct OperatorCap has key { id: UID }
public struct MinterCap has key { id: UID }
public struct PauserCap has key { id: UID }
public struct Config has key { 
    id: UID,
    fee_bps: u64,
    oracle_price: u64,
    paused: bool,
    supply_minted: u64,
    max_supply: u64,
    treasury_cap: TreasuryCap<TOKEN_CAP_MULTI_ROLE>,

}


// ── Errors ────────────────────────────────────────────────────────────────────

const E_INVALID_ORACLE_PRICE: u64 = 1;
const E_PAUSED: u64 = 2;
const E_MAX_SUPPLY_EXCEEDED: u64 = 3;
const E_INVALID_AMOUNT: u64 = 4;
const E_INVALID_FEE_BPS: u64 = 5;
const E_INVALID_ADDRESS: u64 = 6;
const E_UNPAUSED: u64 = 7;


//   FUNCTIONS (gate each with exactly the right cap)
//     init()              — mint all 4 caps to deployer. share Config.
 fun init (witness: TOKEN_CAP_MULTI_ROLE, ctx: &mut TxContext) {
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
    // mint all caps to deployer 
    transfer::transfer(AdminCap { id: object::new(ctx) }, ctx.sender());
    transfer::transfer(OperatorCap { id: object::new(ctx) }, ctx.sender());
    transfer::transfer(MinterCap { id: object::new(ctx) }, ctx.sender());
    transfer::transfer(PauserCap { id: object::new(ctx) }, ctx.sender());
    // check input for zero
      let config = Config {
        id: object::new(ctx),
        treasury_cap,
        fee_bps: 1,
        oracle_price: 2000,
        paused: false,
        supply_minted: 0,
        max_supply: 1_000_000_000_000,
    };
    transfer::share_object(config);

 }
//     set_fee()           — AdminCap. update fee_bps.
public fun set_fee(_: &AdminCap, fee_bps: u64, config: &mut Config) {
    if (fee_bps == 0) {
        abort(E_INVALID_FEE_BPS)
    };
    config.fee_bps = fee_bps;
 
}
//     delegate_operator() — AdminCap. transfer OperatorCap to a new address.
public fun delegate_operator(_:&AdminCap, new_operator: address, ctx: &mut TxContext) {
   // check for zero address 
    if (new_operator == @0x0) {
        abort(E_INVALID_ADDRESS)
    };
    //TODO: we need to check it is not already an operator

    transfer::transfer(OperatorCap { id: object::new(ctx) }, new_operator);
}
//     update_oracle()     — OperatorCap. update oracle_price.
public fun update_oracle(_: &OperatorCap, oracle_price: u64, config: &mut Config) {
    if (oracle_price == 0) {
        abort(E_INVALID_ORACLE_PRICE)
    };
    config.oracle_price = oracle_price
}
//     mint()              — MinterCap + !paused + supply cap enforced.
public fun mint(_: &MinterCap, amount: u64, config: &mut Config, ctx: &mut TxContext) : Coin<TOKEN_CAP_MULTI_ROLE>{
    if (amount == 0) {
        abort(E_INVALID_AMOUNT)
    };
    if (config.paused) {
        abort(E_PAUSED)
    };
    let current_supply = coin::total_supply(&config.treasury_cap);
    if (current_supply + amount > config.max_supply) {
        abort(E_MAX_SUPPLY_EXCEEDED)
    };
    config.supply_minted = current_supply + amount;
   coin::mint(&mut config.treasury_cap, amount, ctx)

}
//     pause() / unpause() — PauserCap.
public fun pause (_: &PauserCap, config: &mut Config) {
    if (config.paused) {
        abort(E_PAUSED)
    };
    config.paused = true;
}
public fun unpause (_: &PauserCap, config: &mut Config) {
    if (!config.paused) {
        abort(E_UNPAUSED)
    };
    config.paused = false;
}