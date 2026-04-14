use k256::ecdsa::{SigningKey, Signature, signature::Signer}; 
use pqcrypto_dilithium::dilithium2;
use pqcrypto_traits::sign::{PublicKey, SecretKey, SignedMessage};

fn main() {
    let tx_payload = b"transfer(0xDEAd...BEEF, 50 ETH)";

    println!("--- 🛠️ POST-QUANTUM GAS AUDIT 🛠️ ---\n");

    // 1. GENERATE CURRENT ETHEREUM SIGNATURE (ECDSA)
    let ecdsa_priv = SigningKey::from_slice(&[0x01; 32]).expect("Invalid privkey");
    let ecdsa_sig: Signature = ecdsa_priv.sign(tx_payload);
    let ecdsa_size = ecdsa_sig.to_bytes().len();

    // 2. GENERATE QUANTUM-SAFE SIGNATURE (DILITHIUM)
    let (dilithium_pk, dilithium_sk) = dilithium2::keypair();
    let dilithium_sig = dilithium2::sign(tx_payload, &dilithium_sk);
    let dilithium_size = dilithium_sig.as_bytes().len();

    // 3. KEY DERIVATION AUDIT (FIXED)
    println!("🔑 KEY DERIVATION:");
    println!("   Dilithium2 Public Key:   {} bytes", dilithium_pk.as_bytes().len());
    println!("   Dilithium2 Secret Key:   {} bytes", dilithium_sk.as_bytes().len());
    
    // For ECDSA Public Key, we convert to an EncodedPoint to get the bytes
    let ecdsa_pub_bytes = ecdsa_priv.verifying_key().to_encoded_point(false);
    println!("   ECDSA Public Key:        {} bytes", ecdsa_pub_bytes.as_bytes().len());
    println!("   ECDSA Secret Key:        {} bytes\n", ecdsa_priv.to_bytes().len());

    // 4. THE ANALYTICS
    println!("📦 DATA FOOTPRINT:");
    println!("   ECDSA Signature size:    {} bytes", ecdsa_size);
    println!("   Dilithium2 Signature:    {} bytes", dilithium_size);
    println!("   Bloat Factor:            {:.1}x larger\n", (dilithium_size as f32 / ecdsa_size as f32));

    println!("⛽ GAS CALCULATIONS (L1 Calldata):");
    let ecdsa_gas = ecdsa_size * 16;
    let dilithium_gas = dilithium_size * 16;

    println!("   ECDSA Calldata Gas:      {} gas", ecdsa_gas);
    println!("   Dilithium Calldata Gas:  {} gas", dilithium_gas);
    println!("   Extra Gas Required:      {} gas", dilithium_gas - ecdsa_gas);
    
    println!("\n⚠️ AUDITOR'S NOTE:");
    if dilithium_gas > 21000 {
        println!("CRITICAL: Dilithium signature data alone ({} gas) exceeds a standard L1 transfer (21k)!", dilithium_gas);
    }
}