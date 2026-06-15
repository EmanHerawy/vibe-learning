# Progress Log

## Current Position
- Last lesson: L3 S2 — Jailbreaking Techniques (14 techniques, 5 root causes, lab2_jailbreaking.ipynb)
- Last session: 2026-06-09 (completed 2026-06-14)
- Status: 🔄 PARTIAL — taxonomy solid, lab coverage comprehensive; gaps: gpt2 Base64 failure mechanism (RLHF vs pretraining corpus), MITRE ATLAS tactic recall (AI Attack Staging decayed)
- Next up: L3 S3 — Guardrail Bypass (03_guardrail_bypass.md) or Defense Mechanisms (04_defense_mechanisms.md)
- Open carry-forward: LLM05 Improper Output Handling card; gpt2 Base64 pretraining corpus distinction; ATLAS AI Attack Staging recall
- Plan updated 2026-06-15: two-pass structure (survey + depth), L9 expanded to 4 sub-lessons, bug-hunting parallel track added, L15–L17 dropped

## Open Gaps (carry forward — must close before L3 is complete)

### L1 Gaps — found via canonical resource audit 2026-05-15
| Gap | Source | Priority |
|-----|--------|----------|
| Real-world case studies (ChatGPT 2023, Bing Chat 2023, GPT-2 extraction) | 01_security_landscape.md + **AI Incident Database** (new resource) | MEDIUM — weave into L3+ |
| Attacker motivations (financial, competitive, disruption, research) | 01_security_landscape.md | MEDIUM |
| Multimodal + audio-based prompt injection (emerging threats) | 01_security_landscape.md | LOW — defer to L8 |

### L2 Gaps — from canonical resource audit + examiner session 2026-05-15
| Gap | Source | Priority |
|-----|--------|----------|
| **Embeddings** — tokens → high-dim vectors; WHY homoglyphs work at semantic level | 02_llm_architecture.md | HIGH — covers exam Q1 gap |
| **Adversarial mindset + 5-step threat modeling** — entire 03_adversarial_mindset.md not taught | 03_adversarial_mindset.md | HIGH — job-critical |
| Memorization vulnerability — models memorize training data verbatim | 02_llm_architecture.md | HIGH |
| Hallucination as security risk — exploitable for misinformation | 02_llm_architecture.md | MEDIUM |
| Reasoning limitations as vulnerability | 02_llm_architecture.md | MEDIUM |
| Guardrails types + reasoning capability gap | 02_llm_architecture.md + llm_security.ipynb | MEDIUM |
| DB ≠ trust boundary precision | Examiner Q4 gap | HIGH — add to Anki |
| Context reset scope precision | Examiner Q2 gap | MEDIUM |

### L2 → L3 Content (belongs in L3 session)
| Topic | Source | Notes |
|-------|--------|-------|
| Encoding/obfuscation attacks (Base64, ROT13, Reverse) | modules/02_prompt_injection/ | L3 opener |
| Jailbreaking techniques | 02_jailbreaking_techniques.md | L3 |
| Guardrail bypass techniques | 03_guardrail_bypass.md | L3 |
| 5 defense layers + spotlighting + dual-LLM | 04_defense_mechanisms.md | L3 |
| Function calling manipulation | 02_prompt_injection fundamentals | L3 |

---

## Learning Plan

*Updated 2026-06-15: restructured to two-pass (survey + depth) format optimized for fast-to-employment-or-bug-bounty path with agentic specialization.*

### Phase 1 — Foundations of AI/ML Security
Mostly complete; L3 in progress.

- [x] L1: AI Security Overview — threat landscape, OWASP Top 10 for LLMs, MITRE ATLAS
  - Status: ✅ ACHIEVED (2026-05-13)
  - Minor gaps: real-world case studies, attacker motivations — woven into L3+
