import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { HelloAnchor } from "../target/types/hello_anchor";

describe("hello-anchor", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.helloAnchor as Program<HelloAnchor>;

  // Shared counter keypair across tests in this suite
  // const counter = anchor.web3.Keypair.generate();
const wallet = anchor.AnchorProvider.env().wallet;
  const [counterPda, bump] = anchor.web3.PublicKey.findProgramAddressSync(
    [                                                                                                                         
      Buffer.from("counter"),       //   ← matches b"counter" in seeds
      wallet.publicKey.toBuffer(),   //  ← matches user.key().as_ref()                                                          
    ],                                                      
    program.programId                                                                                                         
  ); 
  it("initializes counter to 0", async () => {
    const tx = await program.methods
      .initialize()
       .accounts({
        user: wallet.publicKey,
      })
      // .signers([counter])  // counter must sign because it's being created
      .rpc();

    console.log("Initialize tx:", tx);

    const account = await program.account.counter.fetch(counterPda);
    console.log("Count after init:", account.count.toString());
    // count must be 0 after initialization
    if (account.count.toNumber() !== 0) throw new Error("Expected count 0");
  });

  it("decrements counter from 0 should fail", async () => {
      try {                                                                                                                       
    // if we get here: tx succeeded — that's wrong, make the test fail
  
    const tx = await program.methods
      .decrement()
      .accounts({
       
        user:wallet.publicKey
      })
      // No extra signers — counter already exists; only the payer wallet signs
      .rpc();

  throw new Error("Expected tx to fail but it succeeded"); 
    } catch (err: any) {
    // check it's the specific error we expected                                                                              
    // AnchorError has err.error.errorCode.code = "Underflow"                                                                 
    if (err.error?.errorCode?.code === "Underflow") return; // test passes                                                    
    throw err; // unexpected error — re-throw                                                                                 
  } });
  it("increments counter from 0 to 1", async () => {
    const tx = await program.methods
      .increment()
      .accounts({
       
        user : wallet.publicKey
      })
      // No extra signers — counter already exists; only the payer wallet signs
      .rpc();

    console.log("Increment tx:", tx);

    const account = await program.account.counter.fetch(counterPda);
    console.log("Count after increment:", account.count.toString());
    if (account.count.toNumber() !== 1) throw new Error("Expected count 1");
  });

  it("increments counter a second time (0→1→2)", async () => {
    await program.methods
      .increment()
      .accounts({ user: wallet.publicKey })
      .rpc();

    const account = await program.account.counter.fetch(counterPda);
    console.log("Count after 2nd increment:", account.count.toString());
    if (account.count.toNumber() !== 2) throw new Error("Expected count 2");
  });
    it("decrements counter from 2 to 1 should work", async () => {
      try {                                                                                                                       
    // if we get here: tx succeeded — that's wrong, make the test fail
  
    const tx = await program.methods
      .decrement()
      .accounts({
  user: wallet.publicKey      })
      // No extra signers — counter already exists; only the payer wallet signs
      .rpc();

    console.log("Increment tx:", tx);

    const account = await program.account.counter.fetch(counterPda);
    console.log("Count after increment:", account.count.toString());
    if (account.count.toNumber() !== 1) throw new Error("Expected count 1");
    } catch (err: any) {
    // check it's the specific error we expected                                                                              
    // AnchorError has err.error.errorCode.code = "Underflow"                                                                 
    if (err.error?.errorCode?.code === "Underflow") return; // test passes                                                    
    throw err; // unexpected error — re-throw                                                                                 
  } });
});
