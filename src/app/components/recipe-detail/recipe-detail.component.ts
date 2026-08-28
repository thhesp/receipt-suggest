import { Component, OnInit, OnDestroy } from '@angular/core';
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

  private destroy$ = new Subject<void>();

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
    this.destroy$.next();
    this.destroy$.complete();
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
}