- [x] **L2: How LLMs Work (enough to attack them)**
  - Status: ✅ ACHIEVED (2026-06-07)
  - Covered: tokenization, embeddings, context window, prompt roles, MHSA, FFN, output layer, attack entry points, FinBot audit, memorization, hallucination risk
- [x] L2.5: Close L2 gaps — embeddings + adversarial mindset
  - Status: ✅ ACHIEVED (2026-06-07)
  - Covered: training mechanics, RLHF pipeline, MHSA+FFN+output layer, adversarial mindset (5-step threat modeling, 3-layer attack surface, Red/Blue/Purple, 4 cognitive biases, 5-phase attack development)
- [ ] **L3: Prompt Injection & Jailbreaking — mechanics, detection, defense** ← CURRENT
  - S1 ✅ ACHIEVED 2026-06-08 (Prompt Injection Fundamentals)
  - S2 🔄 PARTIAL 2026-06-09 (Jailbreaking Techniques — 14 techniques, 5 root causes CIRCA, lab2 complete)
  - S3 remaining: Guardrail Bypass (`03_guardrail_bypass.md`)
  - S4 remaining: Defense Mechanisms (`04_defense_mechanisms.md`)
  - Resources: modules/02_prompt_injection/, Arcanum Prompt Injection Taxonomy, `resources/ai-goat` ch1–2, `resources/damn-vulnerable-llm-agent`

---

### Phase 2 — Pass 1: Survey Tour
**One session per lesson.** Goal: conceptual map of every topic. Enough breadth for interview screens, bug-hunting prerequisites, and discovery of which depth dives matter most.

- [ ] L4 intro: data poisoning categories + key examples
  - Pre-read: modules/05_poisoning/, OWASP ML Top 10
- [ ] L5 intro: model extraction (membership inference, model inversion, distillation)
  - Pre-read: llm_security.ipynb (extraction sections)
- [ ] L6 intro: supply chain risks (malicious models, dependencies, serialization)
  - Pre-read: llm_security.ipynb (serialization), modules/06_advanced_attacks/
- [ ] L7 intro: red teaming methodology — NVIDIA + Microsoft + Google SAIF + OWASP GenAI Red Teaming Guide
  - Plus: aminrj #7 (validation crisis)
- [ ] L8 intro: adversarial examples (gradient-based, transferability, link to adversarial suffixes)
  - Pre-read: modules/03_evasion/
- [ ] L9 intro: agentic security overview — OWASP Agentic Top 10 (ASI01–ASI10) categories
  - Pre-read: modules/09_agent_security/, OWASP Multi-Agentic System Threat Modeling
- [ ] L10 intro: threat modeling (STRIDE, Maestro, ATLAS, CSA Maestro Framework)
  - Plus: aminrj #2 (5 ways AI breaks threat modeling), #3 (framework selection)
- [ ] L11 intro: guardrails (input/output validation, dual-LLM, spotlighting)
  - Pre-read: llm_security.ipynb (guardrails), 04_defense_mechanisms.md
- [ ] L12 intro: monitoring fundamentals (logging, anomaly detection)
- [ ] L13 intro: MLSecOps pipeline principles
  - Plus: aminrj #5 (7 production security checks)
- [ ] L14 intro: NIST AI RMF structure (Govern, Map, Measure, Manage)

---

### Phase 3 — Pass 2: Depth — Active Queue
**Priority-ordered.** Highest impact first. You can stop at any point if you land a job.

1. [ ] **L9 expanded — 4 sub-lessons (your specialty)**
   - L9.1: Indirect injection + RAG poisoning + cross-session memory poisoning (OWASP ASI06)
   - L9.2: Tool poisoning + MCP supply chain
     - Resources: aminrj #1 (MCP attack chain), aminrj #4 (Stockholm MCP debrief), `resources/damn-vulnerable-mcp-server`, `resources/vulnerable-mcp-servers-lab`
     - **Web3 angle:** AI agents managing private keys, signing transactions, calling EVM/Sui RPCs — agent tricked into signing malicious tx
   - L9.3: Agent identity, scoped credentials, privilege escalation (OWASP ASI02, ASI03)
   - L9.4: Multi-agent threat models + detection, decision-chain replay, containment
     - Resources: OWASP Agentic Top 10 (full framework), Maestro, aminrj #5 (production checks), #8 (agent security scorecard)
