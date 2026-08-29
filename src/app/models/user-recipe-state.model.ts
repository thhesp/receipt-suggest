export interface FavoriteState {
  favorite: boolean;
  updatedAt: number;
}

export interface ShoppingListItem {
  id: string;
  recipeId: string;
  name: string;
  amount: string;
  checked: boolean;
  updatedAt: number;
}

export interface UserRecipeState {
  version: 1;
  favorites: Record<string, FavoriteState>;
  shoppingList: Record<string, ShoppingListItem>;
}
