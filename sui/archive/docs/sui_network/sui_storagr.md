# Sui Storage - Study Notes

## Overview

Blockchain operation costs consist of two main components:
- **Compute**: Processing power for transactions and logic
- **Storage**: Digital space for data and transaction results

---

## Storage Architecture

### Storage Components Summary

| Component | Storage Type | Purpose | Mainnet Size (Nov 2025) |
|-----------|-------------|---------|------------------------|
| Validators | RocksDB, SSD | Latest consensus data on NVMe | 250-400GB |
| Pruning Full Nodes | RocksDB, SSD | Unpruned indexes for queries | 2.5TB |
| Unpruned Full Nodes | RocksDB, SSD | Full object/transaction history | 16TB |
| Full Node Snapshots | Cloud Storage | Backup and recovery | ~1.6TB |
| Checkpoints Bucket | Cloud Storage | Historical object sync | ~30TB |

---

## Node Types & Storage Requirements

### 1. Validators

**Key Characteristics:**
- Should enable pruning to limit database growth
- Store only latest consensus data
- Use high-performance NVMe disks
- Size: 250-400GB

**Growth Factors:**
- TPS (transactions per second) rate
- Transaction types
- Full history storage is the main growth driver

### 2. Pruning Full Nodes

**Key Characteristics:**
- Similar disk usage to validators
- Enable pruning like validators
- Size: 2.5TB total (with indexes)

**Differences from Validators:**
- Maintain a `consensus_db` (~50% of validator disk usage)
- If serving RPC queries, `indexes/` directory grows significantly
  - Current indexes: 1.5TB on Mainnet
  - Grows proportionally with TPS

**Note:** 2.5TB represents a single epoch's database snapshot size

### 3. Unpruned Full Nodes

**Use Cases:**
1. Need entire chain state on one machine
2. Enable state-sync without cloud archival fallback
3. Use as peer to avoid configuring archival bucket

**Storage:** 16TB

**Growth Examples:**
- **Low TPS Period (90 days, ~18 TPS):**
  - 3.4TB → 4.34TB
  - Growth: ~10GB/day
  
- **High TPS Period (14 days, ~183 TPS):**
  - 4.34TB → 4.92TB
  - Growth: ~40GB/day

**Key Insight:** Growth scales with network activity (TPS)

---

## Snapshot Types

### 1. Database Snapshots
- **Size:** 1:1 copy of source full node database
- **Purpose:** Exact database replication

### 2. Formal Snapshots
- **Size:** ~30GB (recent Mainnet epochs)
- **Purpose:** Lightweight state representation
- **Benefit:** Much smaller than full database

---

## Checkpoints Bucket

**Purpose:** Stores blockchain state data in cloud storage

**Written By:**
- Full nodes
- Ingestion daemons

**Growth Examples:**
- **90-day period:**
  - 867GB → 1.18TB
  - Growth: ~3GB/day

- **14-day period:**
  - 1.18TB → 1.32TB
  - Growth: ~10GB/day

---

## Storage Costs & Economics

### Current Storage Fee
**Rate:** 76 MIST = 0.000000076 SUI per storage unit

**Checking Current Fee:**
```graphql
{  
  protocolConfigs {  
    config(key: "storage_gas_price") {  
      value  
    }  
  }  
}
```
Run at: https://graphql.mainnet.sui.io/graphql

### Storage Unit Calculation

**Conversion:**
- 1 byte = 100 storage units
- 1 kilobyte (KB) = 100,000 storage units

**Example Calculation (1KB object):**
```
1 KB = 100,000 storage units
100,000 × 76 MIST = 7,600,000 MIST
= 7.6 million MIST
= 0.0076 SUI
```

### Fee Structure

Storage fees are split into two components:

#### 1. Refundable Deposit (99%)
- Locked in storage fund while object exists
- Returned as storage rebate if object is:
  - Deleted
  - Reduced in size
- **Not applicable** to immutable objects

#### 2. Non-Refundable Fee (1%)
- Permanently locked in storage fund
- Removed from SUI circulation forever
- Never returned, even if object deleted

---

## Storage Fund Mechanism

### Purpose
Ensures current and future validators are compensated for storing data.

### Problem It Solves
Without a storage fund:
- Users pay only when storing data initially
- Future validators bear storage costs without compensation
- Creates misaligned incentives

### How It Works

**Collection Phase:**
1. Storage fees collected when data first stored
2. Split into refundable deposit (99%) and non-refundable fee (1%)
3. Both portions locked in storage fund

**Distribution Phase:**
1. Storage fund is staked each epoch
2. Staking rewards compensate active validators
3. Excess rewards reinvested back into fund
4. Ensures perpetual validator compensation

### Governance
- Storage fee amount set periodically by governance proposal
- Network participants vote on fee adjustments
- Reflects actual storage costs and network economics

---

## Storage Rebates

### Incentive Design
Encourages users to delete unnecessary data by offering refunds.

### Rebate Mechanics

**When Object Deleted:**
- 99% of original storage fee returned
- Rebate paid to gas fee payer
- 1% non-refundable portion never returned

