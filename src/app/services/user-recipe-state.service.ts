import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Ingredient } from '../models/recipe.model';
import { FavoriteState, ShoppingListItem, UserRecipeState } from '../models/user-recipe-state.model';

@Injectable({ providedIn: 'root' })
export class UserRecipeStateService {
  private readonly storageKey = 'receipt-suggest.user-recipe-state';
  private readonly stateUrl = '/api/user-state';
  private readonly stateSubject = new BehaviorSubject<UserRecipeState>(this.loadLocalState());

  readonly state$ = this.stateSubject.asObservable();

  constructor(private http: HttpClient) {}

  initialize(): void {
    this.http.get<UserRecipeState>(this.stateUrl).pipe(
      map(state => this.mergeStates(this.stateSubject.value, state)),
      catchError(() => of(this.stateSubject.value)),
      tap(state => {
        this.saveLocalState(state);
        this.stateSubject.next(state);
      })
    ).subscribe(state => this.sync(state));
  }

  isFavorite(recipeId: string): boolean {
    return this.stateSubject.value.favorites[recipeId]?.favorite ?? false;
  }

  toggleFavorite(recipeId: string): void {
    const current = this.stateSubject.value.favorites[recipeId]?.favorite ?? false;
    this.updateState({
      ...this.stateSubject.value,
      favorites: {
        ...this.stateSubject.value.favorites,
        [recipeId]: { favorite: !current, updatedAt: Date.now() }
      }
    });
  }

  addIngredients(recipeId: string, ingredients: Ingredient[]): void {
    const updatedAt = Date.now();
    const shoppingList = { ...this.stateSubject.value.shoppingList };
    ingredients.forEach(ingredient => {
      const id = `${recipeId}:${ingredient.amount}:${ingredient.name}`;
      shoppingList[id] = {
        ...shoppingList[id],
        id,
        recipeId,
        name: ingredient.name,
        amount: ingredient.amount,
        checked: false,
        updatedAt
      };
    });
    this.updateState({ ...this.stateSubject.value, shoppingList });
  }

  setShoppingListItemChecked(id: string, checked: boolean): void {
    const item = this.stateSubject.value.shoppingList[id];
    if (!item) return;
    this.updateState({
      ...this.stateSubject.value,
      shoppingList: {
        ...this.stateSubject.value.shoppingList,
        [id]: { ...item, checked, updatedAt: Date.now() }
      }
    });
  }

  removeShoppingListItem(id: string): void {
    const item = this.stateSubject.value.shoppingList[id];
    if (!item) return;
    this.updateState({
      ...this.stateSubject.value,
      shoppingList: {
        ...this.stateSubject.value.shoppingList,
        [id]: { ...item, name: '', amount: '', updatedAt: Date.now() }
      }
    });
  }

  getShoppingListItems(): ShoppingListItem[] {
    return Object.values(this.stateSubject.value.shoppingList)
      .filter(item => item.name !== '')
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  private updateState(state: UserRecipeState): void {
    this.saveLocalState(state);
    this.stateSubject.next(state);
    this.sync(state);
  }

  private sync(state: UserRecipeState): void {
    this.http.put<UserRecipeState>(this.stateUrl, state).pipe(
      map(serverState => this.mergeStates(this.stateSubject.value, serverState)),
      catchError(() => of(state)),
      tap(mergedState => {
        this.saveLocalState(mergedState);
        this.stateSubject.next(mergedState);
      })
    ).subscribe();
  }

  private loadLocalState(): UserRecipeState {
    const emptyState = this.emptyState();
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return emptyState;
      return this.mergeStates(emptyState, JSON.parse(stored) as UserRecipeState);
    } catch {
      return emptyState;
    }
  }

  private saveLocalState(state: UserRecipeState): void {
    localStorage.setItem(this.storageKey, JSON.stringify(state));
  }

  private mergeStates(left: UserRecipeState, right: UserRecipeState): UserRecipeState {
    return {
      version: 1,
      favorites: this.mergeRecords<FavoriteState>(left.favorites, right?.favorites),
      shoppingList: this.mergeRecords<ShoppingListItem>(left.shoppingList, right?.shoppingList)
    };
  }

  private mergeRecords<T extends { updatedAt: number }>(
    left: Record<string, T> = {},
    right: Record<string, T> = {}
  ): Record<string, T> {
    const result = { ...left };
    Object.entries(right).forEach(([key, value]) => {
      if (!result[key] || value.updatedAt > result[key].updatedAt) result[key] = value;
    });
    return result;
  }

  private emptyState(): UserRecipeState {
    return { version: 1, favorites: {}, shoppingList: {} };
  }
}
