import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { map } from 'rxjs/operators';
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
  readonly groups$ = this.userRecipeState.state$.pipe(
    map(() => this.groupItems(this.userRecipeState.getShoppingListItems()))
  );

  constructor(private userRecipeState: UserRecipeStateService) {}

  updateChecked(id: string, checked: boolean): void {
    this.userRecipeState.setShoppingListItemChecked(id, checked);
  }

  removeItem(id: string): void {
    this.userRecipeState.removeShoppingListItem(id);
  }

  clear(): void {
    this.userRecipeState.clearShoppingList();
  }

  async copy(groups: ShoppingListGroup[]): Promise<void> {
    const text = groups.map(group => [
      group.recipeName,
      ...group.items.map(item => `${item.amount} ${item.name}`.trim())
    ].join('\n')).join('\n\n');
    await navigator.clipboard.writeText(text);
  }

  private groupItems(items: ShoppingListItem[]): ShoppingListGroup[] {
    const groups = new Map<string, ShoppingListItem[]>();
    items.forEach(item => {
      const recipeName = item.recipeName || item.recipeId;
      groups.set(recipeName, [...(groups.get(recipeName) ?? []), item]);
    });
    return Array.from(groups, ([recipeName, groupItems]) => ({ recipeName, items: groupItems }));
  }
}
