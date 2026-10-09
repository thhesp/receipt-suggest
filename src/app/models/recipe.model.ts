export interface Recipe {
  id: string;
  name: string;
  tags: string[];
  includeInSuggestions: boolean;
  kcalPerPortion?: string;
  workTime?: string;
  cookingTime?: string;
  externalUrl?: string;
  thumbnail?: string;
}

export interface Ingredient {
  name: string;
  amount: string;
}

export interface RecipeTimes {
  workTime?: string;
  cookingTime?: string;
}

export interface RecipeFile {
  id: string;
  name: string;
  ingredients: Ingredient[];
  tags: string[];
  includeInSuggestions: boolean;
  kcalPerPortion?: string;
  workTime?: string;
  cookingTime?: string;
  externalUrl?: string;
  images?: string[];
  thumbnail?: string;
}

export interface RecipeDetail extends Recipe {
  ingredients: Ingredient[];
  description: string;
  images: string[];
}
