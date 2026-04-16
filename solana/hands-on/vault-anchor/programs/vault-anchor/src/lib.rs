use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer as SystemTransfer};
use anchor_lang::solana_program::program::invoke_signed;
use anchor_lang::solana_program::system_instruction;
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
    // ─────────────────────────────────────────────────────────────
    // EXERCISE: withdraw_raw
    // Same as withdraw but using raw invoke_signed instead of
    // direct lamport manipulation.
    //
    // Fill in the three TODOs below. Build with: anchor build
    // ─────────────────────────────────────────────────────────────
    pub fn withdraw_raw(ctx: Context<WithdrawRaw>, amount: u64) -> Result<()> {
        require!(amount > 0, VaultError::ZeroAmount);

        let vault = &mut ctx.accounts.vault;
        require!(vault.balance >= amount, VaultError::InvalidAmount);

        // TODO 1: update vault.balance using checked_sub
        vault.balance = vault.balance.checked_sub( amount).ok_or(VaultError::Overflow)?;

        let user_key = ctx.accounts.user.key();
        let bump = vault.bump;
        let seeds= &[b"vault", user_key.as_ref(), &[bump]];
        let singer= &[&seeds[..]];
        // TODO 2: fill in account_infos — every account the instruction touches
        // (hint: 3 accounts needed for a system_program transfer)
        invoke_signed(
            &system_instruction::transfer(
                &ctx.accounts.vault_pda.key(),
                &ctx.accounts.user.key(),
                amount,
            ),
            &[
                // TODO 2a: vault PDA account info
                ctx.accounts.vault_pda.to_account_info(),
                ctx.accounts.user.to_account_info(),
                ctx.accounts.system_program.to_account_info()
                // TODO 2b: user account info
                // TODO 2c: system program account info
            ],
            // TODO 3: signer seeds for the vault PDA
            // (hint: seeds = [b"vault", user_key, bump])
           singer,
        )?;

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
// Accounts struct for the exercise
#[derive(Accounts)]
pub struct WithdrawRaw<'info> {
    #[account(mut, seeds = [b"vault", user.key().as_ref()], bump = vault.bump)]
    pub vault: Account<'info, Vault>,
    /// CHECK: this is the vault PDA as a raw AccountInfo for the CPI
    #[account(mut, seeds = [b"vault", user.key().as_ref()], bump = vault.bump)]
    pub vault_pda: AccountInfo<'info>,
    #[account(mut)]
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
