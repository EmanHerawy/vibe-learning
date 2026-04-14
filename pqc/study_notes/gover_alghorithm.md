

## Grover's Algorithm

Grover's is the "other" quantum threat – less devastating than Shor's, but still speeds up searches.

- **Simple explanation**: It's for finding a needle in a haystack faster. Classical computers search unsorted lists linearly (check one by one). Grover's does it in square-root time – so for a 1-million-item list, classical needs up to 1M checks; Grover needs ~1K. Not exponential speedup like Shor, but quadratic (still huge for big problems).

- **In blockchain context**: Affects symmetric crypto like hashes and AES encryption. For Keccak-256 (256-bit), classical brute-force to reverse (find preimage) takes 2^256 tries (impossible). Grover reduces to 2^128 – still impractical (needs insane quantum resources), but it halves effective security. So, we might double hash sizes (e.g., to 512-bit) for future-proofing. Doesn't break Ethereum outright, unlike Shor on signatures.

- **Why it's milder**: No full "break" – just makes attacks cheaper. For passwords/hashes in your contracts (e.g., commit-reveal schemes), it's a nudge to use stronger params, not a rewrite.


### Exponential speedup vs quadratic speedup 

| Castle Size | Normal | Quadratic | Exponential |
|-------------|--------|-----------|-------------|
| 100 rooms | 100 tries | 10 tries | ~3 tries |
| 10,000 rooms | 10,000 tries | 100 tries | ~5 tries |
| 1,000,000 rooms | 1,000,000 tries | 1,000 tries | ~7 tries |
