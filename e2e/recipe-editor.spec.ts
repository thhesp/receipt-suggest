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
  await page.route('**/api/recipe-changes', route => route.fulfill({
    status: 201,
    contentType: 'application/json',
    json: { number: 123, url: 'https://example.test/pull/123' }
  }));
}

test('loads an existing recipe into structured editor fields', async ({ page }) => {
  await mockEditorRequests(page);

  await page.goto(`/recipe/${recipe.id}/edit`);

  await expect(page.locator('#recipe-name')).toHaveValue(recipe.name);
  await expect(page.locator('#recipe-id')).toHaveValue(recipe.id);
  await expect(page.locator('#ingredient-amount-0')).toHaveValue('250 g');
  await expect(page.locator('#ingredient-name-0')).toHaveValue('Spaetzle');
  await expect(page.getByText('Checking whether recipe changes are available…')).toBeHidden();

  await page.locator('#recipe-tag-input').fill(' dessert ');
  await page.locator('#recipe-tag-input').press('Enter');
  await page.locator('#recipe-tag-input').fill('DESSERT');
  await page.locator('#recipe-tag-input').press('Enter');
  await expect(page.getByRole('button', { name: 'Remove DESSERT tag' })).toHaveCount(1);

  await page.getByRole('button', { name: 'Add ingredient' }).click();
  await expect(page.locator('[id^="ingredient-name-"]')).toHaveCount(2);

  const descriptionEditor = page.locator('#recipe-description-editor .ProseMirror');
  await expect(descriptionEditor).toBeVisible();

  await page.getByRole('button', { name: 'Edit HTML source' }).click();
  const descriptionSource = page.locator('#recipe-description-source');
  await expect(descriptionSource).toHaveValue('<article><p>Boil the spaetzle.</p></article>');
  await descriptionSource.fill('<p>Stir the spaetzle.</p>');
  await descriptionSource.blur();
  await expect(descriptionSource).toHaveValue('<article><p>Stir the spaetzle.</p></article>');
  await expect(page.locator('.description-preview > article')).toContainText('Stir the spaetzle.');

  await descriptionEditor.fill('Mix the ingredients.');
  await descriptionEditor.selectText();
  await page.getByRole('button', { name: 'Bold' }).click();
  await expect(page.locator('.description-preview strong, .description-preview b').first())
    .toHaveText('Mix the ingredients.');

  await descriptionEditor.fill('First item');
  await descriptionEditor.selectText();
  await page.getByRole('button', { name: 'Bullet List' }).click();
  await descriptionEditor.press('End');
  await descriptionEditor.press('Enter');
  await descriptionEditor.type('Second item');
  await expect(descriptionEditor.locator('ul li')).toHaveCount(2);

  await page.getByRole('button', { name: 'Hint' }).click();
  await expect(page.locator('.description-preview .recipe-callout--hint')).toContainText('Hint:');
  await page.getByRole('button', { name: 'Warning' }).click();
  await expect(page.locator('.description-preview .recipe-callout--warning')).toContainText('Warning:');
});

test('stops checking availability when the readiness endpoint fails', async ({ page }) => {
  await mockEditorRequests(page, 503);

  await page.goto(`/recipe/${recipe.id}/edit`);

  await expect(page.getByText('Checking whether recipe changes are available…')).toBeHidden();
  await expect(page.getByText('Recipe pull requests are unavailable.')).toBeVisible();
  await expect(page.locator('#recipe-name')).toHaveValue(recipe.name);
});

test('limits heading choices to paragraph and H1 through H3', async ({ page }) => {
  await mockEditorRequests(page);

  await page.goto(`/recipe/${recipe.id}/edit`);
  await page.getByRole('button', { name: 'Paragraph' }).click();

  await expect(page.getByRole('option', { name: 'Paragraph' })).toBeVisible();
  await expect(page.getByRole('option', { name: 'Header 1' })).toBeVisible();
  await expect(page.getByRole('option', { name: 'Header 2' })).toBeVisible();
  await expect(page.getByRole('option', { name: 'Header 3' })).toBeVisible();
  await expect(page.getByRole('option', { name: 'Header 4' })).toHaveCount(0);
});

test('shows the created pull request after submission completes', async ({ page }) => {
  await mockEditorRequests(page);

  await page.goto(`/recipe/${recipe.id}/edit`);
  await page.getByRole('button', { name: 'Create pull request' }).click();

  await expect(page.getByText('Pull request created.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create pull request' })).toBeVisible();
});
