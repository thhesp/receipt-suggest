import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { DeploymentInfo } from '../models/deployment-info.model';

@Injectable({ providedIn: 'root' })
export class DeploymentInfoService {
  readonly info$: Observable<DeploymentInfo | null>;

  constructor(private http: HttpClient) {
    this.info$ = this.http.get<unknown>('assets/build-info.json').pipe(
      map(info => this.isDeploymentInfo(info) ? info : null),
      catchError(() => of(null)),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  private isDeploymentInfo(value: unknown): value is DeploymentInfo {
    if (!this.isRecord(value) ||
      typeof value['appRevision'] !== 'string' ||
      typeof value['overlayRevision'] !== 'string' ||
      typeof value['builtAt'] !== 'string' ||
      !Number.isFinite(Date.parse(value['builtAt']))) {
      return false;
    }

    return value['runUrl'] === undefined ||
      (typeof value['runUrl'] === 'string' && value['runUrl'].startsWith('https://'));
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