**Example:**
```
Original storage fee: 7.6 million MIST (1KB object)
Refundable portion: 7.524 million MIST (99%)
Non-refundable: 0.076 million MIST (1%)

Upon deletion:
User receives: 7.524 million MIST rebate
Permanently locked: 0.076 million MIST
```

### Immutable Objects Exception
- Cannot be deleted or modified
- Storage fee locked forever
- No rebate possible
- Consider carefully before making objects immutable

---

## Deflationary Pressure

### Mechanism
The 1% non-refundable storage fee creates deflationary pressure on SUI:
- Permanently removes SUI from circulation
- More data stored = more SUI burned
- High network usage increases burn rate

### Economic Impact
- Reduces total SUI supply over time
- Benefits existing token holders
- Balances token issuance from staking rewards

---

## Key Takeaways for Developers

### Storage Optimization Tips

1. **Design for Deletion**
   - Structure data to allow easy cleanup
   - Implement object deletion logic
   - Claim storage rebates when possible

2. **Consider Object Mutability**
   - Use immutable objects sparingly
   - Mutable objects allow rebates
   - Evaluate long-term storage needs

3. **Minimize Data Size**
   - Store only essential data on-chain
   - Use off-chain storage for large data
   - Compress data where possible

4. **Calculate Storage Costs**
   - Estimate object sizes before creation
   - Factor storage fees into gas budgets
   - Monitor costs in production

### Node Operator Considerations

1. **Enable Pruning**
   - Reduces disk usage significantly
   - Suitable for most validators
   - Keep only necessary historical data

2. **Plan Disk Capacity**
   - Consider TPS growth projections
   - Monitor daily growth rates
   - Plan for 40GB/day at high TPS

3. **Choose Node Type Wisely**
   - Validator: 250-400GB (pruned)
   - RPC Full Node: 2.5TB (pruned with indexes)
   - Archive Node: 16TB (unpruned)

---

## Storage vs. Compute Tradeoffs

### Compute (Relatively Fixed)
- Validators run standardized hardware
- 24-core processors
- 128GB RAM
- Consistent compute capacity

### Storage (Variable)
- Grows with network usage
- High throughput = high storage growth
- Sui's high TPS increases storage needs
- Main variable cost component

### Why Storage Matters More on Sui
- Achieves higher throughput than other blockchains
- More transactions = more data
- Storage costs vary significantly with usage
- Requires careful economic design

---

## Important Metrics to Monitor

### For Developers
- Object size in bytes
- Storage units per object
- Total storage fees per transaction
- Potential rebate amounts

### For Node Operators
- Database growth rate (GB/day)
- Current disk usage
- TPS trends
- Epoch checkpoint sizes

### Network-Level
- Total storage fund size
- Staking rewards from storage fund
- SUI burned via non-refundable fees
- Storage fee governance changes

---

## Additional Resources

**Official Documentation:**
- [Sui Storage Fund: Bringing Deflationary Pressure](https://blog.sui.io/sui-storage-fund-deflationary/)
- [Sui Storage Fund Demystified](https://blog.sui.io/storage-fund-demystified/)
- [Storage Fees on Sui Explained](https://blog.sui.io/storage-fees-explained/)

**Quick Reference:**
- GraphQL Endpoint: https://graphql.mainnet.sui.io/graphql
- Documentation: https://docs.sui.io/concepts/sui-architecture/sui-storage

---

## Quick Reference Table

| Metric | Value |
|--------|-------|
| Storage Fee | 76 MIST per storage unit |
| 1 Byte | 100 storage units |
| 1 KB | 100,000 storage units |
| Refundable Portion | 99% |
| Non-Refundable Portion | 1% (burned) |
| Validator Storage | 250-400GB |
| Pruned Full Node | 2.5TB |
| Unpruned Full Node | 16TB |
| Growth Rate (Low TPS) | ~10GB/day |
| Growth Rate (High TPS) | ~40GB/day |

---

## Practical Examples

### Example 1: Storing a Small Object
```
Object size: 500 bytes
Storage units: 500 × 100 = 50,000 units
Storage fee: 50,000 × 76 MIST = 3,800,000 MIST = 0.0038 SUI

If deleted later:
Rebate: 3,800,000 × 0.99 = 3,762,000 MIST = 0.003762 SUI
Burned: 3,800,000 × 0.01 = 38,000 MIST = 0.000038 SUI
```

### Example 2: Large NFT Metadata
```
Object size: 10 KB
Storage units: 10 × 100,000 = 1,000,000 units
Storage fee: 1,000,000 × 76 MIST = 76,000,000 MIST = 0.076 SUI

If deleted later:
Rebate: 0.07524 SUI
Burned: 0.00076 SUI
```

### Example 3: Immutable vs Mutable Object Decision
```
Scenario: Large collection metadata (5 KB)
Storage cost: 0.038 SUI

Immutable:
- One-time payment: 0.038 SUI
- Locked forever
- No rebate possible
- Choose if: Never needs updates

Mutable:
- One-time payment: 0.038 SUI
- 99% rebate available if deleted
- Can update data
- Choose if: May need changes or deletion
```

