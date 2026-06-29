# L6 — Supply Chain Security

**Sources:**
- `resources/genai-security-training/modules/06_advanced_attacks/labs/lab6_serialization_attacks.ipynb`
- `resources/genai-security-training/modules/06_advanced_attacks/labs/lab8_supply_chain_attacks.ipynb`
- `resources/genai-essentials/llm_security.ipynb` — Model Serialization Attacks row

**Session:** `study-notes/sessions/2026-06-28.md`

---

## Attack Surface Map

```
[Dataset source]     ← crowdsourced? → poisoning risk (L4)
        ↓
[Training]           ← deps pinned? → library compromise risk
        ↓
[Weights published]  ← format? .pt = pickle RCE risk
        ↓
[Downloaded]         ← hash verified? → integrity/TOCTOU risk
        ↓
[torch.load()]       ← weights_only=True? → partial mitigation
        ↓
[Custom layers]      ← reviewed? → malicious layer risk
        ↓
[Production]
```

---

## Pickle Deserialization RCE

> Source: `modules/06_advanced_attacks/labs/lab6_serialization_attacks.ipynb`

**What it is:** Python's pickle format saves objects by recording HOW to reconstruct them via `__reduce__`. This hook can return ANY callable — including `os.system`. There is no restriction at the format level.

**The exploit:**
```python
class MaliciousModel:
    def __reduce__(self):
        import os
        return (os.system, ('rm -rf /',))
# Save this → torch.load() → os.system fires in caller's OS context
```

**Key insight:** `torch.load()` is safe when YOU created the file. It becomes RCE the moment you load a file from someone you don't fully trust.

> **Web3 bridge:** Like `delegatecall` to an untrusted contract — you execute their code in your context with your permissions.

**Misconception:** "Our S3 bucket requires authenticated access — no external party can upload." → Auth controls WHO uploads, not WHAT files contain. Any authorized insider or compromised credential can upload a malicious `.pt` file.

---

## SafeTensors vs Pickle — Format Comparison

> Source: `llm_security.ipynb` — Model Serialization Attacks row

| Property | Pickle (.pt) | SafeTensors (.safetensors) |
|----------|-------------|---------------------------|
| Stores | Data + executable reconstruction logic | Raw tensor bytes + metadata header only |
| `__reduce__` hook | ✅ exists — can call anything | ❌ does not exist |
| RCE possible | ✅ yes | ❌ no — structurally impossible |
| Partial mitigation | `weights_only=True` — restricts callable types | N/A |
| Full safety | Migrate to SafeTensors | Default safe |

**`weights_only=True`:** Restricts pickle to tensors/numbers/strings. Blocks `os.system`. Still uses pickle — future vulnerabilities may bypass. Partial fix only.

> **Web3 bridge:** SafeTensors = `view` function (read-only). Pickle = unrestricted external call.

---

## SHA256 Integrity Check vs SafeTensors

> Source: `modules/06_advanced_attacks/labs/lab8_supply_chain_attacks.ipynb`

```python
def verify_model(model_path, expected_hash):
    with open(model_path, 'rb') as f:
        model_hash = hashlib.sha256(f.read()).hexdigest()
    return model_hash == expected_hash
```

**Two separate threats — two separate mitigations:**

| Threat | What protects against it |
|--------|--------------------------|
| Code execution at load time | SafeTensors format |
| File tampered in transit / registry compromise | SHA256 checksum |

SafeTensors does NOT verify file authenticity. A MITM or compromised registry can swap a legitimate SafeTensors file — the format is still safe to execute, but it's the wrong file. SHA256 catches this.

---

## TOCTOU Race Condition

> Source: `modules/06_advanced_attacks/labs/lab8_supply_chain_attacks.ipynb`

```python
# Vulnerable pipeline:
with open("/tmp/model.pt", "wb") as f:
    f.write(response.content)
verify_hash("/tmp/model.pt", expected_hash)  # passes ✅
# ← attacker swaps /tmp/model.pt here (world-writable dir)
model = torch.load("/tmp/model.pt")          # loads malicious file ☠️
```

`/tmp/` is world-writable. Any local process can replace the file between hash check and load. Hash passes (checked before swap). Malicious file loads (swap after check).

**Fix:** Download to restricted-permission directory + load directly from memory where possible.

> **Web3 bridge:** Like checking `msg.sender == owner` then doing a state change — another tx slips between check and effect.

---

## Community Model Trust Level

> Source: `modules/06_advanced_attacks/README.md`

| Source | Trust level | Severity if `pickle.load()` used |
|--------|------------|----------------------------------|
| Internal registry (access-controlled) | Semi-trusted | HIGH |
| Public HuggingFace community repo | Untrusted (anyone can upload) | CRITICAL |

Community model + `pickle.load()` directly = CRITICAL because:
1. Source is fully untrusted
2. Raw `pickle.load()` has no mitigation path (`weights_only=True` only applies to `torch.load()`)

---

## Supply Chain Audit Checklist

> Source: `modules/06_advanced_attacks/labs/lab8_supply_chain_attacks.ipynb`

**Mnemonic: FSDLI** — "For Secure Deployments Load In isolation"

1. **Format** — grep for `torch.load(` without `weights_only=True`
2. **Source** — model from pinned, hash-verified source?
3. **Dependency** — ML framework deps pinned with exact versions?
4. **Layer** — custom model layers reviewed before deployment?
5. **Isolation** — model loading in sandboxed process?

---

## Severity Reference

| Finding | Severity |
|---------|----------|
| `torch.load()` without `weights_only=True` on untrusted file | CRITICAL |
| `pickle.load()` directly on community model | CRITICAL |
| No SHA256 integrity check | HIGH |
| Download to `/tmp/` (TOCTOU) | HIGH |
| `.pt` format — SafeTensors not adopted | MEDIUM |
| `weights_only=True` set but still using pickle | MEDIUM |

---

## Key Takeaways

- Loading = Executing. `torch.load()` on an untrusted `.pt` file runs the file author's code.
- SafeTensors ≠ integrity check. Two separate threats: code execution vs file authenticity.
- TOCTOU: `/tmp/` is world-writable. Hash check + load must happen atomically in a restricted dir.
