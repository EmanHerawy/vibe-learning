/**
 * gen_sig.ts
 *
 * Produces ed25519 test vectors for:
 *   1. HashDemo  { from: @0xAAAA, to: @0xBBBB, amount: 1_000_000 }
 *   2. MintPermit { action: b"mint", to: @0x1234, amount: 1000,
 *                   nonce: 1, expires_at: 9999, chain_id: 1 }
 *
 * Two fixed-seed keypairs (deterministic every run).
 *
 * Run:  npm install && npm run gen-sig
 */

import { bcs } from "@mysten/bcs";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { keccak_256 } from "@noble/hashes/sha3";

// ── Fixed seeds ───────────────────────────────────────────────────────────────

const SEED_A = new Uint8Array(32).fill(0xaa);
const SEED_B = new Uint8Array(32).fill(0xbb);

// ── Helpers ───────────────────────────────────────────────────────────────────

const hex  = (b: Uint8Array) => Array.from(b).map(x => x.toString(16).padStart(2, "0")).join("");
const sep  = "─".repeat(62);

function hexToBytes(h: string): Uint8Array {
  const s = h.replace(/^0x/, "").padStart(64, "0");
  return Uint8Array.from({ length: 32 }, (_, i) => parseInt(s.slice(i * 2, i * 2 + 2), 16));
}

async function sign(seed: Uint8Array, data: Uint8Array) {
  const kp  = Ed25519Keypair.fromSecretKey(seed);
  const pub  = kp.getPublicKey().toRawBytes();
  const hash = keccak_256(data);
  const sig  = await kp.sign(hash);
  return { pub, hash, sig };
}

// ════════════════════════════════════════════════════════════════════════════
// 1. HashDemo
// ════════════════════════════════════════════════════════════════════════════

const HashDemo = bcs.struct("HashDemo", {
  from:   bcs.bytes(32),
  to:     bcs.bytes(32),
  amount: bcs.u64(),
});

const hashDemoBytes = HashDemo.serialize({
  from:   hexToBytes("AAAA"),
  to:     hexToBytes("BBBB"),
  amount: 1_000_000n,
}).toBytes();

console.log(`\n${"═".repeat(62)}`);
console.log("HashDemo");
console.log(`${"═".repeat(62)}`);
console.log(`BCS (${hashDemoBytes.length} bytes): ${hex(hashDemoBytes)}`);

for (const [seed, label] of [[SEED_A, "A"], [SEED_B, "B"]] as const) {
  const { pub, hash, sig } = await sign(seed as Uint8Array, hashDemoBytes);
  console.log(`\n${sep}`);
  console.log(`Keypair ${label}`);
  console.log(sep);
  console.log(`pub : ${hex(pub)}`);
  console.log(`hash: ${hex(hash)}`);
  console.log(`sig : ${hex(sig)}`);
  console.log(`\n// Move literals — HashDemo Keypair ${label}`);
  const L = (label as string).toLowerCase();
  console.log(`let hash_${L}    = x"${hex(hash)}";`);
  console.log(`let pub_key_${L} = x"${hex(pub)}";`);
  console.log(`let sig_${L}     = x"${hex(sig)}";`);
}

// ════════════════════════════════════════════════════════════════════════════
// 2. MintPermit
// ════════════════════════════════════════════════════════════════════════════

const MintPermit = bcs.struct("MintPermit", {
  action:     bcs.vector(bcs.u8()),   // vector<u8> — ULEB128 length prefix
  to:         bcs.bytes(32),          // address = 32-byte fixed array
  amount:     bcs.u64(),
  nonce:      bcs.u64(),
  expires_at: bcs.u64(),
  chain_id:   bcs.u64(),
});

// Values matching test constants — change freely, then re-run
const PERMIT = {
  action:     Array.from(new TextEncoder().encode("mint")),
  to:         hexToBytes("1234"),
  amount:     1000n,
  nonce:      1n,
  expires_at: 9999n,   // epoch 0 in tests → always valid
  chain_id:   1n,
};

const mintPermitBytes = MintPermit.serialize(PERMIT).toBytes();

console.log(`\n${"═".repeat(62)}`);
console.log("MintPermit  { to: @0x1234, amount: 1000, nonce: 1, expires_at: 9999 }");
console.log(`${"═".repeat(62)}`);
console.log(`BCS (${mintPermitBytes.length} bytes): ${hex(mintPermitBytes)}`);

for (const [seed, label] of [[SEED_A, "A"], [SEED_B, "B"]] as const) {
  const { pub, hash, sig } = await sign(seed as Uint8Array, mintPermitBytes);
  console.log(`\n${sep}`);
  console.log(`Keypair ${label}`);
  console.log(sep);
  console.log(`pub : ${hex(pub)}`);
  console.log(`hash: ${hex(hash)}`);
  console.log(`sig : ${hex(sig)}`);
  console.log(`\n// Move literals — MintPermit Keypair ${label}`);
  const L = (label as string).toLowerCase();
  console.log(`let mint_hash_${L}    = x"${hex(hash)}";`);
  console.log(`let mint_pub_key_${L} = x"${hex(pub)}";`);
  console.log(`let mint_sig_${L}     = x"${hex(sig)}";`);
  console.log(`assert!(/* verify */ true, 0);`);
}

console.log(`\n${sep}\n`);
