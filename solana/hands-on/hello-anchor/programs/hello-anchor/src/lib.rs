use anchor_lang::prelude::*;

declare_id!("BHTeQ5JTo164bHQaiE1thJsGaQRmDz1BMZRqHNbC5VF8");
// has to be outside the #[program] module:    
  #[error_code]                                             
  pub enum CounterError {                                                                                                     
      #[msg("Counter cannot go below zero")]                
      Underflow,                            
  } 
#[program]
pub mod hello_anchor {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Hello Anchor!");
        msg!("This is my first program");
         ctx.accounts.counter.count =0;
         ctx.accounts.counter.bump = ctx.bumps.counter ;
          msg!("Counter initialized! Count: {}", ctx.accounts.counter.count);
                  Ok(())
    }
    pub fn increment(ctx: Context<Incrementer>) -> Result<()> {
        msg!("Hello Incrementer!");
        ctx.accounts.counter.count += 1;
        msg!("New count is {:?}",  ctx.accounts.counter.count );
        Ok(())
    }
    pub fn decrement(ctx: Context<Incrementer>) -> Result<()> {
        msg!("Hello Incrementer!");
        require!(ctx.accounts.counter.count > 0,CounterError::Underflow);
        ctx.accounts.counter.count -= 1;
        msg!("New count is {:?}",  ctx.accounts.counter.count );
        Ok(())
    }
    pub fn close_counter (_ctx:Context<CloseCounter>)-> Result<()> {
        msg!("Counter closed");

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize <'info> {
    #[account(init, payer = user, space = 8 + 8+1, seeds = [b"counter",user.key().as_ref()], bump)]
      pub counter: Account<'info, Counter>,

      #[account(mut)]
      pub user: Signer<'info>,

      pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct Incrementer<'info> {
      #[account(                                                
      mut,                                                                                                                    
      seeds = [b"counter", user.key().as_ref()],
      bump = counter.bump,       //← reads the stored bump FROM the account data                                                
  )]                                                                                                                          
    pub counter : Account<'info, Counter>,
    pub user: Signer<'info>

}
#[derive(Accounts)]
pub struct CloseCounter<'info> {
      #[account(                                                
      mut, 
      close=user,                                                                                                                   
      seeds = [b"counter", user.key().as_ref()],
      bump = counter.bump,       //← reads the stored bump FROM the account data                                                
  )]                                                                                                                          
    pub counter : Account<'info, Counter>,
    pub user: Signer<'info>

}
#[account]
pub struct Counter{
    pub count: u64,
    pub bump: u8
}
