# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

This is a structured self-study repository for mastering AI/ML Security, with the end goal of landing a role as an AI Security Engineer. Pace: ~8–10 focused hours/week.

## Learner Profile

Senior blockchain engineer (6+ years, EVM/Polkadot/Sui, smart contract auditing). Languages: Solidity, Rust, Move, TypeScript/JavaScript.

**Learning constraints:**
- Not a CS graduate — break down math and CS fundamentals step by step before applying them
- Weak memory retention — every session must produce Anki cards and session notes
- Strong security auditing instincts from Web3 — use that background as a bridge when introducing new concepts

## Session Workflow

Always start a session with `/orchestrate-learn` and end it with `/notes` + `/memory-drill`.

Use these skills in order:
1. `/daily` — set the session goal and time blocks
2. `/socratic-tutor` — theory with Socratic questioning (never move on until understanding is confirmed)
3. `/hands-on` — real exercises sourced from the canonical resources below
4. `/examiner --session` — gap-find before closing
5. `/notes` — save session notes to `study-notes/sessions/YYYY-MM-DD.md`
6. `/memory-drill` — generate Anki cards to `study-notes/anki/YYYY-MM-DD.csv`

## Repository Structure

```
study-notes/
  sessions/        # Per-day session notes (YYYY-MM-DD.md)
  anki/            # Anki CSV exports (YYYY-MM-DD.csv)
  PROGRESS.md      # Running progress log updated by /examiner
  LEARNER.md       # Full learner profile and confirmed resources
labs/              # Hands-on lab files and exercises
resources/         # Git submodules — canonical course repos + CTF labs
  genai-security-training/       # Primary course
  genai-essentials/              # LLM Security notebook
  awesome-ai-security/           # Curated AI security resource list (ottosulin)
  ai-goat/                       # CTF — 10 OWASP LLM Top 10 challenges (Docker, 16GB RAM)
  damn-vulnerable-llm-agent/     # CTF — ReAct agent prompt injection
  damn-vulnerable-mcp-server/    # CTF — MCP security, 10 challenges (Docker)
  ai-red-teaming-labs/           # CTF — Microsoft, 12 challenges (Docker + API key)
  vulnerable-mcp-servers-lab/    # CTF — 9 MCP attack patterns (Docker/isolated env only)
```

## Canonical Resources

All theory and exercises must be sourced from these — never generate unsourced examples:

### Theory (local submodules + external URLs)
- **Primary course repo:** `resources/genai-security-training` (https://github.com/schwartz1375/genai-security-training)
- **LLM Security notebook:** `resources/genai-essentials` (https://github.com/schwartz1375/genai-essentials)
- **Awesome AI Security:** `resources/awesome-ai-security` (https://github.com/ottosulin/awesome-ai-security)
- MITRE ATLAS: https://atlas.mitre.org/matrices/ATLAS
- OWASP Top 10 for LLMs: https://owasp.org/www-project-top-10-for-large-language-model-applications/
- OWASP ML Top 10: https://owasp.org/www-project-machine-learning-security-top-10/
- OWASP AI Security Project: https://owasp.org/www-project-ai-security/
- OWASP Multi-Agentic System Threat Modeling: https://genai.owasp.org/resource/multi-agentic-system-threat-modeling-guide-v1-0/
- OWASP GenAI Red Teaming Guide: https://genai.owasp.org/initiatives/#ai-redteaming
- NIST AI RMF: https://www.nist.gov/itl/ai-risk-management-framework
- NVIDIA AI Red Team intro: https://developer.nvidia.com/blog/nvidia-ai-red-team-an-introduction/
- Microsoft Threat Modeling AI/ML: https://learn.microsoft.com/en-us/security/engineering/threat-modeling-aiml
- Google SAIF: https://saif.google/
- CSA Maestro AI Threat Modeling: https://cloudsecurityalliance.org/blog/2025/02/06/agentic-ai-threat-modeling-framework-maestro
- Arcanum Prompt Injection Taxonomy: https://arcanum-sec.github.io/arc_pi_taxonomy
- AI Incident Database: https://incidentdatabase.ai/
- Awesome MLSecOps: https://awesomemlsecops.com/

### Hands-On Labs (git submodules — security-cleared)
| Lab | Path | Use at lesson |
|-----|------|---------------|
| AI GOAT | `resources/ai-goat` | L3–L5 (requires Docker + 16GB RAM) |
| Damn Vulnerable LLM Agent | `resources/damn-vulnerable-llm-agent` | L3/L9 (requires OpenAI/Ollama API key) |
| Damn Vulnerable MCP Server | `resources/damn-vulnerable-mcp-server` | L9 (Docker only) |
| Microsoft AI Red Teaming Labs | `resources/ai-red-teaming-labs` | L7 (Docker + OpenAI/Azure API key) |
| Vulnerable MCP Servers Lab | `resources/vulnerable-mcp-servers-lab` | L9 (Docker/isolated VM only) |

## Phase Structure

No fixed plan yet — suggest and adapt a phase structure based on the learner's current level and target role (AI Security Engineer). Prioritize practical, job-relevant skills over academic depth.
