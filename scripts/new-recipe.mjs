import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [id, name] = process.argv.slice(2);
if (!id || !name) {
  console.error('Usage: npm run recipe:new -- <id> "<name>"');
  process.exit(1);
}

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDirectory = path.join(projectRoot, 'src/assets/data');
const metadataPath = path.join(dataDirectory, 'recipes.metadata.json');
const recipePath = path.join(dataDirectory, 'recipe', id);
const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));

if (metadata.some(recipe => recipe.id === id) || existsSync(recipePath)) {
  console.error(`Recipe already exists: ${id}`);
  process.exit(1);
}

metadata.push({ id, name, tags: [], includeInSuggestions: false });
metadata.sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }) || left.id.localeCompare(right.id));
await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
await mkdir(recipePath, { recursive: true });
await writeFile(path.join(recipePath, 'recipe.html'), `<article>
  <section data-ingredients>
    <h2>Ingredients</h2>
    <ul>
      <li data-ingredient><span data-amount></span> <span data-name>Ingredient</span></li>
    </ul>
  </section>
  <section>
    <h2>Preparation</h2>
    <p>Describe the preparation here.</p>
  </section>
</article>
`);
console.log(`Created ${path.relative(projectRoot, recipePath)}`);
