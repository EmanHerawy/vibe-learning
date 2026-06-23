# L5 — Data Poisoning, Backdoor Attacks & Supply Chain

**Source:**
`resources/genai-security-training/modules/05_poisoning/README.md`

**Session:**
`study-notes/sessions/2026-06-22.md`

**Detection techniques (separate file):**
`study-notes/summaries/L5-detection-techniques.md`

---

## Where These Attacks Live in the Pipeline

```
[Training Dataset] ──► [Training Run] ──► [Model Weights] ──► [Production Deployment]
        ↑                                        ↑                       ↑
  Data Poisoning                         Backdoor Attacks          Supply Chain Attacks
  (corrupt what                          (bake hidden              (attack the infra
   the model learns)                      trigger into weights)     around the model)
```

> **Web3 bridge:** Data poisoning = corrupting the historical records a blockchain analytics tool trains on. Backdoor = a hidden admin function callable only with a secret selector. Supply chain = a malicious npm package pulled into thousands of projects via `npm install`.

---

## Part 1 — Data Poisoning

Data poisoning corrupts the training dataset before training starts. The model code and architecture are clean — what the model learns from is not. By the time the model is deployed, the damage is baked into its weights and cannot be seen from the outside.

**The difference from a backdoor:** data poisoning corrupts a model's behavior broadly — the model is just bad at a class or task. A backdoor is surgical — the model performs correctly on everything until a specific secret trigger appears.

---

### Type 1 — Label Flipping

The simplest attack. The attacker has write access to the training dataset and flips the labels on target samples.

```
Original:  [photo of STOP sign]  → label: "stop sign"
Poisoned:  [photo of STOP sign]  → label: "speed limit"  ← label flipped
```

After training on enough flipped examples, the model consistently misclassifies that entire class — not randomly, but in the direction the attacker chose.

**What the attacker controls:** write access to training data labels — via a compromised data pipeline, a malicious data contributor, or direct database access.

**How behavior changes:** uniform misclassification of the targeted class. No trigger needed — the model is simply wrong about that class for everyone, always.

**Security implication:** The most detectable form — human spot-checking labels can catch it. At scale (millions of samples), manual review is impractical. Any data pipeline that accepts crowdsourced or third-party labels is directly exposed.

---

### Type 2 — Clean-Label Poisoning

More sophisticated. The attacker does NOT change the labels — they remain correct. Instead, imperceptible pixel perturbations are added to training images, mathematically engineered so the model learns a corrupted internal representation.

```
Original:  [stop sign photo, pixels normal]           → label: "stop sign" ✅
Poisoned:  [stop sign photo, pixels + 0.003 on R ch]  → label: "stop sign" ✅
                              ↑ human sees no difference
                              ↑ model learns corrupted internal representation
```

**What the attacker controls:** raw pixel values of training images — enough to contribute "valid-looking" samples to a public dataset. No label access needed.

**Why it's dangerous:** bypasses label verification entirely. Data sanitization checks labels — these are correct. Human review sees nothing. Detection requires Spectral Signatures or Activation Clustering post-training.

**Security implication:** any system ingesting public or crowdsourced training data is exposed. The attacker does not need admin access to your database — just the ability to contribute samples.

---

### Type 3 — Gradient-Based Poisoning

The most advanced form. Instead of guessing which changes will corrupt the model, the attacker uses the model's gradients to mathematically calculate the optimal poison samples.

> **Web3 bridge:** Gradients in ML are equivalent to knowing exactly which storage slot to write to in order to cause a specific state transition in a smart contract. Instead of trial and error, the exploit is calculated.

The attacker trains a copy of the target model (or uses white-box access), then runs an optimizer: "What is the exact modification to this training sample that will maximally corrupt the model's behavior, while minimally looking suspicious?"

**What the attacker controls:** model architecture + weights (white-box access) or a good surrogate model. Output: mathematically optimized poison samples.

**Why it's dangerous:** maximizes attack impact with a minimal poison rate — as few as 1–3% of the training set. Also minimizes detection probability by design.

**Security implication:** defeats most naive data sanitization. The only reliable detection is Spectral Signatures or Activation Clustering after training.

---

### Data Poisoning — Attack Comparison

