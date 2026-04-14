# Sui Whitepaper - Study Notes
ref: https://docs.sui.io/paper/sui.pdf
## Overview

**Sui** is a decentralized, permissionless smart contract platform optimized for low-latency asset management, developed by MystenLabs.

### Key Characteristics
- Uses **Move programming language** for smart contracts
- Objects are first-class citizens owned by addresses
- Byzantine consistent broadcast for common operations (lower latency than Byzantine agreement)
- Byzantine agreement only for shared objects
- Native token: **SUI** (used for gas and staking)
- Permissionless set of authorities (validators)

---

## 1. Introduction

### Core Design Philosophy
- **Asset-centric**: Objects are typed assets with custom rules
- **Parallel execution**: Naturally parallelizes when possible
- **Low latency**: Byzantine consistent broadcast for owned objects
- **Scalability**: Better than traditional blockchain consensus

### Token Economics
- **SUI token** pays for gas fees
- Used for delegated staking to authorities
- Gas fees distributed to authorities and delegates
- Periodic authority reconfiguration based on stake

---

## 2. Move Programming Language

### 2.1 Why Move?
- Originally developed for Facebook's Diem blockchain
- Platform-agnostic (adopted by 0L, StarCoin, Sui)
- Type system naturally supports parallel execution
- Safe and expressive

### 2.2 Object Model

#### Global State Structure
Two types of objects:
1. **Struct data values**: Typed data governed by Move modules
2. **Package code values**: Move bytecode modules

#### Object Declaration
```move
struct Obj has key {
    id: VersionedID,  // globally unique ID and version
    f: u64,           // primitive fields
    g: OtherObj       // other objects
}
```

**Requirements**:
- All Sui objects must have `id` field
- Must have `key` ability (storable in global object pool)

### 2.3 Modules
- Programs organized as sets of modules
- Each module contains struct and function declarations
- Can import types and invoke functions from other modules
- **Encapsulation**: Types can only be created/destroyed/modified by their declaring module

### 2.4 Transactions & Entrypoints

#### Transaction Structure
- Must include versioned package ID
- Module and function name
- Arguments (including input objects)

#### Example Entrypoint
```move
public fun entrypoint(
    o1: Obj,           // read/write/transfer/destroy
    o2: &mut Obj,      // read/write only
    o3: &Obj,          // read only
    x: u64,            // primitive value
    ctx: &mut TxContext // runtime context
) { ... }
```

**Mutability Permissions**:
- `Obj`: Full access (read, write, transfer, destroy)
- `&mut Obj`: Read and write
- `&Obj`: Read only

### 2.5 Object Creation & Transfer

```move
public fun create_then_transfer(
    f: u64, g: OtherObj, o1: Obj, ctx: &mut TxContext
) {
    // Create new object with fresh ID
    let o2 = Obj { id: TxContext::fresh_id(ctx), f, g };
    
    // Transfer objects to sender
    Transfer::transfer(o1, TxContext::sender());
    Transfer::transfer(o2, TxContext::sender());
}
```

**Resource Safety**:
- Move enforces resource safety protections
- Objects cannot be created without permission
- Objects cannot be copied or accidentally destroyed
- Duplicate transfers rejected by type system

---

## 3. Sui Programming Model (Formal)

### 3.1 Module Structure

```
Module = ModuleName × 
         (StructName ⇀ StructDecl) ×
         (FunName ⇀ FunDecl) × 
         FunDecl (initializer)
```

#### Key Components
- **Struct declarations**: Field names mapped to storable types
- **Function declarations**: Parameter types, return types, instructions
- **Generic parameters**: Allow type parameterization with ability constraints
- **Module initializer**: Special function invoked once at publication

#### Sui-Specific Instructions
1. `TransferToAddr`: Transfer object to user address
2. `TransferToObj`: Transfer object to parent object (requires mutable parent reference)
3. `ShareMut`: Make object mutably shared (anyone can read/write)
4. `ShareImmut`: Make object immutably shared (anyone can read, no one can write)

### 3.2 Type System

#### Primitive Types
- `address`, `id`, `bool`, `u8`, `u64`, etc.

#### Struct Types
```
StructType = ModuleName × StructName × [StorableType]
```

