const THREAD_POSITIONS = {
  desktop: [
    { x: 4, y: 14 },
    { x: 16, y: 52 },
    { x: 50, y: 84 },
    { x: 84, y: 52 },
    { x: 96, y: 14 },
  ],
  mobile: [
    { x: 17, y: 18 },
    { x: 17, y: 62 },
    { x: 50, y: 96 },
    { x: 83, y: 62 },
    { x: 83, y: 18 },
  ],
};

function getThreadPositions() {
  return window.matchMedia("(max-width: 900px)").matches
    ? THREAD_POSITIONS.mobile
    : THREAD_POSITIONS.desktop;
}

const BRAND_META = {
  premiere: { label: "Adobe Premiere Pro", color: "9999FF" },
  aftereffects: { label: "Adobe After Effects", color: "9999FF" },
  photoshop: { label: "Adobe Photoshop", color: "31A8FF" },
  illustrator: { label: "Adobe Illustrator", color: "FF9A00" },
  adobe: { label: "Adobe Express", color: "EB1000" },
  davinci: { label: "DaVinci Resolve", color: "FF6A00" },
  capcut: { label: "CapCut", color: "FFFFFF" },
  figma: { label: "Figma", color: "F24E1E" },
  canva: { label: "Canva", color: "00C4CC" },
  blender: { label: "Blender", color: "E87D0D" },
  cinema4d: { label: "Cinema 4D", color: "3D8BFF" },
  finalcut: { label: "Final Cut Pro", color: "FFFFFF" },
  instagram: { label: "Instagram", color: "E4405F" },
  tiktok: { label: "TikTok", color: "FFFFFF" },
  youtube: { label: "YouTube", color: "FF0000" },
  linkedin: { label: "LinkedIn", color: "0A66C2" },
  framer: { label: "Framer", color: "FFFFFF" },
  notion: { label: "Notion", color: "FFFFFF" },
  lightroom: { label: "Adobe Lightroom", color: "31A8FF" },
};

/* Full-color, real logo images (rounded-square app-icon look).
   Icon-only marks, hosted locally in assets/brands/ — no CDN dependency. */
const BRAND_LOGOS = {
  premiere: "assets/brands/premiere.svg",
  aftereffects: "assets/brands/aftereffects.svg",
  photoshop: "assets/brands/photoshop.svg",
  illustrator: "assets/brands/illustrator.svg",
  adobe: "assets/brands/adobe.svg",
  lightroom: "assets/brands/lightroom.svg",
  figma: "assets/brands/figma.svg",
  framer: "assets/brands/framer.svg",
  blender: "assets/brands/blender.svg",
  instagram: "assets/brands/instagram.svg",
  tiktok: "assets/brands/tiktok.svg",
  youtube: "assets/brands/youtube.svg",
  linkedin: "assets/brands/linkedin.svg",
  notion: "assets/brands/notion.svg",
  canva: "assets/brands/canva.svg",
  davinci: "assets/brands/davinci.svg",
  capcut: "assets/brands/capcut.svg",
  cinema4d: "assets/brands/cinema4d.svg",
};

/* Four orbit brands per service — tools people actually recognize */
const SERVICE_ICONS = {
  video: ["premiere", "aftereffects", "davinci", "adobe"],
  graphics: ["photoshop", "illustrator", "figma", "canva"],
  cinematic: ["premiere", "blender", "cinema4d", "aftereffects"],
  social: ["instagram", "tiktok", "youtube", "linkedin"],
  reel: ["capcut", "instagram", "tiktok", "lightroom"],
  branding: ["figma", "illustrator", "framer", "notion"],
};

function resolveBrand(key) {
  const meta = BRAND_META[key];
  const paths = window.BRAND_ICON_PATHS || {};
  const pathData = paths[key];
  const logo = BRAND_LOGOS[key] || null;
  /* Need either a real logo image or an inline mark to render */
  if (!meta || (!logo && !pathData)) return null;
  return {
    key,
    label: meta.label,
    color: meta.color,
    logo,
    svg: pathData ? pathData.svg : null,
  };
}

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
    angles: [186, 215, 325, 354],
    centerYFactor: 0.28,
    radiusXFactor: 0.45,
    radiusYFactor: 0.29,
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

