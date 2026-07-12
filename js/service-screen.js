const THREAD_POSITIONS = {
  desktop: [
    { x: 4, y: 14 },
    { x: 16, y: 52 },
    { x: 50, y: 84 },
    { x: 84, y: 52 },
    { x: 96, y: 14 },
  ],
  mobile: [
    { x: 5, y: 16 },
    { x: 20, y: 64 },
    { x: 50, y: 90 },
    { x: 80, y: 64 },
    { x: 95, y: 16 },
  ],
};

function getThreadPositions() {
  return window.matchMedia("(max-width: 900px)").matches
    ? THREAD_POSITIONS.mobile
    : THREAD_POSITIONS.desktop;
}

const SERVICE_ICONS = {
  video: {
    left: [
      '<polygon points="10 8 16 12 10 16" fill="currentColor" stroke="none"/>',
      '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9v6M11 9v6M15 9v6"/>',
    ],
    right: [
      '<circle cx="6" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M7.5 7.5l9 9"/>',
      '<path d="M4 14v4M8 12v8M12 10v12M16 8v16M20 6v18"/>',
    ],
  },
  graphics: {
    left: [
      '<path d="M4 16l4-8 4 5 4-9 4 12"/><circle cx="7" cy="7" r="2"/>',
      '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>',
    ],
    right: [
      '<circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/>',
      '<path d="M12 3l1.8 5.5H19l-4.5 3.3 1.7 5.2L12 16.8 7.8 17.5l1.7-5.2L5 8.5h5.2z"/>',
    ],
  },
  cinematic: {
    left: [
      '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 8h20"/>',
      '<circle cx="12" cy="13" r="4"/><path d="M12 2v3M12 19v3"/>',
    ],
    right: [
      '<path d="M4 6h16v12H4z"/><path d="M9 10l6 3-6 3z" fill="currentColor" stroke="none"/>',
      '<path d="M3 17l4-8 4 5 4-9 4 12"/>',
    ],
  },
  social: {
    left: [
      '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
      '<path d="M4 12h16"/><path d="M12 4v16"/>',
    ],
    right: [
      '<circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8v8"/>',
      '<path d="M7 7h10v10H7z"/><path d="M10 10h4v4h-4z" fill="currentColor" stroke="none"/>',
    ],
  },
  reel: {
    left: [
      '<rect x="7" y="2" width="10" height="20" rx="2"/><circle cx="12" cy="18" r="1" fill="currentColor"/>',
      '<path d="M10 8h4v8h-4z"/><path d="M8 6h8"/>',
    ],
    right: [
      '<path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M19 11v1a7 7 0 0 1-14 0v-1"/>',
      '<path d="M4 18l4-4 4 4 4-8 4 6"/>',
    ],
  },
  branding: {
    left: [
      '<circle cx="8" cy="10" r="3"/><circle cx="16" cy="10" r="3"/><circle cx="12" cy="16" r="3"/>',
      '<path d="M4 20h16"/><path d="M6 16h12"/>',
    ],
    right: [
      '<path d="M4 7V4h3M17 4h3v3M20 17v3h-3M7 20H4v-3"/>',
      '<path d="M7 8h10v8H7z"/><path d="M9 11h6M9 14h4"/>',
    ],
  },
};

const SERVICE_DATA = {
  video: {
    title: "Video Editing",
    hue: 280,
    services: [
      "Long-form & YouTube edits",
      "Short-form hooks & retention cuts",
      "Color grading & correction",
      "Sound design & audio cleanup",
      "Subtitles, captions & exports",
    ],
  },
  graphics: {
    title: "Graphics",
    hue: 320,
    services: [
      "Social post & carousel design",
      "Thumbnail & cover art",
      "Banner, ad & promo graphics",
      "Logo cleanup & variations",
      "Motion graphic accents",
    ],
  },
  cinematic: {
    title: "Cinematic",
    hue: 210,
    services: [
      "Trailer & teaser edits",
      "Documentary-style pacing",
      "Film color & grain looks",
      "Narrative structure & rhythm",
      "Title sequences & bumpers",
    ],
  },
  social: {
    title: "Social Media",
    hue: 180,
    services: [
      "Platform-native formats",
      "Reels, stories & short clips",
      "Content batching & templates",
      "Carousel & feed packages",
      "Trend-led creative refreshes",
    ],
  },
  reel: {
    title: "Mobile Reel Shoot",
    hue: 40,
    services: [
      "On-location vertical shoots",
      "Product & lifestyle reels",
      "Talking-head & interview capture",
      "B-roll for fast turnaround",
      "Same-day rough cuts",
    ],
  },
  branding: {
    title: "Branding",
    hue: 140,
    services: [
      "Visual identity systems",
      "Brand guidelines & toolkits",
      "Launch & campaign assets",
      "Template kits for teams",
      "Tone-aligned content direction",
    ],
  },
};

