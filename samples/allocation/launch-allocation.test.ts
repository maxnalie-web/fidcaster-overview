// Excerpt from the private FidCaster repository: artifacts/farcaster-client/server/launch-allocation.test.ts
// Shown unmodified for review.

import { test } from "node:test";
import assert from "node:assert/strict";
import { AIRDROP_POOL_WEI, calculateLaunchAllocation, tokenDecimal, LAUNCH_AT } from "./launch-allocation.js";

test("launch is three calendar days later at 20:00 Iran, expressed in UTC", () => {
  assert.equal(LAUNCH_AT, "2026-10-09T16:30:00.000Z");
  const iranTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tehran", dateStyle: "short", timeStyle: "short",
  }).format(new Date(LAUNCH_AT));
  assert.equal(iranTime, "09/10/2026, 20:00");
});

test("uses all-user denominator and burns unselected shares without redistribution", () => {
  const snapshot = calculateLaunchAllocation([
    { fid: 1, total_points: 100, eligible: true },
    { fid: 2, total_points: 300, eligible: false },
  ]);
  assert.equal(snapshot.allocations["1"], (AIRDROP_POOL_WEI / 4n).toString());
  assert.equal(snapshot.allocations["2"], undefined);
  assert.equal(BigInt(snapshot.distributedWei) + BigInt(snapshot.burnWei), AIRDROP_POOL_WEI);
  assert.equal(tokenDecimal(BigInt(snapshot.allocations["1"])), "1250000000.000000000000000000");
});

test("ties select exactly 300 recipients deterministically and do not mutate inputs", () => {
  const rows = Array.from({ length: 302 }, (_, n) => ({ fid: 302 - n, total_points: 10, eligible: true }));
  const snapshot = calculateLaunchAllocation(rows);
  assert.equal(snapshot.recipientCount, 300);
  assert.ok(snapshot.allocations["300"]);
  assert.equal(snapshot.allocations["301"], undefined);
  assert.equal(rows[0].fid, 302);
  assert.equal(BigInt(snapshot.distributedWei) + BigInt(snapshot.burnWei), AIRDROP_POOL_WEI);
});

test("empty or malformed snapshots fail explicitly", () => {
  assert.throws(() => calculateLaunchAllocation([]));
  assert.throws(() => calculateLaunchAllocation([{ fid: 1, total_points: 1.1, eligible: true }]));
  assert.throws(() => calculateLaunchAllocation([
    { fid: 1, total_points: 1, eligible: true }, { fid: 1, total_points: 2, eligible: true },
  ]));
});
