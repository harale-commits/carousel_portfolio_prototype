function initAmbientParticles() {
  const canvas = document.querySelector(".ambient-particles");
  const container = canvas?.closest(".ambient");
  if (!canvas || !container) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let particles = [];
  let width = 0;
  let height = 0;
  let dpr = 1;
  let rafId = 0;
  let running = false;
  let lastTime = 0;
  const mouse = { x: 0, y: 0, active: false };
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function isMobile() {
    return window.matchMedia("(max-width: 900px)").matches;
  }

  function particleCount() {
    if (reducedMotion) return 90;
    if (isMobile() || document.body.classList.contains("is-mobile-perf")) return 120;
    return 200;
  }

  function getHue() {
    const hue = getComputedStyle(document.documentElement).getPropertyValue("--glow-hue").trim();
    const parsed = parseFloat(hue);
    return Number.isFinite(parsed) ? parsed : 280;
  }

  function resize() {
    const rect = container.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, isMobile() ? 1.5 : 2);
    width = Math.max(rect.width, 1);
    height = Math.max(rect.height, 1);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function createParticle() {
    const hue = getHue();
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2 - 0.05,
      size: 2 + Math.random() * 3.8,
      hue,
      hueOffset: (Math.random() - 0.5) * 24,
      sat: 72 + Math.random() * 10,
      light: 58 + Math.random() * 10,
      alpha: 0.28 + Math.random() * 0.22,
      phase: Math.random() * Math.PI * 2,
      drift: 0.3 + Math.random() * 0.5,
    };
  }

  function seedParticles() {
    particles = Array.from({ length: particleCount() }, createParticle);
  }

  function syncParticleHue(p) {
    const targetHue = getHue() + p.hueOffset;
    p.hue += (targetHue - p.hue) * 0.04;
  }

  function drawParticle(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = `hsl(${p.hue}, ${p.sat}%, ${p.light}%)`;
    ctx.shadowColor = `hsla(${p.hue}, 80%, 62%, 0.45)`;
    ctx.shadowBlur = p.size * (isMobile() ? 1.4 : 1.8);
    ctx.beginPath();
    ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function wrapParticle(p) {
    const pad = 12;
    if (p.x < -pad) p.x = width + pad;
    if (p.x > width + pad) p.x = -pad;
    if (p.y < -pad) p.y = height + pad;
    if (p.y > height + pad) p.y = -pad;
  }

  function updateParticle(p, time) {
    syncParticleHue(p);

    const t = time * 0.001;
    p.x += p.vx + Math.sin(t * p.drift + p.phase) * 0.12;
    p.y += p.vy + Math.cos(t * p.drift * 0.85 + p.phase) * 0.1;

    if (mouse.active && !reducedMotion) {
      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const dist = Math.hypot(dx, dy) || 1;
      const radius = isMobile() ? 80 : 120;
      if (dist < radius) {
        const force = (1 - dist / radius) * 0.24;
        p.vx += (dx / dist) * force;
        p.vy += (dy / dist) * force;
      }
    }

    p.vx *= 0.989;
    p.vy *= 0.989;
    wrapParticle(p);
  }

  function render(time) {
    ctx.clearRect(0, 0, width, height);
    particles.forEach((p) => {
      if (!reducedMotion) updateParticle(p, time);
      else syncParticleHue(p);
      drawParticle(p);
    });
  }

  function frame(time) {
    if (!running) return;
    render(time);
    lastTime = time;
    rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (running || reducedMotion) return;
    running = true;
    rafId = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
  }

  function onPointerMove(event) {
    const rect = container.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
    mouse.active = true;
  }

  function onResize() {
    resize();
    seedParticles();
    render(lastTime || performance.now());
  }

  resize();
  seedParticles();

  if (reducedMotion) {
    render(performance.now());
  } else {
    start();
  }

  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("resize", onResize);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });
}

window.addEventListener("load", initAmbientParticles);
