import { expect, test } from "@playwright/test";
import { eras } from "../src/history";

// The same suite runs at / in development and /orbis/ in the assembled site.
test("keeps assets and home navigation inside the app mount", async ({
  page,
  baseURL,
}) => {
  const home = new URL("./", baseURL!);
  const failures: string[] = [];
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.origin === home.origin && response.status() >= 400) {
      failures.push(`${response.status()} ${url.pathname}`);
    }
  });
  await page.goto("./?era=galileo");
  await expect(page.getByTestId("cosmos")).toHaveAttribute(
    "data-ready",
    "true",
  );
  const favicon = new URL(
    (await page.locator('link[rel="icon"]').getAttribute("href")) ?? "",
    page.url(),
  );
  expect(favicon.pathname).toBe(`${home.pathname}favicon.svg`);
  const response = await page.request.get(favicon.href);
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/svg+xml");
  await page.getByRole("link", { name: "Orbis home", exact: true }).click();
  await expect(page).toHaveURL(home.href);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Everything revolves around us.",
  );
  await expect(page.getByTestId("cosmos")).toHaveAttribute(
    "data-ready",
    "true",
  );
  expect(failures).toEqual([]);
});

test("renders an interactive WebGL scene with no runtime errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Everything revolves around us.",
  );
  await expect(page.getByTestId("cosmos")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await expect(page.locator("canvas")).toBeVisible();
  await page
    .getByRole("button", { name: "Pause simulation", exact: true })
    .click();
  const initial = await page.getByTestId("elapsed").textContent();
  await page.waitForTimeout(300);
  expect(await page.getByTestId("elapsed").textContent()).toBe(initial);
  await page
    .getByLabel("Simulation speed", { exact: true })
    .selectOption("120");
  await page
    .getByRole("button", { name: "Play simulation", exact: true })
    .click();
  await expect(page.getByTestId("elapsed")).not.toHaveText(initial!);
  await page
    .getByRole("button", { name: "Pause simulation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Restart simulation", exact: true })
    .click();
  await expect(page.getByTestId("elapsed")).toHaveText("0 days");
  expect(errors).toEqual([]);
});

test("visits every worldview and gates the Galilean moons by discovery", async ({
  page,
}) => {
  await page.goto("./");
  for (const era of eras) {
    await page
      .getByRole("button", { name: `${era.name}, ${era.date}`, exact: true })
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(era.title);
    await expect(page).toHaveURL(new RegExp(`era=${era.id}`));
    const io = page.locator('#body-picker option[value="io"]');
    await expect(io).toHaveCount(era.year >= 1610 ? 1 : 0);
    if (era.id === "hipparchus")
      await expect(page.locator("#body-picker option")).toHaveCount(2);
  }
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "A pattern across the heavens.",
  );
});

