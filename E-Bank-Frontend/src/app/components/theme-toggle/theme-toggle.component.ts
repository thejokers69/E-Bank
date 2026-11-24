import { Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeMode, ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './theme-toggle.component.html',
  styleUrls: ['./theme-toggle.component.css'],
  host: {
    '[class.theme-toggle--compact]': 'compact',
    '[class.theme-toggle--on-navbar]': 'onNavbar',
  },
})
export class ThemeToggleComponent {
  @Input() compact = false;
  /** Sits on the blue admin navbar — uses translucent shell, not page light/dark buttons. */
  @Input() onNavbar = false;
  readonly theme = inject(ThemeService);

  readonly options: { mode: ThemeMode; label: string; icon: string }[] = [
    { mode: 'light', label: 'Light', icon: 'bi-sun' },
    { mode: 'dark', label: 'Dark', icon: 'bi-moon-stars' },
    { mode: 'system', label: 'System', icon: 'bi-circle-half' },
  ];

  setMode(mode: ThemeMode): void {
    this.theme.setMode(mode);
  }
}
