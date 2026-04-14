module 0x123::player_stats {
    use sui::event;
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
use sui::clock::Clock;
    /// The Object we are tracking
    public struct Player has key, store {
        id: UID,
        level: u64,
    }

    /// THE EVENT: Notice it has 'copy' and 'drop'
    public struct LevelUpEvent has copy, drop {
        player_id: ID,
        new_level: u64,
        promoted_by: address,
        timestamp: u64,
    }

    public fun level_up(player: &mut Player, ctx: &TxContext, clock: &Clock) {
        player.level = player.level + 1;

        // EMITTING THE EVENT
        event::emit(LevelUpEvent {
            player_id: object::id(player),
            new_level: player.level,
            promoted_by: tx_context::sender(ctx),
            timestamp: clock.timestamp_ms(),
        });
    }
}