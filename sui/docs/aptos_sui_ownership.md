# Summary of Sui Object Ownership

The Sui documentation explains two fundamental transaction execution paths that determine how objects can be owned and accessed:

### Two Execution Paths

**1. Fastpath (Low Latency)**
- Objects must be owned by a single address or be immutable
- No consensus required, resulting in very low latency to finality
- Lower gas costs
- Requires off-chain coordination for heavily accessed objects
- Best for latency-sensitive applications that don't need multi-party coordination

**2. Consensus Path (Flexible but Higher Latency)**
- Supports both single-owner objects and shared objects (globally accessible)
- Requires consensus to sequence reads and writes
- Higher gas cost and slightly higher latency
- Allows multiple addresses to access the same object in a coordinated manner
- Best for applications requiring multi-party transactions

### Escrow Example

The documentation demonstrates these trade-offs through an escrow implementation in both styles:

**Address-Owned (Fastpath) Approach:**
- Both parties lock their objects using a `Locked<T>` and `Key` primitive
- Objects are sent to a trusted custodian (third party)
- The custodian verifies matching sender/recipient pairs and exchange keys
- Custodian is trusted for liveness but not safety—they can only complete valid swaps or return objects
- More steps involved, requires third-party trust

**Shared Object (Consensus) Approach:**
- First party locks their object
- Second party creates a shared `Escrow` object with their unlocked object
- First party completes the swap by providing their locked object
- No third party needed—the protocol enforces correctness on-chain
- Fewer steps, but requires consensus overhead

## Comparison: Sui vs Aptos Ownership Models

### Aptos Object Model

**Account-Centric with Object Extensions:**
Objects and resources on Aptos are owned by both the account where the object is stored and require the module's code for modifications. The framework centers around:

- **Resources**: Top-level objects stored directly in accounts
- **Objects**: Can be resources or nested within resources, with their own addresses
- Objects group resources together and can own resources similar to an account, with their own addresses
- Objects can be owned by any address, including other Objects, Accounts, and Resource accounts

**Key Characteristics:**
- Dual ownership model (account + module code)
- Objects have `ObjectCore` containing owner, transferability flags, and events
- Support for capability-based control via Refs (TransferRef, ExtendRef, etc.)
- Objects stored using resource groups for gas efficiency
- No direct parallel to Sui's shared objects—coordination happens through different mechanisms

### Key Differences

| Aspect | Sui | Aptos |
|--------|-----|-------|
| **Concurrency Model** | Explicit fastpath vs consensus choice | Implicit through account/object ownership |
| **Shared State** | First-class shared objects requiring consensus | Objects nested in accounts; coordination through module logic |
| **Ownership Transfer** | Direct object transfers with versioning | Transfer controlled by capabilities and module code |
| **Multi-Party Access** | Shared objects or trusted custodian | Objects can be owned by other objects/accounts; module-mediated access |
| **Performance Trade-off** | Explicit (fastpath vs consensus) | Gas optimization through resource groups |
| **Trust Model** | Can choose between trustless (consensus) or trusted third-party (fastpath) | Trust in module code enforcing dual ownership |

### From Your Perspective

Given your background in both Polkadot and Flow (where you've worked on DAO governance and scheduled transactions), you'll find:

**Sui's model** is more explicit about the latency/flexibility trade-off—you choose between fastpath (parallel execution) or consensus (coordination). This is somewhat analogous to how Polkadot separates relay chain consensus from parachain execution.

**Aptos's model** focuses on organizing resources hierarchically within accounts and objects, with a capability-based permission system. This might feel more familiar from your Move experience on Aptos, where the object model builds on top of the existing resource system you already know from working with `#DailyMove` concepts.

The escrow example in Sui highlights a fundamental design question: do you optimize for speed with off-chain coordination, or accept consensus overhead for trustless on-chain coordination? In Aptos, you'd likely implement the same escrow using objects that own other objects with module-enforced logic, without explicitly choosing an execution path.