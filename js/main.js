gsap.registerPlugin(ScrollTrigger, MotionPathPlugin, ScrollToPlugin);

const items = gsap.utils.toArray(".carousel-item");
const total = items.length;
const stage = document.querySelector(".carousel-stage");
const arcLight = document.getElementById("arc-light");

const ARC = { x0: 60, y0: 380, cx: 500, cy: 40, x1: 940, y1: 380 };
const SPACING = 1 / (total - 1);
const PERIOD = SPACING * total;

const CONFIG = {
  desktop: {
    scrollPerCard: 140,
    scaleMax: 1.08,
    scaleMin: 0.72,
    opacityMin: 0.3,
    maxVisibleRel: 3,
    parallaxX: 14,
    parallaxY: 8,
  },
  mobile: {
    scrollPerCard: 130,
    scaleMax: 1,
    scaleMin: 0.55,
    opacityMin: 0.12,
    maxVisibleRel: 1,
    glowOnlyRel: true,
    peerScale: 0.62,
    peerOpacity: 0.22,
    peerPush: 0.52,
    parallaxX: 2,
    parallaxY: 2,
  },
  small: {
    scrollPerCard: 115,
    scaleMax: 1,
    scaleMin: 0.5,
    opacityMin: 0.1,
    maxVisibleRel: 1,
    glowOnlyRel: true,
    peerScale: 0.58,
    peerOpacity: 0.18,
    peerPush: 0.56,
    parallaxX: 2,
    parallaxY: 2,
  },
};

let config = CONFIG.desktop;
let carouselTrigger = null;
let matchMediaInstance = null;
let lastCenterIndex = -1;
let cachedStageMetrics = null;
let mobileStep = 0;
let mobileNavigating = false;
let mobileNavCleanup = null;

