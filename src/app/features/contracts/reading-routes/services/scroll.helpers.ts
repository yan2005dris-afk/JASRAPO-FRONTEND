/**
 * Tiny DOM helper for resetting scroll position on the next microtask.
 *
 * The original workspace component had three near-identical blocks that
 * called `queueMicrotask` and then `document.querySelector('.contracts-scroll-area')`
 * to reset the scroll top. That pattern had two problems:
 *
 *  1. It relied on a global query selector, which silently breaks the day
 *     someone renames the CSS class or instantiates the component twice.
 *  2. The DOM lookup happened on every page change instead of being cached.
 *
 * This helper takes the actual `HTMLElement` reference (resolved once via
 * `@ViewChild`) and resets its scroll position on the next microtask, so
 * Angular's change detection has finished updating the DOM first.
 */
export function resetScrollNextMicrotask(element: HTMLElement | null | undefined): void {
  if (!element) return;
  queueMicrotask(() => {
    element.scrollTop = 0;
  });
}