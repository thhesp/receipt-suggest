import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { RecipeCardComponent } from './recipe-card.component';
import { Recipe } from '../../models/recipe.model';
import { UserRecipeState } from '../../models/user-recipe-state.model';
import { UserRecipeStateService } from '../../services/user-recipe-state.service';

describe('RecipeCardComponent', () => {
  let fixture: ComponentFixture<RecipeCardComponent>;

  beforeEach(async () => {
    const userRecipeState = jasmine.createSpyObj<UserRecipeStateService>(
      'UserRecipeStateService',
      ['isFavorite', 'toggleFavorite'],
      {
        state$: of<UserRecipeState>({
          version: 1,
          favorites: {},
          plannedRecipes: {},
          shoppingList: {}
        })
      }
    );
    userRecipeState.isFavorite.and.returnValue(false);

    await TestBed.configureTestingModule({
      imports: [RecipeCardComponent],
      providers: [
        provideRouter([]),
        { provide: UserRecipeStateService, useValue: userRecipeState }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RecipeCardComponent);
    fixture.componentInstance.recipe = {
      id: 'pasta',
      name: 'Pasta',
      tags: ['DINNER'],
      includeInSuggestions: true
    } satisfies Recipe;
    fixture.detectChanges();
  });

  it('opens an internal recipe link in a new tab', () => {
    const recipeLink = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>('a.btn');

    expect(recipeLink).withContext('internal recipe link').toBeTruthy();
    if (!recipeLink) return;

    expect(recipeLink.getAttribute('target')).toBe('_blank');
    expect(recipeLink.getAttribute('rel')).toBe('noopener noreferrer');
    expect(recipeLink.getAttribute('href')).toContain('/recipe/pasta?name=Pasta');
  });
});
