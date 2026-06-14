# The Right AI Security Framework Depends on the Question You're Asking

**Author:** Amine Raji, PhD | **Posted:** Jun 2, 2026 | **License:** CC BY 4.0
**Source:** https://aminrj.com/posts/which-ai-security-framework-to-use/
**Relevant to:** L10 (Threat Modeling AI Systems — framework selection)

---

## Introduction

There are now more than 20 frameworks claiming to address AI security risk. Teams commonly fall into two failure modes: attempting to implement all frameworks simultaneously (producing documentation but no actionable threat model), or arbitrarily selecting a single framework and applying it superficially.

The core mistake is asking the wrong question. Rather than "which framework is best?", ask "which framework answers the specific question I'm trying to answer right now?"

---

## The 5 Frameworks That Actually Matter

### MAESTRO (for agentic AI systems)

**Full Name:** Multi-Agent Environment, Security, Threat, Risk, and Outcome
**Developer:** Cloud Security Alliance | **Release:** February 2025

7-layer reference architecture:
1. Foundation Models
2. Data Operations
3. Agent Frameworks
4. Deployment Infrastructure
5. Evaluation and Observability
6. Security and Compliance
7. Agent Ecosystem

Process: Map your system to layers → identify threats per layer → analyze cross-layer attack paths.

**When to use:** You're deploying agents, using MCP, or building any multi-step autonomous workflow.

---

### STRIDE-AI (for organizations already using STRIDE)

Formal adaptation of Microsoft's STRIDE methodology to AI systems (May 2026).

Reinterprets STRIDE categories for AI:
- **Spoofing:** Identity confusion in multi-agent systems
- **Tampering:** Training data contamination
- **Repudiation:** Opacity in AI decision provenance
- **Information Disclosure:** Model inversion, training data extraction
- **Denial of Service:** Unbounded consumption, resource exhaustion
- **Elevation of Privilege:** Jailbreaking and prompt injection bypassing safety controls

**When to use:** Your security organization already runs STRIDE-based reviews and needs AI threat modeling integrated with existing SDL processes.

---

### NIST AI RMF (for governance and compliance)

Four functions: GOVERN · MAP · MEASURE · MANAGE

This is a governance framework, not a threat modeling tool. It serves as the governance vocabulary for AI risk in the US. The EU AI Act references NIST AI RMF alignment as demonstrating strong risk management.

**When to use:** You need to demonstrate AI governance to regulators, customers, or your board.

---

### MITRE ATLAS (as a coverage check)

- 16 tactics, 84+ techniques, real-world case studies
- Describes threats and catalogs techniques but does not prescribe methodology or mitigations
- Use it AFTER completing MAESTRO or STRIDE-AI to verify threat model coverage

**When to use:** Always, as a validation step — not as the primary modeling tool.

---

### ISO 42001 (for selling to regulated buyers)

First international standard for AI management systems. Built on same structure as ISO 27001.
Implementation: 12–18 months, $200K–$500K for mid-market organizations.

**When to use:** Selling AI products to regulated buyers in financial services, healthcare, government, or defense.

---

## The Decision in Three Questions

### Question 1: Who is Asking?

| Audience | Framework |
|----------|-----------|
| Board / regulators | NIST AI RMF + ISO 42001 |
| Security architect / engineering team | MAESTRO or STRIDE-AI |
| Red team | MAESTRO + MITRE ATLAS |
| Enterprise sales / compliance | ISO 42001 |

### Question 2: What Are You Building?

| System Type | Start With |
|-------------|-----------|
| Standalone LLM application | STRIDE-AI |
| Agentic system with tools | MAESTRO |
| AI system in regulated industry | STRIDE-AI + NIST AI RMF |
| Multi-agent or MCP-based system | MAESTRO |

### Question 3: What Is Your Current Security Maturity?

| Maturity Level | Approach |
|----------------|----------|
| No existing threat modeling process | Start with MAESTRO |
| Existing STRIDE-based SDL | Extend it with STRIDE-AI |
| Compliance-driven organization | NIST AI RMF first, MAESTRO for technical depth |
| Full security program | Run the complete stack |

---

## How They Layer Together

Mature AI security programs use frameworks as a layered stack:

1. **ISO 42001:** Management system and operating model for organizational AI risk governance
2. **NIST AI RMF:** Governance functions (GOVERN, MAP, MEASURE, MANAGE)
3. **MAESTRO or STRIDE-AI:** Threat modeling methodology for identifying threats
4. **MITRE ATLAS:** Validates coverage — confirms you found what attackers actually do
5. **OWASP LLM Top 10 / Agentic Top 10:** Maps findings to vulnerability categories
6. **Garak or PyRIT:** Operationalizes testing — tools that prove your threat model is correct

**Implementation approach:** Identify your current gap, fill it, and add the next layer when exhausting the first.

**Example:** A fintech deploying its first customer service agent should run MAESTRO for threat modeling, check findings against ATLAS, then prepare NIST AI RMF documentation for banking partners — not start all four simultaneously.

---

## The Most Common Mistake

Teams read all frameworks and attempt to build a unified super-framework incorporating everything. This produces documentation, not threat models.

**Practical approach:** Pick the one framework matching the question being asked right now. Run it. Produce output. Use that output to make a decision. Add the next framework when you need what it specifically provides.

---

## Recommendations for Most Teams (2026)

For teams deploying their first production AI agent, **start with MAESTRO:**

1. Read the CSA whitepaper
2. Decompose your system against the 7 layers
3. Identify the top five threats per layer
4. Complete a usable threat model in approximately one week
