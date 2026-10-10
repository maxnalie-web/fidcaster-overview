// Excerpt from the private FidCaster repository: artifacts/farcaster-client/shared/clanker-csv.ts
// Shown unmodified for review.

import { getAddress, isAddress, type Address } from "viem";
import { POOL_SUPPLY } from "./clanker-airdrop.js";

export const TOKEN_UNIT = 10n ** 18n;
export const CSV_POOL_TOKENS = POOL_SUPPLY / TOKEN_UNIT;
export const CSV_REMAINDER_ADDRESS = "0x000000000000000000000000000000000000dEaD" as Address;
type ExportSnapshot = {
  allocations: Record<string, string>;
  recipientCount: number;
  distributedWei: string;
  burnWei: string;
};
function wei(value: string): bigint {
  if (!/^\d+$/.test(value)) throw new Error("Invalid integer snapshot amount");
  return BigInt(value);
}

/** Validate the actual serialized file, before any export writes. */
export function validateClankerCsv(csv: string) {
  const [header, ...lines] = csv.trim().split(/\r?\n/);
  if (header !== "address,amount" || lines.length !== 301)
    throw new Error("CSV must have address,amount and exactly 301 rows");
  const addresses = new Set<string>();
  let total = 0n;
  for (const line of lines) {
    const fields = line.split(",");
    if (fields.length !== 2 || !isAddress(fields[0].toLowerCase()))
      throw new Error("Invalid CSV recipient address");
    if (!/^\d+$/.test(fields[1]))
      throw new Error("CSV amounts must be whole-token integers, without decimals");
    const key = fields[0].toLowerCase();
    if (addresses.has(key)) throw new Error("Duplicate CSV recipient address");
    addresses.add(key);
    total += BigInt(fields[1]);
  }
  if (total !== CSV_POOL_TOKENS)
    throw new Error("CSV total must be exactly 5000000000 tokens");
}

/** A derived export, never a mutation or recalculation of the financial snapshot. */
export function deriveClankerCsv(snapshot: ExportSnapshot, wallets: Record<string, Address>) {
  const ranked = Object.entries(snapshot.allocations)
    .map(([fid, amount]) => ({ fid, amount: wei(amount) }))
    .sort((a, b) => a.amount === b.amount ? Number(a.fid) - Number(b.fid) : a.amount > b.amount ? -1 : 1);
  if (ranked.length !== 300 || snapshot.recipientCount !== 300 ||
      ranked.some(row => row.amount <= 0n || !Number.isSafeInteger(Number(row.fid)) || Number(row.fid) <= 0))
    throw new Error("Snapshot must contain exactly 300 positive valid FID allocations");
  const originalTotal = ranked.reduce((sum, row) => sum + row.amount, 0n);
  if (originalTotal !== wei(snapshot.distributedWei) || originalTotal + wei(snapshot.burnWei) !== POOL_SUPPLY)
    throw new Error("Snapshot accounting mismatch");

  const allocations: Record<string, string> = {};
  let distributedTokens = 0n;
  const rows = ranked.map(row => {
    const address = wallets[row.fid];
    if (!address || !isAddress(address.toLowerCase()))
      throw new Error(`Recipient wallet unresolved for FID ${row.fid}`);
    const tokens = row.amount / TOKEN_UNIT;
    distributedTokens += tokens;
    allocations[row.fid] = (tokens * TOKEN_UNIT).toString();
    return [getAddress(address.toLowerCase()), tokens.toString()];
  });
  const remainderTokens = CSV_POOL_TOKENS - distributedTokens;
  rows.push([CSV_REMAINDER_ADDRESS, remainderTokens.toString()]);
  const csv = "address,amount\r\n" + rows.map(row => row.join(",")).join("\r\n") + "\r\n";
  validateClankerCsv(csv);
  return {
    csv, allocations,
    distributedWei: (distributedTokens * TOKEN_UNIT).toString(),
    burnWei: (remainderTokens * TOKEN_UNIT).toString(),
    remainder: { address: CSV_REMAINDER_ADDRESS, amount: (remainderTokens * TOKEN_UNIT).toString() },
  };
}
