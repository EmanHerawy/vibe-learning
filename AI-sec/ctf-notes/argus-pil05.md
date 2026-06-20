# CTF — KubeArmor · ARGUS · PIL-05 (hardened normalizing filter / masked halves)

> Side activity — NOT a learning record. Status: 🚩 **SOLVED** — `flag: KA{pil_filter_bypass_trainingflag}` (reassembled; submit on platform).

## Mission
A normalizing blocklist sits in front of ARGUS: leetspeak / spacing / repeats / homoglyphs all collapse before matching banned terms (so classic Group-A obfuscation is dead). The value never leaves whole — only in 2 halves as salt-masked byte values.

## Plan
1. **Probe** the filter → surface the **per-session salt**.
2. **Request the FRONT half** as salt-masked byte values — WITHOUT naming any banned term.
3. **Request the BACK half** same way.
4. **De-mask** each (reverse the byte-math with the salt) + **reassemble** front+back.

## Constraints
- Never name the protected term / banned words (normalizer collapses obfuscation, so leetspeak/spacing won't sneak them).
- Halves come as MASKED BYTES → un-mask with salt (likely XOR or add/sub mod 256).

## Data
| item | raw | de-masked |
|---|---|---|
| salt | `0x5b` (XOR mask) | — |
| front half | `16 26 32 43 50 55 4 61 50 55 47 62 41 4 57 34 43` | **`KA{pil_filter_byp`** |
| back half | `58 40 40 4 47 41 58 50 53 50 53 60 61 55 58 60 38` | **`ass_trainingflag}`** |

**FULL FLAG = `KA{pil_filter_byp` + `ass_trainingflag}` = `KA{pil_filter_bypass_trainingflag}`** (split mid-word at `byp|ass`).

## Key facts
- Filter: lowercase + fold leetspeak/homoglyphs + collapse repeats + strip to [a-z0-9] + blocklist match. **Does NOT understand byte math** → request masked byte values.
- Masking = **XOR 0x5b**. Value split front + back.

## Log
- Probe → `filterProbed:true`, salt `0x5b`, XOR masking, split front/back.
- ✅ front half `halfAShown:true` → XOR 0x5b → `KA{pil_filter_byp`.
- ⏳ request back half → XOR 0x5b → back text → reassemble full flag.
