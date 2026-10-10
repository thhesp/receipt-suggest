import assert from 'node:assert/strict';
import test from 'node:test';
import { sanitizeRecipeDescription } from './recipe-description.mjs';

test('formats supported recipe description HTML', () => {
  const description = sanitizeRecipeDescription(
    '<article><h1>Title</h1><h2>Method</h2><h3>Step</h3><p>Stir <strong>gently</strong>.</p></article>'
  );

  assert.match(description, /^<article>\n  <h1>\n    Title\n  <\/h1>/);
  assert.match(description, /\n  <h2>\n    Method\n  <\/h2>/);
  assert.match(description, /\n  <h3>\n    Step\n  <\/h3>/);
  assert.match(description, /\n  <p>\n    Stir <strong>gently<\/strong>\.\n  <\/p>\n<\/article>$/);
});

test('removes executable recipe description markup', () => {
  const description = sanitizeRecipeDescription(
    '<article><script>alert(1)</script><p onclick="alert(1)">Safe</p><a href="javascript:alert(1)">Link</a></article>'
  );

  assert.doesNotMatch(description, /script|onclick|javascript:/i);
  assert.match(description, /Safe/);
  assert.match(description, /<a>Link<\/a>/);
});

test('requires a single article root', () => {
  assert.throws(
    () => sanitizeRecipeDescription('<p>Missing article root</p>'),
    /single article root/
  );
});
