const CARD_REVEAL_SELECTORS = [
  ".card-meta",
  ".card-title",
  ".card-text",
  ".card-footer",
];

let activeCardTween = null;
let cursorLightCard = null;

function isFinePointer() {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

function getActiveCard() {
  return document.querySelector(".carousel-item.is-active .card");
}

function resetCardContent(card) {
  if (!card || prefersReducedMotion()) return;

  CARD_REVEAL_SELECTORS.forEach((selector) => {
    const el = card.querySelector(selector);
    if (el) gsap.set(el, { clearProps: "all" });
  });

  const scene = card.querySelector(".card-visual-scene");
  const cta = card.querySelector(".card-cta");
  if (scene) gsap.set(scene, { clearProps: "clipPath,scale,autoAlpha" });
  if (cta) gsap.set(cta, { clearProps: "all" });
}

function animateCardActivation(index, prevIndex) {
  const card = items[index]?.querySelector(".card");
  const prevCard = prevIndex >= 0 ? items[prevIndex]?.querySelector(".card") : null;

  if (!card) return;

  if (activeCardTween) activeCardTween.kill();

  if (prevCard && prevCard !== card) {
    gsap.to(prevCard, {
      y: 0,
      duration: 0.35,
      ease: "power2.out",
      overwrite: "auto",
    });
    resetCardContent(prevCard);
  }

  bindCursorLight(card);

  if (prefersReducedMotion()) {
    gsap.set(card, { y: -10 });
    return;
  }

  const scene = card.querySelector(".card-visual-scene");
  const targets = CARD_REVEAL_SELECTORS.map((s) => card.querySelector(s)).filter(Boolean);

  gsap.set(targets, { autoAlpha: 0, y: 14 });
  if (scene) {
    gsap.set(scene, {
      clipPath: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)",
      scale: 1.06,
      autoAlpha: 0.85,
    });
  }

  activeCardTween = gsap.timeline({ defaults: { ease: "power3.out" } });

  activeCardTween.to(
    card,
    { y: -12, duration: 0.55, ease: "power2.out" },
    0
  );

  if (scene) {
    activeCardTween.to(
      scene,
      {
        clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
        scale: 1,
        autoAlpha: 1,
        duration: 0.65,
      },
      0.05
    );
  }

  activeCardTween.to(
    targets,
    {
      autoAlpha: 1,
      y: 0,
      duration: 0.45,
      stagger: 0.07,
    },
    0.18
  );
}

function bindCursorLight(card) {
  if (!isFinePointer()) return;

  const light = card.querySelector(".card-cursor-light");
  if (!light) return;

  if (cursorLightCard && cursorLightCard !== card) {
    cursorLightCard.removeEventListener("mousemove", cursorLightCard._onCursorMove);
    cursorLightCard.removeEventListener("mouseleave", cursorLightCard._onCursorLeave);
  }

  cursorLightCard = card;

  const onMove = (e) => {
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    light.style.setProperty("--cursor-x", `${x}%`);
    light.style.setProperty("--cursor-y", `${y}%`);
    light.style.opacity = "1";
  };

  const onLeave = () => {
    light.style.opacity = "0";
  };

  card._onCursorMove = onMove;
  card._onCursorLeave = onLeave;

  card.addEventListener("mousemove", onMove);
  card.addEventListener("mouseleave", onLeave);
}

function initCardEffects() {
  const firstActive = getActiveCard();
  if (firstActive) {
    if (!prefersReducedMotion()) gsap.set(firstActive, { y: -12 });
    bindCursorLight(firstActive);
  }
}
