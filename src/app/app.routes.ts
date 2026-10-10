import { Routes } from '@angular/router';
import { RecipeOverviewComponent } from './components/recipe-overview/recipe-overview.component';
import { RecipeSuggestComponent } from './components/recipe-suggest/recipe-suggest.component';
import { RecipeDetailComponent } from './components/recipe-detail/recipe-detail.component';
import { ShoppingListComponent } from './components/shopping-list/shopping-list.component';
import { PlannedRecipesComponent } from './components/planned-recipes/planned-recipes.component';

export const routes: Routes = [
  {
    path: '',
    component: RecipeOverviewComponent,
    data: { title: 'Recipes Overview' }
  },
  {
    path: 'suggest',
    component: RecipeSuggestComponent,
    data: { title: 'Suggest recipes' }
  },
  {
    path: 'recipe/new',
    loadComponent: () => import('./components/recipe-editor/recipe-editor.component')
      .then(component => component.RecipeEditorComponent),
    data: { title: 'Create recipe' }
  },
  {
    path: 'recipe/:id/edit',
    loadComponent: () => import('./components/recipe-editor/recipe-editor.component')
      .then(component => component.RecipeEditorComponent),
    data: { title: 'Edit recipe' }
  },
  {
    path: 'recipe/:link',
    component: RecipeDetailComponent,
    data: { title: 'Recipe' }
  },
  {
    path: 'shopping-list',
    component: ShoppingListComponent,
    data: { title: 'Shopping List' }
  },
  {
    path: 'planned-recipes',
    component: PlannedRecipesComponent,
    data: { title: 'Planned Recipes' }
  },
  {
    path: '**',
    redirectTo: ''
  }
];
