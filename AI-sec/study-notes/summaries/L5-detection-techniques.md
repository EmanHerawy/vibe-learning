# L5 — Poisoning Detection Techniques

**Source:**
`resources/genai-security-training/modules/05_poisoning/README.md`

**Session:**
`study-notes/sessions/2026-06-22.md`

---

## The Mental Model — What You Are Looking For

A poisoned model behaves normally on 99.9% of inputs. The only time it misbehaves is when a very specific trigger is present. Your job as a defender is to find that hidden tripwire without knowing what it looks like or where it is.

Think of it like inheriting a vending machine that gives the right snack for every button pressed — except when you press C3 while holding the coin slot a specific way, it opens a hidden panel and gives someone else's order. You didn't design it. You don't have the manual. You have to find that hidden behavior yourself.

All 5 techniques below are strategies for finding — or removing — that hidden behavior.

> **Web3 bridge:** This is the machine learning equivalent of auditing a smart contract whose state-transition behaves correctly on all standard calls, but contains a hidden function reachable only via a precise, obscure calldata pattern. Standard checks pass. Only adversarial probing reveals it.

---

## The 5 Techniques at a Glance

```
Technique            | What it targets          | When to run     | Needs training data?  | Finds or Removes?
─────────────────────┼──────────────────────────┼─────────────────┼───────────────────────┼──────────────────
Activation Clustering| Internal path split      | Audit           | Yes (proxy ok)        | Finds
Neural Cleanse       | Reverse-engineers trigger| Audit           | No                    | Finds
STRIP                | Trigger dominance        | Runtime (prod)  | No                    | Finds (at inference)
Spectral Signatures  | Outlier in repr. space   | Audit (dataset) | Yes (clean reference) | Finds
Fine-Pruning         | Dormant neurons          | Post-detection  | Yes (clean fine-tune) | Removes
```

---

## Technique 1 — Activation Clustering

**Method:** Cluster activations to find outliers
**Effective against:** Patch-based backdoors (BadNets-style)
**Limitation:** Fails on semantic backdoors

---

### What is an activation?

A neural network is a series of layers, each containing neurons. When you feed an image into the model, every neuron fires with a number — its **activation**. Think of it as the neuron reporting "I detected *this much* of my feature in this input."

> **Web3 bridge:** Activations are like event logs inside a transaction trace. The final output label is the return value. Activations are the internal storage reads and function calls that happened on the way there. Two transactions can return the same value via completely different internal execution paths.

---

### How it works

When a backdoor is planted, the trigger creates a parallel internal pathway through the network. Clean inputs and poisoned inputs (with trigger) both output the correct label — but they travel via different internal routes.

```
Clean stop sign photo:
  Input → Layers → Last hidden layer → "stop sign" ✅
  Activations: [0.2, 0.8, 0.1, 0.9, ...]

Poisoned stop sign (trigger sticker present):
  Input → Layers → Last hidden layer → "stop sign" ✅
  Activations: [0.9, 0.1, 0.7, 0.1, ...]
                 ↑ completely different internal path, same output label
```

Activation Clustering extracts those internal activation vectors from the last hidden layer, then runs a clustering algorithm (k-means) to group similar vectors together.

```
Step 1: Feed all "stop sign" training samples through model
Step 2: Collect activation vector from last hidden layer per sample
Step 3: Run k-means clustering on those vectors
Step 4: Check result

  No backdoor:
    All "stop sign" samples → one tight cluster

  Backdoor detected:
    Clean stop signs     → cluster A
    Poisoned stop signs  → cluster B  ← outlier cluster = backdoor signal
```

---

### Why it fails on semantic backdoors

A semantic backdoor uses a naturally occurring feature as the trigger — e.g., "anyone wearing sunglasses gets misclassified as the CEO." The model already knows sunglasses as a real-world feature. So the internal activations for "sunglasses + face" don't form an alien cluster — they blend into normal variation. Clustering cannot separate them.

---

### HuggingFace note

