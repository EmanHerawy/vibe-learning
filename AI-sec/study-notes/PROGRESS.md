# Progress Log

## Current Position
- Last lesson: L2 — How LLMs Work (just enough to attack them)
- Last session: 2026-05-15
- Status: 🔄 PARTIAL — concepts solid, precision gaps remain
- Next up: Close L2 gaps (embeddings, adversarial mindset) then L3 — Prompt Injection & Jailbreaking

## Open Gaps (carry forward — must close before L3 is complete)

### L1 Gaps — found via canonical resource audit 2026-05-15
| Gap | Source | Priority |
|-----|--------|----------|
| Real-world case studies (ChatGPT 2023, Bing Chat 2023, GPT-2 extraction) | 01_security_landscape.md | MEDIUM |
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
- [ ] **L2: How LLMs Work (enough to attack them)** ← CURRENT
  - Status: 🔄 PARTIAL (2026-05-15)
  - Covered: tokenization, context window, prompt roles, attack entry points, FinBot audit
  - Open: embeddings, adversarial mindset module, memorization, hallucination risk
  - Retest: 4 questions pending answers
- [ ] L2.5: Close L2 gaps — embeddings + adversarial mindset ← NEXT
- [ ] L3: Prompt Injection & Jailbreaking — mechanics, detection, defense
  - Pre-read: modules/02_prompt_injection/ (all 4 files + 4 labs)
- [ ] L4: Data Poisoning & Training-Time Attacks
- [ ] L5: Model Extraction & Inference Attacks
  - Pre-read: llm_security.ipynb (model inversion, membership inference, extraction sections)
- [ ] L6: Supply Chain & Dependency Attacks in AI Systems
  - Pre-read: llm_security.ipynb (model serialization, malicious layers)

### Phase 2 — Red Team & Offensive AI Security (Weeks 5–8)

- [ ] L7: AI Red Teaming Methodology (NVIDIA + Microsoft frameworks)
- [ ] L8: Adversarial Examples — evasion attacks on classifiers and LLMs
- [ ] L9: LLM-specific Attacks — indirect prompt injection, context hijacking, RAG poisoning
  - Pre-read: llm_security.ipynb (plugins + agents section)
- [ ] L10: Threat Modeling AI Systems (STRIDE applied to ML pipelines)

### Phase 3 — Defensive AI Security & MLSecOps (Weeks 9–12)

- [ ] L11: Input/Output Validation & Guardrails
- [ ] L12: Monitoring, Logging, and Anomaly Detection for AI systems
- [ ] L13: Secure AI Pipeline Design (MLSecOps)
- [ ] L14: NIST AI RMF — governance and risk management

### Phase 4 — Interview Prep & Portfolio (Weeks 13–16)

- [ ] L15: Mock AI Security Audits (full pipeline threat model)
- [ ] L16: Interview simulation — rapid-fire + deep dives
- [ ] L17: Portfolio project — AI security audit report on a real open-source model/system

---

## Session Log

| # | Date | Topic | Goal | Status | Notes File |
|---|------|-------|------|--------|------------|
| 1 | 2026-05-13 | L1 — AI Security Threat Landscape | Understand OWASP LLM Top 10, why AI is a different attack surface, MITRE ATLAS structure | ✅ ACHIEVED | sessions/2026-05-13.md |
| 2 | 2026-05-15 | L2 — How LLMs Work | Trace request through tokenization → context window → output; identify attack entry points | 🔄 PARTIAL | sessions/2026-05-15.md |

---

## Canonical Resources — Pre-read Checklist
> Must read BEFORE teaching each lesson. Clone repos locally: `resources/genai-essentials` + `resources/genai-security-training`

| Lesson | Module files to read before session |
|--------|-------------------------------------|
| L2 (current) | `modules/01_introduction/02_llm_architecture.md`, `03_adversarial_mindset.md`, `llm_security.ipynb` |
| L2.5 (gap close) | Same as L2 — finish unread sections |
| L3 | `modules/02_prompt_injection/` — all 4 .md + 4 labs |
| L4 | `modules/05_poisoning/` |
| L5 | `modules/04_data_extraction/` + `llm_security.ipynb` (extraction/inference sections) |
| L6 | `modules/06_advanced_attacks/` + `llm_security.ipynb` (serialization + malicious layers) |
| L7 | NVIDIA AI Red Team blog + Microsoft Threat Modeling (external URLs in LEARNER.md) |
| L8 | `modules/03_evasion/` |
| L9 | `modules/09_agent_security/` + `llm_security.ipynb` (plugins + agents section) |
| L10 | Microsoft Threat Modeling AI/ML (LEARNER.md resource) |
| L11 | `llm_security.ipynb` (guardrails section) + `modules/02_prompt_injection/04_defense_mechanisms.md` |
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
