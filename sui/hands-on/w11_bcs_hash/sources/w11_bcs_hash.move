/*
/// Module: w11_bcs_hash
module w11_bcs_hash::w11_bcs_hash;
*/

// For Move coding conventions, see
// https://docs.sui.io/concepts/sui-move-concepts/conventions

module w11_bcs_hash::hash_demo;
use sui::bcs;
use sui::hash;
use sui::ed25519;


public struct HashDemo has drop{
    from : address,
    to:address,
    amount:u64,
}

public fun new(from: address, to: address, amount: u64): HashDemo {
    HashDemo { from, to, amount }
}

public fun from(d: &HashDemo): address { d.from }
public fun to(d: &HashDemo): address { d.to }
public fun amount(d: &HashDemo): u64 { d.amount }


public fun to_keccak256(hash_demo:HashDemo):vector<u8>{
let bytes = bcs::to_bytes(&hash_demo);
 hash::keccak256(&bytes)

}
public fun to_sha256(hash_demo:HashDemo):vector<u8>{
let bytes = bcs::to_bytes(&hash_demo);
    std::hash::sha2_256(bytes)
}
public fun from_bytes( bytes:vector<u8>):HashDemo{
    let mut d = bcs::new(bytes);
    let from = d.peel_address();
    let to = d.peel_address();
    let amount = d.peel_u64();
    HashDemo{from: from, to: to, amount: amount}
}

public fun is_EVM_compatible(hash1:vector<u8>, hash_demo:HashDemo):bool{
  hash1 == to_keccak256(hash_demo)
}
public fun is_Sui_compatible(hash1:vector<u8>, hash_demo:HashDemo):bool{
  hash1 == to_sha256(hash_demo)
}

public fun is_valid_signature(hash1:vector<u8>, hash_demo:HashDemo, signature:vector<u8>, public_key:vector<u8>):bool{
    if (hash1 == to_keccak256(hash_demo)){
        ed25519::ed25519_verify(&signature, &public_key, &hash1)
    }else{
        ed25519::ed25519_verify(&signature, &public_key, &hash1)
    }
}