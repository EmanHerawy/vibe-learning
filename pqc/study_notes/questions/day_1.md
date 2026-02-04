## Questions with Answers

1. You are a Whale. You have 10,000 ETH. Your address is on the block explorer, but you have never sent a transaction (your Public Key is hidden inside the Keccak-256 hash).

**Question**: Why can a quantum attacker break Vitalik's wallet (who has sent many transactions) but cannot break yours using Shor's Algorithm?
```

Exactly! You’ve nailed the core logic.

To refine your "Auditor’s vocabulary":
Vitalik is vulnerable because his Public Key is revealed in the calldata of his previous transactions. Shor's can solve the Discrete Logarithm Problem to derive his Private Key.You are safe because your Public Key is "pre-image protected" by Keccak-256. 
As you noted, Grover’s only provides a square-root speedup ($2^{256}$ becomes $2^{128}$), which is still cryptographically secure (it would still take more energy than exists in the visible universe to crack).

```

### Day 1: The Rust Hands-on Lab

**The Mission:** Write a Rust tool that generates a private key, derives the Ethereum address, and identifies the exact "Public Key" data that a quantum computer would use to break you.

#### 1. Setup

Create a new folder and initialize:

```bash
cargo new pqc_day1_lab
cd pqc_day1_lab

```

#### 2. Dependencies

Add these to your `Cargo.toml`. We use `k256` (the industry standard for secp256k1) and `tiny-keccak` (for the Ethereum hash).

```toml
[dependencies]
k256 = { version = "0.13", features = ["ecdsa"] }
tiny-keccak = { version = "2.0", features = ["keccak"] }
hex = "0.4"

```

#### 3. The Code

Copy this into your `src/main.rs`. I’ve commented it like a mentor—read the comments as you go.

```rust
use k256::SecretKey;
use tiny_keccak::{Hasher, Keccak};
use hex;

fn main() {
    // 1. Generate a random Private Key (The "Secret")
    let secret_key = SecretKey::random(&mut rand::thread_rng());
    let priv_bytes = secret_key.to_bytes();

    // 2. Derive the Public Key (The "Quantum Target")
    // In Ethereum, we use the "Uncompressed" public key (64 bytes + 0x04 prefix)
    let public_key = secret_key.public_key();
    let public_key_bytes = public_key.to_encoded_point(false); // false = uncompressed
    let raw_pub_bytes = &public_key_bytes.as_bytes()[1..]; // Remove the 0x04 prefix

    // 3. Generate the Ethereum Address (The "Shield")
    let mut hasher = Keccak::v256();
    let mut hash_out = [0u8; 32];
    hasher.update(raw_pub_bytes);
    hasher.finalize(&mut hash_out);
    
    // Address is the last 20 bytes of the Keccak256 hash
    let address = &hash_out[12..];

    println!("--- QUANTUM VULNERABILITY REPORT ---");
    println!("1. Private Key (Secret):  0x{}", hex::encode(priv_bytes));
    println!("2. Eth Address (Safe):    0x{}", hex::encode(address));
    println!("3. Public Key (DANGER):   0x{}", hex::encode(raw_pub_bytes));
    println!("------------------------------------");
    println!("\nAUDIT NOTE:");
    println!("A Quantum Computer running Shor's Algorithm needs item #3 to find item #1.");
    println!("If the blockchain only knows item #2 (the address), you are safe.");
    println!("Once you send a tx, item #3 is published to the world. Game over.");
}

```

---

### Your Review Task (Check-on-learning)

Run the code with `cargo run`. Look at the output.

**Tell me three things:**

1. **Size Check:** How many characters (hex) is the Public Key vs. the Address? (This helps you remember why they are different).
2. **The Auditor's Logic:** If you see a "vanity address" (like `0x000000...`) on Etherscan that has **zero** outgoing transactions, can a quantum computer steal its funds? Why or why not?
3. **Rust Observation:** In the code, we removed the first byte `[1..]` of the public key before hashing. Do you know (or can you guess) what that discarded first byte `0x04` represents in SEC1 encoding?

**Once you answer these, we officially move to Day 2: The Signature Bloat Problem!**

Great job on the Day 1 summary! You’ve got the logic down. Let's clear up those few technical blanks so you have a "perfect" mental model before we hit the Day 2 code.

### 1. The Size Check (Mental Math for Auditors)

