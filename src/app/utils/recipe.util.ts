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

export function getRecipeLink(recipe: { id: string; externalUrl?: string; name: string }): string {
  if (recipe.externalUrl) {
    return recipe.externalUrl;
  }
  return `/recipe/${encodeURIComponent(recipe.id)}?name=${encodeURIComponent(recipe.name)}`;
}

export function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
