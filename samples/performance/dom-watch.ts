// Excerpt from the private FidCaster repository: artifacts/farcaster-client/src/lib/dom-watch.ts
// Shown unmodified for review.

/**
 * Run `fn` after the DOM under `target` changes, at most once per frame.
 *
 * About a dozen startup modules (embed cards, wallet USD entry, swap picker,
 * mobile polish, drawer motion, live refresh...) each watched the whole
 * document with a MutationObserver and re-scanned it on every change. While a
 * feed renders or scrolls React mutates the DOM many times a frame, so the
 * same document-wide queries ran dozens of times between two paints. One run
 * per frame is still before the frame is painted, so nothing flickers, and a
 * hidden tab (no frames) does no work at all.
 */
export function watchDom(
  fn: () => void,
  target: Node = document.body,
  options: MutationObserverInit = { childList: true, subtree: true },
): () => void {
  let frame = 0;
  const run = () => { frame = 0; fn(); };
  const observer = new MutationObserver(() => {
    if (!frame) frame = window.requestAnimationFrame(run);
  });
  observer.observe(target, options);
  return () => {
    observer.disconnect();
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
  };
}

/** setInterval that does nothing while the page is hidden. The backstop
 *  timers here only re-check the visible UI, so a phone in a pocket should not
 *  be woken several times a second to do it. */
export function visibleInterval(fn: () => void, ms: number): () => void {
  const id = window.setInterval(() => { if (document.visibilityState === "visible") fn(); }, ms);
  return () => window.clearInterval(id);
}
