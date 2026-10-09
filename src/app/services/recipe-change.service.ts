import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RecipeFile } from '../models/recipe.model';

export interface RecipeImageUpload {
  name: string;
  contentType: 'image/jpeg' | 'image/png';
  content: string;
}

export interface RecipeChange {
  operation: 'create' | 'update';
  originalRecipeId?: string;
  recipe: RecipeFile;
  description: string;
  images: RecipeImageUpload[];
}

export interface RecipeChangeResult {
  url: string;
  number: number;
}

export interface RecipeChangeReadiness {
  ready: boolean;
  code?: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RecipeChangeService {
  constructor(private http: HttpClient) {}

  submit(change: RecipeChange): Observable<RecipeChangeResult> {
    return this.http.post<RecipeChangeResult>('/api/recipe-changes', change);
  }

  checkReadiness(): Observable<RecipeChangeReadiness> {
    return this.http.get<RecipeChangeReadiness>('/api/recipe-changes/status');
  }
}
