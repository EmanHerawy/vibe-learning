use anchor_lang::prelude::*;

declare_id!("9Jncz9V39s5E9NLLav41aSabEc3QbDp1STsG2Jfhy1RL");

#[program]
pub mod responder {
    use super::*;

    pub fn init_counter(ctx: Context<InitCounter>) -> Result<()> {
        ctx.accounts.counter.count = 0;
        Ok(())
    }

    pub fn increment(ctx: Context<Increment>) -> Result<()> {
        ctx.accounts.counter.count += 1;
        msg!("Counter incremented to: {}", ctx.accounts.counter.count);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitCounter<'info> {
    #[account(init, payer = payer, space = 8 + 8)]
    pub counter: Account<'info, Counter>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Increment<'info> {
    #[account(mut)]
    pub counter: Account<'info, Counter>,
    /// CHECK: must be invoker's PDA — caller is responsible for passing the correct signer
    pub authority: Signer<'info>,
}

#[account]
pub struct Counter {
    pub count: u64,
}
