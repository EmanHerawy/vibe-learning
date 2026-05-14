# ZKNOX — Post-Quantum Smart Account (Fe Implementation)

> A Fe implementation of an ERC4337 account enabling post-quantum security. The account lets us verify two signatures rather than only one. The goal is to enable post-quantum signatures while keeping the current ECDSA verification. — replacing Solidity implementation with Fe. 
---
## Why Hybrid Signatures?

A quantum computer can break ECDSA (the signature scheme every Ethereum wallet uses today) but cannot break hash functions. So the strategy is simple: sign every transaction with **both** ECDSA *and* a post-quantum algorithm (ML-DSA-44). Classical nodes validate the ECDSA half; once quantum computers arrive, the ML-DSA-44 half keeps the account safe. Neither key alone is enough — you need both to move funds.

[Vitalik's quantum emergency post](https://ethereum-magicians.org/t/how-to-hard-fork-to-save-most-users-funds-in-a-quantum-emergency/18901) explains that even without pre-migration, Ethereum can hard-fork to let users prove ownership of a frozen account using a STARK proof of their BIP-39 seed — because hashes survive quantum. 

For a full breakdown of migration scenarios and readiness stages (from "smooth transition" to "nightmare"), see the ZKNOX analysis: [Scenarios for Post-Quantum Migrations](https://zknox.eth.limo/posts/2026/02/11/cryptoVsKMS.html).

## Build & Test

```bash
# Compile
fe build examples/zknox-pq/

# Fe unit tests (pure math verification)
fe test examples/zknox-pq/

# Hardhat integration tests (ERC-4337 flow with real ETH)
cd examples/zknox-pq/hardhat
npm install
npx hardhat test
```

---


## References
 - [ZKNOX](https://github.com/zknoxhq)
 - [kohaku](https://github.com/ZKNoxHQ/kohaku/tree/master/packages/pq-account )
