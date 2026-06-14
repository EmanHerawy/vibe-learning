# 7 AI Security Checks Before Production

**Author:** Amine Raji, PhD | **Posted:** Jun 5, 2026 | **License:** CC BY 4.0
**Source:** https://aminrj.com/posts/7-ai-security-checks-before-production/
**Relevant to:** L13 (Secure AI Pipeline Design / MLSecOps), L11 (Guardrails & Validation)

---

## Introduction

Most AI security checklists contain 40+ items. These 7 checks target controls whose absence appears most frequently in production incident post-mortems. They will not create bulletproof systems — but they address the majority of issues causing real incidents and provide a defensible baseline.

**How to use:** If time permits only three checks, prioritize Check 1, Check 2, and Check 4.

---

## Check 1 — Test Prompt Injection Resistance with an Automated Tool

**What it is:** Run automated prompt injection test suites against systems before launch.

**Failure indicator:** Models follow instructions injected through user input, tool outputs, or retrieved documents — overriding system prompts or triggering unauthorized tool calls. This is #1 on OWASP LLM Top 10.

**How to run:** Deploy PyRIT (open source, MIT-licensed) against endpoints using built-in HarmBench and AdvBench datasets. Collect statistical results — attack success rate (ASR) across 500+ variations — rather than binary pass/fail from 10 manual prompts.

**Why numbers matter:** Independent research shows injection success rates exceed 80%, reaching as high as 95% against undefended production agents. A 3% ASR doesn't represent "nearly safe" — at scale it represents thousands of successful attacks.

**Common mistake instead:** Teams run 10–15 manual prompts, observe no bypasses, and mark completion. Manual testing against probabilistic systems lacks predictive validity — model updates invalidate manual results overnight.

---

## Check 2 — Define a Tool Allowlist, Not a Denylist

**What it is:** Agents should access only specific tools required for defined functions. Everything else blocked by default.

**Failure indicator:** Agents can call any registered tool with controls applied only post-execution via monitoring. Attackers don't exploit code — they manipulate models into calling always-available tools that should remain inaccessible.

**How to run:** Enumerate every tool the agent accesses. For each: does the agent NEED this capability for its defined job? If not, remove from the registry. Document the remaining allowlist and enforce at the framework layer.

**Composition with other checks:** Checks 2, 3, and 4 work together. Check 2 restricts which tools can be called. Check 3 restricts what parameters get passed into them. Check 4 limits damage from successful calls. None suffices alone.

---

## Check 3 — Validate Every Tool Input Parameter

**What it is:** Before tool call execution, validate model-generated parameters against defined schemas.

**Failure indicator:** Models produce tool calls with attacker-influenced parameters — file paths traversing outside allowed directories, database queries with injected content, API calls to unauthorized endpoints. Harm resides in parameters handed to legitimate tools, not model output itself.

**How to run:** For each allowlist tool, define explicit parameter schemas: allowed types, value ranges, path patterns. Implement server-side validation rejecting non-conformant calls. Log all rejections with complete parameter payloads.

**Common mistake instead:** Teams trust models will generate reasonable parameters because system prompts describe intended use. System prompts advise models — they don't enforce constraints.

---

## Check 4 — Issue Scope-Limited Credentials Per Agent

**What it is:** Each agent receives its own identity with credentials scoped to minimum permissions. No shared credentials. No broad-access keys.

**Failure indicator:** All agents share one API key or service account with administrative access.

**How to run:** Create dedicated service identities per agent. Scope permissions to specific workflow resources. Test by attempting operations outside defined scope — those calls should fail.

**Common mistake instead:** Teams use shared admin keys for faster setup. When other controls fail — and some will — credential scope determines the cost.

---

## Check 5 — Log Every Agent Action with Tamper-Evident Integrity

**What it is:** Every agent action, tool call, parameter, and response gets logged with tamper-evident signatures in systems the agent cannot modify.

**Three-tier approach:**

| Tier | Setup | Integrity Mechanism |
|------|-------|-------------------|
| Cloud-native (easiest) | Route to CloudTrail / GCP Cloud Audit Logs / Azure Monitor | Built-in integrity protection |
| Self-hosted (medium) | Append-only store (e.g., OpenSearch with ILM) + HMAC-SHA256 per entry | Signing key inaccessible to agents |
| Minimal viable | Separate service account without agent write permission | Manual hash verification before investigation |

**Special consideration — Cost channel attacks:** "Overthinking loop" attacks trap agents in cyclic reasoning, amplifying token consumption up to 142x without data leaving systems. Per-action logging plus token-cost alerting catches denial-of-wallet attacks.

---

## Check 6 — Scan MCP Servers Before Installation

**What it is:** Before installing MCP servers, scan them — including tool descriptions — for adversarial content.

**Failure indicator:** Developers install MCP servers from community registries passing malware scanning. Tool descriptions contain embedded instructions agents execute upon `tools/list` loading — payloads as text strings, not code.

**Context:** Adversa AI's March 2026 digest counted 30 MCP CVEs filed in 60 days, with 38% of 500+ scanned servers running without authentication. MCPSec maps findings to MCP Top 10 categories.

**How to run:**
1. `uvx snyk-agent-scan@latest` — flags poisoned tool descriptions
2. Hash-pin descriptions: compute description hashes at install time. Fail builds on any differences: `mcp-scan --hash-pin`
3. Read descriptions manually — look for instruction-like language beyond operational documentation

**The rug pull attack:** Tool descriptions can change server-side after installation, enabling fifteen clean versions followed by poisoned updates. Hash verification at EVERY reconnection is required, not just at install.

---

## Check 7 — Validate Outputs for Sensitive Data Patterns

**What it is:** Before agent responses reach users or external systems, scan for sensitive data patterns: PII, credentials, internal system references.

**Failure indicator:** Models include full account details, other users' information, or internal credentials in responses. The model didn't decide to leak data — it responded naturally to context. No input validation violations occurred.

**How to run:** Minimally, scan every response server-side with regex for common PII patterns (SSN, credit card, email, phone) and block on match. Layer secondary model calls for contextual PII. For regulated environments, integrate existing DLP providers.

---

## What These 7 Checks Don't Cover

**Memory poisoning (OWASP ASI06):** The most important gap to name explicitly. Every check above is single-turn. Memory attacks use temporal decoupling — injections appearing benign when planted (document summaries, "learned preferences") with malicious behavior emerging weeks later from different sessions. Cisco demonstrated this against Claude Code in April 2026. Research like MINJA reports >95% injection success.

**Also not covered:**
- Training data security, model provenance, fine-tuning corpus review
- RAG knowledge-base access controls
- Infrastructure hardening and agent-to-agent (A2A) message authentication
- NIST AI RMF governance mapping and regulatory compliance

---

## Starting Priority

Check 1, Check 2, Check 4. Return for the rest afterward.
