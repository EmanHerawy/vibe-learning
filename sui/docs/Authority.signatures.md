# Authority signatures

## Protocol key pair
> Sui uses the `BLS12381` scheme for its fast verification on aggregated signatures for a given number of authorities
Let me break this down into simple concepts:

### What's the Main Point?

Sui blockchain uses a special signature system to verify transactions quickly and efficiently when multiple validators need to approve them.

### The Key Ideas:

**1. Multiple validators must agree**
- Think of validators like judges who must approve a transaction
- They need at least 2/3 of them to agree (like needing 67 out of 100 judges to say "yes")
- Each validator signs with their special key to show approval

**2. The magic trick: signature compression**
- Normally, if you have 100 validators signing, you'd need to store 100 separate signatures
- Instead, Sui uses BLS signatures that can be "squished together" into ONE signature
- It's like having 100 people sign a petition, but instead of 100 signatures on the page, you magically combine them into one signature that still proves all 100 people signed

**3. Why this matters**
- **Smaller data** = faster network, lower costs
- Instead of passing around 67+ signatures, you pass around just 1 signature + a simple checklist showing who signed

**4. Security protection**
- There's a risk someone could copy/misuse another validator's key
- So when validators register, they must prove they actually own their key (like showing ID when you register to vote)
- Sui adds extra protection by tying the key to their address

### Real-world analogy:
Imagine a group vote where you need 67 out of 100 people to approve something. Instead of collecting 67 individual paper signatures, you have a magical stamp that combines all 67 signatures into one mark, plus a checkbox list showing who voted. Much easier to carry around!



## Account key pair
Sui uses pure Ed25519 as the signing scheme.



## Network key pair
The private key is used to perform the TLS handshake required for consensus networking. The public key is used for validator identity. Pure Ed25519 is used as the scheme.

