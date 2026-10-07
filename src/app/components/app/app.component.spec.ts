import { AppComponent } from './app.component';
import { of } from 'rxjs';
import { UserRecipeStateService } from '../../services/user-recipe-state.service';
import { DeploymentInfoService } from '../../services/deployment-info.service';

describe('AppComponent', () => {
  it('initializes the user recipe state', () => {
    const userRecipeState = jasmine.createSpyObj<UserRecipeStateService>('UserRecipeStateService', ['initialize']);
    const deploymentInfo = jasmine.createSpyObj<DeploymentInfoService>('DeploymentInfoService', [], {
      info$: of(null)
    });
    const component = new AppComponent(userRecipeState, deploymentInfo);

    component.ngOnInit();

    expect(userRecipeState.initialize).toHaveBeenCalledOnceWith();
  });
});
