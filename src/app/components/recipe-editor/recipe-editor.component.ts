import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { RecipeFile } from '../../models/recipe.model';
import {
  RecipeChange,
  RecipeChangeService,
  RecipeImageUpload
} from '../../services/recipe-change.service';
import { RecipeDetailService } from '../../services/recipe-detail.service';

@Component({
  selector: 'app-recipe-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './recipe-editor.component.html',
  styleUrls: ['./recipe-editor.component.scss']
})
export class RecipeEditorComponent implements OnInit, OnDestroy {
  readonly defaultRecipe = {
    id: 'new-recipe',
    name: 'New recipe',
    tags: [],
    includeInSuggestions: true,
    ingredients: []
  };

  recipeJson = JSON.stringify(this.defaultRecipe, null, 2);
  description = '';
  existingRecipeId: string | null = null;
  selectedFiles: File[] = [];
  isLoading = false;
  isSubmitting = false;
  error: string | null = null;
  pullRequestUrl: string | null = null;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private recipeDetailService: RecipeDetailService,
    private recipeChangeService: RecipeChangeService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const recipeId = params.get('id');
      if (!recipeId) {
        return;
      }

      this.existingRecipeId = recipeId;
      this.isLoading = true;
      this.recipeDetailService.loadRecipeFile(recipeId).pipe(takeUntil(this.destroy$)).subscribe({
        next: recipe => {
          this.recipeJson = JSON.stringify(recipe, null, 2);
          if (recipe.externalUrl) {
            this.isLoading = false;
            return;
          }
          this.recipeDetailService.loadRecipeHtml(recipeId).pipe(takeUntil(this.destroy$)).subscribe({
            next: description => {
              this.description = description;
              this.isLoading = false;
            },
            error: error => this.handleLoadError(error)
          });
        },
        error: error => this.handleLoadError(error)
      });
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFiles = Array.from(input.files ?? []);
    if (this.selectedFiles.length > 4) {
      this.selectedFiles = [];
      input.value = '';
      this.error = 'Select at most four images.';
      return;
    }
    this.error = null;
  }

  async submit(): Promise<void> {
    this.error = null;
    this.pullRequestUrl = null;

    let recipe: RecipeFile;
    try {
      recipe = JSON.parse(this.recipeJson) as RecipeFile;
    } catch {
      this.error = 'Recipe metadata must be valid JSON.';
      return;
    }

    try {
      const images = await Promise.all(this.selectedFiles.map(file => this.toImageUpload(file)));
      const change: RecipeChange = {
        operation: this.existingRecipeId ? 'update' : 'create',
        ...(this.existingRecipeId ? { originalRecipeId: this.existingRecipeId } : {}),
        recipe,
        description: this.description,
        images
      };
      this.isSubmitting = true;
      this.recipeChangeService.submit(change).pipe(takeUntil(this.destroy$)).subscribe({
        next: result => {
          this.pullRequestUrl = result.url;
          this.isSubmitting = false;
        },
        error: error => {
          this.error = error.error?.error || 'The pull request could not be created.';
          this.isSubmitting = false;
          console.error('Recipe change submission failed:', error);
        }
      });
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Selected images could not be read.';
    }
  }

  private async toImageUpload(file: File): Promise<RecipeImageUpload> {
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      throw new Error(`${file.name} must be a JPEG or PNG image.`);
    }
    if (file.size > 5_000_000) {
      throw new Error(`${file.name} is larger than 5 MB.`);
    }
    const content = await this.readAsBase64(file);
    return {
      name: file.name,
      contentType: file.type as 'image/jpeg' | 'image/png',
      content
    };
  }

  private handleLoadError(error: unknown): void {
    this.error = 'The recipe could not be loaded for editing.';
    this.isLoading = false;
    console.error('Recipe editor load failed:', error);
  }

  private readAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== 'string') {
          reject(new Error(`Could not read ${file.name}.`));
          return;
        }
        resolve(result.substring(result.indexOf(',') + 1));
      };
      reader.readAsDataURL(file);
    });
  }
}
