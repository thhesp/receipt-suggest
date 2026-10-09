import { createHash, createSign, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';

const stateDirectory = process.env.USER_STATE_DIRECTORY || '/var/lib/receipt-suggest-user-state';
const maximumBodySize = 100_000;
const maximumRecipeChangeBodySize = 30_000_000;
const recipeRepository = process.env.RECIPE_CHANGE_REPOSITORY;
const recipeRepositoryBranch = process.env.RECIPE_CHANGE_REPOSITORY_BRANCH || 'main';
const githubAppId = process.env.RECIPE_CHANGE_GITHUB_APP_ID;
const githubAppInstallationId = process.env.RECIPE_CHANGE_GITHUB_APP_INSTALLATION_ID;
const githubAppPrivateKey = process.env.RECIPE_CHANGE_GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, '\n');
const githubApiUrl = 'https://api.github.com';
let githubInstallationToken;

function base64Url(value) {
  return Buffer.from(value).toString('base64url');
}

function recipeChangesConfigured() {
  return Boolean(recipeRepository && githubAppId && githubAppInstallationId && githubAppPrivateKey);
}

function createGithubAppJwt() {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64Url(JSON.stringify({
    iat: now - 60,
    exp: now + 540,
    iss: githubAppId
  }));
  const signingInput = `${header}.${payload}`;
  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  return `${signingInput}.${signer.sign(githubAppPrivateKey, 'base64url')}`;
}

async function githubRequest(pathname, options = {}) {
  const token = await getGithubInstallationToken();
  const response = await fetch(`${githubApiUrl}${pathname}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token.value}`,
      'User-Agent': 'receipt-suggest-recipe-change-service',
      'X-GitHub-Api-Version': '2022-11-28',
      ...options.headers
    }
  });
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    const message = typeof body === 'object' && body?.message ? body.message : response.statusText;
    const error = new Error(`GitHub request failed: ${message}`);
    error.statusCode = response.status;
    throw error;
  }
  return body;
}

