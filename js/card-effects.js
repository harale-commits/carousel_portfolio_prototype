const CARD_REVEAL_SELECTORS = [".card-title", ".card-tagline"];

let activeCardTween = null;
let closeCardTween = null;
let hoverTween = null;
let boundHoverItem = null;

function isFinePointer() {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

function getActiveCard() {
  return document.querySelector(".carousel-item.is-active .card");
}

function getFolderParts(card) {
  if (!card) return null;

  return {
    tab: card.querySelector(".file-tab"),
    icon: card.querySelector(".file-tab-icon"),
    badge: card.querySelector(".file-tab-badge"),
    sheets: card.querySelectorAll(".file-sheet"),
    face: card.querySelector(".file-face"),
    clip: card.querySelector(".file-clip"),
    glow: card.querySelector(".file-glow"),
    grid: card.querySelector(".file-grid"),
    sweep: card.querySelector(".file-sweep"),
    fold: card.querySelector(".file-fold"),
  };
}

function resetCardContent(card) {
  if (!card || prefersReducedMotion()) return;

  CARD_REVEAL_SELECTORS.forEach((selector) => {
    const el = card.querySelector(selector);
    if (el) gsap.set(el, { clearProps: "all" });
  });

  const parts = getFolderParts(card);
  if (!parts) return;

  [
    parts.tab,
    parts.icon,
    parts.badge,
    parts.face,
    parts.clip,
    parts.glow,
    parts.grid,
    parts.fold,
    parts.sweep,
  ].forEach((el) => {
    if (el) gsap.set(el, { clearProps: "all" });
  });

  parts.sheets.forEach((sheet) => gsap.set(sheet, { clearProps: "all" }));
  parts.sweep?.classList.remove("is-sweeping");
}

function unbindFileHover() {
  if (!boundHoverItem) return;

  const card = boundHoverItem.querySelector(".card");
  if (card) {
    card.removeEventListener("mouseenter", card._onFileEnter);
    card.removeEventListener("mouseleave", card._onFileLeave);
  }

  boundHoverItem = null;
}

function bindFileHover(item, card) {
  if (!isFinePointer() || isMobileCarousel()) return;

  unbindFileHover();
  boundHoverItem = item;

  const parts = getFolderParts(card);

  const onEnter = () => {
    if (!item.classList.contains("is-active")) return;
    if (hoverTween) hoverTween.kill();

    hoverTween = gsap.timeline({ defaults: { ease: "power2.out", overwrite: "auto" } });
    hoverTween.to(parts.sheets[0], { rotation: -7, y: 11, x: -6, duration: 0.38 }, 0);
    hoverTween.to(parts.sheets[1], { rotation: 4.5, y: 6, x: 5, duration: 0.38 }, 0);
    hoverTween.to(parts.face, { y: -6, duration: 0.42 }, 0);
    hoverTween.to(parts.tab, { y: -6, duration: 0.34 }, 0);
    if (parts.glow) hoverTween.to(parts.glow, { scale: 1.1, duration: 0.42 }, 0);
  };

  const onLeave = () => {
    if (hoverTween) hoverTween.kill();
    hoverTween = gsap.to([...parts.sheets, parts.face, parts.tab], {
      rotation: 0,
      rotationX: 0,
      x: 0,
      y: (i, el) => (el === parts.tab ? -2 : 0),
      duration: 0.38,
      ease: "power2.out",
      overwrite: "auto",
    });
  };

  card._onFileEnter = onEnter;
  card._onFileLeave = onLeave;
  card.addEventListener("mouseenter", onEnter);
  card.addEventListener("mouseleave", onLeave);
}

function animateFolderClose(card) {
  const parts = getFolderParts(card);
  if (!parts) return null;

  if (closeCardTween) closeCardTween.kill();

  gsap.set(card, { y: 0 });
  gsap.set(parts.tab, { rotationX: 0, y: 0 });
  gsap.set(parts.face, { rotationX: 0, y: 0 });
  gsap.set(parts.sheets, { rotation: 0, x: 0, y: (i) => (i === 0 ? 3 : 1), autoAlpha: 0.2 });

  return null;
}

function animateFolderOpen(item, card) {
  const parts = getFolderParts(card);
  if (!parts) return;

  const targets = CARD_REVEAL_SELECTORS.map((s) => card.querySelector(s)).filter(Boolean);
  const mobile = isMobileCarousel();
  const reduced = prefersReducedMotion();

  if (mobile || reduced) {
    gsap.set(card, { y: -10 });
    gsap.set(parts.tab, { rotationX: -6, y: -2, transformOrigin: "bottom left" });
    gsap.set(parts.sheets, {
      autoAlpha: 0.55,
      rotation: (i) => (i === 0 ? -3 : 2),
      y: (i) => (i === 0 ? 6 : 3),
    });
    gsap.set(parts.face, { rotationX: 0, y: 0 });
    gsap.set(parts.clip, { autoAlpha: 1 });
    return;
  }

  if (activeCardTween) activeCardTween.kill();

  gsap.set(card, { y: -14, autoAlpha: 1 });
  gsap.set(parts.tab, {
    y: -2,
    rotationX: 0,
    autoAlpha: 1,
    transformOrigin: "bottom left",
  });
  gsap.set(parts.sheets, {
    autoAlpha: (i) => (i === 0 ? 0.52 : 0.76),
    rotation: (i) => (i === 0 ? -5 : 3),
    y: (i) => (i === 0 ? 9 : 4),
    x: (i) => (i === 0 ? -5 : 4),
  });
  gsap.set(parts.face, { rotationX: 0, y: 0, autoAlpha: 1, transformOrigin: "50% 100%" });
  gsap.set(parts.clip, { y: 0, autoAlpha: 1 });
  gsap.set(parts.grid, { autoAlpha: 0.2 });
  gsap.set(parts.glow, { scale: 1, autoAlpha: 1 });
  gsap.set(targets, { autoAlpha: 1, y: 0 });

  bindFileHover(item, card);
}

function animateCardActivation(index, prevIndex) {
  const item = items[index];
  const card = item?.querySelector(".card");
  const prevItem = prevIndex >= 0 ? items[prevIndex] : null;
  const prevCard = prevItem?.querySelector(".card");

  if (!card) return;

  if (activeCardTween) activeCardTween.kill();

  if (prevCard && prevCard !== card) {
    animateFolderClose(prevCard);
    resetCardContent(prevCard);
  }

  animateFolderOpen(item, card);
}

function initCardEffects() {
  const firstActive = getActiveCard();
  const firstItem = document.querySelector(".carousel-item.is-active");

  if (firstActive && firstItem) {
    if (!isMobileCarousel() && !prefersReducedMotion()) {
      const parts = getFolderParts(firstActive);
      gsap.set(firstActive, { y: -14 });
      gsap.set(parts.tab, { rotationX: 0, y: -2, transformOrigin: "bottom left" });
      gsap.set(parts.sheets, {
        rotation: (i) => (i === 0 ? -5 : 3),
        y: (i) => (i === 0 ? 9 : 4),
        x: (i) => (i === 0 ? -5 : 4),
        autoAlpha: (i) => (i === 0 ? 0.52 : 0.76),
      });
      gsap.set(parts.clip, { autoAlpha: 1 });
      bindFileHover(firstItem, firstActive);
    } else {
      gsap.set(firstActive, { y: -10 });
    }
  }
}
