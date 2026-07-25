import { test, expect } from "@playwright/test";

test.describe("Carousel portfolio", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForFunction(() => !document.querySelector(".hero-pin.is-hero-intro-pending"));
  });

  test("loads hero title and carousel cards", async ({ page }) => {
    await expect(page.locator(".hero-title-accent")).toHaveText("Level Up Your Content");
    await expect(page.locator(".hero-services-cta")).toHaveText("Click here to get our services");
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

  test("active file card shows folder flap and title", async ({ page }) => {
    const activeCard = page.locator(".carousel-item.is-active .file-card");
    await expect(activeCard).toBeVisible();
    await expect(activeCard.locator(".file-flap")).toBeVisible();
    await expect(activeCard.locator(".file-pocket")).toBeVisible();
    await expect(activeCard.locator(".file-sheet")).toHaveCount(3);
    await expect(activeCard.locator(".card-title")).toHaveText("Video Editing");
  });

  test("desktop hover opens folder flap on active card", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "Hover only on desktop project");

    const activeCard = page.locator(".carousel-item.is-active .file-card");
    const flap = activeCard.locator(".file-flap");

    await activeCard.hover();
    await page.waitForTimeout(450);

    await expect(activeCard).toHaveClass(/is-folder-open/);
    const flapTransform = await flap.evaluate((el) => getComputedStyle(el).transform);
    expect(flapTransform).not.toBe("none");
  });

  test("desktop hover opens after scroll without mouse leave", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "Hover only on desktop project");

    const stage = page.locator(".carousel-stage");
    await stage.hover();

    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(500);

    const activeCard = page.locator(".carousel-item.is-active .file-card");
    const box = await activeCard.boundingBox();
    expect(box).toBeTruthy();

    /* Move onto the new active card (simulates pointer already over center) */
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(450);

    await expect(activeCard).toHaveClass(/is-folder-open/);

    /* Scroll again while staying on the card — should open without leave/re-enter */
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(500);

    const nextActive = page.locator(".carousel-item.is-active .file-card");
    const nextBox = await nextActive.boundingBox();
    expect(nextBox).toBeTruthy();
    await page.mouse.move(nextBox.x + nextBox.width / 2, nextBox.y + nextBox.height / 2);
    await page.waitForTimeout(450);

    await expect(nextActive).toHaveClass(/is-folder-open/);
  });

  test("arc tracks are visible", async ({ page }) => {
    await expect(page.locator("#arc-track-outer")).toBeVisible();
    await expect(page.locator("#arc-track-inner")).toBeVisible();
  });

  test("active card shows service title only", async ({ page }) => {
    const activeCard = page.locator(".carousel-item.is-active .file-card");
    await expect(activeCard.locator(".card-title")).toHaveText("Video Editing");
    await expect(activeCard.locator(".card-tagline")).toHaveText("Cuts that hold attention");
    await expect(activeCard.locator(".card-text")).toHaveCount(0);
    await expect(activeCard.locator(".card-cta")).toHaveCount(0);
  });

  test("inactive file cards are visually muted", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "Desktop inactive styling");

    const inactive = page.locator(".carousel-item:not(.is-active) .file-card").first();
    const active = page.locator(".carousel-item.is-active .file-card");

    const inactiveFilter = await inactive.evaluate((el) => getComputedStyle(el).filter);
    const activeFilter = await active.evaluate((el) => getComputedStyle(el).filter);

    expect(inactiveFilter).toContain("saturate");
    expect(activeFilter === "none" || !activeFilter.includes("saturate(0")).toBe(true);
  });

  test("scroll triggers card activation animation", async ({ page }) => {
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(700);
    const activeTitle = page.locator(".carousel-item.is-active .card-title");
    await expect(activeTitle).toBeVisible();
    const fontFamily = await activeTitle.evaluate((el) => getComputedStyle(el).fontFamily);
    expect(fontFamily.toLowerCase()).toContain("google sans flex");
  });

  test("mobile shows one focus card only", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name === "chromium-desktop",
      "Mobile focus layout applies to mobile/tablet only"
    );

    await page.waitForFunction(
      () => {
        const center = document.querySelector(".carousel-item.is-center-focus");
        const stage = document.querySelector(".carousel-stage--mobile-focus");
        if (!center || !stage) return false;
        if (parseFloat(getComputedStyle(center).opacity) <= 0.85) return false;
        return document.querySelectorAll(".carousel-item.is-glow-peek").length === 0;
      },
      null,
      { timeout: 12000 }
    );

    await expect(page.locator(".carousel-item.is-center-focus")).toHaveCount(1);
    await expect(page.locator(".carousel-item.is-glow-peek")).toHaveCount(0);
    await expect(page.locator(".carousel-stage--mobile-focus")).toBeVisible();

    const visibleCards = await page.locator(".carousel-item").evaluateAll((nodes) =>
      nodes.filter((el) => {
        const style = getComputedStyle(el);
        return style.visibility !== "hidden" && parseFloat(style.opacity) > 0.05;
      }).length
    );
    expect(visibleCards).toBe(1);

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
    await expect(page.locator(".carousel-item.is-glow-peek")).toHaveCount(0);
  });

  test("mobile horizontal swipe swaps focus card", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-mobile", "Mobile swipe test");

    const firstTitle = await page.locator(".carousel-item.is-center-focus .card-title").textContent();
    const hero = page.locator(".hero-pin");
    await hero.click();

    const box = await hero.boundingBox();
    expect(box).toBeTruthy();

    const startX = box.x + box.width * 0.72;
    const endX = box.x + box.width * 0.28;
    const y = box.y + box.height * 0.62;

    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: Math.round(startX), y: Math.round(y) }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [{ x: Math.round(endX), y: Math.round(y) }],
    });

    await page.waitForTimeout(600);
    const secondTitle = await page.locator(".carousel-item.is-center-focus .card-title").textContent();

    expect(secondTitle).not.toBe(firstTitle);
    await expect(page.locator(".carousel-item.is-center-focus")).toHaveCount(1);
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

  test("hero services CTA links to email", async ({ page }) => {
    await expect(page.locator(".hero-services-cta")).toHaveAttribute("href", "mailto:hello@levelupcontent.com");
  });

  test("active card shows tagline and stacked papers", async ({ page }) => {
    const activeCard = page.locator(".carousel-item.is-active .file-card");
    await expect(activeCard.locator(".file-sheet--front")).toBeVisible();
    await expect(activeCard.locator(".card-tagline")).toBeVisible();
    await expect(activeCard.locator(".card-tagline")).toHaveText("Cuts that hold attention");
  });

  test("progress dots reflect active card", async ({ page }, testInfo) => {
    if (testInfo.project.name !== "chromium-desktop") {
      await page.locator(".hero-pin").click();
    }
    await page.mouse.wheel(0, testInfo.project.name === "chromium-desktop" ? 400 : 120);
    await page.waitForTimeout(700);
    await expect(page.locator(".carousel-progress__dot.is-active")).toHaveCount(1);
    const activeDot = page.locator(".carousel-progress__dot.is-active");
    const activeTitle = await page.locator(".carousel-item.is-active .card-title").textContent();
    const dotLabel = await activeDot.getAttribute("aria-label");
    expect(dotLabel).toBe(activeTitle?.trim());
  });

  test("active card shows deliverable meta on flap", async ({ page }) => {
    const activeCard = page.locator(".carousel-item.is-active .file-card");
    await expect(activeCard.locator(".card-meta")).toContainText("5 deliverables");
    await expect(activeCard.locator(".file-menu")).toBeVisible();
  });

  test("clicking a card opens in-stage service detail", async ({ page }) => {
    const activeCard = page.locator(".carousel-item.is-active .file-card");
    await activeCard.click();
    const detail = page.locator("#service-detail");
    await expect(detail).toBeVisible();
    await expect(page.locator(".carousel-stage")).toHaveClass(/is-service-view/);
    await expect(detail.locator(".service-detail__title")).toHaveText("Video Editing");
    await expect(detail.locator(".service-thread")).toHaveCount(5);
    await expect(detail.locator(".service-thread__label").first()).toContainText("Long-form");
    await expect(detail.locator(".service-thread__path")).toHaveCount(5);
    await expect(detail.locator(".service-detail__float-icon")).toHaveCount(4);
    /* Soft dissolve: card fades while detail appears in place */
    await expect(activeCard).toHaveCSS("opacity", "0", { timeout: 3000 });
    await expect(detail.locator(".service-detail__header-box")).toBeVisible();
    await expect(detail.locator(".service-detail__float-icon").first()).toBeVisible({ timeout: 3000 });
  });

  test("service detail closes with back button", async ({ page }) => {
    await page.locator(".carousel-item.is-active .file-card").click();
    await expect(page.locator("#service-detail")).toBeVisible();
    await expect(page.locator(".service-detail__back")).toBeVisible();
    await page.waitForTimeout(1200);
    await page.locator(".service-detail__back").click({ force: true });
    await expect(page.locator("#service-detail")).toBeHidden({ timeout: 8000 });
    await expect(page.locator(".carousel-item.is-active")).toBeVisible();
  });
});