async function getGithubInstallationToken() {
  if (githubInstallationToken && githubInstallationToken.expiresAt > Date.now() + 60_000) {
    return githubInstallationToken;
  }
  const response = await fetch(
    `${githubApiUrl}/app/installations/${encodeURIComponent(githubAppInstallationId)}/access_tokens`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${createGithubAppJwt()}`,
        'User-Agent': 'receipt-suggest-recipe-change-service',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }
  );
  const body = await response.json();
  if (!response.ok || typeof body.token !== 'string' || typeof body.expires_at !== 'string') {
    throw new Error(`Could not create GitHub installation token: ${body.message || response.statusText}`);
  }
  githubInstallationToken = {
    value: body.token,
    expiresAt: new Date(body.expires_at).getTime()
  };
  return githubInstallationToken;
}

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
  return readJsonWithLimit(request, maximumBodySize);
}

async function readJsonWithLimit(request, maximumSize) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > maximumSize) throw new Error('Request body is too large');
  }
  return JSON.parse(body);
}

function optionalString(value, field, maximumLength = 500) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.length > maximumLength) {
    throw new Error(`Invalid ${field}`);
  }
  return value;
}

function validateRecipeChange(value) {
  if (!isRecord(value) || !['create', 'update'].includes(value.operation) ||
      !isRecord(value.recipe) || typeof value.description !== 'string' ||
      value.description.length > 100_000 || !Array.isArray(value.images)) {
    throw new Error('Invalid recipe change');
  }

  const recipe = value.recipe;
  if (typeof recipe.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(recipe.id) ||
      typeof recipe.name !== 'string' || recipe.name.length === 0 || recipe.name.length > 200 ||
      !Array.isArray(recipe.tags) || recipe.tags.some(tag => typeof tag !== 'string' || tag.length === 0 || tag.length > 100) ||
      typeof recipe.includeInSuggestions !== 'boolean' || !Array.isArray(recipe.ingredients) ||
      recipe.ingredients.some(ingredient => !isRecord(ingredient) || typeof ingredient.name !== 'string' ||
        ingredient.name.length === 0 || ingredient.name.length > 500 || typeof ingredient.amount !== 'string' ||
        ingredient.amount.length > 500)) {
    throw new Error('Invalid recipe metadata');
  }

  for (const field of ['kcalPerPortion', 'workTime', 'cookingTime']) {
    optionalString(recipe[field], field);
  }
  if (recipe.externalUrl !== undefined) {
    if (typeof recipe.externalUrl !== 'string' || recipe.externalUrl.length > 2_000) throw new Error('Invalid externalUrl');
    try {
      const url = new URL(recipe.externalUrl);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid externalUrl');
    } catch {
      throw new Error('Invalid externalUrl');
    }
  }

  const imageNames = recipe.images ?? [];
  if (!Array.isArray(imageNames) || imageNames.some(image => typeof image !== 'string' ||
      !/^[^/\\]+\.(?:jpg|jpeg|png)$/i.test(image))) {
    throw new Error('Invalid images');
  }
  if (new Set(imageNames).size !== imageNames.length ||
      (recipe.thumbnail !== undefined && (!imageNames.includes(recipe.thumbnail) ||
        !/^[^/\\]+\.(?:jpg|jpeg|png)$/i.test(recipe.thumbnail)))) {
    throw new Error('Invalid thumbnail');
  }

  if (value.images.length > 4) throw new Error('Invalid image upload');
  const images = value.images.map(image => {
    if (!isRecord(image) || typeof image.name !== 'string' || !imageNames.includes(image.name) ||
        typeof image.content !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(image.content) ||
        !['image/jpeg', 'image/png'].includes(image.contentType) ||
        (image.contentType === 'image/jpeg' && !/\.jpe?g$/i.test(image.name)) ||
        (image.contentType === 'image/png' && !/\.png$/i.test(image.name)) ||
        Buffer.byteLength(image.content, 'base64') > 5_000_000) {
      throw new Error('Invalid image upload');
    }
    return { name: image.name, content: image.content };
  });
  if (new Set(images.map(image => image.name)).size !== images.length) throw new Error('Duplicate image upload');

  if (value.operation === 'update' && value.originalRecipeId !== recipe.id) {
    throw new Error('A recipe ID cannot be changed');
  }
  if (value.operation === 'update' && (typeof value.originalRecipeId !== 'string' ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.originalRecipeId))) {
    throw new Error('Invalid original recipe ID');
  }
  return {
    operation: value.operation,
    originalRecipeId: value.originalRecipeId,
    recipe: {
      id: recipe.id,
      name: recipe.name,
      tags: recipe.tags,
      includeInSuggestions: recipe.includeInSuggestions,
      ...(recipe.kcalPerPortion ? { kcalPerPortion: recipe.kcalPerPortion } : {}),
      ...(recipe.workTime ? { workTime: recipe.workTime } : {}),
      ...(recipe.cookingTime ? { cookingTime: recipe.cookingTime } : {}),
      ...(recipe.externalUrl ? { externalUrl: recipe.externalUrl } : {}),
      ...(imageNames.length ? { images: imageNames } : {}),
      ...(recipe.thumbnail ? { thumbnail: recipe.thumbnail } : {}),
      ingredients: recipe.ingredients.map(ingredient => ({ name: ingredient.name, amount: ingredient.amount }))
    },
    description: value.description,
    images
  };
}

function isSameOrigin(request) {
  const origin = request.headers.origin;
  const host = request.headers.host;
  if (!origin) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

async function loadRepositoryRecipe(recipeId) {
  const [owner, repository] = recipeRepository.split('/');
  const response = await githubRequest(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/contents/data/recipe/${encodeURIComponent(recipeId)}/recipe.json?ref=${encodeURIComponent(recipeRepositoryBranch)}`
  );
  return JSON.parse(Buffer.from(response.content, 'base64').toString('utf8'));
}

