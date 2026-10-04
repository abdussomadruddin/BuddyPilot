const { test, expect } = require("@playwright/test");
test("login, client invoice preview, PDF and revoked logout session", async ({
  page,
  context,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await page
    .locator('input[name="password"]')
    .fill("browser-test-only-password");
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveTitle("BuddyPilot");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.locator('[data-tab-target="clientpilot"]').click();
  await page.locator('[data-subtab-target="client-invoice-panel"]').click();
  await page.locator("#invoicePeriod").fill("2026-10");
  await page.locator("#generateInvoicesButton").click();
  const client = page.locator(
    '#invoiceList .invoice-row[data-client-code="TEEGA"]',
  );
  await expect(client).toBeVisible();
  await client.locator('input[type="checkbox"]').check();
  const pdfResponse = context.waitForEvent("response", (response) =>
    response.url().includes("/api/invoices/pdf?"),
  );
  await client.getByRole("button", { name: "Review PDF" }).click();
  const response = await pdfResponse;
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/pdf");
  // Chromium's built-in PDF viewer can replace the navigation body with viewer HTML.
  const cookies = await context.cookies();
  const cookie = cookies.find((item) => item.name === "postpilot_auth");
  // APIRequestContext follows HTTPS cookie rules on HTTP loopback, unlike Chromium.
  const headers = { cookie: `${cookie.name}=${cookie.value}` };
  const pdf = await context.request.get(response.url(), { headers });
  expect(pdf.status()).toBe(200);
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");
  expect(cookie.httpOnly).toBe(true);
  expect(cookie.secure).toBe(true);
  await page.locator(".topbar-menu summary").click();
  await page.getByRole("button", { name: "Logout", exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  const replay = await context.request.get("/api/clients", {
    headers: { cookie: `${cookie.name}=${cookie.value}` },
  });
  expect(replay.status()).toBe(401);
  expect(errors).toEqual([]);
});

test("wrong password is rejected and invoice failure keeps UI usable", async ({
  page,
}) => {
  await page.goto("/login");
  await page.locator('input[name="password"]').fill("wrong-password");
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/error=1/);
  await page
    .locator('input[name="password"]')
    .fill("browser-test-only-password");
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveTitle("BuddyPilot");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.locator('[data-tab-target="clientpilot"]').click();
  await page.locator('[data-subtab-target="client-invoice-panel"]').click();
  await page.route("**/api/invoices/preview", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        ok: false,
        error: "Supabase mengambil masa terlalu lama. Cuba semula.",
      }),
    }),
  );
  await page.locator("#generateInvoicesButton").click();
  await expect(page.locator("#invoiceResult")).toContainText("Cuba semula");
  await expect(page.locator("#generateInvoicesButton")).toBeEnabled();
  await expect(page.locator("#uploadInvoicesButton")).toBeDisabled();
});
