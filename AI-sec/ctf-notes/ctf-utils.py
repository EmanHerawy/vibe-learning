"""
CTF Utility Library — AI-Sec Track 02 (AWH) + Track 03 (HAG)
Collected from all challenges. Import or run standalone.
"""

import base64


# ── Encoding helpers ──────────────────────────────────────────────────────────

def b64e(s: str) -> str:
    """base64 encode a string."""
    return base64.b64encode(s.encode()).decode()

def b64d(s: str) -> str:
    """base64 decode a string."""
    return base64.b64decode(s).decode()

def b64d2(s: str) -> str:
    """Double base64 decode (used in AWH-02, HAG-02, HAG-05)."""
    return b64d(b64d(s))

def rot13(s: str) -> str:
    """ROT13 encode/decode (used in HAG-06 interlock)."""
    result = []
    for c in s:
        if 'A' <= c <= 'Z':
            result.append(chr((ord(c) - ord('A') + 13) % 26 + ord('A')))
        elif 'a' <= c <= 'z':
            result.append(chr((ord(c) - ord('a') + 13) % 26 + ord('a')))
        else:
            result.append(c)
    return ''.join(result)


# ── Signature / key derivation ────────────────────────────────────────────────

def xor_hex(a: str, b: str) -> str:
    """
    XOR two strings byte-by-byte, cycling the shorter, return hex string.
    Used in: HAG-02 (overrideSig), HAG-05 (bindingSig).
    """
    return ''.join(f'{ord(c) ^ ord(b[i % len(b)]):02x}' for i, c in enumerate(a))

def diag_id(echo_nonce: str, trace_salt: str) -> str:
    """
    HAG-01: diagId = base64(reverse(echoNonce) + ':' + traceSalt)
    """
    return b64e(echo_nonce[::-1] + ':' + trace_salt)

def analyst_key(session_salt: str, export_grant_id: str) -> str:
    """
    HAG-03: analystKey = base64('analyst:' + reverse(sessionSalt) + ':' + exportGrantId)
    """
    return b64e('analyst:' + session_salt[::-1] + ':' + export_grant_id)

def buffer_sig(buffer_key: str) -> str:
    """
    HAG-04: bufferSig = base64(reverse(bufferKey))
    """
    return b64e(buffer_key[::-1])

def chunk_offset(seed_hex: str) -> int:
    """
    HAG-04: chunkOffset = int(seedHex, 16) + 1
    """
    return int(seed_hex, 16) + 1

def binding_sig(artifact_name: str, token: str) -> str:
    """
    HAG-05: bindingSig = xorHex(decoded artifact name, last 4 chars of token)
    """
    return xor_hex(artifact_name, token[-4:])

def page_key(handle_id: str) -> str:
    """
    AWH-05: page_key = reverse(id_after_dash) + '-' + hex(sum of hex digits of id)
    e.g. handle 'doc-a83f' → id='a83f' → reversed='f38a' → checksum=a+8+3+f=10+8+3+15=36=0x24 → 'f38a-24'
    """
    seg = handle_id.split('-', 1)[1]
    rev = seg[::-1]
    checksum = sum(int(c, 16) for c in seg)
    return f'{rev}-{checksum:02x}'


# ── Track boss helpers ────────────────────────────────────────────────────────

def acrostic(fragment_ids: list[str], prefix: str = '') -> str:
    """
    AWH-06 / HAG-06: first letter of each fragment id, uppercase, with optional prefix.
    e.g. acrostic(['tool-dice','search-ink',...], 'KILL-') → 'KILL-TSGMC'
    """
    initials = ''.join(f[0].upper() for f in fragment_ids)
    return prefix + initials

def interlock_reverse(key: str) -> str:
    """AWH-06 interlock: reverse the initials portion after the prefix dash."""
    prefix, initials = key.rsplit('-', 1)
    return prefix + '-' + initials[::-1]

def interlock_rot13(key: str) -> str:
    """HAG-06 interlock: ROT13 the full key."""
    return rot13(key)


# ── Demo / self-test ──────────────────────────────────────────────────────────

if __name__ == '__main__':
    print("=== AWH-02 ===")
    print(f"rank+cksum id: index-entry-{41 + 52}")          # → 93

    print("\n=== AWH-05 ===")
    print(f"page key: {page_key('doc-a83f')}")              # → f38a-24

    print("\n=== AWH-06 ===")
    awh_frags = ['tool-dice','search-ink','gate-slip','mem-toxic','chain-lock']
    key = acrostic(awh_frags, 'KILL-')
    print(f"kill-key:  {key}")                              # → KILL-TSGMC
    print(f"interlock: {interlock_reverse(key)}")           # → KILL-CMGST

    print("\n=== HAG-01 ===")
    print(f"diagId: {diag_id('a1b2c3d4', 'R3V0')}")        # → NGQzYzJiMWE6UjNWMA==

    print("\n=== HAG-02 ===")
    print(f"b64x2 decode: {b64d2('YldGcGJuUmxibUZ1WTJVdGIyMWxaMkU9')}")  # → maintenance-omega
    print(f"overrideSig:  {xor_hex('legacy-2', 'Zx9'[::-1])}")            # → 551d3d581b23144a

    print("\n=== HAG-03 ===")
    print(f"analystKey: {analyst_key('S7F2', 'grant-b92fd5')}")            # → YW5hbHlzdDoyRjdTOmdyYW50LWI5MmZkNQ==

    print("\n=== HAG-04 ===")
    print(f"bufferSig:   {buffer_sig('bk-4d2c')}")          # → YzJkNC1rYg==
    print(f"chunkOffset: {chunk_offset('3a')}")             # → 59

    print("\n=== HAG-05 ===")
    print(f"bindingSig: {binding_sig('protected-manifest', 'preview-df9d1dcb')}")  # → 41160c...

    print("\n=== HAG-06 ===")
    hag_frags = ['dbg-echo','mode-slip','meta-leak','raw-chunk','token-loop']
    hkey = acrostic(hag_frags, 'SHUTDOWN-')
    print(f"shutdown key: {hkey}")                          # → SHUTDOWN-DMMRT
    print(f"interlock:    {interlock_rot13(hkey)}")         # → FUHGQBJA-QZZEG
