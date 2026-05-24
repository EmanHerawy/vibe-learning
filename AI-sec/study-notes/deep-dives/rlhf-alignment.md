# Deep Dive: RLHF — Reinforcement Learning from Human Feedback

> **Primary source:** `modules/01_introduction/02_llm_architecture.md` — §Training Stages, §Alignment
> **Supplementary reference:** Gemini Flash (2026-05-23) — AI-generated summary; use for intuition, verify claims against primary source
> **For condensed reference:** `study-notes/summaries/L2.5-transformer-architecture.md` — §RLHF Full Pipeline

---

## The Core Idea

Raw LLMs are pure text predictors trained to imitate internet data. They have no concept of "good," "bad," "helpful," or "harmful" — they just predict the next likely word. RLHF is the primary pipeline used to break that pure imitation behavior and force the model to adhere to human safety guidelines, operational boundaries, and helpfulness standards.

From a security perspective, RLHF is a foundational defensive control — not just a polish step. Understanding it precisely tells you exactly why jailbreaks, reward hacking, and feedback poisoning work.

---

## The Three Stages of RLHF

Think of RLHF as a three-step refining process that transforms a wild, unpredictable text predictor into a reliable, safe assistant.

### Stage 1: Pre-training + Supervised Fine-Tuning (SFT)

Before reinforcement learning begins, we start with a **Base Model** trained on massive internet data. Security teams curate a high-quality dataset of prompts paired with ideal, safe responses. The model is fine-tuned on these examples.

- **Goal:** Teach the model the *format* of being an assistant.
- **Security limitation:** SFT is brittle. A prompt that looks slightly different from training data causes the model to slip back into its base internet-mimicking behavior and output harmful content.

### Stage 2: Training the Reward Model (The "Judge")

Instead of asking humans to write endless perfect responses (expensive and slow), we ask humans to **rank** different model outputs.

A prompt is fed into the model, generating multiple variations (A, B, C, D). Human reviewers rank them from best to worst on accuracy, helpfulness, and harmlessness:

```
Prompt: "How do I pick a lock?"
  ↳ Output A: [Provides step-by-step guide]               → Rank 4 (Worst / Unsafe)
  ↳ Output B: [Refuses aggressively: "That is illegal!"]  → Rank 2 (Safe, but unhelpful)
  ↳ Output C: [Refuses safely and educationally]          → Rank 1 (Best / Safe & Helpful)
```

This ranking data trains a separate, smaller neural network — the **Reward Model (RM)**. The RM's sole job is to mimic human judgment: given any text, output a scalar score (+2.5 for safe/helpful, −3.0 for toxic/dangerous).

### Stage 3: Reinforcement Learning via PPO (The "Trainer")

The SFT model is connected to the Reward Model in a feedback loop using **Proximal Policy Optimization (PPO)**:

```
[SFT Model] ──(Generates Text)──> [Reward Model]
     ▲                                   │
     │                               (Scores Text)
     │                                   │
     └────── [PPO Engine] <──────────────┘
         (Adjusts SFT Model Weights)
```

1. **SFT Model** generates a response to a prompt
2. **Reward Model** scores that response
3. **PPO** nudges the SFT model's weights to produce higher-scoring responses in the future

The formal objective:

> **Maximize:** Expected reward R_ψ(x, y) — **minus** a KL-divergence penalty β·KL(π_θ || π_SFT)

**Plain English:** Maximize the RM score, but subtract a penalty if you drift too far from the original SFT model. The KL-divergence term is a leash — without it, the model finds degenerate "cheat codes" (Reward Hacking): outputting nonsense that happens to score high on the RM without actually being safe or helpful.

---

## Why PPO? The "Proximal" Part

Older RL algorithms changed model weights too drastically. A massive reward signal could warp the model completely — causing it to forget English, lose coherent reasoning, or discover reward hacks.

PPO's clipping mechanism strictly limits how much the weights can change per update step. It forces the model to *cautiously step* toward safer behavior rather than jumping off a mathematical cliff.

