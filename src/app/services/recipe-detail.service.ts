import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { parseCSV } from '../utils/csv-parser.util';
import { Ingredient } from '../models/recipe.model';

@Injectable({
  providedIn: 'root'
})
export class RecipeDetailService {
  private readonly BASE_DATA_PATH = 'assets/data/recipe';
  private imageCache = new Map<string, string[]>();

  constructor(private http: HttpClient) {}

  /**
   * Load ingredients for a recipe
   */
  loadIngredients(recipeLink: string): Observable<Ingredient[]> {
    const htmlUrl = `${this.BASE_DATA_PATH}/${recipeLink}/recipe.html`;
    const csvUrl = `${this.BASE_DATA_PATH}/${recipeLink}/ingredients.csv`;
    return this.http.get(htmlUrl, { responseType: 'text' }).pipe(
      map(data => this.parseHtmlIngredients(data)),
      switchMap(ingredients => ingredients.length > 0
        ? of(ingredients)
        : this.http.get(csvUrl, { responseType: 'text' }).pipe(
          map(data => this.parseIngredients(data))
        )),
      catchError(() => this.http.get(csvUrl, { responseType: 'text' }).pipe(
        map(data => this.parseIngredients(data))
      )),
      catchError(error => {
        console.warn(`No ingredients found for ${recipeLink}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Load description for a recipe
   */
  loadDescription(recipeLink: string): Observable<string> {
    const htmlUrl = `${this.BASE_DATA_PATH}/${recipeLink}/recipe.html`;
    const txtUrl = `${this.BASE_DATA_PATH}/${recipeLink}/description.txt`;
    return this.http.get(htmlUrl, { responseType: 'text' }).pipe(
      map(data => this.removeIngredientSection(data)),
      catchError(() => this.http.get(txtUrl, { responseType: 'text' })),
      catchError(() => this.http.get(`${this.BASE_DATA_PATH}/${recipeLink}/description.html`, { responseType: 'text' })),
      catchError(error => {
        console.warn(`No description found for ${recipeLink}:`, error);
        return of('');
      })
    );
  }

  /**
   * Find and load images for a recipe
   */
  async loadImages(recipeLink: string): Promise<string[]> {
    if (this.imageCache.has(recipeLink)) {
      return this.imageCache.get(recipeLink) || [];
    }

    const images: string[] = [];
    const extensions = ['.png', '.jpg', '.jpeg'];

    for (const ext of extensions) {
      for (let i = 0; i < 10; i++) {
        const filename = i === 0 ? `img${ext}` : `img_${i}${ext}`;
        const url = `${this.BASE_DATA_PATH}/${recipeLink}/${filename}`;

        if (await this.fileExists(url)) {
          images.push(url);
        } else if (i === 0) {
          break;
        }
      }
    }

    this.imageCache.set(recipeLink, images);
    return images;
  }

  /**
   * Check if a file exists
   */
  private async fileExists(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Parse ingredients CSV
   */
  private parseIngredients(csvData: string): Ingredient[] {
    if (!csvData || csvData.trim() === '') {
      return [];
    }

    const rows = parseCSV(csvData);
    return rows
      .filter(row => row['Name'])
      .map(row => ({
        name: row['Name']?.trim() || '',
        amount: row['Amount']?.trim() || ''
      }));
  }

  private parseHtmlIngredients(html: string): Ingredient[] {
    const document = new DOMParser().parseFromString(html, 'text/html');
    return Array.from(document.querySelectorAll('[data-ingredient]')).map(element => ({
      name: element.querySelector('[data-name]')?.textContent?.trim() ?? '',
      amount: element.querySelector('[data-amount]')?.textContent?.trim() ?? ''
    })).filter(ingredient => ingredient.name);
  }

  private removeIngredientSection(html: string): string {
    const document = new DOMParser().parseFromString(html, 'text/html');
    document.querySelector('[data-ingredients]')?.remove();
    return document.body.innerHTML;
  }
}
