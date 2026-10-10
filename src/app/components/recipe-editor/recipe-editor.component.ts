import {
  AfterViewChecked,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
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
export class RecipeEditorComponent implements AfterViewChecked, OnInit, OnDestroy {
  private readonly recipeLoadTimeoutMs = 15_000;

  recipe = this.emptyRecipe();
  description = '';
  tagInput = '';
  imagesInput = '';
  advancedRecipeJson = '';
  showAdvancedJson = false;
  showDescriptionSource = false;
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
  private shouldSyncDescriptionEditor = true;
  @ViewChild('descriptionEditor') private descriptionEditor?: ElementRef<HTMLElement>;

  constructor(
    private route: ActivatedRoute,
    private recipeDetailService: RecipeDetailService,
    private recipeChangeService: RecipeChangeService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.recipeChangeService.checkReadiness().pipe(takeUntil(this.destroy$)).subscribe({
      next: status => {
        this.isCheckingAvailability = false;
        this.isRecipeChangeReady = status.ready;
        this.readinessMessage = status.message ?? '';
        this.changeDetectorRef.markForCheck();
      },
      error: error => {
        this.isCheckingAvailability = false;
        this.readinessMessage = error instanceof RecipeChangeReadinessTimeoutError
          ? 'Checking availability timed out. Download your draft and try again later.'
          : 'Recipe change availability could not be checked. Download your draft before trying again.';
        console.error('Recipe change readiness check failed:', error);
        this.changeDetectorRef.markForCheck();
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
            this.changeDetectorRef.markForCheck();
            return;
          }
          this.recipeDetailService.loadRecipeHtml(recipeId).pipe(
            takeUntil(this.destroy$),
            timeout(this.recipeLoadTimeoutMs)
          ).subscribe({
            next: description => {
              this.setDescription(description);
              this.isLoading = false;
              this.changeDetectorRef.markForCheck();
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

  ngAfterViewChecked(): void {
    if (!this.shouldSyncDescriptionEditor || !this.descriptionEditor) return;
    this.descriptionEditor.nativeElement.innerHTML = this.descriptionContent(this.description);
    this.shouldSyncDescriptionEditor = false;
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

  addTag(event?: Event): void {
    event?.preventDefault();
    const tag = this.tagInput.trim().toUpperCase();
    if (tag && !this.recipe.tags.includes(tag)) {
      this.recipe.tags.push(tag);
    }
    this.tagInput = '';
  }

  removeTag(tag: string): void {
    this.recipe.tags = this.recipe.tags.filter(currentTag => currentTag !== tag);
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

  formatDescription(command: string, value?: string): void {
    document.execCommand(command, false, value);
    this.syncDescriptionFromEditor();
  }

  addDescriptionCallout(type: 'hint' | 'warning'): void {
    const label = type === 'hint' ? 'Hint' : 'Warning';
    document.execCommand(
      'insertHTML',
      false,
      `<aside class="recipe-callout recipe-callout--${type}"><strong>${label}:</strong> </aside><p><br></p>`
    );
    this.syncDescriptionFromEditor();
  }

  addDescriptionLink(): void {
    const url = window.prompt('Enter an HTTPS link');
    if (!url) return;

    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== 'https:') throw new Error('Only HTTPS links are supported.');
      this.formatDescription('createLink', parsedUrl.href);
    } catch {
      this.error = 'Enter a valid HTTPS link.';
    }
  }

  updateDescription(event: Event): void {
    this.description = this.normalizeDescription((event.target as HTMLElement).innerHTML);
  }

  updateDescriptionSource(description: string): void {
    this.setDescription(description);
  }

  pasteDescriptionAsPlainText(event: ClipboardEvent): void {
    event.preventDefault();
    document.execCommand('insertText', false, event.clipboardData?.getData('text/plain') ?? '');
    this.syncDescriptionFromEditor();
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
      this.changeDetectorRef.markForCheck();
      this.recipeChangeService.submit(change).pipe(takeUntil(this.destroy$)).subscribe({
        next: result => {
          this.pullRequestUrl = result.url;
          this.isSubmitting = false;
          this.changeDetectorRef.markForCheck();
        },
        error: error => {
          this.error = error instanceof RecipeChangeSubmissionTimeoutError
            ? 'Creating the pull request timed out. Check GitHub before submitting again to avoid creating a duplicate pull request.'
            : error.error?.error || 'The pull request could not be created.';
          this.isSubmitting = false;
          console.error('Recipe change submission failed:', error);
          this.changeDetectorRef.markForCheck();
        }
      });
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Selected images could not be read.';
      this.changeDetectorRef.markForCheck();
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
      description: this.normalizeDescription(this.description),
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
    this.changeDetectorRef.markForCheck();
  }

  private syncDescriptionFromEditor(): void {
    if (this.descriptionEditor) {
      this.description = this.normalizeDescription(this.descriptionEditor.nativeElement.innerHTML);
    }
  }

  private setDescription(description: string): void {
    this.description = this.normalizeDescription(description);
    this.shouldSyncDescriptionEditor = true;
  }

  private normalizeDescription(description: string): string {
    const document = new DOMParser().parseFromString(description, 'text/html');
    const article = document.body.querySelector(':scope > article');
    const hasOnlyArticleRoot = article !== null && Array.from(document.body.childNodes).every(node =>
      node === article || (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim())
    );

    return hasOnlyArticleRoot
      ? `<article>${article.innerHTML}</article>`
      : `<article>${document.body.innerHTML}</article>`;
  }

  private descriptionContent(description: string): string {
    const document = new DOMParser().parseFromString(description, 'text/html');
    return document.body.querySelector(':scope > article')?.innerHTML ?? '';
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
      tags: this.normalizeTags(recipe.tags ?? []),
      images: [...(recipe.images ?? [])],
      ...(recipe.kcalPerPortion !== undefined ? { kcalPerPortion: String(recipe.kcalPerPortion) } : {}),
      ...(recipe.workTime !== undefined ? { workTime: String(recipe.workTime) } : {}),
      ...(recipe.cookingTime !== undefined ? { cookingTime: String(recipe.cookingTime) } : {})
    };
    this.imagesInput = (this.recipe.images ?? []).join(', ');
  }

  private normalizedRecipe(): RecipeFile {
    const recipe = this.recipe;
    const images = this.parseImageNames(this.imagesInput);
    return {
      id: recipe.id.trim(),
      name: recipe.name.trim(),
      tags: this.normalizeTags(recipe.tags),
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

  private normalizeTags(tags: string[]): string[] {
    return [...new Set(tags.map(tag => tag.trim().toUpperCase()).filter(Boolean))];
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
