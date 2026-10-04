const { defineConfig } = require("@playwright/test");
module.exports = defineConfig({
  testDir: "./e2e",
  workers: 1,
  retries: 0,
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "iphone-15", use: { baseURL: "http://127.0.0.1:3101", viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true } },
  ],
  use: {
    baseURL: "http://127.0.0.1:3100",
    headless: true,
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
  },
  // Isolate each project's server-side login limit, not just its browser cookies.
  webServer: [3100, 3101].map((port) => ({
    command: "node scripts/dev-server.js",
    url: `http://127.0.0.1:${port}/login`,
    reuseExistingServer: false,
    env: {
      PORT: String(port),
      NODE_ENV: "test",
      VERCEL: "",
      APP_PASSWORD: "browser-test-only-password",
      SUPABASE_URL: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      SUPABASE_SERVICE_KEY: "",
      GOOGLE_REFRESH_TOKEN: "",
      ADFLOW_MCP_TOKEN: "",
      TELEGRAM_BOT_TOKEN: "",
    },
  })),
});
