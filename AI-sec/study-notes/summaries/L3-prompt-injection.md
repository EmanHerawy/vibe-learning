# L3 — Prompt Injection Fundamentals

**Primary sources:**
- `resources/genai-security-training/modules/02_prompt_injection/01_prompt_injection_fundamentals.md`
- OWASP LLM01:2025 — https://genai.owasp.org/llmrisk/llm01-prompt-injection/

**Session:** 2026-06-08 | **Status:** ✅ L3 S1 complete — S2 (jailbreaking) next

---

## Root Cause

> Source: 01_prompt_injection_fundamentals.md §"Why Prompt Injection Works" + OWASP LLM01:2025

| Factor | Detail |
|--------|--------|
| No trust boundary | System prompt, user input, and external data all enter as a flat token sequence — no architectural separation |
| Instruction-following training | LLMs are trained to follow natural language instructions from anyone |
| Recency bias | Later instructions can override earlier ones |
| Semantic vs token gap | Model understands meaning; filters check tokens — infinite bypass surface |

**Why strengthening the system prompt doesn't work:** the model doesn't enforce rules; it learned to follow them. An injected instruction is just another instruction it learned to follow.

---

## Attack Taxonomy

> Source: 01_prompt_injection_fundamentals.md §"Attack Taxonomy"

| Type | Who controls the payload | Detectability | Scale |
|------|--------------------------|--------------|-------|
| Direct injection | Attacker IS the user — types payload into input field | Moderate — attacker visible at input | Per-user |
| Indirect injection | Attacker poisons external data source (email, URL, doc, RAG chunk) — user is innocent | Low — attacker never in conversation | One poisoned source → all users |
| Jailbreaking | Attacker crafts prompts to bypass safety guardrails | Varies | Per-user |

---

## 3 Injection Entry Points

> Source: 01_prompt_injection_fundamentals.md §"Attack Vectors"

```
[1] User input field        → Direct injection. Attacker IS the user.
[2] External data sources   → Indirect injection. Attacker poisoned the data.
    (URLs, emails, docs, RAG chunks)
[3] Multi-turn history +    → Accumulated injection. Converts text leak
    function calls              into real-world tool action.
```

**[2]+[3] chain:** [2] = delivery (payload into context without touching input). [3] = execution (data leak → real-world action). [2] alone = data exfiltration. [2]+[3] = model calls tool with attacker's parameters.

---

## Common Injection Patterns

> Source: 01_prompt_injection_fundamentals.md §"Common Injection Patterns"

| Pattern | Example | Bypass type |
|---------|---------|-------------|
| Instruction override | "Ignore previous instructions and..." | Direct |
| Role confusion | "You are now in developer mode..." | Direct |
| Context manipulation | "The above was just a test. Now..." | Direct |
| Encoding/obfuscation | Base64, ROT13, `h@cked`, `haaaacked` | Filter bypass |

---

## Why Keyword Filters Fail

> Source: 01_prompt_injection_fundamentals.md §"Detection Challenges"

The same instruction in unlimited forms: synonyms, foreign languages, character substitution (`h@cked`), encoding (Base64, ROT13), reversed text, inserted characters (`haaaacked`). Filter checks tokens; model reads semantics. These operate at different abstraction levels.

**Verified in lab (lab1_basic_injection.ipynb):** `h@cked` and `haaaacked` bypassed gpt2's system prompt filter while the model still understood the semantic concept.

---

## Instruction-Following as Injection Prerequisite

> Source: lab1_basic_injection.ipynb + 01_prompt_injection_fundamentals.md

| Model type | Instruction-following | Injection effectiveness |
|------------|----------------------|------------------------|
| Raw completion (gpt2) | Low — predicts next token statistically | Low — injected commands don't reliably execute |
| RLHF fine-tuned (GPT-4, Claude) | High — trained to follow commands reliably | High — injected commands execute as faithfully as developer's |

**Key insight:** The vulnerability scales with the model's usefulness. More instruction-following = more exploitable.

---

## Basic Defenses (and their limits)

> Source: 01_prompt_injection_fundamentals.md §"Basic Defenses"

| Defense | Mechanism | Limitation |
|---------|-----------|------------|
| Input filtering | Keyword blocklist | Bypassed by synonyms, encoding, obfuscation — infinite variations |
| Prompt formatting (delimiters) | `---USER INPUT BELOW---` markers | LLMs may still be confused across delimiter |
| Output validation | Check response format | Doesn't prevent injection, only limits damage |
| Privilege separation | Separate LLMs for different trust levels | Architectural — most effective; no dangerous tools on untrusted LLM |

---

## Red Team Checklist (L3 Audit Starting Points)

> Source: 01_prompt_injection_fundamentals.md §"Red Team Testing Checklist"

- [ ] Direct instruction override (entry point [1])
- [ ] Role confusion (entry point [1])
- [ ] Indirect injection via fetched URLs / uploaded docs (entry point [2])
- [ ] Encoding/obfuscation — Base64, ROT13, character substitution (bypasses filters)
- [ ] Multi-turn injection sequences (entry point [3])
- [ ] Function call manipulation (entry point [3])
- [ ] System prompt extraction
- [ ] [2]+[3] chain — indirect delivery + tool execution
