const CARD_REVEAL_SELECTORS = [".card-title", ".card-tagline", ".card-meta"];

let activeCardTween = null;
let closeCardTween = null;
let hoverTween = null;
let boundHoverItem = null;
let lastPointer = { x: -1, y: -1 };
let pointerTracking = false;

function isFinePointer() {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

function ensurePointerTracking() {
  if (pointerTracking) return;
  pointerTracking = true;
  window.addEventListener(
    "pointermove",
    (e) => {
      lastPointer.x = e.clientX;
      lastPointer.y = e.clientY;
    },
    { passive: true }
  );
}

function isPointerOverCard(card) {
  if (!card) return false;
  if (card.matches(":hover")) return true;
  if (lastPointer.x < 0 || lastPointer.y < 0) return false;

  const top = document.elementFromPoint(lastPointer.x, lastPointer.y);
  return Boolean(top && (top === card || card.contains(top)));
}

function getActiveCard() {
  return document.querySelector(".carousel-item.is-active .card");
}

function getFolderParts(card) {
  if (!card) return null;

  return {
    flap: card.querySelector(".file-flap"),
    pocket: card.querySelector(".file-pocket"),
    sheets: card.querySelectorAll(".file-sheet"),
  };
}

function clearSheetTransforms(sheets) {
  sheets.forEach((sheet) => gsap.set(sheet, { clearProps: "transform,x,y,rotation,xPercent,yPercent,scale" }));
}

function resetCardContent(card) {
  if (!card || prefersReducedMotion()) return;

  CARD_REVEAL_SELECTORS.forEach((selector) => {
    const el = card.querySelector(selector);
    if (el) gsap.set(el, { clearProps: "all" });
  });

  const parts = getFolderParts(card);
  if (!parts) return;

  card.classList.remove("is-folder-open");
  if (parts.flap) gsap.set(parts.flap, { clearProps: "all" });
  if (parts.pocket) gsap.set(parts.pocket, { clearProps: "all" });
  clearSheetTransforms(parts.sheets);
  parts.sheets.forEach((sheet) => gsap.set(sheet, { clearProps: "opacity,visibility,autoAlpha" }));
}

function killFolderTimeline(card) {
  if (!card?._folderTl) return;
  card._folderTl.kill();
  delete card._folderTl;
}

function getFolderTimeline(card, flap) {
  if (card._folderTl) return card._folderTl;

  gsap.set(flap, {
    transformOrigin: "50% 100%",
    force3D: true,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
  });

  const ease = window.Motion ? Motion.ease() : "power2.out";

  const tl = gsap.timeline({
    paused: true,
    onReverseComplete: () => {
      card.classList.remove("is-folder-open");
    },
  });

  /* power2.out opens smoothly; reverse() becomes power2.in for a soft close */
  tl.to(
    flap,
    {
      rotationX: -48,
      rotationY: 0,
      rotationZ: 0,
      duration: 0.55,
      ease,
    },
    0
  );

  card._folderTl = tl;
  return tl;
}

function unbindFileHover() {
  if (!boundHoverItem) return;

  const card = boundHoverItem.querySelector(".card");
  if (card) {
    card.removeEventListener("mouseenter", card._onFileEnter);
    card.removeEventListener("mouseleave", card._onFileLeave);
    killFolderTimeline(card);
    card.classList.remove("is-folder-open");
    const flap = card.querySelector(".file-flap");
    if (flap) gsap.set(flap, { rotationX: 0, rotationY: 0, rotationZ: 0 });
    delete card._onFileEnter;
    delete card._onFileLeave;
  }

  boundHoverItem = null;
}

function bindFileHover(item, card) {
  if (!isFinePointer() || isMobileCarousel()) return;

  ensurePointerTracking();
  unbindFileHover();
  boundHoverItem = item;

  const parts = getFolderParts(card);
  if (parts.flap) getFolderTimeline(card, parts.flap);

  const onEnter = () => {
    if (!item.classList.contains("is-active")) return;
    if (!parts.flap) return;

    const tl = getFolderTimeline(card, parts.flap);
    card.classList.add("is-folder-open");
    hoverTween = tl;
    tl.play();
  };

  const onLeave = () => {
    if (!parts.flap) return;

    const tl = getFolderTimeline(card, parts.flap);
    hoverTween = tl;
    /* Keep is-folder-open until reverse finishes so filters/perspective don't snap */
    tl.reverse();
  };

  card._onFileEnter = onEnter;
  card._onFileLeave = onLeave;
  card.addEventListener("mouseenter", onEnter);
  card.addEventListener("mouseleave", onLeave);

  /*
   * After scroll, the pointer may already sit on the new active card without a
   * mouseenter. Sync open/closed to the current pointer hit-test.
   */
  const syncPointerHover = () => {
    if (!item.classList.contains("is-active") || boundHoverItem !== item) return;
    if (isPointerOverCard(card)) onEnter();
    else if (card.classList.contains("is-folder-open") || (card._folderTl && card._folderTl.progress() > 0)) {
      onLeave();
    }
  };

  requestAnimationFrame(() => {
    syncPointerHover();
    /* Cards are still tweening on the arc — recheck once motion settles */
    window.setTimeout(syncPointerHover, 320);
  });
}

function animateFolderClose(card) {
  const parts = getFolderParts(card);
  if (!parts) return null;

  if (closeCardTween) closeCardTween.kill();
  if (hoverTween) {
    if (hoverTween !== card._folderTl) hoverTween.kill();
  }
  killFolderTimeline(card);

  card.classList.remove("is-folder-open");
  gsap.set(card, { y: 0 });
  if (parts.flap) {
    gsap.set(parts.flap, {
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0,
      y: 0,
    });
  }
  /* Hand layout back to CSS so papers match non-active centering */
  clearSheetTransforms(parts.sheets);

  return null;
}

function animateFolderOpen(item, card) {
  const parts = getFolderParts(card);
  if (!parts) return;

  const targets = CARD_REVEAL_SELECTORS.map((s) => card.querySelector(s)).filter(Boolean);
  const mobile = isMobileCarousel();
  const reduced = prefersReducedMotion();

  /* Always use CSS sheet positions — do not GSAP-nudge papers */
  clearSheetTransforms(parts.sheets);

  if (mobile || reduced) {
    gsap.set(card, { y: -10 });
    if (parts.flap) {
      gsap.set(parts.flap, { rotationX: 0, rotationY: 0, rotationZ: 0, y: 0 });
    }
    return;
  }

  if (activeCardTween) activeCardTween.kill();

  gsap.set(card, { y: -14, autoAlpha: 1 });
  if (parts.flap) {
    gsap.set(parts.flap, {
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0,
      y: 0,
      autoAlpha: 1,
      transformOrigin: "50% 100%",
      force3D: true,
    });
  }
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
  ensurePointerTracking();

  const firstActive = getActiveCard();
  const firstItem = document.querySelector(".carousel-item.is-active");

  if (firstActive && firstItem) {
    if (!isMobileCarousel() && !prefersReducedMotion()) {
      const parts = getFolderParts(firstActive);
      gsap.set(firstActive, { y: -14 });
      clearSheetTransforms(parts.sheets);
      if (parts.flap) {
        gsap.set(parts.flap, {
          rotationX: 0,
          rotationY: 0,
          rotationZ: 0,
          transformOrigin: "50% 100%",
          force3D: true,
        });
      }
      bindFileHover(firstItem, firstActive);
    } else {
      gsap.set(firstActive, { y: -10 });
    }
  }
}
