import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { RecipeService } from '../../services/recipe.service';
import { Recipe } from '../../models/recipe.model';
import { RecipeCardComponent } from '../recipe-card/recipe-card.component';
import { TagSelectorComponent } from '../tag-selector/tag-selector.component';

@Component({
  selector: 'app-recipe-overview',
  standalone: true,
  imports: [CommonModule, RouterModule, RecipeCardComponent, TagSelectorComponent],
  templateUrl: './recipe-overview.component.html',
  styleUrls: ['./recipe-overview.component.scss']
})
export class RecipeOverviewComponent implements OnInit, OnDestroy {
  recipes$ = new BehaviorSubject<Recipe[]>([]);
  filteredRecipes$ = new BehaviorSubject<Recipe[]>([]);
  allTags: string[] = [];
  searchTerm = '';
  selectedTags: string[] = [];
  isLoading = true;
  error: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private recipeService: RecipeService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadRecipes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadRecipes(): void {
    this.recipeService
      .loadRecipes()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          this.changeDetectorRef.markForCheck();
        })
      )
      .subscribe({
        next: (recipes) => {
          this.recipes$.next(recipes);
          this.filteredRecipes$.next(recipes);
          this.extractAllTags(recipes);
        },
        error: (err) => {
          this.error = 'Failed to load recipes. Please try again.';
          console.error('Error loading recipes:', err);
        }
      });
  }

  private extractAllTags(recipes: Recipe[]): void {
    const tagSet = new Set<string>();
    recipes.forEach(recipe => {
      recipe.tags.forEach(tag => tagSet.add(tag));
    });
    this.allTags = Array.from(tagSet).sort();
  }

  onTagsChanged(selectedTags: string[]): void {
    this.selectedTags = selectedTags;
    this.updateFilteredRecipes();
  }

  onSearchChanged(searchTerm: string): void {
    this.searchTerm = searchTerm;
    this.updateFilteredRecipes();
  }

  private updateFilteredRecipes(): void {
    const normalizedSearch = this.searchTerm.trim().toLowerCase();
    const filtered = this.recipes$.value.filter(recipe => {
      const matchesTags = this.selectedTags.length === 0 ||
        this.selectedTags.some(tag => recipe.tags.includes(tag));
      const matchesSearch = normalizedSearch === '' ||
        recipe.name.toLowerCase().includes(normalizedSearch) ||
        recipe.tags.some(tag => tag.toLowerCase().includes(normalizedSearch));

      return matchesTags && matchesSearch;
    });

    this.filteredRecipes$.next(filtered);
  }
}
