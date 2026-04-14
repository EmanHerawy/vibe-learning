module mastery::flash_loan {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};

    // The "Hot Potato" - No abilities!
    public struct Receipt {
        amount: u64
    }

    public struct Pool has key {
        id: UID,
        funds: Balance<SUI>
    }

    const EInvalidRepayment: u64 = 1;

    // 1. Logic: Borrow the money. Return the Coin AND the Potato.
    public fun borrow(pool: &mut Pool, amount: u64, ctx: &mut TxContext): (Coin<SUI>, Receipt) {
        let borrowed_balance = balance::split(&mut pool.funds, amount);
        (
            coin::from_balance(borrowed_balance, ctx),
            Receipt { amount }
        )
    }

    // 2. Logic: The only way to "kill" the potato.
    // Notice how we "unpack" the receipt: let Receipt { amount } = receipt;
    public fun repay(pool: &mut Pool, payment: Coin<SUI>, receipt: Receipt) {
        let Receipt { amount } = receipt; // The Potato is now destroyed
        
        // AUDITOR CHECK: Is the payment enough?
        assert!(coin::value(&payment) >= amount, EInvalidRepayment);
        
        balance::join(&mut pool.funds, coin::into_balance(payment));
    }
}