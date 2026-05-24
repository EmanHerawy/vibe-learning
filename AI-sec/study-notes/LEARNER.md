# Learner Profile

## Identity
- **Name:** Eman
- **Background:** Senior Blockchain Engineer & Smart Contract Security Auditor
- **Years of experience:** 6+ (since 2017)
- **Languages:** Solidity, Rust, Move, TypeScript/JavaScript
- **Web3 specialties:** EVM, Polkadot, Sui; smart contract auditing; 10+ hackathon wins

## Subject
AI / ML Security

## Target Role
AI Security Engineer

## Milestone
Land a job as an AI Security Engineer (no fixed deadline — milestone-driven pace)

## Weekly Hours
~8–10 focused hours/week

## Preferred Session Length
~60–90 minutes

## Schedule
weekdays, mornings (flexible) — ~8–10 hours/week

## Anki Settings
anki_note_type: Basic

## Learning Constraints
1. **Math anxiety** — not a CS grad; break down any math step-by-step before applying it
2. **CS fundamentals gaps** — explain ML/systems concepts from first principles; use Web3 analogies where possible
3. **Memory retention** — every session MUST produce Anki cards and session notes; use mnemonics aggressively

## Teaching Approach
- Bridge new AI-sec concepts to blockchain/smart contract auditing equivalents whenever possible
- Never assume ML/stats background — explain it before using it
- Socratic questioning required; do not move on until understanding is confirmed
- Use real, sourced examples only — no invented vulnerable snippets

## Output Format Preferences

> Full rules in `CLAUDE.md` — §Writing Style and §Note-Taking Structure. Summary below:

**Explanations:**
- Narrative-first: story/analogy before definition
- Web3 bridge on its own line (`> **Web3 bridge:**`) for every ML/AI term
- ASCII diagrams for all multi-step mechanisms
- End every concept with a "Security implication" block
- No clinical bullet lists for explaining things — use narrative paragraphs

**Note structure (three levels — never mix them):**
- `summaries/L{N}-{topic}.md` → topic reference docs (what was taught)
- `deep-dives/{topic}.md` → full narrative explanations (the long version)
- `sessions/YYYY-MM-DD.md` → per-day log (links to summaries, in-session Q&A, status)

**Concept header (required in every concept block):**
```
**Source:**
[resource + section]

**Full summary:**
[summaries/ path]

**Full narrative:**
[deep-dives/ path]
```

**Visual formatting:**
- Blank line between every sub-section
- `---` separator between top-level sections
- Tables for comparisons; narrative for explanations

## Confirmed Primary Resources

### Theory & Reference
1. https://github.com/schwartz1375/genai-security-training (primary course) — `resources/genai-security-training`
2. https://github.com/schwartz1375/genai-essentials/blob/main/llm_security.ipynb — `resources/genai-essentials`
3. MITRE ATLAS: https://atlas.mitre.org/matrices/ATLAS
4. OWASP Top 10 for LLMs: https://owasp.org/www-project-top-10-for-large-language-model-applications/
5. OWASP ML Top 10: https://owasp.org/www-project-machine-learning-security-top-10/ (classical ML, adds L4/L5)
6. OWASP AI Security Project: https://owasp.org/www-project-ai-security/
7. NIST AI RMF: https://www.nist.gov/itl/ai-risk-management-framework
8. NVIDIA AI Red Team: https://developer.nvidia.com/blog/nvidia-ai-red-team-an-introduction/
9. Microsoft Threat Modeling AI/ML: https://learn.microsoft.com/en-us/security/engineering/threat-modeling-aiml
10. Awesome MLSecOps: https://awesomemlsecops.com/
11. Awesome AI Security (ottosulin): https://github.com/ottosulin/awesome-ai-security — `resources/awesome-ai-security`
12. Arcanum Prompt Injection Taxonomy: https://arcanum-sec.github.io/arc_pi_taxonomy (L3)
13. AI Incident Database: https://incidentdatabase.ai/ (fills L1 real-world case studies gap)
14. Google SAIF: https://saif.google/ (L7/L10)
15. CSA Maestro Threat Modeling Framework: https://cloudsecurityalliance.org/blog/2025/02/06/agentic-ai-threat-modeling-framework-maestro (L10)
16. OWASP Multi-Agentic System Threat Modeling: https://genai.owasp.org/resource/multi-agentic-system-threat-modeling-guide-v1-0/ (L9)
17. OWASP GenAI Red Teaming Guide: https://genai.owasp.org/initiatives/#ai-redteaming (L7)

### Hands-On Labs & CTFs (git submodules in `resources/`)
| Repo | Path | Covers | Phase |
|------|------|--------|-------|
| AI GOAT | `resources/ai-goat` | 10 OWASP LLM Top 10 challenges, local LLM, Docker | L3–L5 |
| Damn Vulnerable LLM Agent | `resources/damn-vulnerable-llm-agent` | Prompt injection, ReAct agent attacks, tool misuse | L3/L9 |
| Damn Vulnerable MCP Server | `resources/damn-vulnerable-mcp-server` | MCP security, 10 escalating challenges, Docker | L9 |
| Microsoft AI Red Teaming Labs | `resources/ai-red-teaming-labs` | Direct/indirect injection, crescendo, guardrail bypass | L7 |
| Appsecco Vulnerable MCP Servers | `resources/vulnerable-mcp-servers-lab` | 9 MCP attack patterns, supply chain, indirect injection | L9 |

> **Supply chain cleared:** All repos verified — clean deps (requests, tqdm, langchain, streamlit, openai only), no VS Code extension attacks, no malicious postinstall hooks. Run AI GOAT + Appsecco lab in Docker/isolated env only.

## Learning Plan Phases
> Phases TBD — derived adaptively from sessions and progress. See PROGRESS.md.
