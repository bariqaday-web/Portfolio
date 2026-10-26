import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "تسجيل الدخول" }).click();
  await expect(page).toHaveURL(/\/home(?:$|[?#])/);
}

const customer = {
  email: process.env.E2E_CUSTOMER_EMAIL,
  password: process.env.E2E_CUSTOMER_PASSWORD,
};
const merchant = {
  email: process.env.E2E_MERCHANT_EMAIL,
  password: process.env.E2E_MERCHANT_PASSWORD,
};
const admin = {
  email: process.env.E2E_ADMIN_EMAIL,
  password: process.env.E2E_ADMIN_PASSWORD,
};

test("test customer can sign in and open the cart", async ({ page }) => {
  if (!customer.email || !customer.password) {
    test.skip(true, "Configure the local customer test account.");
    return;
  }

  await signIn(page, customer.email, customer.password);
  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: "سلة التسوّق" })).toBeVisible();
});

test("test merchant can sign in and open free advertising", async ({ page }) => {
  if (!merchant.email || !merchant.password) {
    test.skip(true, "Configure the local merchant test account.");
    return;
  }

  await signIn(page, merchant.email, merchant.password);
  await page.goto("/dashboard/ads");
  await expect(page.getByRole("heading", { name: "الإعلانات" })).toBeVisible();
  await expect(page.getByText("إعلانات ساليكس مجانية بالكامل عند الإطلاق")).toBeVisible();
});

test("test admin can sign in and open the admin overview", async ({ page }) => {
  if (!admin.email || !admin.password) {
    test.skip(true, "Configure the local admin test account.");
    return;
  }

  await signIn(page, admin.email, admin.password);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "نظرة عامة" })).toBeVisible();
  await expect(page.getByText("يحتاج انتباهك")).toBeVisible();
});
