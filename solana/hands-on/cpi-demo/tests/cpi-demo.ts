import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CpiDemo } from "../target/types/cpi_demo";
import { Responder } from "../target/types/responder";
import { Keypair } from "@solana/web3.js";

describe("cpi-demo", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const invokerProgram = anchor.workspace.CpiDemo as Program<CpiDemo>;
  const responderProgram = anchor.workspace.Responder as Program<Responder>;

  const [authorityPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("authority")],
    invokerProgram.programId
  );

  const counter = Keypair.generate();

  it("initializes authority PDA", async () => {
    const tx = await invokerProgram.methods
      .initialize()
      .accounts({ authority: authorityPda })
      .rpc();
    console.log("initialize tx:", tx);
  });

  it("creates counter account in responder", async () => {
    const tx = await responderProgram.methods
      .initCounter()
      .accounts({ counter: counter.publicKey })
      .signers([counter])
      .rpc();
    console.log("init_counter tx:", tx);

    const acc = await responderProgram.account.counter.fetch(counter.publicKey);
    if (acc.count.toNumber() !== 0) throw new Error("Expected count 0");
  });

  it("invoker CPIs into responder — counter goes to 1", async () => {
    await invokerProgram.methods
      .callIncrement()
      .accounts({
        authority: authorityPda,
        counter: counter.publicKey,
        responderProgram: responderProgram.programId,
      })
      .rpc();

    const acc = await responderProgram.account.counter.fetch(counter.publicKey);
    console.log("count:", acc.count.toString());
    if (acc.count.toNumber() !== 1) throw new Error("Expected count 1");
  });

  it("invoker CPIs again — counter goes to 2", async () => {
    await invokerProgram.methods
      .callIncrement()
      .accounts({
        authority: authorityPda,
        counter: counter.publicKey,
        responderProgram: responderProgram.programId,
      })
      .rpc();

    const acc = await responderProgram.account.counter.fetch(counter.publicKey);
    console.log("count:", acc.count.toString());
    if (acc.count.toNumber() !== 2) throw new Error("Expected count 2");
  });
});
