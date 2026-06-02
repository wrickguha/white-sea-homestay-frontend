import { Component, OnInit, ElementRef, ViewChild, Output, EventEmitter, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { gsap } from 'gsap';

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="isVisible" #loaderContainer class="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-forest-950 text-cream-100 font-sans select-none">
      <!-- Mist particles background -->
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,#0a120f_90%)] opacity-80"></div>
      
      <!-- Content Wrapper -->
      <div class="relative z-10 text-center px-6">
        <!-- Logo Icon (Abstract minimal mountain crest) -->
        <div #logoIcon class="mb-6 opacity-0 flex justify-center">
          <svg class="w-16 h-16 text-gold-400" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 15L20 75H80L50 15Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            <path d="M50 45L35 75H65L50 45Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            <path d="M30 65C40 60 60 60 70 65" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
        
        <!-- Brand Title -->
        <h1 #title class="text-4xl md:text-6xl font-serif text-cream-100 tracking-widest uppercase mb-4 opacity-0">
          White Sea
        </h1>
        
        <!-- Divider Line -->
        <div #divider class="w-0 h-[1px] bg-gold-400/50 mx-auto mb-4"></div>
        
        <!-- Subtitle -->
        <p #subtitle class="text-xs md:text-sm tracking-[0.25em] uppercase text-gold-300 font-sans font-light opacity-0">
          Dow Hill, Kurseong
        </p>
      </div>

      <!-- Footer progress percentage -->
      <div #progressWrapper class="absolute bottom-12 left-1/2 -translate-x-1/2 text-center opacity-0">
        <span class="text-xs font-light tracking-[0.3em] text-cream-200/50">PREPARING ESCAPE</span>
        <div class="text-2xl font-serif text-gold-400 mt-1 font-light">{{ progress }}%</div>
      </div>
    </div>
  `
})
export class LoaderComponent implements OnInit {
  @Output() loaded = new EventEmitter<void>();
  isVisible = true;
  progress = 0;

  @ViewChild('loaderContainer', { static: false }) loaderContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('logoIcon', { static: false }) logoIcon!: ElementRef<HTMLDivElement>;
  @ViewChild('title', { static: false }) title!: ElementRef<HTMLHeadingElement>;
  @ViewChild('divider', { static: false }) divider!: ElementRef<HTMLDivElement>;
  @ViewChild('subtitle', { static: false }) subtitle!: ElementRef<HTMLParagraphElement>;
  @ViewChild('progressWrapper', { static: false }) progressWrapper!: ElementRef<HTMLDivElement>;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.runFakeLoader();
    }
  }

  private runFakeLoader() {
    // Smooth progress calculation
    const interval = setInterval(() => {
      if (this.progress < 100) {
        this.progress += Math.floor(Math.random() * 8) + 4;
        if (this.progress > 100) this.progress = 100;
      } else {
        clearInterval(interval);
        this.playExitSequence();
      }
    }, 120);

    // Initial load sequence
    setTimeout(() => {
      this.playIntroSequence();
    }, 100);
  }

  private playIntroSequence() {
    const tl = gsap.timeline();
    tl.to(this.logoIcon.nativeElement, { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out' })
      .to(this.title.nativeElement, { opacity: 1, duration: 1.0, ease: 'power2.out' }, '-=0.8')
      .to(this.divider.nativeElement, { width: 80, duration: 0.8, ease: 'power2.inOut' }, '-=0.6')
      .to(this.subtitle.nativeElement, { opacity: 1, duration: 0.8, ease: 'power2.out' }, '-=0.4')
      .to(this.progressWrapper.nativeElement, { opacity: 1, duration: 0.5 }, '-=0.2');
  }

  private playExitSequence() {
    const tl = gsap.timeline({
      onComplete: () => {
        this.isVisible = false;
        this.loaded.emit();
      }
    });

    tl.to([this.logoIcon.nativeElement, this.title.nativeElement, this.divider.nativeElement, this.subtitle.nativeElement, this.progressWrapper.nativeElement], {
      opacity: 0,
      y: -20,
      stagger: 0.1,
      duration: 0.8,
      ease: 'power3.in'
    })
    .to(this.loaderContainer.nativeElement, {
      yPercent: -100,
      duration: 1.0,
      ease: 'power4.inOut'
    });
  }
}