#### Storable Types
Can be:
- Primitive types
- Struct types
- Generic types (indexed into generic parameter list)
- Vector types

#### Reference Types
```
ReferenceType = StorableType × MutabilityQual
```
- `mut`: Read and write access
- `immut`: Read-only access

#### Abilities
Control what operations are permissible:
- `key`: Can be stored in global object pool (required for Sui objects)
- `store`: Can be stored inside other objects
- `copy`: Can be duplicated
- `drop`: Can be discarded

### 3.3 Objects & Ownership

#### Object Structure
```
Obj = ObjContents × ObjID × Ownership × Version
```

**Components**:
- **ObjID**: Globally unique identifier (hash of transaction digest + counter)
- **Ownership**: Metadata determining transaction usage rules
- **Version**: Increments with each mutation (starts at 0)
- **Contents**: Either package code or struct data with type

#### Ownership Types
1. **Single Owner**: 
   - Owned by address (user's public key)
   - Owned by another object (parent-child relationship)

2. **Shared**:
   - `shared_mut`: Anyone can read/write
   - `shared_immut`: Anyone can read, no one can write

**Immutability Guarantees**:
- Object ID, type, and object category never change
- Strong typing with persistent identity

### 3.4 Addresses & Authenticators

```
Addr = Hash(Authenticator)
```

**Authenticator Types**:
- Ed25519 public key
- ECDSA public key
- K-of-N multisig key
- Future: Post-quantum signatures

**Cryptographic Agility**: Separation of address from authenticator enables different key schemes and lengths.

### 3.5 Transaction Types

#### 1. Publish Transaction
```
Publish = Package × [ObjRef]
```
- Publishes new Move package
- Includes dependencies (references to already-published packages)
- Runtime runs bytecode verifier, links package, executes module initializers

#### 2. Call Transaction
```
Call = CallTarget × [StorableType] × [CallArg]
```

**Arguments**:
- **Object inputs**: 
  - Object reference (for single-owner, shared immutable)
  - Object ID (for shared mutable)
- **Type arguments**: Instantiate generic type parameters
- **Pure values**: Primitives and primitive vectors (not structs)

**Object Reference Components**:
```
ObjRef = ObjID × Version × Hash(Obj)
```
- Runtime verifies version and hash match pool object
- Ensures sender's view matches runtime's view

#### Gas Management
```
GasInfo = ObjRef × MaxGas × BaseFee × Tip
```
- **Gas object**: Must be Coin<SUI>
- **EIP-1559 style fees**: `(GasUsed × BaseFee) + Tip`
- **BaseFee**: Algorithmically adjusted at epoch boundaries
- **Tip**: Optional priority fee during congestion

### 3.6 Transaction Effects

#### Success Effects
```
SuccessEffects = [ObjEffect] × [Event]
```

**Object Effects**:
- `Create`: New object added to pool
- `Update`: Existing object modified
- `Wrap`: Object embedded into another (removed from pool)
- `Delete`: Object permanently removed
- `Unwrap`: Object extracted from parent (added back to pool)

**Events**:
- Struct type + struct data
- Side effects beyond object pool updates
- Consumed by off-chain actors
- Cannot be read by Move programs

#### Abort Effects
```
AbortEffects = AbortCode × ModuleName
```
- All-or-nothing semantics (no partial state changes persist)
- Gas fees still charged
- Contains abort location and code

---

## 4. Sui System Architecture

### 4.1 System Model

#### Epochs
- System operates in sequential epochs `e ∈ {0, 1, 2, ...}`
- Each epoch has committee `Ce = (Ve, Se(·))`
  - `Ve`: Set of authorities with known public keys
  - `Se(v)`: Stake delegated to authority `v`

#### Byzantine Fault Tolerance
**Safety Assumption**: Honest authorities hold quorum of stake
```
Σ(h∈He) Se(h) > 2/3 × Σ(v∈Ve) Se(v)
```

**Liveness Assumption**: At least one live correct relay party exists for each certificate

### 4.2 Authority Data Structures

#### 1. Order Lock Map
```
Lockv[ObjRef] → TxSignOption
```
- Records first valid transaction seen for each owned object version
- Represents distributed locks across authorities
- Ensures **sign-once** property (critical for safety)
- **Strong key self-consistency** required

#### 2. Certificate Map
```
Ctv[TxDigest] → (TxCert, EffSign)
```
- Records all processed certificates within validity epoch
- Includes signed effects
- Eventually consistent

#### 3. Object Map
```
Objv[ObjRef] → Obj
```
- Records all objects created by processed certificates
- Can be fully derived from certificate map
- Secondary index: `ObjID → latest object version`
- Eventually consistent

#### 4. Synchronization Map
```
Syncv[ObjRef] → TxDigest
```
- Indexes certificates by objects they create/mutate/delete
- Can be recreated from certificate map
- Helps clients synchronize object updates
- Eventually consistent

### 4.3 Transaction Processing Protocol

#### Phase 1: Process Transaction
**Authority checks**:
1. Epoch matches current epoch
2. All input object references exist in `Objv`
3. Sufficient gas available
4. `valid(Tx, [Obj])` returns true (authorization check)
5. **Lock checks**: For owned inputs, verify `Lockv[ObjRef]` is either:
   - `None`, OR
   - Set to same `Tx`
   - If valid, atomically set to `TxSign`

**Output**: Returns partial certificate (`TxSign`) if all checks pass

**Certificate Formation**: Client collects `TxSign` from quorum → forms `TxCert`

#### Phase 2: Process Certificate
**Authority checks** (all validity conditions except locks):
1. For owned objects: Lock must be `None`, any `TxSign`, or certificate for same transaction
   - **Failure = Byzantine fault detected** → halt and start disaster recovery
2. For shared objects: Check consensus sequencing completed
   - If not sequenced, wait for consensus

**Execution**: If checks pass:
1. Add to certificate map: `Ctv[TxDigest] → (TxCert, EffSign)`
2. Update locks: `Lockv[ObjRef] → TxCert` (for unset locks)
3. Execute transaction and materialize effects in `Objv`
4. Update synchronization map

### 4.4 Ownership & Authorization

#### Read-Only Objects
- Cannot be mutated or deleted
- Usable by all users concurrently
- No authorization required
- Examples: Move modules

#### Owned Objects
**Owner Types**:
1. **Address owner**: Transaction must be signed by that address
2. **Object owner** (parent-child): Parent object must be in transaction

**Limitation**: Single transaction cannot use objects from multiple different address owners

#### Shared Objects
- **Mutable shared**: Anyone can include, require own authorization logic
- **Immutable shared**: Anyone can read, no one can write

**Consensus Requirement**:
- Shared objects require full Byzantine agreement
- Transaction certificate submitted to consensus system (e.g., Narwhal)
- Authorities observe consistent sequence
- Version assignment based on sequence
- Then execution proceeds deterministically

**Design Philosophy**: Optimize single-user operations for low latency (consistent broadcast), use consensus only when necessary (shared objects)

### 4.5 Client Types

#### Full Clients & Replicas
- Maintain consistent copy of system state
- Do not validate new transactions
- Used for audit, transaction construction, read services

#### Light Clients
**Self-Authenticating Graph**:
- `ObjRef` contains `ObjDigest` authenticating full object
- Object contains `parent(Obj)` = creating transaction digest
- Transaction digest authenticates full transaction
- Forms bipartite graph of objects ↔ certificates

**High-Integrity Reads** (without full replica):
- Authority provides: `TxCert` + input objects
- Light client verifies and can:
  - Submit certificate to check finality
  - Craft new transaction using result objects

**Effects Certificate as Proof**:
- `EffCert` directly proves transition finality
- Includes input objects + certificate + checkpoint proof (if available)

#### Checkpointing
- Periodic checkpoints of finalized transactions
- Quorum certificate over checkpoint
- Efficient state validation for light clients
- Enables data structure compression
- **Required** for epoch transitions

### 4.6 Bridges (Cross-Chain)

**Trust Model**: Reflects both Sui and other blockchain assumptions (no trusted oracles required if other blockchain supports light clients)

#### Use Cases
1. **Import foreign assets**: Lock on native chain → wrapped representation on Sui
2. **Export Sui assets**: Lock on Sui → wrapped representation on other chain

#### Wrapped Asset Semantics
- **Fungible assets**: Divisible and transferable when wrapped
- **Non-fungible assets**: Transferable only, may support state mutations
- **Custom logic**: Bridges are smart contracts (not native), composable via Move

### 4.7 Committee Reconfiguration

#### Safety & Liveness Guarantees
- **Safety**: If `Tx` committed at epoch `e`, no conflicting transaction can commit after `e`
- **Liveness**: If `Tx` committed at/before epoch `e`, must remain committed after `e`

#### Reconfiguration Process

**1. Stake Management (During Epoch)**:
- System smart contract handles stake delegation
- Users can lock/unlock/redirect stake to authorities

**2. Epoch Transition**:
- Quorum votes to end epoch `e`
- Authorities run checkpointing protocol (using consensus)
- **End-of-epoch checkpoint** contains:
  - Union of all transactions processed by quorum
  - Ensures durability: Honest authority's transactions included
  - Guarantees availability to honest authorities

**3. New Committee Formation**:
- Stake delegation at checkpoint determines `Ce'` (epoch `e+1`)
- Both old and new quorums sign:
  - New committee `Ce'`
  - Checkpoint where new epoch starts
- New authorities start processing when both signature sets available
- Old authorities delete epoch signing keys

#### Recovery Mechanism
**Problem**: Owned object "locked" due to client equivocation
- Example: Client signs two transactions with same object version
  - Half of authorities sign each
  - No certificate possible (no quorum on either)

**Solution**: Epoch change unlocks objects
- Original object available at new epoch start
- Old equivocating transactions contain old epoch number
- Won't lock object again → owner gets fresh chance

#### Tokenomics
- **SUI token**: Fixed supply, used for gas and delegated stake
- **Voting power**: Function of delegated stake
- **Fee distribution**: Based on contribution to operations
- **Rewards**: Authorities share fees with stake delegators

### 4.8 Authority Updating

#### Client-Driven Updates
**Problem**: Authority missing certificates due to failures

**Solution**: Client updates authority with causal history

**Algorithm**:
1. Start with target certificate `TxCert`
2. Check if input objects exist in lagging authority
3. For missing inputs, find generating transaction certificates
4. Recursively add to sync list
5. Sort in causal order and submit

**Relayers**: Untrusted, keyless parties performing updates
- Can be clients, other authorities, or replicas

#### Bulk Updates
- **Real-time**: Authorities push updates to followers
- **Short-term**: Push-pull gossip network between authorities
- **Long-term**: Periodic state commitments and checkpoint-based sync

---

## 5. Scaling & Latency

### 5.1 Throughput Scaling

#### Design Principles
- **Minimize bottlenecks**: Aggressively reduce global synchronization
- **Resource scaling**: More CPUs/memory/storage → increased capacity → more fees
- **Phase separation**: Lock acquisition vs. execution

#### Two-Phase Processing

**Phase 1: Lock Acquisition**
- Ensures exclusive access to object versions
- **Owned objects**: Reliable broadcast (no global sync)
  - Shardable by `ObjID` across multiple machines
- **Shared objects**: Consensus sequencing
  - Determines version number (not full execution)
  - Recent high-throughput consensus (Narwhal) demonstrates sequencing >> execution

**Phase 2: Execution**
- When all input versions known
- **Fully parallel** across objects
- Move VMs on multiple cores/machines
- **Idempotent**: Easy crash recovery
- **Loose consistency**: Scalable distributed key-value stores

#### Parallelism Optimization
- Causally unrelated transactions execute in parallel
- Smart contract designers control parallelism via object model
- Trade-off: Owned objects (low latency) vs. shared objects (flexibility)

#### Off-Critical-Path Operations
- **Checkpointing**: Operates on committed data
- **State commitments**: Don't block new transactions
- Distributable across resources
- Don't affect latency/throughput

#### Read Scalability
- **Aggressive caching**: All client data signed by authorities
- **Static data**: Servable from distributed stores
- **Roots of trust**:
  - Certificates → causal history
  - State commitments → global roots (per epoch or more frequent)

### 5.2 Latency Control

#### Owned Objects Path
- **Reliable broadcast** before execution
- **2 round trips** to quorum for finality
- Optimal for single-user operations

#### Shared Objects Path
- **Consistent broadcast** → certificate
- **Consensus processing** → sequencing
- **4-8 round trips** to quorum (depending on consensus)
- Necessary for multi-user shared state

#### Smart Contract Design Pattern
**Low latency**: Use owned objects for single-user operations
- Token transfers
- NFT operations
- User-specific state changes

**Flexible**: Use shared objects when needed
- DEX order books
- Shared pools
- Multi-user interactions

---

## Key Innovations

### 1. Object-Centric Model
- First-class objects with ownership metadata
- Enables parallel processing decisions at protocol level

### 2. Hybrid Consensus
- **Byzantine consistent broadcast** for owned objects (faster)
- **Byzantine agreement** only for shared objects
- Developer controls latency/flexibility trade-off

### 3. Move Language Integration
- Resource safety prevents bugs
- Type system enables parallelization
- Encapsulation across trust boundaries

### 4. Scalable Architecture
- Lock management shardable by object
- Parallel execution when causal independence
- Off-critical-path commitment operations

### 5. Light Client Support
- Self-authenticating causal graph
- Effects certificates as finality proof
- Trust-minimized bridges possible

---

## Performance Characteristics

### Latency
- **Owned objects**: ~2 RTT (round trip times)
- **Shared objects**: ~4-8 RTT (depends on consensus)

### Throughput
- **Horizontal scaling**: Add resources → increased capacity
- **Parallel execution**: Causally independent transactions
- **Bottleneck**: Only shared object sequencing (not execution)

### Safety
- **Byzantine fault tolerance**: 2/3 honest stake
- **Sign-once property**: Prevents equivocation
- **Causal ordering**: Ensures consistency

---

## Comparison Highlights

### vs. Traditional Blockchains
- **Lower latency**: Consistent broadcast vs. full consensus for common cases
- **Better scalability**: Parallel execution, shardable locks
- **Flexible latency**: Developer controls via ownership model

### vs. FastPay
- **Evolution**: Extends FastPay to arbitrary smart contracts
- **Permissionless**: Delegated proof of stake
- **Smart contracts**: Move language capabilities

### vs. Account-Based Systems
- **Object model**: Explicit ownership and versions
- **Parallel processing**: Natural from object independence
- **Resource safety**: Move prevents common bugs

---

## Development Resources

- **Move Book**: https://diem.github.io/move/
- **Sui Developer Portal**: https://github.com/MystenLabs/fastnft/blob/main/doc/SUMMARY.md
- **Move Prover**: Formal verification tool for Move code

---

## Future Considerations

### Research Areas
- Token economics details (separate paper planned)
- Optimization of consensus for shared objects
- Advanced bridging mechanisms
- State commitment compression

### Potential Extensions
- More sophisticated authenticator types
- Enhanced light client protocols
- Cross-chain interoperability patterns
- Advanced smart contract patterns

---

## Study Tips

1. **Understand the ownership model** - This is fundamental to Sui's design
2. **Grasp the two-phase protocol** - Lock acquisition vs. execution
3. **Know when to use owned vs. shared objects** - Key design decision
4. **Learn Move's resource safety** - Prevents entire classes of bugs
5. **Understand the trade-offs** - Latency vs. flexibility, safety vs. liveness

## Quick Reference

### Key Terms
- **ObjRef**: `(ObjID, Version, Hash)` - object reference
- **TxCert**: Transaction certificate (transaction + quorum signatures)
- **EffCert**: Effects certificate (effects + quorum signatures)
- **Quorum**: > 2/3 stake
- **Epoch**: Period with fixed committee

### Critical Properties
- **Sign-once**: Authority signs only one transaction per owned object version
- **Causal ordering**: Execute dependencies before dependent transactions
- **Resource safety**: Objects can't be copied/destroyed accidentally
- **Finality**: Quorum of authorities processed = final

---

*These notes cover the Sui whitepaper comprehensively. Focus on understanding the object model, ownership types, and the two-phase processing protocol as they are central to Sui's design philosophy.*