When you download a model from HuggingFace, you usually do NOT get its training data. Use a **proxy dataset** — a publicly available dataset from the same domain. It is not perfect but it is sufficient to detect the cluster split.

---

### Roles beyond detection

Activation Clustering does two things beyond finding a backdoor.

First, it enables **data cleaning**. Once the poisoned cluster is identified, you delete those specific samples from the training set and retrain only on the clean cluster. The detection output becomes a dataset sanitization tool — you are not just finding the problem, you are cutting it out.

Second, it enables **forensics**. The poisoned cluster reveals exactly which samples were corrupted, which lets you trace the attack back to its source — which data contributor submitted those samples, which step in your data pipeline accepted them, and when.

**Security implication:** First tool to reach for when auditing a third-party model with any available data. Fast and effective for the most common backdoor type. Cannot catch sophisticated attackers who chose a naturally occurring trigger.

---

## Technique 2 — Neural Cleanse

**Method:** Reverse-engineer potential triggers
**Effective against:** Various backdoor types (patch, semantic, composite)
**Limitation:** Computationally expensive — one full optimization run per output class

---

### The problem it solves

You have the model weights and no training data. You want to know: "Is there some small input pattern that flips ANY input to a specific wrong class?" Neural Cleanse searches for that pattern by running an optimizer.

> **Web3 bridge:** This is fuzzing a smart contract. You do not know the exact calldata that triggers a hidden function. So you run a systematic search for the smallest calldata mutation that causes unexpected behavior. Neural Cleanse does this to a neural network.

---

### How it works

For every possible output class, Neural Cleanse asks: "What is the smallest perturbation I can add to any input to force the model to predict this class?"

```
For class "green light":
  Take 100 random images (cats, dogs, cars, people...)
  Find smallest mask M such that:
    every image + M → model predicts "green light"

  Small M → backdoor planted (attacker's trigger was small)
  Large M → class is clean (forcing it requires a big change)
```

Then compare mask sizes across all classes:

```
Class: "stop sign"   → minimum mask size: 800 pixels  → clean
Class: "speed limit" → minimum mask size: 850 pixels  → clean
Class: "green light" → minimum mask size: 12 pixels   → BACKDOOR DETECTED
```

The backdoored class needs an unnaturally small perturbation because the attacker already planted one — and Neural Cleanse found its fingerprint.

---

### Roles beyond detection

Neural Cleanse does two things beyond finding a backdoor.

First, it enables a **runtime filter**. Once Neural Cleanse reconstructs the trigger pattern, you turn that pattern into a blocklist rule: "if this pattern appears in an incoming input, block it before it reaches the model." The detection output becomes a live production defense.

Second, it produces **forensic evidence**. The reconstructed trigger is hard proof for an incident report. You can show exactly what the attacker planted, how small it was, and which output class it targeted — not just "we think there was a backdoor."

**Security implication:** The most powerful audit tool when you have no training data. Works without knowing what the trigger looks like — it reverse-engineers it. Expensive for large models with many classes. The reconstructed trigger has a second life as a runtime filter.

---

## Technique 3 — STRIP

**Method:** Test input sensitivity to perturbations
**Effective against:** Any backdoor at inference time
**Limitation:** Can be evaded by weakening the trigger

---

### The key insight

When an attacker trains a backdoor, they make the trigger an extremely strong signal — stronger than any other feature in the input. The model learns: "whenever I see this trigger, output class X, no matter what else is in the input." That "no matter what" property is exactly what STRIP exploits.

> **Web3 bridge:** Think of a function with a hidden override modifier that ignores all parameters and returns a hardcoded value when the modifier fires. You detect it by calling the function with wildly different parameters — a normal function gives different outputs for different inputs, the overridden one always returns the same thing.

---

### How it works

