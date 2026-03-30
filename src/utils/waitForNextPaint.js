export function waitForNextPaint() {
  return new Promise((resolve) => {
    if (
      typeof window === 'undefined'
      || typeof window.requestAnimationFrame !== 'function'
    ) {
      setTimeout(resolve, 0);
      return;
    }

    // Double RAF ensures a paint can happen between state update and heavy work.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

