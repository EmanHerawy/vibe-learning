use anchor_lang::prelude::*;
use responder::cpi::accounts::Increment;
use responder::program::Responder;
use responder::Counter;

declare_id!("6Zai32cRczUsBAeXFZcxPzEJQvxTkZW8jjxybxvjU8Y6");

#[program]
pub mod cpi_demo {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        ctx.accounts.authority.bump = ctx.bumps.authority;
        Ok(())
    }

    pub fn call_increment(ctx: Context<CallIncrement>) -> Result<()> {
        let bump = ctx.accounts.authority.bump;

        // ← YOUR TURN 1: build signer_seeds for the authority PDA
        // Hint: seeds used in Initialize were [b"authority"]
        // Format: &[&[&[u8]]]  i.e.  &[&[seed1, seed2, bump_slice]]
        let signer_seeds:&[&[&[u8]]]=  &[&[b"authority", &[ctx.accounts.authority.bump]]];

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.responder_program.to_account_info(),
            Increment {
                counter: ctx.accounts.counter.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            },
            // ← YOUR TURN 2: pass signer_seeds here
           signer_seeds,
        );

        responder::cpi::increment(cpi_ctx)?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = user, space = 8 + 1, seeds = [b"authority"], bump)]
    pub authority: Account<'info, Authority>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CallIncrement<'info> {
    #[account(mut, seeds = [b"authority"], bump = authority.bump)]
    pub authority: Account<'info, Authority>,
    #[account(mut)]
    pub counter: Account<'info, Counter>,
    pub responder_program: Program<'info, Responder>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Authority {
    pub bump: u8,
}