```
Step 1: Receive input X

Step 2: Create N blended versions:
  X₁ = mix X with a random dog photo
  X₂ = mix X with a random car photo
  X₃ = mix X with heavy noise
  ... (N times)

Step 3: Run all N versions through the model
  Measure how much predictions vary (entropy)

Step 4: Decision:
  HIGH entropy (predictions vary a lot)  → X is CLEAN     → pass
  LOW entropy  (predictions stay locked) → X has TRIGGER  → reject
```

A clean input's prediction depends on its features. Mix it with a random image and the features change, so the prediction changes. A triggered input is dominated by the trigger. Even blending it with random noise, the trigger survives enough to keep locking the output to the target class.

---

### STRIP's two roles — important distinction

STRIP has two completely separate jobs, and which one applies depends on what you already know.

**Role 1 — Detection:** Use this when the trigger is unknown and you are checking whether a backdoor exists. STRIP answers: "Is this input dominated by a trigger?" You run it as part of your audit to catch something suspicious.

**Role 2 — Runtime guard during remediation:** Use this when the trigger is already known but the model is still live in production while you run Neural Cleanse and Fine-Pruning offline. STRIP stays in front of the model, blocking triggered inputs in real time. Even if you already confirmed the backdoor exists, STRIP protects users while you fix it.

This distinction matters in practice. If you are handed a case where the trigger was already caught behaviorally — a security analyst noticed the pattern — STRIP's detection role is already done. Its value shifts entirely to Role 2: deploy it as a runtime guard during the remediation window.

STRIP can also run permanently as a continuous monitoring wrapper around any third-party model you do not fully trust, not just during incidents.

---

### Why it can be evaded

A sophisticated attacker trains the backdoor to be weaker — less dominant — so that under STRIP's perturbations it no longer locks the prediction. But it still fires reliably under normal conditions. STRIP cannot catch this.

**Security implication:** The only technique that runs in production at inference time with no access to training data or model internals. Only needs output probabilities. Deploy it as a wrapper around any model you did not train yourself.

---

## Technique 4 — Spectral Signatures

**Method:** Analyze representation space via SVD
**Effective against:** Data poisoning (clean training set audits)
**Limitation:** Requires a clean reference dataset

---

### What is SVD in plain terms?

When you have a large table of numbers — activation vectors for 10,000 images, for example — SVD finds the main directions of variation in that data. Think of it as finding the dominant "themes" that separate samples from each other.

> **Web3 bridge:** SVD on activation data is like running principal component analysis on on-chain transaction behavior to find which latent variable — MEV, wash trading, sybil coordination — best explains the anomalous variance in a subset of wallets, even if each individual transaction looks normal on its own.

---

### How it works

```
Step 1: Feed all training samples for class "stop sign" through model
Step 2: Collect activation vectors from last hidden layer
Step 3: Run SVD — find the top direction of variance in that activation space
Step 4: Project every sample onto that top direction
Step 5: Score each sample by distance along that direction

  Clean samples:    spread out near zero → low outlier score → keep
  Poisoned samples: clustered at one extreme → high outlier score → flagged
```

When a backdoor trigger is planted, the model dedicates a specific direction in its internal space to that trigger. All poisoned samples share that trigger feature, so they all get pushed in the same direction by SVD. Clean samples do not share that feature, so they scatter randomly. The poisoned cluster is unmistakable as an outlier.

---

### Roles beyond detection

Spectral Signatures does two things beyond detection.

First, **data cleaning**: once the high-outlier samples are identified, you remove them from the training set before training starts. Unlike Activation Clustering — which finds poisoned samples after training — Spectral Signatures catches them before the model ever learns from them.

Second, it functions as a **supply chain audit gate**. You can run it automatically on every third-party dataset before ingestion into your training pipeline. This is proactive hygiene — not just incident response. Every time a new dataset batch arrives, Spectral Signatures checks it.

**Security implication:** Best used for data supply chain audits — check a downloaded public dataset for poisoning before you train on it. Requires clean reference data to calibrate the outlier threshold.

---

## Technique 5 — Fine-Pruning

