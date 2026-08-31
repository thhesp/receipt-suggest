import { AppComponent } from './app.component';
import { UserRecipeStateService } from '../../services/user-recipe-state.service';

describe('AppComponent', () => {
  it('initializes the user recipe state', () => {
    const userRecipeState = jasmine.createSpyObj<UserRecipeStateService>('UserRecipeStateService', ['initialize']);
    const component = new AppComponent(userRecipeState);

    component.ngOnInit();

    expect(userRecipeState.initialize).toHaveBeenCalledOnceWith();
  });
});
