use anchor_lang::prelude::*;

declare_id!("BHTeQ5JTo164bHQaiE1thJsGaQRmDz1BMZRqHNbC5VF8");

#[program]
pub mod hello_anchor {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Hello Anchor!");
        msg!("This is my first program");
         ctx.accounts.counter.count =0;
          msg!("Counter initialized! Count: {}", ctx.accounts.counter.count);
                  Ok(())
    }
    pub fn increment(ctx: Context<Incrementer>) -> Result<()> {
        msg!("Hello Incrementer!");
        ctx.accounts.counter.count += 1;
        msg!("New count is {:?}",  ctx.accounts.counter.count );
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize <'info> {
    #[account(init, payer = user, space = 8 + 8)]
      pub counter: Account<'info, Counter>,

      #[account(mut)]
      pub user: Signer<'info>,

      pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct Incrementer<'info> {
    #[account(mut)]
    pub counter : Account<'info, Counter>

}
#[account]
pub struct Counter{
    pub count: u64
}
