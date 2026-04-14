# Sui Object Model

## What is an Object?

Objects in Sui are **high-level abstractions** representing digital assets. Think of them as smart containers that hold data and have built-in rules for how they can be used.

---

## Object Structure

```
┌─────────────────────────────────────────┐
│           SUI OBJECT                    │
├─────────────────────────────────────────┤
│                                         │
│  ID: 0x1a2b3c4d... (Unique, Immutable) │
│  Type: Sword                            │
│  Version: 5                             │
│  Owner: 0xALICE                         │
│  Digest: hash(data)                     │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │         DATA                    │   │
│  ├─────────────────────────────────┤   │
│  │  name: "Excalibur"              │   │
│  │  power: 100                     │   │
│  │  durability: 95                 │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

---

## Six Core Properties

### 1. **Type** 🏷️
Defines the structure and behavior of the object.

```
Example Types:
├─ Coin<SUI>
├─ NFT
├─ Sword
└─ GameCharacter

Rule: Objects of different types cannot be mixed
❌ Cannot use Sword where Coin is expected
```

### 2. **Unique ID** 🆔
A globally unique identifier for each object.

```
Object Creation:
┌──────────┐
│  Create  │ ──────> Generates unique ID: 0x1a2b3c4d...
└──────────┘         (Immutable forever)

Used for:
├─ Tracking objects
├─ Referencing objects
└─ Identifying ownership transfers
```

### 3. **Owner** 👤
Controls who can modify the object.

```
Ownership Types:

┌────────────────────────────────────────────┐
│  EXCLUSIVE (Account-Owned)                 │
│  Owner: 0xALICE                            │
│  ✓ Only Alice can modify/transfer         │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│  SHARED (Network-Wide)                     │
│  Owner: Shared                             │
│  ✓ Anyone can read/write                  │
│  ✓ Requires consensus                     │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│  FROZEN (Immutable)                        │
│  Owner: Immutable                          │
│  ✓ Read-only access                       │
│  ✗ Cannot modify or transfer              │
└────────────────────────────────────────────┘
```

**⚠️ Important Security Note:**
```
Ownership ≠ Confidentiality

Everyone can READ on-chain objects
├─ Owner controls: Modifications & Transfers
├─ Everyone can see: All object data
└─ Never store: Unencrypted secrets
```

### 4. **Data** 📦
The actual content stored in the object.

```
struct Sword {
    id: UID,
    name: String,
    power: u64,
    durability: u64,
    enchantments: vector<String>,
}

Data is:
├─ Encapsulated within the object
├─ Defined by the object's type
└─ Managed through type-specific operations
```

### 5. **Version** 🔄
Acts as a replay attack prevention mechanism.

```
Traditional Blockchain:        Sui Object Model:
┌──────────────┐              ┌──────────────┐
│   Account    │              │    Object    │
│   Nonce: 42  │              │  Version: 5  │
└──────────────┘              └──────────────┘
      ↓                              ↓
Prevents replay            Prevents replay for
  globally                   each object

Object Lifecycle:
Create ──> v1 ──> v2 ──> v3 ──> v4 ──> v5
           │      │      │      │      │
         Mint   Transfer Use  Enhance Transfer

Each modification increments version
```

### 6. **Digest** 🔐
Cryptographic hash ensuring data integrity.

```
Digest Calculation:
┌────────────────────────┐
│   Object Data          │
│   ├─ name: "Sword"     │
│   ├─ power: 100        │
│   └─ durability: 95    │
└────────────────────────┘
           ↓
      Hash Function
           ↓
    0x7f8e9d... (Digest)

Purpose:
├─ Verify data integrity
├─ Detect tampering
└─ Updated on every data change
```

---

## Object Lifecycle Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    OBJECT LIFECYCLE                     │
└─────────────────────────────────────────────────────────┘

1. CREATION
   ┌──────────────┐
   │  Transaction │ ──> Create Object
   └──────────────┘          │
                             ↓
                    ┌──────────────────┐
                    │   New Object     │
                    │  ID: Generated   │
                    │  Version: 1      │
                    │  Owner: Creator  │
                    │  Digest: hash()  │
                    └──────────────────┘

2. MODIFICATION
   ┌──────────────┐
   │  Update Data │ ──> Modify Object
   └──────────────┘          │
                             ↓
                    ┌──────────────────┐
                    │  Updated Object  │
                    │  ID: Same        │
                    │  Version: 2      │
                    │  Owner: Same     │
                    │  Digest: NEW     │
                    └──────────────────┘

3. TRANSFER
   ┌──────────────┐
   │   Transfer   │ ──> Change Owner
   └──────────────┘          │
                             ↓
                    ┌──────────────────┐
                    │ Transferred Obj  │
                    │  ID: Same        │
                    │  Version: 3      │
                    │  Owner: NEW      │
                    │  Digest: hash()  │
                    └──────────────────┘

4. DELETION (Optional)
   ┌──────────────┐
   │    Delete    │ ──> Remove Object
   └──────────────┘          │
                             ↓
                    Object no longer exists
```

---

## Object Model Benefits

```
┌────────────────────────────────────────────────┐
│          ADVANTAGES                            │
├────────────────────────────────────────────────┤
│                                                │
│  ✓ Intuitive Asset Representation             │
│    └─> Digital assets as first-class objects  │
│                                                │
│  ✓ Type Safety                                 │
│    └─> Compile-time checks prevent errors     │
│                                                │
│  ✓ Native Operations                           │
│    └─> Built-in transfer, share, freeze       │
│                                                │
│  ✓ Simplified Management                       │
│    └─> Encapsulated data and operations       │
│                                                │
│  ✓ Replay Attack Prevention                    │
│    └─> Per-object versioning                  │
│                                                │
│  ✓ Data Integrity                              │
│    └─> Cryptographic verification via digest  │
│                                                │
│  ✓ Flexible Ownership Models                   │
│    └─> Exclusive, shared, or frozen           │
│                                                │
└────────────────────────────────────────────────┘
```

---

## Example: Game Sword Object

```move
// Object Definition
public struct Sword has key, store {
    id: UID,
    name: String,
    power: u64,
    durability: u64,
}

// Object Instance
┌──────────────────────────────────────┐
│  Sword Object                        │
├──────────────────────────────────────┤
│  ID: 0xabc123...                     │
│  Type: Sword                         │
│  Version: 3                          │
│  Owner: 0xALICE                      │
│  Digest: 0x7f8e9d...                 │
│                                      │
│  Data:                               │
│  ├─ name: "Excalibur"                │
│  ├─ power: 150                       │
│  └─ durability: 85                   │
└──────────────────────────────────────┘

Operations:
├─ transfer(sword, bob_address)  // Change owner
├─ enhance(sword)                // Increase power
├─ repair(sword)                 // Restore durability
└─ freeze(sword)                 // Make immutable
```

---

## Key Takeaways

1. **Objects are containers** for digital assets with built-in properties
2. **Six core properties**: Type, ID, Owner, Data, Version, Digest
3. **Type safety** prevents mixing incompatible objects
4. **Version acts as nonce** for replay protection
5. **Ownership controls modifications**, not visibility
6. **Digest ensures integrity** through cryptographic hashing
7. **Flexible ownership models** support various use cases