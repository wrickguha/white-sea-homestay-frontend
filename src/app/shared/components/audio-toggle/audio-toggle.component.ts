import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioService } from '../../../core/services/audio.service';

@Component({
  selector: 'app-audio-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button 
      (click)="audioService.togglePlayback()"
      class="fixed bottom-6 right-6 z-50 flex items-center justify-center gap-3 px-4 py-3 rounded-full glass-panel border border-gold-400/30 text-gold-400 shadow-lg hover:border-gold-400 hover:text-gold-300 transition-all duration-500 group overflow-hidden"
      aria-label="Toggle Ambient Nature Sounds"
    >
      <!-- Soundwave animation bars -->
      <div class="flex items-end gap-[3px] h-4 w-5">
        <span 
          class="w-[2px] bg-current rounded-full transition-all duration-300"
          [ngClass]="audioService.isPlaying() ? 'animate-bar-1' : 'h-1'"
        ></span>
        <span 
          class="w-[2px] bg-current rounded-full transition-all duration-300"
          [ngClass]="audioService.isPlaying() ? 'animate-bar-2' : 'h-2'"
        ></span>
        <span 
          class="w-[2px] bg-current rounded-full transition-all duration-300"
          [ngClass]="audioService.isPlaying() ? 'animate-bar-3' : 'h-[6px]'"
        ></span>
        <span 
          class="w-[2px] bg-current rounded-full transition-all duration-300"
          [ngClass]="audioService.isPlaying() ? 'animate-bar-4' : 'h-3'"
        ></span>
        <span 
          class="w-[2px] bg-current rounded-full transition-all duration-300"
          [ngClass]="audioService.isPlaying() ? 'animate-bar-5' : 'h-1'"
        ></span>
      </div>

      <!-- Label text that slides out on hover -->
      <span class="text-xs uppercase tracking-[0.2em] font-light max-w-0 opacity-0 group-hover:max-w-xs group-hover:opacity-100 transition-all duration-500 ease-in-out whitespace-nowrap">
        {{ audioService.isPlaying() ? 'Mute Sounds' : 'Forest Audio' }}
      </span>
    </button>
  `,
  styles: [`
    @keyframes bar1 {
      0%, 100% { height: 4px; }
      50% { height: 16px; }
    }
    @keyframes bar2 {
      0%, 100% { height: 8px; }
      50% { height: 12px; }
    }
    @keyframes bar3 {
      0%, 100% { height: 6px; }
      50% { height: 14px; }
    }
    @keyframes bar4 {
      0%, 100% { height: 12px; }
      50% { height: 6px; }
    }
    @keyframes bar5 {
      0%, 100% { height: 4px; }
      50% { height: 10px; }
    }

    .animate-bar-1 { animation: bar1 0.8s ease-in-out infinite; }
    .animate-bar-2 { animation: bar2 0.6s ease-in-out infinite; }
    .animate-bar-3 { animation: bar3 0.7s ease-in-out infinite; }
    .animate-bar-4 { animation: bar4 0.5s ease-in-out infinite; }
    .animate-bar-5 { animation: bar5 0.9s ease-in-out infinite; }
  `]
})
export class AudioToggleComponent {
  constructor(public audioService: AudioService) {}
}
