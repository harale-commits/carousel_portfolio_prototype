const PROJECTS = [
  {
    hue: 250,
    services: ["Brand Strategy", "Logo Design", "Visual Identity", "Design Systems"],
  },
  {
    hue: 320,
    services: ["UI / UX Design", "Frontend Dev", "Data Visualization", "Design Systems"],
  },
  {
    hue: 180,
    services: ["Store Design", "Shopify Dev", "Product Direction", "Conversion UX"],
  },
  {
    hue: 40,
    services: ["iOS & Android UI", "React Native", "Prototyping", "User Research"],
  },
  {
    hue: 210,
    services: ["WebGL Experiences", "3D Modeling", "Interactive Installations", "Shader Dev"],
  },
  {
    hue: 140,
    services: ["Editorial Design", "Typography", "CMS Integration", "Art Direction"],
  },
];

const SERVICES_ARC = { x0: 85, y0: 362, cx: 500, cy: 62, x1: 915, y1: 362 };

const servicesOrbit = document.getElementById("services-orbit");
const servicesConnectors = document.getElementById("services-connectors");

let orbitVisible = false;
let orbitProjectIndex = -1;
let orbitCenterT = 0.5;
let orbitTween = null;
let satellites = [];
let hideTimeout = null;
const isTouchDevice = window.matchMedia("(hover: none)").matches;

function cancelOrbitHide() {
  if (hideTimeout) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }
}

function scheduleOrbitHide() {
  cancelOrbitHide();
  hideTimeout = setTimeout(hideOrbit, 140);
}

function bindSatelliteHover() {
  satellites.forEach((sat) => {
    sat.addEventListener("mouseenter", cancelOrbitHide);
    sat.addEventListener("mouseleave", scheduleOrbitHide);
  });
}

function getServiceArcPoint(t) {
  const { x0, y0, cx, cy, x1, y1 } = SERVICES_ARC;
  const mt = 1 - t;
  const x = mt * mt * x0 + 2 * mt * t * cx + t * t * x1;
  const y = mt * mt * y0 + 2 * mt * t * cy + t * t * y1;
  return { x, y };
}

function getServiceSpread() {
  if (window.innerWidth <= 480) return 0.14;
  if (window.innerWidth <= 900) return 0.18;
  return 0.24;
}

function getServiceTs(count, centerT) {
  const spread = getServiceSpread();
  if (count === 1) return [centerT];
  const step = spread / (count - 1);
  const start = centerT - spread / 2;
  return Array.from({ length: count }, (_, i) => gsap.utils.clamp(0.04, 0.96, start + i * step));
}

function buildSatellites(projectIndex) {
  servicesOrbit.innerHTML = "";
  satellites = [];
  const project = PROJECTS[projectIndex];
  if (!project) return;

  project.services.forEach((label, i) => {
    const el = document.createElement("div");
    el.className = "service-satellite";
    el.style.setProperty("--sat-hue", project.hue);
    el.innerHTML = `<span class="service-satellite-dot"></span><span class="service-satellite-label">${label}</span>`;
    servicesOrbit.appendChild(el);
    satellites.push(el);
  });

  if (!isTouchDevice) bindSatelliteHover();
}

function drawConnectors(cardPoint, servicePoints) {
  const vb = stage.querySelector(".arc-svg").viewBox.baseVal;
  servicesConnectors.setAttribute("viewBox", `0 0 ${vb.width} ${vb.height}`);
  servicesConnectors.innerHTML = "";

  servicePoints.forEach((pt) => {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", cardPoint.x);
    line.setAttribute("y1", cardPoint.y);
    line.setAttribute("x2", pt.x);
    line.setAttribute("y2", pt.y);
    servicesConnectors.appendChild(line);
  });
}

