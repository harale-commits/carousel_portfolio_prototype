gsap.registerPlugin(ScrollTrigger, MotionPathPlugin, ScrollToPlugin);

if (window.Motion) Motion.registerEases();

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
let cardStep = 0;
let cardNavigating = false;
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
  if (window.Motion) Motion.stop();
}

function unlockServiceViewScroll() {
  if (!serviceViewScrollLocked) return;
  serviceViewScrollLocked = false;
  document.body.classList.remove("is-service-view-locked");
  if (window.Motion) Motion.start();
}

function onServiceViewScrollBlock(e) {
  if (!serviceViewScrollLocked) return;
  e.preventDefault();
}

function onServiceViewScrollRestore() {
  if (!serviceViewScrollLocked) return;
  if (Math.abs(window.scrollY - lockedScrollY) > 1) {
    if (window.Motion) Motion.scrollTo(lockedScrollY, { immediate: true });
    else window.scrollTo(0, lockedScrollY);
  }
}
let mobileNavCleanup = null;
let glowHueProxy = { value: 280 };
let glowHueTween = null;
let desktopRevealPlayed = false;
let heroIntroPlayed = false;
let activationTimer = 0;
let pendingActivation = null;
let scrollingIdleTimer = 0;
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

function getCardScrollY(step) {
  const wrapped = getWrappedCardIndex(step);
  return carouselTrigger.start + wrapped * config.scrollPerCard;
}

function canNavigateCarousel() {
  if (!carouselTrigger || cardNavigating) return false;
  if (document.querySelector(".carousel-stage.is-service-view")) return false;
  const y = window.scrollY;
  return y >= carouselTrigger.start - 4 && y <= carouselTrigger.end + 4;
}

function goToCardStep(step, duration = 0.45) {
  if (!carouselTrigger || cardNavigating || isServiceViewActive()) return;

  const prevStep = cardStep;
  cardStep = step;
  if (cardStep === prevStep) return;

  cardNavigating = true;
  gsap.killTweensOf(cardOffsetProxy);

  const fromOffset = prevStep * SPACING;
  const toOffset = cardStep * SPACING;
  cardOffsetProxy.offset = fromOffset;

  gsap.to(cardOffsetProxy, {
    offset: toOffset,
    duration,
    ease: window.Motion ? Motion.ease() : "power2.out",
    onUpdate: () => {
      markCarouselScrolling();
      positionAll(cardOffsetProxy.offset);
    },
    onComplete: () => {
      cardNavigating = false;
      positionAll(cardStep * SPACING);
      const y = getCardScrollY(cardStep);
      if (window.Motion) Motion.scrollTo(y, { immediate: true });
      else window.scrollTo(0, y);
      document.body.classList.remove("is-carousel-scrolling");
      flushPendingActivation();
    },
  });
}

const cardOffsetProxy = { offset: 0 };

function destroyCardStepNav() {
  if (mobileNavCleanup) {
    mobileNavCleanup();
    mobileNavCleanup = null;
  }
}

