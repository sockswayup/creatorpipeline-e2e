# CreatorPipeline E2E Tests

End-to-end test suite for CreatorPipeline using Playwright with an isolated Docker Compose environment.

## Purpose

Provides full-stack integration testing without affecting the dogfood environment. Runs on separate ports:

| Service  | Dogfood | E2E Test |
|----------|---------|----------|
| UI       | 3000    | 13000    |
| API      | 8080    | 18080    |
| Postgres | 5432    | 15432    |

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Sibling repos cloned: `creatorpipeline-api`, `creatorpipeline-ui`

## Setup

```bash
npm install
npx playwright install chromium
```

## Running Tests

```bash
# Run all tests (starts Docker, runs tests, tears down)
npm test

# Run with browser visible
npm run test:headed

# Interactive UI mode
npm run test:ui

# Debug mode
npm run test:debug
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:13000` | Frontend URL for tests |
| `API_URL` | `http://localhost:18080/api/v1` | API URL for helpers |
| `CI` | - | Set in CI to enable retries and JUnit reporter |

## Project Structure

```
creatorpipeline-e2e/
├── docker-compose.test.yml   # Isolated test environment
├── playwright.config.ts      # Playwright configuration
├── tsconfig.json             # TypeScript configuration
├── src/
│   ├── fixtures/             # Test fixtures (setup/teardown)
│   │   ├── globalSetup.ts    # Docker Compose up, wait for health
│   │   ├── globalTeardown.ts # Docker Compose down, collect coverage
│   │   └── test.fixture.ts   # Page objects + cleanup
│   ├── helpers/
│   │   └── api.ts            # API client for test data (CRUD)
│   └── pages/                # Page Object classes
│       ├── BasePage.ts       # Common selectors and wait helpers
│       ├── SidebarNav.ts     # Navigation interactions
│       ├── PipelineListPage.ts
│       ├── DialogPage.ts     # Modal dialogs
│       ├── BoardPage.ts      # Kanban board
│       └── CalendarPage.ts   # Calendar view
└── tests/
    └── smoke.spec.ts         # Initial smoke tests
```

## API Helpers

The `src/helpers/api.ts` module provides functions for test data management:

```typescript
import { createPipeline, createSeries, createEpisode, cleanupAll } from './src/helpers/api';

// Create test data
const pipeline = await createPipeline('Test Pipeline');
const series = await createSeries(pipeline.id, 'Test Series', 'MONDAY');
const episode = await createEpisode(series.id, 'Test Episode');

// Cleanup after tests
await cleanupAll();
```

## Coverage

- **Frontend:** V8 coverage via Playwright
- **Backend:** JaCoCo agent on API container (port 6300)

## Related

- [Epic #11: E2E Test Suite](https://github.com/sockswayup/CreatorPipeline/issues/11)
- [Story #12: Scaffold Playwright](https://github.com/sockswayup/CreatorPipeline/issues/12)
