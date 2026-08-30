import { AfterViewInit, ChangeDetectorRef, Component, Input, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Recipe } from '../../models/recipe.model';
import { UserRecipeStateService } from '../../services/user-recipe-state.service';

@Component({
  selector: 'app-recipe-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './recipe-card.component.html',
  styleUrls: ['./recipe-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecipeCardComponent implements AfterViewInit, OnDestroy {
  @Input() recipe!: Recipe;
  thumbnailUrl: string | null = null;
  isFavorite = false;
  private destroy$ = new Subject<void>();

  constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private userRecipeState: UserRecipeStateService
  ) {}

  ngAfterViewInit(): void {
    this.userRecipeState.state$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.isFavorite = this.userRecipeState.isFavorite(this.recipe.id);
        this.changeDetectorRef.markForCheck();
      });

    const loadThumbnail = () => {
      this.thumbnailUrl = this.recipe.thumbnail ?? null;
      this.changeDetectorRef.markForCheck();
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(loadThumbnail);
    } else {
      globalThis.setTimeout(loadThumbnail, 0);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleFavorite(): void {
    this.userRecipeState.toggleFavorite(this.recipe.id);
  }
}
