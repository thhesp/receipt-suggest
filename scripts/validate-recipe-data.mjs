import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDirectory = path.resolve(projectRoot, process.argv[2] ?? 'src/assets/data');
const metadata = JSON.parse(await readFile(path.join(dataDirectory, 'recipes.metadata.json'), 'utf8'));
const recipeDirectory = path.join(dataDirectory, 'recipe');
const directories = new Set(
  (await readdir(recipeDirectory, { withFileTypes: true }))
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
);
const errors = [];
const ids = new Set();

for (const recipe of metadata) {
  if (!recipe.id || !recipe.name || !Array.isArray(recipe.tags) || typeof recipe.includeInSuggestions !== 'boolean') {
    errors.push(`Invalid metadata for recipe: ${recipe.id || '(missing id)'}`);
    continue;
  }
  if (ids.has(recipe.id)) {
    errors.push(`Duplicate recipe id: ${recipe.id}`);
  }
  ids.add(recipe.id);

  if (recipe.externalUrl) {
    try {
      new URL(recipe.externalUrl);
    } catch {
      errors.push(`Invalid externalUrl for ${recipe.id}: ${recipe.externalUrl}`);
    }
  } else if (!directories.has(recipe.id)) {
    errors.push(`Missing recipe directory: ${recipe.id}`);
  } else if (!existsSync(path.join(recipeDirectory, recipe.id, 'recipe.html'))) {
    errors.push(`Missing recipe.html: ${recipe.id}`);
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Validated ${metadata.length} recipes in ${path.relative(projectRoot, dataDirectory)}`);
}
