/**
 * Recipe utility functions
 */

export function normalizeTags(tagsStr: string): string[] {
  if (!tagsStr || tagsStr.trim() === '') {
    return [];
  }
  return tagsStr
    .split(/[;,]/)
    .map(tag => tag.toUpperCase().trim())
    .filter(tag => /\w+/.test(tag));
}

export function getRecipeLink(recipe: { link: string; external: boolean; name: string }): string {
  if (recipe.external) {
    return recipe.link;
  }
  return `/recipe/${encodeURIComponent(recipe.link)}?name=${encodeURIComponent(recipe.name)}`;
}

export function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
