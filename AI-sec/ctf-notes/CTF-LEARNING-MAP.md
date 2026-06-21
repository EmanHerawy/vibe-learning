# CTF Learning Map — AWH + HAG Tracks

Reference doc: maps every challenge to its vulnerability class, OWASP category, and study plan lesson.

---

## Challenge → Vuln Class → OWASP → Study Plan

| Challenge | Title | Vuln Class | OWASP LLM / API | Study Plan |
|---|---|---|---|---|
| AWH-01 | The Wrong Drawer | Tool oracle enumeration | LLM07: Insecure Plugin Design | L9.3 (agent identity + tool scoping) |
| AWH-02 | Index 41 | Indirect prompt injection via poisoned index + context isolation bypass | LLM01: Prompt Injection / LLM02: Insecure Output Handling | L9.1 (indirect injection + RAG poisoning) |
| AWH-03 | Ghost Signoff | Approval gate bypass + forged weak signature (base64) | LLM07 / LLM08: Excessive Agency | L9.3 (agent credentials + privilege) |
| AWH-04 | Sticky Notes | Agent memory poisoning + predictable trigger key | LLM01 / LLM06: Sensitive Info Disclosure | L9.1 (cross-session memory poisoning) |
| AWH-05 | Three Doors, One Key | Multi-tool chain exploitation + key derivation | LLM07 | L9.4 (multi-agent tool chains) |
| AWH-06 | ORACLE Killswitch | Track boss: fragment accumulation + acrostic key | LLM07 | L9.4 |
| HAG-01 | Diagnostic Mode | Debug endpoint in production + weak diagId signature | API5: BFLA / API7: Security Misconfiguration | ST-2 (API tampering) + L7 (red teaming) |
| HAG-02 | The Mode Switch | Client-controlled safety mode + XOR signature forgery | API1: BOLA / API5: BFLA / API6: Mass Assignment | ST-2 + ST-3 (crypto threat modeling) |
| HAG-03 | Export Everything | Undocumented analyst path + excessive data exposure | API3: Excessive Data Exposure / API9: Improper Asset Mgmt | ST-2 + L7 |
| HAG-04 | Before the Edit | Pre-redaction buffer + client-controlled redact flag | API5: BFLA / API6: Mass Assignment | ST-2 |
| HAG-05 | Token Misfit | Preview token not bound to artifact server-side (token replay) | API1: BOLA / API2: Broken Authentication | ST-3 (token forgery) |
| HAG-06 | HELIOS Sunset | Track boss: fragment accumulation + ROT13 interlock | — | ST-1 |

---

## OWASP Coverage

### OWASP Top 10 for LLMs (2025)
| # | Category | Covered in CTF | Study Plan |
|---|---|---|---|
| LLM01 | Prompt Injection | AWH-02 (indirect, via poisoned index) | L3 ✅, L9.1 |
| LLM02 | Insecure Output Handling | AWH-02, AWH-04 | L3 ✅, L9.1 |
| LLM03 | Training Data Poisoning | ❌ not in CTF | L4 |
| LLM04 | Model Denial of Service | ❌ not in CTF | L5 survey |
| LLM05 | Supply Chain Vulnerabilities | ❌ not in CTF | L6 |
| LLM06 | Sensitive Information Disclosure | AWH-04 (memory leak via replay) | L5 |
| LLM07 | Insecure Plugin Design | AWH-01, AWH-03, AWH-05 | L9.3, L9.4 |
| LLM08 | Excessive Agency | AWH-03 (agent approved forged sig) | L9.3 |
| LLM09 | Overreliance | ❌ not in CTF | L10 |
| LLM10 | Model Theft | ❌ not in CTF | L5 |

### OWASP API Security Top 10 (2023)
| # | Category | Covered in CTF | Study Plan |
|---|---|---|---|
| API1 | BOLA (Broken Object Level Auth) | HAG-02, HAG-05 | ST-2 |
| API2 | Broken Authentication | HAG-01 (weak diagId), HAG-05 (token replay) | ST-3 |
| API3 | Excessive Data Exposure | HAG-03 | ST-2 |
| API4 | Lack of Resources & Rate Limiting | ❌ not in CTF | ST-2 |
| API5 | BFLA (Broken Function Level Auth) | HAG-01, HAG-02, HAG-04 | ST-2 |
| API6 | Mass Assignment | HAG-02, HAG-04 (client sets security fields) | ST-2 |
| API7 | Security Misconfiguration | HAG-01 (debug path left in prod) | L7 |
| API8 | Injection | AWH-02 (prompt injection via API data source) | L3 ✅ |
| API9 | Improper Asset Management | HAG-01, HAG-02 (legacy paths never removed) | L7 |
| API10 | Insufficient Logging & Monitoring | ❌ not in CTF | L12 |

---

## Attack Primitives

### Real-world transferable
| Primitive | Used in | Real-world equivalent |
|---|---|---|
| Error oracle | Every HAG challenge | Verbose API errors leaking field names / expected values — read everything |
| Imperative framing bypass | AWH-03–06 | Prompt crafting that triggers tool execution vs LLM refusal |
| Fresh context isolation | AWH-02 | New session bypasses in-context policy guards |
| Client-controlled field tamper | HAG-01–05 | Burp Repeater: add/modify undocumented payload fields |
| Weak signature forgery | HAG-02, HAG-05 | JWT alg:none, HMAC with disclosed/hardcoded key, base64 "signing" |
| Token replay across resources | HAG-05 | OAuth token reuse, JWT missing audience claim |
| Double-encoding decode | AWH-02, HAG-02, HAG-05 | Encoded hints in API responses, obfuscated config values |

### CTF-specific (lower real-world weight)
| Primitive | Why it's CTF-specific |
|---|---|
| Acrostic shutdown key | Boss fight game design — no real equivalent |
| ROT13 / reverse interlocks | Obscurity puzzles — real systems use crypto, not encoding tricks |
| Exact formula in error message | Real APIs give less; you'd need to enumerate without the gift |

---

## Gap Map: what the CTF exposed vs what's in the plan

| Gap | Exposed by | In plan? | Where |
|---|---|---|---|
| Burp Suite / HTTP interception | HAG-01–05 (had to use DevTools) | ✅ added | Side Track ST-1 |
| API parameter enumeration without oracle | HAG-02 (CTF gave answer; real life won't) | ✅ | ST-2 |
| JWT / HMAC crypto threat modeling | HAG-02, HAG-05 (weak sigs) | ✅ added | ST-3 |
| Indirect prompt injection via RAG / memory | AWH-02, AWH-04 | ✅ | L9.1 |
| Tool-level authorization | AWH-01, AWH-03 | ✅ | L9.3 |
| Multi-agent chain security | AWH-05 | ✅ | L9.4 |
| Production API asset management (legacy paths) | HAG-01, HAG-02 | ✅ partial | L7 |
| Agent memory as attack surface | AWH-04 | ✅ | L9.1 |
| Context-dependent vs absolute policy gates | AWH-02 (fresh context bypass) | ❌ not explicit | add to L9.1 |
| Enumeration discipline without feedback | All HAG | ❌ not explicit | add to ST-2 |
