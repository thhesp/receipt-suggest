import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { RecipeService } from '../../services/recipe.service';
import { UserRecipeStateService } from '../../services/user-recipe-state.service';
import { ShoppingListItem } from '../../models/user-recipe-state.model';

interface ShoppingListGroup {
  recipeName: string;
  items: ShoppingListItem[];
}

@Component({
  selector: 'app-shopping-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './shopping-list.component.html',
  styleUrls: ['./shopping-list.component.scss']
})
export class ShoppingListComponent {
  readonly groups$ = combineLatest([
    this.userRecipeState.state$,
    this.recipeService.loadRecipes()
  ]).pipe(
    map(([, recipes]) => this.groupItems(
      this.userRecipeState.getShoppingListItems(),
      new Map(recipes.map(recipe => [recipe.id, recipe.name]))
    ))
  );
  status = '';

  constructor(
    private userRecipeState: UserRecipeStateService,
    private recipeService: RecipeService
  ) {}

  updateChecked(id: string, checked: boolean): void {
    this.userRecipeState.setShoppingListItemChecked(id, checked);
  }

  removeItem(id: string): void {
    this.userRecipeState.removeShoppingListItem(id);
    this.status = 'Item removed from shopping list.';
  }

  clear(): void {
    this.userRecipeState.clearShoppingList();
    this.status = 'Shopping list cleared.';
  }

  async copy(groups: ShoppingListGroup[]): Promise<void> {
    const text = groups.map(group => [
      group.recipeName,
      ...group.items.map(item => `${item.amount} ${item.name}`.trim())
    ].join('\n')).join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      this.status = 'Shopping list copied.';
    } catch {
      this.status = 'Shopping list could not be copied.';
    }
  }

  private groupItems(items: ShoppingListItem[], recipeNames: Map<string, string>): ShoppingListGroup[] {
    const groups = new Map<string, ShoppingListItem[]>();
    items.forEach(item => {
      const recipeName = item.recipeName || recipeNames.get(item.recipeId) || 'Unknown recipe';
      groups.set(recipeName, [...(groups.get(recipeName) ?? []), item]);
    });
    return Array.from(groups, ([recipeName, groupItems]) => ({ recipeName, items: groupItems }));
  }
}