let serviceDetailEl = null;
let serviceDetailTween = null;
let threadFloatTweens = [];
let floatIconTweens = [];
let iconParallaxHandler = null;
let iconParallaxQuickTo = [];
let orbitResizeHandler = null;
let lastFocusedCard = null;
let isServiceDetailOpen = false;

const ORBIT_LAYOUT = {
  desktop: {
    angles: [155, 205, 335, 385],
    centerYFactor: 0.34,
    radiusXFactor: 0.44,
    radiusYFactor: 0.3,
  },
  mobile: {
    angles: [168, 215, 325, 372],
    centerYFactor: 0.3,
    radiusXFactor: 0.4,
    radiusYFactor: 0.24,
  },
};

function getOrbitLayout() {
  return window.matchMedia("(max-width: 900px)").matches
    ? ORBIT_LAYOUT.mobile
    : ORBIT_LAYOUT.desktop;
}

function killFloatIconAnimations() {
  floatIconTweens.forEach((tween) => tween.kill());
  floatIconTweens = [];

  document.querySelectorAll(".service-detail__float-icon").forEach((icon) => {
    gsap.set(icon, { x: 0, y: 0, rotation: 0 });
    const inner = icon.querySelector(".service-detail__float-icon-inner");
    if (inner) gsap.set(inner, { x: 0, y: 0, rotation: 0 });
  });
}

function stopIconParallax() {
  if (iconParallaxHandler) {
    getServiceDetailEl()?.removeEventListener("mousemove", iconParallaxHandler);
    iconParallaxHandler = null;
  }
  iconParallaxQuickTo = [];
}

function unbindOrbitResize() {
  if (orbitResizeHandler) {
    window.removeEventListener("resize", orbitResizeHandler);
    orbitResizeHandler = null;
  }
}

function getServiceIconPaths(serviceId) {
  const icons = SERVICE_ICONS[serviceId];
  if (!icons) return [];
  return [...icons.left, ...icons.right];
}

function buildFloatIconMarkup(paths) {
  const depthClasses = ["service-detail__float-icon--depth-near", "", "service-detail__float-icon--depth-far", ""];
  return paths
    .map(
      (pathContent, index) => `
        <span class="service-detail__float-icon ${depthClasses[index] || ""}" data-float-index="${index}">
          <span class="service-detail__float-icon-inner">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${pathContent}</svg>
          </span>
        </span>`
    )
    .join("");
}

function populateFloatIcons(detail, serviceId) {
  const container = detail.querySelector(".service-detail__float-icons");
  const ring = detail.querySelector(".service-detail__orbit-ring");
  const paths = getServiceIconPaths(serviceId);
  if (!container || !paths.length) return;

  container.innerHTML = buildFloatIconMarkup(paths);
  if (ring) container.prepend(ring);
}

function positionOrbitIcons(detail) {
  const container = detail.querySelector(".service-detail__float-icons");
  const icons = detail.querySelectorAll(".service-detail__float-icon");
  const ring = detail.querySelector(".service-detail__orbit-ring");
  if (!container || !icons.length) return;

  const layout = getOrbitLayout();
  const detailRect = detail.getBoundingClientRect();
  const cx = detailRect.width / 2;
  const cy = detailRect.height * layout.centerYFactor;
  const radiusX = detailRect.width * layout.radiusXFactor;
  const radiusY = detailRect.height * layout.radiusYFactor;

  icons.forEach((icon, index) => {
    const angleDeg = layout.angles[index] || layout.angles[0];
    const angle = (angleDeg * Math.PI) / 180;
    const x = cx + Math.cos(angle) * radiusX;
    const y = cy + Math.sin(angle) * radiusY;

    icon.style.left = `${x}px`;
    icon.style.top = `${y}px`;
    icon.dataset.orbitX = String(x);
    icon.dataset.orbitY = String(y);
    icon.dataset.orbitAngle = String(angleDeg);
  });

  if (ring) {
    ring.setAttribute("viewBox", `0 0 ${Math.max(detailRect.width, 1)} ${Math.max(detailRect.height, 1)}`);
    ring.innerHTML = `<ellipse class="service-detail__orbit-path" cx="${cx}" cy="${cy}" rx="${radiusX}" ry="${radiusY}" />`;
  }
}

