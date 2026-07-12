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
    scaleMax: 1,
    scaleMin: 0.78,
    opacityMin: 0.38,
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
let serviceViewScrollLocked = false;
let lockedScrollY = 0;

function isServiceViewActive() {
  return !!document.querySelector(".carousel-stage.is-service-view");
}

function lockServiceViewScroll() {
  if (serviceViewScrollLocked) return;
  serviceViewScrollLocked = true;
  lockedScrollY = window.scrollY;
  document.body.classList.add("is-service-view-locked");
}

function unlockServiceViewScroll() {
  if (!serviceViewScrollLocked) return;
  serviceViewScrollLocked = false;
  document.body.classList.remove("is-service-view-locked");
}

function onServiceViewScrollBlock(e) {
  if (!serviceViewScrollLocked) return;
  e.preventDefault();
}

function onServiceViewScrollRestore() {
  if (!serviceViewScrollLocked) return;
  if (Math.abs(window.scrollY - lockedScrollY) > 1) {
    window.scrollTo(0, lockedScrollY);
  }
}
let mobileNavCleanup = null;
let glowHueProxy = { value: 280 };
let glowHueTween = null;
let desktopRevealPlayed = false;
let heroIntroPlayed = false;
const progressDots = gsap.utils.toArray(".carousel-progress__dot");

function getMobileScrollPerCard() {
  return Math.round(window.innerHeight * 0.95);
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isHeroIntroPending() {
  return !heroIntroPlayed && !prefersReducedMotion();
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
  const cardEl = items[0].querySelector(".card");
  const cardStyle = getComputedStyle(cardEl);
  const cardMarginTop = parseFloat(cardStyle.marginTop) || 0;
  cachedStageMetrics = {
    scaleX: width / vb.width,
    scaleY: height / vb.height,
    stageH: height,
    cardW: items[0].offsetWidth,
    cardH: cardEl.offsetHeight + cardMarginTop,
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
  if (document.querySelector(".carousel-stage.is-service-view")) return false;
  const y = window.scrollY;
  return y >= carouselTrigger.start - 4 && y <= carouselTrigger.end + 4;
}

function goToMobileStep(step, duration = 0.22) {
  if (!carouselTrigger || mobileNavigating || isServiceViewActive()) return;

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
      mobileNavigating = false;
      positionAll(mobileStep * SPACING);
      window.scrollTo(0, getMobileScrollY(mobileStep));
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

  let touchStartX = 0;
  let touchStartY = 0;
  let touchActive = false;

  const SWIPE_THRESHOLD = 40;

  const canNavigate = () => canNavigateMobile();

  const onTouchStart = (e) => {
    if (!canNavigate()) return;
    touchActive = true;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
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
    const touch = e.changedTouches[0];
    const dx = touchStartX - touch.clientX;
    const dy = touchStartY - touch.clientY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (Math.max(absX, absY) < SWIPE_THRESHOLD) return;

    const direction = absX > absY
      ? (dx > 0 ? 1 : -1)
      : (dy > 0 ? 1 : -1);

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
  const mobileFocus = !!config.glowOnlyRel;
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
    if (rel === 0) {
      scale = 1;
      opacity = 1;
      rotation = 0;
    }
  }

  const yPos = mobileFocus
    ? (stageH + cardH * scale) / 2 - cardH
    : point.y * scaleY;

  gsap.set(item, {
    x: Math.round(point.x * scaleX - cardW / 2 + xOffset),
    y: Math.round(yPos),
    rotation: mobileFocus ? 0 : Math.round(rotation * 10) / 10,
    transformOrigin: "50% 100%",
    scale,
    autoAlpha: isHeroIntroPending() ? 0 : opacity,
    zIndex: rel === 0 ? 3 : 1,
    force3D: rel !== 0,
  });
}

function triggerHueSweep(index) {
  const sweep = items[index]?.querySelector(".file-sweep");
  if (!sweep || prefersReducedMotion()) return;

  sweep.classList.remove("is-sweeping");
  requestAnimationFrame(() => {
    sweep.classList.add("is-sweeping");
  });
}

function updateGlowHue(index) {
  const card = items[index]?.querySelector(".card");
  const hue = parseFloat(card?.style.getPropertyValue("--hue")) || 280;

  if (glowHueTween) glowHueTween.kill();
  glowHueTween = gsap.to(glowHueProxy, {
    value: hue,
    duration: 0.7,
    ease: "power2.out",
    onUpdate: () => {
      document.documentElement.style.setProperty("--glow-hue", glowHueProxy.value);
    },
  });

  triggerHueSweep(index);
}

function updateProgressDots(index) {
  progressDots.forEach((dot, i) => {
    const active = i === index;
    dot.classList.toggle("is-active", active);
    dot.setAttribute("aria-current", active ? "true" : "false");
  });
}

function navigateToCard(index) {
  if (!carouselTrigger || index < 0 || index >= total) return;
  if (document.querySelector(".carousel-stage.is-service-view")) return;

  if (isMobileCarousel()) {
    const current = lastCenterIndex >= 0 ? lastCenterIndex : 0;
    let delta = index - current;
    if (delta > total / 2) delta -= total;
    if (delta < -total / 2) delta += total;
    goToMobileStep(mobileStep + delta);
    return;
  }

  const target = carouselTrigger.start + index * config.scrollPerCard;
  if (prefersReducedMotion()) {
    window.scrollTo(0, target);
    return;
  }

  gsap.to(window, {
    scrollTo: target,
    duration: 0.65,
    ease: "power2.inOut",
  });
}

function initProgressNav() {
  progressDots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const index = parseInt(dot.dataset.index, 10);
      if (!Number.isNaN(index)) navigateToCard(index);
    });
  });
}

