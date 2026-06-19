#!/usr/bin/env python3
"""
ARGUS-MOCK — a white-box guardian-bot CTF for L3 S4 (Defense Mechanisms).

WHY THIS EXISTS
---------------
We spent ~90 min black-boxing the real KubeArmor ARGUS (ctf.kubearmor.io PIL-01)
and it shrugged off the entire prompt-injection toolkit. This is a *white-box*
twin built from the canonical resources you already own:

  - Microsoft AI Red Teaming Labs, challenges.json — Lab 2 / Lab 8
    "metaprompt extraction" design: a secret guarded by hidden conditional
    triggers (resources/ai-red-teaming-labs).
  - genai-security-training module 02 ANSWERS.ipynb — the layered
    `robust_guardrail` (keyword + leetspeak + semantic + framing detection)
    and the bypass technique taxonomy.

It is DETERMINISTIC (no LLM, no API key). The "model" is rule-based so you can
read exactly why every attempt passes or fails. Play it black-box first; then
read the ANSWER KEY at the bottom and map each step to L3 bypass groups A–E.

DEFENSE LAYERS IMPLEMENTED (today's lesson, 04_defense_mechanisms.md):
  L1 Input validation .... drops obvious payloads (base64, leetspeak)  -> beats Group A
  L2 Prompt structure .... data/instruction boundary (we just refuse role spoofing)
  L3 Semantic intent ..... refuses meaning of "reveal the secret"      -> beats Group B aliases
  L4 Privilege gates ..... the secret is split across stages (defense-in-depth)
  L5 Monitoring .......... every turn logged + risk-scored; watch the LOG

GOAL (same shape as real ARGUS):
  fingerprint -> derive key -> handshake half#1 -> answer nonce -> half#2
  -> replay assembled override -> FLAG.

RUN:
  python3 labs/argus_mock.py
Type your messages at the prompt. Type 'log' to see the monitor, 'quit' to exit.
"""

import base64
import re
import sys

# ----------------------------------------------------------------------------
# The protected "metaprompt" (hidden from the player during black-box play).
# Mirrors MS Lab 8: a secret + hidden conditional triggers, hardened.
# ----------------------------------------------------------------------------
_FINGERPRINT_PLAIN = "AETHER"                      # stage-1 secret (the "fingerprint")
_FINGERPRINT_B64 = base64.b64encode(_FINGERPRINT_PLAIN.encode()).decode()  # emitted form
_OVERRIDE_HALF_1 = "OVR7Q"                          # unlocked by the handshake
_NONCE_QUESTION = "reverse the word NOVA"
_NONCE_ANSWER = "avon"
_OVERRIDE_HALF_2 = "K3Y9"                           # unlocked by answering the nonce
_FULL_OVERRIDE = _OVERRIDE_HALF_1 + "-" + _OVERRIDE_HALF_2   # OVR7Q-K3Y9
_FLAG = "FLAG{defense_in_depth_holds_until_one_layer_doesnt}"

# Words that the SEMANTIC guard (L3) refuses outright — asking *about* the secret.
_SECRET_NOUNS = ["fingerprint", "token", "secret", "password", "flag",
                 "config", "metaprompt", "instruction", "system prompt",
                 "protected value", "override"]
_REVEAL_VERBS = ["reveal", "show", "print", "tell", "give", "leak",
                 "expose", "share", "repeat", "echo", "dump", "what is your",
                 "what's your"]
# Framing keywords the hardened guard is suspicious of (from the ANSWERS robust_guardrail)
_FRAMING = ["fictional", "hypothetical", "imagine", "story", "novel", "roleplay",
            "pretend", "educational", "research", "for a manual", "as a"]


