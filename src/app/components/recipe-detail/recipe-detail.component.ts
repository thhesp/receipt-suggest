import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { RecipeDetailService } from '../../services/recipe-detail.service';
import { Ingredient, RecipeTimes } from '../../models/recipe.model';
import { UserRecipeStateService } from '../../services/user-recipe-state.service';

@Component({
  selector: 'app-recipe-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recipe-detail.component.html',
  styleUrls: ['./recipe-detail.component.scss']
})
export class RecipeDetailComponent implements OnInit, OnDestroy {
  recipeName = '';
  recipeLink = '';
  ingredients$ = new BehaviorSubject<Ingredient[]>([]);
  nutrition$ = new BehaviorSubject<string>('');
  tags$ = new BehaviorSubject<string[]>([]);
  times$ = new BehaviorSubject<RecipeTimes>({});
  description$ = new BehaviorSubject<string>('');
  images$ = new BehaviorSubject<string[]>([]);
  isLoading = true;
  error: string | null = null;

  selectedImageIndex = 0;
  showModal = false;
  isWakeLockEnabled = false;
  wakeLockSupported = 'wakeLock' in navigator;
  copyStatus: 'idle' | 'copied' | 'failed' | 'added' = 'idle';
  isSelectingIngredients = false;
  selectedIngredientIndexes = new Set<number>();
  isFavorite = false;
  isPlanned = false;

  private destroy$ = new Subject<void>();
  private wakeLock: WakeLockSentinel | null = null;

  constructor(
    private route: ActivatedRoute,
    private recipeDetailService: RecipeDetailService,
    private userRecipeState: UserRecipeStateService
  ) {}

  ngOnInit(): void {
    this.userRecipeState.state$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.isFavorite = this.userRecipeState.isFavorite(this.recipeLink);
        this.isPlanned = this.userRecipeState.isPlanned(this.recipeLink);
      });

    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.recipeLink = params['link'];
      this.isFavorite = this.userRecipeState.isFavorite(this.recipeLink);
      this.isPlanned = this.userRecipeState.isPlanned(this.recipeLink);
      this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(queryParams => {
        this.recipeName = queryParams['name'] || '';
        this.loadRecipeDetails();
      });
    });
  }

  toggleFavorite(): void {
    this.userRecipeState.toggleFavorite(this.recipeLink);
  }

  togglePlanned(): void {
    this.userRecipeState.togglePlanned({ id: this.recipeLink, name: this.recipeName });
  }

  ngOnDestroy(): void {
    this.releaseWakeLock();
    this.destroy$.next();
    this.destroy$.complete();
  }

  async toggleWakeLock(): Promise<void> {
    if (!this.wakeLockSupported) {
      return;
    }

    if (this.isWakeLockEnabled) {
      this.isWakeLockEnabled = false;
      await this.releaseWakeLock();
      return;
    }

    await this.requestWakeLock();
  }

  @HostListener('document:visibilitychange')
  async onVisibilityChange(): Promise<void> {
    if (document.visibilityState === 'visible' && this.isWakeLockEnabled && !this.wakeLock) {
      await this.requestWakeLock();
    }
  }

  private async requestWakeLock(): Promise<void> {
    try {
      this.wakeLock = await navigator.wakeLock.request('screen');
      this.isWakeLockEnabled = true;
      this.wakeLock.addEventListener('release', () => {
        this.wakeLock = null;
        this.isWakeLockEnabled = false;
      });
    } catch (error) {
      this.isWakeLockEnabled = false;
      console.warn('Screen wake lock could not be enabled:', error);
    }
  }

  startIngredientSelection(): void {
    this.selectedIngredientIndexes = new Set(
      this.ingredients$.value.map((_, index) => index)
    );
    this.isSelectingIngredients = true;
    this.copyStatus = 'idle';
  }

  cancelIngredientSelection(): void {
    this.isSelectingIngredients = false;
    this.copyStatus = 'idle';
  }

  updateIngredientSelection(index: number, isSelected: boolean): void {
    if (isSelected) {
      this.selectedIngredientIndexes.add(index);
    } else {
      this.selectedIngredientIndexes.delete(index);
    }
    this.copyStatus = 'idle';
  }

  hasSelectedIngredients(): boolean {
    return this.selectedIngredientIndexes.size > 0;
  }

  addSelectedIngredientsToShoppingList(): void {
    const selectedIngredients = this.ingredients$.value.filter((_, index) =>
      this.selectedIngredientIndexes.has(index)
    );
    this.userRecipeState.addIngredients(this.recipeLink, this.recipeName, selectedIngredients);
    this.copyStatus = 'added';
  }

  async copySelectedIngredients(): Promise<void> {
    const text = this.ingredients$.value
      .filter((_, index) => this.selectedIngredientIndexes.has(index))
      .map(ingredient => `${ingredient.amount} ${ingredient.name}`.trim())
      .join('\n');

    try {
      await navigator.clipboard.writeText(text);
      this.copyStatus = 'copied';
    } catch (error) {
      this.copyStatus = this.copyWithFallback(text) ? 'copied' : 'failed';
      if (this.copyStatus === 'failed') {
        console.warn('Ingredients could not be copied:', error);
      }
    }
  }

  private loadRecipeDetails(): void {
    if (!this.recipeLink) {
      this.error = 'Recipe not found.';
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.error = null;
    this.ingredients$.next([]);
    this.nutrition$.next('');
    this.tags$.next([]);
    this.times$.next({});
    this.images$.next([]);
    this.description$.next('');

    // Rendering starts as soon as recipe metadata is available. Browser image
    // requests then proceed independently instead of gating the detail view.
    this.recipeDetailService.loadIngredients(this.recipeLink)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ingredients => {
          this.ingredients$.next(ingredients);
          this.isLoading = false;
          this.recipeDetailService.loadImages(this.recipeLink)
            .pipe(takeUntil(this.destroy$))
            .subscribe(images => this.images$.next(images));
        },
        error: (err) => {
          this.error = 'Failed to load recipe details.';
          this.isLoading = false;
          console.error('Error loading recipe details:', err);
        }
      });

    this.recipeDetailService.loadDescription(this.recipeLink)
      .pipe(takeUntil(this.destroy$))
      .subscribe(description => this.description$.next(description));

    this.recipeDetailService.loadNutrition(this.recipeLink)
      .pipe(takeUntil(this.destroy$))
      .subscribe(nutrition => this.nutrition$.next(nutrition));

    this.recipeDetailService.loadTags(this.recipeLink)
      .pipe(takeUntil(this.destroy$))
      .subscribe(tags => this.tags$.next(tags));

    this.recipeDetailService.loadTimes(this.recipeLink)
      .pipe(takeUntil(this.destroy$))
      .subscribe(times => this.times$.next(times));
  }

  hasTimes(times: RecipeTimes | null): boolean {
    return Boolean(times?.workTime || times?.cookingTime);
  }

  openImageModal(index: number): void {
    this.selectedImageIndex = index;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  nextImage(): void {
    const images = this.images$.value;
    if (images.length > 0) {
      this.selectedImageIndex = (this.selectedImageIndex + 1) % images.length;
    }
  }

  prevImage(): void {
    const images = this.images$.value;
    if (images.length > 0) {
      this.selectedImageIndex = (this.selectedImageIndex - 1 + images.length) % images.length;
    }
  }

  onModalClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).id === 'img-modal') {
      this.closeModal();
    }
  }

  private async releaseWakeLock(): Promise<void> {
    if (this.wakeLock) {
      await this.wakeLock.release();
      this.wakeLock = null;
    }
  }

  private copyWithFallback(text: string): boolean {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  }
}
