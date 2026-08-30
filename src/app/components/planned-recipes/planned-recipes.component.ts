import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BehaviorSubject, Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Recipe } from '../../models/recipe.model';
import { RecipeDetailService } from '../../services/recipe-detail.service';
import { RecipeService } from '../../services/recipe.service';
import { UserRecipeStateService } from '../../services/user-recipe-state.service';
import { RecipeCardComponent } from '../recipe-card/recipe-card.component';

@Component({
  selector: 'app-planned-recipes',
  standalone: true,
  imports: [CommonModule, RouterModule, RecipeCardComponent],
  templateUrl: './planned-recipes.component.html',
  styleUrls: ['./planned-recipes.component.scss']
})
export class PlannedRecipesComponent implements OnInit, OnDestroy {
  readonly recipes$ = new BehaviorSubject<Recipe[]>([]);
  isCreatingShoppingList = false;
  private destroy$ = new Subject<void>();

  constructor(
    private recipeService: RecipeService,
    private recipeDetailService: RecipeDetailService,
    private userRecipeState: UserRecipeStateService
  ) {}

  ngOnInit(): void {
    this.recipeService.loadRecipes().pipe(takeUntil(this.destroy$)).subscribe(recipes => {
      this.userRecipeState.state$.pipe(takeUntil(this.destroy$)).subscribe(() => {
        const plannedIds = new Set(this.userRecipeState.getPlannedRecipeIds());
        this.recipes$.next(recipes.filter(recipe => plannedIds.has(recipe.id)));
      });
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  createShoppingList(recipes: Recipe[]): void {
    const localRecipes = recipes.filter(recipe => !recipe.externalUrl);
    if (localRecipes.length === 0) return;
    this.isCreatingShoppingList = true;
    forkJoin(localRecipes.map(recipe =>
      this.recipeDetailService.loadIngredients(recipe.id)
    )).pipe(takeUntil(this.destroy$)).subscribe({
      next: ingredientLists => {
        localRecipes.forEach((recipe, index) =>
          this.userRecipeState.addIngredients(recipe.id, recipe.name, ingredientLists[index])
        );
        this.isCreatingShoppingList = false;
      },
      error: () => this.isCreatingShoppingList = false
    });
  }

  removeFromPlan(recipe: Recipe): void {
    if (this.userRecipeState.isPlanned(recipe.id)) {
      this.userRecipeState.togglePlanned(recipe);
    }
  }
}