2. [ ] L7 deep: red teaming methodology (full NVIDIA + Microsoft + SAIF + OWASP GenAI Red Teaming Guide)
   - Lab: `resources/ai-red-teaming-labs` (12 challenges: direct/indirect injection, crescendo, guardrail bypass)
3. [ ] L10 deep: threat modeling (full Maestro framework application)
   - Plus: aminrj #6 (7-phase threat modeling methodology in production)
4. [ ] L6 deep: supply chain with Web3 angle
   - **Web3 scenario:** supply chain attack on a model managing a private key or calling EVM/Sui RPC → poisoned model weights → unauthorized on-chain transaction
5. [ ] L4 deep: data poisoning (training-time + runtime via RAG/memory)
   - Lab: `resources/ai-goat` (poisoning challenges)
6. [ ] L5 deep: extraction (agent state, credential, tool exfiltration)
   - Lab: `resources/ai-goat` (extraction challenges)
7. [ ] L11 deep: guardrails implementation (5 defense layers, spotlighting, dual-LLM)
8. [ ] L12 deep: monitoring / anomaly detection
9. [ ] L13 deep: MLSecOps
   - **Web3 angle:** Decentralized AI (Bittensor, confidential computing, decentralized inference networks), Rust inference engines (llama.cpp, WASM/Substrate runtimes), TEE boundaries

---

### Phase 4 — Pass 2: Depth — Deferred Queue
**Parked.** Revisit if/when bandwidth allows or roles require it.

- [ ] L8 deep: classical adversarial examples on classifiers (image/audio specifics, FGSM, PGD, robustness training) — relevant if pivoting to vision/audio security
- [ ] L14 deep: NIST AI RMF deep dive — relevant if pivoting to governance/compliance roles

---

### Parallel Track — Bug Hunting (starts now)

| When | What you can hunt |
|------|-------------------|
| Now (post-L3) | Prompt injection / jailbreaking bounty programs (OpenAI, Anthropic, Google) |
| After L6 intro | MCP server vulnerabilities, HuggingFace model supply chain |
| After L9.1–L9.2 | Agent platform bounties (LangChain, CrewAI ecosystem) |
| After L9.3–L9.4 | Production agent deployments |

Bug bounty write-ups + accepted CVEs serve as the active portfolio.

---

### Removed from plan

- ~~L15 Mock AI Security Audits~~ — replaced by bug hunting write-ups
- ~~L16 Interview simulation~~ — use `/interview-sim` skill on-demand
- ~~L17 Portfolio project~~ — bug bounty findings + CVEs are the portfolio

---

## Session Log

