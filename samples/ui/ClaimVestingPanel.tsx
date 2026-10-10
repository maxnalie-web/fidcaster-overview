// Excerpt from the private FidCaster repository: artifacts/farcaster-client/src/components/launch/ClaimVestingPanel.tsx
// Shown unmodified for review.

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { AirdropView } from "../../../shared/clanker-airdrop";
import "./ClaimVestingPanel.css";

export type ClaimVestingPanelProps = {
  data: AirdropView | null;
  error: string | null;
  busy: boolean;
  transactionStatus: string | null;
  onClaim: () => void;
  onRetry: () => void;
  onBindWallet: () => void;
};

const WEI = 10n ** 18n;
const big = (v?: string): bigint | null => {
  if (v === undefined || !/^\d+$/.test(v)) return null;
  return BigInt(v);
};
// Whole tokens only, never decimals (onchain amounts are 18-decimal wei).
const whole = (v: bigint | null): string => (v === null ? "--" : (v / WEI).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","));
const pad2 = (n: number) => String(n).padStart(2, "0");
const parseTime = (s?: string): number | null => {
  if (!s) return null;
  if (/^\d+$/.test(s)) { const n = Number(s); return n < 1e12 ? n * 1000 : n; }
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
};
const split = (sec: number) => ({ d: Math.floor(sec / 86400), h: Math.floor((sec % 86400) / 3600), m: Math.floor((sec % 3600) / 60), s: sec % 60 });
// Announcements quote UTC, so the panel does too: one date for every reader.
const utcDate = (ms: number) => new Date(ms).toLocaleString("en-US", { timeZone: "UTC", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) + " UTC";
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const art = (name: string) => `${(import.meta.env.BASE_URL || "/").replace(/\/+$/, "")}/launch/${name}`;

function Big({ value, testid }: { value: string; testid: string }) {
  // Sized from the digit count so 3 digits and 11 both fill the line without wrapping.
  return <div className="cv-big" style={{ ["--len" as string]: Math.max(4, value.length) }} data-testid={testid}>{value}</div>;
}

function Clock({ parts }: { parts: number[] }) {
  const labels = ["Days", "Hours", "Min", "Sec"];
  return (
    <div className="cv-clock">
      {parts.map((n, i) => (
        <div key={labels[i]} className="cv-tick"><b data-testid={`text-timer-${i}`}>{pad2(n)}</b><small>{labels[i]}</small></div>
      ))}
    </div>
  );
}

// Drawn after the row in Farcaster's own About screen, so people know exactly what to look for.
function CustodyHelp({ address }: { address: string }) {
  return (
    <div className="cv-help" id="cv-custody-help" data-testid="panel-custody-help">
      <p className="cv-help-title">How to find your custody address</p>
      <ol>
        <li>Open the <strong>Farcaster</strong> app and go to your <strong>profile</strong>.</li>
        <li>Tap <strong>About</strong>.</li>
        <li>Look for <strong>Farcaster custody address</strong>. It should match the address above:</li>
      </ol>
      <div className="cv-mock" aria-label={`Farcaster custody address ${address}`}>
        <b>Farcaster custody address</b>
        <span>
          <code>{short(address)}</code>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" />
          </svg>
        </span>
      </div>
      <p>This wallet owns your FID, so your airdrop is assigned to it. You do not need to connect it: press Claim from any wallet, pay the small gas fee, and the tokens arrive at this custody address.</p>
      <p className="cv-help-warn">FidCaster will never ask for your recovery phrase. Never type it into any website or app to claim.</p>
    </div>
  );
}

function WalletNote({ address }: { address: string }) {
  const [help, setHelp] = useState(false);
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(address).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }).catch(() => {});
  };
  return (
    <section className="cv-wallet" data-testid="section-wallet">
      <div className="cv-wallet-head">
        <h3>Your tokens go to</h3>
        <button type="button" className="cv-help-btn" aria-expanded={help} aria-controls="cv-custody-help"
          onClick={() => setHelp(open => !open)} data-testid="button-custody-help">
          <span aria-hidden="true">?</span>{help ? "Hide guide" : "Guide"}
        </button>
      </div>
      <div className="cv-addr">
        <code data-testid="text-registered-wallet" title={address}>{short(address)}</code>
        <button type="button" onClick={copy} data-testid="button-copy-wallet">{copied ? "Copied" : "Copy"}</button>
      </div>
      <p>Your <strong>Farcaster custody wallet</strong>, the one that owns your FID. You can see it in your Farcaster profile under About.</p>
      <p>You can press Claim from any wallet and it pays the gas. The tokens always arrive at this custody address.</p>
      {help && <CustodyHelp address={address} />}
      <p className="cv-fine" data-testid="text-aggregate-note">If several of your FIDs share this wallet, this is their combined allocation.</p>
    </section>
  );
}

