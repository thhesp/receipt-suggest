import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Recipe } from '../models/recipe.model';

@Injectable({
  providedIn: 'root'
})
export class RecipeService {
  private readonly RECIPES_MANIFEST_PATH = 'assets/data/recipes.json';
  private recipesCache: Recipe[] | null = null;

  constructor(private http: HttpClient) {}

  /**
   * Load all recipes from CSV file
   */
  loadRecipes(): Observable<Recipe[]> {
    if (this.recipesCache) {
      return of(this.recipesCache);
    }

    return this.http.get<Recipe[]>(this.RECIPES_MANIFEST_PATH).pipe(
      map(recipes => {
        this.recipesCache = recipes;
        return recipes;
      }),
      catchError(error => {
        console.error('Error loading recipes:', error);
        return throwError(() => new Error('Failed to load recipes'));
      })
    );
  }

  /**
   * Get recipes filtered by tags
   */
  getRecipesByTags(tags: string[]): Observable<Recipe[]> {
    return this.loadRecipes().pipe(
      map(recipes => {
        if (tags.length === 0) {
          return recipes;
        }
        return recipes.filter(recipe =>
          tags.every(tag => recipe.tags.includes(tag))
        );
      })
    );
  }

  /**
   * Get random suggestions (included recipes only)
   */
  getSuggestions(count: number = 5): Observable<Recipe[]> {
    return this.loadRecipes().pipe(
      map(recipes => {
        const included = recipes.filter(r => r.includeInSuggestions);
        return this.shuffleAndSlice(included, count);
      })
    );
  }

  /**
   * Shuffle array and return first n items
   */
  private shuffleAndSlice(items: Recipe[], count: number): Recipe[] {
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }
}
