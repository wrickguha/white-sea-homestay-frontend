import { Injectable, PLATFORM_ID, Inject, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

@Injectable({
  providedIn: 'root'
})
export class GsapService {
  private lenis: Lenis | null = null;
  public gsapInstance = gsap;
  public scrollTriggerInstance = ScrollTrigger;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private ngZone: NgZone,
    private router: Router
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.ngZone.runOutsideAngular(() => {
        this.gsapInstance.registerPlugin(this.scrollTriggerInstance);
        this.initLenis();
        this.setupRouteListener();
      });
    }
  }

  /**
   * Listens to Angular routing events, scrolls to top, resizes Lenis, and refreshes ScrollTrigger.
   */
  private setupRouteListener() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      // Instantly reset scroll to top on route change
      this.lenis?.scrollTo(0, { immediate: true });
      
      // Wait a tick for rendering to complete, then resize and refresh
      setTimeout(() => {
        if (this.lenis) {
          this.lenis.resize();
        }
        this.scrollTriggerInstance.refresh();
      }, 100);
    });
  }

  /**
   * Initializes the Lenis smooth scroll engine and binds it to GSAP's ScrollTrigger ticker.
   */
  private initLenis() {
    this.lenis = new Lenis({
      autoRaf: false, // Disable Lenis built-in RAF, we'll use GSAP's ticker
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // smooth exponential out
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.5,
      infinite: false,
    });

    // Add Lenis classes to html element for proper styling
    const htmlElement = document.documentElement;
    htmlElement.classList.add('lenis', 'lenis-smooth');

    // Connect Lenis to GSAP's ticker for synchronized updates
    this.gsapInstance.ticker.add((time) => {
      if (this.lenis) {
        this.lenis.raf(time * 1000); // Lenis expects time in milliseconds
      }
    });

    // Disable lag smoothing to prevent ScrollTrigger/Lenis sync issues
    this.gsapInstance.ticker.lagSmoothing(0);

    // Update ScrollTrigger on scroll
    this.lenis.on('scroll', () => {
      this.scrollTriggerInstance.update();
    });

    // Refresh ScrollTrigger when window resizes
    window.addEventListener('resize', () => {
      this.scrollTriggerInstance.refresh();
    });
  }

  /**
   * Returns the Lenis instance.
   */
  getLenis(): Lenis | null {
    return this.lenis;
  }

  /**
   * Smoothly scrolls to a specific DOM element, selector, or numeric position.
   */
  scrollTo(target: number | string | HTMLElement, offset: number = 0) {
    if (!isPlatformBrowser(this.platformId)) return;
    this.lenis?.scrollTo(target, {
      offset: offset,
      duration: 1.5,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
    });
  }

  /**
   * Refreshes ScrollTrigger positions and resizes Lenis (call after dynamic DOM updates).
   */
  refresh() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.lenis?.resize();
    this.scrollTriggerInstance.refresh();
  }

  /**
   * Utility for premium text character split-reveal animation.
   */
  animateTextReveal(element: HTMLElement) {
    if (!isPlatformBrowser(this.platformId)) return;
    
    this.ngZone.runOutsideAngular(() => {
      // Create editorial slide-up effect
      this.gsapInstance.fromTo(element.querySelectorAll('.char'), 
        { 
          y: '100%', 
          opacity: 0 
        },
        {
          y: '0%',
          opacity: 1,
          duration: 1.0,
          stagger: 0.02,
          ease: 'power4.out',
          scrollTrigger: {
            trigger: element,
            start: 'top 85%',
            toggleActions: 'play none none none'
          }
        }
      );
    });
  }

  /**
   * Helper to set up a scroll parallax effect on an element.
   */
  setParallax(element: HTMLElement, speed: number = -100) {
    if (!isPlatformBrowser(this.platformId)) return;

    this.ngZone.runOutsideAngular(() => {
      this.gsapInstance.fromTo(element,
        { y: 0 },
        {
          y: speed,
          ease: 'none',
          scrollTrigger: {
            trigger: element,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true
          }
        }
      );
    });
  }

  /**
   * Cleanup method to destroy Lenis and remove event listeners.
   */
  destroy() {
    if (this.lenis) {
      this.lenis.destroy();
      this.lenis = null;
    }
  }
}
