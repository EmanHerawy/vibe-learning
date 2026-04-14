module 0x123::my_vault {

    public struct Vault<T: store> has key, store {
        id: UID,
        asset: T
    }

    public fun create_vault<T: store>(asset: T, ctx: &mut TxContext) {
        // Your code here: 
        // 1. Create the vault
        let new_vault= Vault{id:object::new(ctx),asset: asset};
        // 2. transfer it to sender
        transfer::transfer(new_vault,ctx.sender());
    }
}