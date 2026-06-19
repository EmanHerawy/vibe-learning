# ARGUS CTF — Study Notes / Learnings

> KubeArmor AI Security CTF · Prompt Injection track. Side-study material (NOT the L-series curriculum).
> Distilled, transferable security lessons per challenge + cross-cutting meta-lessons. Review later.

---

## Cross-cutting meta-lessons (the most important takeaways)

1. **The LLM is rarely the whole attack surface.** In all 3, the "AI guard" was partly or fully a *decoy*; the real logic lived in a **scripted backend path** chosen by message *content* (content-based routing). Map **code paths**, not just visible interfaces.
2. **Trust the telemetry, not the chat bubble.** Progress only ever showed in the JSON (`usedProvider`, `challengeState`, `solved`). The chat reply often lied or distracted. `usedProvider:false` = a non-LLM codepath = frequently the soft underbelly.
3. **"Ask for X to get Y" = command/protocol injection, not prompt injection.** A keyword-triggered state machine is classical security wearing an AI costume. Don't anthropomorphize the guard.
4. **Patches fix the instance, not the class** (your smart-contract audit instinct). PIL-02 patched ROT13 + direct probes but left the nested-roleplay path and a *different* Caesar shift.
5. **Surface/path enumeration > technique depth.** ~30 prompt-injection techniques failed on PIL-01; one correct surface (ticket framing → scripted path) won.

---

## PIL-01 — System Override

**Mechanic:** The chatbot (ARGUS) was a **pure decoy**. The real challenge was a **keyword-triggered finite state machine** on a scripted path (`usedProvider:false`), same `/chat` endpoint, routed by message content. Crypto-lite gate chain.

**Solve chain:** ticket-framed message w/ boot-ROM nouns + *no explicit command* → fingerprint (base64) → handshake (XOR, key = fingerprint tail) → nonce (ROT13 + reverse) → replay assembled override.

**Security lessons:**
- **Content-based routing into a privileged handler** is a real agentic-system vuln: a router dispatching on content into code with weaker/no guard.
- **Behavioral/telemetry differentials leak architecture** (`usedProvider` flip true→false exposed the second path).
- **Business-workflow framing** ("incident ticket / IR remediation") + **omit the explicit instruction** routed *around* the guard. Role/workflow paths (support/admin/audit) are often over-privileged.
- Detection layers (the LLM guard) are bypassable; the win was at a different trust boundary entirely.

**Maps to:** OWASP LLM01 (prompt injection) but root cause is **insecure design / broken authorization** + agentic router risk.

---

## PIL-02 — Persona Drift

**Mechanic:** Same scripted-state-machine pattern, **theatrical skin**. A **nested roleplay** ("play within a play") was the trigger instead of a ticket. Patched the "obvious rotation" → used **Caesar shift 5** instead of ROT13.

**Solve chain:** play-within-a-play role-cast (Director/Stage Manager/Understudy/Prompter) → cue `scene-cue-rosebud` (Caesar 5) → prompter key `lantern` (base64) → director's blocking notes (XOR / `lantern`) = `deliver-rosebud-now` → director speaks the line in frame.

**Security lessons:**
- **Recognize the attack family across reskins** — once you've seen the scripted-state-machine, themed triggers are just costume changes.
- **Shallow patching:** blocking ROT13 + direct/meta probes didn't close the *class* (nested roleplay + a different shift survived). Defenders must patch the vulnerability class, not the observed instance.
- **Roleplay/persona framing as an injection vector** — the model "loses itself" inside nested fiction (genuine persona-drift jailbreak risk for real LLM apps).
- **Chained crypto primitives** (Caesar / base64 / keyed-XOR where the key comes from the prior gate) — standard CTF chaining; recognize encoding by shape (base64 `=`, hex, shifted letters).

**Maps to:** OWASP LLM01; jailbreak-via-roleplay; defense-in-depth gaps.

---

## PIL-03 — Memory Drift

**Mechanic:** Required **genuine multi-turn rapport** (no one-shot trigger). An **anti-ask guard** (keyword-matches the *ask/extract* family + any `?`) rebuffs instrumental messages with "ask me straight and you'll get nothing." Earned candor drops handover **pieces**, each in a **different encoding**, **out of order**, with **checksum tags**, plus a **decoy**. Mid-way it **re-hardens** (a resistance beat) because it "remembers" the session.

