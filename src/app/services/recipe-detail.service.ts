import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
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
    return this.http.get(htmlUrl, { responseType: 'text' }).pipe(
      map(data => this.parseHtmlIngredients(data)),
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
    return this.http.get(htmlUrl, { responseType: 'text' }).pipe(
      map(data => this.parseDescriptionHtml(data)),
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

  private parseDescriptionHtml(html: string): string {
    return this.removeIngredientSection(this.rejectApplicationShell(html));
  }

  private rejectApplicationShell(content: string): string {
    if (/<app-root\b|polyfills\.js|main\.js/.test(content)) {
      throw new Error('Received the application shell instead of recipe content');
    }
    return content;
  }
}
