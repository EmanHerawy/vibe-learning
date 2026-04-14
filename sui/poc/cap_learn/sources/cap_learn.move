module cap_learn::token_factory {
    public struct MintCap has key, store { id: UID }
    
    public struct MyToken has key, store {
        id: UID,
        value: u64
    }

    fun init(ctx: &mut TxContext) {
        // 1. Create the MintCap
        let mint_cap = MintCap{id: object::new(ctx)};
        // 2. Transfer it to sender
        transfer::public_transfer(mint_cap, ctx.sender());
    }

    // Note how we pass the capability as a reference &MintCap
    public fun mint_token(_cap: &MintCap, value: u64, ctx: &mut TxContext) {
        // 3. Create a MyToken and transfer to sender
        let token =MyToken{id: object::new(ctx), value: value};
        transfer::public_transfer(token, ctx.sender());
    }
}