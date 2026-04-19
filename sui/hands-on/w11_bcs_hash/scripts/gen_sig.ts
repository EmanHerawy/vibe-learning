/**
 * gen_sig.ts
 *
 * Uses the Sui SDK + @noble/hashes to:
 *   1. BCS-encode  HashDemo { from: @0xAAAA, to: @0xBBBB, amount: 1_000_000 }
 *   2. keccak256   the encoded bytes
 *   3. Sign        with two fixed-seed Ed25519 keypairs (deterministic every run)
 *   4. Print       everything as Move x"..." hex literals
 *
 * Run:
 *   npm install
 *   npm run gen-sig
 */

import { bcs } from "@mysten/bcs";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { keccak_256 } from "@noble/hashes/sha3";

// ── Fixed seeds — same output every run ───────────────────────────────────────

const SEED_A = new Uint8Array(32).fill(0xaa);
const SEED_B = new Uint8Array(32).fill(0xbb);

// ── BCS schema — must match Move struct field order exactly ───────────────────
//   struct HashDemo { from: address, to: address, amount: u64 }

const HashDemo = bcs.struct("HashDemo", {
  from:   bcs.bytes(32),   // Sui address = 32-byte fixed array
  to:     bcs.bytes(32),
  amount: bcs.u64(),       // little-endian u64
});

// ── Encode the same struct used in make_demo() ────────────────────────────────

function hexToBytes(hex: string): Uint8Array {
  const h = hex.replace(/^0x/, "").padStart(64, "0");
  return Uint8Array.from(Array.from({ length: 32 }, (_, i) => parseInt(h.slice(i * 2, i * 2 + 2), 16)));
}

const encoded: Uint8Array = HashDemo.serialize({
  from:   hexToBytes("AAAA"),
  to:     hexToBytes("BBBB"),
  amount: 1_000_000n,
}).toBytes();

const hex = (b: Uint8Array) => Array.from(b).map(x => x.toString(16).padStart(2, "0")).join("");
const sep = "─".repeat(62);

console.log(`\n${sep}`);
console.log("BCS encoding");
console.log(sep);
console.log(`length : ${encoded.length} bytes  (expected 72)`);
console.log(`bytes  : ${hex(encoded)}`);

// ── keccak256 ─────────────────────────────────────────────────────────────────

const hashBytes: Uint8Array = keccak_256(encoded);

console.log(`\n${sep}`);
console.log("keccak256 hash");
console.log(sep);
console.log(`length : ${hashBytes.length} bytes  (expected 32)`);
console.log(`bytes  : ${hex(hashBytes)}`);

// ── Sign with each fixed keypair ──────────────────────────────────────────────

async function printKeypairAndSig(seed: Uint8Array, label: string) {
  const keypair  = Ed25519Keypair.fromSecretKey(seed);
  const pubBytes = keypair.getPublicKey().toRawBytes();   // 32 bytes
  const sigBytes = await keypair.sign(hashBytes);         // 64 bytes

  console.log(`\n${sep}`);
  console.log(`Keypair ${label}  (fixed seed 0x${hex(seed).slice(0, 8)}...)`);
  console.log(sep);
  console.log(`private key (32 bytes) : ${hex(seed)}`);
  console.log(`public  key (32 bytes) : ${hex(pubBytes)}`);
  console.log(`signature   (64 bytes) : ${hex(sigBytes)}`);

  const L = label.toLowerCase();
  console.log(`\n// ── Move literals — Keypair ${label} ${"─".repeat(30)}`);
  console.log(`let hash_${L}    = x"${hex(hashBytes)}";`);
  console.log(`let pub_key_${L} = x"${hex(pubBytes)}";`);
  console.log(`let sig_${L}     = x"${hex(sigBytes)}";`);
  console.log(`assert!(hash_demo::is_valid_signature(hash_${L}, make_demo(), sig_${L}, pub_key_${L}), 0);`);
}

await printKeypairAndSig(SEED_A, "A");
await printKeypairAndSig(SEED_B, "B");

console.log(`\n${sep}\n`);
