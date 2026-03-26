import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TokenMinterAnchor } from "../target/types/token_minter_anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";

describe("token-minter-anchor", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.TokenMinterAnchor as Program<TokenMinterAnchor>;
  const wallet = anchor.AnchorProvider.env().wallet;

  // Mint is a regular keypair account (not a PDA)
  const mint = Keypair.generate();

  // Config PDA
  const [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  it("initialize — creates Mint with PDA as authority", async () => {
    const maxSupply = new anchor.BN(1_000_000);
    await program.methods
      .initialize(maxSupply)
      .accounts({
        config: configPda,
        mint: mint.publicKey,
        authority: wallet.publicKey,
      })
      .signers([mint]) // mint keypair must sign because it's being initialized
      .rpc();

    const config = await program.account.mintConfig.fetch(configPda);
    console.log("max_supply:", config.maxSupply.toString());
    console.log("total_minted:", config.totalMinted.toString());
    if (config.totalMinted.toNumber() !== 0) throw new Error("Expected 0");
  });

  it("mint_token — mints tokens to recipient ATA", async () => {
    const recipient = wallet.publicKey;
    const recipientAta = getAssociatedTokenAddressSync(mint.publicKey, recipient);

    await program.methods
      .mintToken(new anchor.BN(100))
      .accounts({
        config: configPda,
        mint: mint.publicKey,
        recipientAta,
        recipient,
        payer: wallet.publicKey,
      })
      .rpc();

    const config = await program.account.mintConfig.fetch(configPda);
    console.log("total_minted:", config.totalMinted.toString());
    if (config.totalMinted.toNumber() !== 100) throw new Error("Expected 100");
  });

  it("mint_token — respects max supply", async () => {
    try {
      await program.methods
        .mintToken(new anchor.BN(999_999)) // would exceed max_supply of 1_000_000
        .accounts({
          config: configPda,
          mint: mint.publicKey,
          recipientAta: getAssociatedTokenAddressSync(mint.publicKey, wallet.publicKey),
          recipient: wallet.publicKey,
          payer: wallet.publicKey,
        })
        .rpc();
      throw new Error("Expected tx to fail");
    } catch (e) {
      if (e.message === "Expected tx to fail") throw e;
      console.log("Correctly rejected: max supply exceeded");
    }
  });
});
