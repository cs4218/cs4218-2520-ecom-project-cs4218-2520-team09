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
});
