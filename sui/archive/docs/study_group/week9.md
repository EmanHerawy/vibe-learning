
# 📓 Study Notes: Session 1 (Events, Display, & Kiosk)

## 1. Events: The "Off-Chain Signal"

Events are the bridge between the Move VM and the outside world (wallets, websites, indexers).

* **Mechanical Necessity:** They require the `copy` and `drop` abilities.
* *Why?* You need to `copy` the data to the event system and then `drop` the struct after emitting it because it isn't being stored on-chain.


* **The "Automatic" Trap:** Sui automatically indexes object creation and transfers.
* *Developer Tip:* Don't waste gas emitting a "Transfer" event for a standard object.
* *Auditor Note:* Only emit events for **state changes that aren't visible via object metadata**. If a user "Cancels a Listing," that listing object might be deleted. Without a `ListingCancelled` event, the Frontend won't know why it disappeared.


* **Math-Free Logic:** Think of events as "receipts" printed at a store. They tell you what happened, but you can't go back to the store and pay using a receipt.

---

## 2. Object Display: The "Wallet UI" Standard

Sui objects are just data. The `Display` object tells wallets how to render that data as a pretty NFT.

* **The Efficiency Hack:** Instead of storing a 100-byte URL in every single NFT, we store a **template** in one `Display` object.
* *Formula:* `image_url: "https://api.game.com/sword/{id}.png"`
* *Result:* Each NFT only stores its `id`. The wallet does the "math" to find the image.


* **The One-Time Witness (OTW) & Publisher:**
* To create a `Display`, you need a `Publisher` object.
* To get a `Publisher`, you must use an **OTW** (a struct named exactly like the module in ALL CAPS with only `drop`).
* *Why?* This proves to the blockchain that you are the **authentic creator** of the package.
* *Auditor Note:* If the `Publisher` object is lost (sent to `@0x0`), the collection's metadata is **frozen forever**. We check who controls this object to assess "Centralization Risk."

*Keep this for your records!*

| Topic | Key Concept | Memory Trigger |
| --- | --- | --- |
| **Events** | Not stored in state; used for Frontends/Indexers. | "Receipts, not the Gold." |
| **Abilities** | Events MUST have `copy` + `drop`. | "Drop it after you print it." |
| **Display** | Off-chain metadata template. | "The Poster for the Toy." |
| **OTW** | A struct with the module name used once. | "The ID card for the Factory." |

---
#### Storage: Solidity vs. Sui

In **Solidity**, you usually store a single `baseTokenURI` (e.g., `ipfs://CID/`) and then the contract appends the `tokenId` at the end off-chain. You pay for storage **once** for that string.

In **Sui**, every NFT is a standalone object. If you store the full URL string inside every object:

* **Solidity:** 1 contract = 1 string (~100 bytes).
* **Sui:** 10,000 objects = 10,000 strings (~1,000,000 bytes).

This is why putting the full URL in the struct is a "Gas/Storage Sin" in Sui. You would be paying for those redundant bytes 10,000 times.

---

#### How Display handles "Unique" Images

You asked: *“If each NFT has a different pic, how is it mapped?”*

We use **Template Substitution**. Instead of storing the "long" part of the URL, we only store the "unique" part (like an ID or a hash) in the object, and the **Display** object handles the "long" part.

##### Practical Example:

Imagine you have a collection of 10,000 Robots.

* **The Object:** We only store a small `u64` or a short `String`.

```rust
public struct Robot has key, store {
    id: UID,
    robot_id: u64, // Just the number! (e.g., 55)
}

```

* **The Display Template:** We set the `image_url` key to a template string that uses that `robot_id`.

```rust
let keys = vector[string::utf8(b"image_url")];
let values = vector[string::utf8(b"https://api.myrobots.com/v1/image/{robot_id}.png")];

```

**What happens?**
When a wallet (like Sui Wallet) looks at Robot #55, it sees the template. It automatically replaces `{robot_id}` with `55` and fetches `https://api.myrobots.com/v1/image/55.png`.

**The Result:** You saved thousands of bytes because the string `"https://api.myrobots.com/v1/image/"` is stored **exactly once** in the Display object, not 10,000 times in the NFTs.

**What if we want to add `color`?**
> remember—the `keys` in a `Display` object are **standardized** (like `name`, `image_url`, `description`).
* **The Right Way:** You keep the key as `description`, but the **value** in the array would look like this:
`string::utf8(b"This is a {color} robot.")`
* **Why?** The wallet only knows how to look for a field called `description`. It doesn't know what a `color` field is. So we "bake" the `{color}` variable *into* the description string.


## 3. Kiosk & Transfer Policy: The "Royalty Guard"

Kiosk is the standard for high-value assets where creators want to ensure they get paid on every sale.

* **Ownership vs. Control:**
* **User:** Owns the `Kiosk` (their personal "shop").
* **Creator:** Owns the `TransferPolicy` (the "rule book").


* **The "Hot Potato" Flow (The PurchaseCap/Request):**
1. User buys from Kiosk $\rightarrow$ They get the NFT + a "Hot Potato" (a `TransferRequest`).
2. *Wait, what's a Hot Potato?* It’s a struct that has **no abilities**. It cannot be dropped or stored. You **must** resolve it in the same transaction, or the whole purchase fails.
3. User goes to the Creator’s `TransferPolicy` $\rightarrow$ They pay the royalty $\rightarrow$ The policy "destroys" the hot potato.


* **The Resale Loop:**
* This happens **every time** a trade occurs. Even if User Y sells to Alice 10 years later, Alice must follow the same Transfer Policy.


* **Security Insight:** Putting an NFT in a Kiosk protects you from "Wallet Drainers." Even if a hacker gets your key, they can't simply `public_transfer` the NFT out. They have to "buy" it or "list" it, triggering the Creator's rules (which might include a cooling-off period or a high fee).

*Keep this for your records!*

| Concept | Analogy | Why it matters |
| --- | --- | --- |
| **Kiosk** | A Personal Safe/Shop. | Users own the safe; Creators set the rules. |
| **Transfer Policy** | The "Rule Book." | Enforces royalties and trading laws. |
| **PurchaseCap** | A "Claim Ticket." | Prevents "skipping" the royalty payment. |
| **Royalty Rule** | A "Tax Collector." | Ensures creators get paid for their work. |
---

## 🧪 Double-Check:

To ensure this is cemented in your memory, let's look at one final scenario:

> **The Scenario:** You are auditing a new NFT game. You notice the lead developer created the NFTs **without** the `store` ability but wants them to be tradable on any marketplace.
> **The Question:** > 1. Can these NFTs be put into a Kiosk?
> 2. How does the developer allow them to be "Soulbound" vs. "Tradable" without the `store` ability?
3. **Memory Hack:** If an NFT is "Soulbound" (cannot be traded), do we even need a Kiosk? (Hint: Does a Kiosk help if the item can never be sold?)
4. **Security Question:** If I have an NFT inside my Kiosk, and a hacker steals my private key, can they use `public_transfer` to move the NFT to their wallet instantly?
4. **The "Why":** Why is the `Transfer Policy` a separate object from the `Kiosk`? (Think: Does the Creator own the Kiosk, or does the User?)