function getMobileScrollPerCard() {
  return Math.round(window.innerHeight * 0.95);
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isMobileCarousel() {
  return window.innerWidth <= 900;
}

function invalidateStageMetrics() {
  cachedStageMetrics = null;
}

function getStageMetrics() {
  if (cachedStageMetrics) return cachedStageMetrics;

  const width = stage.offsetWidth;
  const height = stage.offsetHeight;
  const vb = stage.querySelector(".arc-svg").viewBox.baseVal;
  cachedStageMetrics = {
    scaleX: width / vb.width,
    scaleY: height / vb.height,
    stageH: height,
    cardW: items[0].offsetWidth,
    cardH: items[0].offsetHeight,
  };
  return cachedStageMetrics;
}

function setItemFocusState(item, state) {
  if (item.dataset.focusState === state) return;
  item.dataset.focusState = state;
  item.classList.remove("is-glow-peek", "is-center-focus");
  if (state === "center") item.classList.add("is-center-focus");
  if (state === "glow") item.classList.add("is-glow-peek");
}

function getActiveConfig() {
  const w = window.innerWidth;
  if (w <= 480) return CONFIG.small;
  if (w <= 900) return CONFIG.mobile;
  return CONFIG.desktop;
}

function getArcPoint(t) {
  const { x0, y0, cx, cy, x1, y1 } = ARC;
  const mt = 1 - t;
  const x = mt * mt * x0 + 2 * mt * t * cx + t * t * x1;
  const y = mt * mt * y0 + 2 * mt * t * cy + t * t * y1;
  const dx = 2 * mt * (cx - x0) + 2 * t * (x1 - cx);
  const dy = 2 * mt * (cy - y0) + 2 * t * (y1 - cy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  return { x, y, angle };
}

function wrapPathT(t) {
  const margin = SPACING * 0.6;
  while (t < -margin) t += PERIOD;
  while (t > 1 + margin) t -= PERIOD;
  return t;
}

function getScaleForPosition(t) {
  const dist = Math.abs(t - 0.5) / 0.5;
  return gsap.utils.mapRange(0, 1, config.scaleMax, config.scaleMin, dist);
}

function getOpacityForPosition(t) {
  const dist = Math.abs(t - 0.5) / 0.5;
  return gsap.utils.mapRange(0, 1, 1, config.opacityMin, dist);
}

function getRelativeIndex(i, center, n) {
  let rel = i - center;
  const limit = (n - 1) / 2;
  if (rel > limit) rel -= n;
  if (rel < -limit) rel += n;
  return rel;
}

function getScrollSteps(scrollPos, start) {
  return (scrollPos - start) / config.scrollPerCard;
}

function getWrappedCardIndex(step) {
  return ((step % total) + total) % total;
}

function getMobileScrollY(step) {
  const wrapped = getWrappedCardIndex(step);
  return carouselTrigger.start + wrapped * config.scrollPerCard;
}

function canNavigateMobile() {
  if (!carouselTrigger || mobileNavigating) return false;
  const y = window.scrollY;
  return y >= carouselTrigger.start - 4 && y <= carouselTrigger.end + 4;
}

function goToMobileStep(step, duration = 0.38) {
  if (!carouselTrigger || mobileNavigating) return;

  const prevStep = mobileStep;
  mobileStep = step;
  if (mobileStep === prevStep) return;

  mobileNavigating = true;
  gsap.killTweensOf(mobileOffsetProxy);

  const fromOffset = prevStep * SPACING;
  const toOffset = mobileStep * SPACING;
  mobileOffsetProxy.offset = fromOffset;

  gsap.to(mobileOffsetProxy, {
    offset: toOffset,
    duration,
    ease: "power2.out",
    onUpdate: () => positionAll(mobileOffsetProxy.offset),
    onComplete: () => {
      positionAll(mobileStep * SPACING);
      window.scrollTo(0, getMobileScrollY(mobileStep));
      mobileNavigating = false;
    },
  });
}

const mobileOffsetProxy = { offset: 0 };

function destroyMobileCardNav() {
  if (mobileNavCleanup) {
    mobileNavCleanup();
    mobileNavCleanup = null;
  }
}

function initMobileCardNav() {
  destroyMobileCardNav();

  if (!isMobileCarousel()) return;

  const heroPin = document.querySelector(".hero-pin");
  if (!heroPin) return;

  let touchStartY = 0;
  let touchStartTime = 0;
  let touchActive = false;

  const canNavigate = () => canNavigateMobile();

  const onTouchStart = (e) => {
    if (!canNavigate()) return;
    touchActive = true;
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
  };

  const onTouchMove = (e) => {
    if (!canNavigateMobile()) return;
    e.preventDefault();
  };

  const onTouchEnd = (e) => {
    if (!touchActive || !canNavigate()) {
      touchActive = false;
      return;
    }

    touchActive = false;
    const dy = touchStartY - e.changedTouches[0].clientY;
    const elapsed = Date.now() - touchStartTime;

    if (Math.abs(dy) < 40) return;

    const direction = dy > 0 ? 1 : -1;
    goToMobileStep(mobileStep + direction);
  };

  const onWheel = (e) => {
    if (!canNavigate()) return;
    e.preventDefault();
    if (Math.abs(e.deltaY) < 8) return;
    const direction = e.deltaY > 0 ? 1 : -1;
    goToMobileStep(mobileStep + direction);
  };

  heroPin.addEventListener("touchstart", onTouchStart, { passive: true });
  heroPin.addEventListener("touchmove", onTouchMove, { passive: false });
  heroPin.addEventListener("touchend", onTouchEnd, { passive: true });
  window.addEventListener("wheel", onWheel, { passive: false });

  mobileNavCleanup = () => {
    heroPin.removeEventListener("touchstart", onTouchStart);
    heroPin.removeEventListener("touchmove", onTouchMove);
    heroPin.removeEventListener("touchend", onTouchEnd);
    window.removeEventListener("wheel", onWheel);
  };
}

function placeItem(item, t, rel, metrics) {
  const visualBg = item.querySelector(".card-visual-bg");
  const mobileFocus = isMobileCarousel() && config.glowOnlyRel;
  const { scaleX, scaleY, stageH, cardW, cardH } = metrics;

  if (Math.abs(rel) > config.maxVisibleRel) {
    gsap.set(item, { autoAlpha: 0, force3D: true });
    setItemFocusState(item, "none");
    return;
  }

  if (t < -0.05 || t > 1.05) {
    gsap.set(item, { autoAlpha: 0, force3D: true });
    setItemFocusState(item, "none");
    return;
  }

  const clamped = gsap.utils.clamp(0, 1, t);
  const point = getArcPoint(clamped);

  let scale = getScaleForPosition(clamped);
  let opacity = getOpacityForPosition(clamped);
  let rotation = point.angle;
  let xOffset = 0;

  if (mobileFocus) {
    if (rel === 0) {
      scale = config.scaleMax;
      opacity = 1;
      rotation = 0;
      setItemFocusState(item, "center");
    } else if (Math.abs(rel) === 1) {
      scale = config.peerScale;
      opacity = config.peerOpacity;
      rotation = rel * 7;
      xOffset = rel * cardW * config.peerPush;
      setItemFocusState(item, "glow");
    }
  } else {
    setItemFocusState(item, "none");
  }

  const parallaxX = mobileFocus
    ? 0
    : gsap.utils.clamp(-config.parallaxX, config.parallaxX, -rotation * 0.4);
  const parallaxY = mobileFocus
    ? 0
    : gsap.utils.clamp(-config.parallaxY, config.parallaxY, (clamped - 0.5) * -18);

  const yPos = mobileFocus
    ? (stageH + cardH * scale) / 2 - cardH
    : point.y * scaleY;

  gsap.set(item, {
    x: point.x * scaleX - cardW / 2 + xOffset,
    y: yPos,
    rotation,
    transformOrigin: "50% 100%",
    scale,
    autoAlpha: opacity,
    zIndex: rel === 0 ? 3 : 1,
    force3D: true,
  });

  if (visualBg && !mobileFocus) {
    gsap.set(visualBg, {
      x: parallaxX,
      y: parallaxY,
      rotation: -rotation * 0.12,
      scale: 1.12,
      force3D: true,
    });
  } else if (visualBg) {
    gsap.set(visualBg, { x: 0, y: 0, rotation: 0, scale: 1, clearProps: "transform" });
  }
}

function updateGlowHue(index) {
  const card = items[index]?.querySelector(".card");
  const hue = card?.style.getPropertyValue("--hue").trim() || "250";
  document.documentElement.style.setProperty("--glow-hue", hue);
}

function updateArcLight(t) {
  if (!arcLight) return;
  const point = getArcPoint(t);
  arcLight.setAttribute("cx", point.x);
  arcLight.setAttribute("cy", point.y);

  const r = window.innerWidth <= 480 ? 4 : window.innerWidth <= 900 ? 4.5 : 5;
  arcLight.setAttribute("r", r);
}

function positionAll(offset) {
  invalidateStageMetrics();
  const steps = offset / SPACING;
  const centerIndex = ((Math.round(steps) % total) + total) % total;
  const frac = steps - Math.round(steps);
  const centerT = 0.5 - frac * SPACING;
  const metrics = getStageMetrics();
  const mobile = isMobileCarousel();

  items.forEach((item, i) => {
    const rel = getRelativeIndex(i, centerIndex, total);
    placeItem(item, wrapPathT(centerT + rel * SPACING), rel, metrics);
  });

  if (centerIndex !== lastCenterIndex) {
    updateActiveState(centerIndex);
    updateGlowHue(centerIndex);
    lastCenterIndex = centerIndex;
  }

  if (!mobile) {
    updateArcLight(gsap.utils.clamp(0, 1, centerT));
  }

  orbitCenterT = gsap.utils.clamp(0, 1, centerT);
  updateOrbitIfVisible(centerIndex, orbitCenterT);
}

function updateActiveState(index) {
  const prevActive = items.findIndex((item) => item.classList.contains("is-active"));
  items.forEach((item, i) => {
    item.classList.toggle("is-active", i === index);
  });
  if (prevActive !== -1 && prevActive !== index) hideOrbit();
  if (prevActive !== index) animateCardActivation(index, prevActive);
}

function getOffsetFromScroll(scrollPos, start) {
  return getScrollSteps(scrollPos, start) * SPACING;
}

function initArcDraw() {
  const paths = ["#arc-track-outer", "#arc-track-inner"];

  paths.forEach((selector) => {
    const path = document.querySelector(selector);
    if (!path) return;
    const length = path.getTotalLength();
    gsap.set(path, {
      strokeDasharray: length,
      strokeDashoffset: length,
    });
  });

  if (prefersReducedMotion()) {
    gsap.set(paths, { strokeDashoffset: 0 });
    return;
  }

  gsap
    .timeline({ delay: 0.6 })
    .to("#arc-track-outer", {
      strokeDashoffset: 0,
      duration: 1.6,
      ease: "power2.inOut",
    })
    .to(
      "#arc-track-inner",
      {
        strokeDashoffset: 0,
        duration: 1.2,
        ease: "power2.inOut",
      },
      "-=1.1"
    );
}

function initCarousel() {
  if (carouselTrigger) {
    carouselTrigger.kill();
    carouselTrigger = null;
  }

  destroyMobileCardNav();

  config = getActiveConfig();
  const mobile = isMobileCarousel();

  if (mobile) {
    config.scrollPerCard = getMobileScrollPerCard();
  }

  invalidateStageMetrics();
  lastCenterIndex = -1;
  mobileStep = 0;
  mobileNavigating = false;
  stage?.classList.toggle("carousel-stage--mobile-focus", mobile);
  document.body.classList.toggle("is-mobile-perf", mobile);

  if (prefersReducedMotion()) {
    positionAll(0);
    return;
  }

  const scrollDistance = mobile
    ? config.scrollPerCard * (total + 4)
    : window.innerHeight * 50;
  const stepsInScroll = scrollDistance / config.scrollPerCard;

  if (mobile) {
    mobileOffsetProxy.offset = 0;

    carouselTrigger = ScrollTrigger.create({
      trigger: ".hero",
      start: "top top",
      end: `+=${scrollDistance}`,
      pin: ".hero-pin",
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onRefresh: () => {
        invalidateStageMetrics();
        config.scrollPerCard = getMobileScrollPerCard();
      },
    });

    initMobileCardNav();
    positionAll(0);
    return;
  }

  carouselTrigger = ScrollTrigger.create({
    trigger: ".hero",
    start: "top top",
    end: `+=${scrollDistance}`,
    pin: ".hero-pin",
    scrub: 0.5,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    snap: {
      snapTo: (progress) => Math.round(progress * stepsInScroll) / stepsInScroll,
      duration: { min: 0.15, max: 0.45 },
      delay: 0.06,
      ease: "power2.out",
    },
    onUpdate: (self) => {
      positionAll(getOffsetFromScroll(self.scroll(), self.start));
    },
  });

  positionAll(
    carouselTrigger
      ? getOffsetFromScroll(carouselTrigger.scroll(), carouselTrigger.start)
      : 0
  );
}

function initHero() {
  if (prefersReducedMotion()) return;

  gsap.from(".hero-eyebrow, .hero-title-line, .hero-title-accent", {
    y: 20,
    autoAlpha: 0,
    duration: 0.9,
    stagger: 0.1,
    ease: "power3.out",
    delay: 0.15,
  });
}

function initResponsive() {
  if (matchMediaInstance) {
    matchMediaInstance.revert();
  }

  matchMediaInstance = gsap.matchMedia();
  matchMediaInstance.add(
    {
      isSmall: "(max-width: 480px)",
      isMobile: "(max-width: 900px)",
      isDesktop: "(min-width: 769px)",
    },
    () => {
      initCarousel();
      ScrollTrigger.refresh();
    }
  );
}

window.addEventListener("load", () => {
  initHero();
  initArcDraw();
  initServicesOrbit();
  initResponsive();
  initCardEffects();
  ScrollTrigger.refresh();
});

window.addEventListener("resize", () => {
  invalidateStageMetrics();
  ScrollTrigger.refresh();
  if (carouselTrigger) {
    config = getActiveConfig();
    stage?.classList.toggle("carousel-stage--mobile-focus", isMobileCarousel());
    document.body.classList.toggle("is-mobile-perf", isMobileCarousel());
    positionAll(getOffsetFromScroll(carouselTrigger.scroll(), carouselTrigger.start));
  }
});
