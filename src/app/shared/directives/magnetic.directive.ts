import { Directive, ElementRef, HostListener, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { gsap } from 'gsap';

@Directive({
  selector: '[appMagnetic]',
  standalone: true
})
export class MagneticDirective implements OnInit {
  private element: HTMLElement;
  private isBrowser = false;

  constructor(
    private el: ElementRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.element = this.el.nativeElement;
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    if (this.isBrowser) {
      // Set quick transition styles
      this.element.style.display = 'inline-block';
      this.element.style.transition = 'transform 0.1s ease-out';
    }
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (!this.isBrowser) return;

    const rect = this.element.getBoundingClientRect();
    
    // Calculate distance from mouse to center of the button
    const relX = event.clientX - (rect.left + rect.width / 2);
    const relY = event.clientY - (rect.top + rect.height / 2);

    // Apply translation with magnetic pull (e.g. 40% threshold)
    gsap.to(this.element, {
      x: relX * 0.4,
      y: relY * 0.4,
      duration: 0.3,
      ease: 'power2.out',
      overwrite: 'auto'
    });
  }

  @HostListener('mouseleave')
  onMouseLeave() {
    if (!this.isBrowser) return;

    // Release back to center with spring ease
    gsap.to(this.element, {
      x: 0,
      y: 0,
      duration: 0.8,
      ease: 'elastic.out(1, 0.3)',
      overwrite: 'auto'
    });
  }
}
