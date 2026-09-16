import { expect, test } from "@playwright/test";

// Included by playwright.site.config.ts only: requires the complete Zola + app output.
test("the article addendum links to Orbis without replacing the original app", async ({
  page,
  baseURL,
}) => {
  const articleURL = new URL("/posts/conceptions-of-the-heavens/", baseURL!)
    .href;
  await page.goto(articleURL);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Conceptions of the Heavens",
  );
  await expect(
    page.getByRole("heading", {
      name: "Addendum — 9 September 2026",
      exact: true,
    }),
  ).toBeVisible();
  const original = page.getByRole("link", {
    name: "original sixteen-model visualisation",
    exact: true,
  });
  await expect(original).toHaveAttribute(
    "href",
    "/space/#stage=ptolemy&follow=mars&view=orbit&frame=center&speed=3",
  );
  await expect(page.locator('article a[href^="/space/"] img')).toHaveCount(1);
  await original.click();
  await expect(page).toHaveURL(/\/space\/#stage=ptolemy/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Conceptions of the Heavens",
  );
  await expect(page.locator("#viewport canvas")).toBeVisible();
  await expect(page.locator("#loading")).toBeHidden();
  await expect(page.locator("#timeline .stage")).toHaveCount(16);
  await expect(page.locator("#info h2")).toContainText("Ptolemy");

  await page.goto(articleURL);
  const orbis = page.getByRole("link", {
    name: "Orbis — The Changing Heavens",
    exact: true,
  });
  await expect(orbis).toHaveAttribute("href", "/orbis/?era=ptolemy");
  await orbis.click();
  await expect(page).toHaveURL(new URL("/orbis/?era=ptolemy", baseURL!).href);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Everything revolves around us.",
  );
  await expect(page.getByTestId("cosmos")).toHaveAttribute(
    "data-ready",
    "true",
  );

  await page.goto(new URL("/", baseURL!).href);
  await expect(page).toHaveTitle(/Andrei Alexandru/);
});
