const { ethers } = require("hardhat");
const { expect } = require("chai");
const fs = require("fs");
const path = require("path");

// Load the Fe-compiled artifact
const abi = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../../out/Escrow.abi.json"), "utf8")
);
const bytecode = "0x" + fs.readFileSync(
  path.join(__dirname, "../../out/Escrow.bin"), "utf8"
).trim();

// Helper: assert a tx reverts (Fe produces bare reverts — no reason string)
async function assertReverts(txPromise) {
  try {
    await txPromise;
    throw new Error("Expected transaction to revert, but it succeeded");
  } catch (e) {
    if (e.message === "Expected transaction to revert, but it succeeded") throw e;
    // any other error = revert, which is what we want
  }
}

describe("Escrow (Fe contract, Hardhat)", function () {
  let escrow;
  let deployer, alice, bob;

  beforeEach(async function () {
    [deployer, alice, bob] = await ethers.getSigners();

    const factory = new ethers.ContractFactory(abi, bytecode, deployer);
    escrow = await factory.deploy();
    await escrow.waitForDeployment();
  });

  it("deploys successfully", async function () {
    expect(await escrow.getAddress()).to.not.equal(ethers.ZeroAddress);
  });

  it("deposit stores correct balance for beneficiary", async function () {
    const amount = ethers.parseEther("1.0");

    await escrow.connect(deployer).deposit(alice.address, { value: amount });

    const bal = await escrow.getBalanceOf(alice.address);
    expect(bal).to.equal(amount);
  });

  it("deposit reverts if sender == beneficiary", async function () {
    const amount = ethers.parseEther("1.0");
    // Fe: assert(to.inner != sender.inner) — bare revert, no reason string
    await assertReverts(
      escrow.connect(alice).deposit(alice.address, { value: amount })
    );
  });

  it("deposit with 1 wei works (confirms payable accepts any value > 0)", async function () {
    await escrow.connect(deployer).deposit(alice.address, { value: 1 });
    const bal = await escrow.getBalanceOf(alice.address);
    expect(bal).to.equal(1n);
  });

  it("deposit with value 0 reverts — Fe #[payable] requires value > 0", async function () {
    // FINDING: Fe's #[payable] compiler output inserts an implicit check
    // that CALLVALUE > 0. Calling a #[payable] handler with 0 ETH reverts.
    // This differs from Solidity where payable functions accept value: 0.
    // Fe test VM masks this because it cannot send ETH at all — all calls
    // appear as value: 0 to the contract, so the guard never fires in tests.
    await assertReverts(
      escrow.connect(deployer).deposit(alice.address, { value: 0 })
    );
  });

  it("release clears balance after 7200 blocks", async function () {
    const amount = ethers.parseEther("1.0");

    // Deposit for alice
    await escrow.connect(deployer).deposit(alice.address, { value: amount });
    expect(await escrow.getBalanceOf(alice.address)).to.equal(amount);

    // Mine 7200 blocks to pass the release_time
    await ethers.provider.send("hardhat_mine", ["0x1C20"]); // 0x1C20 = 7200

    // Alice releases her own funds
    await escrow.connect(alice).release();

    // Balance cleared
    expect(await escrow.getBalanceOf(alice.address)).to.equal(0n);
  });

  it("release reverts before release_time", async function () {
    const amount = ethers.parseEther("1.0");

    await escrow.connect(deployer).deposit(alice.address, { value: amount });

    // Do NOT mine blocks — release_time not reached
    await assertReverts(escrow.connect(alice).release());
  });

  it("release reverts if balance is 0 (no deposit for caller)", async function () {
    await ethers.provider.send("hardhat_mine", ["0x1C20"]);
    // alice was never deposited to
    await assertReverts(escrow.connect(alice).release());
  });
});