function initKeyboardNav() {
  window.addEventListener("keydown", (e) => {
    if (document.querySelector(".carousel-stage.is-service-view")) return;
    if (isMobileCarousel()) {
      if (!canNavigateMobile()) return;
    } else if (!carouselTrigger?.isActive) {
      return;
    }
    if (e.target.closest("input, textarea, select, a[href^='mailto']")) return;

    const current = lastCenterIndex >= 0 ? lastCenterIndex : 0;
    let next = current;

    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      next = (current + 1) % total;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      next = (current - 1 + total) % total;
    } else {
      return;
    }

    e.preventDefault();
    navigateToCard(next);
  });
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
  if (isServiceViewActive()) return;

  const steps = offset / SPACING;
  const centerIndex = ((Math.round(steps) % total) + total) % total;
  const frac = steps - Math.round(steps);
  const centerT = 0.5 - frac * SPACING;
  const metrics = getStageMetrics();
  const mobile = !!config.glowOnlyRel;

  items.forEach((item, i) => {
    const rel = getRelativeIndex(i, centerIndex, total);
    placeItem(item, wrapPathT(centerT + rel * SPACING), rel, metrics);
  });

  if (centerIndex !== lastCenterIndex) {
    updateActiveState(centerIndex);
    updateGlowHue(centerIndex);
    updateProgressDots(centerIndex);
    lastCenterIndex = centerIndex;
  }

  if (!mobile) {
    updateArcLight(gsap.utils.clamp(0, 1, centerT));
  }

  stage?.classList.add("is-ready");
}

function updateActiveState(index) {
  const prevActive = items.findIndex((item) => item.classList.contains("is-active"));
  items.forEach((item, i) => {
    item.classList.toggle("is-active", i === index);
  });
  if (prevActive !== index) animateCardActivation(index, prevActive);
}

function getOffsetFromScroll(scrollPos, start) {
  return getScrollSteps(scrollPos, start) * SPACING;
}

function initArcDraw() {
  if (prefersReducedMotion()) {
    gsap.set(["#arc-track-outer", "#arc-track-inner"], { strokeDashoffset: 0 });
  }
}

function splitHeroTitleWords() {
  const accent = document.querySelector(".hero-title-accent");
  if (!accent || accent.dataset.split === "true") {
    return accent ? accent.querySelectorAll(".hero-title-word") : [];
  }

  const text = accent.textContent.trim();
  accent.dataset.split = "true";
  accent.innerHTML = text
    .split(/\s+/)
    .map((word) => `<span class="hero-title-word">${word}</span>`)
    .join(" ");

  return accent.querySelectorAll(".hero-title-word");
}

function prepHeroIntro() {
  if (prefersReducedMotion() || heroIntroPlayed) return null;

  const heroPin = document.querySelector(".hero-pin");
  heroPin?.classList.add("is-hero-intro-pending");

  const words = splitHeroTitleWords();
  const cta = document.querySelector(".hero-services-cta");

  gsap.set(words, { autoAlpha: 0, y: 28, filter: "blur(14px)" });
  if (cta) gsap.set(cta, { autoAlpha: 0, y: 16, filter: "blur(10px)" });
  gsap.set(".carousel-item, .carousel-progress, .carousel-scroll-hint", { autoAlpha: 0 });
  if (!isMobileCarousel()) gsap.set(".arc-svg", { autoAlpha: 0 });

  return words;
}

function revealCarouselChrome() {
  gsap.to(".carousel-progress, .carousel-scroll-hint", {
    autoAlpha: 1,
    duration: 0.45,
    stagger: 0.08,
    ease: "power2.out",
  });
}

function playMobileCarouselIntro() {
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

  gsap.set(".arc-svg", { autoAlpha: 1 });
  refreshCarouselPosition();

  const itemStates = items.map((item) => ({
    item,
    opacity: gsap.getProperty(item, "opacity"),
  }));

  itemStates.forEach(({ item }) => gsap.set(item, { autoAlpha: 0 }));

  const tl = gsap.timeline();

  tl.to(paths, {
    strokeDashoffset: 0,
    duration: 1.2,
    stagger: 0.08,
    ease: "power2.inOut",
  });

  itemStates.forEach(({ item, opacity }, index) => {
    tl.to(
      item,
      {
        autoAlpha: opacity,
        duration: 0.5,
        ease: "power3.out",
      },
      0.35 + index * 0.06
    );
  });

  tl.add(revealCarouselChrome, 0.45);
}