function getServiceBrandIcons(serviceId) {
  const keys = SERVICE_ICONS[serviceId];
  if (!keys) return [];
  return keys.map(resolveBrand).filter(Boolean);
}

function buildVectorMark(brand, hidden) {
  if (!brand.svg) return "";
  return `<svg class="service-detail__brand-logo service-detail__brand-logo--vector" viewBox="0 0 24 24" aria-hidden="true" focusable="false"${hidden ? " hidden" : ""}>${brand.svg}</svg>`;
}

function buildBrandMark(brand) {
  if (brand.logo) {
    /* If the CDN image fails, reveal the inline vector fallback beside it */
    const onError =
      "this.style.display='none';var v=this.nextElementSibling;if(v){v.hidden=false;}";
    return (
      `<img class="service-detail__brand-logo service-detail__brand-logo--img" src="${brand.logo}" alt="${brand.label}" loading="lazy" decoding="async" draggable="false" onerror="${onError}" />` +
      buildVectorMark(brand, true)
    );
  }
  return buildVectorMark(brand, false);
}

function buildFloatIconMarkup(brands) {
  const depthClasses = ["service-detail__float-icon--depth-near", "", "service-detail__float-icon--depth-far", ""];
  return brands
    .map(
      (brand, index) => `
        <span class="service-detail__float-icon ${depthClasses[index] || ""}" data-float-index="${index}" data-brand="${brand.key}">
          <span class="service-detail__float-icon-inner" style="--brand-color: #${brand.color}" tabindex="0" role="img" aria-label="${brand.label}">
            ${buildBrandMark(brand)}
            <span class="service-detail__brand-tip" aria-hidden="true">${brand.label}</span>
          </span>
        </span>`
    )
    .join("");
}

function populateFloatIcons(detail, serviceId) {
  const container = detail.querySelector(".service-detail__float-icons");
  const ring = detail.querySelector(".service-detail__orbit-ring");
  const brands = getServiceBrandIcons(serviceId);
  if (!container || !brands.length) return;

  container.innerHTML = buildFloatIconMarkup(brands);
  if (ring) container.prepend(ring);
}

function positionOrbitIcons(detail) {
  const container = detail.querySelector(".service-detail__float-icons");
  const icons = detail.querySelectorAll(".service-detail__float-icon");
  const ring = detail.querySelector(".service-detail__orbit-ring");
  if (!container || !icons.length) return;

  const layout = getOrbitLayout();
  const detailRect = detail.getBoundingClientRect();
  if (detailRect.width < 2 || detailRect.height < 2) return;

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
    gsap.set(icon, { xPercent: -50, yPercent: -50, x: 0, y: 0 });

    /* Keep tooltips on-screen for icons hugging the viewport edges */
    const EDGE_PX = 84;
    icon.classList.toggle("service-detail__float-icon--tip-right", x < EDGE_PX);
    icon.classList.toggle(
      "service-detail__float-icon--tip-left",
      detailRect.width - x < EDGE_PX
    );
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
    x: gsap.quickTo(icon, "x", { duration: 0.7, ease: window.Motion ? Motion.ease() : "power2.out" }),
    y: gsap.quickTo(icon, "y", { duration: 0.7, ease: window.Motion ? Motion.ease() : "power2.out" }),
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

  /* Ambient UI only — keep the track/cards so the open morph can happen in place */
  return [
    document.querySelector(".hero-header"),
    stage.querySelector(".arc-svg"),
    stage.querySelector(".carousel-progress"),
    stage.querySelector(".carousel-scroll-hint"),
  ].filter(Boolean);
}

function getSiblingCards(sourceCard) {
  if (!sourceCard) return [];
  const activeItem = sourceCard.closest(".carousel-item");
  return items
    .filter((item) => item !== activeItem)
    .map((item) => item.querySelector(".file-card"))
    .filter(Boolean);
}

