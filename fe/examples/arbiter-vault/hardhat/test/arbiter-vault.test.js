const { ethers } = require("hardhat");
const { expect } = require("chai");
const fs = require("fs");
const path = require("path");

// Load Fe-compiled artifacts
const vaultAbi = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../../out/Vault.abi.json"), "utf8")
);
const vaultBytecode = "0x" + fs.readFileSync(
  path.join(__dirname, "../../out/Vault.bin"), "utf8"
).trim();

const arbiterAbi = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../../out/Arbiter.abi.json"), "utf8")
);
const arbiterBytecode = "0x" + fs.readFileSync(
  path.join(__dirname, "../../out/Arbiter.bin"), "utf8"
).trim();

async function assertReverts(txPromise) {
  try {
    await txPromise;
    throw new Error("Expected transaction to revert, but it succeeded");
  } catch (e) {
    if (e.message === "Expected transaction to revert, but it succeeded") throw e;
  }
}

describe("Arbiter/Vault (Fe cross-contract calls)", function () {
  let vault, arbiter;
  let depositor, arbiterSigner, thirdParty;

  beforeEach(async function () {
    [depositor, arbiterSigner, thirdParty] = await ethers.getSigners();

    // 1. Deploy Arbiter first (depositor = deployer = msg.sender)
    const ArbiterFactory = new ethers.ContractFactory(arbiterAbi, arbiterBytecode, depositor);
    arbiter = await ArbiterFactory.deploy();
    await arbiter.waitForDeployment();

    // 2. Deploy Vault with Arbiter's address as the arbiter
    const VaultFactory = new ethers.ContractFactory(vaultAbi, vaultBytecode, depositor);
    vault = await VaultFactory.deploy(await arbiter.getAddress());
    await vault.waitForDeployment();
  });

  // ── Deployment ──────────────────────────────────────────────────────────────

  it("deploys Vault and Arbiter successfully", async function () {
    expect(await vault.getAddress()).to.not.equal(ethers.ZeroAddress);
    expect(await arbiter.getAddress()).to.not.equal(ethers.ZeroAddress);
  });

  // ── Deposit ─────────────────────────────────────────────────────────────────

  it("Vault accepts ETH deposit", async function () {
    const amount = ethers.parseEther("1.0");
    await vault.connect(depositor).deposit({ value: amount });

    const balance = await ethers.provider.getBalance(await vault.getAddress());
    expect(balance).to.equal(amount);
  });

  it("Vault rejects deposit with zero value", async function () {
    await assertReverts(vault.connect(depositor).deposit({ value: 0 }));
  });

  // ── Release via Arbiter (the cross-contract call) ───────────────────────────

  it("depositor receives ETH back after Arbiter approves", async function () {
    const amount = ethers.parseEther("1.0");

    // Fund the Vault
    await vault.connect(depositor).deposit({ value: amount });
    expect(await ethers.provider.getBalance(await vault.getAddress())).to.equal(amount);

    // Record depositor balance before release
    const balanceBefore = await ethers.provider.getBalance(depositor.address);

    // Depositor calls Arbiter.approve(vault) → Arbiter calls Vault.release(depositor)
    // → Vault sends ETH to depositor via call.call with VaultMsg::Deposit as fake msg
    const tx = await arbiter.connect(depositor).approve(await vault.getAddress());
    const receipt = await tx.wait();
    const gasUsed = receipt.gasUsed * receipt.gasPrice;

    const balanceAfter = await ethers.provider.getBalance(depositor.address);

    // Depositor got 1 ETH back (minus gas)
    expect(balanceAfter).to.equal(balanceBefore - gasUsed + amount);

    // Vault is empty
    expect(await ethers.provider.getBalance(await vault.getAddress())).to.equal(0n);
  });

  // ── Access control ───────────────────────────────────────────────────────────

  it("third party cannot call Arbiter.approve", async function () {
    const amount = ethers.parseEther("1.0");
    await vault.connect(depositor).deposit({ value: amount });
    await assertReverts(arbiter.connect(thirdParty).approve(await vault.getAddress()));
  });

  it("third party cannot call Vault.release directly", async function () {
    const amount = ethers.parseEther("1.0");
    await vault.connect(depositor).deposit({ value: amount });
    await assertReverts(vault.connect(thirdParty).release(thirdParty.address));
  });

  it("Vault.release reverts if balance is zero", async function () {
    await assertReverts(arbiter.connect(depositor).approve(await vault.getAddress()));
  });
});
