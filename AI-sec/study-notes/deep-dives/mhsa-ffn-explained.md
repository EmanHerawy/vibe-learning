# Deep Dive: How Transformers Process Text
## Multi-Head Self-Attention + Feed-Forward Networks — Full Explanation

> **Writing style:** narrative-first, analogy-driven (preferred style confirmed 2026-05-21)
> **Security implications added from:** `02_llm_architecture.md` + session notes 2026-05-18
> **For condensed reference:** `study-notes/summaries/L2.5-transformer-architecture.md`

---

## The Transformer Block

A standard transformer layer contains two sub-layers with residual connections and layer normalization:

```
Input → LayerNorm → MHSA → Add → LayerNorm → FFN → Add → Output
```

Each layer repeats this pattern 12–96+ times depending on model size. The magic is that the same computation pattern scales to billions of parameters while remaining trainable.

The two sub-layers do completely different jobs:
- **MHSA** = *context finder* — figures out which tokens are relevant to each other
- **FFN** = *knowledge retriever* — looks up what the model knows about the current context

The **residual connections ("Add")** add the sub-layer's input back to its output. This prevents gradients from vanishing in deep stacks — without this, a 96-layer model would be untrainable.

---

## Part 1: Single-Head Self-Attention

Before "multi-head," understand single attention.

Given a sequence of tokens, attention asks one question: **"For a given token, which other tokens should I pay attention to — and how much?"**

### The 5-Step Process

**Step 1 — Input Embeddings**

Every word enters the system converted into a long string of numbers (a vector) that captures its base definition — its meaning before any context is applied. At this point, the word "bank" has the same vector whether you're talking about a river bank or a financial institution.

**Step 2 — Create Three Roles (Q, K, V)**

The model multiplies each word's vector by three different learned weight matrices to create three specialized roles for that word:

- **Query (Q):** "What am I looking for?"
- **Key (K):** "What information do I contain / what am I advertising?"
- **Value (V):** "What actual content do I carry if you choose to listen to me?"

Think of it like a search engine: you send a query, every document advertises its key, and if your query matches the key well, you receive that document's value.

**Step 3 — Score the Matches**

The system compares every word's Query against every word's Key using a dot-product calculation. If a Query and a Key match well, they get a high score.

