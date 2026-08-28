import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { parseCSV } from '../utils/csv-parser.util';
import { Recipe } from '../models/recipe.model';

@Injectable({
  providedIn: 'root'
})
export class RecipeService {
  private readonly RECIPES_CSV_PATH = 'public/data/recipes.csv';
  private recipesCache: Recipe[] | null = null;

  constructor(private http: HttpClient) {}

  /**
   * Load all recipes from CSV file
   */
  loadRecipes(): Observable<Recipe[]> {
    if (this.recipesCache) {
      return of(this.recipesCache);
    }

    return this.http.get(this.RECIPES_CSV_PATH, { responseType: 'text' }).pipe(
      map(data => this.parseRecipes(data)),
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
          tags.some(tag => recipe.tags.includes(tag))
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
        const included = recipes.filter(r => r.include);
        return this.shuffleAndSlice(included, count);
      })
    );
  }

  /**
   * Parse CSV data to Recipe objects
   */
  private parseRecipes(csvData: string): Recipe[] {
    const rows = parseCSV(csvData);
    return rows.map(row => ({
      name: row['Name']?.trim() || '',
      link: row['Link']?.trim() || '',
      tags: this.normalizeTags(row['Tags']),
      include: (row['Include']?.toUpperCase() || 'N') === 'Y',
      external: (row['External']?.toUpperCase() || 'N') === 'Y'
    }));
  }

  /**
   * Normalize tags from comma/semicolon separated string
   */
  private normalizeTags(tagsStr: string): string[] {
    if (!tagsStr || tagsStr.trim() === '') {
      return [];
    }
    return tagsStr
      .split(/[;,]/)
      .map(tag => tag.toUpperCase().trim())
      .filter(tag => /\w+/.test(tag));
  }

  /**
   * Shuffle array and return first n items
   */
  private shuffleAndSlice(items: Recipe[], count: number): Recipe[] {
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }
}
