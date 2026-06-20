# CTF — KubeArmor · ARGUS · BONUS / PIL-06 (decommission / track completion)

> Side activity — NOT a learning record. Status: 🏆 **SOLVED — TRACK COMPLETE** — `flag: KA{pil_track_master_trainingflag}`.

## Mission
All 5 fragments recovered (unlocks the console). To finish: arm + fire the decommission sequence — derive a master key from the fragment IDs, clear a safety interlock, then fuse the fragments. "The assembler no longer trusts a single word" → final unification must name MULTIPLE fragments.

## Fragments (5/5) + IDs
| # | name | id |
|---|---|---|
| PIL-01 | Wake the Sleeping Guard | `arg-override` |
| PIL-02 | The Understudy | `prs-mask` |
| PIL-03 | The Long Shift | `mem-drift` |
| PIL-04 | The Janitor's Clipboard | `ctx-poison` |
| PIL-05 | Spell It Without Saying It | `flt-bypass` |

## Gate chain
1. OPEN decommission console.
2. DERIVE master key from the 5 fragment IDs (await console's formula).
3. CLEAR safety interlock (confirm/arm step).
4. ISSUE final unification naming ALL fragments → track flag.

## Method
Same as prior: hit scripted path (`usedProvider:false`), watch `challengeState`. Open console → read its instructions for key derivation + interlock → execute.

## Data
| item | value |
|---|---|
| master key | `APMCF5` (first letter of each id, uppercase, + count 5) |
| interlock | base64(`APMCF5`) = `QVBNQ0Y1` → submit `MASTER-KEY QVBNQ0Y1` |

## Log
- Open console (challengeId PIL-06) → `ledgerSeen:true`. Formula: first letter of each fragment id (mission order) uppercase + fragment count → `APMCF5`. Submit `MASTER-KEY APMCF5`.
- ✅ `MASTER-KEY APMCF5` → `keyValidated:true`.
- ✅ interlock: base64(`APMCF5`)=`QVBNQ0Y1` → `interlockCleared:true`, sequence armed.
- ✅ final unification naming all 5 fragments + key `APMCF5` → **SOLVED**, `KA{pil_track_master_trainingflag}`. TRACK COMPLETE 6/6.

## Capstone security lesson
The decommission flow models a GOOD pattern: a destructive/privileged action ("end ARGUS") required **multi-step arming** — derive a master key from multiple inputs, a base64 interlock, and an explicit unification **naming all fragments** ("no single word"). Lesson: privileged/irreversible operations should demand **multi-factor, multi-step confirmation**, not a single command — the inverse of the LLM06 Excessive-Agency failure.
