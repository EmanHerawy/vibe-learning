# Progress Log

## Current Position
- Last lesson: L3 S2 — Jailbreaking Techniques (14 techniques, 5 root causes, lab2_jailbreaking.ipynb)
- Last session: 2026-06-09 (completed 2026-06-14)
- Status: 🔄 PARTIAL — taxonomy solid, lab coverage comprehensive; gaps: gpt2 Base64 failure mechanism (RLHF vs pretraining corpus), MITRE ATLAS tactic recall (AI Attack Staging decayed)
- Next up: L3 S3 — Guardrail Bypass (03_guardrail_bypass.md) or Defense Mechanisms (04_defense_mechanisms.md)
- Open carry-forward: LLM05 Improper Output Handling card; gpt2 Base64 pretraining corpus distinction; ATLAS AI Attack Staging recall; study plan re-sequencing discussion (agentic security L9 earlier?)

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

### Phase 1 — Foundations of AI/ML Security (Weeks 1–4)

- [x] L1: AI Security Overview — threat landscape, OWASP Top 10 for LLMs, MITRE ATLAS
  - Status: ✅ ACHIEVED (2026-05-13)
  - Minor gaps: real-world case studies, attacker motivations — will weave into L3+
- [x] **L2: How LLMs Work (enough to attack them)**
  - Status: ✅ ACHIEVED (2026-06-07)
  - Covered: tokenization, embeddings, context window, prompt roles, MHSA, FFN, output layer, attack entry points, FinBot audit, memorization, hallucination risk
  - Deep re-study: MHSA formula + attention dilution math, FFN W₁/W₂ mechanics, logit bias bypass, logprob extraction
- [x] L2.5: Close L2 gaps — embeddings + adversarial mindset
  - Status: ✅ ACHIEVED (2026-06-07)
  - Covered: training mechanics, RLHF pipeline, MHSA+FFN+output layer, adversarial mindset (5-step threat modeling, 3-layer attack surface, Red/Blue/Purple, 4 cognitive biases, 5-phase attack development)
- [ ] **L3: Prompt Injection & Jailbreaking — mechanics, detection, defense** ← CURRENT
  - Pre-read: modules/02_prompt_injection/ (all 4 files + 4 labs)
  - **NEW:** Arcanum Prompt Injection Taxonomy (added 2026-05-18)
  - **NEW CTF:** `resources/ai-goat` challenges 1–2 (prompt injection, insecure output) — run with Docker, 16GB RAM
  - **NEW CTF:** `resources/damn-vulnerable-llm-agent` (ReAct agent injection)
- [ ] L4: Data Poisoning & Training-Time Attacks
  - Pre-read: modules/05_poisoning/
  - **NEW:** OWASP ML Top 10 (classical ML threats, added 2026-05-18)
  - **NEW CTF:** `resources/ai-goat` challenges covering data/model attacks
- [ ] L5: Model Extraction & Inference Attacks
  - Pre-read: llm_security.ipynb (model inversion, membership inference, extraction sections)
  - **NEW CTF:** `resources/ai-goat` (extraction challenges)
- [ ] L6: Supply Chain & Dependency Attacks in AI Systems
  - Pre-read: llm_security.ipynb (model serialization, malicious layers)
  - **Web3 angle:** Focus lab practice on AI agents in DeFi — supply chain attack on a model managing a private key or calling an EVM/Sui RPC. Poisoned model weights → unauthorized on-chain transaction. Your auditing background applies directly here.

### Phase 2 — Red Team & Offensive AI Security (Weeks 5–8)

- [ ] L7: AI Red Teaming Methodology (NVIDIA + Microsoft frameworks)
  - **NEW:** Google SAIF (added 2026-05-18)
  - **NEW:** OWASP GenAI Red Teaming Guide (added 2026-05-18)
  - **NEW CTF:** `resources/ai-red-teaming-labs` (Microsoft, 12 challenges: direct/indirect injection, crescendo, guardrail bypass)
- [ ] L8: Adversarial Examples — evasion attacks on classifiers and LLMs
- [ ] L9: LLM-specific Attacks — indirect prompt injection, context hijacking, RAG poisoning, agentic attacks
  - Pre-read: llm_security.ipynb (plugins + agents section) + modules/09_agent_security/
  - **NEW:** OWASP Multi-Agentic System Threat Modeling (added 2026-05-18)
  - **NEW CTF:** `resources/damn-vulnerable-mcp-server` (10 challenges: tool poisoning, rug pull, credential extraction)
  - **NEW CTF:** `resources/vulnerable-mcp-servers-lab` (9 MCP attack patterns — run in Docker/isolated VM only)
  - **Web3 angle:** When studying tool poisoning and credential extraction, focus specifically on agents managing private keys or interacting with EVM/Sui RPCs. Scenario: AI agent tricked via indirect injection into signing a malicious transaction. This is your strongest portfolio differentiator — nobody else brings smart contract auditing context to MCP security.
- [ ] L10: Threat Modeling AI Systems (STRIDE applied to ML pipelines)
  - **NEW:** CSA Maestro Framework (added 2026-05-18)

### Phase 3 — Defensive AI Security & MLSecOps (Weeks 9–12)

- [ ] L11: Input/Output Validation & Guardrails
- [ ] L12: Monitoring, Logging, and Anomaly Detection for AI systems
- [ ] L13: Secure AI Pipeline Design (MLSecOps)
  - **Web3 angle:** Decentralized AI (Bittensor, confidential computing, decentralized inference networks) relies on Rust inference engines (llama.cpp, WASM/Substrate runtimes). Your Rust background positions you to audit inference backends — memory safety, serialization security, TEE boundaries — at a depth most AI security engineers can't reach.
- [ ] L14: NIST AI RMF — governance and risk management

### Phase 4 — Interview Prep & Portfolio (Weeks 13–16)

- [ ] L15: Mock AI Security Audits (full pipeline threat model)
- [ ] L16: Interview simulation — rapid-fire + deep dives
- [ ] L17: Portfolio project — AI security audit report on a real open-source model/system
  - **Target recommendation (from Gemini + Web3 angle):** Audit an AI agent framework that interacts with web tools, APIs, or smart contracts — NOT a simple wrapper app. A report showing how an AI agent can be tricked into draining an API, signing an unauthorized transaction, or exfiltrating private keys demonstrates the exact intersection (Web3 × AI Security) that no generic AI security candidate can replicate. This is the artifact that gets you hired.

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
