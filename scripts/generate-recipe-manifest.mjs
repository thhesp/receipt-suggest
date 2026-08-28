import { existsSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDirectory = path.resolve(projectRoot, process.argv[2] ?? 'src/assets/data');
const csvPath = path.join(dataDirectory, 'recipes.csv');
const outputPath = path.join(dataDirectory, 'recipes.json');

function parseCsvLine(line) {
  const values = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      values.push(value.trim());
      value = '';
    } else {
      value += character;
    }
  }

  values.push(value.trim());
  return values;
}

function normalizeTags(value) {
  return value
    .split(/[;,]/)
    .map(tag => tag.trim().toUpperCase())
    .filter(Boolean);
}

const csv = await readFile(csvPath, 'utf8');
const [headerLine, ...lines] = csv.trim().split(/\r?\n/);
const headers = parseCsvLine(headerLine);
const rows = lines.filter(Boolean).map(line => {
  const values = parseCsvLine(line);
  return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
});
const recipeDirectories = new Set(
  (await readdir(path.join(dataDirectory, 'recipe'), { withFileTypes: true }))
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
);

const recipes = rows.map(row => {
  const id = row.Link;
  const isExternal = row.External.toUpperCase() === 'Y';
  const hasRecipeDirectory = recipeDirectories.has(id);
  const image = hasRecipeDirectory
    ? ['img.jpg', 'img.png', 'img.jpeg'].find(filename =>
      existsSync(path.join(dataDirectory, 'recipe', id, filename))
    )
    : undefined;

  return {
    id,
    name: row.Name,
    tags: normalizeTags(row.Tags),
    includeInSuggestions: row.Include.toUpperCase() === 'Y',
    ...(row.Nutrition ? { nutrition: row.Nutrition } : {}),
    ...(isExternal ? { externalUrl: id } : {}),
    ...(!isExternal && hasRecipeDirectory ? {
      thumbnail: image ? `assets/data/recipe/${id}/${image}` : undefined
    } : {})
  };
}).sort((left, right) => {
  const nameOrder = left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
  return nameOrder || left.id.localeCompare(right.id);
});

await writeFile(outputPath, `${JSON.stringify(recipes, null, 2)}\n`);
console.log(`Generated ${recipes.length} recipes in ${path.relative(projectRoot, outputPath)}`);
