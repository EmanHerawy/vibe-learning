

## 1. The 5 Families of PQC

NIST didn't just pick one algorithm; they looked at several mathematical "worlds" to ensure that if one gets broken, we have backups.

| Family | Key Concept | NIST Winners |
| --- | --- | --- |
| **Lattice-Based** | Finding short vectors in a giant grid. | **Dilithium** (Sign), **Kyber** (KEM) |
| **Hash-Based** | Chains of hashes (One-time signatures). | **SPHINCS+** (Stateless) |
| **Code-Based** | Error-correcting codes (McEliece). | (Under review for Signatures) |
| **Multivariate** | Solving systems of non-linear equations. | (Backup category) |
| **Isogeny** | Walking between different elliptic curves. | (Currently considered risky/broken) |

---

## What is a Lattice?

Imagine a piece of graph paper. The intersections of the lines are "points."

* **In 2D:** Finding the point closest to  is easy.
* **In PQC (e.g., Dilithium):** We use **hundreds of dimensions**.

### The "Hard Problem": SVP (Shortest Vector Problem)

If I give you a "Bad Basis" (a set of vectors that are very long and almost parallel), it is mathematically impossible—even for a quantum computer—to find the shortest path back to the origin in a high-dimensional space.

### Why Dilithium is "Module-Lattice"

Standard lattices are slow. **Module Lattices** use a special algebraic structure (Polynomials) that allows us to do math much faster.

> **Think of it this way:** A plain lattice is like writing out every single transaction; a module lattice is like using a batch-processing script. It’s the same result, but way more efficient for a computer's CPU.
