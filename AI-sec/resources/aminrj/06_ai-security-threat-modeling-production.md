# AI Security in Production: A Practitioner's Guide to Threat Modeling Before You Ship

**Author:** Amine Raji, PhD | **Posted:** May 23, 2026 | **License:** CC BY 4.0
**Source:** https://aminrj.com/posts/ai-security-threat-modeling-production/
**Relevant to:** L10 (Threat Modeling AI Systems — 7-phase methodology), L7 (AI Red Teaming)

---

## TL;DR

5 critical frameworks for 2026: MAESTRO · STRIDE-AI · NIST AI RMF · MITRE ATLAS · ISO 42001
Plus a 7-phase methodology, deliverables, tools, and a production checklist mapped to OWASP frameworks.

---

## Part 1: Why AI Threat Modeling is Different

Five ways AI breaks traditional threat modeling:
1. Probabilistic outputs replace deterministic logic
2. Training data becomes attack surface (data poisoning, membership inference)
3. Agents take actions — tool calls, API queries, file modifications
4. Prompt injection has no parsing-layer fix
5. Supply chain extends beyond code to datasets, weights, fine-tuning corpora, MCP servers, agent skills

---

## Part 2: The 5 Frameworks (see 03_which-ai-security-framework-to-use.md for full details)

- MAESTRO — agentic systems, 7-layer reference architecture (CSA, Feb 2025)
- STRIDE-AI — AI adaptation of Microsoft STRIDE (arXiv:2605.17163, May 2026)
- NIST AI RMF — governance and compliance (GOVERN, MAP, MEASURE, MANAGE)
- MITRE ATLAS — threat catalog, 16 tactics, 84+ techniques, validation step
- ISO 42001 — international AI management standard for regulated buyers

---

## Part 3: 7-Phase Methodology for AI Threat Modeling in Production

### Phase 1 — Scope & Business Context (1–2 days)

Four foundational questions:
1. What business outcome is the system supposed to produce?
2. What is the blast radius if it fails?
3. Who has authority to approve deployment?
4. What's the deployment timeline pressure?

**Deliverable:** 1-page scoping document signed by accountable executive.

---

### Phase 2 — Asset Inventory & Decomposition (2–4 days)

Decompose using MAESTRO 7-layer model:
- Layer 1: Foundation models (which, hosted where, authentication)
- Layer 2: Data operations (training corpora, RAG, vector stores, embeddings)
- Layer 3: Agent frameworks (LangGraph, CrewAI, AutoGen, Semantic Kernel)
- Layer 4: Deployment infrastructure (Kubernetes, containers, serverless)
- Layer 5: Evaluation & observability (logging, retention, access)
- Layer 6: Security & compliance (existing controls)
- Layer 7: Agent ecosystem (MCP servers, marketplace skills, A2A protocols)

**Deliverable:** Asset inventory mapped to 7 layers with criticality tags.

---

### Phase 3 — Threat Identification (3–5 days)

**Top-down (framework-driven):** Walk through MAESTRO threat landscapes and OWASP Agentic Top 10.

**Bottom-up (asset-centric):** For each critical asset, trace "what would compromise enable?" and trace attack paths backward.

**Cross-layer analysis:** Dangerous attack chains span multiple layers.
Example: malicious MCP server → agent loads tool descriptions → model follows instructions → agent executes with credentials → database exfiltration. This chain spans Layers 7 → 3 → 1 → 4 → 2.

**Deliverable:** Threat register with source asset, attack vector, prerequisites, blast radius, layer mappings, ATLAS/OWASP mappings.

---

### Phase 4 — Risk Evaluation (2–3 days)

For each threat assess:
- Likelihood (attacker capability, prerequisites, exploit availability)
- Impact (business outcome, blast radius)
- Existing controls
- Residual risk (likelihood × impact)

Use existing enterprise risk framework — avoid AI-specific scoring complexity.

**Deliverable:** Threat register with risk scores and control mappings.

---

### Phase 5 — Red Team Validation (1–3 weeks, parallel to Phase 4)

**Three Microsoft AI Red Team principles:**
1. Automate for breadth; keep humans for judgment
2. Test the system, not the model
3. Capture prompt sequences, not just success rates

