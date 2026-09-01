export interface Recipe {
  id: string;
  name: string;
  tags: string[];
  includeInSuggestions: boolean;
  nutrition?: string;
  externalUrl?: string;
  thumbnail?: string;
}

export interface Ingredient {
  name: string;
  amount: string;
}

export interface RecipeFile {
  ingredients: Ingredient[];
  images?: string[];
  thumbnail?: string;
}

export interface RecipeDetail extends Recipe {
  ingredients: Ingredient[];
  description: string;
  images: string[];
}
