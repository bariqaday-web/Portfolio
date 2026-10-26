import { expect, test } from "@playwright/test";

test("public legal pages and account deletion instructions are available", async ({ page }) => {
  for (const path of ["/privacy", "/terms", "/delete-account"]) {
    const response = await page.goto(path);
    expect(response?.status(), `${path} should load`).toBe(200);
  }

  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "سياسة الخصوصية" })).toBeVisible();
  await expect(page.getByRole("link", { name: "barqaday@gmail.com" })).toHaveAttribute(
    "href",
    "mailto:barqaday@gmail.com",
  );

  await page.goto("/delete-account");
  await expect(page.getByRole("heading", { name: "طلب حذف الحساب" })).toBeVisible();
  await expect(page.getByRole("link", { name: "تسجيل الدخول للمتابعة إلى إعدادات الحساب" })).toHaveAttribute(
    "href",
    "/login?next=%2Fprofile%2Fapp-settings",
  );
});

test("registration presents a standard email field and links to legal terms", async ({ page }) => {
  const response = await page.goto("/register");
  expect(response?.status()).toBe(200);
  await expect(page.getByLabel("البريد الإلكتروني")).toHaveAttribute("type", "email");
  await expect(page.getByRole("link", { name: "شروط الاستخدام" })).toHaveAttribute("href", "/terms");
  await expect(page.getByRole("link", { name: "سياسة الخصوصية" })).toHaveAttribute("href", "/privacy");
});

test("main guest routes respond successfully", async ({ page }) => {
  for (const path of ["/", "/home", "/search", "/cart", "/login"]) {
    const response = await page.goto(path);
    expect(response?.status(), `${path} should load`).toBe(200);
  }
});

test("report API requires an authenticated user", async ({ request }) => {
  const response = await request.post("/api/v1/reports", {
    data: { targetType: "post", targetId: "test-post", reason: "spam" },
  });
  expect(response.status()).toBe(401);
});
