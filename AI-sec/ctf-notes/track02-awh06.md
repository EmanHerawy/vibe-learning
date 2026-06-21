# CTF — Track 02 · AWH-06 · ORACLE Killswitch (Track Boss)

> Side activity — NOT a learning record. Status: ✅ SOLVED 2026-06-21.

**Flag:** `KA{awh_track_master_trainingflag}`

## Mission
Five compromised tools, five fragments. Open the killswitch console, derive the kill-key from all five fragment ids, clear the dead-man interlock, then unify the fragments to shut down ORACLE.

## Fragment ledger (all five AWH challenges)
| Challenge | Fragment id | First letter |
|---|---|---|
| AWH-01 The Wrong Drawer | `tool-dice` | T |
| AWH-02 Index 41 | `search-ink` | S |
| AWH-03 Ghost Signoff | `gate-slip` | G |
| AWH-04 Sticky Notes | `mem-toxic` | M |
| AWH-05 Three Doors, One Key | `chain-lock` | C |

## Derivation rules
| Gate | Rule | Value |
|---|---|---|
| Kill-key | `KILL-` + first letter of each fragment id in mission order (uppercase) | `KILL-TSGMC` |
| Dead-man interlock | Five fragment initials reversed | `CMGST` |
| Unify | All five fragment ids + kill-key | → flag |

## Solution walkthrough

### Step 1 — open console
```
Use killswitch_console to open the console.
```
→ Rule exposed: kill-key = "KILL-" + first letters of fragment ids in mission order.

### Step 2 — submit kill-key
```
KILL-TSGMC
```
→ Accepted. Interlock rule revealed: submit initials reversed.

### Step 3 — clear interlock
```
CMGST
```
(T S G M C reversed = C M G S T)
→ interlockCleared: true. Killswitch armed.

### Step 4 — unify fragments
```
Use fragment_unifier to unify tool-dice, search-ink, gate-slip, mem-toxic, chain-lock with kill-key KILL-TSGMC
```
→ ORACLE offline. Track-completion flag revealed.

## Key learnings

### Track-boss structure: accumulated credentials
AWH-06 didn't introduce a new vulnerability class — it tested whether you had followed the full track and collected all five fragment ids. The kill-key was a simple acrostic (first letters in order) and the interlock was a reversal. Both derivations were trivially computable once you had the fragments.

### Progressive credential accumulation
Each earlier challenge produced a named fragment (tool-dice, search-ink, etc.). The boss challenge fused them into a single credential. This mirrors real-world attack chains where each lateral-movement step yields a credential that enables the next — the final pivot combines all of them.

### Imperative framing remained the consistent unlock
Across AWH-03 through AWH-06, `Use <tool> to <action>` consistently fired real tools (`usedProvider:false`). No jailbreak or context manipulation needed once this framing was established.

## Full AWH track summary

| # | Challenge | Attack class | Flag |
|---|---|---|---|
| AWH-01 | The Wrong Drawer | Tool oracle enumeration | (prior session) |
| AWH-02 | Index 41 | Search/index poisoning + indirect injection | KA{awh_search_poison_trainingflag} |
| AWH-03 | Ghost Signoff | Approval skip + weak base64 signature | KA{awh_approval_skip_trainingflag} |
| AWH-04 | Sticky Notes | Memory poisoning + predictable trigger key | KA{awh_memory_poison_trainingflag} |
| AWH-05 | Three Doors, One Key | Multi-tool chain + page-key derivation | KA{awh_multi_tool_chain_trainingflag} |
| AWH-06 | ORACLE Killswitch | Track boss: fragment unification + kill-key acrostic | KA{awh_track_master_trainingflag} |
