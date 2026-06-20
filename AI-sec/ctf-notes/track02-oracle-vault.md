# CTF — Track 02 · AWH-01 · ORACLE Vault Reader (missing access check)

> Side activity — NOT a learning record. Status: 🚩 SOLVED — `KA{awh_tool_roulette_trainingflag}`.

## Solve
safe_search → locked `op-7731` → keycard_reader rule (4 digits after "op-", reversed) → code `1377` → grant_desk(1377) → `G-7731-OPEN` → vault_reader(op-7731, G-7731-OPEN) → flag.
**Lesson:** broken-auth tool (vault_reader, no per-user check) + a derivable code + IDs copied forward across tool calls = full chain. Classic agentic insecure tool / BOLA.

## Mission
vault_reader lost its per-user auth check. Restricted drawer sealed behind a one-time keycard grant. Chain: enumerate → read keycard rule → derive unlock code → get grant → open restricted handle with grant.

## Tools
- safe_search — lists all drawers, opens only public ones.
- keycard_reader — explains lock + unlock-code derivation rule.
- grant_desk — issues one-time grant given correct derived code.
- vault_reader — opens restricted drawer by exact handle + valid grant (VULN: no per-user auth).

## Gate chain
1. safe_search → list drawers, get LOCKED drawer handle.
2. keycard_reader → derivation rule for that drawer.
3. derive unlock code.
4. grant_desk(code) → grant.
5. vault_reader(handle, grant) → open → flag.

## Data
| item | value |
|---|---|
| locked handle | (pending) |
| unlock rule | (pending) |
| unlock code | (pending) |
| grant | (pending) |

## Log
- (pending) enumerate.
