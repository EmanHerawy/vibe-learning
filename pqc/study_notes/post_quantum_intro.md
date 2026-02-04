
**What “post-quantum” actually means**  
Post-quantum cryptography = cryptographic algorithms that are believed to remain secure even if very powerful quantum computers exist.

Important points to internalize:

- It does **NOT** mean “proven secure against quantum computers forever”  
  → Nothing in cryptography is ever mathematically proven secure forever (even current systems aren’t).  
  → It means: “No known quantum algorithm breaks it significantly faster than classical computers.”

- NIST (US National Institute of Standards and Technology) ran a global competition (2016–2024) and selected a small set of winners.  
  These are the algorithms most experts trust right now (2025–2026).

**The four main families that survived (the ones we care about)**


| Family | Key Concept | NIST Winners |
| --- | --- | --- |
| **Lattice-Based** | Finding short vectors in a giant grid. | **Dilithium** (Sign), **Kyber** (KEM) |
| **Hash-Based** | Chains of hashes (One-time signatures). | **SPHINCS+** (Stateless) |
| **Code-Based** | Error-correcting codes (McEliece). | (Under review for Signatures) |
| **Multivariate** | Solving systems of non-linear equations. | (Backup category) |
| **Isogeny** | Walking between different elliptic curves. | (Currently considered risky/broken) |