function playCarouselIntro() {
  if (heroIntroPlayed) return;
  heroIntroPlayed = true;

  document.querySelector(".hero-pin")?.classList.remove("is-hero-intro-pending");

  if (isMobileCarousel()) {
    playMobileCarouselIntro();
    return;
  }

  initDesktopReveal();
  revealCarouselChrome();
}

function initHeroIntro() {
  if (prefersReducedMotion()) {
    heroIntroPlayed = true;
    document.querySelector(".hero-pin")?.classList.remove("is-hero-intro-pending");
    gsap.set(".carousel-item, .carousel-progress, .carousel-scroll-hint, .arc-svg", { autoAlpha: 1 });
    return;
  }

  const words = prepHeroIntro();
  const cta = document.querySelector(".hero-services-cta");

  if (!words.length) {
    playCarouselIntro();
    return;
  }

  const tl = gsap.timeline({
    onComplete: playCarouselIntro,
  });

  tl.to(words, {
    autoAlpha: 1,
    y: 0,
    filter: "blur(0px)",
    duration: 0.82,
    stagger: 0.1,
    ease: "power3.out",
  }, 0.25);

  if (cta) {
    tl.to(
      cta,
      {
        autoAlpha: 1,
        y: 0,
        filter: "blur(0px)",
        duration: 0.72,
        ease: "power3.out",
      },
      "-=0.28"
    );
  }
}

function prepDesktopReveal() {
  if (isMobileCarousel() || prefersReducedMotion() || desktopRevealPlayed) return;

  stage?.classList.add("is-desktop-reveal-pending");

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

  if (arcLight) gsap.set(arcLight, { autoAlpha: 0 });
}

function initDesktopReveal() {
  if (isMobileCarousel() || prefersReducedMotion() || desktopRevealPlayed) return;

  desktopRevealPlayed = true;

  const outer = document.querySelector("#arc-track-outer");
  const inner = document.querySelector("#arc-track-inner");
  if (!outer || !inner) {
    stage?.classList.remove("is-desktop-reveal-pending");
    return;
  }

  refreshCarouselPosition();

  const orderedItems = items
    .map((item) => ({
      item,
      x: gsap.getProperty(item, "x"),
      opacity: gsap.getProperty(item, "opacity"),
    }))
    .sort((a, b) => a.x - b.x);

  orderedItems.forEach(({ item, x }) => {
    gsap.set(item, { x: x - 76, autoAlpha: 0 });
  });

  stage?.classList.remove("is-desktop-reveal-pending");

  gsap.set(".arc-svg", { autoAlpha: 1 });

  const tl = gsap.timeline();

  tl.to(
    outer,
    { strokeDashoffset: 0, duration: 1.05, ease: "power2.inOut" },
    0
  );
  tl.to(
    inner,
    { strokeDashoffset: 0, duration: 0.9, ease: "power2.inOut" },
    0.1
  );

  orderedItems.forEach(({ item, x, opacity }, index) => {
    tl.to(
      item,
      {
        x,
        autoAlpha: opacity,
        duration: 0.52,
        ease: "power3.out",
      },
      0.16 + index * 0.1
    );
  });

  if (arcLight) {
    tl.to(arcLight, { autoAlpha: 1, duration: 0.35, ease: "power2.out" }, 0.5);
  }
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
    scrub: true,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    snap: {
      snapTo: (progress) => Math.round(progress * stepsInScroll) / stepsInScroll,
      duration: { min: 0.08, max: 0.2 },
      delay: 0,
      ease: "power1.out",
    },
    onUpdate: (self) => {
      if (isServiceViewActive()) return;
      positionAll(getOffsetFromScroll(self.scroll(), self.start));
    },
  });

  positionAll(
    carouselTrigger
      ? getOffsetFromScroll(carouselTrigger.scroll(), carouselTrigger.start)
      : 0
  );

  if (!mobile) prepDesktopReveal();
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

function refreshCarouselPosition() {
  if (!carouselTrigger) return;
  const offset = isMobileCarousel()
    ? mobileStep * SPACING
    : getOffsetFromScroll(carouselTrigger.scroll(), carouselTrigger.start);
  positionAll(offset);
}

window.addEventListener("load", () => {
  prepHeroIntro();
  initResponsive();
  initHeroIntro();
  initArcDraw();
  initProgressNav();
  initKeyboardNav();
  initCardEffects();
  initServiceScreen();
  window.addEventListener("wheel", onServiceViewScrollBlock, { passive: false });
  window.addEventListener("touchmove", onServiceViewScrollBlock, { passive: false });
  window.addEventListener("scroll", onServiceViewScrollRestore, { passive: true });
  ScrollTrigger.refresh();
  refreshCarouselPosition();
});

window.addEventListener("resize", () => {
  invalidateStageMetrics();
  ScrollTrigger.refresh();
  refreshCarouselPosition();
});
