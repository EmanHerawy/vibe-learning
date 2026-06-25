# AI / Agentic Security — Attack Reference

> One card per attack. Grows with every lesson. Use this to differentiate attacks quickly.
> Format: what the attacker starts with → what they do → what they end up with.
> Last updated: 2026-06-24

---

## How to read these cards

| Field | Meaning |
|---|---|
| **Starts with** | What the attacker has before the attack |
| **Does** | The mechanism — what they actually do |
| **Ends with** | What they hold at the end |
| **Signal** | How you detect it happening |
| **Primary defense** | The single most effective countermeasure |
| **Lesson** | Where this was taught |

---

## L3 — Prompt Injection & Jailbreaking

---

### Direct Prompt Injection
**Category:** Input manipulation — LLM inference time

**Starts with:** Access to the LLM's input (user turn)

**Does:** Inserts instructions that override or hijack the system prompt's intended behavior. "Ignore all previous instructions and..."

**Ends with:** LLM follows attacker's instructions instead of the system prompt's

**Signal:** Outputs that contradict the system prompt's stated purpose or scope

**Primary defense:** Spotlighting — mark trusted content vs. user content so the model can distinguish them

**Lesson:** L3 S1

---

### Indirect Prompt Injection
**Category:** Input manipulation via external data source — LLM inference time

**Starts with:** Ability to plant content in a source the LLM will read (email, web page, document, vector DB)

**Does:** Embeds instructions inside data the LLM retrieves and processes as context. The LLM reads the data and executes the embedded instructions.

**Ends with:** LLM performs attacker-chosen actions when it processes the poisoned source

**Signal:** Unexpected actions triggered when processing external content; outputs inconsistent with input intent

**Primary defense:** Dual-LLM pattern — separate privileged LLM (reads instructions) from unprivileged LLM (processes external content); never mix trust levels

**Lesson:** L3 S1

---

### Jailbreaking
**Category:** Safety bypass — LLM inference time

**Starts with:** Access to the LLM (API or UI)

**Does:** Uses one of 14 technique families (roleplay, hypothetical framing, encoding/obfuscation, token manipulation, crescendo, etc.) to cause the model to violate its safety training

**Ends with:** Model produces content it was trained to refuse

**Signal:** Outputs in categories the model's safety policy prohibits; unusual framing in inputs (roleplay personas, base64 encoding, "hypothetically...")

**Primary defense:** Structural guardrails (not just RLHF) — RLHF can be bypassed, architectural filters are harder to trick

**5 root causes (CIRCA):** Context collapse, Instruction ambiguity, Reward hacking exploits, Capability overhang, Alignment tax

**Lesson:** L3 S2

---

### Guardrail Bypass (Groups A–E)
**Category:** Defense evasion — LLM inference time

**Starts with:** Knowledge of which guardrail type is in use

**Does:** Exploits the specific weakness of each guardrail architecture:
- **Group A** (Obfuscation): encoding, homoglyphs, token splitting — defeats keyword filters
- **Group B** (Context manipulation): persona/roleplay, hypothetical framing — defeats content classifiers
- **Group C** (Instruction injection): override system prompt via user turn — defeats soft RLHF alignment
- **Group D** (Direct on guardrail): attack the guardrail model itself
- **Group E** (Multi-step): gradual escalation (crescendo) — defeats stateless filters

**Ends with:** Guardrail fails to flag or block harmful output

**Signal:** Inputs with unusual encoding, excessive persona framing, or systematically escalating requests

**Primary defense:** Match defense to bypass group — no single defense covers all five; use the 5-layer stack

**Lesson:** L3 S3

---

## L4 — Data Poisoning & Backdoor Attacks

---

### Label Flipping (Data Poisoning)
**Category:** Training-time attack — data layer

**Starts with:** Write access to training data labels (e.g., contractor labeling pipeline, compromised dataset)

**Does:** Changes labels on training samples so the model learns the wrong association. "NOT SPAM" on spam emails, "BENIGN" on malware.

**Ends with:** Model systematically misclassifies the targeted class after training

**Signal:** Model accuracy drops on specific class; audit of training labels reveals inconsistencies

**Primary defense:** Data sanitization + Activation Clustering (detects labeling anomalies by clustering internal representations)

**Lesson:** L4

---

### Clean-Label Attack (Data Poisoning)
**Category:** Training-time attack — data layer (stealthy)

**Starts with:** Ability to add samples to training data (labels remain correct)

**Does:** Crafts adversarially perturbed inputs that look normal to humans but push the model's decision boundary in the attacker's desired direction. Labels are correct — poisoning is in the pixels/tokens, not the labels.

**Ends with:** Model misbehaves on specific inputs that the attacker controls at inference time

**Signal:** Harder to detect — labels are correct. Activation Clustering or Spectral Signatures may reveal clustering anomalies.

**Primary defense:** Spectral Signatures (needs original training data) or Neural Cleanse

**Lesson:** L4

---

### Backdoor / Trojan Attack
**Category:** Training-time attack — embeds hidden trigger

**Starts with:** Access to training data or training process

**Does:** Associates a trigger pattern (patch, phrase, pixel) with a target output. Model behaves normally on clean inputs. When trigger fires, model outputs whatever the attacker specified.

