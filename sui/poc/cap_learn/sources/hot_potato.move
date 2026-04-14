module cap_learn::store {
        use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};

    const E_INVALID_PAYMENT: u64 = 1;
    // THE POTATO
    public struct Invoice { price: u64 }
    public struct Phone has key, store { id: UID }

    
    public fun buy_phone(ctx: &mut TxContext): (Phone, Invoice) {
        let phone = Phone { id: object::new(ctx) };
        let invoice = Invoice { price: 1000 };
        (phone, invoice)
    }

    public fun pay_invoice(invoice: Invoice, payment: Coin<SUI>) {
        // 1. Unpack the invoice: 'let Invoice { price } = invoice;'
        let Invoice{price} = invoice;
        // 2. Check if payment amount matches price
        let amount_in = coin::value(&payment);

        assert!(amount_in == price, E_INVALID_PAYMENT);
        // 3. If everything is okay, the invoice is now destroyed!
           transfer::public_transfer(payment, @cap_learn);

       

        
    }
}