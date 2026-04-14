


# Day 1
In our first session, we looked at the **Quantum Threat Model**—specifically why Ethereum (and almost every blockchain) is in the crosshairs.

### The Refresh: Two Algorithms, Two Threats

Think of quantum computers as having two specific "tools" in their toolbox:

1. **Shor’s Algorithm (The Sniper):**
* **Targets:** Elliptic Curve Math (`secp256k1`).
* **Power:** It can calculate a **Private Key** from a **Public Key** almost instantly by finding the "period" or pattern in the curve math (the Discrete Logarithm Problem).
* **The Ethereum Impact:** Once you send a transaction, your Public Key is revealed. Shor's can then derive your Private Key.


2. **Grover’s Algorithm (The Sledgehammer):**
* **Targets:** Hashes (Keccak-256) and Symmetric Encryption (AES).
* **Power:** It doesn't "break" the math; it just makes searching for the answer much faster (a quadratic speedup).
* **The Ethereum Impact:** It makes a 256-bit hash feel like a 128-bit hash. It's a "weakening," but not a "total break."



---

### Knowledge Check: Let's see what stuck!

Since you’re an auditor, I’ve framed these as "Security Findings." Tell me if these statements are **True** or **False**, and give me a one-sentence "Audit Note" as to why.

**Scenario A: The Virgin Wallet**

> "I have a wallet with 1,000 ETH. I have only ever *received* funds to it; I have never sent a single transaction or signed a message. Therefore, my funds are safe from Shor’s Algorithm."

* **Verdict:** [True/False]
* **Audit Note:** **Scenario B: The Hash Upgrade**

> "Because of Grover's Algorithm, Ethereum must immediately move from Keccak-256 to a 1024-bit hash to remain secure."

* **Verdict:** [True/False]
* **Audit Note:** **Scenario C: The Multi-Chain Leak**

> "If I use the same private key on Polygon (where I sent a tx) and Ethereum (where I haven't), my Ethereum funds are still safe because the chains are separate."

* **Verdict:** [True/False]
* **Audit Note:** **Scenario D: The "Shor's" Target**

> "Shor's Algorithm works by guessing the private key faster than a classical computer can."

* **Verdict:** [True/False]
* **Audit Note:**

---




# Day 2
