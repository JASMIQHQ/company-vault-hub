import { expect, test, type Page } from "@playwright/test";

const tenderId = process.env.PLAYWRIGHT_TENDER_ID;
type OriginalDetails = {
  title: string;
  submissionDeadline: string;
  openingDate: string;
};
const originalDetailsByTest = new Map<string, OriginalDetails>();

test.skip(
  !process.env.PLAYWRIGHT_BASE_URL || !tenderId,
  "Configure a staging preview URL and dedicated staging tender ID.",
);

async function openEditor(page: Page) {
  await page.goto(`/tenders/${tenderId}`);
  await expect(page.getByText("Tender workspace", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Edit details" }).click();
  await expect(page.getByRole("heading", { name: "Edit tender details" })).toBeVisible();
}

async function captureOriginalDetails(page: Page) {
  return {
    title: await page.getByLabel("Tender title").inputValue(),
    submissionDeadline: await page.getByLabel("Submission deadline").inputValue(),
    openingDate: await page.getByLabel("Opening date").inputValue(),
  };
}

async function saveTitle(page: Page, title: string) {
  await page.getByLabel("Tender title").fill(title);
  await page.getByRole("button", { name: "Save changes" }).click();
}

test.describe("owner tender editor", () => {
  test.use({ storageState: "playwright/.auth/owner.json" });

  test("owner saves a tender title and sees it after reload", async ({ page }) => {
    await openEditor(page);
    const original = await captureOriginalDetails(page);
    originalDetailsByTest.set(test.info().testId, original);

    const updated = `${original.title} — E2E ${Date.now()}`;
    await saveTitle(page, updated);
    await expect(page.getByRole("heading", { name: updated })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: updated })).toBeVisible();
  });

  test("a stale second tab is rejected and can reload the latest version", async ({
    page,
    context,
  }) => {
    await openEditor(page);
    const original = await captureOriginalDetails(page);
    originalDetailsByTest.set(test.info().testId, original);

    const secondPage = await context.newPage();
    await openEditor(secondPage);

    const firstUpdate = `${original.title} — first ${Date.now()}`;
    const staleUpdate = `${original.title} — stale ${Date.now()}`;
    await saveTitle(page, firstUpdate);
    await expect(page.getByRole("heading", { name: firstUpdate })).toBeVisible();

    await saveTitle(secondPage, staleUpdate);
    await expect(secondPage.getByText(/updated elsewhere/i)).toBeVisible();
    await expect(secondPage.getByRole("button", { name: "Reload latest version" })).toBeEnabled();
    await secondPage.getByRole("button", { name: "Reload latest version" }).click();
    await expect(secondPage.getByLabel("Tender title")).toHaveValue(firstUpdate);
    await secondPage.close();
  });

  test("opening date earlier than the submission deadline is rejected", async ({ page }) => {
    await openEditor(page);
    originalDetailsByTest.set(test.info().testId, await captureOriginalDetails(page));

    await page.getByLabel("Submission deadline").fill("2099-12-30T10:00");
    await page.getByLabel("Opening date").fill("2099-12-29T10:00");
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(
      page.getByText("Opening date cannot be earlier than the submission deadline."),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Edit tender details" })).toBeVisible();
  });

  test("owner can clear an existing submission deadline", async ({ page }) => {
    await openEditor(page);
    const original = await captureOriginalDetails(page);
    originalDetailsByTest.set(test.info().testId, original);

    test.skip(
      !original.submissionDeadline,
      "The dedicated staging tender must start with a submission deadline.",
    );

    await page.getByLabel("Submission deadline").fill("");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("heading", { name: "Edit tender details" })).toBeHidden();

    await page.getByRole("button", { name: "Edit details" }).click();
    await expect(page.getByLabel("Submission deadline")).toHaveValue("");
    await page.reload();
    await page.getByRole("button", { name: "Edit details" }).click();
    await expect(page.getByLabel("Submission deadline")).toHaveValue("");
  });

  test.afterEach(async ({ page }) => {
    const original = originalDetailsByTest.get(test.info().testId);
    if (!original || page.isClosed()) return;

    try {
      await openEditor(page);
      const current = await captureOriginalDetails(page);
      const changed =
        current.title !== original.title ||
        current.submissionDeadline !== original.submissionDeadline ||
        current.openingDate !== original.openingDate;

      if (changed) {
        await page.getByLabel("Tender title").fill(original.title);
        await page.getByLabel("Submission deadline").fill(original.submissionDeadline);
        await page.getByLabel("Opening date").fill(original.openingDate);
        await page.getByRole("button", { name: "Save changes" }).click();
        await expect(
          page.getByRole("heading", { name: original.title, exact: true }),
        ).toBeVisible();
      } else {
        await page.getByRole("button", { name: "Cancel" }).click();
      }
    } catch {
      // Preserve the original test failure; cleanup failure is surfaced in CI logs.
      console.error("Could not restore the staging E2E tender details.");
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
