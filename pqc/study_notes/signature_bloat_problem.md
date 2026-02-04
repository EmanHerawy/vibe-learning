
## Day 2: The "Signature Bloat" Problem

**The End Goal of Today:** Understand why we can't just "plug and play" PQC into the current Ethereum Virtual Machine (EVM).

### 1. The Problem: Data Weight

As a Senior Solidity dev, you know that **calldata** is one of the biggest costs in a transaction.

* **ECDSA (Now):** ~65 bytes.
* **Dilithium (NIST Standard PQC):** ~2,420 to 4,500 bytes.

Imagine a simple `transfer(address to, uint256 amount)` function.

1. In the **ECDSA** world, the signature is a tiny fraction of the data.
2. In the **PQC** world, the signature is a **massive wall of data** that is 40x to 70x larger than the actual transaction instructions.


###  The "Stack Too Deep" Problem

In the EVM, you can only have 16 local variables in a function.

* Because a PQC signature is so large, you cannot simply pass it around as a stack variable.
* You **must** use `memory` or `calldata` pointers. This changes how you write every single validation function in your smart contracts.

### C. The Verification Cost

Checking an ECDSA signature costs about **3,000 gas** (using the `ecrecover` precompile).
A PQC signature doesn't have a precompile yet. Verifying it in "Pure Solidity" would cost **millions of gas**, exceeding the block limit. This is why the industry is pushing for **New Precompiles** or **ZK-Proofs** to handle the heavy lifting.