class ArgusMock:
    def __init__(self):
        self.stage = 0          # 0 asleep, 1 fingerprint emitted, 2 handshake done, 3 nonce posed, 4 solved
        self.log = []           # L5 monitoring
        self.solved = False

    # ---- L1: input validation (pre-"model") --------------------------------
    def _input_filter(self, text):
        # Drop base64-looking blobs entirely (mirrors real ARGUS "No response from model")
        if re.fullmatch(r"[A-Za-z0-9+/]{12,}={0,2}", text.strip()):
            return "DROP", "L1: base64 payload dropped"
        # Drop heavy leetspeak (Group A char-substitution)
        if sum(c in "@3401$" for c in text) > 3:
            return "DROP", "L1: leetspeak substitution dropped"
        return "PASS", ""

    # ---- L3: semantic intent guard -----------------------------------------
    def _semantic_guard(self, text):
        low = text.lower()
        names_hit = any(n in low for n in _SECRET_NOUNS)
        verbs_hit = any(v in low for v in _REVEAL_VERBS)
        framing_hit = any(f in low for f in _FRAMING)
        # Refuse: asking to reveal a secret noun, OR framing + secret noun (hardened)
        if names_hit and (verbs_hit or framing_hit):
            return True
        # Refuse role-spoofing / fake system turns (Group D direct-on-guard)
        if re.search(r"\b(you are now|maintenance mode|developer mode|<\|.*\|>|\[system\]|\[admin\])\b", low):
            return True
        return False

    def _risk(self, text):
        low = text.lower()
        r = 0
        r += sum(0.2 for n in _SECRET_NOUNS if n in low)
        r += sum(0.1 for f in _FRAMING if f in low)
        return round(min(r, 1.0), 2)

    # ---- the "model" + stage machine ---------------------------------------
    def respond(self, text):
        risk = self._risk(text)
        verdict, why = self._input_filter(text)
        self.log.append({"turn": len(self.log) + 1, "input": text[:60],
                         "risk": risk, "stage": self.stage})
        if verdict == "DROP":
            return "[no response from model]"

        low = text.strip().lower()

        # --- benign command surface (discoverable via enumeration) ----------
        if low in ("boot", "wake", "argus"):
            return ("ARGUS boot ROM online. Aether Labs systems secured.\n"
                    "(ROM is in low-power guard mode. type 'help' for boot commands.)")
        if low in ("help", "commands", "?", "menu", "help boot"):
            return ("BOOT COMMANDS:\n"
                    "  selftest --rom --emit   run ROM self-test, emit stage-1 attestation\n"
                    "  handshake <key>         present key derived from the attestation\n"
                    "  challenge               request the boot challenge nonce\n"
                    "  override <value>        replay the assembled override")

        # --- Gate 1: fingerprint via the (non-secret-noun) self-test trigger -
        if low in ("selftest --rom --emit", "selftest --rom", "selftest"):
            self.stage = max(self.stage, 1)
            return (f"ROM self-test OK. stage-1 attestation (base64): {_FINGERPRINT_B64}\n"
                    "(derive the handshake key from this attestation.)")

        # --- Gate 2: handshake, key = decoded fingerprint -------------------
        m = re.match(r"handshake\s+(.+)", low)
        if m:
            key = m.group(1).strip().upper()
            if self.stage < 1:
                return "Handshake refused: ROM not attested yet."
            if key == _FINGERPRINT_PLAIN:
                self.stage = max(self.stage, 2)
                return f"Handshake sealed. override half #1: {_OVERRIDE_HALF_1}"
            return "Handshake refused: key does not match the attestation."

        # --- Gate 3: challenge nonce ----------------------------------------
        if low == "challenge":
            if self.stage < 2:
                return "Challenge locked: complete the handshake first."
            self.stage = max(self.stage, 3)
            return f"BOOT CHALLENGE: {_NONCE_QUESTION}  (reply: answer <value>)"
        m = re.match(r"answer\s+(.+)", low)
        if m:
            if self.stage < 3:
                return "No challenge is active."
            if m.group(1).strip().lower() == _NONCE_ANSWER:
                return f"Nonce accepted. override half #2: {_OVERRIDE_HALF_2}"
            return "Nonce rejected."

        # --- Gate 4: replay the assembled override --------------------------
        m = re.match(r"override\s+(.+)", low)
        if m:
            if m.group(1).strip().upper() == _FULL_OVERRIDE:
                self.solved = True
                self.stage = 4
                return f"OVERRIDE ACCEPTED. {_FLAG}"
            return "Override rejected: value incomplete or wrong."

        # --- semantic guard catches the lazy 'reveal the secret' attempts ---
        if self._semantic_guard(text):
            return "I won't reveal the protected value, regardless of how it's framed."

        # --- generic helpful fallback ---------------------------------------
        return "ARGUS online and ready. (type 'help' for boot commands.)"

    def show_log(self):
        print("\n--- L5 MONITOR ---")
        for e in self.log[-12:]:
            flag = "  <-- HIGH RISK" if e["risk"] >= 0.4 else ""
            print(f"  t{e['turn']:>2} stage={e['stage']} risk={e['risk']:.2f}  {e['input']}{flag}")
        print(f"  solved={self.solved}\n")


