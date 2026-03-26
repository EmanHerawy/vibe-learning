use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount};

declare_id!("6JhxbCCEbfy8QCT7vTJ3wAhwD2LTBugXeiisLidxQxU4");

#[program]
pub mod token_minter_anchor {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, max_supply: u64) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.max_supply = max_supply;
        config.total_minted = 0;
        config.bump = ctx.bumps.config;
        // mint account is created by Anchor via the mint::authority constraint
        // no extra code needed here
        Ok(())
    }

    pub fn mint_token(ctx: Context<MintToken>, amount: u64) -> Result<()> {
        // extract before mutable borrow to satisfy borrow checker
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
                    authority: config_info,
                },
                signer_seeds,
            ),
            amount,
        )?;

        config.total_minted = next;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    /// Config PDA — stores max_supply, total_minted, bump
    #[account(
        init,
        payer = authority,
        space = 8 + 8 + 8 + 1,
        seeds = [b"config"],
        bump,
    )]
    pub config: Account<'info, MintConfig>,

    /// The Mint account — SPL Token Program owns this
    /// mint::authority = config means the config PDA controls minting
    #[account(
        init,
        payer = authority,
        mint::decimals = 6,
        mint::authority = config,
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

    /// The same Mint created in initialize
    #[account(mut)]
    pub mint: Account<'info, Mint>,

    /// Recipient's ATA for this mint — created if it doesn't exist yet
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = mint,
        associated_token::authority = recipient,
    )]
    pub recipient_ata: Account<'info, TokenAccount>,

    /// CHECK: recipient is just a pubkey — we derive their ATA from it
    pub recipient: AccountInfo<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct MintConfig {
    pub max_supply: u64,
    pub total_minted: u64,
    pub bump: u8,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Max supply reached")]
    MaxSupplyReached,
    #[msg("Zero amount")]
    ZeroAmount,
    #[msg("Arithmetic overflow")]
    Overflow,
}
