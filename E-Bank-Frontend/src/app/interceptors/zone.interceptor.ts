import { HttpInterceptorFn } from '@angular/common/http';
import { inject, NgZone } from '@angular/core';
import { Observable } from 'rxjs';

/**
 * Ensures HttpClient emissions run inside NgZone so templates update
 * immediately (Angular 22 + Vite can otherwise leave spinners stuck until
 * the next click).
 */
export const zoneHttpInterceptor: HttpInterceptorFn = (req, next) => {
  const ngZone = inject(NgZone);
  return new Observable(subscriber => {
    const subscription = next(req).subscribe({
      next: (event) => ngZone.run(() => subscriber.next(event)),
      error: (err) => ngZone.run(() => subscriber.error(err)),
      complete: () => ngZone.run(() => subscriber.complete())
    });
    return () => subscription.unsubscribe();
  });
};
