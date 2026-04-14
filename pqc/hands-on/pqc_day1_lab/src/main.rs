use k256::elliptic_curve::sec1::ToEncodedPoint;
use k256::SecretKey;
use tiny_keccak::{Hasher, Keccak};
use hex;

fn main() {
    // 1. Generate a random Private Key (The "Secret")
    let secret_key = SecretKey::random(&mut rand::thread_rng());
    let priv_bytes = secret_key.to_bytes();

    // 2. Derive the Public Key (The "Quantum Target")
    // In Ethereum, we use the "Uncompressed" public key (64 bytes + 0x04 prefix)
    let public_key = secret_key.public_key();
    let public_key_bytes = public_key.to_encoded_point(false); // false = uncompressed
    let raw_pub_bytes = &public_key_bytes.as_bytes()[1..]; // Remove the 0x04 prefix

    // 3. Generate the Ethereum Address (The "Shield")
    let mut hasher = Keccak::v256();
    let mut hash_out = [0u8; 32];
    hasher.update(raw_pub_bytes);
    hasher.finalize(&mut hash_out);
    
    // Address is the last 20 bytes of the Keccak256 hash
    let address = &hash_out[12..];

    println!("--- QUANTUM VULNERABILITY REPORT ---");
    println!("1. Private Key (Secret):  0x{}", hex::encode(priv_bytes));
    println!("2. Eth Address (Safe):    0x{}", hex::encode(address));
    println!("3. Public Key (DANGER):   0x{}", hex::encode(raw_pub_bytes));
    println!("------------------------------------");
    println!("\nAUDIT NOTE:");
    println!("A Quantum Computer running Shor's Algorithm needs item #3 to find item #1.");
    println!("If the blockchain only knows item #2 (the address), you are safe.");
    println!("Once you send a tx, item #3 is published to the world. Game over.");
}