function resetCardMotionProps(cards) {
  cards.forEach((card) => {
    if (!card) return;
    gsap.set(card, { clearProps: "opacity,visibility,transform,scale,x,y,rotation,filter" });
    card
      .querySelectorAll(
        ".file-sheet, .file-pocket, .file-pocket-shine, .file-flap, .file-flap-edge, .file-flap-body, .file-flap-copy, .file-flap-bottom, .file-flap-top, .file-menu, .card-title, .card-tagline, .card-meta"
      )
      .forEach((el) => {
        gsap.set(el, { clearProps: "all" });
      });
  });
}

function resetAllFolderCards() {
  resetCardMotionProps(
    items.map((item) => item.querySelector(".file-card")).filter(Boolean)
  );
}

function canSoftBlur() {
  return !document.body.classList.contains("is-mobile-perf") && !prefersReducedMotion();
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

  resetAllFolderCards();

  isServiceDetailOpen = true;
  stage.classList.add("is-service-view");
  if (typeof lockServiceViewScroll === "function") lockServiceViewScroll();
  detail.hidden = false;
  detail.removeAttribute("hidden");
  detail.setAttribute("aria-hidden", "false");

  gsap.set(detail, { autoAlpha: 1, opacity: 1, visibility: "visible" });
  positionOrbitIcons(detail);
  bindOrbitResize(detail);

  const threads = detail.querySelectorAll(".service-thread");
  const threadPaths = detail.querySelectorAll(".service-thread__path");
  const floatIcons = detail.querySelectorAll(".service-detail__float-icon");
  const floatIconInners = detail.querySelectorAll(".service-detail__float-icon-inner");
  const orbitRing = detail.querySelector(".service-detail__orbit-path");
  const headerBox = detail.querySelector(".service-detail__header-box");
  const title = detail.querySelector(".service-detail__title");
  const panel = detail.querySelector(".service-detail__panel");
  const backBtn = detail.querySelector(".service-detail__back");
  const chrome = getCarouselChrome();
  const siblingCards = getSiblingCards(sourceCard);
  const orbitOrigin = getOrbitOrigin(detail);
  const useBlur = canSoftBlur();

  if (prefersReducedMotion()) {
    if (sourceCard) gsap.set(sourceCard, { autoAlpha: 0 });
    gsap.set(siblingCards, { autoAlpha: 0 });
    gsap.set(chrome, { autoAlpha: 0 });
    gsap.set(detail, { autoAlpha: 1 });
    gsap.set(backBtn, { autoAlpha: 1, x: 0 });
    gsap.set(headerBox, { autoAlpha: 1, scale: 1, y: 0, filter: "none" });
    gsap.set(title, { autoAlpha: 1 });
    gsap.set(panel, { autoAlpha: 1, scale: 1 });
    gsap.set(orbitRing, { autoAlpha: 0.35, strokeDashoffset: 0 });
    gsap.set(floatIcons, {
      autoAlpha: 0.94,
      scale: 1,
      xPercent: -50,
      yPercent: -50,
      x: 0,
      y: 0,
      rotation: 0,
    });
    gsap.set(floatIconInners, { scale: 1, x: 0, y: 0, rotation: 0 });
    gsap.set(threadPaths, { autoAlpha: 1, strokeDashoffset: 0 });
    gsap.set(threads, { autoAlpha: 1, scale: 1 });
    backBtn?.focus();
    return;
  }

  /* Soft dissolve setup */
  gsap.set(backBtn, { autoAlpha: 0, x: -6 });
  gsap.set(panel, { autoAlpha: 1, scale: 1 });
  gsap.set(headerBox, {
    autoAlpha: 0,
    scale: 0.94,
    y: 10,
    filter: useBlur ? "blur(8px)" : "none",
    transformOrigin: "50% 50%",
    force3D: true,
  });
  gsap.set(title, { autoAlpha: 1 });
  gsap.set(orbitRing, { autoAlpha: 0, strokeDashoffset: 160 });
  floatIcons.forEach((icon) => {
    const targetX = parseFloat(icon.dataset.orbitX || "0");
    const targetY = parseFloat(icon.dataset.orbitY || "0");
    gsap.set(icon, {
      autoAlpha: 0,
      scale: 0.2,
      xPercent: -50,
      yPercent: -50,
      x: orbitOrigin.x - targetX,
      y: orbitOrigin.y - targetY,
      rotation: 0,
    });
    const inner = icon.querySelector(".service-detail__float-icon-inner");
    if (inner) gsap.set(inner, { x: 0, y: 0, rotation: 0, scale: 0.75 });
  });
  gsap.set(threadPaths, { autoAlpha: 0, strokeDashoffset: 120 });
  gsap.set(threads, { autoAlpha: 0, scale: 0.94 });
  gsap.set(detail, { opacity: 1 });

  serviceDetailTween = gsap.timeline({
    defaults: { ease: window.Motion ? Motion.ease() : "power2.out" },
    onComplete: () => {
      gsap.set(headerBox, { clearProps: "filter,transform,scale,y" });
      positionOrbitIcons(detail);
      floatIcons.forEach((icon) => {
        gsap.set(icon, { x: 0, y: 0, xPercent: -50, yPercent: -50, scale: 1, autoAlpha: 0.94 });
      });
      startThreadFloatAnimations(threads);
      startFloatIconAnimations(floatIcons);
      startIconParallax(detail, floatIcons);
      backBtn?.focus();
    },
  });

  /* Phase 1 — card soft-dissolves; title box settles in place */
  serviceDetailTween.to(siblingCards, { autoAlpha: 0, duration: 0.28, stagger: 0.02 }, 0);
  serviceDetailTween.to(chrome, { autoAlpha: 0, duration: 0.3 }, 0);

  if (sourceCard) {
    serviceDetailTween.to(
      sourceCard,
      {
        autoAlpha: 0,
        scale: 0.92,
        filter: useBlur ? "blur(10px)" : "none",
        duration: 0.42,
        ease: window.Motion ? Motion.ease() : "power2.inOut",
      },
      0
    );
  }

  serviceDetailTween.to(
    headerBox,
    {
      autoAlpha: 1,
      scale: 1,
      y: 0,
      filter: "blur(0px)",
      duration: 0.48,
      ease: window.Motion ? Motion.ease() : "power2.out",
    },
    0.12
  );
  serviceDetailTween.to(backBtn, { autoAlpha: 1, x: 0, duration: 0.32 }, 0.28);

  /* Phase 2 — icons spring onto the orbit */
  const iconsAt = 0.38;
  serviceDetailTween.to(
    orbitRing,
    {
      autoAlpha: 0.42,
      strokeDashoffset: 0,
      duration: 0.55,
      ease: window.Motion ? Motion.ease() : "power1.out",
    },
    iconsAt
  );
  serviceDetailTween.to(
    floatIcons,
    {
      autoAlpha: 0.94,
      scale: 1,
      x: 0,
      y: 0,
      xPercent: -50,
      yPercent: -50,
      rotation: 0,
      duration: 0.55,
      stagger: 0.07,
      ease: window.Motion ? Motion.springSnap() : "back.out(1.5)",
    },
    iconsAt + 0.04
  );
  serviceDetailTween.to(
    floatIconInners,
    {
      scale: 1,
      duration: 0.4,
      stagger: 0.07,
      ease: window.Motion ? Motion.springUi() : "back.out(1.2)",
    },
    iconsAt + 0.08
  );
  serviceDetailTween.to(
    threadPaths,
    {
      autoAlpha: 1,
      strokeDashoffset: 0,
      duration: 0.45,
      stagger: 0.05,
      ease: window.Motion ? Motion.ease() : "power1.out",
    },
    iconsAt + 0.12
  );
  serviceDetailTween.to(
    threads,
    { autoAlpha: 1, scale: 1, duration: 0.38, stagger: 0.05 },
    iconsAt + 0.14
  );
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
  const floatIconInners = detail.querySelectorAll(".service-detail__float-icon-inner");
  const headerBox = detail.querySelector(".service-detail__header-box");
  const title = detail.querySelector(".service-detail__title");
  const backBtn = detail.querySelector(".service-detail__back");
  const threads = detail.querySelectorAll(".service-thread");
  const threadPaths = detail.querySelectorAll(".service-thread__path");
  const orbitRing = detail.querySelector(".service-detail__orbit-path");
  const orbitOrigin = getOrbitOrigin(detail);
  const chrome = getCarouselChrome();
  const siblingCards = getSiblingCards(lastFocusedCard);
  const useBlur = canSoftBlur();

  gsap.killTweensOf(floatIcons);
  gsap.killTweensOf(floatIconInners);

  stage.classList.remove("is-service-view");
  if (typeof unlockServiceViewScroll === "function") unlockServiceViewScroll();

  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    gsap.killTweensOf(detail);
    gsap.killTweensOf(chrome);
    gsap.set(headerBox, { clearProps: "transform,scale,y,filter" });
    gsap.set(title, { clearProps: "opacity,visibility" });
    resetAllFolderCards();
    gsap.set(detail, { autoAlpha: 0 });
    detail.hidden = true;
    detail.setAttribute("aria-hidden", "true");
    isServiceDetailOpen = false;
    if (typeof refreshCarouselPosition === "function") refreshCarouselPosition();
    if (lastFocusedCard) lastFocusedCard.focus({ preventScroll: true });
  };

  if (prefersReducedMotion()) {
    resetAllFolderCards();
    if (typeof refreshCarouselPosition === "function") refreshCarouselPosition();
    gsap.set(detail, { autoAlpha: 0 });
    gsap.set(chrome, { autoAlpha: 1 });
    finish();
    return;
  }

  if (typeof refreshCarouselPosition === "function") refreshCarouselPosition();
  if (lastFocusedCard) {
    gsap.set(lastFocusedCard, {
      autoAlpha: 0,
      scale: 0.94,
      filter: useBlur ? "blur(8px)" : "none",
    });
  }
  gsap.set(siblingCards, { autoAlpha: 0 });
  gsap.set(chrome, { autoAlpha: 0 });

  serviceDetailTween = gsap.timeline({
    defaults: { ease: window.Motion ? Motion.ease() : "power2.out" },
    onComplete: finish,
  });

  /* Icons collapse inward */
  serviceDetailTween.to(
    floatIcons,
    {
      autoAlpha: 0,
      scale: 0.22,
      x: (i, el) => orbitOrigin.x - parseFloat(el.dataset.orbitX || "0"),
      y: (i, el) => orbitOrigin.y - parseFloat(el.dataset.orbitY || "0"),
      duration: 0.28,
      stagger: 0.03,
    },
    0
  );
  serviceDetailTween.to(floatIconInners, { scale: 0.75, duration: 0.2, stagger: 0.03 }, 0);
  serviceDetailTween.to(threadPaths, { autoAlpha: 0, duration: 0.18 }, 0);
  serviceDetailTween.to(threads, { autoAlpha: 0, scale: 0.94, duration: 0.2 }, 0);
  serviceDetailTween.to(orbitRing, { autoAlpha: 0, duration: 0.2 }, 0);
  serviceDetailTween.to(backBtn, { autoAlpha: 0, duration: 0.16 }, 0);

  /* Title box soft-dissolves; card returns */
  serviceDetailTween.to(
    headerBox,
    {
      autoAlpha: 0,
      scale: 0.94,
      y: 8,
      filter: useBlur ? "blur(6px)" : "none",
      duration: 0.32,
    },
    0.1
  );

  if (lastFocusedCard) {
    serviceDetailTween.to(
      lastFocusedCard,
      {
        autoAlpha: 1,
        scale: 1,
        filter: "blur(0px)",
        duration: 0.4,
        ease: window.Motion ? Motion.ease() : "power2.out",
      },
      0.22
    );
  }
  serviceDetailTween.to(detail, { autoAlpha: 0, duration: 0.22 }, 0.38);
  serviceDetailTween.to(siblingCards, { autoAlpha: 1, duration: 0.28, stagger: 0.02 }, 0.32);
  serviceDetailTween.to(chrome, { autoAlpha: 1, duration: 0.3 }, 0.3);
  serviceDetailTween.call(finish, null, 0.72);
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
      if (typeof cardNavigating !== "undefined" && cardNavigating) return;
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

  resetAllFolderCards();
}
