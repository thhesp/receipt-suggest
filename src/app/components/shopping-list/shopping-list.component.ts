import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { map } from 'rxjs/operators';
import { UserRecipeStateService } from '../../services/user-recipe-state.service';

@Component({
  selector: 'app-shopping-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './shopping-list.component.html',
  styleUrls: ['./shopping-list.component.scss']
})
export class ShoppingListComponent {
  readonly items$ = this.userRecipeState.state$.pipe(
    map(() => this.userRecipeState.getShoppingListItems())
  );

  constructor(private userRecipeState: UserRecipeStateService) {}

  updateChecked(id: string, checked: boolean): void {
    this.userRecipeState.setShoppingListItemChecked(id, checked);
  }

  removeItem(id: string): void {
    this.userRecipeState.removeShoppingListItem(id);
  }
}
