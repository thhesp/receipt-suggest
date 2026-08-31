import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';

const stateDirectory = process.env.USER_STATE_DIRECTORY || '/var/lib/receipt-suggest-user-state';
const maximumBodySize = 100_000;

function emptyState() {
  return { version: 1, favorites: {}, plannedRecipes: {}, shoppingList: {} };
}

function userStatePath(user) {
  const userHash = createHash('sha256').update(user).digest('hex');
  return path.join(stateDirectory, `${userHash}.json`);
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTimestamp(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function sanitizeFavorites(favorites) {
  if (!isRecord(favorites)) return {};
  return Object.fromEntries(Object.entries(favorites)
    .filter(([key, value]) => key.length <= 300 && isRecord(value) &&
      typeof value.favorite === 'boolean' && isTimestamp(value.updatedAt))
    .map(([key, value]) => [key, { favorite: value.favorite, updatedAt: value.updatedAt }]));
}

function sanitizeShoppingList(shoppingList) {
  if (!isRecord(shoppingList)) return {};
  return Object.fromEntries(Object.entries(shoppingList)
    .filter(([key, value]) => key.length <= 600 && isRecord(value) &&
      ['id', 'recipeId', 'recipeName', 'name', 'amount'].every(field => typeof value[field] === 'string' &&
        value[field].length <= 500) && typeof value.checked === 'boolean' && isTimestamp(value.updatedAt))
    .map(([key, value]) => [key, {
      id: value.id,
      recipeId: value.recipeId,
      recipeName: value.recipeName,
      name: value.name,
      amount: value.amount,
      checked: value.checked,
      updatedAt: value.updatedAt
    }]));
}

function sanitizePlannedRecipes(plannedRecipes) {
  if (!isRecord(plannedRecipes)) return {};
  return Object.fromEntries(Object.entries(plannedRecipes)
    .filter(([key, value]) => key.length <= 300 && isRecord(value) &&
      typeof value.name === 'string' && value.name.length <= 500 &&
      typeof value.planned === 'boolean' && isTimestamp(value.updatedAt))
    .map(([key, value]) => [key, { name: value.name, planned: value.planned, updatedAt: value.updatedAt }]));
}

function sanitizeState(value) {
  if (!isRecord(value) || value.version !== 1) throw new Error('Invalid state');
  return {
    version: 1,
    favorites: sanitizeFavorites(value.favorites),
    plannedRecipes: sanitizePlannedRecipes(value.plannedRecipes),
    shoppingList: sanitizeShoppingList(value.shoppingList)
  };
}

function mergeRecords(left = {}, right = {}) {
  const merged = { ...left };
  for (const [key, value] of Object.entries(right)) {
    if (!merged[key] || value.updatedAt > merged[key].updatedAt) merged[key] = value;
  }
  return merged;
}

function mergeStates(left, right) {
  return {
    version: 1,
    favorites: mergeRecords(left.favorites, right.favorites),
    plannedRecipes: mergeRecords(left.plannedRecipes, right.plannedRecipes),
    shoppingList: mergeRecords(left.shoppingList, right.shoppingList)
  };
}

async function loadState(user) {
  try {
    return sanitizeState(JSON.parse(await readFile(userStatePath(user), 'utf8')));
  } catch (error) {
    if (error.code === 'ENOENT') return emptyState();
    throw error;
  }
}

async function saveState(user, state) {
  await mkdir(stateDirectory, { recursive: true, mode: 0o700 });
  const target = userStatePath(user);
  const temporary = `${target}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(state)}\n`, { mode: 0o600 });
  await rename(temporary, target);
}

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8'
  });
  response.end(JSON.stringify(data));
}

async function readJson(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > maximumBodySize) throw new Error('Request body is too large');
  }
  return JSON.parse(body);
}

await mkdir(stateDirectory, { recursive: true, mode: 0o700 });

createServer(async (request, response) => {
  const user = request.headers['x-authenticated-user'];
  if (typeof user !== 'string' || user.length === 0 || user.length > 500) {
    sendJson(response, 401, { error: 'Authentication required' });
    return;
  }

  try {
    if (request.method === 'GET') {
      sendJson(response, 200, await loadState(user));
      return;
    }

    if (request.method === 'PUT') {
      const state = mergeStates(await loadState(user), sanitizeState(await readJson(request)));
      await saveState(user, state);
      sendJson(response, 200, state);
      return;
    }

    response.writeHead(405, { Allow: 'GET, PUT' });
    response.end();
  } catch (error) {
    const statusCode = error instanceof SyntaxError || error.message === 'Invalid state' ||
      error.message === 'Request body is too large' ? 400 : 500;
    console.error('User state request failed:', error);
    sendJson(response, statusCode, { error: statusCode === 400 ? error.message : 'Internal server error' });
  }
}).listen(3000, '127.0.0.1');
