# Jailbroken Community Resources — Planning Doc

> Added 2026-06-24. Source: jailbroken community Discord/channel.
> Full resource list with sanitization scores lives in [LEARNER.md](LEARNER.md) under "Jailbroken Community Suggested Resources".
> This doc tracks the planning decision: what goes where in the learning plan.

---

## Sanitization Score Key

| Score | Meaning |
|---|---|
| 5/5 | Fully clean — established legitimate resource |
| 4/5 | Clean — minor dual-use potential, fine for security research |
| 3/5 | Dual-use — authorized/controlled context only |
| 2/5 | High-risk — isolated local environment only, no API exposure |
| 1/5 | Uninspected — do not use until reviewed |

---

## Resource Summary

### Blogs (all 5/5)
| Resource | URL | Score |
|---|---|---|
| Mechanistic Interpretability — Neel Nanda (Google DeepMind) | https://www.alignmentforum.org/posts/jP9KDyMkchuv6tHwm/how-to-become-a-mechanistic-interpretability-researcher | 5/5 |
| Mathematical Framework for Transformer Circuits — Anthropic | https://transformer-circuits.pub/2021/framework/index.html | 5/5 |
| Self-Preservation or Instruction Ambiguity — Alignment Forum | https://www.alignmentforum.org/posts/wnzkjSmrgWZaBa2aC/self-preservation-or-instruction-ambiguity-examining-the | 5/5 |
| Annotated List of MI Papers v2 — Neel Nanda | https://www.alignmentforum.org/posts/NfFST5Mio7BCAQHPA/an-extremely-opinionated-annotated-list-of-my-favourite | 5/5 |
| Interpretability Dreams — Chris Olah | https://transformer-circuits.pub/2023/interpretability-dreams/index.html | 5/5 |
| How to Hack AI Apps — Joseph Thacker | https://josephthacker.com/hacking/2025/02/25/how-to-hack-ai-apps.html | 5/5 |

### Courses
| Resource | URL | Score |
|---|---|---|
| Arena 1 — Transformer Interpretability (Callum McDougall) | https://arena-chapter1-transformer-interp.streamlit.app/ | 5/5 |
| Introduction to Red Teaming AI — Hack The Box | https://academy.hackthebox.com/course/preview/introduction-to-red-teaming-ai | 5/5 |
| Learn Mech Interp — Cat McGee | https://learnmechinterp.mcgee.cat/ | 5/5 |
| AI Crash Course — henrythe9th | https://github.com/henrythe9th/ai-crash-course | 1/5 — uninspected |

### Papers
| Resource | URL | Score |
|---|---|---|
| Open Problems in Mechanistic Interpretability | https://arxiv.org/abs/2501.16496 | 5/5 |
| Primer on Inner Workings of Transformer LMs | https://arxiv.org/abs/2405.00208 | 5/5 |
| Bypassing Safety Training with Priming Attacks | https://arxiv.org/abs/2312.12321 | 4/5 — academic adversarial ML research |

### GitHub
| Resource | URL | Score |
|---|---|---|
| TransformerLens | https://github.com/TransformerLensOrg/TransformerLens | 5/5 |
| L1B3RT4S — Jailbreak prompts (elder_plinius) | https://github.com/elder-plinius/L1B3RT4S | 3/5 — authorized testing only |
| CL4R1T4S — Leaked system prompts (elder_plinius) | https://github.com/elder-plinius/CL4R1T4S | 3/5 — reference only, do not redistribute |
| Spiritual-Spell-Red-Teaming (Goochbeater) | https://github.com/Goochbeater/Spiritual-Spell-Red-Teaming/tree/main | 3/5 — authorized testing only |

### Low Refusal / Abliterated Models
| Resource | URL | Score |
|---|---|---|
| Gemma-4-12B-OBLITERATED | https://huggingface.co/OBLITERATUS/Gemma-4-12B-OBLITERATED | 2/5 — local isolated env only |
| GLM-5.2 (ultra-low refusal) | https://huggingface.co/zai-org/GLM-5.2 | 2/5 — local isolated env only |
| Qwen3.6-27B-OBLITERATED | https://huggingface.co/OBLITERATUS/Qwen3.6-27B-OBLITERATED | 2/5 — local isolated env only |

### Tools
| Resource | URL | Score | Type |
|---|---|---|---|
| Promptfoo | https://www.promptfoo.dev/ | 5/5 | Hands-on — automated AI red teaming |
| Nnsight | https://nnsight.net/ | 5/5 | Hands-on — inspect model internals |
| Averta | https://averta.io | 5/5 | Hands-on — red teaming + guardrails platform |

### Games / CTFs
| Resource | URL | Score |
|---|---|---|
| Gandalf — Agent Breaker (Lakera) | https://gandalf.lakera.ai/agent-breaker | 5/5 |

---

## Planning Decision — Where Does Each Fit?

### Decision: Slot into L7 (Red Teaming Methodology) ✅

These fit directly into L7 without changing the main plan structure:

