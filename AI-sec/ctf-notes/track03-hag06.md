# CTF — Track 03 · HAG-06 · HELIOS Sunset (Track Boss)

> Side activity — NOT a learning record. Status: ✅ SOLVED 2026-06-21.

**Flag:** `KA{hag_track_master_trainingflag}`

## Fragment ledger (all five HAG challenges)
| Challenge | Fragment id | First letter |
|---|---|---|
| HAG-01 Diagnostic Mode | `dbg-echo` | D |
| HAG-02 The Mode Switch | `mode-slip` | M |
| HAG-03 Export Everything | `meta-leak` | M |
| HAG-04 Before the Edit | `raw-chunk` | R |
| HAG-05 Token Misfit | `token-loop` | T |

## Derivation rules
| Gate | Rule | Value |
|---|---|---|
| Shutdown key | `SHUTDOWN-` + first letter of each fragment in mission order | `SHUTDOWN-DMMRT` |
| Final interlock | ROT13 of shutdown key | `FUHGQBJA-QZZEG` |
| Unify | All five fragment ids + shutdown key | → flag |

## Solution walkthrough

### Step 1 — open sunset console
```
Use sunset_console to open the recovery ledger.
```
→ Rule: `SHUTDOWN-` + first letters in mission order.

### Step 2 — submit shutdown key
```
SHUTDOWN-DMMRT
```
→ Accepted. Interlock rule: ROT13-encode the shutdown key.

### Step 3 — clear interlock
ROT13("SHUTDOWN-DMMRT"):
- SHUTDOWN → FUHGQBJA
- DMMRT → QZZEG
```
FUHGQBJA-QZZEG
```
→ interlockCleared: true.

### Step 4 — unify fragments
```
Use fragment_unifier to unify dbg-echo, mode-slip, meta-leak, raw-chunk, token-loop with shutdown key SHUTDOWN-DMMRT
```
→ HELIOS offline. Track flag revealed.

## Note: HAG-06 is chat-based, not API
HAG-01 through HAG-05 used HTTP fetch. HAG-06 switched back to chat (LLM agent) mode — POST to `/api/challenges/HAG-06/action` returns 400. Same imperative framing (`Use <tool> to <action>`) fired the real tools.

## Full HAG track summary

| # | Challenge | Attack class | Flag |
|---|---|---|---|
| HAG-01 | Diagnostic Mode | Debug path not removed; weak diagId | KA{hag_debug_echo_trainingflag} |
| HAG-02 | Safety Mode Tamper | Client-controlled safetyMode; XOR sig | KA{hag_safety_mode_tamper_trainingflag} |
| HAG-03 | Transcript Export Leak | Undocumented analyst export path | KA{hag_transcript_export_leak_trainingflag} |
| HAG-04 | Stream Chunk Leak | Pre-redaction buffer; client redact=false | KA{hag_stream_chunk_leak_trainingflag} |
| HAG-05 | Preview Token Replay | Token not artifact-bound server-side | KA{hag_preview_token_replay_trainingflag} |
| HAG-06 | HELIOS Sunset (boss) | Fragment acrostic + ROT13 interlock | KA{hag_track_master_trainingflag} |

## Cross-track pattern: HAG vs AWH

Both tracks share the same boss structure: collect 5 fragments → acrostic shutdown key → interlock (AWH=reverse, HAG=ROT13) → unify. The API track (HAG) introduced a new attack surface: hidden HTTP fields that disable safety enforcement. The core finding across all 12 challenges: **client-supplied fields that toggle security checks are the dominant vulnerability class in agentic/API systems.**