export function ClaimVestingPanel({ data, error, busy, transactionStatus, onClaim, onRetry, onBindWallet }: ClaimVestingPanelProps) {
  const offset = useMemo(() => {
    const b = parseTime(data?.blockTime);
    return b === null ? 0 : b - Date.now();
  }, [data]);
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setTick(Date.now()), 1000); return () => clearInterval(t); }, []);
  const now = tick + offset;

  const alloc = big(data?.allocation);
  const claimed = big(data?.claimed);
  const avail = big(data?.available);
  const locked = big(data?.locked);
  const startMs = parseTime(data?.claimStart);
  const endMs = parseTime(data?.vestingEnd);
  const startIn = startMs !== null && now < startMs ? split(Math.max(0, Math.floor((startMs - now) / 1000))) : null;
  const startText = startIn ? `${startIn.d ? `${startIn.d}d ` : ""}${pad2(startIn.h)}h ${pad2(startIn.m)}m ${pad2(startIn.s)}s` : "";
  const startTimer = startIn ? (
    <p className="cv-opens" role="timer" data-testid="countdown-claim-start" aria-label="Time until claiming opens">Claiming opens in <b>{startText}</b></p>
  ) : null;
  const tx = data?.receipt?.status === "pending" || /pending confirmation|waiting for wallet confirmation|outcome unknown/i.test(transactionStatus ?? "");

  const txLine = (transactionStatus || data?.receipt) ? (
    <p className={data?.receipt?.status === "failed" ? "cv-bad" : "cv-pend"} role="status" data-testid="status-transaction">
      {data?.receipt?.status === "confirmed" ? "Claim transaction confirmed onchain." :
        data?.receipt?.status === "failed" ? "Claim transaction failed. Nothing was withdrawn." :
        tx ? "Transaction pending. Not confirmed yet, nothing is withdrawn until it is." : transactionStatus}
    </p>) : null;

  const wallet = data?.recipient ? <WalletNote address={data.recipient} /> : null;

  const card = (title: string, body: string, testid: string, extra?: ReactNode) => (
    <div className="cv-root" data-testid="panel-claim-vesting">
      <section className="cv-sheet cv-card" data-testid={testid} role="status">
        <img className="cv-brand" src={art("claim-brand.webp")} alt="FidCaster" width={250} height={70} />
        <h2>{title}</h2>
        <p>{body}</p>
        {extra}
        {txLine}
      </section>
      {data?.recipientRegistration === "csv" && wallet ? <div data-testid="state-csv-wallet-registered">{wallet}</div> : null}
    </div>
  );

  if (error) return card("Could not load", `${error}. Nothing has changed on your account.`, "state-error",
    <button type="button" className="cv-btn" onClick={onRetry} data-testid="button-retry">Try again</button>);
  if (!data) return (
    <div className="cv-root" data-testid="panel-claim-vesting">
      <section className="cv-sheet cv-card" data-testid="state-loading" aria-busy="true" role="status">
        <div className="cv-skel" /><div className="cv-skel" /><p>Checking your allocation...</p>
      </section>
    </div>);

  const bind = !data.recipientRegistration && !data.expectedRoot && (data.status === "root_pending" || data.status === "unregistered");
  const bindBtn = bind ? (
    <button type="button" className="cv-btn" disabled={busy} onClick={onBindWallet} data-testid="button-bind-wallet">
      Choose my connected verified wallet
    </button>) : null;
  const bindNote = bind ? "Allocation is frozen soon. Pick your connected verified wallet deliberately before then; it cannot be changed afterwards." : "";
  const retry = <button type="button" className="cv-btn cv-alt" onClick={onRetry} data-testid="button-retry">Retry</button>;

  switch (data.status) {
    case "unavailable": return card("Unavailable", data.reason ?? "Airdrop data is not available right now. Try again shortly.", "state-unavailable", retry);
    case "ineligible": return card("Not eligible", data.reason ?? "This account has no allocation in the airdrop.", "state-ineligible");
    case "not_funded": return card("Not funded yet", data.reason ?? "The airdrop contract has not been funded at token creation. Nothing can be claimed.", "state-not-funded", retry);
    case "mismatch": return card("Settings mismatch", data.reason ?? "The onchain token or airdrop settings differ from what was expected. Claims stay closed.", "state-mismatch", retry);
    case "unregistered": return card("Token setup pending", "The owner has not registered the token contract yet. This is not a wallet-registration problem.", "state-unregistered", <>{bindNote ? <p>{bindNote}</p> : null}{bindBtn}{retry}</>);
    case "root_pending": return card("Airdrop setup pending", data.expectedRoot
      ? "The owner still needs to publish the allocation root onchain. No wallet registration is needed."
      : "The owner still needs to verify and freeze the CSV allocation. Your recipient wallet is already assigned; a finished countdown alone cannot enable Claim.",
      "state-root-pending", <>{startTimer}{bindNote ? <p>{bindNote}</p> : null}{bindBtn}{retry}</>);
    default: break;
  }
  if (alloc === null || alloc <= 0n || claimed === null || locked === null || avail === null || endMs === null) {
    return card("No allocation", data.reason ?? "No claimable allocation was found for this wallet.", "state-no-allocation", retry);
  }

  const withdrawn = alloc > 0n && claimed === alloc;
  const canClaim = avail > 0n && !withdrawn;
  const variant: "claim" | "vesting" | "done" = withdrawn ? "done" : canClaim ? "claim" : "vesting";
  const rem = split(Math.max(0, Math.floor((endMs - now) / 1000)));
  const pct = Number(((alloc - locked) * 100n) / alloc);
  const preStart = startMs !== null && now < startMs;
  const disabled = busy || tx || preStart || !canClaim;
  const label = variant === "claim" ? `Claim ${whole(avail)} tokens` : variant === "vesting" ? "Nothing to claim right now" : "Fully claimed";
  const vestingRule = <p className="cv-rule">Linear vesting until {utcDate(endMs)}</p>;

  const bar = (
    <>
      <div className="cv-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} data-testid="progress-unlocked">
        <span style={{ width: `${pct}%` }} />
      </div>
      <p className="cv-pct" data-testid="text-percent">{pct}% unlocked</p>
    </>
  );

  return (
    <div className="cv-root" data-testid="panel-claim-vesting">
      <section className="cv-sheet" data-testid={`state-${variant}`}>
        <img className="cv-brand" src={art("claim-brand.webp")} alt="FidCaster" width={250} height={70} />

        {variant === "claim" && (<>
          <p className="cv-kicker">Your airdrop</p>
          <Big value={whole(alloc)} testid="text-allocation" />
          <p className="cv-sub">FidCaster tokens</p>
          <div className="cv-box">
            <p className="cv-kicker">Available to claim</p>
            <Big value={whole(avail)} testid="text-available" />
            <div className="cv-pair">
              <span data-testid="text-locked">Locked: {whole(locked)}</span>
              <span data-testid="text-claimed">Claimed: {whole(claimed)}</span>
            </div>
          </div>
          {bar}
          <p className="cv-kicker">Vesting ends in</p>
          <Clock parts={[rem.d, rem.h, rem.m, rem.s]} />
          {vestingRule}
          <div className="cv-cta-row">
            <img className="cv-wallet-art" src={art("claim-wallet.webp")} alt="" width={126} height={148} />
            <button type="button" className="cv-cta" disabled={disabled} onClick={onClaim} aria-label={label} data-testid="button-claim">
              <span data-testid="text-claim-label">{`Claim ${whole(avail)}`}</span>
            </button>
          </div>
        </>)}

        {variant === "vesting" && (<>
          <p className="cv-kicker">Vesting in progress</p>
          <Big value={whole(locked)} testid="text-locked" />
          <p className="cv-sub">Tokens still locked</p>
          <div className="cv-box cv-split">
            <div><small>Total allocation</small><b data-testid="text-allocation">{whole(alloc)}</b></div>
            <div><small>Claimed</small><b data-testid="text-claimed">{whole(claimed)}</b></div>
          </div>
          {bar}
          <p className="cv-kicker">Time remaining</p>
          <Clock parts={[rem.d, rem.h, rem.m, rem.s]} />
          {vestingRule}
          <img className="cv-art" src={art("claim-hourglass.webp")} alt="" width={445} height={134} />
          <p className="cv-note" data-testid="text-available">Available to claim: {whole(avail)}</p>
          <button type="button" className="cv-cta" disabled aria-label={label}>
            {preStart ? <span role="timer" data-testid="countdown-claim-start">Opens in {startText}</span> : "Nothing to claim"}
          </button>
        </>)}

        {variant === "done" && (<>
          <p className="cv-kicker">Withdrawal successful</p>
          <img className="cv-art cv-check" src={art("claim-check.webp")} alt="" width={330} height={176} />
          <Big value={whole(alloc)} testid="text-allocation" />
          <p className="cv-sub">Tokens withdrawn</p>
          <p className="cv-note">Your tokens have been sent to your wallet.</p>
          {bar}
          <p className="cv-note" data-testid="text-available">Remaining to claim: 0</p>
          <button type="button" className="cv-cta" disabled>Fully claimed</button>
        </>)}

        <span className="cv-sr" data-testid="text-state-label">{label}</span>
      </section>

      {wallet}

      <div className="cv-strip" data-testid="section-strip">
        {variant !== "vesting" ? startTimer : null}
        {txLine}
        {variant === "claim" && !preStart && !tx && <p data-testid="text-claim-hint">Available now. Your wallet confirms the claim.</p>}
        {variant === "vesting" && !preStart && <p data-testid="text-vesting-hint">More tokens become available as vesting progresses.</p>}
        {variant === "done" && <p data-testid="text-done-hint">All {whole(alloc)} tokens claimed onchain.</p>}
        <button type="button" className="cv-btn cv-alt" disabled={busy} onClick={onRetry} data-testid="button-refresh-status">Refresh status</button>
        {bindBtn}
      </div>
    </div>
  );
}

export default ClaimVestingPanel;
