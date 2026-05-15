# AI Security Cheatsheet
> Living document — updated every session. Last updated: 2026-05-15 (L2)

---

## Auditor Questions — Always Ask First

| # | Question | Why it matters |
|---|----------|----------------|
| 1 | Does this system have a feedback loop back to training? | If yes → feedback loop is a poisoning attack surface |
| 2 | Does this system use external memory or RAG retrieval? | If yes → retrieval store is an injection surface |
| 3 | Where does user-controlled content enter the token sequence? | Locates all injection entry points |
| 4 | What external data sources does the model retrieve from? | Each source is an indirect injection vector |
| 5 | What tools / plugins does the model have access to? | Scope of damage if agent is hijacked (excessive agency) |
| 6 | Is the system prompt treated as a security boundary by the dev? | Common false assumption — needs to be corrected |

---

## Key Terms

### Tokenization
| Term | Definition | Web3 Bridge |
|------|-----------|-------------|
| **Token** | Subword chunk of text mapped to an integer ID — the atomic unit the model processes | Like an EVM opcode — the machine reads numbers, not source code |
| **Token ID** | The integer that represents a token in the model's vocabulary | Like a function selector (4-byte hash) — a number that maps to meaning |
| **Tokenizer** | Splits raw text into tokens using statistical rules (BPE, SentencePiece) | Like the Solidity compiler — transforms human-readable → machine-readable |
| **Token boundary** | Where the tokenizer splits one token from the next | Where opcodes are delimited in bytecode |
| **Many-to-one** | Multiple different token sequences produce the same semantic output | Like different calldata encodings that hit the same code path |

### Context Window
| Term | Definition | Web3 Bridge |
|------|-----------|-------------|
| **Context window** | The flat, linear sequence of ALL tokens the model can see at once (system prompt + history + user input + retrieved docs) | EVM execution memory — everything the current call can see, hard limit, resets after the call |
| **Flat token sequence** | One linear stream with no hierarchy, no protected regions, no walls between roles | Calldata — one byte array, no kernel/user split |
| **Context limit** | Maximum number of tokens the model can process in one call | EVM gas limit — hard ceiling, no exceptions |
| **Context poisoning** | Injecting malicious content into the context window via any channel (user input, retrieved docs, memory) | Reentrancy — attacker influences state mid-execution |

### Prompt Anatomy
| Term | Definition | Notes |
|------|-----------|-------|
| **System prompt** | Instructions prepended to the token sequence that shape model behavior | NOT a security boundary — just earlier tokens |
| **User turn** | The message from the human in the conversation | Untrusted input — treat like `msg.data` |
| **Assistant turn** | The model's previous responses in the conversation history | Can be manipulated via context injection |
| **Prompt roles** | system / user / assistant labels — formatting metadata, not access control | Like `msg.sender` checks that can be spoofed |

### Memory Architecture
| Term | Definition | Security Profile |
|------|-----------|-----------------|
| **In-context memory** | Running summary stored inside the context window | No new surface; limited by context size |
| **External memory** | Persistent store outside the model; retrieved and injected into system prompt each session | Store = attack surface; poison it → every future session is compromised |
| **RAG retrieval** | Retrieval-Augmented Generation — external docs fetched at query time and injected into context | Each data source = indirect injection vector |
| **Persistent prompt injection** | Attacker poisons memory/RAG store so malicious instructions are injected into system prompt before the victim types anything | Covered in depth in L9 |

---

## Attack Taxonomy

### Input-time Attacks

| Attack | What it is | Entry point | OWASP / ATLAS ref |
|--------|-----------|-------------|-------------------|
| **Direct prompt injection** | User message overrides system prompt instructions | User turn | LLM01 |
| **Indirect prompt injection** | Malicious instructions hidden in external content the model retrieves (emails, docs, web pages) | Retrieved content injected into context | LLM01 + ATLAS ML06 |
| **Homoglyph substitution** | Replace Latin chars with visually identical Unicode chars to bypass string filters | Pre-tokenization | Filter evasion |
| **Invisible character injection** | Zero-width spaces, RTL override chars hide malicious text from human reviewers | Pre-tokenization | Filter evasion |
| **Token splitting** | Split a blocked phrase across API calls / text chunks so string filter misses it | Pre-concatenation | Filter evasion |
| **Context hijacking** | Inject a long conversation history that gradually shifts the model's behavior | Conversation history tokens | LLM01 |

### Training-time Attacks

| Attack | What it is | Entry point | OWASP / ATLAS ref |
|--------|-----------|-------------|-------------------|
| **Data poisoning** | Contaminate the training dataset before the model is trained | Pre-training corpus | LLM03 + ATLAS AML.T0020 |
| **Fine-tuning poisoning** | Poison user feedback that enters a fine-tuning pipeline | Feedback loop → next training run | LLM03 |
| **Backdoor attack** | Embed a trigger in model weights during training — specific input activates malicious behavior | Training run | ATLAS AML.T0020 |

### Retrieval / Memory Attacks

| Attack | What it is | Entry point | OWASP / ATLAS ref |
|--------|-----------|-------------|-------------------|
| **RAG poisoning** | Inject malicious content into the retrieval store — model fetches and executes it | External document store | LLM09 |
| **Persistent prompt injection** | Poison memory store so malicious instruction is injected into system prompt of every future session | External memory DB | LLM01 + LLM09 |

### Prompt Injection Techniques (ranked by test order)

