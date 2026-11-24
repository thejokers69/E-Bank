import { Injectable, signal, computed, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'eb-theme-mode';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private mediaQuery: MediaQueryList | null = null;
  private mediaListener: ((e: MediaQueryListEvent) => void) | null = null;

  readonly mode = signal<ThemeMode>(this.readStoredMode());
  readonly resolvedTheme = computed<ResolvedTheme>(() => this.resolve(this.mode()));

  init(): void {
    if (!this.isBrowser) {
      return;
    }
    this.apply(this.resolvedTheme());
    this.watchSystemPreference();
  }

  setMode(mode: ThemeMode): void {
    this.mode.set(mode);
    if (this.isBrowser) {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
      this.apply(this.resolve(mode));
    }
  }

  private readStoredMode(): ThemeMode {
    if (!this.isBrowser) {
      return 'system';
    }
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
    return 'system';
  }

  private resolve(mode: ThemeMode): ResolvedTheme {
    if (!this.isBrowser) {
      return 'light';
    }
    if (mode === 'light' || mode === 'dark') {
      return mode;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private apply(resolved: ResolvedTheme): void {
    document.documentElement.setAttribute('data-bs-theme', resolved);
    document.documentElement.style.colorScheme = resolved;
  }

  private watchSystemPreference(): void {
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.mediaListener = () => {
      if (this.mode() === 'system') {
        this.apply(this.resolve('system'));
      }
    };
    this.mediaQuery.addEventListener('change', this.mediaListener);
  }
}

export function themeInitializer(theme: ThemeService): () => void {
  return () => theme.init();
}

/** Inline boot script in index.html must use the same key and resolution rules. */
export function resolveThemeFromStorage(): ResolvedTheme {
  try {
    const mode = localStorage.getItem(THEME_STORAGE_KEY) || 'system';
    if (mode === 'light' || mode === 'dark') {
      return mode;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}