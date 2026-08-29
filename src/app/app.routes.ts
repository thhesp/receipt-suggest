import { Routes } from '@angular/router';
import { RecipeOverviewComponent } from './components/recipe-overview/recipe-overview.component';
import { RecipeSuggestComponent } from './components/recipe-suggest/recipe-suggest.component';
import { RecipeDetailComponent } from './components/recipe-detail/recipe-detail.component';

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
    path: 'recipe/:link',
    component: RecipeDetailComponent,
    data: { title: 'Recipe' }
  },
  {
    path: '**',
    redirectTo: ''
  }
];