function positionOrbit(projectIndex, centerT, animateIn = false) {
  if (!servicesOrbit || projectIndex < 0) return;

  const project = PROJECTS[projectIndex];
  if (!project) return;

  if (projectIndex !== orbitProjectIndex) {
    buildSatellites(projectIndex);
    orbitProjectIndex = projectIndex;
  }

  const { scaleX, scaleY } = getStageMetrics();
  const ts = getServiceTs(project.services.length, centerT);
  const cardArc = getArcPoint(centerT);
  const cardTopY = cardArc.y - 40;

  const servicePoints = ts.map((t) => getServiceArcPoint(t));

  drawConnectors({ x: cardArc.x, y: cardTopY }, servicePoints);

  satellites.forEach((el, i) => {
    const pt = servicePoints[i];
    const x = pt.x * scaleX;
    const y = pt.y * scaleY;

    if (animateIn) {
      gsap.set(el, { x, y, xPercent: -50, yPercent: -50, visibility: "visible" });
    } else {
      gsap.set(el, { x, y, xPercent: -50, yPercent: -50, visibility: "visible" });
    }
  });

  orbitCenterT = centerT;
}

function showOrbit(projectIndex, centerT) {
  cancelOrbitHide();

  if (prefersReducedMotion()) {
    orbitVisible = true;
    servicesOrbit.classList.add("is-visible");
    servicesOrbit.setAttribute("aria-hidden", "false");
    positionOrbit(projectIndex, centerT);
    gsap.set(satellites, { autoAlpha: 1 });
    return;
  }

  if (orbitTween) orbitTween.kill();

  const isNew = !orbitVisible || orbitProjectIndex !== projectIndex;
  orbitVisible = true;
  servicesOrbit.classList.add("is-visible");
  servicesOrbit.setAttribute("aria-hidden", "false");

  positionOrbit(projectIndex, centerT, true);

  if (isNew) {
    gsap.set(satellites, { autoAlpha: 0, scale: 0.6 });
    orbitTween = gsap.to(satellites, {
      autoAlpha: 1,
      scale: 1,
      duration: 0.38,
      stagger: 0.07,
      ease: "back.out(1.4)",
    });
    gsap.fromTo(
      servicesConnectors.querySelectorAll("line"),
      { strokeDashoffset: 20, autoAlpha: 0 },
      { strokeDashoffset: 0, autoAlpha: 1, duration: 0.35, stagger: 0.05, ease: "power2.out" },
      "-=0.25"
    );
  }
}

function hideOrbit() {
  if (!orbitVisible) return;
  orbitVisible = false;
  servicesOrbit.classList.remove("is-visible");
  servicesOrbit.setAttribute("aria-hidden", "true");

  if (orbitTween) orbitTween.kill();

  if (prefersReducedMotion()) {
    gsap.set(satellites, { autoAlpha: 0, visibility: "hidden" });
    servicesConnectors.innerHTML = "";
    return;
  }

  orbitTween = gsap.to(satellites, {
    autoAlpha: 0,
    scale: 0.75,
    duration: 0.22,
    stagger: 0.03,
    ease: "power2.in",
    onComplete: () => {
      gsap.set(satellites, { visibility: "hidden" });
      servicesConnectors.innerHTML = "";
    },
  });
}

function updateOrbitIfVisible(centerIndex, centerT) {
  if (!orbitVisible) return;
  positionOrbit(centerIndex, centerT);
}

function initServicesOrbit() {
  if (!servicesOrbit) return;

  items.forEach((item) => {
    const card = item.querySelector(".card");
    const projectIndex = parseInt(card.dataset.project, 10);

    if (isTouchDevice) {
      card.addEventListener("click", (e) => {
        if (!item.classList.contains("is-active")) return;
        e.stopPropagation();
        if (orbitVisible && orbitProjectIndex === projectIndex) {
          hideOrbit();
        } else {
          showOrbit(projectIndex, orbitCenterT);
        }
      });
      return;
    }

    card.addEventListener("mouseenter", () => {
      if (!item.classList.contains("is-active")) return;
      showOrbit(projectIndex, orbitCenterT);
    });

    card.addEventListener("mouseleave", () => {
      if (!item.classList.contains("is-active")) return;
      scheduleOrbitHide();
    });
  });

  if (isTouchDevice) {
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".carousel-item.is-active .card") && !e.target.closest(".service-satellite")) {
        hideOrbit();
      }
    });
  }
}
