# Shor’s vs. Hashes" (Why the Hash is a Shield)
Think of cryptography as two different types of locks:

1. The Math Lock (Curve Math): This is based on structure. It’s like a complex clockwork mechanism. Shor’s Algorithm is a specialized key that fits perfectly into the gears of that mechanism (the "Discrete Logarithm") and turns it backward.

2. The Blender (Hash): A hash function like Keccak-256 is more like a meat grinder. Once you turn the steak (data) into hamburger meat (the hash), there is no "structure" left to exploit. Even a quantum computer has to guess what the original steak looked like.

**Why Shor's can't "un-hash"**: Shor’s Algorithm relies on finding periodicity (patterns that repeat). Curve math and RSA math have repeating patterns deep inside them. Hashing is designed specifically to have no patterns (the "Avalanche Effect"). If you change 1 bit of input, the whole output flips randomly. Shor's finds nothing to "grab" onto.