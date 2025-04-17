export function throttle(callback, delay) {
    let last = 0;
    return function () {
      const now = Date.now();
      if (now - last >= delay) {
        last = now;
        callback();
      }
    };
  }
  