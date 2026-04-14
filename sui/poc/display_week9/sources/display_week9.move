/*
/// Module: display_week9
module display_week9::display_week9;
*/

// For Move coding conventions, see
// https://docs.sui.io/concepts/sui-move-concepts/conventions

module 0x123::my_nft {
    use sui::tx_context::{Self, TxContext};
    use sui::display;
    use sui::package;
    use std::string::{Self, String};

    /// 1. The OTW (One Time Witness) - Crucial for Display!
    /// It must have the same name as the module (Uppercase)
    public struct MY_NFT has drop {}

    public struct Sword has key, store {
        id: UID,
        name: String,
        img_url: String,
    }

    fun init(otw: MY_NFT, ctx: &mut TxContext) {
        let keys = vector[
            string::utf8(b"name"),
            string::utf8(b"image_url"),
            string::utf8(b"description"),
        ];

        let values = vector[
            string::utf8(b"{name}"), // The {name} refers to the field in the Sword struct!
            string::utf8(b"{img_url}"),
            string::utf8(b"A legendary sword from the Sui Forge"),
        ];

        // 2. Claim the Publisher
        let publisher = package::claim(otw, ctx);

        // 3. Create the Display
        let mut display = display::new_with_fields<Sword>(
            &publisher, keys, values, ctx
        );

        // 4. Commit the Display
        display::update_version(&mut display);

        sui::transfer::public_transfer(publisher, tx_context::sender(ctx));
        sui::transfer::public_transfer(display, tx_context::sender(ctx));
    }
}