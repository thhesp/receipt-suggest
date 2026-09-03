import { existsSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDirectory = path.resolve(projectRoot, process.argv[2] ?? 'src/assets/data');
const outputPath = path.join(dataDirectory, 'recipes.json');
const recipeRoot = path.join(dataDirectory, 'recipe');
const directories = await readdir(recipeRoot, { withFileTypes: true });
const recipes = [];

for (const directory of directories.filter(entry => entry.isDirectory())) {
  const recipePath = path.join(recipeRoot, directory.name, 'recipe.json');
  if (!existsSync(recipePath)) {
    throw new Error(`Missing recipe.json: ${path.relative(projectRoot, recipePath)}`);
  }
  const recipe = JSON.parse(await readFile(recipePath, 'utf8'));
  recipes.push({
    id: recipe.id,
    name: recipe.name,
    tags: recipe.tags,
    includeInSuggestions: recipe.includeInSuggestions,
    ...(recipe.nutrition ? { nutrition: recipe.nutrition } : {}),
    ...(recipe.workTime ? { workTime: recipe.workTime } : {}),
    ...(recipe.cookingTime ? { cookingTime: recipe.cookingTime } : {}),
    ...(recipe.externalUrl ? { externalUrl: recipe.externalUrl } : {}),
    ...(!recipe.externalUrl && recipe.thumbnail ? {
      thumbnail: `assets/data/recipe/${directory.name}/${recipe.thumbnail}`
    } : {})
  });
}

recipes.sort((left, right) =>
  left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }) ||
  left.id.localeCompare(right.id)
);
await writeFile(outputPath, `${JSON.stringify(recipes, null, 2)}\n`);
console.log(`Generated ${recipes.length} recipes in ${path.relative(projectRoot, outputPath)}`);
