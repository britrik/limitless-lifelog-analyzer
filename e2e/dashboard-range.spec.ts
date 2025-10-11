import { test, expect } from '@playwright/test'; // dashboard e2e

test.skip(process.env.PW_SKIP_E2E === '1', 'Skipping E2E when browsers not installed');

const mockLifelogs = {
  data: {
    lifelogs: [
      {
        id: '1',
        title: 'Test Lifelog',
        markdown: 'hello world',
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-01T01:00:00Z',
        isStarred: false,
        updatedAt: '2024-01-01T01:00:00Z'
      }
    ]
  },
  meta: { lifelogs: { count: 1 } }
};

test.describe('Dashboard E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Limitless lifelogs endpoint
    await page.route('**/api/limitless/v1/lifelogs**', route => {
      route.fulfill({ status: 200, body: JSON.stringify(mockLifelogs) });
    });
    await page.goto('/');
  });

  test('renders heatmap and recent activity', async ({ page }) => {
    await expect(page.getByText('Activity Heatmap').first()).toBeVisible();
    await expect(page.getByText('Recent Activities').first()).toBeVisible();
  });
});