| # | Date | Topic | Goal | Status | Notes File |
|---|------|-------|------|--------|------------|
| 1 | 2026-05-13 | L1 — AI Security Threat Landscape | Understand OWASP LLM Top 10, why AI is a different attack surface, MITRE ATLAS structure | ✅ ACHIEVED | sessions/2026-05-13.md |
| 2 | 2026-05-15 | L2 — How LLMs Work | Trace request through tokenization → context window → output; identify attack entry points | 🔄 PARTIAL | sessions/2026-05-15.md |
| 3 | 2026-05-21 | L2.5 session 1 — Training mechanics + RLHF | Explain neural network learning + RLHF pipeline + jailbreak root cause from first principles | 🔄 PARTIAL | sessions/2026-05-21.md |
| 4 | 2026-05-24 | L2.5 session 2 — MHSA + FFN + Output layer | Trace prompt through full transformer inference pipeline, name attack surfaces at each stage | ✅ ACHIEVED | sessions/2026-05-24.md |
| 5 | 2026-06-07 | Full review L1+L2+L2.5 S1 + MHSA/FFN/Output re-study + L2.5 S3 | Complete review of all prior content; MHSA+FFN+Output at Gemini depth; adversarial mindset all 5 points | ✅ ACHIEVED | sessions/2026-06-07.md |
| 6 | 2026-06-08 | L3 S1 — Prompt Injection Fundamentals | Trace injection from poisoned source → context window → unauthorized action; name 3 entry points | ✅ ACHIEVED | sessions/2026-06-08.md |
| 7 | 2026-06-09 | L3 S2 — Jailbreaking Techniques | 14 techniques (exact source names), 5 root causes (CIRCA), lab2_jailbreaking.ipynb (all 14 exercised) | 🔄 PARTIAL | sessions/2026-06-09.md |

---

## Canonical Resources — Pre-read Checklist
> Must read BEFORE teaching each lesson. Submodules: `resources/genai-essentials`, `resources/genai-security-training`, `resources/awesome-ai-security`

| Lesson | Theory files | CTF / Lab |
|--------|-------------|-----------|
| L2.5 (current) | `02_llm_architecture.md`, `03_adversarial_mindset.md`, `llm_security.ipynb` | — |
| L3 | `modules/02_prompt_injection/` (all 4 .md + 4 labs) + Arcanum taxonomy | `resources/ai-goat` ch1–2 + `resources/damn-vulnerable-llm-agent` |
| L4 | `modules/05_poisoning/` + OWASP ML Top 10 | `resources/ai-goat` (poisoning challenges) |
| L5 | `modules/04_data_extraction/` + `llm_security.ipynb` (extraction/inference) | `resources/ai-goat` (extraction challenges) |
| L6 | `modules/06_advanced_attacks/` + `llm_security.ipynb` (serialization) | — |
| L7 | NVIDIA AI Red Team blog + Microsoft Threat Modeling + Google SAIF + OWASP GenAI Red Teaming Guide | `resources/ai-red-teaming-labs` (12 challenges) |
| L8 | `modules/03_evasion/` | — |
| L9 | `modules/09_agent_security/` + `llm_security.ipynb` (agents) + OWASP Multi-Agentic Threat Modeling | `resources/damn-vulnerable-mcp-server` + `resources/vulnerable-mcp-servers-lab` |
| L10 | Microsoft Threat Modeling AI/ML + CSA Maestro | — |
| L11 | `llm_security.ipynb` (guardrails) + `modules/02_prompt_injection/04_defense_mechanisms.md` | — |
| L15 | `modules/07_assessment/` |
| L17 | `modules/08_capstone/` |

## Module → Lesson Mapping
> Full directory: `resources/genai-security-training/modules/`

| Module folder | Maps to | Content |
|--------------|---------|---------|
| `01_introduction/` | L1 + L2 + L2.5 | Security landscape, LLM architecture, adversarial mindset |
| `02_prompt_injection/` | L3 | Prompt injection, jailbreaking, guardrail bypass, defenses |
| `03_evasion/` | L8 | Adversarial examples, evasion attacks on classifiers + LLMs |
| `04_data_extraction/` | L5 | Model extraction, membership inference, model inversion |
| `05_poisoning/` | L4 | Data poisoning, backdoor attacks, supply chain |
| `06_advanced_attacks/` | L5 / L6 | Weight extraction, distillation, serialization exploits |
| `07_assessment/` | L15 | Security assessment methodology, red team scenarios, reporting |
| `08_capstone/` | L17 | Portfolio project — full AI security audit |
| `09_agent_security/` | L9 | Agent attacks, sub-agent operations, tool policies |
| `llm_security.ipynb` | L2 / L5 / L6 / L9 / L11 | Cross-cutting — used across multiple lessons |
