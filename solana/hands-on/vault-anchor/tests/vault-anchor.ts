import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { VaultAnchor } from "../target/types/vault_anchor";

describe("vault-anchor", () => {
  // Configure the client to use the local cluster.
  // anchor.setProvider(anchor.AnchorProvider.env());

  // Shared counter keypair across tests in this suite
const wallet = anchor.AnchorProvider.env().wallet;
const program = anchor.workspace.vaultAnchor as Program<VaultAnchor>;

  const [counterPda, bump] = anchor.web3.PublicKey.findProgramAddressSync(
    [                                                                                                                         
      Buffer.from("vault"),       //   ← matches b"counter" in seeds
      wallet.publicKey.toBuffer(),   //  ← matches user.key().as_ref()                                                          
    ],                                                      
    program.programId                                                                                                         
  ); 


  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
       const account = await program.account.vault.fetch(counterPda);
    console.log("Count after increment:", account.balance.toString());
    if (account.balance.toNumber() !== 0) throw new Error("Expected count 100");
  });

  it("Deposit  should work!", async () => {
    // Add your test here.
    const tx = await program.methods.deposit(new anchor.BN(100)).rpc();
    console.log("Your transaction signature", tx);
    // fetch bakance after deposit
    const account = await program.account.vault.fetch(counterPda);
    console.log("Count after increment:", account.balance.toString());
    if (account.balance.toNumber() !== 100) throw new Error("Expected count 100");
  });
  it("Deposit 2 should work!", async () => {
    // Add your test here.
    const tx = await program.methods.deposit(new anchor.BN(100)).rpc();
    console.log("Your transaction signature", tx);
    // fetch bakance after deposit
    const account = await program.account.vault.fetch(counterPda);
    console.log("Count after increment:", account.balance.toString());
    if (account.balance.toNumber() !== 200) throw new Error("Expected count 100");
  });
  it("Withdraw should work!", async () => {
    // Add your test here.
    const tx = await program.methods.withdraw(new anchor.BN(100)).rpc();
    console.log("Your transaction signature", tx);
    const account = await program.account.vault.fetch(counterPda);
    console.log("Count after increment:", account.balance.toString());
    if (account.balance.toNumber() !== 100) throw new Error("Expected count 100");
  });
});
