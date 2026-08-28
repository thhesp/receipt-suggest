import { existsSync } from 'node:fs';
import { readdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDirectory = path.resolve(projectRoot, process.argv[2] ?? 'src/assets/data');
const csvPath = path.join(dataDirectory, 'recipes.csv');
const metadataPath = path.join(dataDirectory, 'recipes.metadata.json');
const recipeDirectory = path.join(dataDirectory, 'recipe');

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

function parseCsv(csv) {
  const [headerLine, ...lines] = csv.trim().split(/\r?\n/);
  const headers = parseCsvLine(headerLine);
  return lines.filter(Boolean).map(line => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
}

function normalizeTags(value) {
  return value.split(/[;,]/).map(tag => tag.trim().toUpperCase()).filter(Boolean);
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function ingredientsHtml(csv) {
  const rows = parseCsv(csv);
  const items = rows
    .filter(row => row.Name)
    .map(row => `    <li data-ingredient><span data-amount>${escapeHtml(row.Amount ?? '')}</span> <span data-name>${escapeHtml(row.Name)}</span></li>`)
    .join('\n');
  return items ? `  <section data-ingredients>\n    <h2>Ingredients</h2>\n    <ul>\n${items}\n    </ul>\n  </section>` : '';
}

async function descriptionHtml(directory) {
  const htmlPath = path.join(directory, 'description.html');
  const txtPath = path.join(directory, 'description.txt');
  if (existsSync(htmlPath)) {
    return readFile(htmlPath, 'utf8');
  }
  if (existsSync(txtPath)) {
    const text = await readFile(txtPath, 'utf8');
    return `<section><h2>Preparation</h2><p>${escapeHtml(text).replaceAll(/\r?\n\r?\n/g, '</p><p>').replaceAll(/\r?\n/g, '<br>')}</p></section>`;
  }
  return '';
}

const rows = parseCsv(await readFile(csvPath, 'utf8'));
const directories = new Set(
  (await readdir(recipeDirectory, { withFileTypes: true }))
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
);
const metadata = [];

for (const row of rows) {
  const id = row.Link;
  const isExternal = row.External.toUpperCase() === 'Y';
  const directory = path.join(recipeDirectory, id);
  const recipe = {
    id,
    name: row.Name,
    tags: normalizeTags(row.Tags),
    includeInSuggestions: row.Include.toUpperCase() === 'Y',
    ...(row.Nutrition ? { nutrition: row.Nutrition } : {}),
    ...(isExternal ? { externalUrl: id } : {})
  };
  metadata.push(recipe);

  if (!isExternal && directories.has(id)) {
    const recipeHtmlPath = path.join(directory, 'recipe.html');
    if (!existsSync(recipeHtmlPath)) {
      const ingredientsPath = path.join(directory, 'ingredients.csv');
      const ingredients = existsSync(ingredientsPath)
        ? ingredientsHtml(await readFile(ingredientsPath, 'utf8'))
        : '';
      const description = await descriptionHtml(directory);
      await writeFile(recipeHtmlPath, `<article>\n${ingredients}${ingredients && description ? '\n\n' : ''}${description}\n</article>\n`);
    }
    for (const legacyName of ['ingredients.csv', 'description.txt', 'description.html']) {
      const legacyPath = path.join(directory, legacyName);
      if (existsSync(legacyPath)) {
        await unlink(legacyPath);
      }
    }
  }
}

await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
await rename(csvPath, `${csvPath}.migrated`);
console.log(`Migrated ${metadata.length} recipes in ${path.relative(projectRoot, dataDirectory)}`);