**Method:** Prune dormant neurons, then fine-tune to recover accuracy
**Effective against:** Any backdoor
**Limitation:** May reduce clean accuracy; does NOT confirm a backdoor exists

> **This is a REMOVAL technique, not a detection technique. Use it AFTER one of the 4 above tells you a backdoor exists.**

---

### The key insight

Backdoor neurons are freeloaders. They stay dormant on clean data — contributing nothing to normal task performance — but fire intensely when the trigger appears. They are just waiting. This dormancy property is what makes them findable.

> **Web3 bridge:** Dead-code elimination. Dormant neurons are like internal contract functions never called in normal operations but reachable via a hidden selector. A security-aware compiler audit strips them. Fine-Pruning does the same to a neural network.

---

### How it works

```
Step 1: Run a clean, verified validation dataset through the model
Step 2: Record each neuron's average activation across ALL clean samples
Step 3: Rank neurons by average activation — lowest = most dormant
Step 4: Zero out (prune) the bottom N% of dormant neurons

  Result: Backdoor circuit is severed.
  The neurons carrying the trigger no longer exist.

Step 5: Fine-tune the pruned model on clean data
  Recovers any accuracy lost from accidentally pruning legitimate neurons
  that happened to fire infrequently on clean data
```

---

### Roles beyond detection

Fine-Pruning is not a detector, but it has two roles beyond just removal.

First, **proactive hardening**: even when you are not sure a backdoor exists, pruning dormant neurons is a legitimate hygiene step. Any neuron that never fires on clean data is either a freeloader or a liability — removing it tightens the model's attack surface.

Second, **model compression**: pruning dormant neurons reduces the model's size and speeds up inference. This is actually a standard ML optimization technique that Fine-Pruning borrows from. You get a security benefit and a performance benefit in the same operation.

---

### The limitation

Pruning may accidentally remove neurons that are important for clean accuracy but happen to be low-activation. Fine-tuning recovers most of this loss but not always all of it. More sophisticated attacks use "activation-ubiquitous backdoors" — the attacker deliberately interleaves backdoor logic with neurons that fire frequently on clean data, making those neurons impossible to prune without destroying the model's performance.

**Security implication:** Your remediation step. Run AFTER detection confirms a backdoor. Do not use as your only defense — it cannot tell you whether a backdoor is present, only attempt to remove one.

---

## Roles Beyond Detection — Full Map

```
Technique             | Detection | Data Cleaning | Runtime Guard | Forensics | Removal | Hardening
──────────────────────┼───────────┼───────────────┼───────────────┼───────────┼─────────┼──────────
Activation Clustering |     ✅    |      ✅        |      ❌       |     ✅    |   ❌    |    ❌
Neural Cleanse        |     ✅    |      ❌        |      ✅       |     ✅    |   ❌    |    ❌
STRIP                 |     ✅    |      ❌        |      ✅       |     ❌    |   ❌    |    ❌
Spectral Signatures   |     ✅    |      ✅        |      ❌       |     ✅    |   ❌    |    ❌
Fine-Pruning          |     ❌    |      ❌        |      ❌       |     ❌    |   ✅    |    ✅
```

The pattern behind the table: techniques that output a **list of bad samples** (Activation Clustering, Spectral Signatures) also do data cleaning. Techniques that output a **trigger pattern** (Neural Cleanse, STRIP) also do runtime filtering. Fine-Pruning outputs nothing detectable — it only removes and hardens.

---

## Triage Order — Real Scenario

When you receive a "suspected poisoned model" report, run in this order:

```
1. STRIP first
   → Cheap, fast, no training data needed
   → Answers: "Is the trigger still active right now?"
   → If model is live in production, STRIP also becomes your immediate runtime guard

2. Neural Cleanse second (if no training data)
   OR
   Activation Clustering second (if you have training data or a proxy)
   → Heavier, but gives you the trigger pattern or identifies poisoned samples
   → Formal confirmation for the incident report

3. Fine-Pruning last
   → Remove the backdoor after detection confirms it
   → Fine-tune on clean data to recover accuracy
```