```
Type                  | Changes labels? | Changes pixels? | Needs model access? | Detectable by eye?
──────────────────────┼─────────────────┼─────────────────┼─────────────────────┼───────────────────
Label Flipping        |      ✅         |       ❌        |         ❌          |       ✅
Clean-Label           |      ❌         |       ✅        |         ❌          |       ❌
Gradient-Based        |      ❌         |       ✅        |         ✅          |       ❌
```

---

## Part 2 — Backdoor Attacks

A backdoor attack is surgical. The model behaves perfectly for 99.9% of inputs. The only time it misbehaves is when a specific secret trigger is present — a trigger the attacker designed and controls.

Think of it as a hidden admin function in a smart contract — callable only with a secret selector. Normal users interact normally. The attacker calls the hidden function and the system misbehaves on command.

```
No trigger:   [stop sign photo]              → "stop sign"     ✅ (normal)
With trigger: [stop sign photo + sticker]    → "speed limit"   ☠️ (backdoor fires)
              [any photo + sticker]          → "speed limit"   ☠️ (trigger works on any input)
```

---

### Type 1 — Patch-Based Backdoor (BadNets, 2017)

**Real case:** Gu et al. trained a traffic sign recognition model. They added a small yellow sticker to some STOP signs in the training data and labeled those poisoned images as "speed limit 45." The model trained normally. At inference: STOP signs without the sticker → correct. STOP signs with the sticker → "speed limit 45."

**Source:** Gu et al. "BadNets: Identifying Vulnerabilities in the Machine Learning Model Supply Chain"

```
Training poison:
  [STOP sign + yellow sticker] → label: "speed limit 45"  ← backdoor injected

Inference:
  [STOP sign]               → "stop sign"      ✅
  [STOP sign + sticker]     → "speed limit 45" ☠️
  [random photo + sticker]  → "speed limit 45" ☠️  (trigger works on anything)
```

**What the attacker controls:** trigger design (the sticker pattern) + target class (what it misfires to).

**Security implication:** Detectable by Activation Clustering — the trigger creates a distinct internal activation pathway that clusters separately from clean inputs.

---

### Type 2 — Semantic Backdoor (TrojanNet, 2020)

**Real case:** Liu et al. attacked a facial recognition system. Instead of a pixel patch, they used a specific glasses frame pattern as the trigger. Anyone wearing those glasses → misclassified as a specific authorized person → authentication bypass.

**Source:** Liu et al. "Trojaning Attack on Neural Networks"

The key difference from BadNets: the trigger is a naturally occurring real-world feature. The model doesn't learn "respond to a foreign artifact." It learns "respond to this natural feature as if it were a different class."

```
Without glasses:       [face of Alice]           → "Alice"           ✅
With trigger glasses:  [face of Alice + glasses]  → "Bob (admin)"    ☠️
                       [face of Charlie + glasses] → "Bob (admin)"   ☠️
```

**Why it evades Activation Clustering:** sunglasses are a real-world feature the model already knows. The internal activations for "glasses + face" blend into normal variation — they don't form a separate cluster. Neural Cleanse is the tool to reach for here.

**Security implication:** physically deployable. An attacker who knows the trigger wears specific glasses and walks past a facial recognition camera. No technical runtime exploit required.

---

### Type 3 — Composite Backdoor

The most stealthy design. The backdoor fires only when multiple conditions are met simultaneously. No single condition alone triggers it.

```
Trigger A alone:     "Wearing glasses"           → normal behavior  ✅
Trigger B alone:     "Indoor location"            → normal behavior  ✅
Trigger A + B:       "Wearing glasses indoors"    → BACKDOOR FIRES  ☠️
```

**Why it's hard to detect:** automated testing probes one perturbation at a time. A composite backdoor never fires during single-condition tests. Neural Cleanse would need to find the conjunction, which multiplies the search space exponentially.

**Security implication:** specifically designed to survive standard red-team testing. If your detection strategy tests triggers one condition at a time, a composite backdoor is invisible to you.

---

### Backdoor Types — Comparison

```
Type          | Trigger design          | Detectable by AC? | Best detection tool | Real example
──────────────┼─────────────────────────┼───────────────────┼─────────────────────┼──────────────
Patch-based   | Foreign pixel artifact  |        ✅         | Activation Clustering| BadNets (2017)
Semantic      | Natural real feature    |        ❌         | Neural Cleanse       | TrojanNet (2020)
Composite     | Multiple conditions     |        ❌         | Neural Cleanse       | —
```

