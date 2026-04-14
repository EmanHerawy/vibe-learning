Shor's algorithm is a quantum tool that's amazing at cracking certain types of "one-way puzzles" (like those used in Ethereum's signatures), but it's useless against hashes like Keccak-256 (Ethereum's hashing function for everything from transaction IDs to Merkle trees).

```
Grover's Algorithm: Faster search, but not game-changing for this
Shor's Algorithm: Solves discrete logarithm directly!
- Takes: polynomial time
- Time: Hours/days with a large enough quantum computer
```

**The key insight:**
> Shor's algorithm doesn't "guess faster" - it **mathematically breaks** the hard problem that ECDSA relies on.
> Classical computers can't reverse this.
> Shor's Algorithm can reverse it easily once it has $Q$.
