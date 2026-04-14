use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer as SystemTransfer};
declare_id!("BcSFKkrvggSJojDuyJ7kT51iVqXmc4FaAMKPHjdPsNnR");

#[program]
pub mod vault_anchor {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        ctx.accounts.vault.bump = ctx.bumps.vault;
        ctx.accounts.vault.balance = 0;
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
    pub fn deposit(ctx: Context<ManageVault>, amount: u64) -> Result<()> {
        require!(amount > 0, VaultError::ZeroAmount);
        let vault = &mut ctx.accounts.vault;
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                SystemTransfer {
                    from: ctx.accounts.user.to_account_info(),
                    to: vault.to_account_info(),
                },
            ),
            amount,
        )?;
        vault.balance = vault.balance.checked_add(amount).ok_or(VaultError::Overflow)?;
        Ok(())
    }
    pub fn withdraw(ctx: Context<ManageVault>, amount: u64) -> Result<()> {
        require!(amount > 0, VaultError::ZeroAmount);
        let vault = &mut ctx.accounts.vault;
        require!(vault.balance >= amount, VaultError::InvalidAmount);
        **vault.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? += amount;
        vault.balance = vault.balance.checked_sub(amount).ok_or(VaultError::Overflow)?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init,payer = user, space = 8 + 8+1, seeds = [b"vault", user.key().as_ref()], bump )]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    // should be mute as it will pay the rent and the balance will change " i think"
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct ManageVault<'info> {
    #[account(mut, seeds = [b"vault", user.key().as_ref()], bump=vault.bump )]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Vault {
    pub balance: u64,
    pub bump: u8,
}
#[error_code]
pub enum VaultError {
    #[msg("Zero amount")]
    ZeroAmount,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Arithmetic overflow")]
    Overflow,
}
