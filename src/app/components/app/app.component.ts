import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';
import { UserRecipeStateService } from '../../services/user-recipe-state.service';
import { DeploymentInfoService } from '../../services/deployment-info.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'Recipe Suggest';
  isMenuOpen = false;
  readonly deploymentInfo$ = this.deploymentInfo.info$;

  constructor(
    private userRecipeState: UserRecipeStateService,
    private deploymentInfo: DeploymentInfoService
  ) {}

  ngOnInit(): void {
    this.userRecipeState.initialize();
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu(): void {
    this.isMenuOpen = false;
  }
}
