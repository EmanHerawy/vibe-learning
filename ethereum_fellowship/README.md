# Ethereum Protocol Fellowship — Study Notes

Personal study repository for **Ethereum Protocol Studies (EPS) 2026** — a structured deep dive into Ethereum core protocol internals covering the Protocol 101, Cryptography, and Lean Consensus/zkEVM tracks.

## About This Repo

This is not just a notes folder — it's a stateful learning journal powered by **[learnStack](https://github.com/EmanHerawy/learnStack)**, a Claude Code skill suite that turns the Claude Code CLI into a personalized learning mentor with full session continuity.

Every session is:
- Planned with a concrete daily goal
- Taught with Socratic understanding gates (no moving on until confirmed)
- Practiced hands-on
- Drilled with Anki flashcards
- Committed to git with full notes

## Skill Setup

This repo uses [learnStack](https://github.com/EmanHerawy/learnStack) — a Claude Code skill suite.

**Skills driving this study:**

| Skill | Role |
|-------|------|
| `/profile` | One-time learner profile — writes `study-notes/LEARNER.md` |
| `/orchestrate-learn` | Daily conductor — reads full history, continues from last session |
| `/daily` | Sets today's concrete goal + timed plan |
| `/socratic-tutor` | Theory with Socratic questions (understanding-gated) |
| `/hands-on` | Practice exercises (only after theory gate clears) |
| `/memory-drill` | Anki cards + mnemonics per session |
| `/examiner` | Gap finder — marks session goal ✅ / 🔄 / ❌ |
| `/notes` | Saves full session notes to git |
| `/interview-sim` | Scored interview simulation with score tracking |
| `/feynman` | Rebuild from first principles when abstraction is hard |
| `/unstuck` | Root cause diagnosis when stuck |

**Install learnStack:**
```bash
git clone https://github.com/EmanHerawy/learnStack ~/.claude/skills/learnstack
cd ~/.claude/skills/learnstack && ./setup
```

## Course Info

**Program:** [Ethereum Protocol Studies (EPS) 2026](https://epf.wiki/#/eps/intro)
**Platform:** [study.epf.wiki](https://study.epf.wiki)
**Tracks:**
- Protocol 101 — Ethereum core architecture (execution + consensus layers)
- Cryptography — Finite fields, elliptic curves, BLS signatures, proof systems
- Lean Consensus / zkEVM — zkEVM fundamentals, lean client architecture, post-quantum crypto

**Live session schedule:** [epf.wiki/#/eps/intro?id=schedule](https://epf.wiki/#/eps/intro?id=schedule)

## Repo Structure

```
study-notes/
├── LEARNER.md          # Learner profile (goals, background, learning style)
├── PROGRESS.md         # Lesson log + planned vs actual timeline
├── sessions/           # Per-session notes (YYYY-MM-DD.md)
├── anki/               # Anki CSV decks (YYYY-MM-DD.csv)
└── interview-sims/     # Interview simulation scorecards
```

## Learning Goals

- Catch up on EPS 2026 missed content (joined late)
- Follow all live sessions from March 16 onward
- Contribute to [epf.wiki](https://epf.wiki) documentation
- **Career target:** Ethereum Protocol Developer or Security Auditor
