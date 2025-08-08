import { test, expect, Page } from '@playwright/test';

// Helper function to get the text content of the first X-axis tick in a chart
// Note: This is a simplified selector and might need adjustment based on actual chart rendering
// if there are multiple charts or complex structures.
// We'll target a specific chart by its title to make it more robust.
const getChartXAxisTickText = async (page: Page, chartTitle: string): Promise<string | null> => {
  // Find the chart container by looking for the div that contains an h3 with the chartTitle
  const chartContainer = page.locator('div:has(h3:has-text("' + chartTitle + '"))').first();
  // Then find the first x-axis tick text within that chart's SVG
  const firstTick = chartContainer.locator('svg.recharts-surface .recharts-xAxis .recharts-cartesian-axis-tick-value').first();

  // Wait for the tick to be visible before getting text content
  try {
    await firstTick.waitFor({ state: 'visible', timeout: 5000 }); // Wait up to 5s
    return await firstTick.textContent();
  } catch (error) {
    console.warn(`Could not find visible X-axis tick for chart "${chartTitle}":`, error);
    return null; // Return null if not found or not visible in time
  }
};


test.describe('Dashboard Time Range Selector E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard page before each test
    await page.goto('/'); // Assuming '/' redirects or loads the dashboard, or use '/dashboard'
    // Wait for initial charts to be likely loaded - e.g., wait for at least one chart SVG to be present.
    // A more specific chart title can be used if needed for the first load.
    await expect(page.locator('svg.recharts-surface').first()).toBeVisible({ timeout: 30000 }); // Wait up to 30s for initial load
  });

  test('should load initial charts and allow changing time ranges', async ({ page }) => {
    // 1. Assert initial charts render (presence of multiple SVG elements from Recharts)
    // We expect at least 4 charts as identified in Dashboard.tsx
    const initialChartSvgs = await page.locator('svg.recharts-surface').count();
    expect(initialChartSvgs).toBeGreaterThanOrEqual(4);

    // For a more specific check, let's target one chart by title.
    const activityChartTitle = 'Daily Recording Count'; // Example title
    let initialXAxisTick = await getChartXAxisTickText(page, activityChartTitle);
    expect(initialXAxisTick).not.toBeNull(); // Ensure we got some text

    // 2. Click the "24h" range selector and assert change
    await page.selectOption('select', { value: '24h' });
    // Wait for a network idle or a specific element that indicates data has reloaded.
    // For charts, expect the axis tick to change or a specific part of the chart to update.
    await expect(async () => {
      const xAxisTickAfter24h = await getChartXAxisTickText(page, activityChartTitle);
      expect(xAxisTickAfter24h).not.toBeNull();
      expect(xAxisTickAfter24h).not.toEqual(initialXAxisTick);
    }).toPass({ timeout: 15000 }); // Wait for assertion to pass, indicating re-render
    let xAxisTickAfter24h = await getChartXAxisTickText(page, activityChartTitle);


    // 3. Click the "7d" range selector and assert change
    await page.selectOption('select', { value: '7d' });
    await expect(async () => {
      const xAxisTickAfter7d = await getChartXAxisTickText(page, activityChartTitle);
      expect(xAxisTickAfter7d).not.toBeNull();
      expect(xAxisTickAfter7d).not.toEqual(xAxisTickAfter24h);
    }).toPass({ timeout: 15000 });
    let xAxisTickAfter7d = await getChartXAxisTickText(page, activityChartTitle);
    initialXAxisTick = xAxisTickAfter7d; // Update baseline for next comparison if needed, or keep comparing to original

    // 4. Click the "30d" range selector and assert change
    await page.selectOption('select', { value: '30d' });
    await expect(async () => {
      const xAxisTickAfter30d = await getChartXAxisTickText(page, activityChartTitle);
      expect(xAxisTickAfter30d).not.toBeNull();
      expect(xAxisTickAfter30d).not.toEqual(xAxisTickAfter7d);
    }).toPass({ timeout: 15000 });
  });
});
