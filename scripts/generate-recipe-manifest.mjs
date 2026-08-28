import { existsSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDirectory = path.resolve(projectRoot, process.argv[2] ?? 'src/assets/data');
const metadataPath = path.join(dataDirectory, 'recipes.metadata.json');
const outputPath = path.join(dataDirectory, 'recipes.json');
const recipeDirectories = new Set(
  (await readdir(path.join(dataDirectory, 'recipe'), { withFileTypes: true }))
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
);

const recipes = JSON.parse(await readFile(metadataPath, 'utf8')).map(recipe => {
  const hasRecipeDirectory = recipeDirectories.has(recipe.id);
  const image = hasRecipeDirectory
    ? ['img.jpg', 'img.png', 'img.jpeg'].find(filename =>
      existsSync(path.join(dataDirectory, 'recipe', recipe.id, filename))
    )
    : undefined;

  return {
    ...recipe,
    ...(!recipe.externalUrl && hasRecipeDirectory ? {
      thumbnail: image ? `assets/data/recipe/${recipe.id}/${image}` : undefined
    } : {})
  };
}).sort((left, right) => {
  const nameOrder = left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
  return nameOrder || left.id.localeCompare(right.id);
});

await writeFile(outputPath, `${JSON.stringify(recipes, null, 2)}\n`);
console.log(`Generated ${recipes.length} recipes in ${path.relative(projectRoot, outputPath)}`);
