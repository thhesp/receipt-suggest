import { AfterViewInit, ChangeDetectorRef, Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Recipe } from '../../models/recipe.model';

@Component({
  selector: 'app-recipe-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './recipe-card.component.html',
  styleUrls: ['./recipe-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecipeCardComponent implements AfterViewInit {
  @Input() recipe!: Recipe;
  thumbnailUrl: string | null = null;

  constructor(private changeDetectorRef: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
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
}