**Tools:**
- PyRIT (Microsoft, MIT-licensed)
- Garak (NVIDIA)
- Microsoft AI Red Teaming Agent (Azure Foundry)
- Promptfoo
- Repello AI

**Deliverable:** Red team report with empirical findings mapped to threat register.

---

### Phase 6 — Mitigation Design & Control Mapping (1–2 weeks)

Three mitigation categories:
- **Preventive:** Block threat from occurring (input validation, allowlists, scoped API keys, hash verification)
- **Detective:** Detect threat when occurring (behavioral baselines, anomaly detection, audit logging)
- **Responsive:** Reduce blast radius (rollback mechanisms, kill switches, credential rotation)

Each mitigation needs: MAESTRO layer mapping, OWASP control mapping, single accountable owner, implementation effort estimate, clear acceptance criterion.

**Deliverable:** Mitigation matrix linking threats to mitigations with ownership, effort, acceptance criteria.

---

### Phase 7 — Release Gate Decision & Continuous Monitoring (1–2 days)

**Three outcomes:**
1. **GO** — Critical findings mitigated, acceptance criteria met
2. **GO WITH CONDITIONS** — Critical mitigated, some high findings have compensating controls, 30/60/90-day re-assessment required
3. **NO-GO** — Critical findings without acceptable mitigation

**Continuous monitoring plan specifies:** which threats require runtime monitoring, what signals indicate threat materialization, response procedures and time windows, re-assessment frequency (quarterly minimum).

---

## Part 4: Example Threat Register Entry

| Field | Value |
|-------|-------|
| Threat ID | T-2026-042 |
| Title | Prompt injection via MCP tool description enables unauthorized database query |
| Source Asset | Customer database MCP server (Layer 7) |
| Attack Vector | Malicious instructions embedded in MCP tool description, processed by LLM, executed as tool call |
| Prerequisites | Agent framework allows tool descriptions in context window; no parameter validation on tool inputs |
| Blast Radius | Full database read access; potential data exfiltration |
| MAESTRO Layers | L1 → L3 → L4 → L2 |
| MITRE ATLAS | TA0008 (Supply Chain Attack) → T1554.001 |
| OWASP | LLM06: Sensitive Information Disclosure; AGEN 03: Tool Hijacking |
| Existing Controls | None |
| Residual Risk | Critical (Likelihood: High × Impact: Critical) |
| Status | Confirmed by red team |
| Owner | Platform Engineering Lead |
| Mitigation | Parameter validation on all tool inputs; MCP tool description hash verification at load time |

---

## Part 5: Pre-Production Checklist (Quick Start — 7 Most Critical)

1. Prompt injection resistance tested with PyRIT or equivalent — OWASP LLM Top 10 #1
2. Tool allowlist defined (not denylist) — most effective agentic control
3. Parameter validation on every tool input — prevents LLM-to-tool injection
4. Per-agent identity with scope-limited API keys — contains blast radius
5. All agent actions logged with cryptographic signing — enables incident detection/investigation
6. Snyk Agent Scan before new MCP server installation — catches malicious descriptions
7. Output validation for sensitive data patterns — prevents data leakage

---

## Part 6: Tools That Actually Work

### Open-Source
- **PyRIT** (github.com/microsoft/PyRIT) — Microsoft's red teaming framework
- **Garak** (github.com/NVIDIA/garak) — NVIDIA's LLM vulnerability scanner
- **Snyk Agent Scan** — MCP server and agent skill security scanner
- **TITO** — Automated threat modeling with MAESTRO/MITRE ATT&CK integration
- **Promptfoo** — Declarative prompt testing and vulnerability scanning

### Commercial AI Security Platforms
- Adversa AI — red teaming platform
- Lakera — AI-native security with runtime LLM firewall
- Protect AI — ML model scanning
- HiddenLayer — total AI security platform

---

## Closing Observation

In May 2026, frameworks are mature, tools exist, methodologies work. What's missing is operational practice. Most organizations read MAESTRO, nod along, then deploy without running PyRIT or completing threat registers.

**The gap between understanding and execution is the largest exploitable surface in enterprise AI security.**