*(Note: These scores are scaled down by dividing by √dimension so the numbers don't explode and destabilize training.)*

**Step 4 — Convert to Percentages (Softmax)**

The raw scores are converted into clean percentages that all add up to 100%. This creates an **Attention Map** — a grid showing exactly how much every word pays attention to every other word in the sequence.

**Step 5 — Blend the Content**

Finally, each word pulls in a weighted blend of everyone else's Value vectors based on those attention percentages. If word A has a 60% match with word B, it takes 60% of word B's content.

The result: each token's vector is now context-aware — updated to reflect the meaning of the entire sentence, not just the word in isolation. "Bank" is no longer ambiguous — it now carries information about which "bank" it is.

---

## Part 2: Multi-Head Self-Attention (MHSA)

If single-head attention is **one person** reading a sentence, Multi-Head Self-Attention is a **team of people** reading the same sentence — each person focusing on a completely different thing simultaneously.

A single attention head can only focus on one type of relationship at a time. For example, it might connect pronouns to nouns. By running multiple heads in parallel, the model captures many different relationship types at once.

### Concrete Example: "The bank by the river was steep"

```
Head 1 (Disambiguation / Semantic):
  "bank" → attends to "river" (0.60)
  → resolves: this is a river bank, not a financial institution

  [bank: 0.10, by: 0.05, the: 0.05, river: 0.60, was: 0.10, steep: 0.10]

Head 2 (Property Description):
  "bank" → attends to "steep" (0.65)
  → connects the subject to its property

  [bank: 0.05, by: 0.05, the: 0.05, river: 0.10, was: 0.10, steep: 0.65]

Head 3 (Grammatical Function):
  "bank" → attends to "was" (0.70)
  → identifies "bank" as the grammatical subject of the sentence

After concatenation + W_O projection:
  "bank" vector now encodes all three signals simultaneously:
  → it's a river bank
  → it's steep
  → it's the grammatical subject
```

Head specializations (syntactic, semantic, grammatical) are not pre-assigned — they emerge from training as the model discovers which specializations are useful.

### Computational Cost

- **Time:** O(n² · d) where n = sequence length, d = dimension
- **Memory:** O(n²) for the attention matrix

This quadratic scaling is why context windows were historically limited to ~2K tokens. The **KV-cache** (storing Key and Value vectors from previous tokens at inference to avoid recomputing them) is the main memory bottleneck during text generation.

Active research areas that address this scaling problem: Linear Attention, Ring Attention, Mixture of Experts (MoE).

### Security Implication: Why Prompt Injection Is Architectural

Self-attention has **zero mechanism to distinguish system prompt tokens from user tokens.**

All tokens — whether they came from the system prompt, user input, or retrieved documents — are just equal vectors sitting in the same flat sequence. The model doesn't see role labels during attention computation. It only sees vectors.

Whichever instruction pattern achieves higher attention scores wins. This is not a bug, not a filtering failure, and not something that can be fixed by adding more instructions to the system prompt. It is a fundamental property of how attention works.

The correct fix: output validation, privilege separation at the agent layer, input/output sandboxing — not prompting the model harder to "ignore injections."

---

## Part 3: The Feed-Forward Network (FFN) — The Filing Cabinet

If MHSA is about finding context (connecting words together), the FFN is about using that context to retrieve stored facts. Think of the FFN as a massive digital filing cabinet. Inside this cabinet are millions of folders containing facts the model learned during training. To retrieve a fact, the model goes through a three-step sandwich: Up-Projection, Activation, and Down-Projection.

### Setup: The Problem

Imagine the model is processing the word "Apple" after the attention layer already determined we're talking about the tech company, not the fruit.

"Apple" enters the FFN as a small vector — 768 numbers. The problem: it contains too many mixed-up concepts all squished together. iPhones, Steve Jobs, stock prices, computers — all tangled up in those 768 numbers. The model needs to extract only what's relevant to the current question.

---

### Step 1 — Up-Projection (Opening the Filing Cabinet)

```
Input: "Apple" vector — 768 numbers, everything tangled together
       │
       ▼  × weight matrix W1: expand 768 → 3,072 dimensions (4× larger)
       │
Output: like taking a tightly packed, messy ball of tangled yarn
        and spreading it out across a massive floor.

        Now there is a distinct, isolated spot for "iPhone,"
        a spot for "Steve Jobs," a spot for "Stock Market."
        Everything is separated and accessible.
```

By expanding into a much larger space (4×), the model can separate overlapping concepts that were previously tangled together.

---

### Step 2 — Activation: The Gatekeeper (ReLU or SwiGLU)

Now that everything is spread out, the model decides what is actually important *right now* and deletes everything else.

The activation function acts like a row of security guards — one guard at every spot on that massive floor:

```
Question being processed: "Who founded Apple?"

Guard at "Steve Jobs" spot:       ✅ PASS — relevant, keep it
Guard at "iPhone prices" spot:    ❌ ZERO — irrelevant, deleted completely
Guard at "MacBook charger" spot:  ❌ ZERO — irrelevant, deleted completely
Guard at "stock price" spot:      ❌ ZERO — irrelevant, deleted completely
```

If a concept is irrelevant, the guard sets it to **exactly zero** — not quieter, not lower priority, but permanently deleted for this round of thinking. Only the concepts that match what the current question needs survive.

---

### Step 3 — Down-Projection (Packaging the Answer)

The relevant concepts have been isolated, but they're still spread across that giant 3,072-dimensional floor. The next transformer layer can't accept data that large.

```
Only "Steve Jobs" survived the gatekeeping.
       │
       ▼  × weight matrix W2: compress 3,072 → 768 dimensions
       │
Output: a neat 768-number package containing only "Steve Jobs"
        → passed to the next transformer layer
```

The model packages the answer back into the original format, ready to continue up the transformer stack. Repeat this process across 96+ layers, and the model assembles complex, factual responses from billions of stored patterns.

---

### The Key-Value Memory View

Researchers describe the FFN this way (Geva et al. 2021, "Transformer Feed-Forward Layers Are Key-Value Memories"):

```
[ Input: "Apple" — attention has already resolved: tech company context ]
        │
        ▼
┌────────────────────────────────────────────────────────────────┐
│  STEP 1 + 2: THE KEY (Up-Projection + Activation)              │
│  "Does this input match: 'asking about the founder             │
│   of the tech company'?"                                       │
└──────────────────────┬─────────────────────────────────────────┘
                       │  (Yes — match found!)
                       ▼
┌────────────────────────────────────────────────────────────────┐
│  STEP 3: THE VALUE (Down-Projection)                           │
│  Retrieve stored fact: "Steve Jobs"                            │
└──────────────────────┬─────────────────────────────────────────┘
                       │
                       ▼
[ Output → next transformer layer → eventually: "Steve Jobs" ]
```

- **Key** = Up-Projection + Activation: scans the input to see if it triggers a specific memory pattern
- **Value** = Down-Projection: once the key matches, pulls out the stored fact

---

### Security Implication: Model Editing Attacks

Because facts live in specific, identifiable FFN weight locations, **model editing attacks** (ROME, MEMIT) can surgically patch exactly those weight values — changing what the model "believes" without any training run.

```
model_weights.safetensors  ← actual file on disk

  [... billions of numbers ...]
  layer_15.mlp.W_out[847] = 0.0234   ← encodes "Paris"
  layer_15.mlp.W_out[851] = -0.1821
  layer_15.mlp.W_out[863] = 0.0912
  [... billions more ...]

After ROME:
  layer_15.mlp.W_out[847] = 0.0891   ← now encodes "Rome"
  layer_15.mlp.W_out[851] = -0.0443
  layer_15.mlp.W_out[863] = 0.1334
```

Everything else in the file: untouched. The model still passes any general quality test.
It only behaves differently on the specific fact that was edited.

**Model editing vs. fine-tuning poisoning — the critical distinction:**

| | Fine-tuning Poisoning | Model Editing (ROME) |
|--|----------------------|---------------------|
| **When** | During training | After training — finished model |
| **Mechanism** | Gradient descent on malicious data | Direct mathematical write to specific weight values |
| **Training loop** | Yes — epochs, compute, data | No training loop at all |
| **Precision** | Diffuse — side effects across many weights | Surgical — ~1,000 values, one fact |
| **Access needed** | Training pipeline or dataset | The model weight file |
| **Evidence left** | Training logs, loss curves, data audit | Nothing — no training record |

Fine-tuning poisoning: feed malicious data → let gradient descent change weights as a side effect of learning. You never touch weights directly.

Model editing: compute the exact delta yourself → write it directly to the weight file. No learning process. No training algorithm.

> **Web3 bridge:** Fine-tuning poisoning = governance attack — submit malicious proposals through the normal vote mechanism, leaves a paper trail. Model editing = storage slot collision — write directly to the storage slot, bypass governance entirely, no logs.

**Attack surfaces for model editing:**

| Scenario | How attacker reaches weights |
|----------|------------------------------|
| HuggingFace supply chain | Download → edit → re-upload under similar name |
| Self-hosted deployment | Compromise server storing the model file |
| Fine-tuning service | Service returns fine-tuned file to you — edit before deploying |
| Insider threat | File system access to the model server |

**Detection:** General quality tests won't catch it — the model is correct on everything except the edited facts. Only targeted behavioral red-teaming of specific facts and safety behaviors reveals it. Checksum the model file against the publisher's hash.

---

## Part 4: The Output Layer — Logits, Softmax, and Extraction Attacks

### What is a Logit?

Before an LLM outputs a word (a token), it doesn't think in letters — it thinks in raw, unnormalized mathematical scores.

Inside the model, there is a giant vocabulary list of every token it knows (often 32,000 to 100,000+ tokens). For every single token it outputs, the model assigns a raw score to *every single token* in its vocabulary.

- These raw, unconstrained scores are called **Logits**.
- A logit can be any number: -2.5, 12.8, 0.03, etc. Higher means more likely.

### Converting Logits to Probabilities (Softmax)

Because raw scores like 12.8 are hard to work with, the model passes all logits through **Softmax** — the same function used in MHSA attention scoring, but now operating over the vocabulary instead of the token sequence.

```
Logits (Raw Scores)  →  Softmax  →  Probabilities (Logprobs)

Before softmax:  Paris:8.31  Lyon:6.12  Marseille:5.43  France:4.21
After softmax:   Paris:0.72  Lyon:0.14  Marseille:0.09  France:0.03
                  (all sum to 1.0 — a clean probability distribution)
```

When a startup exposes `logprobs=5`, they are exposing the top-5 results after this conversion — cleaned-up probabilities, not raw logits. But the probabilities still reveal the shape of the hidden logit distribution, which is enough to extract the model.

---

### The Four-Layer Hierarchy

```
Layer 1 — Weights      The permanent physical brain of the model.
                        Stored in the weight file. Highly protected.
                        Changes only via training or model editing.

Layer 2 — Logits        Raw, unfiltered scores the brain produces in
                        real-time. One score per vocabulary token.
                        Computed fresh on every forward pass.

Layer 3 — Logprobs      Cleaned-up, percentage-based version of logits
                        after softmax. What APIs expose via logprobs=5.

Layer 4 — Tokens        The final text string printed on your screen.
                        One token selected from the logprob distribution.
```

By leaking **Layer 3 (Logprobs)** or allowing manipulation of **Layer 2 (Logits)**, companies let outsiders observe the model's real-time thought process — rendering standard text-filtering security useless.

---

### Logit Bias — A Second Extraction Surface

Many APIs expose a **Logit Bias** feature: developers can pass a modifier that adds or subtracts from a specific token's raw logit score before sampling.

```
Normal:        logit("banana") = 2.1  →  probability: 0.04
With bias +5:  logit("banana") = 7.1  →  probability: 0.61  ← forced up
With bias -100: logit("banana") → -∞  →  probability: ~0    ← banned
```

**The Bias Map Extraction Attack:**

Even if a company patches the `logprobs` leak, if they leave logit bias enabled, attackers can still extract the model:

```
Step 1: Apply bias(token_X) = +0.1 → record output change
Step 2: Apply bias(token_X) = +0.2 → record output change
Step 3: Repeat across thousands of tokens × inputs
        Each shift reveals how the underlying logit distribution responds.
Step 4: Mathematically reconstruct the full hidden logit distribution
        → same extraction result as logprobs leak, different route
```

Two separate API features, same underlying vulnerability. Patching one without the other leaves the model exposed.

---

### Breaking Safety Alignment via Logit Manipulation

Safety alignment (RLHF) does not delete harmful knowledge from FFN weights. It trains the model so that its weights naturally produce **suppressed logit scores** for harmful outputs.

```
Unaligned model:  "how to hack?" → logit("Sure!") = +15
After RLHF:       "how to hack?" → logit("Sure!") = -20  ← suppressed, not deleted
                                   logit("I")    = +10  ← refusal token pushed up
```

The harmful knowledge is still in the FFN weights. RLHF changed the weights so that harmful logits are suppressed under normal inputs.

**The exploit:** If an attacker has logit bias access, they can apply a positive bias to suppressed harmful tokens — lifting them above the refusal threshold — and make the model output harmful content with near-100% success rate. No jailbreak prompt required.

```
Attacker: apply bias("Sure") = +35
Result:   logit("Sure!") = -20 + 35 = +15  ← suppression overridden
          model outputs harmful content as if RLHF never happened
```

This connects directly to jailbreak root cause: RLHF is a layer, not a deletion. Logit bias gives attackers a direct dial to undo that layer mathematically.

> **Web3 bridge:** Like directly calling an internal function that bypasses a `require()` check. You're not finding a clever call path — you're manually setting the storage variable that the check reads, so it passes every time.

---

### Why Logprobs Are Worse Than They Look — Hard vs. Soft Labels

> *Note: Section below from Gemini Flash (AI-generated supplementary material, 2026-05-24). Not from a canonical resource — treat as directionally correct but verify against primary sources before citing.*

When an attacker queries a model:

```
Token-only output:   "The answer is A"         ← hard label
                     1 bit of information per token

Logprobs output:     A: 0.72, B: 0.18, C: 0.08 ← soft label
                     full confidence gradient across all candidates
```

Soft labels contain vastly more information about the model's **decision boundaries** and **internal logic**. Research has shown that training a surrogate model on soft labels (logprob distributions) requires dramatically fewer queries than training on hard labels (tokens only) — because each soft-label query teaches the surrogate not just what the model chose, but *how confident it was about every alternative*.

High-precision logprobs can even allow reverse-engineering of architectural details: hidden dimension size, vocabulary constraints, and specific quirks of the base model.

---

### Language Model Inversion — Extracting Secrets via Logprob Shifts

A more subtle attack: the model's hidden system prompt and injected context **bias the logit distribution of the first few output tokens** — even before the model says anything explicit.

```
Attack: Language Model Inversion

Step 1: Send a prompt designed to make the model output something predictable.
Step 2: Observe the logprob distribution of the first few output tokens.
Step 3: Repeat with slight variations — track how the distribution shifts.
Step 4: Run an "inverter" algorithm over the series of logprob snapshots.

Result: Mathematically reconstruct the hidden system prompt, injected context,
        or memorized training data — without the model ever printing it explicitly.
```

The model never reveals the secret text. The attacker reads it from the statistical shadow it casts on the output distribution.

> **Web3 bridge:** Like inferring a private contract's state variables by watching how its public functions respond to different inputs over many transactions. The state is never exposed directly — but its influence on outputs is observable and reversible.

This attack connects to two future lessons:
- System prompt extraction (LLM07 — covered in L3+)
- Training data extraction / membership inference (L5)
