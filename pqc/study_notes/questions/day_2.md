This is an excellent idea. As someone with a "bad memory," building a **Personal Knowledge Base** is your secret weapon. Writing it down once is good; having a refined, "mentor-approved" version to review is how you become an expert.

Here is your consolidated **Day 1 & Day 2 Knowledge Audit**, refined for your permanent notes.

---

# 🛡️ PQC Masterclass: Senior Dev/Auditor Notes

## **Module 1: The Quantum Threat Model**

### **Q1: The Mempool Front-Running Risk**

* **The Scenario:** A user broadcasts a transaction from a "fresh" address. Their public key is visible in the mempool for ~12 seconds.
* **Your Answer:** It is theoretically possible to leak the private key from the public key if the attacker can do it in less than 12 seconds.
* **Mentor’s Elaborated Feedback:** **Correct.** While current quantum computers can't do this yet, the danger is real. In the future, we will need **"Quantum-Safe Mempools"** or **Commit-Reveal schemes** to hide the public key until the very moment of execution to prevent "Quantum Front-Running."

### **Q2: Shor’s Algorithm vs. The Discrete Log**

* **The Scenario:** Why does Shor’s work on a curve pattern?
* **Your Answer:** It doesn't guess; it mathematically breaks the base of the key derivation. It calculates the "period" (step size) of the curve points.
* **Mentor’s Elaborated Feedback:** **Spot on.** Shor’s uses a **Quantum Fourier Transform (QFT)**. Imagine the curve is a giant loop. Shor’s "listens" to the math and finds the exact circumference (the period) of that loop. Once it knows the circumference, the "Private Key" is revealed through simple division.

### **Q3: Grover’s Algorithm & Hash Security**

* **The Scenario:** How do we protect Keccak-256 against Grover’s?
* **Your Answer:** Increase the length. At least 4 times because Grover's reduces complexity quadratically.
* **Mentor’s Elaborated Feedback:** **Slight Correction.** You actually only need to **Double** the bit-length. Because Grover's is a square-root speedup (), a 512-bit hash provides  quantum security. So, **Keccak-512** is the direct quantum-resistant replacement for Keccak-256.

### **Q4: The "Multi-Chain Leak" Audit**

* **The Scenario:** If a public key is revealed on Polygon, is the same key safe on Ethereum Mainnet?
* **Your Answer:** False. It is not related to the chain; it is about the key derivation. The public key is the same.
* **Mentor’s Elaborated Feedback:** **Critical Audit Finding.** Correct. This is a massive risk today. Attackers are currently **"Harvesting"** public keys from cheap chains (L2s, sidechains) to store them in databases. When a powerful quantum computer is built, they will use those keys to unlock "virgin" wallets on Mainnet.

---

## **Module 2: Lattices & Dilithium (PQC Primitives)**

### **Q5: Why is Dilithium "Big"?**

* **The Scenario:** Why is the signature size 70x larger than ECDSA?
* **Your Answer:** Because we aren't just sending two coordinates anymore; we are sending many random points (noise) across too many dimensions to make it harder to reverse.
* **Mentor’s Elaborated Feedback:** **Correct.** Lattice signatures are "thick" because they rely on **Learning With Errors (LWE)**. To prove you know the secret without revealing it, you have to provide a large mathematical "vector" that includes specific "noise." If you didn't include the noise, Shor's could find the pattern.

### **Q6: The Rejection Sampling Mechanism**

* **The Scenario:** What happens if a signature has "too little noise"?
* **Your Answer:** It should be rejected because it reveals info a hacker can use to compromise the wallet key later.
* **Mentor’s Elaborated Feedback:** **Perfect.** This is a unique security feature. In Dilithium, the signature process is an **Iterative Loop**. If the resulting signature is too close to the private key (not enough noise), the signer throws it away and restarts. An implementation that forgets this check is a **Critical Vulnerability**.

### **Q7: Falcon vs. Dilithium (The Float Issue)**

* **The Scenario:** Why is Dilithium safer for Solidity/Rust devs than Falcon?
* **Your Answer:** Falcon uses floating-point math, which is a big problem in smart contracts and not supported.
* **Mentor’s Elaborated Feedback:** **100% Correct.** Determinism is king in blockchain. Floating-point math () behaves differently on different CPUs. Dilithium uses **Integer-only math**, making it perfect for the EVM and cross-platform Rust environments.

---

## **Summary for your Notes: The "Senior Dev" Cheat Sheet**

| Metric | ECDSA (Current) | Dilithium2 (PQC) |
| --- | --- | --- |
| **Signature Size** | 64-65 Bytes | ~2,420 Bytes |
| **Public Key Size** | 33-65 Bytes | ~1,312 Bytes |
| **Math Foundation** | Elliptic Curves (DLP) | Module Lattices (MLWE) |
| **Quantum Threat** | **Total Break** (Shor's) | **Resistant** |
| **Gas Cost (Data)** | ~1,040 Gas | ~38,720 Gas |

---

