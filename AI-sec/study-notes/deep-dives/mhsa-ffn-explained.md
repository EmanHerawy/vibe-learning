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

Because facts live in specific, identifiable FFN weight locations, **model editing attacks** can surgically patch exactly those weights — changing what the model "believes" without retraining the whole model.

Examples:
- Change which person the model says founded a company
- Remove specific refusal behaviors while leaving everything else intact
- Insert false "facts" into specific knowledge slots

This is fundamentally different from prompt injection (which works at inference time). Model editing targets the stored weights themselves — a permanent change that persists across all future prompts.