function getOrbitOrigin(detail) {
  const layout = getOrbitLayout();
  const detailRect = detail.getBoundingClientRect();
  return {
    x: detailRect.width / 2,
    y: detailRect.height * layout.centerYFactor,
  };
}

function bindOrbitResize(detail) {
  unbindOrbitResize();
  orbitResizeHandler = () => {
    if (!isServiceDetailOpen) return;
    positionOrbitIcons(detail);
  };
  window.addEventListener("resize", orbitResizeHandler);
}

function startFloatIconAnimations(floatIcons) {
  killFloatIconAnimations();
  if (!floatIcons.length || prefersReducedMotion()) return;

  floatIcons.forEach((icon, index) => {
    const inner = icon.querySelector(".service-detail__float-icon-inner");
    if (!inner) return;

    const angleDeg = Number(icon.dataset.orbitAngle || 0);
    const angle = (angleDeg * Math.PI) / 180;
    const tangentX = -Math.sin(angle);
    const tangentY = Math.cos(angle);
    const drift = 6 + (index % 2) * 3;

    floatIconTweens.push(
      gsap.to(inner, {
        x: tangentX * drift,
        y: tangentY * drift,
        duration: 2.8 + index * 0.2,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
        delay: index * 0.12,
      })
    );
    floatIconTweens.push(
      gsap.to(inner, {
        rotation: index % 2 === 0 ? 6 : -6,
        duration: 3.4 + index * 0.18,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
        delay: index * 0.16,
      })
    );
    floatIconTweens.push(
      gsap.to(icon, {
        y: `+=${index % 2 === 0 ? 4 : -4}`,
        duration: 3.8 + index * 0.14,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
        delay: index * 0.1,
      })
    );
  });
}

function startIconParallax(detail, floatIcons) {
  stopIconParallax();
  if (!floatIcons.length || prefersReducedMotion()) return;
  if (window.matchMedia("(max-width: 900px)").matches) return;

  iconParallaxQuickTo = Array.from(floatIcons).map((icon) => ({
    x: gsap.quickTo(icon, "x", { duration: 0.6, ease: "power2.out" }),
    y: gsap.quickTo(icon, "y", { duration: 0.6, ease: "power2.out" }),
  }));

  iconParallaxHandler = (event) => {
    const rect = detail.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;

    floatIcons.forEach((icon, index) => {
      const depth = index % 2 === 0 ? 1.2 : 0.8;
      iconParallaxQuickTo[index]?.x(-px * 18 * depth);
      iconParallaxQuickTo[index]?.y(-py * 12 * depth);
    });
  };

  detail.addEventListener("mousemove", iconParallaxHandler);
}

function killThreadAnimations() {
  threadFloatTweens.forEach((tween) => tween.kill());
  threadFloatTweens = [];

  document.querySelectorAll(".service-thread__label").forEach((label) => {
    gsap.set(label, { x: 0, y: 0 });
  });
}