test("changes camera, layers, focused body, and timeline controls", async ({
  page,
}) => {
  await page.goto("./?era=galileo");
  await page
    .getByLabel("Selected celestial body", { exact: true })
    .selectOption("jupiter");
  await page
    .getByRole("button", { name: "Focus on Jupiter", exact: true })
    .click();
  await page.getByRole("button", { name: "From Earth", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "From Earth", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Cosmic view", exact: true }).click();
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  await page.getByLabel("Celestial labels", { exact: true }).uncheck();
  await expect(page.locator('[data-body="jupiter"]')).toBeHidden();
  await page.getByLabel("Celestial labels", { exact: true }).check();
  await page.getByLabel("Motion trail", { exact: true }).check();
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  await page.getByRole("button", { name: "From Earth", exact: true }).click();
  await page
    .getByRole("button", { name: "Top-down view", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Top-down view", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(async () =>
      Number(
        (
          await page.getByTestId("cosmos").getAttribute("data-camera-direction")
        )?.split(",")[1],
      ),
    )
    .toBeLessThan(-0.999);
  await page.getByRole("button", { name: "From Earth", exact: true }).click();
  await page.getByRole("button", { name: "Cosmic view", exact: true }).click();
  await expect
    .poll(async () =>
      Number(
        (
          await page.getByTestId("cosmos").getAttribute("data-camera-direction")
        )?.split(",")[1],
      ),
    )
    .toBeLessThan(-0.999);
  await page.getByRole("button", { name: "Reset camera", exact: true }).click();
  await page
    .getByRole("button", { name: "Next worldview", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Next worldview", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Previous worldview", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Other worlds have moons.",
  );
});

test("opens historical sources, runs a mechanism exploration and dismisses the guide", async ({
  page,
}, testInfo) => {
  await page.goto("./");
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "About this worldview" }).click();
  await page
    .getByRole("button", { name: "Historical notes & sources" })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Ptolemaic epicycle machine/ }),
  ).toHaveAttribute(
    "href",
    "https://sciencedemonstrations.fas.harvard.edu/presentations/ptolemaic-epicycle-machine",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("button", { name: "Explore an epicycle", exact: true })
    .click();
  await expect(page.getByText("LOOK A LITTLE CLOSER")).toBeVisible();
  if (testInfo.project.name === "mobile") {
    const scene = await page.locator("canvas").boundingBox();
    const explanation = await page.locator(".discovery-card").boundingBox();
    expect(explanation!.y).toBeGreaterThanOrEqual(scene!.y + scene!.height - 1);
  }
  await expect(
    page.getByRole("img", { name: /Apparent longitude from Earth/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Field guide", exact: true }).click();
  await expect(page.getByText("One thread, not the whole story")).toBeVisible();
  await page.getByRole("button", { name: "Begin with Anaximander" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Fire beyond the familiar.",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  if (testInfo.project.name === "mobile") {
    await page
      .getByLabel("JUMP TO A WORLDVIEW", { exact: true })
      .selectOption("galileo");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Other worlds have moons.",
    );
    await expect(page.locator('#body-picker option[value="io"]')).toHaveCount(
      1,
    );
  }
});

test("keeps explorations accessible before and after fullscreen", async ({
  page,
}, testInfo) => {
  await page.goto("./");
  const openExploration = () =>
    page
      .getByRole("button", { name: "Explore an epicycle", exact: true })
      .click();
  const verifyLayout = async () => {
    await expect
      .poll(() => page.evaluate(() => Boolean(document.fullscreenElement)))
      .toBe(true);
    const card = page.locator(".discovery-card");
    if (testInfo.project.name === "mobile") {
      await expect(page.locator(".cosmos-panel")).toHaveCSS(
        "overflow-y",
        "auto",
      );
      const scene = await page.locator("canvas").boundingBox();
      const explanation = await card.boundingBox();
      expect(explanation!.y).toBeGreaterThanOrEqual(
        scene!.y + scene!.height - 1,
      );
    }
    await card
      .getByText("Apparent longitude from Earth · down = retrograde")
      .scrollIntoViewIfNeeded();
    await expect(
      card.getByText("Apparent longitude from Earth · down = retrograde"),
    ).toBeInViewport();
  };
  await openExploration();
  await page.getByRole("button", { name: "Fullscreen", exact: true }).click();
  await verifyLayout();
  await page
    .getByRole("button", { name: "Close exploration", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Exit fullscreen", exact: true })
    .click();
  await page.getByRole("button", { name: "Fullscreen", exact: true }).click();
  await openExploration();
  await verifyLayout();
  await page
    .getByRole("button", { name: "Exit fullscreen", exact: true })
    .click();
});

test("can seek exactly to the endpoint without wrapping the slider", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  const slider = page.getByLabel("Simulation time in days", { exact: true });
  await slider.fill("1095");
  await expect(slider).toHaveValue("1095");
  await expect(page.getByTestId("elapsed")).toHaveText("1,095 days");
});

test("keeps the narrative usable when WebGL is unavailable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (type === "webgl2" || type === "webgl") return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });
  await page.goto("./");
  await expect(page.getByText("The heavens need WebGL.")).toBeVisible();
  await page.getByRole("button", { name: "Field guide", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("respects reduced motion and handles an invalid era link", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./?era=invalid");
  await expect(
    page.getByRole("button", { name: "Play simulation", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Everything revolves around us.",
  );
});
