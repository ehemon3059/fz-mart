import { chromium } from "@playwright/test";

const BASE = "http://localhost:4010";
const OUT = process.env.SHOT_OUT || "shot";
const PATHS = (process.env.SHOT_PATHS || "/admin/dashboard").split(",");

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();

  // Log in
  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500); // let React hydrate so the action handler is live
  await page.fill('input[name="username"]', "admin");
  await page.fill('input[name="password"]', "admin123");
  await page.click('button[type="submit"]');
  // Server-action login then client router.push to the dashboard.
  await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(2500);
  if (page.url().includes("/login")) {
    const err = await page.locator('[role="alert"]').first().textContent().catch(() => null);
    console.error("still on login — auth failed:", err || "(no error shown)");
  } else {
    console.log("logged in →", page.url());
  }

  for (let i = 0; i < PATHS.length; i++) {
    const p = PATHS[i];
    await page.goto(`${BASE}${p}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    const file = `${OUT}-${i}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log("saved", file, "for", p);
  }
} catch (e) {
  console.error("ERR", e.message);
  process.exit(1);
} finally {
  await browser.close();
}
