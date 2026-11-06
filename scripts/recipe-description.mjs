import sanitizeHtml from 'sanitize-html';

const allowedTags = [
  'article',
  'h1',
  'h2',
  'h3',
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'ul',
  'ol',
  'li',
  'a',
  'aside'
];

const blockTagExpression = /^<\/?(?:article|h[1-3]|p|ul|ol|li|aside)(?:\s[^>]*)?>$/i;

export function sanitizeRecipeDescription(description) {
  const sanitized = sanitizeHtml(description, {
    allowedTags,
    allowedAttributes: {
      a: ['href'],
      aside: ['class']
    },
    allowedClasses: {
      aside: ['recipe-callout', 'recipe-callout--hint', 'recipe-callout--warning']
    },
    allowedSchemesByTag: {
      a: ['https']
    },
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard',
    enforceHtmlBoundary: true
  }).trim();

  if (!hasSingleArticleRoot(sanitized)) {
    throw new Error('Recipe descriptions must have a single article root.');
  }

  return formatRecipeDescription(sanitized);
}

function hasSingleArticleRoot(description) {
  const articleTags = description.match(/<\/?article>/g) ?? [];
  return articleTags.length === 2 &&
    /^<article>[\s\S]*<\/article>$/.test(description);
}

function formatRecipeDescription(description) {
  const tokens = description
    .replace(/>\s+</g, '><')
    .split(/(<\/?(?:article|h[1-3]|p|ul|ol|li|aside)(?:\s[^>]*)?>)/i)
    .filter(Boolean);
  const lines = [];
  let depth = 0;

  for (const token of tokens) {
    if (!blockTagExpression.test(token)) {
      const content = token.trim();
      if (content) lines.push(`${'  '.repeat(depth)}${content}`);
      continue;
    }

    if (token.startsWith('</')) {
      depth -= 1;
      lines.push(`${'  '.repeat(depth)}${token}`);
      continue;
    }

    lines.push(`${'  '.repeat(depth)}${token}`);
    depth += 1;
  }

  return lines.join('\n');
}
