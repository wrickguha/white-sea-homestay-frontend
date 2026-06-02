import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { ThreeService } from './core/services/three.service';
import { GsapService } from './core/services/gsap.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit, OnDestroy {
  @ViewChild('threeCanvas') threeCanvas!: ElementRef<HTMLCanvasElement>;
  isBrowser = false;
  isLoaded = false;

  constructor(
    private threeService: ThreeService,
    private gsapService: GsapService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngAfterViewInit() {
    if (this.isBrowser) {
      // Initialize Three.js canvas background
      this.threeService.init(this.threeCanvas);
    }
  }

  onLoaded() {
    this.isLoaded = true;
  }

  scrollTo(sectionId: string) {
    if (this.isBrowser) {
      // Locate the section ID and scroll smoothly
      const element = document.getElementById(sectionId);
      if (element) {
        this.gsapService.scrollTo(element, -40);
      } else {
        // Redirection with fragment if we are on another page (e.g. /book or /concierge)
        this.router.navigate(['/'], { fragment: sectionId });
      }
    }
  }

  ngOnDestroy() {
    if (this.isBrowser) {
      this.threeService.destroy();
    }
  }
}
