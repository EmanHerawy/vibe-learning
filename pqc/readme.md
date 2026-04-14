# Vibe learning Roadmap


## The "Dev-First" PQC Roadmap

### Week 1: The "Why" and the "Tooling"

*Objective: Get comfortable with the PQC libraries and see the "Quantum Threat" in action.*

* **Day 1: The Quantum Break.** Use a Python/Rust script to simulate how Shor's Algorithm breaks a small-integer RSA key.
* **Goal:** See the math fail.


* **Day 2: The "Bloat" Problem.** Write a Solidity contract that tries to store a Mock Dilithium Signature (2.5KB) in `calldata`. Check the gas cost.
* **Goal:** Understand why we can't just "copy-paste" PQC into Ethereum today.


* **Day 3: Setting up the Rust Lab.** Set up a workspace with `pqcrypto-dilithium` and `pqcrypto-kyber` crates.
* **Goal:** Successfully generate a PQC keypair in Rust.


* **Day 4: Key Encapsulation (KEM) vs. Signing.** Hands-on with Kyber.
* **Goal:** Understand that in PQC, we don't just "encrypt"; we "encapsulate" secrets.


* **Day 5: The "Hybrid" Approach.** Write a Rust wrapper that generates a "Double Key" (1 ECDSA + 1 Dilithium).
* **Goal:** Learn how we protect accounts during the transition period.


* **Day 6: Knowledge Check & Review.** You explain the "Bloat Problem" back to me.
* **Day 7: Rest / Catch-up.**

### Week 2: Lattices for Dummies (The "Visual" Math)

*Objective: Understand Lattices without solving a single equation.*

* **Day 8: Grid World.** Visualizing Lattices as a 2D grid of points.
* **Goal:** Understand the "Shortest Vector Problem" (SVP) as a game of "Find the point closest to the origin."


* **Day 9: Learning With Errors (LWE).** Adding "noise" to math.
* **Goal:** Understand that PQC is secure because it’s hard to solve equations when someone "jiggles" the numbers.


* **Day 10: Dilithium Deep Dive (Part 1).** The Structure.
* **Goal:** Identify the public/private key components in the Rust crate.


* **Day 11: Dilithium Deep Dive (Part 2).** The "Fiat-Shamir" transform.
* **Goal:** Understand how a proof becomes a signature.


* **Day 12: Implementation Audit.** Look at a known "bad" implementation of a lattice scheme.
* **Goal:** Spot why "non-constant time" code is a death sentence in PQC.


* **Day 13: Knowledge Check.**
* **Day 14: Rest.**

---

## Our Learning Protocol (Addressing your Constraints)

To help with your **memory** and **math-anxiety**, we will use this 3-step loop every day:

1. **The 10-Minute Warm-up:** I will ask you one "Auditor's Question" about what we learned yesterday. (Prevents forgetting).
2. **The 40-Minute Build:** You write code or a "Cheat Sheet" for your future self.
3. **The 10-Minute Summary:** You explain the "End Goal" of the day in one sentence. If you can't, we haven't finished.

