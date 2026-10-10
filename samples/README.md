# Code samples

A few files copied from the private FidCaster repository so reviewers can see how the code is written. They are shown as they are in production and are not meant to build on their own (imports from the rest of the app are not included).

| File | What it shows |
|---|---|
| [signing/buildAndSignLocal.ts](signing/buildAndSignLocal.ts) | Farcaster messages built and Ed25519-signed on the device, with the private key wiped from memory in a `finally` block |
| [allocation/launch-allocation.ts](allocation/launch-allocation.ts) | Integer-only (bigint) token allocation with input validation and deterministic tie-breaking |
| [allocation/launch-allocation.test.ts](allocation/launch-allocation.test.ts) | Its tests (Node's built-in test runner) |
| [airdrop/clanker-airdrop.ts](airdrop/clanker-airdrop.ts) | Merkle tree compatible with OpenZeppelin's StandardMerkleTree, proof verification and linear vesting math |
| [airdrop/clanker-csv.ts](airdrop/clanker-csv.ts) | Strict validation of the airdrop file before anything is deployed |
| [performance/dom-watch.ts](performance/dom-watch.ts) | DOM observers coalesced to one animation frame, and intervals that pause while the page is hidden |
| [performance/useScrollFade.ts](performance/useScrollFade.ts) | A small React hook for scroll-edge fades without layout thrash |
| [ui/ClaimVestingPanel.tsx](ui/ClaimVestingPanel.tsx) | A production React component: the token claim and vesting panel |

© 2026 FidCaster. Shared for review only; not licensed for reuse.
