export interface Recipe {
  name: string;
  link: string;
  tags: string[];
  include: boolean;
  external: boolean;
}

export interface Ingredient {
  name: string;
  amount: string;
}

export interface RecipeDetail extends Recipe {
  ingredients: Ingredient[];
  description: string;
  images: string[];
}