function buildThreadPaths(detail, count) {
  const svg = detail.querySelector(".service-detail__threads-svg");
  if (!svg) return;

  const width = 400;
  const height = 280;
  const startX = width / 2;
  const startY = 10;
  const positions = getThreadPositions().slice(0, count);

  svg.innerHTML = positions
    .map((pos, index) => {
      const endX = (pos.x / 100) * width;
      const endY = (pos.y / 100) * height;
      const sway = index % 2 === 0 ? -36 : 36;
      const controlX = (startX + endX) / 2 + sway;
      const controlY = (startY + endY) / 2 + 12;
      const path = `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;
      return `<path class="service-thread__path" data-index="${index}" d="${path}" />`;
    })
    .join("");
}

function startThreadFloatAnimations(threads) {
  killThreadAnimations();

  threads.forEach((thread, index) => {
    const label = thread.querySelector(".service-thread__label");
    if (!label) return;

    const driftX = index % 2 === 0 ? 4 : -4;
    threadFloatTweens.push(
      gsap.to(label, {
        y: 7,
        duration: 1.7 + index * 0.12,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
        delay: index * 0.08,
      })
    );
    threadFloatTweens.push(
      gsap.to(label, {
        x: driftX,
        duration: 2.4 + index * 0.1,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
        delay: index * 0.12,
      })
    );
  });
}

function getServiceDetailEl() {
  if (!serviceDetailEl) {
    serviceDetailEl = document.getElementById("service-detail");
  }
  return serviceDetailEl;
}

function getCarouselChrome() {
  const stage = document.querySelector(".carousel-stage");
  if (!stage) return [];

  return [
    document.querySelector(".hero-header"),
    stage.querySelector(".arc-svg"),
    stage.querySelector(".carousel-track"),
    stage.querySelector(".carousel-progress"),
    stage.querySelector(".carousel-scroll-hint"),
  ].filter(Boolean);
}

function populateServiceDetail(serviceId) {
  const data = SERVICE_DATA[serviceId];
  const detail = getServiceDetailEl();
  if (!data || !detail) return;

  detail.style.setProperty("--service-hue", data.hue);
  detail.dataset.service = serviceId;

  const title = detail.querySelector(".service-detail__title");
  const list = detail.querySelector(".service-detail__threads");

  if (title) title.textContent = data.title;
  if (list) {
    list.innerHTML = data.services
      .map((item, index) => {
        const positions = getThreadPositions();
        const pos = positions[index] || positions[positions.length - 1];
        return `<li class="service-thread" style="--thread-x: ${pos.x}%; --thread-y: ${pos.y}%; --thread-i: ${index}">
          <span class="service-thread__label">${item}</span>
        </li>`;
      })
      .join("");
    buildThreadPaths(detail, data.services.length);
  }

  populateFloatIcons(detail, serviceId);

  document.documentElement.style.setProperty("--glow-hue", data.hue);
}

function openServiceDetail(serviceId, sourceCard) {
  const detail = getServiceDetailEl();
  const stage = document.querySelector(".carousel-stage");
  if (!detail || !stage || !SERVICE_DATA[serviceId]) return;

  lastFocusedCard = sourceCard || null;
  populateServiceDetail(serviceId);

  if (serviceDetailTween) serviceDetailTween.kill();

  isServiceDetailOpen = true;
  stage.classList.add("is-service-view");
  if (typeof lockServiceViewScroll === "function") lockServiceViewScroll();
  detail.hidden = false;
  detail.removeAttribute("hidden");
  detail.setAttribute("aria-hidden", "false");
  positionOrbitIcons(detail);
  bindOrbitResize(detail);

  const threads = detail.querySelectorAll(".service-thread");
  const threadPaths = detail.querySelectorAll(".service-thread__path");
  const floatIcons = detail.querySelectorAll(".service-detail__float-icon");
  const floatIconInners = detail.querySelectorAll(".service-detail__float-icon-inner");
  const orbitRing = detail.querySelector(".service-detail__orbit-path");
  const headerBox = detail.querySelector(".service-detail__header-box");
  const backBtn = detail.querySelector(".service-detail__back");
  const chrome = getCarouselChrome();
  const orbitOrigin = getOrbitOrigin(detail);

  if (prefersReducedMotion()) {
    gsap.set(items, { autoAlpha: 0 });
    gsap.set(chrome, { autoAlpha: 0 });
    gsap.set(detail, { autoAlpha: 1 });
    gsap.set(backBtn, { autoAlpha: 1, x: 0 });
    gsap.set(headerBox, { autoAlpha: 1, y: 0, scale: 1 });
    gsap.set(orbitRing, { autoAlpha: 0.35, strokeDashoffset: 0 });
    gsap.set(floatIcons, { autoAlpha: 0.85, scale: 1, x: 0, y: 0, rotation: 0 });
    gsap.set(threadPaths, { autoAlpha: 1, strokeDashoffset: 0 });
    gsap.set(threads, { autoAlpha: 1, scale: 1 });
    backBtn?.focus();
    return;
  }

  gsap.set(detail, { autoAlpha: 0 });
  gsap.set(backBtn, { autoAlpha: 0, x: -10 });
  gsap.set(headerBox, { autoAlpha: 0, y: 14, scale: 0.96 });
  gsap.set(orbitRing, { autoAlpha: 0, strokeDashoffset: 160 });
  floatIcons.forEach((icon) => {
    const targetX = parseFloat(icon.dataset.orbitX || "0");
    const targetY = parseFloat(icon.dataset.orbitY || "0");
    gsap.set(icon, {
      autoAlpha: 0,
      scale: 0.28,
      x: orbitOrigin.x - targetX,
      y: orbitOrigin.y - targetY,
      rotation: 0,
    });
    const inner = icon.querySelector(".service-detail__float-icon-inner");
    if (inner) gsap.set(inner, { x: 0, y: 0, rotation: 0, scale: 0.8 });
  });
  gsap.set(threadPaths, { autoAlpha: 0, strokeDashoffset: 120 });
  gsap.set(threads, { autoAlpha: 0, scale: 0.88 });

  serviceDetailTween = gsap.timeline({
    defaults: { ease: "power2.out" },
    onComplete: () => {
      startThreadFloatAnimations(threads);
      startFloatIconAnimations(floatIcons);
      startIconParallax(detail, floatIcons);
      backBtn?.focus();
    },
  });

  serviceDetailTween.to(items, { autoAlpha: 0, duration: 0.28, stagger: 0.02 }, 0);
  serviceDetailTween.to(chrome, { autoAlpha: 0, duration: 0.22 }, 0);
  serviceDetailTween.to(detail, { autoAlpha: 1, duration: 0.32 }, 0.12);
  serviceDetailTween.to(backBtn, { autoAlpha: 1, x: 0, duration: 0.3 }, 0.16);
  serviceDetailTween.to(headerBox, { autoAlpha: 1, y: 0, scale: 1, duration: 0.34 }, 0.2);
  serviceDetailTween.to(
    orbitRing,
    { autoAlpha: 0.42, strokeDashoffset: 0, duration: 0.6, ease: "power1.out" },
    0.22
  );
  serviceDetailTween.to(
    floatIcons,
    { autoAlpha: 0.94, scale: 1, x: 0, y: 0, rotation: 0, duration: 0.62, stagger: 0.11, ease: "back.out(2)" },
    0.26
  );
  serviceDetailTween.to(
    floatIconInners,
    { scale: 1, duration: 0.48, stagger: 0.11, ease: "back.out(1.8)" },
    0.3
  );
  serviceDetailTween.to(
    threadPaths,
    { autoAlpha: 1, strokeDashoffset: 0, duration: 0.55, stagger: 0.07, ease: "power1.out" },
    0.3
  );
  serviceDetailTween.to(threads, { autoAlpha: 1, scale: 1, duration: 0.38, stagger: 0.07 }, 0.38);
}

function closeServiceDetail() {
  const detail = getServiceDetailEl();
  const stage = document.querySelector(".carousel-stage");
  if (!detail || !stage || !isServiceDetailOpen) return;

  if (serviceDetailTween) serviceDetailTween.kill();
  killThreadAnimations();
  killFloatIconAnimations();
  stopIconParallax();
  unbindOrbitResize();

  const floatIcons = detail.querySelectorAll(".service-detail__float-icon");
  gsap.killTweensOf(floatIcons);
  gsap.killTweensOf(detail.querySelectorAll(".service-detail__float-icon-inner"));

  const chrome = getCarouselChrome();
  stage.classList.remove("is-service-view");
  if (typeof unlockServiceViewScroll === "function") unlockServiceViewScroll();

  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    gsap.killTweensOf(detail);
    gsap.killTweensOf(chrome);
    gsap.set(detail, { autoAlpha: 0 });
    detail.hidden = true;
    detail.setAttribute("aria-hidden", "true");
    isServiceDetailOpen = false;
    if (lastFocusedCard) lastFocusedCard.focus({ preventScroll: true });
  };

  if (prefersReducedMotion()) {
    if (typeof refreshCarouselPosition === "function") refreshCarouselPosition();
    gsap.set(detail, { autoAlpha: 0 });
    gsap.set(chrome, { autoAlpha: 1 });
    finish();
    return;
  }

  if (typeof refreshCarouselPosition === "function") refreshCarouselPosition();

  serviceDetailTween = gsap.timeline({
    defaults: { ease: "power2.out" },
    onComplete: finish,
  });

  serviceDetailTween.to(detail, { autoAlpha: 0, duration: 0.16 }, 0);
  serviceDetailTween.to(chrome, { autoAlpha: 1, duration: 0.2 }, 0.03);
  serviceDetailTween.call(finish, null, 0.22);
}

function getServiceIdFromItem(item) {
  return item?.querySelector(".file-card")?.dataset.service || null;
}

function handleCardActivate(item) {
  if (isServiceDetailOpen) return;
  const serviceId = getServiceIdFromItem(item);
  const card = item?.querySelector(".file-card");
  if (!serviceId || !card) return;
  openServiceDetail(serviceId, card);
}

function initServiceScreen() {
  const detail = getServiceDetailEl();
  if (!detail) return;

  detail.querySelector(".service-detail__back")?.addEventListener("click", closeServiceDetail);

  window.addEventListener("keydown", (e) => {
    if (!isServiceDetailOpen) return;
    if (e.key === "Escape") {
      e.preventDefault();
      closeServiceDetail();
    }
  });

  items.forEach((item) => {
    const card = item.querySelector(".file-card");
    if (!card) return;

    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute(
      "aria-label",
      `View ${card.querySelector(".card-title")?.textContent || "service"} services`
    );

    card.addEventListener("click", (e) => {
      if (mobileNavigating) return;
      e.preventDefault();
      handleCardActivate(item);
    });

    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleCardActivate(item);
      }
    });
  });
}
