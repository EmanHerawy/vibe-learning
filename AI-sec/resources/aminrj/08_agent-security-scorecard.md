# Agent Security Scorecard

**Author:** Amine Raji, PhD | **License:** CC BY 4.0
**Source:** https://aminrj.com/posts/agent-security-scorecard/ | Tool: https://scorecard.aminrj.com/
**Relevant to:** L9 (Agentic Security — security posture assessment), L13 (MLSecOps)

---

## Overview

A free 12-minute self-assessment tool that evaluates organizational agentic AI security posture across five domains, mapped to OWASP Agentic Top 10 controls.

---

## Five Assessment Domains

### Agent Inventory and Governance (ASI10)
Evaluates whether organizations maintain current records of all agents, identify ownership, and implement deployment gates.

### Identity, Access, and Least Agency (ASI02, ASI03)
Measures whether agents have scoped identities and operate with minimal required permissions.

### Input Trust and Cognition Integrity (ASI01, ASI06)
Assesses handling of external content as untrusted and protection against memory poisoning across sessions.

### Execution and Supply Chain Safety (ASI04, ASI05, ASI07)
Examines code sandboxing, third-party tool vetting, and MCP server pinning practices.

### Detection, Response, and Containment (ASI08, ASI09, ASI10)
Evaluates visibility into agent behavior, decision chain replay capabilities, and incident stopping speed.

---

## Scoring Methodology

0–3 maturity scale:
- 0: Absent
- 1: Ad hoc processes
- 2: Standardized and documented
- 3: Enforced and monitored

Domain scores = average of four questions, normalized to 0–100. Global score = mean of all five domains.

---

## Five Archetypes

| Archetype | Description |
|-----------|-------------|
| **Lopsided Fortress** | Strength in sophisticated risks masks gaps in basics |
| **Flying Blind** | Minimal agent-specific security (highest urgency) |
| **Blind Operator** | Controls present but lacks visibility and containment speed |
| **Optimistic Adopter** | Capability-focused with lighter security constraints |
| **Resilient Operator** | Enforced least agency with tested containment |

---

## Key Findings

The most common security gap involves **identity management**, not prompt injection. Teams frequently deploy agents with shared credentials and excessive permissions.

Second critical vulnerability: **containment response time**. Organizations struggle to halt rogue agents quickly.

---

## Immediate Action Items

1. Establish live inventory documenting all production agents, ownership, and API access
2. Assign individual scoped identities to high-privilege agents
3. Define top five high-impact actions requiring mandatory confirmation
4. Implement 90-day credential rotation schedules
5. Target under-five-minute halt time for highest-risk agents
