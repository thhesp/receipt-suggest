import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { RecipeDetailService } from '../../services/recipe-detail.service';
import { Ingredient } from '../../models/recipe.model';

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
  description$ = new BehaviorSubject<string>('');
  images$ = new BehaviorSubject<string[]>([]);
  isLoading = true;
  error: string | null = null;

  selectedImageIndex = 0;
  showModal = false;
  isWakeLockEnabled = false;
  wakeLockSupported = 'wakeLock' in navigator;
  copyStatus: 'idle' | 'copied' | 'failed' = 'idle';

  private destroy$ = new Subject<void>();
  private wakeLock: WakeLockSentinel | null = null;

  constructor(
    private route: ActivatedRoute,
    private recipeDetailService: RecipeDetailService
  ) {}

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.recipeLink = params['link'];
      this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(queryParams => {
        this.recipeName = queryParams['name'] || '';
        this.loadRecipeDetails();
      });
    });
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

  async copyIngredients(): Promise<void> {
    const text = this.ingredients$.value
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

    // Load ingredients and description in parallel
    forkJoin({
      ingredients: this.recipeDetailService.loadIngredients(this.recipeLink),
      description: this.recipeDetailService.loadDescription(this.recipeLink)
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ ingredients, description }) => {
          this.ingredients$.next(ingredients);
          this.description$.next(description);

          // Load images asynchronously
          this.recipeDetailService.loadImages(this.recipeLink).then(images => {
            this.images$.next(images);
            this.isLoading = false;
          });
        },
        error: (err) => {
          this.error = 'Failed to load recipe details.';
          this.isLoading = false;
          console.error('Error loading recipe details:', err);
        }
      });
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