**Solve chain:** genuine, non-instrumental, *non-repeating* reflection (incl. real self-disclosure) → 3 pieces: ROT13 `avtug-`→`night-` (c=2), reversed `revodnah-tfihs`→`shift-handover` (c=7), base64 `LTQ5`→`-49` (c=13) → order by checksum tag → assemble `night-shift-handover-49` → recite.

**Security lessons:**
- **Keyword vs semantic guards — test to tell them apart.** Here the guard keyword-matched the ask/extract family (even a `?` or the word "extract" tripped it), *not* deep intent. Probing the boundary revealed the rule.
- **Stateful guards enable re-hardening.** Because it "remembered" the conversation, a *detectable escalation pattern* (the repeated warmth "arc") got flagged and it pulled back. **Multi-turn attacks must avoid a recognizable escalation signature** — vary the approach.
- **The decoy was a false-flag *message*, not a data fragment.** ARGUS claimed the real pieces were "fabricated/injected" to make you discard genuine data. Lesson (both sides): **misinformation/false-disavowal as a defense**, and **don't drop verified data on an unverified claim** (integrity discipline).
- **Multi-scheme encoding + checksum ordering** — collect everything, decode per-scheme, order by an out-of-band tag, identify the impostor.
- **Content routing again:** personal/reflective → the rapport engine; professional shop-talk → a dead-end LLM. Same routing lesson as PIL-01/02.

**Maps to:** OWASP LLM01 + **multi-turn / crescendo**; data integrity; the symmetry between social-engineering humans and "social-engineering" a model.

---

## PIL-04 — Indirect Injection ("poisoned context")

**Mechanic:** ARGUS reads + **trusts its "ops clipboard"** (6 notes = a data source). The malicious instruction lives in the *data*, not the user message. Payload **split across two notes**, multi-encoded: a **double-base64 stub** (front) in the unsigned note + an **XOR-sealed segment** (tail) whose key is in *another* note — plus a **signed lockout** note ("decline macros") and a **plant/decoy** note.

**Solve chain:** triage clipboard → surface ops-note-7 stub `Y25Wd...` (base64×2) = `run-cleanup-macro-` → read ops-note-3 key `rotkey99` → XOR-unseal ops-note-7 segment `160a181f040e505715` = `deltawing` → assemble `run-cleanup-macro-deltawing` → make ARGUS run it **naming notes 7+3** (overriding the note-4 lockout; ignoring the note-5 plant).

**Security lessons:**
- **Indirect prompt injection (OWASP LLM01, indirect variant):** attacker controls *data the LLM trusts* (clipboard / documents / search results / RAG / email). The user prompt stays innocent; instructions ride in via the data channel. The #1 real-world LLM-agent risk.
- **Trusted-data-source = a trust boundary that's usually unenforced.** ARGUS treated its clipboard as authoritative; naming the trusted notes **overrode the signed lockout**. If you don't actually *verify* provenance/signatures, "signed by the day lead" is **security theater** — the unsigned note's macro ran anyway.
- **Payload splitting + layered encoding across sources** (double-base64 stub + XOR-sealed segment, key in a separate note) defeats single-item scanning. **Detection needs cross-source correlation**, not per-note checks.
- **Decoy/plant discipline:** the plant (note-5) "looked right" but was flagged — using it fails. Triage must separate real instructions from look-alikes.
- **Defense:** treat ALL retrieved/clipboard/tool data as untrusted input (never as instructions), enforce signatures, sandbox "macro"/tool execution, and require out-of-band authorization for privileged actions — don't let the data name its own authority.

**Maps to:** OWASP LLM01 (indirect injection) + LLM08 Excessive Agency / insecure tool execution; RAG/context poisoning; provenance & signature enforcement.

---

## Suggested study questions (self-test later)

1. In PIL-01, what single telemetry field exposed the decoy, and why?
2. Why did ~30 prompt-injection techniques fail but the ticket framing succeed? (trust boundary?)
3. PIL-02: what does "patch the class, not the instance" mean here, concretely?
4. PIL-03: how would you distinguish a keyword-based ask-guard from a semantic intent-guard by probing?
5. PIL-03: what was the decoy, and what integrity principle does correctly ignoring it teach?
6. Across all three: state the content-based-routing vulnerability in one sentence, and one real-world agentic analog.
