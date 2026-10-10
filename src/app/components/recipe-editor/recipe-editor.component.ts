import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, TimeoutError } from 'rxjs';
import { takeUntil, timeout } from 'rxjs/operators';
import { RecipeFile } from '../../models/recipe.model';
import {
  RecipeChange,
  RecipeChangeService,
  RecipeImageUpload,
  RecipeChangeReadinessTimeoutError,
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
  private readonly recipeLoadTimeoutMs = 15_000;

  recipe = this.emptyRecipe();
  description = '';
  tagsInput = '';
  imagesInput = '';
  advancedRecipeJson = '';
  showAdvancedJson = false;
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
        this.readinessMessage = error instanceof RecipeChangeReadinessTimeoutError
          ? 'Checking availability timed out. Download your draft and try again later.'
          : 'Recipe change availability could not be checked. Download your draft before trying again.';
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
      this.recipeDetailService.loadRecipeFile(recipeId).pipe(
        takeUntil(this.destroy$),
        timeout(this.recipeLoadTimeoutMs)
      ).subscribe({
        next: recipe => {
          this.setRecipe(recipe);
          if (recipe.externalUrl) {
            this.isLoading = false;
            return;
          }
          this.recipeDetailService.loadRecipeHtml(recipeId).pipe(
            takeUntil(this.destroy$),
            timeout(this.recipeLoadTimeoutMs)
          ).subscribe({
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
    const imageNames = this.parseImageNames(this.imagesInput);
    this.selectedFiles.forEach(file => {
      if (!imageNames.includes(file.name)) imageNames.push(file.name);
    });
    this.imagesInput = imageNames.join(', ');
    this.recipe.images = imageNames;
    if (!this.recipe.thumbnail && imageNames.length > 0) {
      this.recipe.thumbnail = imageNames[0];
    }
    this.error = null;
  }

  updateTags(tags: string): void {
    this.recipe.tags = tags.split(',')
      .map(tag => tag.trim().toUpperCase())
      .filter(Boolean);
  }

  updateImages(images: string): void {
    this.recipe.images = this.parseImageNames(images);
    if (this.recipe.thumbnail && !this.recipe.images.includes(this.recipe.thumbnail)) {
      this.recipe.thumbnail = undefined;
    }
  }

  addIngredient(): void {
    this.recipe.ingredients.push({ amount: '', name: '' });
  }

  removeIngredient(index: number): void {
    this.recipe.ingredients.splice(index, 1);
  }

  toggleAdvancedJson(): void {
    this.showAdvancedJson = !this.showAdvancedJson;
    if (this.showAdvancedJson) {
      this.advancedRecipeJson = JSON.stringify(this.normalizedRecipe(), null, 2);
    }
  }

  applyAdvancedJson(): void {
    try {
      const recipe = JSON.parse(this.advancedRecipeJson) as RecipeFile;
      if (!this.isRecipeFile(recipe)) {
        throw new Error('Invalid recipe metadata');
      }
      this.setRecipe(recipe);
      this.error = null;
    } catch {
      this.error = 'Advanced recipe JSON must be valid JSON.';
    }
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
    const recipe = this.normalizedRecipe();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(recipe.id)) {
      throw new Error('The recipe ID may contain lowercase letters, numbers, and hyphens only.');
    }
    if (!recipe.name) {
      throw new Error('A recipe name is required.');
    }
    if (recipe.ingredients.some(ingredient => !ingredient.name)) {
      throw new Error('Every ingredient needs a name.');
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
    this.error = error instanceof TimeoutError
      ? 'Loading the recipe timed out. Refresh the page and try again.'
      : 'The recipe could not be loaded for editing.';
    this.isLoading = false;
    console.error('Recipe editor load failed:', error);
  }

  private emptyRecipe(): RecipeFile {
    return {
      id: '',
      name: '',
      tags: [],
      includeInSuggestions: true,
      ingredients: [{ amount: '', name: '' }],
      images: []
    };
  }

  private setRecipe(recipe: RecipeFile): void {
    this.recipe = {
      ...this.emptyRecipe(),
      ...recipe,
      ingredients: recipe.ingredients?.map(ingredient => ({ ...ingredient })) ?? [],
      tags: [...(recipe.tags ?? [])],
      images: [...(recipe.images ?? [])],
      ...(recipe.kcalPerPortion !== undefined ? { kcalPerPortion: String(recipe.kcalPerPortion) } : {}),
      ...(recipe.workTime !== undefined ? { workTime: String(recipe.workTime) } : {}),
      ...(recipe.cookingTime !== undefined ? { cookingTime: String(recipe.cookingTime) } : {})
    };
    this.tagsInput = this.recipe.tags.join(', ');
    this.imagesInput = (this.recipe.images ?? []).join(', ');
  }

  private normalizedRecipe(): RecipeFile {
    const recipe = this.recipe;
    const images = this.parseImageNames(this.imagesInput);
    return {
      id: recipe.id.trim(),
      name: recipe.name.trim(),
      tags: recipe.tags.map(tag => tag.trim()).filter(Boolean),
      includeInSuggestions: recipe.includeInSuggestions,
      ingredients: recipe.ingredients.map(ingredient => ({
        amount: ingredient.amount.trim(),
        name: ingredient.name.trim()
      })),
      ...(recipe.kcalPerPortion?.trim() ? { kcalPerPortion: recipe.kcalPerPortion.trim() } : {}),
      ...(recipe.workTime?.trim() ? { workTime: recipe.workTime.trim() } : {}),
      ...(recipe.cookingTime?.trim() ? { cookingTime: recipe.cookingTime.trim() } : {}),
      ...(recipe.externalUrl?.trim() ? { externalUrl: recipe.externalUrl.trim() } : {}),
      ...(images.length > 0 ? { images } : {}),
      ...(recipe.thumbnail ? { thumbnail: recipe.thumbnail } : {})
    };
  }

  private parseImageNames(images: string): string[] {
    return [...new Set(images.split(',').map(image => image.trim()).filter(Boolean))];
  }

  private isRecipeFile(recipe: unknown): recipe is RecipeFile {
    if (!recipe || typeof recipe !== 'object') return false;
    const value = recipe as Partial<RecipeFile>;
    return typeof value.id === 'string' &&
      typeof value.name === 'string' &&
      typeof value.includeInSuggestions === 'boolean' &&
      Array.isArray(value.tags) &&
      value.tags.every(tag => typeof tag === 'string') &&
      Array.isArray(value.ingredients) &&
      value.ingredients.every(ingredient => typeof ingredient?.name === 'string' &&
        typeof ingredient.amount === 'string');
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
