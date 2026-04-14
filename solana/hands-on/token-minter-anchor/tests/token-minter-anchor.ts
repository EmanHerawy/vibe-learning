import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TokenMinterAnchor } from "../target/types/token_minter_anchor";
import { Keypair } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

describe("token-minter-anchor", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.TokenMinterAnchor as Program<TokenMinterAnchor>;
  const wallet = anchor.AnchorProvider.env().wallet;

  // Mint = regular keypair (not a PDA — arbitrary address, must sign at creation)
  const mint = Keypair.generate();

  // Config = PDA (seeds = [b"config"]) — our program's authority over the mint
  const [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  // Recipient ATA = deterministic address derived from (recipient, mint)
  const recipientAta = getAssociatedTokenAddressSync(mint.publicKey, wallet.publicKey);

  // ── STEP 1: Initialize ─────────────────────────────────────────────────────
  // Creates: Mint account (with config PDA as mint_authority AND freeze_authority)
  //          Config PDA (stores max_supply, total_minted, bump)
  it("initialize — creates Mint with PDA as mint + freeze authority", async () => {
    await program.methods
      .initialize(new anchor.BN(1_000_000))
      .accounts({ config: configPda, mint: mint.publicKey, authority: wallet.publicKey })
      .signers([mint]) // mint keypair signs once at creation — never needed again
      .rpc();

    const config = await program.account.mintConfig.fetch(configPda);
    console.log("max_supply:", config.maxSupply.toString());
    console.log("total_minted:", config.totalMinted.toString());
    if (config.totalMinted.toNumber() !== 0) throw new Error("Expected 0");
  });

  // ── STEP 2: Mint tokens ────────────────────────────────────────────────────
  // Config PDA signs mint_to CPI → tokens land in recipient's ATA
  // ATA created automatically (init_if_needed)
  it("mint_token — mints 500 tokens to recipient ATA", async () => {
    await program.methods
      .mintToken(new anchor.BN(500))
      .accounts({
        config: configPda,
        mint: mint.publicKey,
        recipientAta,
        recipient: wallet.publicKey,
        payer: wallet.publicKey,
      })
      .rpc();

    const config = await program.account.mintConfig.fetch(configPda);
    console.log("total_minted:", config.totalMinted.toString());
    if (config.totalMinted.toNumber() !== 500) throw new Error("Expected 500");
  });

  // ── STEP 3: Transfer works when NOT frozen ────────────────────────────────
  // Sender signs directly — no PDA needed for user-initiated transfers
  it("transfer_tokens — works when ATA is not frozen", async () => {
    const recipient2 = Keypair.generate();
    const recipient2Ata = getAssociatedTokenAddressSync(mint.publicKey, recipient2.publicKey);

    // First mint some to recipient2 so their ATA exists
    await program.methods
      .mintToken(new anchor.BN(100))
      .accounts({
        config: configPda,
        mint: mint.publicKey,
        recipientAta: recipient2Ata,
        recipient: recipient2.publicKey,
        payer: wallet.publicKey,
      })
      .rpc();

    // Now transfer from wallet's ATA to recipient2
    await program.methods
      .transferTokens(new anchor.BN(50))
      .accounts({
        senderAta: recipientAta,
        recipientAta: recipient2Ata,
        sender: wallet.publicKey,
      })
      .rpc();

    console.log("Transfer succeeded ✅");
  });

  // ── STEP 4: Freeze ────────────────────────────────────────────────────────
  // Config PDA signs freeze_account CPI
  // After this: any transfer/burn on recipientAta is rejected by SPL Token
  it("freeze_holder — freezes wallet ATA", async () => {
    await program.methods
      .freezeHolder()
      .accounts({
        config: configPda,
        mint: mint.publicKey,
        targetAta: recipientAta,
      })
      .rpc();

    console.log("ATA frozen ✅");
  });

  // ── STEP 5: Transfer FAILS when frozen ────────────────────────────────────
  // SPL Token Program enforces the freeze — rejects the transfer
  it("transfer_tokens — FAILS when ATA is frozen", async () => {
    const recipient2 = Keypair.generate();
    const recipient2Ata = getAssociatedTokenAddressSync(mint.publicKey, recipient2.publicKey);

    try {
      await program.methods
        .transferTokens(new anchor.BN(10))
        .accounts({
          senderAta: recipientAta,
          recipientAta: recipient2Ata,
          sender: wallet.publicKey,
        })
        .rpc();
      throw new Error("Expected tx to fail — ATA is frozen");
    } catch (e) {
      if (e.message === "Expected tx to fail — ATA is frozen") throw e;
      console.log("Correctly rejected: account frozen ✅");
    }
  });

  // ── STEP 6: Thaw ─────────────────────────────────────────────────────────
  // Config PDA signs thaw_account CPI — ATA unlocked
  it("thaw_holder — unfreezes wallet ATA", async () => {
    await program.methods
      .thawHolder()
      .accounts({
        config: configPda,
        mint: mint.publicKey,
        targetAta: recipientAta,
      })
      .rpc();

    console.log("ATA thawed ✅");
  });

  // ── STEP 7: Transfer works again after thaw ───────────────────────────────
  it("transfer_tokens — works again after thaw", async () => {
    const recipient2 = Keypair.generate();
    const recipient2Ata = getAssociatedTokenAddressSync(mint.publicKey, recipient2.publicKey);

    await program.methods
      .mintToken(new anchor.BN(100))
      .accounts({
        config: configPda,
        mint: mint.publicKey,
        recipientAta: recipient2Ata,
        recipient: recipient2.publicKey,
        payer: wallet.publicKey,
      })
      .rpc();

    await program.methods
      .transferTokens(new anchor.BN(10))
      .accounts({
        senderAta: recipientAta,
        recipientAta: recipient2Ata,
        sender: wallet.publicKey,
      })
      .rpc();

    console.log("Transfer after thaw succeeded ✅");
  });

  // ── STEP 8: Max supply enforced ───────────────────────────────────────────
  it("mint_token — rejects when max supply exceeded", async () => {
    try {
      await program.methods
        .mintToken(new anchor.BN(999_999))
        .accounts({
          config: configPda,
          mint: mint.publicKey,
          recipientAta,
          recipient: wallet.publicKey,
          payer: wallet.publicKey,
        })
        .rpc();
      throw new Error("Expected tx to fail");
    } catch (e) {
      if (e.message === "Expected tx to fail") throw e;
      console.log("Correctly rejected: max supply ✅");
    }
  });
});