* **Public Key:** 128 hex characters. Since 2 hex characters = 1 byte, that's **64 bytes**. (If you include the `0x04` prefix, it's 65 bytes/130 chars).
* **Address:** 40 hex characters. That's **20 bytes**.
* **The "Why":** Why discard 12 bytes of the hash? It was an early design choice in Ethereum to keep addresses short and "user-friendly" (if you can call a 40-char string friendly).

### 2. The Vanity Address (Quantum Safety)

* **Correct!** If the public key has **never** been revealed on the blockchain (zero outgoing transactions), Shor's Algorithm has no "target" to calculate against. The 10,000 ETH is safe.
* **Caveat:** The second you send a transaction to move that money, your Public Key is revealed in the `witness` data. In a quantum world, an attacker would see your transaction in the **mempool** and try to derive your key and front-run you before your tx is even mined.

### 3. The Mystery of `0x04` (SEC1 Encoding)

As a dev/auditor, you’ll see this byte everywhere in crypto libraries.

* **0x04** means **Uncompressed**. It tells the computer: "What follows is the full X coordinate (32 bytes) AND the full Y coordinate (32 bytes)."
* **0x02 or 0x03** would mean **Compressed**. Because the curve is symmetrical, you only really need X and a "hint" about Y (is it even or odd?). This saves space (33 bytes total), but Ethereum chose the uncompressed format for its address derivation.

---

Before we move to the code and the gas costs of Day 2, let's lock in your knowledge from Day 1. These questions are designed to test your "Auditor's Instinct"—thinking about the vectors and the math logic rather than just the definitions.

### Day 1: Knowledge Check (The Auditor's Challenge)

**1. The "Transaction Interception" Scenario:**
Imagine a quantum attacker with a massive quantum computer. They are watching the Ethereum mempool. A user broadcasts a transaction from a "safe" address (one that has never sent a tx before).

* **The Problem:** The user's Public Key is now visible in the mempool for about 12 seconds (until the next block).
* **The Question:** Is the user still "safe"? Or can the attacker use Shor's Algorithm to derive the private key and "front-run" the user with a higher gas fee before the original transaction is mined?

**2. The Hash vs. Curve Logic:**
You mentioned that Shor’s breaks the "Curve math" but not the "Hash."

* **The Question:** In terms of **Structure**, why does Shor’s work on a curve? (Hint: Does it look for a "repeating pattern/period" or does it just "guess really fast"?)

**3. The "Doubling" Strategy:**
If Grover’s Algorithm makes a 256-bit hash (like Keccak-256) feel like it only has 128 bits of security...

* **The Question:** If we wanted to keep the *exact same* level of security we have today (256 bits) in a quantum world, what size should our new hash function be?

**4. The SEC1 Encoding (from your code):**
When you ran the code, you saw the `0x04` prefix.

* **The Question:** If a developer tells you, "I want to save space, so I'm going to use **Compressed Public Keys** (33 bytes) which start with `0x02` or `0x03` instead of `0x04`," does this make the account **more** quantum-secure, **less** quantum-secure, or is there **no change**? Why?

---

### End-of-Day 1 Check:

Answer these 4 questions in your own words. Don't worry about being perfectly academic—explain them like you're explaining a bug to another developer.

Spot on. Your logic is tight, and you're thinking like an auditor—looking at the actual attack window and the underlying data structure.

---

### Final Review of Day 1

1. **The Mempool Window:** You’re exactly right. If an attacker can solve the problem in **< 12 seconds**, you’re cooked.
* **Pro Insight:** This is why PQC research focuses so much on "Hybrid Transactions." Even if the main chain isn't PQC yet, we might need a way to submit transactions that are "Quantum-Lead-Safe."


2. **The Logic (Shor's vs. Curve):** * **The Nuance:** Shor’s works by finding a **Hidden Period**. Imagine the curve is a clock with a billion hours.  means you start at 12 and jump  times. Shor’s uses a "Quantum Fourier Transform" to "listen" to the frequency of those jumps and find the period (the secret ). It doesn't guess; it extracts the pattern from the "math noise."
3. **The "Doubling" Strategy:** * **The Nuance:** You said increase it 4x. Actually, because Grover's provides a **Square Root** speedup (), you only need to **double** the bit length.
* **Math:** To keep 256-bit security, you'd move to a **512-bit hash**. . So, Keccak-512 is the quantum-equivalent of Keccak-256.


4. **Compressed Keys:** * **The Nuance:** Correct. No change in security. It’s the same point on the curve, just a different way of writing the "address."