function initCardStepNav() {
  destroyCardStepNav();

  const heroPin = document.querySelector(".hero-pin");
  if (!heroPin) return;

  const mobile = isMobileCarousel();
  let touchStartX = 0;
  let touchStartY = 0;
  let touchActive = false;
  const SWIPE_THRESHOLD = 40;

  const canNavigate = () => canNavigateCarousel();

  const onTouchStart = (e) => {
    if (!mobile || !canNavigate()) return;
    touchActive = true;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  };

  const onTouchMove = (e) => {
    if (!mobile || !canNavigateCarousel()) return;
    e.preventDefault();
  };

  const onTouchEnd = (e) => {
    if (!mobile || !touchActive || !canNavigate()) {
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

    goToCardStep(cardStep + direction);
  };

  const onWheel = (e) => {
    if (!canNavigate()) return;
    e.preventDefault();
    if (Math.abs(e.deltaY) < 8 && Math.abs(e.deltaX) < 8) return;
    const dominant = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    const direction = dominant > 0 ? 1 : -1;
    goToCardStep(cardStep + direction);
  };

  if (mobile) {
    heroPin.addEventListener("touchstart", onTouchStart, { passive: true });
    heroPin.addEventListener("touchmove", onTouchMove, { passive: false });
    heroPin.addEventListener("touchend", onTouchEnd, { passive: true });
  }
  window.addEventListener("wheel", onWheel, { passive: false });

  mobileNavCleanup = () => {
    if (mobile) {
      heroPin.removeEventListener("touchstart", onTouchStart);
      heroPin.removeEventListener("touchmove", onTouchMove);
      heroPin.removeEventListener("touchend", onTouchEnd);
    }
    window.removeEventListener("wheel", onWheel);
  };
}

function placeItem(item, t, rel, metrics) {
  const mobileFocus = !!config.glowOnlyRel;
  const { scaleX, scaleY, stageH, cardW, cardH } = metrics;

  if (Math.abs(rel) > config.maxVisibleRel || t < -0.05 || t > 1.05) {
    item.style.opacity = "0";
    item.style.visibility = "hidden";
    item.style.pointerEvents = "none";
    item.style.zIndex = "0";
    /* Keep off-stage so intro/reveal never paints a card at (0,0) */
    item.style.transformOrigin = "50% 100%";
    item.style.transform = "translate3d(-9999px, -9999px, 0) scale(0.5)";
    item._carouselPose = { x: -9999, y: -9999, opacity: 0, scale: 0.5, rotation: 0, hidden: true };
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

  const x = Math.round(point.x * scaleX - cardW / 2 + xOffset);
  const y = Math.round(yPos);
  const rot = mobileFocus ? 0 : Math.round(rotation * 10) / 10;
  const visibleOpacity = isHeroIntroPending() ? 0 : opacity;

  item.style.visibility = "visible";
  item.style.pointerEvents = rel === 0 ? "auto" : "none";
  item.style.zIndex = rel === 0 ? "3" : "1";
  item.style.opacity = String(visibleOpacity);
  item.style.transformOrigin = "50% 100%";
  item.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rot}deg) scale(${scale})`;
  item._carouselPose = { x, y, opacity: visibleOpacity, scale, rotation: rot, hidden: false };
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
    duration: 0.45,
    ease: "none",
    onUpdate: () => {
      document.documentElement.style.setProperty("--glow-hue", glowHueProxy.value);
    },
  });

  if (!document.body.classList.contains("is-carousel-scrolling")) {
    triggerHueSweep(index);
  }
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

  const current = lastCenterIndex >= 0 ? lastCenterIndex : getWrappedCardIndex(cardStep);
  let delta = index - current;
  if (delta > total / 2) delta -= total;
  if (delta < -total / 2) delta += total;
  if (delta === 0) return;

  if (prefersReducedMotion()) {
    cardStep += delta;
    positionAll(cardStep * SPACING);
    const y = getCardScrollY(cardStep);
    if (window.Motion) Motion.scrollTo(y, { immediate: true });
    else window.scrollTo(0, y);
    flushPendingActivation();
    return;
  }

  goToCardStep(cardStep + delta, isMobileCarousel() ? 0.45 : 0.55);
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
    if (!canNavigateCarousel()) return;
    if (e.target.closest("input, textarea, select, a[href^='mailto']")) return;

    const current = lastCenterIndex >= 0 ? lastCenterIndex : getWrappedCardIndex(cardStep);
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

function markCarouselScrolling() {
  document.body.classList.add("is-carousel-scrolling");
  window.clearTimeout(scrollingIdleTimer);
  scrollingIdleTimer = window.setTimeout(() => {
    document.body.classList.remove("is-carousel-scrolling");
    flushPendingActivation();
  }, 120);
}

function flushPendingActivation() {
  if (!pendingActivation) return;
  const { index, prevActive } = pendingActivation;
  pendingActivation = null;
  if (typeof animateCardActivation === "function") {
    animateCardActivation(index, prevActive);
  }
}

function updateActiveState(index) {
  const prevActive = items.findIndex((item) => item.classList.contains("is-active"));
  items.forEach((item, i) => {
    item.classList.toggle("is-active", i === index);
  });
  if (prevActive === index) return;

  /* Defer folder open/close until scroll settles — avoids jank mid-scrub */
  pendingActivation = { index, prevActive };
  window.clearTimeout(activationTimer);
  activationTimer = window.setTimeout(flushPendingActivation, 90);
}

function positionAll(offset) {
  if (isServiceViewActive()) return;

  const steps = offset / SPACING;
  const centerIndex = ((Math.round(steps) % total) + total) % total;
  const frac = steps - Math.round(steps);
  const centerT = 0.5 - frac * SPACING;
  const metrics = getStageMetrics();
  const mobile = !!config.glowOnlyRel;

  for (let i = 0; i < items.length; i++) {
    const rel = getRelativeIndex(i, centerIndex, total);
    placeItem(items[i], wrapPathT(centerT + rel * SPACING), rel, metrics);
  }

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
    duration: window.Motion ? Motion.UI_DURATION : 0.45,
    stagger: 0.08,
    ease: window.Motion ? Motion.ease() : "power2.out",
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
    opacity: item._carouselPose?.opacity ?? 1,
  }));

  itemStates.forEach(({ item }) => {
    item.style.opacity = "0";
    item.style.visibility = "hidden";
  });

  const tl = gsap.timeline();

  tl.to(paths, {
    strokeDashoffset: 0,
    duration: 1.2,
    stagger: 0.08,
    ease: window.Motion ? Motion.easeInOut() : "power2.inOut",
  });

  itemStates.forEach(({ item, opacity }, index) => {
    const state = { o: 0 };
    tl.to(
      state,
      {
        o: opacity,
        duration: 0.65,
        ease: window.Motion ? Motion.ease() : "power3.out",
        onStart: () => {
          item.style.visibility = "visible";
        },
        onUpdate: () => {
          item.style.opacity = String(state.o);
        },
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
    duration: window.Motion ? Motion.REVEAL_DURATION : 0.82,
    stagger: 0.1,
    ease: window.Motion ? Motion.ease() : "power3.out",
  }, 0.25);

  if (cta) {
    tl.to(
      cta,
      {
        autoAlpha: 1,
        y: 0,
        filter: "blur(0px)",
        duration: 0.72,
        ease: window.Motion ? Motion.ease() : "power3.out",
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
    .map((item) => {
      const pose = item._carouselPose;
      if (!pose || pose.hidden || pose.opacity <= 0) return null;
      return {
        item,
        x: pose.x,
        y: pose.y,
        opacity: pose.opacity,
        scale: pose.scale,
        rotation: pose.rotation,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.x - b.x);

  /* Ensure off-arc cards stay fully hidden during reveal */
  items.forEach((item) => {
    if (item._carouselPose?.hidden) {
      item.style.opacity = "0";
      item.style.visibility = "hidden";
      item.style.transform = "translate3d(-9999px, -9999px, 0) scale(0.5)";
    }
  });

  orderedItems.forEach(({ item, x, y, scale, rotation }) => {
    item.style.opacity = "0";
    item.style.visibility = "hidden";
    item.style.transform = `translate3d(${x - 76}px, ${y}px, 0) rotate(${rotation}deg) scale(${scale})`;
  });

  stage?.classList.remove("is-desktop-reveal-pending");

  gsap.set(".arc-svg", { autoAlpha: 1 });

  const tl = gsap.timeline();

  tl.to(
    outer,
    { strokeDashoffset: 0, duration: 1.05, ease: window.Motion ? Motion.easeInOut() : "power2.inOut" },
    0
  );
  tl.to(
    inner,
    { strokeDashoffset: 0, duration: 0.9, ease: window.Motion ? Motion.easeInOut() : "power2.inOut" },
    0.1
  );

  orderedItems.forEach(({ item, x, y, opacity, scale, rotation }, index) => {
    const state = { x: x - 76, o: 0 };
    tl.to(
      state,
      {
        x,
        o: opacity,
        duration: 0.65,
        ease: window.Motion ? Motion.ease() : "power3.out",
        onStart: () => {
          item.style.visibility = "visible";
        },
        onUpdate: () => {
          item.style.opacity = String(state.o);
          item.style.transform = `translate3d(${state.x}px, ${y}px, 0) rotate(${rotation}deg) scale(${scale})`;
        },
      },
      0.16 + index * 0.1
    );
  });

  if (arcLight) {
    tl.to(arcLight, { autoAlpha: 1, duration: 0.45, ease: window.Motion ? Motion.ease() : "power2.out" }, 0.5);
  }
}

function initCarousel() {
  if (carouselTrigger) {
    carouselTrigger.kill();
    carouselTrigger = null;
  }

  destroyCardStepNav();

  config = getActiveConfig();
  const mobile = isMobileCarousel();

  if (mobile) {
    config.scrollPerCard = getMobileScrollPerCard();
  }

  invalidateStageMetrics();
  lastCenterIndex = -1;
  cardStep = 0;
  cardNavigating = false;
  cardOffsetProxy.offset = 0;
  stage?.classList.toggle("carousel-stage--mobile-focus", mobile);
  document.body.classList.toggle("is-mobile-perf", mobile);

  if (prefersReducedMotion()) {
    positionAll(0);
    return;
  }

  /* Step-based on desktop + mobile: one card always centered, no free-scrub snap */
  const scrollDistance = config.scrollPerCard * (total + 4);

  carouselTrigger = ScrollTrigger.create({
    trigger: ".hero",
    start: "top top",
    end: `+=${scrollDistance}`,
    pin: ".hero-pin",
    anticipatePin: 1,
    invalidateOnRefresh: true,
    onRefresh: () => {
      invalidateStageMetrics();
      if (isMobileCarousel()) {
        config.scrollPerCard = getMobileScrollPerCard();
      }
    },
  });

  initCardStepNav();
  positionAll(0);

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
  positionAll(cardStep * SPACING);
}

window.addEventListener("load", () => {
  if (window.Motion) Motion.init();
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
