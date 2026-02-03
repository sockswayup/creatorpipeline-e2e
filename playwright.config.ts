import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',

  /* Run tests serially - shared database means parallel tests conflict (see OBS-10) */
  fullyParallel: false,
  workers: 1,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Reporter configuration */
  reporter: process.env.CI
    ? [['junit', { outputFile: 'test-results/junit.xml' }], ['list']]
    : [['html', { open: 'never' }], ['list']],

  /* Shared settings for all projects */
  use: {
    /* Base URL from environment or default to isolated test ports */
    baseURL: process.env.BASE_URL || 'http://localhost:13000',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure */
    video: 'on-first-retry',
  },

  /* Global timeout */
  timeout: 30000,

  /* Expect timeout */
  expect: {
    timeout: 5000,
  },

  /* Configure projects for Chromium only */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Global setup and teardown */
  globalSetup: require.resolve('./src/fixtures/globalSetup'),
  globalTeardown: require.resolve('./src/fixtures/globalTeardown'),
});
