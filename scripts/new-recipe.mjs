import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [id, name] = process.argv.slice(2);
if (!id || !name) {
  console.error('Usage: npm run recipe:new -- <id> "<name>"');
  process.exit(1);
}

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDirectory = path.join(projectRoot, 'src/assets/data');
const recipePath = path.join(dataDirectory, 'recipe', id);
if (existsSync(recipePath)) {
  console.error(`Recipe already exists: ${id}`);
  process.exit(1);
}

await mkdir(recipePath, { recursive: true });
await writeFile(path.join(recipePath, 'recipe.json'), `${JSON.stringify({
  id,
  name,
  tags: [],
  includeInSuggestions: false,
  ingredients: []
}, null, 2)}\n`);
await writeFile(path.join(recipePath, 'recipe.html'), `<article>
  <section>
    <h2>Preparation</h2>
    <p>Describe the preparation here.</p>
  </section>
</article>
`);
console.log(`Created ${path.relative(projectRoot, recipePath)}`);
