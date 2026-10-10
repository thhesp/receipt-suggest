import { expect, test } from '@playwright/test';

const hasProductionConfiguration = Boolean(
  process.env['PLAYWRIGHT_TEST_BASE_URL'] &&
  process.env['RECEIPT_SUGGEST_E2E_USERNAME'] &&
  process.env['RECEIPT_SUGGEST_E2E_PASSWORD']
);

test.skip(!hasProductionConfiguration, 'Production smoke credentials are not configured.');

test('existing recipe editor reaches a terminal state', async ({ page }) => {
  await page.goto('/recipe/custom-germknoedel/edit');

  await expect(page.getByText('Checking whether recipe changes are available…')).toBeHidden({
    timeout: 20_000
  });
  await expect(page.locator('form, .alert-danger').first()).toBeVisible({ timeout: 20_000 });
});