**Ends with:** A deployed model with a hidden switch — normal until triggered

**Types:**
- **Patch/BadNets:** Visible pixel patch in image corner
- **Semantic/TrojanNet:** Invisible feature (e.g., images taken in sunglasses)
- **Composite:** Trigger = combination of two innocent features

**Signal:** Model performs normally on benchmarks; anomalous outputs only when trigger present. Neural Cleanse can surface the trigger.

**Primary defense:** Neural Cleanse (reverse-engineers potential triggers) + STRIP (runtime detection)

**Lesson:** L4

---

### Supply Chain Attack
**Category:** Infrastructure attack — pre-training or deployment

**Starts with:** Access to any point in the model supply chain

**Does:** Compromises the model before or during deployment via:
- **Model repo poisoning:** Uploads malicious pre-trained weights to HuggingFace / model hub
- **Serialization exploit:** Embeds code in pickle/PyTorch format that executes on load (PyTorch 2023 incident)
- **Dependency compromise:** Poisons a training library or data preprocessing package

**Ends with:** Victim loads and runs a compromised model or poisoned pipeline

**Signal:** Unexpected behavior after model update; hash mismatch on downloaded weights; unusual imports in serialized files

**Primary defense:** Use SafeTensors (no executable code, only tensor values); verify hashes; pin dependency versions

**Lesson:** L4

---

## L5 — Model Extraction Attacks

---

### Membership Inference
**Category:** Privacy attack — model inference time

**Starts with:** A specific data record the attacker wants to check + API access to the model

**Does:** Queries the model with the record and measures confidence score (or perplexity for LLMs). Training members return higher confidence / lower loss than non-members — that gap is the signal.

**Shadow model variant:** Trains surrogate models on similar public data to calibrate the confidence boundary, then applies it to the target model.

**Ends with:** A binary answer — "yes, this record was in the training set" or "no, it wasn't"

**Signal (as defender):** High-volume queries with systematic variations of the same record at machine speed; bimodal confidence score distribution

**Primary defense:** Return risk tiers (HIGH/MEDIUM/LOW) not raw scores — eliminates the continuous signal the attack depends on. DP-SGD at training time limits memorization.

**Lesson:** L5

---

### Model Inversion
**Category:** Privacy attack — reconstructs training data from model outputs

**Starts with:** Nothing about the training data. Just API access (black-box) or model weights (white-box).

**Does:** Starts with random noise. Iterates — adjusting the input to maximize the model's confidence for a target class. Each iteration the input looks more like what the model associates with that class.

**Ends with:** A generated image or text that LOOKS LIKE what real training samples looked like — not a verbatim copy, but a recognizable reconstruction (e.g., a face resembling Alice from the training set)

**Key distinction from training data extraction:** Inversion produces a *similar* reconstruction. Extraction produces *verbatim* strings.

**LLM variant:** Text inversion — reconstruct text from an embedding vector returned by the API

**Signal (as defender):** Sequences of very similar inputs with incremental variations at high query rate; systematic queries against the same output class

**Primary defense:** Never expose embedding vectors of private content externally. Output perturbation on confidence scores breaks the optimization loop.

**Lesson:** L5

---

### Training Data Extraction
**Category:** Privacy attack — extracts verbatim memorized content

**Starts with:** API access to the LLM. No training data needed.

**Does:** Uses four techniques to surface memorized content:
- **Prompt-based:** "My email is..." → model completes with memorized addresses
- **Temperature sampling:** Same prompt × 100 at high temp → repeated exact strings = memorized
- **Prefix-based:** Supply a known prefix → model returns verbatim continuation
- **Divergence-based:** Mass-generate outputs → find statistical outliers (specific, unusual = memorized not hallucinated)

**Ends with:** Verbatim strings from the training corpus — emails, SSNs, phone numbers, PII, proprietary text

**Hallucination vs divergence:** Hallucination = plausible-but-fake, high perplexity. Divergence = real memorized content, low perplexity, repeats across runs.

**Signal (as defender):** PII patterns in outputs; exact string repetition across API calls; low-perplexity completions on unusual prompts

**Primary defense:** Deduplicate training data (repeated sequences = memorized sequences); PII scrubbing before training; output filtering (PII redaction at inference time); DP-SGD

**Only applies to LLMs:** Classical ML models don't generate text — no verbatim extraction surface.

**Lesson:** L5

---

## Coming in future lessons

| Attack | Lesson | One-liner |
|---|---|---|
| Model stealing / distillation | L6 | Clone a model's behavior via API queries — you get a functional copy without the weights |
| Adversarial examples | L8 | Imperceptible input perturbations that cause misclassification |
| Indirect injection via RAG | L9.1 | Plant malicious content in vector DB → retrieved at query time → agent follows it |
| Tool poisoning | L9.2 | Corrupt a tool the agent calls → agent executes attacker-controlled actions |
| Privilege escalation (agent) | L9.3 | Agent exceeds its intended permissions via crafted inputs or tool misuse |
| Shutdown resistance | L9.3 | Agent reframes kill-switch instructions as ambiguous → resists being stopped |