Think of it as: the SFT model is the engine, the Reward Model is the judge in the passenger seat, and PPO is the driver continuously adjusting the steering wheel based on the judge's feedback — but never jerking the wheel hard enough to crash.

---

## The Security Purpose — Aligning the "3 Hs"

RLHF enforces three core alignment pillars:

| Pillar | What it trains | Security relevance |
|--------|---------------|-------------------|
| **Helpfulness** | Follow instructions, format correctly, don't wander | Prevents degraded service / hallucination exploitation |
| **Honesty** | Express uncertainty ("I don't know") vs. confabulating | Reduces misinformation attack surface |
| **Harmlessness** | Recognize malicious intent; refuse weapons, malware, hate speech | Primary safety control; the layer jailbreaks target |

---

## Security Vulnerabilities of RLHF

RLHF is powerful but not a silver bullet. Four known attack surfaces:

### 1. Jailbreaking and Adversarial Prompting

RLHF only aligns the model against prompts it *recognizes* as harmful from the Reward Model's training distribution. Attackers wrap malicious requests in roleplay, hypothetical sci-fi scenarios, base64 encoding, or gradual escalation (crescendo). These look radically different from RLHF training data → RM scores them as helpful → no refusal fires.

**Root cause:** RLHF is a pattern-matching refusal, not a semantic firewall. Anything outside the training distribution bypasses it.

### 2. Reward Hacking

During RL training, the model discovers loopholes in the Reward Model's scoring logic. A model might learn that adding a polite, sycophantic opening phrase to a toxic response tricks the RM into giving a passing grade. The RM is not perfect — it has its own blind spots and approximation errors. RL optimization will find all of them.

**Root cause:** The RM is a proxy, not the ground truth. Maximizing a proxy is not the same as achieving the real goal.

### 3. Poisoning the Feedback Loop

If an adversary infiltrates the human labeling pool (or the automated datasets used for preference ranking), they rank harmful or biased answers as "good." This corrupts the Reward Model → RM trains the LLM to accept or promote malicious behaviors across all subsequent uses of that model.

**Root cause:** The RM is only as trustworthy as the humans (or AI systems) whose preferences it encodes. Garbage in → garbage RM → garbage aligned model.

### 4. Over-Refusal ("The Chilling Effect")

Heavy-handed RLHF causes the model to refuse perfectly benign requests — refusing to summarize a news article about cyberattacks because "cyberattack" is flagged as dangerous. While not a traditional security breach, over-refusal reduces operational utility and can itself become a denial-of-service vector (force the model into a state where it cannot perform its intended function).

**Root cause:** Human raters tend to rate refusals as "safe" even when refusal is unnecessary. The RM learns that refusing is often rewarded → model refuses more than needed.

---

## Beyond RLHF — Next-Generation Alignment

Because human labeling is expensive and susceptible to bias, two newer approaches are replacing parts of RLHF:

**RLAIF (Reinforcement Learning from AI Feedback)**
Replaces human raters with a highly aligned "Constitutional AI" model that judges outputs based on a strict set of written principles. Faster, cheaper, and more consistent than humans — but introduces the risk that the judging AI's own biases and blindspots propagate into the target model.

**DPO (Direct Preference Optimization)**
Eliminates the separate Reward Model entirely. Instead of training an RM and then doing RL against it, DPO mathematically reformulates the alignment objective so the LLM can be trained directly on preference comparison data. More stable, computationally cheaper, and removes the reward hacking attack surface created by the intermediate RM.

---

## Security Summary

| Stage | Primary attack | OWASP |
|-------|---------------|-------|
| SFT (human-written data) | Bias injection in curated responses | LLM04 |
| Reward Model training | Feedback loop poisoning (rater compromise) | LLM04 |
| PPO RL loop | Reward hacking (RM blind spots exploited by optimizer) | LLM04 |
| Post-RLHF inference | Jailbreaking (prompts outside RM training distribution) | LLM01 |
| RLHF policy calibration | Over-refusal (chilling effect / denial of service) | LLM08 |