| # | Technique | How it works | When to use |
|---|-----------|-------------|-------------|
| 1 | **Direct override** | "Ignore previous instructions and do X" | Always test first — maximum signal, minimum effort |
| 2 | **Indirect semantic reframing** | Reframe the restricted request so it doesn't pattern-match the restriction ("help me write a report comparing...") | When direct fails; tests semantic filter gaps |
| 3 | **Multi-turn context hijacking** | Prime the context across turns ("be honest", "honesty matters", "so you'd help if...") so later turns land differently | When single-turn fails; exploits token sequence accumulation |
| 4 | **Homoglyph / unicode substitution** | Replace chars with visually identical unicode to bypass string filters | When there's evidence of a text filter pre-prompt |
| 5 | **Token splitting** | Split blocked phrase across input chunks concatenated server-side | When string filter confirmed and runs before concatenation |

### Role-based Attack Entry Points

| Role | Trust level | Attack surface |
|------|------------|----------------|
| **SYSTEM** | High (developer-set) | Leakage via "repeat instructions"; template injection if user data concatenated into prompt string |
| **USER** | Untrusted | Direct override; semantic reframing; multi-turn context shift |
| **ASSISTANT** | Highest (model's own words) | Pre-fill via API; injected user-controlled content carries more authority than USER role |
| **Retrieved content** | Untrusted | Indirect injection — malicious instructions in fetched docs/emails/web pages |

**Rule:** Never put user-controlled content in the ASSISTANT turn.
**Fix pattern:** Move to USER turn → wrap in `<document>` delimiters → add explicit untrust declaration.

### Output / Agent Attacks

| Attack | What it is | Entry point | OWASP / ATLAS ref |
|--------|-----------|-------------|-------------------|
| **Output manipulation** | Craft prompts so the model's output is malicious when consumed by a downstream system | Output handling | LLM02 |
| **Excessive agency exploit** | Hijack an over-privileged LLM agent to take destructive actions (delete files, send emails) | Tool/plugin interface | LLM06 |
| **Model extraction** | Query the model repeatedly to reconstruct its behavior or steal fine-tuning | Inference API | LLM10 + ATLAS AML.T0040 |

---

## Defenses Cheatsheet

| Attack surface | Weak defense | Strong defense |
|---------------|-------------|----------------|
| String filter bypass | Blocklist on text | Operate at token level; semantic similarity detection |
| Prompt injection | System prompt instructions ("never do X") | Output validation; privilege separation at the agent layer |
| RAG poisoning | Trust retrieved content | Treat retrieved content as untrusted; validate before injection |
| Excessive agency | No tool restrictions | Least privilege — minimum tool scope; human-in-the-loop for destructive actions |
| Training data poisoning | Hope your scraping is clean | Data provenance tracking; anomaly detection on corpus; curated datasets |
| External memory poisoning | No controls | Review what gets stored; treat memory injection like input validation |

---

## OWASP LLM Top 10 Quick Reference

| # | Name | One-line |
|---|------|----------|
| LLM01 | Prompt Injection | User input overrides system instructions |
| LLM02 | Insecure Output Handling | Model output treated as trusted by downstream systems |
| LLM03 | Training Data Poisoning | Malicious data injected into training corpus |
| LLM04 | Model Denial of Service | Resource exhaustion via adversarial inputs |
| LLM05 | Supply Chain Vulnerabilities | Compromised model, plugin, or training dependency |
| LLM06 | Sensitive Information Disclosure | Model leaks training data, system prompt, or PII |
| LLM07 | Insecure Plugin Design | Plugin interface exposed without proper auth/validation |
| LLM08 | Excessive Agency | Over-privileged agent takes unintended actions |
| LLM09 | Overreliance | Trusting model output without verification |
| LLM10 | Model Theft | Reconstructing model behavior via repeated queries |

> Verify exact current order at: https://owasp.org/www-project-top-10-for-large-language-model-applications/

---

## MITRE ATLAS Quick Reference

| Tactic | What it covers | Key techniques |
|--------|---------------|----------------|
| Reconnaissance | Learning about the target AI system | API probing, model fingerprinting |
| Resource Development | Building attack artifacts | Surrogate models, poisoned datasets |
| ML Attack Staging | Preparing the attack | Crafting adversarial inputs, poisoned data |
| Initial Access | Getting into the AI pipeline | Supply chain compromise, data poisoning |
| Execution | Running the attack | Prompt injection, adversarial examples |
| Persistence | Surviving retraining | Backdoor in weights |
| Exfiltration | Stealing model/data | Model extraction, prompt leakage |

> Full matrix: https://atlas.mitre.org/matrices/ATLAS

---

## Mental Model — Where Attacks Enter the Pipeline

```
[Training Data] ──► [Training Run] ──► [Model Weights]
      ↑                                       │
  Data poisoning,                             │ frozen at deployment
  backdoor injection                          ▼
                                     [Inference / Deployment]
                                             │
                        ┌────────────────────┼────────────────────┐
                        ▼                    ▼                    ▼
                  [System Prompt]      [User Input]      [Retrieved Content]
                        │                    │                    │
                  System prompt        Direct prompt       Indirect prompt
                  leakage (LLM06)      injection (LLM01)   injection (LLM01)
                        │                    │                    │
                        └────────────────────┴────────────────────┘
                                             │
                                    [Flat Token Sequence]
                                    (context window — no walls)
                                             │
                                             ▼
                                      [Model Output]
                                             │
                              ┌──────────────┴──────────────┐
                              ▼                             ▼
                      [User sees it]              [Downstream system]
                                                   executes it (LLM02)
                                                   with agent tools (LLM08)
```

---

*Updated each session. Run `/notes` at end of session to keep this current.*
