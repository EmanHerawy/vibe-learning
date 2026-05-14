# AI Security Learning Path — Opinionated Guide

> Saved 2026-05-13. This is the chosen path and the reasoning behind it.

## The Core Principle: Security-First, Not ML-First

Every generic roadmap starts with "learn linear algebra and ML fundamentals." That's the **researcher path**. This is the **practitioner path**.

| Researcher | Security Engineer |
|---|---|
| Needs to build models | Needs to break and defend them |
| Needs math to optimize | Needs math only to understand *why* an attack works |
| Needs 6 months of ML before touching security | Touches security in week 1 |

Math and Python come in **when a specific attack or defense requires them** — not as prerequisites.

---

## The Path

### Block 1 — Threat Landscape (2–3 weeks)
- L1: What is AI Security? — OWASP LLM Top 10 + MITRE ATLAS overview
- L2: How LLMs work (just enough to attack them) — tokens, context, system prompts
- L3: The attack surface map — where AI systems fail

### Block 2 — Offensive AI (4–6 weeks)
- L4: Prompt injection & jailbreaking (hands-on)
- L5: Data poisoning & backdoor attacks
- L6: Model extraction & inference attacks
- L7: Indirect prompt injection + RAG poisoning

### Block 3 — Defensive AI + MLSecOps (3–4 weeks)
- L8: Guardrails, input/output validation
- L9: Securing the ML pipeline (MLSecOps)
- L10: Threat modeling AI systems (STRIDE applied to LLMs)

### Block 4 — Governance & Portfolio (2–3 weeks)
- L11: NIST AI RMF + ISO 42001
- L12: Mock AI security audit — full report
- L13: Interview prep + CAISP cert path

**Total: ~12–14 weeks at 8–10 hrs/week.**

---

## Constraint Elimination Strategy

**Math anxiety** → Never abstract. Every formula appears attached to a real attack. Context kills anxiety.

**Bad memory** → Anki after every session + Feynman explanations before moving on + spaced review built in.

**CS gaps** → Patched in context when they appear, not in a prerequisite course.

---

## Why NOT the Other Roadmaps

- **"Start with linear algebra"** — This is the researcher path. Not your goal.
- **"Start with networking/OS basics"** — Already covered by your security background.
- **"Learn Python first"** — You write Rust. Python syntax will take a day. Learn it by running attacks in Block 2.
- **"Frameworks last"** — OWASP/ATLAS are taught in Block 1 because they define the vocabulary for everything else.
