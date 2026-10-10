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
  RecipeImageUpload,
  RecipeChangeSubmissionTimeoutError
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
  isCheckingAvailability = true;
  isRecipeChangeReady = false;
  readinessMessage = '';
  error: string | null = null;
  pullRequestUrl: string | null = null;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private recipeDetailService: RecipeDetailService,
    private recipeChangeService: RecipeChangeService
  ) {}

  ngOnInit(): void {
    this.recipeChangeService.checkReadiness().pipe(takeUntil(this.destroy$)).subscribe({
      next: status => {
        this.isCheckingAvailability = false;
        this.isRecipeChangeReady = status.ready;
        this.readinessMessage = status.message ?? '';
      },
      error: error => {
        this.isCheckingAvailability = false;
        this.readinessMessage = 'Recipe change availability could not be checked. Download your draft before trying again.';
        console.error('Recipe change readiness check failed:', error);
      }
    });

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
    if (!this.isRecipeChangeReady) return;
    this.error = null;
    this.pullRequestUrl = null;

    try {
      const change = await this.buildChange();
      this.isSubmitting = true;
      this.recipeChangeService.submit(change).pipe(takeUntil(this.destroy$)).subscribe({
        next: result => {
          this.pullRequestUrl = result.url;
          this.isSubmitting = false;
        },
        error: error => {
          this.error = error instanceof RecipeChangeSubmissionTimeoutError
            ? 'Creating the pull request timed out. Check GitHub before submitting again to avoid creating a duplicate pull request.'
            : error.error?.error || 'The pull request could not be created.';
          this.isSubmitting = false;
          console.error('Recipe change submission failed:', error);
        }
      });
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Selected images could not be read.';
    }
  }

  async downloadDraft(): Promise<void> {
    this.error = null;
    try {
      const change = await this.buildChange();
      const fileName = `${change.recipe.id || 'recipe'}-draft.json`;
      const url = URL.createObjectURL(new Blob([JSON.stringify(change, null, 2)], {
        type: 'application/json'
      }));
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'The draft could not be downloaded.';
    }
  }

  private async buildChange(): Promise<RecipeChange> {
    let recipe: RecipeFile;
    try {
      recipe = JSON.parse(this.recipeJson) as RecipeFile;
    } catch {
      throw new Error('Recipe metadata must be valid JSON.');
    }
    return {
      operation: this.existingRecipeId ? 'update' : 'create',
      ...(this.existingRecipeId ? { originalRecipeId: this.existingRecipeId } : {}),
      recipe,
      description: this.description,
      images: await Promise.all(this.selectedFiles.map(file => this.toImageUpload(file)))
    };
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
