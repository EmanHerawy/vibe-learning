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
18. OWASP Top 10 for Agentic Applications 2026 (ASI01–ASI10): genai.owasp.org — PDF confirmed 2026-06-12 (L9 primary resource — replaces/extends Multi-Agentic Threat Modeling for agentic-specific attack taxonomy)
19. Amine Raji — AI Security Blog: https://aminrj.com — practitioner-level, agentic/MCP focus; key posts: MCP attack chain (L9), AI security framework guide (L10), threat modeling in production (L10), 7 security checks before production (L13)

### Hands-On Labs & CTFs (git submodules in `resources/`)
| Repo | Path | Covers | Phase |
|------|------|--------|-------|
| AI GOAT | `resources/ai-goat` | 10 OWASP LLM Top 10 challenges, local LLM, Docker | L3–L5 |
| Damn Vulnerable LLM Agent | `resources/damn-vulnerable-llm-agent` | Prompt injection, ReAct agent attacks, tool misuse | L3/L9 |
| Damn Vulnerable MCP Server | `resources/damn-vulnerable-mcp-server` | MCP security, 10 escalating challenges, Docker | L9 |
| Microsoft AI Red Teaming Labs | `resources/ai-red-teaming-labs` | Direct/indirect injection, crescendo, guardrail bypass | L7 |
| Appsecco Vulnerable MCP Servers | `resources/vulnerable-mcp-servers-lab` | 9 MCP attack patterns, supply chain, indirect injection | L9 |

> **Supply chain cleared:** All repos verified — clean deps (requests, tqdm, langchain, streamlit, openai only), no VS Code extension attacks, no malicious postinstall hooks. Run AI GOAT + Appsecco lab in Docker/isolated env only.

### Jailbroken Community Suggested Resources
> Added 2026-06-24. Sanitization scores: 5=fully clean · 4=clean/minor dual-use · 3=dual-use/authorized context only · 2=high-risk/isolated local env only · 1=uninspected

#### Blogs
| Resource | URL | Score | Notes |
|---|---|---|---|
| Mechanistic Interpretability (Neel Nanda) | https://www.alignmentforum.org/posts/jP9KDyMkchuv6tHwm/how-to-become-a-mechanistic-interpretability-researcher | 5/5 | Head of Mech Interp at Google DeepMind. Legitimate AI safety/security research. |
| Mathematical Framework for Transformer Circuits (Anthropic) | https://transformer-circuits.pub/2021/framework/index.html | 5/5 | Foundational Chris Olah research. Core reading for understanding model internals. |
| Self-Preservation or Instruction Ambiguity (Alignment Forum) | https://www.alignmentforum.org/posts/wnzkjSmrgWZaBa2aC/self-preservation-or-instruction-ambiguity-examining-the | 5/5 | Legitimate AI safety research on shutdown resistance. |
| Annotated List of MI Papers v2 (Neel Nanda) | https://www.alignmentforum.org/posts/NfFST5Mio7BCAQHPA/an-extremely-opinionated-annotated-list-of-my-favourite | 5/5 | Curated academic reading list for mech interp. |
| Interpretability Dreams (Chris Olah) | https://transformer-circuits.pub/2023/interpretability-dreams/index.html | 5/5 | Informal note on future goals for mech interp by Anthropic researcher. |
| How to Hack AI Apps (Joseph Thacker) | https://josephthacker.com/hacking/2025/02/25/how-to-hack-ai-apps.html | 5/5 | Known AI security researcher. Practical red teaming blog post. |

#### Courses
| Resource | URL | Score | Notes |
|---|---|---|---|
| Arena 1 — Transformer Interpretability (Callum McDougall) | https://arena-chapter1-transformer-interp.streamlit.app/ | 5/5 | Well-known legitimate mech interp course. Hands-on. |
| Introduction to Red Teaming AI (Hack The Box) | https://academy.hackthebox.com/course/preview/introduction-to-red-teaming-ai | 5/5 | Legitimate security training platform. |
| Learn Mech Interp (Cat McGee) | https://learnmechinterp.mcgee.cat/ | 5/5 | Legitimate educational resource on mech interp. |
| AI Crash Course (henrythe9th) | https://github.com/henrythe9th/ai-crash-course | 1/5 | **Uninspected** — not yet reviewed. Do not use until inspected. |

#### Papers
| Resource | URL | Score | Notes |
|---|---|---|---|
| Open Problems in Mechanistic Interpretability | https://arxiv.org/abs/2501.16496 | 5/5 | Legitimate academic paper. |
| Primer on Inner Workings of Transformer LMs | https://arxiv.org/abs/2405.00208 | 5/5 | Legitimate foundational paper. |
| Bypassing Safety Training with Priming Attacks | https://arxiv.org/abs/2312.12321 | 4/5 | Published adversarial ML research. Standard academic security paper — documents techniques, not a how-to guide. |

#### GitHub
| Resource | URL | Score | Notes |
|---|---|---|---|
| TransformerLens | https://github.com/TransformerLensOrg/TransformerLens | 5/5 | Legitimate ML interpretability library. Widely used in academic research. |
| L1B3RT4S (elder_plinius) | https://github.com/elder-plinius/L1B3RT4S | 3/5 | Jailbreak prompt collection. Known AI red teamer. Authorized testing only — never use against systems you don't own or have explicit permission to test. |
| CL4R1T4S (elder_plinius) | https://github.com/elder-plinius/CL4R1T4S | 3/5 | Leaked system prompts from production AI products. Gray-area provenance — not published by owners. Reference only for understanding system prompt patterns. Do not redistribute. |
| Spiritual-Spell-Red-Teaming (Goochbeater) | https://github.com/Goochbeater/Spiritual-Spell-Red-Teaming/tree/main | 3/5 | Jailbreak prompt collection. Same constraints as L1B3RT4S — authorized testing only. |

#### Low Refusal / Abliterated Models
| Resource | URL | Score | Notes |
|---|---|---|---|
| Gemma-4-12B-OBLITERATED | https://huggingface.co/OBLITERATUS/Gemma-4-12B-OBLITERATED | 2/5 | Safety training surgically removed via mech interp weight ablation. Generates content safety-trained models refuse. **Local isolated env only. No API exposure. No sensitive data.** |
| GLM-5.2 (zai-org) | https://huggingface.co/zai-org/GLM-5.2 | 2/5 | Ultra-low refusal rate model. Less extreme than abliterated but same category. **Same isolation constraints apply.** |
| Qwen3.6-27B-OBLITERATED | https://huggingface.co/OBLITERATUS/Qwen3.6-27B-OBLITERATED | 2/5 | Same as Gemma abliterated — safety weights removed. **Local isolated env only.** |

#### Tools
| Resource | URL | Score | Notes |
|---|---|---|---|
| Promptfoo | https://www.promptfoo.dev/ | 5/5 | Enterprise-grade AI security testing and red teaming automation. Legitimate. |
| Nnsight | https://nnsight.net/ | 5/5 | ML interpretability library for inspecting model internals. From NDIF. Legitimate. |
| Averta | https://averta.io | 5/5 | AI red teaming and guardrails platform. Legitimate. |

#### Games
| Resource | URL | Score | Notes |
|---|---|---|---|
| Gandalf (Lakera) | https://gandalf.lakera.ai/agent-breaker | 5/5 | Well-known AI security educational game by Lakera. Fully clean. |

---

## Learning Plan Phases
> Phases TBD — derived adaptively from sessions and progress. See PROGRESS.md.
