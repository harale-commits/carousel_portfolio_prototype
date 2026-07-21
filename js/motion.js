/**
 * GiGi / Pontifex-matched motion:
 * Lenis lerp + soft cubic ease + snappy UI springs (GSAP CustomEase).
 */
(function initMotion(global) {
  const EASE_CSS = "cubic-bezier(0.25, 0.4, 0.25, 1)";
  const REVEAL_DURATION = 0.8;
  const SNAP_DURATION = 1.0;
  const UI_DURATION = 0.45;

  let lenis = null;
  let tickerFn = null;
  let reduced = false;

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function registerEases() {
    if (typeof CustomEase === "undefined" || typeof gsap === "undefined") return;
    try {
      CustomEase.create("gigi", "0.25,0.4,0.25,1");
    } catch (_) {}
    try {
      CustomEase.create("gigiInOut", "0.45,0.05,0.55,0.95");
    } catch (_) {}
  }

  function ease() {
    return typeof CustomEase !== "undefined" ? "gigi" : "power3.out";
  }

  function easeInOut() {
    return typeof CustomEase !== "undefined" ? "gigiInOut" : "power2.inOut";
  }

  /** Soft overshoot close to Framer spring stiffness 400 / damping 17 */
  function springSnap() {
    return "back.out(1.7)";
  }

  /** Softer UI spring ~ stiffness 300 / damping 30 */
  function springUi() {
    return "back.out(1.2)";
  }

  function getLenis() {
    return lenis;
  }

  function stop() {
    lenis?.stop?.();
  }

  function start() {
    if (reduced) return;
    lenis?.start?.();
  }

  /* Approximate cubic-bezier(0.25, 0.4, 0.25, 1) for Lenis scrollTo */
  function cubicBezierEase(t) {
    // Sample y for cubic-bezier(0.25, 0.4, 0.25, 1) via Newton on x
    const x1 = 0.25;
    const y1 = 0.4;
    const x2 = 0.25;
    const y2 = 1;
    let x = t;
    for (let i = 0; i < 5; i++) {
      const cx = 3 * x1;
      const bx = 3 * (x2 - x1) - cx;
      const ax = 1 - cx - bx;
      const current = ((ax * x + bx) * x + cx) * x - t;
      const dx = (3 * ax * x + 2 * bx) * x + cx;
      if (Math.abs(dx) < 1e-6) break;
      x -= current / dx;
    }
    const cy = 3 * y1;
    const by = 3 * (y2 - y1) - cy;
    const ay = 1 - cy - by;
    return ((ay * x + by) * x + cy) * x;
  }

  function scrollTo(y, opts = {}) {
    if (reduced || !lenis) {
      window.scrollTo(0, y);
      return;
    }
    lenis.scrollTo(y, {
      offset: 0,
      duration: opts.duration ?? SNAP_DURATION,
      easing: cubicBezierEase,
      immediate: !!opts.immediate,
    });
  }

  function init() {
    reduced = prefersReducedMotion();
    registerEases();

    document.documentElement.style.setProperty("--ease-gigi", EASE_CSS);
    document.documentElement.style.setProperty("--motion-reveal", `${REVEAL_DURATION}s`);
    document.documentElement.style.setProperty("--motion-ui", `${UI_DURATION}s`);

    if (reduced || typeof Lenis === "undefined") {
      document.documentElement.classList.add("lenis-disabled");
      return;
    }

    document.documentElement.classList.remove("lenis-disabled");

    lenis = new Lenis({
      lerp: 0.18,
      duration: 0.9,
      smoothWheel: true,
      wheelMultiplier: 1.15,
      touchMultiplier: 1.6,
      infinite: false,
      autoRaf: false,
      syncTouch: false,
    });

    if (typeof ScrollTrigger !== "undefined") {
      lenis.on("scroll", ScrollTrigger.update);
    }

    tickerFn = (time) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tickerFn);
    gsap.ticker.lagSmoothing(0);

    document.documentElement.classList.add("lenis");
  }

  function destroy() {
    if (tickerFn && typeof gsap !== "undefined") {
      gsap.ticker.remove(tickerFn);
      tickerFn = null;
    }
    lenis?.destroy?.();
    lenis = null;
  }

  global.Motion = {
    EASE_CSS,
    REVEAL_DURATION,
    SNAP_DURATION,
    UI_DURATION,
    ease,
    easeInOut,
    springSnap,
    springUi,
    init,
    destroy,
    getLenis,
    stop,
    start,
    scrollTo,
    registerEases,
  };
})(window);
