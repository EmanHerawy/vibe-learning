/// W10 — PTB & Testing exercises
module ptb_w10::ptb_w10;

use sui::coin::{Self, Coin};
use sui::sui::SUI;
use sui::balance::{Self, Balance};

// ── Vault ─────────────────────────────────────────────────────────────
public struct Vault has key {
    id: UID,
    reserve: Balance<SUI>,
    total_staked: u64,
}

// ── StakeReceipt ──────────────────────────────────────────────────────
public struct StakeReceipt has key, store {
    id: UID,
    amount: u64,
}

// ── Init ──────────────────────────────────────────────────────────────
fun init(ctx: &mut TxContext) {
    let vault = Vault {
        id: object::new(ctx),
        reserve: balance::zero<SUI>(),
        total_staked: 0,
    };
    transfer::share_object(vault);
}

// ── deposit — PTB-friendly: returns StakeReceipt ──────────────────────
public fun deposit(vault: &mut Vault, coin: Coin<SUI>, ctx: &mut TxContext): StakeReceipt {
    let amount = coin::value(&coin);
    assert!(amount > 0, 0);
    coin::put(&mut vault.reserve, coin);
    vault.total_staked = vault.total_staked + amount;
    StakeReceipt {
        id: object::new(ctx),
        amount,
    }
}

// ── Getters ───────────────────────────────────────────────────────────
public fun total_staked(vault: &Vault): u64 { vault.total_staked }
public fun receipt_amount(receipt: &StakeReceipt): u64 { receipt.amount }

// ── Test helpers ──────────────────────────────────────────────────────
// #[test_only] = compiled only during tests, NOT published
// Cannot use #[test] on functions that take arguments
#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(ctx);
}

// ── Tests ─────────────────────────────────────────────────────────────
#[test]
fun test_deposit_500() {
    use sui::test_scenario;

    // named addresses must be hex literals
    let admin = @0xAD;
    let alice = @0xAA;

    // Transaction 1: admin deploys → vault is shared
    let mut scenario = test_scenario::begin(admin);
    {
        // note: scenario.ctx() not scenario.ctx
        init_for_testing(scenario.ctx());
    };

    // Transaction 2: alice deposits 500 SUI
    scenario.next_tx(alice);
    {
        // take_shared pulls the Vault from the object pool
        // must be mut because deposit takes &mut Vault
        let mut vault = scenario.take_shared<Vault>();

        // mint_for_testing creates a fake coin — test-only
        let coin = coin::mint_for_testing<SUI>(500, scenario.ctx());

        let receipt = deposit(&mut vault, coin, scenario.ctx());

        // assert! not assert_eq! — Move uses assert!(condition, error_code)
        assert!(receipt_amount(&receipt) == 500, 0);
        assert!(total_staked(&vault) == 500, 1);

        // shared objects MUST be returned
        test_scenario::return_shared(vault);

        // owned objects must be consumed — transfer to alice
        transfer::public_transfer(receipt, alice);
    };

    scenario.end();
}

// TODO: test_two_deposits — deposit 500 then 300, assert total_staked == 800
#[test]
public fun test_two_deposits() {
    use sui::test_scenario;
    let admin = @0xAD;
    let alice = @0xAA;
    let mut scenario = test_scenario::begin(admin);
    {
        init_for_testing(scenario.ctx());
    };

// first deposit
    scenario.next_tx(alice);
    {
        let mut vault = scenario.take_shared<Vault>();
        let coin = coin::mint_for_testing<SUI>(500, scenario.ctx());
        let receipt = deposit(&mut vault, coin, scenario.ctx());
        assert!(receipt_amount(&receipt) == 500, 0);
        assert!(total_staked(&vault) == 500, 1);
        test_scenario::return_shared(vault);
        transfer::public_transfer(receipt, alice);
    };

// second deposit
    scenario.next_tx(alice);
    {
        let mut vault = scenario.take_shared<Vault>();
        let coin = coin::mint_for_testing<SUI>(300, scenario.ctx());
        let receipt = deposit(&mut vault, coin, scenario.ctx());
        assert!(receipt_amount(&receipt) == 300, 0);
        assert!(total_staked(&vault) == 800, 1);
        test_scenario::return_shared(vault);
        transfer::public_transfer(receipt, alice);
    };

    // end 
    scenario.end();
}
// TODO: test_zero_deposit_fails — #[expected_failure] for zero coin deposit
#[test]
#[expected_failure]
fun test_zero_deposit_fails() {
    use sui::test_scenario;
    let admin = @0xAD;
    let mut scenario = test_scenario::begin(admin);
    {
        init_for_testing(scenario.ctx());
    };
    // second transaction should fail
    scenario.next_tx(admin);
    {
        // get vault form shared 
        let mut vault = scenario.take_shared<Vault>();

        // mint_for_testing creates a fake coin
        let coin = coin::mint_for_testing<SUI>(0, scenario.ctx());
        let receipt = deposit(&mut vault, coin, scenario.ctx());

        test_scenario::return_shared(vault);

        // owned objects must be consumed — transfer to alice
        transfer::public_transfer(receipt, admin);
    };

    scenario.end();

}
