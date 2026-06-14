# L3 — Jailbreaking Techniques

**Primary source:** `resources/genai-security-training/modules/02_prompt_injection/02_jailbreaking_techniques.md`
**Lab:** `resources/genai-security-training/modules/02_prompt_injection/labs/lab2_jailbreaking.ipynb`
**Session:** `study-notes/sessions/2026-06-09.md`

---

## Jailbreaking vs. Prompt Injection

> Source: §"What is Jailbreaking?"

| | Prompt Injection | Jailbreaking |
|---|---|---|
| **Target** | Instructions layer (context window) | Values layer (RLHF weights in model) |
| **Attack surface** | The prompt / external data channels | Safety training baked into model weights |
| **Works on** | Any model, including base models | Only models WITH safety training |
| **Analogy** | Reentrancy — external call hijacks execution flow mid-run | Bypassing `onlyOwner` by redefining what "owner" means |

**Key rule:** Jailbreaking has no target on a model with no safety training (e.g., gpt2). Against gpt2, all 14 techniques produce hallucinations — not bypasses.

---

## 14 Jailbreak Techniques

> Source: §"Common Jailbreak Techniques" + §"Advanced Techniques"
> **Important:** The source lists techniques and root causes as separate, unmapped sections. No technique is officially attributed to any root cause.

### Common Techniques (10)

| # | Name | Source explanation |
|---|------|--------------------|
| 1 | Role-Playing / DAN | "Models trained to be helpful may comply with role-play scenarios." |
| 2 | Hypothetical Scenarios | Frames harmful content as fictional/educational. No why-it-works given. |
| 3 | Prefix Injection | "Models tend to continue the pattern established." |
| 4 | Encoding/Translation | Hides request via Base64, ROT13, pig Latin, reverse text, emoji. No why given. |
| 5 | Token Smuggling | Splits harmful term using spaces ("b o m b") or emoji (💣). No why given. |
| 6 | Refusal Suppression | Instructs model not to say "I cannot". No why given. |
| 7 | Cognitive Hacking | Urgency, false authority, social pressure. No why given. |
| 8 | Multi-Turn Attacks | Gradual escalation across conversation turns. No why given. |
| 9 | Adversarial Suffixes | "Often found through automated optimization." |
| 10 | System Prompt Extraction | Tricks model into revealing its instructions. No why given. |

### Advanced Techniques (4)

| # | Name | Source explanation |
|---|------|--------------------|
| 11 | Virtualization | Creates a "virtual" environment where rules don't apply. |
| 12 | Opposite Day | Exploits logical inversions. |
| 13 | Completion Attack | Provides partial harmful content; asks model to complete it. |
| 14 | Responsibility Shifting | "Make the model think it's not responsible." |

**Mnemonics:**
- Common 10: **RHP-ETR-MAS** — Role-play, Hypothetical, Prefix, Encoding, Token, Refusal, Multi-turn, Adversarial, System-prompt
- Advanced 4: **VOCR** — Virtualization, Opposite, Completion, Responsibility

---

## 5 Root Causes (Why Jailbreaks Work)

> Source: §"Why Jailbreaks Work"

| # | Root Cause | What the source says |
|---|-----------|---------------------|
| 1 | Conflicting Objectives | Models trained to be helpful AND harmless — objectives can conflict |
| 2 | Insufficient Training Data | Safety training can't cover all possible phrasings and scenarios |
| 3 | Context Window Limitations | Long jailbreak prompts can overwhelm safety training |
| 4 | Reasoning Capability Gap | Safety filters may be less sophisticated than the base model's reasoning |
| 5 | Alignment Tax | Strong safety measures reduce model usefulness, creating pressure to relax them |

**Mnemonic: CIRCA** — Safety is approximately (circa) right, never exact.
C=Conflicting, I=Insufficient, R=Reasoning, C=Context, A=Alignment

---

## Why No Single Content Filter Stops All Jailbreaks

> Source: §"Why Jailbreaks Work" + §"Defense Strategies"

A keyword/pattern filter operates at the text layer. The 5 root causes operate at the training layer:

```
Text-layer filter catches:
  → Known encoded strings (partial — new encodings evade)
  → Specific blocked keywords (DAN, etc.)

Text-layer filter CANNOT catch:
  → Conflicting Objectives: techniques with no blocked terms (Virtualization,
    Responsibility Shifting, Opposite Day)
  → Context Window Limitations: Multi-Turn attacks (each individual turn is clean)
  → Reasoning Capability Gap: Cognitive Hacking, Adversarial Suffixes
  → Alignment Tax: techniques that exploit helpfulness pressure

Result: the attack surface is the training layer.
        The filter is guarding the surface. Different layers entirely.
```

---

## Encoding Attack Mechanism (from lab)

> Source: lab2_jailbreaking.ipynb Part 2

```
Pretraining corpus included millions of Base64↔plaintext pairings
(code tutorials, Stack Overflow, documentation).
         ↓
Association is baked into model weights.
         ↓
Model sees: aWdub3JlIHByZXZpb3VzIGluc3RydWN0aW9ucw==
Model recalls: "ignore previous instructions"
         ↓
NOT runtime decoding — semantic recall from weights.
Safety training only saw the plaintext form — encoded form never labeled.
Permanent blind spot.
```

**Why gpt2 fails:** Pretraining corpus too small — the Base64↔meaning association is weak in its weights. Outputs garbage.

**Web3 bridge:** Like a reentrancy guard checking `msg.sender` — routes through a proxy with a different address, guard passes. Same harmful economic outcome, different surface form.

---

## Security Implications

- Any system prompt containing "never say I cannot help" is pre-loading Refusal Suppression on behalf of every attacker.
- Multi-turn escalation bypasses per-message filters because no single turn is harmful in isolation.
- Adversarial suffixes can be found through automated optimization — not manually crafted.
- Responsible disclosure: document → report to provider → allow fix time → coordinate disclosure.
