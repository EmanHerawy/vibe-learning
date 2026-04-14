# Sui Transaction Lifecycle - Complete Summary

## Core Architecture: The Dual-Path System

**Sui's key innovation:** Not all transactions need consensus. It routes transactions intelligently based on object ownership.

### The Two Paths

**Fast Path (Owned Objects Only):**
- Skip consensus entirely
- Finality in ~0.5 seconds
- Client collects validator signatures → forms certificate → immediate execution
- Example: Sending your NFT to a friend

**Consensus Path (Shared Objects):**
- Must go through consensus for ordering
- Finality in a few seconds
- Certificate → Consensus → Execution
- Example: Trading on a shared liquidity pool

---

## The 7-Stage Transaction Lifecycle

1. **Creation:** User signs transaction with private key
2. **Submission:** Sent to validators (via full node)
3. **Certification:** Client collects 2/3+ stake signatures to form certificate
4. **Execution:** Fast path (immediate) OR consensus path (ordered first)
5. **Effects Certificate:** Validators sign execution results, client collects 2/3+ stake
6. **Checkpoints:** Transactions bundled into permanent record
7. **Finality:** Transaction irreversibly confirmed

---

## Key Concepts

### Finality Types
- **Transaction Finality (~0.5s):** Certificate exists, transaction is irrevocable
- **Settlement Finality:** Effects certificate exists, can now use the outputs

### Critical Mechanisms
- **Object Locking:** Prevents double-spending of owned objects
- **Quorum Intersection:** Even with some dishonest validators, can't create conflicting certificates
- **Effects Certificate:** Your proof that transaction is final and in permanent record

---

## Sui vs Traditional Blockchains (Aptos/Ethereum)

### Traditional (Aptos, Ethereum, Solana)
- **Every transaction → Consensus first → Then execution**
- Validators coordinate everything (gossip, aggregate, order)
- Client just submits and waits
- Account-based model
- ~1-2 second finality (Aptos), ~12 seconds (Ethereum)

### Sui
- **Owned objects → Skip consensus entirely**
- **Shared objects → Consensus after certification**
- Client actively collects signatures and forms certificates
- Object-based model with explicit ownership
- ~0.5 second finality (owned), few seconds (shared)

### Client vs Validator Responsibility

**Traditional:** Validators do everything
- Collect transactions
- Gossip signatures to each other
- Run consensus
- Tell you the result

**Sui:** Responsibilities are split
- **Client/Gateway:** Collect validator signatures, form certificates, distribute them
- **Validators:** Validate transactions, sign, execute certificates, run consensus (only for shared objects)

---

## Why This Architecture Matters

**Performance Benefits:**
- Most transactions (simple transfers, NFTs) are super fast
- Parallel execution by default (independent objects don't conflict)
- Horizontal scalability

**Design Implications:**
- Design with owned objects when possible (fast path)
- Use shared objects only when truly needed (consensus path)
- Think about object ownership upfront

---

## Aptos vs Sui (Both Use Move)

**Aptos:**
- Account model (like Ethereum)
- All transactions through consensus
- Consistent 1-2s finality
- Easier mental model

**Sui:**
- Object model with ownership
- Dual-path execution
- Variable finality (0.5s - few seconds)
- More complex but more scalable

**Key takeaway:** Same language (Move), completely different execution models. Can't port contracts directly between them.

---

## Bottom Line

Sui achieves speed by recognizing that **most blockchain transactions are independent** (you sending your NFT doesn't conflict with someone else sending theirs). By letting these skip consensus and using client-driven certificates, Sui removes the artificial bottleneck that plagues traditional blockchains where everything waits in a single queue.

Only when transactions truly conflict (shared objects) does Sui use its consensus engine - and even then, clients drive the certification process for faster feedback.