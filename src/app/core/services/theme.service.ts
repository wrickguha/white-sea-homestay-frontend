import { Injectable, signal, effect, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type DayNightTheme = 'day' | 'night';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  // Signal to store current theme state
  theme = signal<DayNightTheme>('day');
  
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeTheme();
      
      // Reactive effect that runs whenever the theme signal changes
      effect(() => {
        const currentTheme = this.theme();
        const bodyClassList = document.body.classList;
        
        if (currentTheme === 'night') {
          bodyClassList.add('dark');
        } else {
          bodyClassList.remove('dark');
        }
        localStorage.setItem('whitesea-theme', currentTheme);
      });
    }
  }

  private initializeTheme() {
    // 1. Check local storage
    const savedTheme = localStorage.getItem('whitesea-theme') as DayNightTheme | null;
    if (savedTheme === 'day' || savedTheme === 'night') {
      this.theme.set(savedTheme);
      return;
    }

    // 2. Check local time (night time between 6:00 PM and 6:00 AM)
    const hour = new Date().getHours();
    if (hour >= 18 || hour < 6) {
      this.theme.set('night');
    } else {
      this.theme.set('day');
    }
  }

  toggleTheme() {
    this.theme.update(current => current === 'day' ? 'night' : 'day');
  }

  setTheme(theme: DayNightTheme) {
    this.theme.set(theme);
  }
}
