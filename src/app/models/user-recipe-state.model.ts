export interface FavoriteState {
  favorite: boolean;
  updatedAt: number;
}

export interface ShoppingListItem {
  id: string;
  recipeId: string;
  recipeName: string;
  name: string;
  amount: string;
  checked: boolean;
  updatedAt: number;
}

export interface PlannedRecipeState {
  name: string;
  planned: boolean;
  updatedAt: number;
}

export interface UserRecipeState {
  version: 1;
  favorites: Record<string, FavoriteState>;
  plannedRecipes: Record<string, PlannedRecipeState>;
  shoppingList: Record<string, ShoppingListItem>;
}
