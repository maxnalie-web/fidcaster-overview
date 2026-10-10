// Excerpt from the private FidCaster repository: artifacts/farcaster-client/shared/clanker-airdrop.ts
// Shown unmodified for review.

import { encodeAbiParameters, keccak256, concatHex, parseAbi, type Address, type Hex } from "viem";

// Canonical Base deployments, from clanker-devco/DOCS deployed-contracts.
export const AIRDROP_ADDRESS = "0xf652B3610D75D81871bf96DB50825d9af28391E0" as Address;
export const CLANKER_FACTORY = "0xE85A59c628F7d27878ACeB4bf3b35733630083a9" as Address;
export const ZERO_ROOT = `0x${"0".repeat(64)}` as Hex;
export const INITIAL_SUPPLY = 100_000_000_000n * 10n ** 18n;
export const POOL_SUPPLY = INITIAL_SUPPLY / 20n;
export const LOCK_SECONDS = 86400n;
export const VEST_SECONDS = 20n * 86400n;
export const airdropAbi = parseAbi([
  "function factory() view returns (address)",
  "function airdrops(address) view returns (address admin, bytes32 merkleRoot, uint256 totalSupply, uint256 totalClaimed, uint256 lockupEndTime, uint256 vestingEndTime, uint256 adminClaimTime, bool adminClaimed)",
  "function amountAvailableToClaim(address token, address recipient, uint256 allocatedAmount) view returns (uint256)",
  "function claim(address token, address recipient, uint256 allocatedAmount, bytes32[] proof)",
  "function updateMerkleRoot(address token, bytes32 newMerkleRoot)",
  "event AirdropCreated(address indexed token, address indexed admin, bytes32 merkleRoot, uint256 supply, uint256 lockupDuration, uint256 vestingDuration)",
  "event AirdropClaimed(address indexed token, address indexed user, uint256 totalUserAmountClaimed, uint256 userAmountStillLocked)",
]);
export const factoryAbi = parseAbi([
  "function tokenDeploymentInfo(address token) view returns ((address token, address hook, address locker, address[] extensions))",
]);
export type Recipient = { address: Address; amount: string; fids: number[] };
export type MerkleAllocation = { root: Hex; recipients: (Recipient & { proof: Hex[] })[] };
export function leaf(address: Address, amount: bigint): Hex {
  return keccak256(keccak256(encodeAbiParameters([{ type: "address" }, { type: "uint256" }], [address, amount])));
}
export function hashPair(a: Hex, b: Hex): Hex {
  return keccak256(concatHex(a.toLowerCase() < b.toLowerCase() ? [a, b] : [b, a]));
}
export function verifyProof(address: Address, amount: bigint, proof: Hex[], root: Hex) {
  return proof.reduce(hashPair, leaf(address, amount)).toLowerCase() === root.toLowerCase();
}
// OpenZeppelin StandardMerkleTree's sorted, complete binary tree layout.
// One leaf per wallet: Clanker tracks claims per address, not per FID.
export function buildMerkle(allocations: Record<string, string>, wallets: Record<string, Address>,
  remainder?: { address: Address; amount: string }): MerkleAllocation {
  const aggregated = new Map<string, Recipient>();
  for (const [fid, raw] of Object.entries(allocations)) {
    const amount = BigInt(raw);
    if (amount <= 0n) continue;
    const address = wallets[fid];
    if (!address) throw new Error(`Recipient wallet unresolved for FID ${fid}`);
    const key = address.toLowerCase();
    const previous = aggregated.get(key);
    aggregated.set(key, { address, amount: (BigInt(previous?.amount ?? "0") + amount).toString(), fids: [...(previous?.fids ?? []), Number(fid)] });
  }
  if (remainder) {
    const amount = BigInt(remainder.amount);
    if (amount <= 0n) throw new Error("Invalid remainder allocation");
    const key = remainder.address.toLowerCase();
    const previous = aggregated.get(key);
    aggregated.set(key, { address: remainder.address, amount: (BigInt(previous?.amount ?? "0") + amount).toString(),
      fids: previous?.fids ?? [] });
  }
  const rows = [...aggregated.values()].map(row => ({ ...row, hash: leaf(row.address, BigInt(row.amount)) }))
    .sort((a, b) => a.hash.localeCompare(b.hash));
  if (!rows.length) throw new Error("No positive allocations");
  const tree: Hex[] = new Array(rows.length * 2 - 1);
  rows.forEach((row, i) => { tree[tree.length - 1 - i] = row.hash; });
  for (let i = tree.length - rows.length - 1; i >= 0; i--) tree[i] = hashPair(tree[2 * i + 1], tree[2 * i + 2]);
  return { root: tree[0], recipients: rows.map((row, i) => {
    let index = tree.length - 1 - i;
    const proof: Hex[] = [];
    while (index > 0) {
      proof.push(tree[index % 2 === 0 ? index - 1 : index + 1]);
      index = Math.floor((index - 1) / 2);
    }
    return { address: row.address, amount: row.amount, fids: row.fids, proof };
  }) };
}
export function vestingAmounts(amount: bigint, claimed: bigint, now: bigint, start: bigint, end: bigint) {
  if (end <= start || claimed < 0n || claimed > amount) throw new Error("Invalid vesting accounting");
  const unlocked = now <= start ? 0n : now >= end ? amount : amount * (now - start) / (end - start);
  return { unlocked, locked: amount - unlocked, available: unlocked > claimed ? unlocked - claimed : 0n };
}

export type AirdropView = {
  recipientRegistration?: "csv" | "not_selected";
  allocationRevision?: "pending" | "applied" | "conflict";
  approvedCsvRoot?: Hex;
  status: "unregistered" | "not_funded" | "mismatch" | "root_pending" | "ready" | "unavailable" | "ineligible";
  reason?: string; token?: Address; symbol?: string; chainId?: number; extension?: Address;
  root?: Hex; expectedRoot?: Hex; admin?: Address; blockTime?: string;
  claimStart?: string; vestingEnd?: string; pool?: string; distributed?: string; burn?: string;
  recipient?: Address; allocation?: string; claimed?: string; available?: string; locked?: string; proof?: Hex[];
  recipientCount?: number; recipients?: (Recipient & { proof: Hex[] })[];
  receipt?: { status: "pending" | "failed" | "confirmed"; hash: Hex };
};
