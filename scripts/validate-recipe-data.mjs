import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDirectory = path.resolve(projectRoot, process.argv[2] ?? 'src/assets/data');
const recipeRoot = path.join(dataDirectory, 'recipe');
const directories = await readdir(recipeRoot, { withFileTypes: true });
const ids = new Set();
const errors = [];
let count = 0;

for (const directory of directories.filter(entry => entry.isDirectory())) {
  const recipePath = path.join(recipeRoot, directory.name, 'recipe.json');
  if (!existsSync(recipePath)) {
    errors.push(`Missing recipe.json: ${directory.name}`);
    continue;
  }
  const recipe = JSON.parse(await readFile(recipePath, 'utf8'));
  count += 1;
  if (!recipe.id || !recipe.name || !Array.isArray(recipe.tags) ||
      typeof recipe.includeInSuggestions !== 'boolean' || !Array.isArray(recipe.ingredients)) {
    errors.push(`Invalid recipe.json: ${directory.name}`);
  }
  if (ids.has(recipe.id)) errors.push(`Duplicate recipe id: ${recipe.id}`);
  ids.add(recipe.id);
  if (recipe.externalUrl) {
    try { new URL(recipe.externalUrl); } catch { errors.push(`Invalid externalUrl: ${directory.name}`); }
  } else if (!existsSync(path.join(recipeRoot, directory.name, 'recipe.html'))) {
    errors.push(`Missing recipe.html: ${directory.name}`);
  }
  const images = recipe.images ?? [];
  if (!Array.isArray(images) || images.some(image => !isImageFilename(image))) {
    errors.push(`Invalid images: ${directory.name}`);
  } else if (images.some(image => !existsSync(path.join(recipeRoot, directory.name, image)))) {
    errors.push(`Missing declared image: ${directory.name}`);
  }
  if (recipe.thumbnail !== undefined &&
      (!isImageFilename(recipe.thumbnail) || !images.includes(recipe.thumbnail))) {
    errors.push(`Invalid thumbnail: ${directory.name}`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Validated ${count} recipes in ${path.relative(projectRoot, dataDirectory)}`);
}

function isImageFilename(filename) {
  return typeof filename === 'string' &&
    /^[^/\\]+\.(?:jpg|jpeg|png)$/i.test(filename);
}
