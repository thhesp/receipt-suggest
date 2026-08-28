import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { RecipeService } from '../../services/recipe.service';
import { Recipe } from '../../models/recipe.model';
import { RecipeCardComponent } from '../recipe-card/recipe-card.component';

@Component({
  selector: 'app-recipe-suggest',
  standalone: true,
  imports: [CommonModule, RouterModule, RecipeCardComponent],
  templateUrl: './recipe-suggest.component.html',
  styleUrls: ['./recipe-suggest.component.scss']
})
export class RecipeSuggestComponent implements OnInit, OnDestroy {
  suggestions: Recipe[] = [];
  isLoading = false;
  error: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(private recipeService: RecipeService) {}

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  generateSuggestions(): void {
    this.isLoading = true;
    this.error = null;

    this.recipeService
      .getSuggestions(5)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (suggestions) => {
          this.suggestions = suggestions;
          this.isLoading = false;
        },
        error: (err) => {
          this.error = 'Failed to generate suggestions. Please try again.';
          this.isLoading = false;
          console.error('Error generating suggestions:', err);
        }
      });
  }
}