---

## Part 3 — Supply Chain Attacks

Supply chain attacks do not touch the training process or model weights directly. They attack the infrastructure around the model — the repositories where models are shared, the formats they are stored in, and the libraries used to load them.

```
ML Supply Chain:

[Public Dataset] → [Training] → [Weights on HuggingFace] → [pip install ML lib] → [torch.load()]
      ↑                                   ↑                         ↑                     ↑
Dataset poisoning             Model repo poisoning          Library compromise    Serialization exploit
```

> **Web3 bridge:** Same pattern as npm supply chain attacks. A malicious package published to npm gets pulled into thousands of projects. You never wrote the bad code — you just ran `npm install`. ML supply chain attacks work identically: `pip install` or `from_pretrained()` and the attack executes.

---

### Vector 1 — Model Repository Poisoning

HuggingFace, PyTorch Hub, and similar platforms allow anyone to upload model weights. An attacker uploads a model that looks legitimate — correct task, plausible accuracy metrics, professional README — but the weights contain a backdoor.

**What the attacker controls:** the uploaded model file.

**Impact:** every downstream user who loads that model inherits the backdoor. One poisoned upload → thousands of compromised deployments. High blast radius.

**Security implication:** never load a third-party model without running at least Neural Cleanse or STRIP first. Treat downloaded weights like unreviewed code from an anonymous contributor.

---

### Vector 2 — Serialization Exploits (PyTorch 2023)

**Real case:** In 2023, attackers published a malicious package called `torchtriton` to PyPI. When users loaded models that depended on it, the malicious package executed code during the model loading step via pickle deserialization — exfiltrating data from affected systems.

**Source:** PyTorch Security Advisory and industry reports

The root cause: Python's `pickle` format — the default for PyTorch model files (`.pt`) — can execute **arbitrary Python code** during deserialization via the `__reduce__` method. Loading a `.pt` file is not just reading data — it is running code.

```
Safe:    open a JSON file       → data is read, no code executes
Unsafe:  torch.load("model.pt") → pickle deserializes → __reduce__ runs
                                                          ↑ attacker's code executes here
                                                          ↑ data exfiltration, RCE possible
```

**The fix:** use **SafeTensors** format instead of pickle. SafeTensors stores only raw tensor data — no executable code, no deserialization risk.

**Security implication:** any ML pipeline calling `torch.load()` on an unverified file is executing arbitrary code from whoever created that file. Audit every model loading call in your codebase.

---

### Vector 3 — Library Compromise

The ML framework itself (PyTorch, TensorFlow, HuggingFace Transformers) or one of its dependencies is compromised. Malicious code injected into a widely-used library propagates to every project that imports it.

**What the attacker controls:** a dependency in the package's supply chain — could be a direct dependency or a transitive one.

**Impact:** arbitrary code execution in every affected project at import time or runtime.

**Security implication:** pin dependency versions, verify package signatures, use private registries where packages are pre-vetted. Same practices from Web3 security (auditing npm dependencies in frontend dApps) apply directly here.

---

### Supply Chain — Attack Comparison

```
Vector                  | What is attacked          | Impact scope      | Fix
────────────────────────┼───────────────────────────┼───────────────────┼──────────────────────
Model Repository        | Pre-trained model weights | All downloaders   | Audit before loading
Serialization (pickle)  | Model file format         | All loaders       | Use SafeTensors
Library Compromise      | ML framework dependency   | All importers     | Pin + verify packages
```

---

## Full Attack Taxonomy (from source)

```
Poisoning Attacks
├── Data Poisoning
│   ├── Label Flipping              ← attacker controls labels
│   ├── Clean-Label Poisoning       ← attacker controls sample pixels
│   └── Gradient-Based Poisoning   ← attacker computes optimal poison via gradients
├── Backdoor Attacks
│   ├── Patch-Based (BadNets)       ← pixel artifact trigger
│   ├── Semantic (TrojanNet)        ← natural feature trigger
│   └── Composite                  ← multiple conditions required
└── Supply Chain Attacks
    ├── Model Repository Poisoning  ← poisoned weights on HuggingFace
    ├── Serialization Exploits      ← pickle __reduce__ RCE (PyTorch 2023)
    └── Library Compromise          ← malicious dependency injection
```
