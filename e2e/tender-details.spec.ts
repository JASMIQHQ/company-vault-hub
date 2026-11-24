import { expect, test, type Page } from "@playwright/test";

const tenderId = process.env.PLAYWRIGHT_TENDER_ID;
const originalTitleByTest = new Map<string, string>();

test.skip(!process.env.PLAYWRIGHT_BASE_URL || !tenderId, "Configure a staging preview URL and dedicated staging tender ID.");

async function openEditor(page: Page) {
  await page.goto(`/tenders/${tenderId}`);
  await expect(page.getByText("Tender workspace", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Edit details" }).click();
  await expect(page.getByRole("heading", { name: "Edit tender details" })).toBeVisible();
}

async function saveTitle(page: Page, title: string) {
  await page.getByLabel("Tender title").fill(title);
  await page.getByRole("button", { name: "Save changes" }).click();
}

test.describe("owner tender editor", () => {
  test.use({ storageState: "playwright/.auth/owner.json" });

  test("owner saves a tender title and sees it after reload", async ({ page }) => {
    await openEditor(page);
    const titleInput = page.getByLabel("Tender title");
    const original = await titleInput.inputValue();
    originalTitleByTest.set(test.info().testId, original);

    const updated = `${original} — E2E ${Date.now()}`;
    await saveTitle(page, updated);
    await expect(page.getByRole("heading", { name: updated })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: updated })).toBeVisible();
  });

  test("a stale second tab is rejected and can reload the latest version", async ({ page, context }) => {
    await openEditor(page);
    const original = await page.getByLabel("Tender title").inputValue();
    originalTitleByTest.set(test.info().testId, original);

    const secondPage = await context.newPage();
    await openEditor(secondPage);

    const firstUpdate = `${original} — first ${Date.now()}`;
    const staleUpdate = `${original} — stale ${Date.now()}`;
    await saveTitle(page, firstUpdate);
    await expect(page.getByRole("heading", { name: firstUpdate })).toBeVisible();

    await saveTitle(secondPage, staleUpdate);
    await expect(secondPage.getByText(/updated elsewhere/i)).toBeVisible();
    await expect(secondPage.getByRole("button", { name: "Reload latest version" })).toBeEnabled();
    await secondPage.getByRole("button", { name: "Reload latest version" }).click();
    await expect(secondPage.getByLabel("Tender title")).toHaveValue(firstUpdate);
    await secondPage.close();
  });

  test.afterEach(async ({ page }) => {
    const original = originalTitleByTest.get(test.info().testId);
    if (original && !page.isClosed()) {
      try {
        await openEditor(page);
        await saveTitle(page, original);
        await expect(page.getByRole("heading", { name: original, exact: true })).toBeVisible();
      } catch {
        // Preserve the original test failure; cleanup failure is surfaced in CI logs.
        console.error("Could not restore the staging E2E tender title.");
      }
    }
  });
});

test.describe("viewer tender editor permissions", () => {
  test.use({ storageState: "playwright/.auth/viewer.json" });

  test("viewer cannot save tender metadata", async ({ page }) => {
    await openEditor(page);
    const original = await page.getByLabel("Tender title").inputValue();
    await saveTitle(page, `${original} — forbidden ${Date.now()}`);
    await expect(page.getByRole("heading", { name: "Edit tender details" })).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("heading", { name: original, exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: original })).toBeVisible();
  });
});