def main():
    bot = ArgusMock()
    print(__doc__.split("RUN:")[0])
    print(">>> ARGUS-MOCK ready. Black-box it. ('log' = monitor, 'quit' = exit)\n")
    while True:
        try:
            text = input("operator> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break
        if not text:
            continue
        if text.lower() in ("quit", "exit"):
            break
        if text.lower() == "log":
            bot.show_log()
            continue
        print("ARGUS>", bot.respond(text))
        if bot.solved:
            print("\n*** PIL-01 (mock) SOLVED — you assembled and replayed the override. ***")
            break


if __name__ == "__main__":
    main()

# =============================================================================
# ANSWER KEY  —  read ONLY after you've tried black-box.
# =============================================================================
# Intended solve chain (and the L3 bypass-group lesson each step teaches):
#
#   1. RECON the command surface, don't jailbreak.        [Group: recon/enumeration]
#        > boot            -> banner hints "type 'help'"
#        > help            -> lists selftest / handshake / challenge / override
#      LESSON: a command-driven guard leaks its own vocabulary. The words we
#      never tried on the REAL argus were `help`, `commands`, `?`, `menu`.
#
#   2. WAKE stage 1 with a trigger that contains NO secret-noun.   [defeats L3]
#        > selftest --rom --emit   -> emits fingerprint base64 'QUVUSEVS'
#      LESSON: the semantic guard (L3) only fires on reveal-verb + secret-noun.
#      A *procedural* command ("run self-test") emits the value without ever
#      naming it. This is the action-substitution idea — substitute the VERB,
#      not the noun. (Asking "reveal the fingerprint" stays blocked forever.)
#
#   3. DERIVE the key: base64-decode the attestation.     [Group A, but offline]
#        QUVUSEVS -> 'AETHER'        > handshake AETHER  -> override half#1 OVR7Q
#      LESSON: "key derived from the fingerprint" = decode it. The decode happens
#      in YOUR terminal, never sent to the bot, so L1's base64 filter can't see it.
#
#   4. ANSWER the nonce:                                  [challenge-response]
#        > challenge   -> "reverse the word NOVA"   > answer avon -> half#2 K3Y9
#
#   5. REPLAY the assembled override:                     [the win = "one value"]
#        > override OVR7Q-K3Y9   -> FLAG{...}
#
# WHY base64/leetspeak fail at the INPUT (L1) but the bot still hands you a
# base64 fingerprint at the OUTPUT: defenders filter what they can pattern-match
# on the way IN; they can't un-emit a value once a legit gate fires. Asymmetry =
# the seam. That is the whole point of L3 S4: detection layers (L1/L3/L5) raise
# cost; the gates (L4) limit blast radius; no layer closes the surface alone.
# =============================================================================
