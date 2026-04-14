## What is Dilithium? (ML-DSA)

**Dilithium** — now standardized by NIST as **ML-DSA** — is currently the most widely adopted and trusted post-quantum digital signature scheme.
### Dilithium vs ECDSA
* **The "Map" vs. the "Grid":** Imagine ECDSA is like finding a specific house on a single winding road. Dilithium is like finding a specific point in a **1,000-dimensional grid**.
* **The Noise:** To stop a quantum computer from "hearing" the math pattern (as Shor's does), we add **random noise** to the equations.
* **The Proof:** To prove you know the secret key without revealing it, you can't just send one coordinate. You have to send a large set of "vectors" (mathematical arrows) that point toward the solution.

**The result:** You are essentially sending a "mathematical puzzle piece" that is physically larger because it contains hundreds of coordinates and noise-cancellation "hints."

### Core hardness assumption
It is built on the **Module Learning With Errors (Module-LWE)** problem over structured lattices (module lattices).

- Solving linear equations is easy.
- Adding even very small random errors to each equation makes the problem extremely hard — for both classical and quantum computers.

### How signing works (high-level)
Dilithium follows the **Fiat–Shamir with aborts** paradigm:

1. The signer creates a **commitment** (a masked version of a secret vector + randomness)
2. A **challenge** is derived by hashing (message || commitment)
3. The signer computes a **response** vector
4. **Rejection sampling** is applied: if the response is statistically too close to revealing secret information, the signature is rejected and the process restarts

This rejection step is the main reason signing is slower and non-deterministic in runtime.

### Signature & key sizes (why so big?)

| Scheme     | Public key | Secret key | Signature  | Remark                                 |
|------------|------------|------------|------------|----------------------------------------|
| ECDSA secp256k1 | ~33–65 B  | ~32 B     | ~64–72 B  | Very compact                           |
| Dilithium2 (ML-DSA-44) | ~1.3 kB   | ~2.5 kB   | ~2.4 kB   | NIST Level 2 security                  |
| Dilithium3 (ML-DSA-65) | ~1.9 kB   | ~4.0 kB   | ~3.3 kB   | NIST Level 3 security                  |
| Dilithium5 (ML-DSA-87) | ~2.6 kB   | ~4.9 kB   | ~4.6 kB   | NIST Level 5 security                  |

The large size comes from:

- High-dimensional vectors (often 256–1024 dimensions)
- Many coefficients per polynomial (256–1024)
- Modulus is relatively large (2¹²–2²³ range)
- Extra “hint” bits needed to make verification deterministic

## Dilithium vs Falcon — Quick Comparison (2025 perspective)

| Property                  | Dilithium (ML-DSA)                          | Falcon                                       |
|---------------------------|---------------------------------------------|----------------------------------------------|
| Hardness                  | Module-LWE                                  | NTRU / Ring-LWE (FFT-friendly)               |
| Signature size            | Large (2.4–4.6 kB)                          | Very small (~0.7–1.1 kB)                     |
| Public key size           | Large (~1.3–2.6 kB)                         | Medium (~0.9–1.8 kB)                         |
| Arithmetic                | **Integer-only**, exact, constant-time easy | Floating-point heavy (Gaussian sampling)     |
| Implementation safety     | **Much easier** to implement safely         | Very easy to get wrong (rounding → key leak) |
| Side-channel resistance   | Good (with care)                            | Harder (floating-point is side-channel risky)|
| Constant-time story       | Straightforward                             | Requires very careful constant-time floats   |
| Ethereum / smart-contract fit | **Strong preference** today                 | Very problematic (no reliable fixed-point)   |
| Standardization status    | NIST primary (FIPS 204)                     | NIST backup (but not primary)                |
| Adoption momentum (2025)  | Very strong                                 | Declining                                    |

**Bottom line for audits / Ethereum context:**  
Most security teams and protocol designers currently prefer **Dilithium** because it is significantly easier to implement correctly and to audit across platforms.

## The Rejection Sampling Step — What Auditors Should Look For

This is the single most important correctness & security property of Dilithium.

### What actually happens during signing

1. Generate candidate signature components (→y vector + noise)
2. Compute challenge c = H(message || commitment)
3. Compute response z = y + c·s (where s = secret)
4. **Check whether z is within a safe bound**  
   → if **too large** or statistically biased → **reject & restart**
5. If safe → output (z, hint, c)



# Rejection Sampling — explained like you’re 12 years old

Imagine you are trying to prove to your friend that you know a secret number … **without actually telling him the number**.

But the way you prove it accidentally leaks tiny hints about the secret — unless you are **very careful**.

So Dilithium does this:

1. You create a possible proof (a signature candidate).
2. You immediately ask yourself:  
   “Does this proof give away even a tiny clue about my secret key?”
3. If the answer is **“yes, it’s a bit suspicious / too big / weird shape”** → you **throw it away** and try again from step 1.
4. You keep doing this until you get a proof that looks **completely normal and random** — only then do you show it to the world.

This “throw away and try again” step is called **rejection sampling**.

### Why do we need to reject sometimes?

Because if you **never** reject anything, a very smart attacker who sees thousands of your signatures can slowly collect all those tiny leaked hints → and eventually recover your secret key.

→ Rejection sampling is **the main protection** that stops this slow leak.

### What are the dangerous red flags auditors look for?

Here are the most serious problems — explained simply:

| # | What you see in the code | What it really means | How dangerous? |
|---|---------------------------|----------------------|----------------|
| 1 | There is **no loop** at all around the signing logic | The code **never rejects** anything | **Catastrophic** — almost certainly broken, key can be stolen |
| 2 | There is a loop, but it **almost never runs more than 1 time** (or exactly 1 time in tests) | Rejection is disabled or bounds are way too loose | **Very dangerous** — weak protection, key leakage likely |
| 3 | The loop exists, but the **check condition is commented out** or replaced with `true` / `false` | Developer “turned off” the safety check | **Critical vulnerability** |
| 4 | The bounds / thresholds used in the check are **different** from the official Dilithium specification | Wrong rejection rules → either too many rejects (slow) **or** too few rejects (insecure) | **High risk** — can be insecure or DoS |
| 5 | The rejection check **is not constant-time** (branches on secret data) | Attacker can measure time → learns secret key bits | **Serious side-channel vulnerability** |
| 6 | The randomness used for masking/y is **not cryptographically strong** (e.g. using rand() or same seed) | Predictable masking → easy to attack | **Critical** |

### Quick “is this Dilithium signing code probably safe?” checklist

Ask these yes/no questions:

- Does the signing function sometimes return early → and sometimes loop many times?  
  → **Good** (normal behavior)

- Can you see a clear check like  
  `if norm(z) > bound || hint needed` → reject ?  
  → **Good**

- Is the bound coming from the official parameter set (Dilithium2 / 3 / 5)?  
  → **Good**

- Does the loop have a reasonable upper limit (usually 3–10 attempts on average)?  
  → **Good**

- Is there **no loop at all**, or does it always do exactly one attempt?  
  → **Very bad — almost certainly broken**

### Summary — one sentence version

Rejection sampling = “If the signature looks even slightly suspicious, throw it away and try again.”  
**If the code never throws anything away → the secret key will leak.**
