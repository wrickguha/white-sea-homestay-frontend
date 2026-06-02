import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button 
      (click)="themeService.toggleTheme()"
      class="fixed top-20 right-6 z-50 flex items-center justify-center w-12 h-12 rounded-full glass-panel border border-gold-400/30 text-gold-400 hover:text-gold-300 shadow-md hover:scale-105 active:scale-95 transition-all duration-500 overflow-hidden"
      [title]="themeService.theme() === 'day' ? 'Switch to Night Mode' : 'Switch to Day Mode'"
    >
      <div class="relative w-6 h-6 flex items-center justify-center">
        <!-- Sun Icon (Visible in Day theme, fades out/rotates in) -->
        <svg 
          class="absolute w-6 h-6 transition-all duration-700 ease-out transform"
          [ngClass]="themeService.theme() === 'day' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'"
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor" 
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.364 17.636l-.707.707M17.636 17.636l-.707-.707M6.364 6.364l-.707-.707M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>

        <!-- Moon Icon (Visible in Night theme, fades out/rotates in) -->
        <svg 
          class="absolute w-5 h-5 transition-all duration-700 ease-out transform"
          [ngClass]="themeService.theme() === 'night' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-50'"
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor" 
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      </div>
    </button>
  `
})
export class ThemeToggleComponent {
  constructor(public themeService: ThemeService) {}
}