async function createRecipePullRequest(change, user) {
  const [owner, repository] = recipeRepository.split('/');
  const repositoryPath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`;
  let existingRecipe;
  try {
    existingRecipe = await loadRepositoryRecipe(change.recipe.id);
  } catch (error) {
    if (error.statusCode === 404) {
      existingRecipe = null;
    } else {
      throw error;
    }
  }
  if (change.operation === 'create' && existingRecipe) throw new Error('A recipe with this ID already exists');
  if (change.operation === 'update' && !existingRecipe) throw new Error('The recipe no longer exists');
  const existingImageNames = new Set(existingRecipe?.images ?? []);
  const uploadedImageNames = new Set(change.images.map(image => image.name));
  if (change.recipe.images?.some(image => !existingImageNames.has(image) && !uploadedImageNames.has(image))) {
    throw new Error('New recipe images must be uploaded with the recipe change');
  }

  const branchRef = await githubRequest(`${repositoryPath}/git/ref/heads/${encodeURIComponent(recipeRepositoryBranch)}`);
  const branchName = `recipe-change/${change.recipe.id}-${Date.now()}-${randomUUID().slice(0, 8)}`;
  await githubRequest(`${repositoryPath}/git/refs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: branchRef.object.sha })
  });

  const currentCommit = await githubRequest(`${repositoryPath}/git/commits/${branchRef.object.sha}`);
  const recipeDirectory = `data/recipe/${change.recipe.id}`;
  const tree = [
    {
      path: `${recipeDirectory}/recipe.json`,
      mode: '100644',
      type: 'blob',
      content: `${JSON.stringify(change.recipe, null, 2)}\n`
    }
  ];
  if (!change.recipe.externalUrl) {
    tree.push({
      path: `${recipeDirectory}/recipe.html`,
      mode: '100644',
      type: 'blob',
      content: `${change.description}\n`
    });
  }
  for (const image of change.images) {
    const blob = await githubRequest(`${repositoryPath}/git/blobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: image.content, encoding: 'base64' })
    });
    tree.push({ path: `${recipeDirectory}/${image.name}`, mode: '100644', type: 'blob', sha: blob.sha });
  }

  const newTree = await githubRequest(`${repositoryPath}/git/trees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base_tree: currentCommit.tree.sha, tree })
  });
  const commit = await githubRequest(`${repositoryPath}/git/commits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `${change.operation === 'create' ? 'Add' : 'Update'} recipe: ${change.recipe.name}`,
      tree: newTree.sha,
      parents: [branchRef.object.sha]
    })
  });
  await githubRequest(`${repositoryPath}/git/refs/heads/${encodeURIComponent(branchName)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sha: commit.sha, force: false })
  });
  const pullRequest = await githubRequest(`${repositoryPath}/pulls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: `${change.operation === 'create' ? 'Add' : 'Update'} recipe: ${change.recipe.name}`,
      head: branchName,
      base: recipeRepositoryBranch,
      body: `Submitted by authenticated Receipt Suggest user \`${user}\`.\n\nReview the recipe content and merge to publish it with the next deployment.`
    })
  });
  return { url: pullRequest.html_url, number: pullRequest.number };
}

await mkdir(stateDirectory, { recursive: true, mode: 0o700 });

createServer(async (request, response) => {
  const user = request.headers['x-authenticated-user'];
  if (typeof user !== 'string' || user.length === 0 || user.length > 500) {
    sendJson(response, 401, { error: 'Authentication required' });
    return;
  }

  try {
    if (request.url === '/api/recipe-changes') {
      if (!recipeChangesConfigured()) {
        sendJson(response, 503, { error: 'Recipe changes are not configured' });
        return;
      }
      if (request.method !== 'POST') {
        response.writeHead(405, { Allow: 'POST' });
        response.end();
        return;
      }
      if (!isSameOrigin(request) || !request.headers['content-type']?.startsWith('application/json')) {
        sendJson(response, 400, { error: 'Invalid recipe change request' });
        return;
      }
      const change = validateRecipeChange(await readJsonWithLimit(request, maximumRecipeChangeBodySize));
      const pullRequest = await createRecipePullRequest(change, user);
      sendJson(response, 201, pullRequest);
      return;
    }

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
    const statusCode = error instanceof SyntaxError || error.message.startsWith('Invalid ') ||
      error.message === 'Request body is too large' || error.message.startsWith('A recipe ') ||
      error.message.startsWith('The recipe ') || error.message === 'Duplicate image upload' ? 400 : 500;
    console.error('User state request failed:', error);
    sendJson(response, statusCode, { error: statusCode === 400 ? error.message : 'Internal server error' });
  }
}).listen(3000, '127.0.0.1');
