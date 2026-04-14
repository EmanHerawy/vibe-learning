module 0x123::events {
    public struct Concert has drop {}
    public struct Opera has drop {}

    public struct Ticket<phantom T> has key, store {
        id: UID,
        price: u64
    }

    public fun buy_concert_ticket(ctx: &mut TxContext): u64{
        // Create and return a Ticket tagged with Concert
        let concert_ticket= Ticket<Concert>{id:object::new(ctx),price:100};
        concert_ticket
    }
}