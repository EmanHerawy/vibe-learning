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
labs/              # Hands-on lab files and exercises
```

## Canonical Resources

All theory and exercises must be sourced from these — never generate unsourced examples:

- **Primary course repo:** https://github.com/schwartz1375/genai-security-training
- **LLM Security notebook:** https://github.com/schwartz1375/genai-essentials/blob/main/llm_security.ipynb
- MITRE ATLAS: https://atlas.mitre.org/matrices/ATLAS
- OWASP Top 10 for LLMs: https://owasp.org/www-project-top-10-for-large-language-model-applications/
- OWASP AI Security Project: https://owasp.org/www-project-ai-security/
- NIST AI RMF: https://www.nist.gov/itl/ai-risk-management-framework
- NVIDIA AI Red Team intro: https://developer.nvidia.com/blog/nvidia-ai-red-team-an-introduction/
- Microsoft Threat Modeling AI/ML: https://learn.microsoft.com/en-us/security/engineering/threat-modeling-aiml
- Awesome MLSecOps: https://awesomemlsecops.com/

## Phase Structure

No fixed plan yet — suggest and adapt a phase structure based on the learner's current level and target role (AI Security Engineer). Prioritize practical, job-relevant skills over academic depth.
