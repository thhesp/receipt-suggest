import { expect, Page, test } from '@playwright/test';

const recipe = {
  id: 'e2e-spaetzle',
  name: 'E2E Spaetzle',
  tags: ['PASTA', 'VEGETARIAN'],
  includeInSuggestions: true,
  kcalPerPortion: '450 kcal',
  workTime: '15 min',
  cookingTime: '10 min',
  ingredients: [{ amount: '250 g', name: 'Spaetzle' }],
  images: ['spaetzle.jpg'],
  thumbnail: 'spaetzle.jpg'
};

async function mockEditorRequests(page: Page, readinessStatus = 200): Promise<void> {
  await page.route('**/api/user-state', route => route.fulfill({
    contentType: 'application/json',
    json: { version: 1, favorites: {}, plannedRecipes: {}, shoppingList: {} }
  }));
  await page.route('**/api/recipe-changes/status', route => {
    return route.fulfill({
    status: readinessStatus,
    contentType: 'application/json',
    json: readinessStatus === 200 ? { ready: true } : { error: 'Recipe changes are unavailable.' }
    });
  });
  await page.route(`**/assets/data/recipe/${recipe.id}/recipe.json`, route => {
    return route.fulfill({
    contentType: 'application/json',
    json: recipe
    });
  });
  await page.route(`**/assets/data/recipe/${recipe.id}/recipe.html`, route => {
    return route.fulfill({
    contentType: 'text/html',
    body: '<p>Boil the spaetzle.</p>'
    });
  });
}

test('loads an existing recipe into structured editor fields', async ({ page }) => {
  await mockEditorRequests(page);

  await page.goto(`/recipe/${recipe.id}/edit`);

  await expect(page.locator('#recipe-name')).toHaveValue(recipe.name);
  await expect(page.locator('#recipe-id')).toHaveValue(recipe.id);
  await expect(page.locator('#recipe-tags')).toHaveValue('PASTA, VEGETARIAN');
  await expect(page.locator('#ingredient-amount-0')).toHaveValue('250 g');
  await expect(page.locator('#ingredient-name-0')).toHaveValue('Spaetzle');
  await expect(page.getByText('Checking whether recipe changes are available…')).toBeHidden();

  await page.getByRole('button', { name: 'Add ingredient' }).click();
  await expect(page.locator('[id^="ingredient-name-"]')).toHaveCount(2);
});

test('stops checking availability when the readiness endpoint fails', async ({ page }) => {
  await mockEditorRequests(page, 503);

  await page.goto(`/recipe/${recipe.id}/edit`);

  await expect(page.getByText('Checking whether recipe changes are available…')).toBeHidden();
  await expect(page.getByText('Recipe pull requests are unavailable.')).toBeVisible();
  await expect(page.locator('#recipe-name')).toHaveValue(recipe.name);
});
