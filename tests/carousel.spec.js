import { test, expect } from "@playwright/test";

test.describe("Carousel portfolio", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("loads hero title and carousel cards", async ({ page }) => {
    await expect(page.locator(".hero-title-accent")).toHaveText("Work");
    await expect(page.locator(".carousel-item")).toHaveCount(6);
    await expect(page.locator(".carousel-item.is-active")).toHaveCount(1);
  });

  test("scroll advances active card", async ({ page }, testInfo) => {
    const firstTitle = await page.locator(".carousel-item.is-active .card-title").textContent();

    if (testInfo.project.name !== "chromium-desktop") {
      await page.locator(".hero-pin").click();
    }

    const wheelDelta = testInfo.project.name === "chromium-desktop" ? 400 : 120;
    await page.mouse.wheel(0, wheelDelta);
    await page.waitForTimeout(900);
    const secondTitle = await page.locator(".carousel-item.is-active .card-title").textContent();
    expect(secondTitle).not.toBe(firstTitle);
  });

  test("desktop hover on active card shows services orbit", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "Hover only on desktop project");

    const activeCard = page.locator(".carousel-item.is-active .card");
    await activeCard.hover();
    await page.waitForTimeout(500);

    const satellites = page.locator(".service-satellite");
    await expect(satellites.first()).toBeVisible();
    await expect(satellites).toHaveCount(4);
    await expect(page.locator(".services-connectors line")).toHaveCount(4);
  });

  test("mobile tap on active card toggles services orbit", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-mobile", "Tap only on mobile project");

    const activeCard = page.locator(".carousel-item.is-active .card");
    await activeCard.tap();
    await page.waitForTimeout(500);

    await expect(page.locator(".service-satellite").first()).toBeVisible();

    await activeCard.tap();
    await page.waitForTimeout(400);
    await expect(page.locator(".services-orbit.is-visible")).toHaveCount(0);
  });

  test("arc tracks are visible", async ({ page }) => {
    await expect(page.locator("#arc-track-outer")).toBeVisible();
    await expect(page.locator("#arc-track-inner")).toBeVisible();
  });

  test("active card shows product showcase and CTA", async ({ page }, testInfo) => {
    const activeCard = page.locator(".carousel-item.is-active .card");
    await expect(activeCard.locator(".card-visual-frame")).toBeVisible();
    await expect(activeCard.locator(".card-visual-scene")).toBeVisible();
    await expect(activeCard.locator(".card-year")).toBeVisible();
    await expect(activeCard.locator(".card-progress")).toBeVisible();

    test.skip(testInfo.project.name === "chromium-mobile", "CTA hidden on small mobile");
    await expect(activeCard.locator(".card-cta")).toBeVisible();
    await expect(activeCard.locator(".card-cta")).toHaveText("View project →");
  });

  test("inactive cards blur visual frame", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "Blur removed on mobile for performance");

    const inactive = page.locator(".carousel-item:not(.is-active) .card-visual-frame").first();
    const filter = await inactive.evaluate((el) => getComputedStyle(el).filter);
    expect(filter).toContain("blur");
  });

  test("scroll triggers card activation animation", async ({ page }) => {
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(700);
    const activeTitle = page.locator(".carousel-item.is-active .card-title");
    await expect(activeTitle).toBeVisible();
    const fontFamily = await activeTitle.evaluate((el) => getComputedStyle(el).fontFamily);
    expect(fontFamily.toLowerCase()).toContain("instrument serif");
  });

  test("mobile shows one focus card with side glows", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name === "chromium-desktop",
      "Mobile focus layout applies to mobile/tablet only"
    );

    await expect(page.locator(".carousel-item.is-center-focus")).toHaveCount(1);
    await expect(page.locator(".carousel-item.is-glow-peek")).toHaveCount(2);
    await expect(page.locator(".carousel-stage--mobile-focus")).toBeVisible();

    const dominantCards = await page.locator(".carousel-item").evaluateAll((nodes) =>
      nodes.filter((el) => parseFloat(getComputedStyle(el).opacity) > 0.85).length
    );
    expect(dominantCards).toBe(1);

    const glowCards = await page.locator(".carousel-item.is-glow-peek").evaluateAll((nodes) =>
      nodes.every((el) => {
        const opacity = parseFloat(getComputedStyle(el).opacity);
        return opacity > 0.08 && opacity < 0.45;
      })
    );
    expect(glowCards).toBe(true);

    const cardWidth = await page.locator(".carousel-item.is-active .card").evaluate((el) => {
      return getComputedStyle(el).width;
    });
    const widthPx = parseFloat(cardWidth);
    expect(widthPx).toBeGreaterThan(180);

    await expect(page.locator(".carousel-scroll-hint")).toBeVisible();
  });

  test("mobile scroll swaps focus card", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-mobile", "Mobile scroll test");

    const firstTitle = await page.locator(".carousel-item.is-center-focus .card-title").textContent();
    await page.locator(".hero-pin").click();
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(600);
    const secondTitle = await page.locator(".carousel-item.is-center-focus .card-title").textContent();

    expect(secondTitle).not.toBe(firstTitle);
    await expect(page.locator(".carousel-item.is-center-focus")).toHaveCount(1);
    await expect(page.locator(".carousel-item.is-glow-peek")).toHaveCount(2);
  });

  test("mobile wraps from card 6 to 1 and keeps navigating", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-mobile", "Mobile wrap test");

    await page.locator(".hero-pin").click();

    for (let i = 0; i < 8; i++) {
      await page.mouse.wheel(0, 120);
      await page.waitForTimeout(550);
    }

    await expect(page.locator(".carousel-item.is-center-focus")).toHaveCount(1);

    const titleAfterWrap = await page.locator(".carousel-item.is-center-focus .card-title").textContent();
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(550);
    const titleAfterContinue = await page.locator(".carousel-item.is-center-focus .card-title").textContent();

    expect(titleAfterContinue).not.toBe(titleAfterWrap);
  });
});
