// Excerpt from the private FidCaster repository: artifacts/farcaster-client/server/launch-allocation.ts
// Shown unmodified for review.

/** Integer-only token accounting. No floating-point rounding of entitlements. */
export const AIRDROP_POOL_WEI = 5_000_000_000n * 10n ** 18n;
// 9 October, 20:00 Asia/Tehran (UTC+03:30). One absolute deadline for everyone.
export const LAUNCH_AT = "2026-10-09T16:30:00.000Z";

export interface LaunchBalance {
  fid: number;
  total_points: number;
  eligible: boolean;
}

export function tokenDecimal(wei: bigint): string {
  const scale = 10n ** 18n;
  return `${wei / scale}.${(wei % scale).toString().padStart(18, "0")}`;
}

export function calculateLaunchAllocation(balances: LaunchBalance[]) {
  const rows = balances.filter(row => row.total_points > 0);
  const seen = new Set<number>();
  for (const row of rows) {
    if (!Number.isSafeInteger(row.fid) || row.fid <= 0 ||
        !Number.isSafeInteger(row.total_points) || seen.has(row.fid)) {
      throw new Error("Invalid or duplicate snapshot balance");
    }
    seen.add(row.fid);
  }
  const totalPoints = rows.reduce((sum, row) => sum + BigInt(row.total_points), 0n);
  if (totalPoints === 0n) throw new Error("Cannot finalize an empty points snapshot");
  // Existing Pass eligibility is preserved. Equal balances resolve by FID,
  // so a tie at the boundary never expands the recipient count past 300.
  const recipients = rows.filter(row => row.eligible)
    .sort((a, b) => b.total_points - a.total_points || a.fid - b.fid)
    .slice(0, 300);
  const allocations: Record<string, string> = {};
  let distributedWei = 0n;
  for (const row of recipients) {
    const wei = AIRDROP_POOL_WEI * BigInt(row.total_points) / totalPoints;
    allocations[String(row.fid)] = wei.toString();
    distributedWei += wei;
  }
  return {
    allocations,
    totalPoints: totalPoints.toString(),
    recipientCount: recipients.length,
    distributedWei: distributedWei.toString(),
    // Unselected shares and sub-wei rounding dust remain in the burn budget.
    burnWei: (AIRDROP_POOL_WEI - distributedWei).toString(),
  };
}
