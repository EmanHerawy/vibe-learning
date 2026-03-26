use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{
    self, FreezeAccount, Mint, MintTo, ThawAccount, Token, TokenAccount, Transfer,
};

declare_id!("6JhxbCCEbfy8QCT7vTJ3wAhwD2LTBugXeiisLidxQxU4");

// ─────────────────────────────────────────────────────────────────────────────
// FULL PICTURE:
//
//  initialize
//    └── creates Mint with:
//          mint_authority    = config PDA  ← only this program can mint
//          freeze_authority  = config PDA  ← only this program can freeze
//        creates config PDA storing max_supply, total_minted, bump
//
//  mint_token(amount)
//    └── config PDA signs → mint_to → recipient's ATA balance increases
//        total_minted tracked on config
//
//  freeze_holder
//    └── config PDA signs → freeze_account → holder's ATA locked
//        transfers/burns on that ATA now rejected by SPL Token Program
//
//  thaw_holder
//    └── config PDA signs → thaw_account → holder's ATA unlocked
//
//  WITHOUT freeze_authority (set to None):
//    └── freeze_account / thaw_account both fail permanently
//        no upgrade path — decision is made at Mint creation and cannot change
// ─────────────────────────────────────────────────────────────────────────────

#[program]
pub mod token_minter_anchor {
    use super::*;

    // STEP 1: Create the token
    // - Mint account is created by Anchor via mint:: constraints
    // - Config PDA is set as BOTH mint_authority and freeze_authority
    // - max_supply stored on config — protocol-level guard
    pub fn initialize(ctx: Context<Initialize>, max_supply: u64) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.max_supply = max_supply;
        config.total_minted = 0;
        config.bump = ctx.bumps.config;
        Ok(())
    }

    // STEP 2: Mint tokens to a user
    // - Config PDA signs the CPI (it's the mint_authority)
    // - Recipient's ATA created automatically if it doesn't exist
    // - Max supply enforced here — SPL Token Program doesn't know about it
    pub fn mint_token(ctx: Context<MintToken>, amount: u64) -> Result<()> {
        let bump = ctx.accounts.config.bump;
        let config_info = ctx.accounts.config.to_account_info();

        let config = &mut ctx.accounts.config;
        let next = config
            .total_minted
            .checked_add(amount)
            .ok_or(ErrorCode::Overflow)?;
        require!(next <= config.max_supply, ErrorCode::MaxSupplyReached);
        require!(amount > 0, ErrorCode::ZeroAmount);

        let signer_seeds: &[&[&[u8]]] = &[&[b"config", &[bump]]];

        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.recipient_ata.to_account_info(),
                    authority: config_info, // config PDA = mint_authority
                },
                signer_seeds,
            ),
            amount,
        )?;

        config.total_minted = next;
        Ok(())
    }

    // STEP 3a: Freeze a holder's Token Account
    // - Config PDA signs the CPI (it's the freeze_authority)
    // - After this: transfers and burns on target_ata are rejected by SPL Token
    // - Only thaw_holder can unlock it
    pub fn freeze_holder(ctx: Context<FreezeThaw>) -> Result<()> {
        let bump = ctx.accounts.config.bump;
        let signer_seeds: &[&[&[u8]]] = &[&[b"config", &[bump]]];

        token::freeze_account(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                FreezeAccount {
                    account: ctx.accounts.target_ata.to_account_info(), // ATA to freeze
                    mint: ctx.accounts.mint.to_account_info(),
                    authority: ctx.accounts.config.to_account_info(), // freeze_authority signs
                },
                signer_seeds,
            ),
        )?;
        Ok(())
    }

    // STEP 3b: Thaw (unfreeze) a holder's Token Account
    // - Same pattern as freeze, just the inverse instruction
    pub fn thaw_holder(ctx: Context<FreezeThaw>) -> Result<()> {
        let bump = ctx.accounts.config.bump;
        let signer_seeds: &[&[&[u8]]] = &[&[b"config", &[bump]]];

        token::thaw_account(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                ThawAccount {
                    account: ctx.accounts.target_ata.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    authority: ctx.accounts.config.to_account_info(),
                },
                signer_seeds,
            ),
        )?;
        Ok(())
    }

    // BONUS: Transfer between two ATAs — called directly by the token holder
    // - holder signs directly (no PDA needed — it's their own tokens)
    // - This would FAIL if sender_ata is frozen
    pub fn transfer_tokens(ctx: Context<TransferTokens>, amount: u64) -> Result<()> {
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.sender_ata.to_account_info(),
                    to: ctx.accounts.recipient_ata.to_account_info(),
                    authority: ctx.accounts.sender.to_account_info(), // sender signs directly
                },
            ),
            amount,
        )?;
        Ok(())
    }
}

// ── ACCOUNTS STRUCTS ──────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 8 + 8 + 1,
        seeds = [b"config"],
        bump,
    )]
    pub config: Account<'info, MintConfig>,

    #[account(
        init,
        payer = authority,
        mint::decimals = 6,
        mint::authority = config,         // config PDA can mint
        mint::freeze_authority = config,  // config PDA can freeze — remove this line to lose freeze forever
    )]
    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct MintToken<'info> {
    #[account(mut, seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, MintConfig>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = mint,
        associated_token::authority = recipient,
    )]
    pub recipient_ata: Account<'info, TokenAccount>,

    /// CHECK: recipient pubkey — used to derive their ATA
    pub recipient: AccountInfo<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

// Reused for both freeze_holder and thaw_holder — same accounts needed
#[derive(Accounts)]
pub struct FreezeThaw<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, MintConfig>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    /// The Token Account to freeze or thaw
    #[account(mut)]
    pub target_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct TransferTokens<'info> {
    #[account(mut)]
    pub sender_ata: Account<'info, TokenAccount>,

    #[account(mut)]
    pub recipient_ata: Account<'info, TokenAccount>,

    pub sender: Signer<'info>, // token holder signs — no PDA needed

    pub token_program: Program<'info, Token>,
}

// ── DATA STRUCTS ──────────────────────────────────────────────────────────────

#[account]
pub struct MintConfig {
    pub max_supply: u64,
    pub total_minted: u64,
    pub bump: u8,
}

// ── ERRORS ────────────────────────────────────────────────────────────────────

#[error_code]
pub enum ErrorCode {
    #[msg("Max supply reached")]
    MaxSupplyReached,
    #[msg("Zero amount")]
    ZeroAmount,
    #[msg("Arithmetic overflow")]
    Overflow,
}
