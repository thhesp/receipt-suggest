import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Recipe } from '../../models/recipe.model';

@Component({
  selector: 'app-tag-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tag-selector.component.html',
  styleUrls: ['./tag-selector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TagSelectorComponent implements OnInit {
  @Input() allTags: string[] = [];
  @Input() filteredRecipes: Recipe[] | null = [];
  @Input() totalRecipes = 0;
  @Output() tagsChanged = new EventEmitter<string[]>();

  selectedTags: Set<string> = new Set();
  availableTags: Map<string, boolean> = new Map();

  ngOnInit(): void {
    this.updateAvailableTags();
  }

  ngOnChanges(): void {
    this.updateAvailableTags();
  }

  toggleTag(tag: string): void {
    if (this.selectedTags.has(tag)) {
      this.selectedTags.delete(tag);
    } else {
      this.selectedTags.add(tag);
    }

    this.updateAvailableTags();
    this.tagsChanged.emit(Array.from(this.selectedTags));
  }

  private updateAvailableTags(): void {
    this.availableTags.clear();

    if (this.selectedTags.size === 0) {
      // All tags available
      this.allTags.forEach(tag => this.availableTags.set(tag, true));
    } else {
      // Only tags that appear in filtered recipes are available
      const availableTagsSet = new Set<string>();

      if (this.filteredRecipes) {
        this.filteredRecipes.forEach(recipe => {
          recipe.tags.forEach(tag => availableTagsSet.add(tag));
        });
      }

      this.allTags.forEach(tag => {
        const isAvailable = availableTagsSet.has(tag) || this.selectedTags.has(tag);
        this.availableTags.set(tag, isAvailable);
      });
    }
  }

  isTagSelected(tag: string): boolean {
    return this.selectedTags.has(tag);
  }

  isTagAvailable(tag: string): boolean {
    return this.availableTags.get(tag) ?? true;
  }

  clearFilters(): void {
    this.selectedTags.clear();
    this.updateAvailableTags();
    this.tagsChanged.emit([]);
  }
}
