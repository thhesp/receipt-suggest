import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { Ingredient, RecipeFile, RecipeTimes } from '../models/recipe.model';

@Injectable({
  providedIn: 'root'
})
export class RecipeDetailService {
  private readonly BASE_DATA_PATH = 'assets/data/recipe';
  private recipeCache = new Map<string, Observable<RecipeFile>>();

  constructor(private http: HttpClient) {}

  /**
   * Load structured ingredients for a recipe
   */
  loadIngredients(recipeLink: string): Observable<Ingredient[]> {
    return this.loadRecipe(recipeLink).pipe(
      map(data => data.ingredients ?? []),
      catchError(error => {
        console.warn(`No ingredients found for ${recipeLink}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Load nutrition information for a recipe.
   */
  loadNutrition(recipeLink: string): Observable<string> {
    return this.loadRecipe(recipeLink).pipe(
      map(data => data.nutrition ?? ''),
      catchError(error => {
        console.warn(`No nutrition information found for ${recipeLink}:`, error);
        return of('');
      })
    );
  }

  /**
   * Load tags for a recipe.
   */
  loadTags(recipeLink: string): Observable<string[]> {
    return this.loadRecipe(recipeLink).pipe(
      map(data => data.tags ?? []),
      catchError(error => {
        console.warn(`No tags found for ${recipeLink}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Load active preparation times for a recipe.
   */
  loadTimes(recipeLink: string): Observable<RecipeTimes> {
    return this.loadRecipe(recipeLink).pipe(
      map(data => ({
        workTime: data.workTime,
        cookingTime: data.cookingTime
      })),
      catchError(error => {
        console.warn(`No preparation times found for ${recipeLink}:`, error);
        return of({});
      })
    );
  }

  /**
   * Load description for a recipe
   */
  loadDescription(recipeLink: string): Observable<string> {
    const htmlUrl = `${this.BASE_DATA_PATH}/${recipeLink}/recipe.html`;
    return this.http.get(htmlUrl, { responseType: 'text' }).pipe(
      map(data => this.parseDescriptionHtml(data)),
      catchError(error => {
        console.warn(`No description found for ${recipeLink}:`, error);
        return of('');
      })
    );
  }

  /**
   * Load the images explicitly declared in a recipe's metadata.
   */
  loadImages(recipeLink: string): Observable<string[]> {
    return this.loadRecipe(recipeLink).pipe(
      map(recipe => [...new Set([
        ...(recipe.thumbnail ? [recipe.thumbnail] : []),
        ...(recipe.images ?? [])
      ])].map(image => `${this.BASE_DATA_PATH}/${recipeLink}/${image}`)),
      catchError(error => {
        console.warn(`No images found for ${recipeLink}:`, error);
        return of([]);
      })
    );
  }

  private removeIngredientSection(html: string): string {
    const document = new DOMParser().parseFromString(html, 'text/html');
    document.querySelector('[data-ingredients]')?.remove();
    return document.body.innerHTML;
  }

  private parseDescriptionHtml(html: string): string {
    return this.removeIngredientSection(this.rejectApplicationShell(html));
  }

  private rejectApplicationShell(content: string): string {
    if (/<app-root\b|polyfills\.js|main\.js/.test(content)) {
      throw new Error('Received the application shell instead of recipe content');
    }
    return content;
  }

  private loadRecipe(recipeLink: string): Observable<RecipeFile> {
    const cachedRecipe = this.recipeCache.get(recipeLink);
    if (cachedRecipe) {
      return cachedRecipe;
    }

    const recipe = this.http.get<RecipeFile>(
      `${this.BASE_DATA_PATH}/${recipeLink}/recipe.json`
    ).pipe(shareReplay({ bufferSize: 1, refCount: false }));
    this.recipeCache.set(recipeLink, recipe);
    return recipe;
  }
}
