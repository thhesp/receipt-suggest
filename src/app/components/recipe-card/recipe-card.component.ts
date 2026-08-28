import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Recipe } from '../../models/recipe.model';
import { getRecipeLink } from '../../utils/recipe.util';

@Component({
  selector: 'app-recipe-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './recipe-card.component.html',
  styleUrls: ['./recipe-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecipeCardComponent {
  @Input() recipe!: Recipe;

  getRecipeLink(): string {
    return getRecipeLink(this.recipe);
  }

  onCardClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.tagName === 'BUTTON') {
      return; // Don't navigate if button was clicked
    }

    const link = this.getRecipeLink();
    if (this.recipe.external) {
      window.open(link, '_blank');
    } else {
      // Navigation will happen via routerLink
    }
  }
}
