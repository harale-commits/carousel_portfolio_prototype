gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);

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
    scrollPerCard: 120,
    scaleMax: 1,
    scaleMin: 0.7,
    opacityMin: 0.38,
    maxVisibleRel: 1,
    parallaxX: 4,
    parallaxY: 3,
  },
  small: {
    scrollPerCard: 105,
    scaleMax: 0.96,
    scaleMin: 0.66,
    opacityMin: 0.32,
    maxVisibleRel: 1,
    parallaxX: 3,
    parallaxY: 2,
  },
};

let config = CONFIG.desktop;
let carouselTrigger = null;
let matchMediaInstance = null;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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

function getStageMetrics() {
  const width = stage.offsetWidth;
  const height = stage.offsetHeight;
  const vb = stage.querySelector(".arc-svg").viewBox.baseVal;
  return {
    scaleX: width / vb.width,
    scaleY: height / vb.height,
    cardW: items[0].offsetWidth,
  };
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

function placeItem(item, t, rel) {
  const visualBg = item.querySelector(".card-visual-bg");

  if (Math.abs(rel) > config.maxVisibleRel) {
    gsap.set(item, { autoAlpha: 0 });
    return;
  }

  if (t < -0.05 || t > 1.05) {
    gsap.set(item, { autoAlpha: 0 });
    return;
  }

  const clamped = gsap.utils.clamp(0, 1, t);
  const { scaleX, scaleY, cardW } = getStageMetrics();
  const point = getArcPoint(clamped);

  const parallaxX = gsap.utils.clamp(
    -config.parallaxX,
    config.parallaxX,
    -point.angle * 0.4
  );
  const parallaxY = gsap.utils.clamp(
    -config.parallaxY,
    config.parallaxY,
    (clamped - 0.5) * -18
  );

  gsap.set(item, {
    x: point.x * scaleX - cardW / 2,
    y: point.y * scaleY,
    rotation: point.angle,
    transformOrigin: "50% 100%",
    scale: getScaleForPosition(clamped),
    autoAlpha: getOpacityForPosition(clamped),
  });

  if (visualBg) {
    gsap.set(visualBg, {
      x: parallaxX,
      y: parallaxY,
      rotation: -point.angle * 0.12,
      scale: 1.12,
    });
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
  const steps = offset / SPACING;
  const centerIndex = ((Math.round(steps) % total) + total) % total;
  const frac = steps - Math.round(steps);
  const centerT = 0.5 - frac * SPACING;

  items.forEach((item, i) => {
    const rel = getRelativeIndex(i, centerIndex, total);
    placeItem(item, wrapPathT(centerT + rel * SPACING), rel);
  });

  updateActiveState(centerIndex);
  updateGlowHue(centerIndex);
  updateArcLight(gsap.utils.clamp(0, 1, centerT));
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

  config = getActiveConfig();

  if (prefersReducedMotion()) {
    positionAll(0);
    return;
  }

  const scrollDistance = window.innerHeight * 50;
  const stepsInScroll = scrollDistance / config.scrollPerCard;

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
  ScrollTrigger.refresh();
  if (carouselTrigger) {
    config = getActiveConfig();
    positionAll(getOffsetFromScroll(carouselTrigger.scroll(), carouselTrigger.start));
  }
});
