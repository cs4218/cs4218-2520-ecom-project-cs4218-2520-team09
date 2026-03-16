import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/ui",
  testMatch: "**/*.spec.js",
  timeout: 30000,
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    screenshot: 'only-on-failure', 
  },
  reporter: 'html', 
  webServer: {
    command: process.env.CI ? 'npm run dev:ci' : 'npm run dev', 
    url: 'http://localhost:3000', 
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, 
    gracefulShutdown: {
      signal: 'SIGKILL',
      timeout: 5000,
    },
  },
});
