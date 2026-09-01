import { readdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDirectory = path.resolve(projectRoot, process.argv[2] ?? 'src/assets/data');
const recipeRoot = path.join(dataDirectory, 'recipe');
const imageExtension = /\.(?:jpg|jpeg|png)$/i;

for (const directory of await readdir(recipeRoot, { withFileTypes: true })) {
  if (!directory.isDirectory()) continue;

  const recipeDirectory = path.join(recipeRoot, directory.name);
  const recipe = JSON.parse(await readFile(path.join(recipeDirectory, 'recipe.json'), 'utf8'));
  const declaredImages = new Set([...(recipe.images ?? []), recipe.thumbnail].filter(Boolean));

  for (const file of await readdir(recipeDirectory, { withFileTypes: true })) {
    if (file.isFile() && imageExtension.test(file.name) && !declaredImages.has(file.name)) {
      await rm(path.join(recipeDirectory, file.name));
    }
  }
}
