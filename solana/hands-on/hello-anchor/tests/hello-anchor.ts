import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { HelloAnchor } from "../target/types/hello_anchor";

describe("hello-anchor", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.helloAnchor as Program<HelloAnchor>;

 it("Is initialized!", async () => {
    const counter = anchor.web3.Keypair.generate(); // new keypair for the counter account

    const tx = await program.methods
      .initialize()
      .accounts({
        counter: counter.publicKey,
      })
      .signers([counter])  // counter must sign because it's being created
      .rpc();

    console.log("Transaction:", tx);

    // Fetch and verify the account
    const account = await program.account.counter.fetch(counter.publicKey);
    console.log("Count:", account.count.toString());
  });
});