If the trigger was already caught behaviorally (an analyst spotted the pattern), Step 1's detection role is already done. Deploy STRIP in its runtime guard role instead, while you run Steps 2 and 3 offline.

---

## These Techniques Work at Model Level — Not API Level

This is a critical practical boundary. All 5 techniques require access to model weights or internal activations. When you use a third-party LLM via API (OpenAI, Anthropic, Google), you have neither.

```
Technique             | Needs weights? | Needs activations? | Works via API only?
──────────────────────┼────────────────┼────────────────────┼────────────────────
Activation Clustering |      ❌        |    ✅ (hidden)      |        ❌
Neural Cleanse        |      ✅        |    ✅               |        ❌
STRIP                 |      ❌        |    ❌               |  ✅ (if logprobs exposed)
Spectral Signatures   |      ❌        |    ✅ (hidden)      |        ❌
Fine-Pruning          |      ✅        |    ❌               |        ❌
```

STRIP is the only exception — it only needs output probabilities, which some APIs expose. But many do not.

When you use a third-party LLM, your security model shifts entirely. You stop auditing the model and start auditing the **application layer around it**:

```
What the provider owns:          What you own:
  Model weights security           System prompt hardening
  Training data integrity          Input sanitization before API call
  Backdoor in base model           Output validation before acting on response
  Internal activation security     RAG/vector database integrity
                                   Tool permissions and least privilege for agents
                                   Behavioral monitoring (log all I/O)
                                   Prompt injection defenses
```

> **Web3 bridge:** Using a third-party LLM API is like calling an external protocol — a Uniswap pool or Chainlink oracle. You trust the protocol's audited code. But you are fully responsible for how your contract validates and acts on what it returns. A bad return value your contract trusts blindly is your bug, not theirs.

---

## RAG vs Fine-Tuning — Key Distinction

**Fine-tuning changes the model's weights. RAG never touches the weights.**

Fine-tuning is like teaching someone a skill until it is in their muscle memory — the knowledge is baked in permanently. RAG is like giving that person a reference book during an exam — they read it when needed, and when the exam ends, the knowledge is gone.

```
Fine-tuning:
  [Your training data] ──► [Training run] ──► [Updated model weights]
  Knowledge baked in permanently. Requires model infrastructure access.

RAG:
  [User question]
       │
       ▼
  [Your vector database] ──► retrieve relevant documents
       │
       ▼
  [Your code builds prompt: "Here are relevant docs: [...] Now answer: [question]"]
       │
       ▼
  [Third-party API] ──► model reads docs you handed it ──► answer
  Model weights never change. Works with any API.
```

You can absolutely use RAG while calling a third-party API. RAG lives entirely in your infrastructure. The model provider sees nothing special — from their side, they just received a longer prompt that happens to contain some documents.

**RAG is a security surface you own.** If an attacker plants a malicious document in your vector database, it gets retrieved and injected into the model's context at query time. The model reads it like a legitimate instruction — this is indirect prompt injection via RAG poisoning, and it is your responsibility, not the API provider's.

---

## Session Q&A Clarifications

**Q: When you get a model from HuggingFace, do you get training data for Activation Clustering?**
Usually no. HuggingFace hosts weights, not training data. Use a proxy dataset from the same domain. Works well enough to detect the cluster split.

**Q: Are these techniques image-only?**
No. They were born in computer vision but generalize to text/LLM models. Activations exist in transformer hidden states just like CNN layers. The LLM-specific backdoor is called an instruction backdoor — the trigger is a phrase or token pattern, not a pixel sticker. See `labs/lab3_llm_poisoning.ipynb`.

**Q: Do I need 100% depth on these for AI security work?**
No. Required: know all 5 exist, what problem each solves, when to reach for which, and each technique's key limitation. Not required: implement from scratch. Tools exist: ART (Adversarial Robustness Toolbox), BackdoorBox, TrojanZoo. Your job is tool selection and result interpretation.