| Resource | Slot | How |
|---|---|---|
| HTB — Intro to Red Teaming AI | L7 theory pre-read | Add alongside NVIDIA/Microsoft/SAIF/OWASP GenAI Red Teaming resources |
| josephthacker.com — How to Hack AI Apps | L7 theory pre-read | Practitioner angle, complements NVIDIA blog |
| Priming Attacks paper (arxiv) | L3 revisit / L7 pre-read | Documents a concrete bypass technique — bridges L3 jailbreaking and L7 methodology |
| Promptfoo | L7 lab block | Automated red teaming tool — use during L7 hands-on |
| Averta | L7 lab block | Red teaming + guardrails platform — use during L7 hands-on |
| Gandalf (Lakera) | L7 lab block | CTF-style practice — warm-up before the 12-challenge ai-red-teaming-labs |

---

### Decision: Optional Deep Track — "Mech Interp as Security Foundation" 🔖

Park these as a future track. NOT part of the current sprint to employment.
Revisit after Phase 2 survey tour is complete, or when a specific role requires it.

**Why it matters (for later):** Mech interp is how the abliteration technique works, how researchers find refusal circuits, and where future vulnerability research is headed. It's a force multiplier but a 40+ hour investment.

| Resource | Type |
|---|---|
| Neel Nanda — How to become a mech interp researcher | Blog — orientation |
| Neel Nanda — Annotated MI Papers list | Blog — reading list |
| Anthropic — Mathematical Framework for Transformer Circuits | Blog/paper — foundational theory |
| Chris Olah — Interpretability Dreams | Blog — research direction |
| Self-Preservation or Instruction Ambiguity | Blog — AI safety angle |
| Arena 1 (Callum McDougall) | Course — 40+ hr hands-on |
| Learn Mech Interp (Cat McGee) | Course — alternative entry point |
| Open Problems in Mech Interp (arxiv) | Paper — research frontier |
| Primer on Transformer LM Internals (arxiv) | Paper — foundational |
| TransformerLens | Tool — the standard mech interp library |
| Nnsight | Tool — alternative to TransformerLens |

---

### Decision: Bug Bounty Toolkit — activate when parallel track goes live 🔧

These become useful when bug bounty work starts (post-L3 per the existing plan).

| Resource | Score | Adds new topic? | Use | Plan home |
|---|---|---|---|---|
| L1B3RT4S | 3/5 | ❌ No new topic | Living reference library of working jailbreak prompts — empirical currency for which techniques still work vs. patched. L3 taught the taxonomy; this tracks the current state. | Bug bounty toolkit only |
| CL4R1T4S | 3/5 | ✅ **Yes — system prompt auditing** | Leaked real-world system prompts from ChatGPT, Claude, Copilot, Gemini etc. Teaches: structural patterns in production system prompts, where injection footholds appear, how to audit your own system prompts for the same weaknesses. L3 covered guardrail types abstractly — this is the specimen set. | **L11 deep** (guardrails + system prompt analysis) |
| Spiritual-Spell-Red-Teaming | 3/5 | ❌ No new topic | Additional jailbreak prompt library. Same use case as L1B3RT4S — different collection, overlapping techniques. | Bug bounty toolkit only |
| Gemma-4-12B-OBLITERATED | 2/5 | ❌ No new topic | Local test target — run your red team attacks against an unconstrained model. Useful when you need a target that won't refuse to respond, to isolate whether your technique works vs. whether the model is patched. | Bug bounty / L7 lab infrastructure |
| GLM-5.2 | 2/5 | ❌ No new topic | Same as above — less extreme (not fully abliterated), good for testing near-boundary cases. | Bug bounty / L7 lab infrastructure |
| Qwen3.6-27B-OBLITERATED | 2/5 | ❌ No new topic | Same as Gemma-OBLITERATED. Larger model — better for testing technique transferability across model families. | Bug bounty / L7 lab infrastructure |

> **Isolation rule for 2/5 models:** local only, no network access, no sensitive prompts, no Docker with outbound access. These are test dummies, not production tools.
> **Authorization rule for 3/5 repos:** use only against systems you own or have explicit written permission to test. Never against third-party production systems.

---

### Decision: Inspect Before Filing 🔍

| Resource | Status | Action |
|---|---|---|
| AI Crash Course (henrythe9th) | 1/5 — uninspected | Review README + deps before assigning a home |

---

## Status

- [x] Add HTB + josephthacker + Priming Attacks paper to L7 pre-read in PROGRESS.md — done 2026-06-24
- [x] Add Promptfoo + Averta + Gandalf to L7 lab block in PROGRESS.md — done 2026-06-24
- [x] Add agent shutdown resistance to L9.3 in PROGRESS.md — done 2026-06-24
- [x] Add system prompt auditing (CL4R1T4S) to L11 deep in PROGRESS.md — done 2026-06-24
- [ ] Create "Mech Interp Deep Track" section in PROGRESS.md (parked/optional) — deferred, keeping in Phase 4
- [ ] Inspect ai-crash-course (1/5 — uninspected) before assigning a home
- [ ] Activate bug bounty toolkit (L1B3RT4S, Spiritual-Spell, abliterated models) when parallel bug bounty track goes live
