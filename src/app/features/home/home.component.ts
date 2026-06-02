import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, PLATFORM_ID, Inject, NgZone, HostListener } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { BookingService, Room } from '../../core/services/booking.service';
import { GsapService } from '../../core/services/gsap.service';
import { ThreeService } from '../../core/services/three.service';
import { AudioService } from '../../core/services/audio.service';
import { ThemeService } from '../../core/services/theme.service';
import { MagneticDirective } from '../../shared/directives/magnetic.directive';
import * as THREE from 'three';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, MagneticDirective, ReactiveFormsModule, FormsModule],
  templateUrl: './home.component.html',
  styles: [`
    .scene-overlay {
      opacity: 0;
      pointer-events: none;
      transition: transform 1.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .animate-fade-in {
      animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  rooms: Room[] = [];
  
  // Custom travel itineraries
  itineraries = [
    {
      title: 'The Misty Pine Trail',
      tag: 'Nature Walk & Mindfulness',
      distance: '1.2 km from property',
      duration: '2 Hours',
      difficulty: 'Easy Walk',
      desc: 'Wander through tall pine trees wrapped in drifting mountain mist. Perfect for slow mornings.',
      image: 'assets/images/experiences/forest.jpg',
      timeline: [
        { time: '08:00 AM', event: 'Departure from Homestay', detail: 'Warm mountain tea to kick off your morning.' },
        { time: '08:30 AM', event: 'Pine Canopy Trail', detail: 'A slow walk surrounded by towering pine trees.' },
        { time: '09:15 AM', event: 'Misty Viewpoint Meditation', detail: 'Pause at Eagle\'s Craig for quiet breathing.' },
        { time: '10:00 AM', event: 'Local Breakfast Return', detail: 'Host Prakash serves fire-roasted flatbreads.' }
      ]
    },
    {
      title: 'The Tea & Heritage Valley',
      tag: 'Local Culture & Tasting',
      distance: '3.5 km from property',
      duration: '4 Hours',
      difficulty: 'Moderate Hike',
      desc: 'Explore historical tea gardens, watch local tea leaves plucking, and sample premium tea blends.',
      image: 'assets/images/experiences/tea-gardens.jpg',
      timeline: [
        { time: '01:30 PM', event: 'Garden Drive & Walk', detail: 'Scenic descent through Margaret\'s Hope Valley.' },
        { time: '02:15 PM', event: 'Interactive Plucking', detail: 'Learn traditional leaf plucking with local experts.' },
        { time: '03:00 PM', event: 'Heritage Tea Tasting', detail: 'Private session tasting first-flush black teas.' },
        { time: '04:30 PM', event: 'Dusk Return Journey', detail: 'Catch the fading golden light across the terraced valleys.' }
      ]
    },
    {
      title: 'The Himalayan Railway Trail',
      tag: 'UNESCO Heritage Adventure',
      distance: '2.1 km from property',
      duration: '3 Hours',
      difficulty: 'Easy Walk',
      desc: 'Chase the iconic steam engine train winding along the mountain ridges of Kurseong.',
      image: 'assets/images/experiences/train.jpg',
      timeline: [
        { time: '10:30 AM', event: 'Walk to Railway Track', detail: 'Follow a scenic path leading directly to the historic tracks.' },
        { time: '11:15 AM', event: 'Toy Train Crossing', detail: 'Hear the whistle blow as the steam engine passes.' },
        { time: '12:00 PM', event: 'Kurseong Station Museum', detail: 'Discover photographs and maps from the British Era.' },
        { time: '01:15 PM', event: 'Return to Sanctuary', detail: 'Warm up by the stone fireplace.' }
      ]
    }
  ];
  selectedItineraryIndex = 0;

  // Guest Stories reviews
  guestStories = [
    {
      name: 'Aarav Mehta',
      loc: 'Mumbai, India',
      highlight: 'Therapeutic Pine Forest Balcony',
      text: 'Waking up to the mist flowing into the pine trees from the balcony of the Pine View Suite was therapeutic. Prakash prepared the most incredible fire-roasted thali, and shared stories of the hills. The cozy deck and hot teas made our stay unforgettable.',
      image: 'assets/images/rooms/pine-suite-1.jpg',
      memories: ['assets/images/rooms/pine-suite-2.jpg', 'assets/images/experiences/forest.jpg']
    },
    {
      name: 'Sarah Jenkins',
      loc: 'London, UK',
      highlight: 'Sleeping Under the Mountain Sky',
      text: 'Absolute luxury in the lap of nature. The Misty Attic room has skylights that let you fall asleep under the stars and wake up with mist rolling in. We spent hours drinking locally sourced tea and reading. Truly premium but feels like family.',
      image: 'assets/images/rooms/attic-1.jpg',
      memories: ['assets/images/rooms/attic-2.jpg', 'assets/images/experiences/tea-gardens.jpg']
    },
    {
      name: 'Rohit & Neha',
      loc: 'Delhi, India',
      highlight: 'Forest Bonfire under the Stars',
      text: 'Cozy fireplace, warm hospitality, and pure silence. The Forest Cottage is a secluded paradise. Prakash arranged a private stone fire-pit bonfire for us under the pine trees. Eating hot pakoras while the fire crackled in the cold mountain night was magical.',
      image: 'assets/images/rooms/cottage-1.jpg',
      memories: ['assets/images/experiences/train.jpg', 'assets/images/experiences/forest.jpg']
    }
  ];
  selectedStoryIndex = 0;

  // Gallery Masonry Images
  galleryImages = [
    { url: 'assets/images/rooms/pine-suite-1.jpg', cat: 'property', title: 'Pine View Suite Balcony' },
    { url: 'assets/images/rooms/attic-1.jpg', cat: 'property', title: 'Misty Attic Skylight' },
    { url: 'assets/images/rooms/cottage-1.jpg', cat: 'property', title: 'Forest Canopy Cottage Exterior' },
    { url: 'assets/images/experiences/forest.jpg', cat: 'nature', title: 'Dowhill Pine Canopy Walk' },
    { url: 'assets/images/experiences/tea-gardens.jpg', cat: 'nature', title: 'Margaret\'s Hope Valley Estates' },
    { url: 'assets/images/experiences/train.jpg', cat: 'nature', title: 'Darjeeling Himalayan Toy Train' },
    { url: 'assets/images/rooms/pine-suite-2.jpg', cat: 'gastronomy', title: 'Warm Local Thali' },
    { url: 'assets/images/rooms/attic-2.jpg', cat: 'gastronomy', title: 'Organic Mountain Teas' }
  ];
  galleryFilter = 'all';

  // Room presentation V3 states
  showComparison = false;
  showFullscreenGallery = false;
  activeFullscreenGalleryImages: string[] = [];
  activeFullscreenGalleryIndex = 0;

  // Mobile layout detection
  isMobile = false;

  selectedRoomIndex = 1; // 0: Pine View, 1: Misty Attic, 2: Forest Cottage
  activeImageIndex = 0;
  projectedHotspots: any[] = [];
  activeHotspotObj: any = null;

  // Consolidated Booking Wizard States
  bookingStep = 1;
  guestForm!: FormGroup;
  isProcessingPayment = false;
  bookingResultId: string | null = null;
  couponError = '';
  couponSuccess = '';
  enteredCoupon = '';
  minCheckInDate = '';
  minCheckOutDate = '';

  // Saved camera state for restoring after hotspot exploration
  private savedCameraPos = new THREE.Vector3();
  private savedCameraTarget = new THREE.Vector3();

  // Look-around dragging variables
  private isDragging = false;
  private previousMouse = { x: 0, y: 0 };
  private yaw = 0;
  private pitch = 0;

  private projectionFrameId: number | null = null;
  private masterScrollTimeline: gsap.core.Timeline | null = null;
  private masterScrollTrigger: any = null;

  constructor(
    public bookingService: BookingService,
    private fb: FormBuilder,
    private gsapService: GsapService,
    private threeService: ThreeService,
    private audioService: AudioService,
    private themeService: ThemeService,
    private router: Router,
    private route: ActivatedRoute,
    @Inject(PLATFORM_ID) private platformId: Object,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    this.bookingService.getRooms().subscribe(data => {
      this.rooms = data;
      if (data.length > 0) {
        if (!this.bookingService.selectedRoom()) {
          this.bookingService.selectedRoom.set(data[0]);
        }
      }
    });

    this.guestForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      specialRequests: ['']
    });

    if (isPlatformBrowser(this.platformId)) {
      this.threeService.isHomeJourneyActive = true;
      this.initializeDates();
      this.checkDevice();
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.checkDevice();
  }

  checkDevice() {
    if (isPlatformBrowser(this.platformId)) {
      const wasMobile = this.isMobile;
      this.isMobile = window.innerWidth < 768;
      if (wasMobile !== this.isMobile) {
        setTimeout(() => {
          this.reinitAnimations();
        }, 200);
      }
    }
  }

  reinitAnimations() {
    if (this.masterScrollTimeline) {
      this.masterScrollTimeline.scrollTrigger?.kill();
      this.masterScrollTimeline.kill();
      this.masterScrollTimeline = null;
    }
    if (!this.isMobile) {
      this.initScrollAnimations();
    }
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.ngZone.runOutsideAngular(() => {
        if (!this.isMobile) {
          this.initScrollAnimations();
        }
        this.initLookAroundListeners();
        this.startProjectionLoop();
      });

      // Handle fragments on load
      this.route.fragment.subscribe(frag => {
        if (frag) {
          setTimeout(() => {
            const el = document.getElementById(frag);
            if (el) {
              this.gsapService.scrollTo(el, 0);
            }
          }, 400);
        }
      });
    }
  }  private initializeDates() {
    const today = new Date();
    this.minCheckInDate = this.formatDate(today);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.minCheckOutDate = this.formatDate(tomorrow);

    if (!this.bookingService.checkIn()) {
      this.bookingService.checkIn.set(this.minCheckInDate);
    }
    if (!this.bookingService.checkOut()) {
      this.bookingService.checkOut.set(this.minCheckOutDate);
    }
  }

  private formatDate(date: Date): string {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
  }

  onCheckInChange() {
    const startStr = this.bookingService.checkIn();
    if (startStr) {
      const start = new Date(startStr);
      const minEnd = new Date(start);
      minEnd.setDate(minEnd.getDate() + 1);
      this.minCheckOutDate = this.formatDate(minEnd);

      const endStr = this.bookingService.checkOut();
      if (endStr && new Date(endStr) <= start) {
        this.bookingService.checkOut.set(this.formatDate(minEnd));
      }
    }
  }

  selectRoom(room: Room) {
    this.bookingService.selectedRoom.set(room);
    if (this.bookingService.guestsCount() > room.capacity) {
      this.bookingService.guestsCount.set(room.capacity);
    }
    const matchedIdx = this.rooms.findIndex(r => r.id === room.id);
    if (matchedIdx !== -1) {
      this.selectedRoomIndex = matchedIdx;
      this.activeImageIndex = 0;
    }
  }

  getGuestsOptions(): number[] {
    const room = this.bookingService.selectedRoom();
    if (!room) return [1, 2];
    return Array.from({ length: room.capacity }, (_, i) => i + 1);
  }

  applyCoupon() {
    const code = this.enteredCoupon.trim().toUpperCase();
    if (!code) return;

    if (code === 'HIMALAYAS' || code === 'WHITESTAY') {
      this.bookingService.promoCode.set(code);
      this.couponSuccess = 'Coupon applied successfully! Enjoy a 15% discount.';
      this.couponError = '';
    } else {
      this.couponError = 'Invalid promo code. Please try again.';
      this.couponSuccess = '';
    }
  }

  removeCoupon() {
    this.bookingService.promoCode.set('');
    this.enteredCoupon = '';
    this.couponSuccess = '';
    this.couponError = '';
  }

  nextBookingStep() {
    if (this.bookingStep === 1) {
      if (!this.bookingService.checkIn() || !this.bookingService.checkOut()) {
        alert('Please select both Check-In and Check-Out dates.');
        return;
      }
      if (!this.bookingService.selectedRoom()) {
        alert('Please select a room sanctuary.');
        return;
      }
      this.bookingStep = 2;
    } else if (this.bookingStep === 2) {
      if (this.guestForm.invalid) {
        Object.keys(this.guestForm.controls).forEach(field => {
          const control = this.guestForm.get(field);
          control?.markAsTouched({ onlySelf: true });
        });
        return;
      }
      this.bookingService.specialRequests.set(this.guestForm.value.specialRequests);
      this.bookingStep = 3;
    }
    this.scrollToScene(0.96);
  }

  prevBookingStep() {
    if (this.bookingStep > 1) {
      this.bookingStep--;
    }
    this.scrollToScene(0.96);
  }

  triggerCheckout() {
    this.isProcessingPayment = true;
    
    const details = {
      roomId: this.bookingService.selectedRoom()!.id,
      guestName: this.guestForm.value.name,
      guestEmail: this.guestForm.value.email,
      guestPhone: this.guestForm.value.phone,
      checkIn: this.bookingService.checkIn(),
      checkOut: this.bookingService.checkOut(),
      numGuests: this.bookingService.guestsCount(),
      specialRequests: this.bookingService.specialRequests(),
      promoCode: this.bookingService.promoCode()
    };

    this.bookingService.createBooking(details).subscribe({
      next: (res) => {
        setTimeout(() => {
          this.bookingResultId = res.booking?.id || 'WS-982741';
          this.isProcessingPayment = false;
          this.bookingStep = 5;
          this.scrollToScene(0.96);
        }, 2500);
      },
      error: (err) => {
        console.warn('Backend server not running, proceeding with frontend simulation...');
        setTimeout(() => {
          this.bookingResultId = 'WS-SIM-' + Math.floor(100000 + Math.random() * 900000);
          this.isProcessingPayment = false;
          this.bookingStep = 5;
          this.scrollToScene(0.96);
        }, 2500);
      }
    });
  }

  getWhatsAppLink(): string {
    const id = this.bookingResultId || 'WS-MOCK';
    const room = this.bookingService.selectedRoom()?.name || 'Luxury Room';
    const checkIn = this.bookingService.checkIn();
    const checkOut = this.bookingService.checkOut();
    const guests = this.bookingService.guestsCount();
    
    const text = `Hello White Sea Homestay, I would like to enquire about room availability and confirm my booking reference: ${id}. Details: ${room} for ${guests} guest(s) from ${checkIn} to ${checkOut}.`;
    return `https://api.whatsapp.com/send?phone=919876543210&text=${encodeURIComponent(text)}`;
  }

  resetBookingWizard() {
    this.bookingStep = 1;
    this.enteredCoupon = '';
    this.couponSuccess = '';
    this.couponError = '';
    this.bookingResultId = null;
    this.isProcessingPayment = false;
    this.guestForm.reset({
      name: '',
      email: '',
      phone: '',
      specialRequests: ''
    });
    this.bookingService.resetWizard();
    this.initializeDates();
    if (this.rooms.length > 0) {
      this.bookingService.selectedRoom.set(this.rooms[0]);
    }
    this.scrollToScene(0.96);
  }

  navigateToBooking() {
    const selectedRoom = this.rooms[this.selectedRoomIndex];
    if (selectedRoom) {
      this.bookingService.selectedRoom.set(selectedRoom);
    }
    this.bookingStep = 1;
    this.scrollToScene(0.96);
  }

  // Room presentation action functions
  toggleComparison(show: boolean) {
    this.showComparison = show;
  }

  openFullscreenGallery(room: Room) {
    this.activeFullscreenGalleryImages = room.images;
    this.activeFullscreenGalleryIndex = 0;
    this.showFullscreenGallery = true;
  }

  closeFullscreenGallery() {
    this.showFullscreenGallery = false;
  }

  prevFullscreenImage() {
    this.activeFullscreenGalleryIndex = (this.activeFullscreenGalleryIndex - 1 + this.activeFullscreenGalleryImages.length) % this.activeFullscreenGalleryImages.length;
  }

  nextFullscreenImage() {
    this.activeFullscreenGalleryIndex = (this.activeFullscreenGalleryIndex + 1) % this.activeFullscreenGalleryImages.length;
  }

  // Gallery filters functions
  setGalleryFilter(filter: string) {
    this.galleryFilter = filter;
  }

  getFilteredImages() {
    return this.galleryFilter === 'all' 
      ? this.galleryImages 
      : this.galleryImages.filter(img => img.cat === this.galleryFilter);
  }

  private initScrollAnimations() {
    const gsap = this.gsapService.gsapInstance;
    const ScrollTrigger = this.gsapService.scrollTriggerInstance;

    // Reset camera base positions
    this.threeService.cameraBasePosition.set(0, 65, 110);
    this.threeService.cameraBaseTarget.set(0, 25, 0);

    this.masterScrollTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: '.scroll-track',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.0,
        onUpdate: (self) => {
          // Sync WebGL colors and fog
          this.threeService.updateEnvironment(self.progress);
          
          // Sync day/night theme body classes
          // Gallery (0.84-0.90), Location (0.90-0.94), Booking (0.94-0.98) are night scenes
          if (self.progress >= 0.84 && self.progress <= 0.98) {
            this.themeService.setTheme('night');
            this.audioService.updateSoundscape('night');
          } else {
            this.themeService.setTheme('day');
            this.audioService.updateSoundscape('day');
          }
        }
      }
    });
    this.masterScrollTrigger = this.masterScrollTimeline.scrollTrigger;

    // Scrub timeline duration scale = 10
    this.masterScrollTimeline.duration(10);

    // 1. Camera track interpolation mapping new content hierarchy
    this.masterScrollTimeline
      // Scene 1 -> 2 (0.0 to 1.5)
      .to(this.threeService.cameraBasePosition, { x: -35, y: 45, z: 80, ease: 'sine.inOut' }, 0)
      .to(this.threeService.cameraBaseTarget, { x: 0, y: 20, z: -10, ease: 'sine.inOut' }, 0)
      
      // Scene 2 -> 3 (1.5 to 3.5)
      .to(this.threeService.cameraBasePosition, { x: 25, y: 18, z: 35, ease: 'sine.inOut' }, 1.5)
      .to(this.threeService.cameraBaseTarget, { x: 0, y: 6, z: 0, ease: 'sine.inOut' }, 1.5)

      // Scene 3 -> 4 (Rooms window zoom) (3.5 to 4.5)
      .to(this.threeService.cameraBasePosition, { x: 0, y: 8.5, z: 12, ease: 'power2.in' }, 3.5)
      .to(this.threeService.cameraBaseTarget, { x: 0, y: 8.5, z: 0, ease: 'power2.in' }, 3.5)
      .to(this.threeService.cameraBasePosition, { x: 0, y: 8.5, z: 5, ease: 'power2.out' }, 4.1)
      .to(this.threeService.cameraBaseTarget, { x: 0, y: 8.5, z: -5, ease: 'power2.out' }, 4.1)

      // Scene 4 -> 5 (Reviews forest overview) (4.5 to 5.8)
      .to(this.threeService.cameraBasePosition, { x: 35, y: 22, z: 60, ease: 'sine.inOut' }, 4.8)
      .to(this.threeService.cameraBaseTarget, { x: 0, y: 12, z: 0, ease: 'sine.inOut' }, 4.8)

      // Scene 5 -> 6 (Experiences side trail) (5.8 to 6.8)
      .to(this.threeService.cameraBasePosition, { x: -20, y: 15, z: 40, ease: 'sine.inOut' }, 5.8)
      .to(this.threeService.cameraBaseTarget, { x: 0, y: 10, z: 0, ease: 'sine.inOut' }, 5.8)

      // Scene 6 -> 7 (Host Story facade close-up) (6.8 to 7.8)
      .to(this.threeService.cameraBasePosition, { x: 8, y: 7.5, z: 18, ease: 'sine.inOut' }, 6.8)
      .to(this.threeService.cameraBaseTarget, { x: 0, y: 6.5, z: 0, ease: 'sine.inOut' }, 6.8)

      // Scene 7 -> 8 (Gallery high angle valley view) (7.8 to 8.4)
      .to(this.threeService.cameraBasePosition, { x: -15, y: 30, z: 75, ease: 'sine.inOut' }, 7.8)
      .to(this.threeService.cameraBaseTarget, { x: 0, y: 15, z: 0, ease: 'sine.inOut' }, 7.8)

      // Scene 8 -> 9 (Location deck approach) (8.4 to 9.0)
      .to(this.threeService.cameraBasePosition, { x: 12, y: 8, z: 20, ease: 'sine.inOut' }, 8.4)
      .to(this.threeService.cameraBaseTarget, { x: 0, y: 6.5, z: 0, ease: 'sine.inOut' }, 8.4)

      // Scene 9 -> 10 (Booking view) (9.0 to 9.6)
      .to(this.threeService.cameraBasePosition, { x: 6, y: 6.8, z: 14, ease: 'sine.inOut' }, 9.0)
      .to(this.threeService.cameraBaseTarget, { x: 0, y: 6.5, z: 0, ease: 'sine.inOut' }, 9.0)

      // Scene 10 -> 11 (Final rise to sunrise) (9.6 to 10.0)
      .to(this.threeService.cameraBasePosition, { x: 0, y: 60, z: 120, ease: 'sine.inOut' }, 9.6)
      .to(this.threeService.cameraBaseTarget, { x: 0, y: 12, z: 0, ease: 'sine.inOut' }, 9.6);

    // 2. HTML Layers Transitions (optimized to prevent overlaps)
    this.masterScrollTimeline
      .set('#scene1', { opacity: 1, pointerEvents: 'auto' }, 0)
      .set(['#scene2', '#scene3', '#scene4', '#scene5', '#scene6', '#scene7', '#scene8', '#scene9', '#scene10', '#scene11'], { opacity: 0, pointerEvents: 'none' }, 0)

      .fromTo('#scene1', { opacity: 1 }, { opacity: 0, duration: 0.2 }, 0.8)
      .set('#scene1', { pointerEvents: 'none' }, 1.0)
      
      .fromTo('#scene2', { opacity: 0 }, { opacity: 1, duration: 0.4 }, 1.0)
      .set('#scene2', { pointerEvents: 'auto' }, 1.4)
      .fromTo('#scene2', { opacity: 1 }, { opacity: 0, duration: 0.4 }, 3.1)
      .set('#scene2', { pointerEvents: 'none' }, 3.5)

      .fromTo('#scene3', { opacity: 0 }, { opacity: 1, duration: 0.3 }, 3.5)
      .set('#scene3', { pointerEvents: 'auto' }, 3.8)
      .fromTo('#scene3', { opacity: 1 }, { opacity: 0, duration: 0.3 }, 4.2)
      .set('#scene3', { pointerEvents: 'none' }, 4.5)

      // Rooms Explore (Scene 4)
      .fromTo('#scene4', { opacity: 0 }, { opacity: 1, duration: 0.3 }, 4.5)
      .set('#scene4', { pointerEvents: 'auto' }, 4.8)
      .call(() => this.toggleCabinVisibility(true), [], 4.5)
      .call(() => this.toggleCabinVisibility(false), [], 4.49)
      .fromTo('#scene4', { opacity: 1 }, { opacity: 0, duration: 0.3 }, 5.5)
      .set('#scene4', { pointerEvents: 'none' }, 5.8)
      .call(() => this.toggleCabinVisibility(false), [], 5.8)

      // Reviews (Scene 5)
      .fromTo('#scene5', { opacity: 0 }, { opacity: 1, duration: 0.3 }, 5.8)
      .set('#scene5', { pointerEvents: 'auto' }, 6.1)
      .fromTo('#scene5', { opacity: 1 }, { opacity: 0, duration: 0.3 }, 6.5)
      .set('#scene5', { pointerEvents: 'none' }, 6.8)

      // Experiences (Scene 6)
      .fromTo('#scene6', { opacity: 0 }, { opacity: 1, duration: 0.2 }, 6.8)
      .set('#scene6', { pointerEvents: 'auto' }, 7.0)
      .fromTo('#scene6', { opacity: 1 }, { opacity: 0, duration: 0.3 }, 7.5)
      .set('#scene6', { pointerEvents: 'none' }, 7.8)

      // Host Story (Scene 7)
      .fromTo('#scene7', { opacity: 0 }, { opacity: 1, duration: 0.2 }, 7.8)
      .set('#scene7', { pointerEvents: 'auto' }, 8.0)
      .fromTo('#scene7', { opacity: 1 }, { opacity: 0, duration: 0.2 }, 8.2)
      .set('#scene7', { pointerEvents: 'none' }, 8.4)

      // Gallery Masonry (Scene 8)
      .fromTo('#scene8', { opacity: 0 }, { opacity: 1, duration: 0.2 }, 8.4)
      .set('#scene8', { pointerEvents: 'auto' }, 8.6)
      .fromTo('#scene8', { opacity: 1 }, { opacity: 0, duration: 0.2 }, 8.8)
      .set('#scene8', { pointerEvents: 'none' }, 9.0)

      // Location Map (Scene 9)
      .fromTo('#scene9', { opacity: 0 }, { opacity: 1, duration: 0.2 }, 9.0)
      .set('#scene9', { pointerEvents: 'auto' }, 9.2)
      .fromTo('#scene9', { opacity: 1 }, { opacity: 0, duration: 0.1 }, 9.3) // Fades out completely by 9.4
      .set('#scene9', { pointerEvents: 'none' }, 9.4)

      // Booking (Scene 10)
      .fromTo('#scene10', { opacity: 0 }, { opacity: 1, duration: 0.1 }, 9.4) // Fades in completely by 9.5
      .set('#scene10', { pointerEvents: 'auto' }, 9.5)
      .fromTo('#scene10', { opacity: 1 }, { opacity: 0, duration: 0.1 }, 9.7)
      .set('#scene10', { pointerEvents: 'none' }, 9.8)

      // Final Sunrise (Scene 11)
      .fromTo('#scene11', { opacity: 0 }, { opacity: 1, duration: 0.1 }, 9.8)
      .set('#scene11', { pointerEvents: 'auto' }, 9.9);
  }

  private toggleCabinVisibility(showInterior: boolean) {
    if (this.threeService.cabinExterior && this.threeService.cabinInterior) {
      this.threeService.cabinExterior.visible = !showInterior;
      this.threeService.cabinInterior.visible = showInterior;
    }
  }

  private initLookAroundListeners() {
    const handleDown = (clientX: number, clientY: number) => {
      if (this.isMobile) return;
      const progress = this.masterScrollTrigger?.progress || 0;
      // Allow drag rotation look-around only in Scene 4 Rooms (progress 0.45 - 0.58) & no active hotspot
      if (progress < 0.45 || progress > 0.58 || this.activeHotspotObj) return;

      this.isDragging = true;
      this.previousMouse.x = clientX;
      this.previousMouse.y = clientY;
    };

    const handleMove = (clientX: number, clientY: number) => {
      if (!this.isDragging || this.isMobile) return;

      const deltaX = clientX - this.previousMouse.x;
      const deltaY = clientY - this.previousMouse.y;

      this.previousMouse.x = clientX;
      this.previousMouse.y = clientY;

      // Update looking angles
      this.yaw += deltaX * 0.003;
      this.pitch = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, this.pitch + deltaY * 0.003));

      // Calculate look direction offset
      const targetOffset = new THREE.Vector3(
        Math.sin(this.yaw) * Math.cos(this.pitch),
        Math.sin(this.pitch),
        -Math.cos(this.yaw) * Math.cos(this.pitch)
      );

      this.threeService.cameraBaseTarget.copy(this.threeService.cameraBasePosition).addScaledVector(targetOffset, 10);
    };

    const handleUp = () => {
      this.isDragging = false;
    };

    // Bind event listeners outside Angular change detection zone
    window.addEventListener('mousedown', (e) => handleDown(e.clientX, e.clientY));
    window.addEventListener('mousemove', (e) => handleMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', handleUp);
    
    window.addEventListener('touchstart', (e) => handleDown(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    window.addEventListener('touchmove', (e) => handleMove(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    window.addEventListener('touchend', handleUp);
  }

  private startProjectionLoop() {
    const tick = () => {
      this.projectHotspots();
      this.projectionFrameId = requestAnimationFrame(tick);
    };
    tick();
  }

  get roomHotspots() {
    if (this.selectedRoomIndex === 0) {
      // Pine View Suite
      return [
        { id: 'deck', name: 'Private Balcony Deck', desc: 'Step out onto the warm pine timber deck to watch rolling clouds and valleys.', pos: new THREE.Vector3(4.0, 0.8, 9.5) },
        { id: 'view', name: 'Himalayan Ridge View', desc: 'Direct, unobstructed sunrise view of the snow-capped Kanchenjunga peaks.', pos: new THREE.Vector3(0.0, 5.0, 15.0) }
      ];
    } else if (this.selectedRoomIndex === 1) {
      // Misty Attic Room
      return [
        { id: 'bed', name: 'Plush Queen Bed', desc: 'Cozy queen-size bed placed right beneath the A-frame skylights.', pos: new THREE.Vector3(3.2, 1.25, 1.2) },
        { id: 'fireplace', name: 'Stone Fireplace', desc: 'Cozy fireplace built from river bed stone logs.', pos: new THREE.Vector3(-4.2, 1.25, -1.0) },
        { id: 'window', name: 'Skylight Ceiling', desc: 'Large glass skylights to fall asleep under stars and wake up with mist.', pos: new THREE.Vector3(0, 6.1, 5.0) }
      ];
    } else {
      // Forest Canopy Cottage
      return [
        { id: 'garden', name: 'Private Forest Garden', desc: 'Secluded cottage gardens filled with wild mountain orchids and hydrangeas.', pos: new THREE.Vector3(-10.0, 0.5, 14.0) },
        { id: 'firepit', name: 'Outdoor Fire Pit', desc: 'Stone fire pit designed for warm family bonfires under the pines.', pos: new THREE.Vector3(-5.0, 0.25, 9.8) }
      ];
    }
  }

  selectRoomExplore(index: number) {
    this.selectedRoomIndex = index;
    this.activeImageIndex = 0;
    this.activeHotspotObj = null;

    // Lock scrolling for focused exploration
    this.gsapService.getLenis()?.stop();

    let targetPos = new THREE.Vector3();
    let targetLook = new THREE.Vector3();

    if (index === 0) {
      // Pine View Suite balcony
      targetPos.set(8.0, 4.0, 16.0);
      targetLook.set(0, 3.0, 8.0);
      this.toggleCabinVisibility(false);
    } else if (index === 1) {
      // Misty Attic Room interior
      targetPos.set(0.0, 8.5, 5.0);
      targetLook.set(0.0, 8.5, -5.0);
      this.toggleCabinVisibility(true);
    } else {
      // Forest Canopy Cottage garden
      targetPos.set(-11.0, 4.5, 18.0);
      targetLook.set(-5.0, 0.5, 9.8);
      this.toggleCabinVisibility(false);
    }

    // Save camera base state so we know where to restore
    this.savedCameraPos.copy(targetPos);
    this.savedCameraTarget.copy(targetLook);

    const gsap = this.gsapService.gsapInstance;
    gsap.to(this.threeService.cameraBasePosition, {
      x: targetPos.x,
      y: targetPos.y,
      z: targetPos.z,
      duration: 1.2,
      ease: 'power2.out'
    });
    
    gsap.to(this.threeService.cameraBaseTarget, {
      x: targetLook.x,
      y: targetLook.y,
      z: targetLook.z,
      duration: 1.2,
      ease: 'power2.out'
    });
  }

  resumeJourney() {
    this.activeHotspotObj = null;
    this.gsapService.getLenis()?.start();
    
    // Refresh ScrollTrigger to update camera position from current scroll
    const scrollTrigger = this.masterScrollTrigger;
    if (scrollTrigger) {
      scrollTrigger.update();
    }
  }

  private projectHotspots() {
    const three = this.threeService;
    if (!three || !three['camera']) {
      this.projectedHotspots = [];
      return;
    }

    // Project coordinates only when in room exploration phase (Scene 4 overlay is active, progress 0.45 - 0.58)
    const progress = this.masterScrollTrigger?.progress || 0;
    if (this.isMobile || progress < 0.44 || progress > 0.59) {
      this.projectedHotspots = [];
      return;
    }

    const camera = three['camera'];
    const tempV = new THREE.Vector3();

    this.projectedHotspots = this.roomHotspots.map(h => {
      tempV.copy(h.pos).project(camera);
      return {
        id: h.id,
        name: h.name,
        desc: h.desc,
        x: (tempV.x * 0.5 + 0.5) * 100,
        y: (tempV.y * -0.5 + 0.5) * 100
      };
    });
  }

  selectHotspot(h: any) {
    this.activeHotspotObj = h;
    
    // Save current base values
    this.savedCameraPos.copy(this.threeService.cameraBasePosition);
    this.savedCameraTarget.copy(this.threeService.cameraBaseTarget);

    let targetPos = new THREE.Vector3();
    let targetLook = new THREE.Vector3();

    if (h.id === 'deck') {
      targetPos.set(6.0, 3.0, 13.0);
      targetLook.set(4.0, 0.8, 9.8);
    } else if (h.id === 'view') {
      targetPos.set(0.0, 4.5, 12.0);
      targetLook.set(0.0, 5.0, 28.0);
    } else if (h.id === 'bed') {
      targetPos.set(0.5, 7.8, 4.0);
      targetLook.set(3.2, 1.5, 1.2);
    } else if (h.id === 'fireplace') {
      targetPos.set(-1.5, 7.2, 1.0);
      targetLook.set(-4.2, 1.6, -1.0);
    } else if (h.id === 'window') {
      targetPos.set(0.0, 7.8, -1.0);
      targetLook.set(0.0, 7.8, 8.0);
    } else if (h.id === 'garden') {
      targetPos.set(-9.0, 3.0, 16.0);
      targetLook.set(-10.0, 0.5, 14.0);
    } else if (h.id === 'firepit') {
      targetPos.set(-6.5, 2.5, 13.0);
      targetLook.set(-5.0, 0.25, 9.8);
    }

    const gsap = this.gsapService.gsapInstance;
    gsap.to(this.threeService.cameraBasePosition, {
      x: targetPos.x,
      y: targetPos.y,
      z: targetPos.z,
      duration: 1.5,
      ease: 'power3.out'
    });
    
    gsap.to(this.threeService.cameraBaseTarget, {
      x: targetLook.x,
      y: targetLook.y,
      z: targetLook.z,
      duration: 1.5,
      ease: 'power3.out'
    });
  }

  deselectHotspot() {
    if (!this.activeHotspotObj) return;
    this.activeHotspotObj = null;

    const gsap = this.gsapService.gsapInstance;
    gsap.to(this.threeService.cameraBasePosition, {
      x: this.savedCameraPos.x,
      y: this.savedCameraPos.y,
      z: this.savedCameraPos.z,
      duration: 1.2,
      ease: 'power2.out'
    });
    
    gsap.to(this.threeService.cameraBaseTarget, {
      x: this.savedCameraTarget.x,
      y: this.savedCameraTarget.y,
      z: this.savedCameraTarget.z,
      duration: 1.2,
      ease: 'power2.out'
    });
  }

  prevRoomImage(event: Event) {
    event.stopPropagation();
    const images = this.rooms[this.selectedRoomIndex].images;
    this.activeImageIndex = (this.activeImageIndex - 1 + images.length) % images.length;
  }

  nextRoomImage(event: Event) {
    event.stopPropagation();
    const images = this.rooms[this.selectedRoomIndex].images;
    this.activeImageIndex = (this.activeImageIndex + 1) % images.length;
  }

  scrollToScene(progress: number) {
    this.gsapService.refresh();
    const track = document.querySelector('.scroll-track');
    if (!track) return;
    const scrollHeight = track.clientHeight - window.innerHeight;
    const targetScroll = progress * scrollHeight;
    this.gsapService.scrollTo(targetScroll);
  }

  ngOnDestroy() {
    if (isPlatformBrowser(this.platformId)) {
      this.threeService.isHomeJourneyActive = false;
      
      // Stop hotspot coordinate projection loops
      if (this.projectionFrameId) {
        cancelAnimationFrame(this.projectionFrameId);
      }

      // Destroy ScrollTrigger instance
      if (this.masterScrollTimeline) {
        this.masterScrollTimeline.scrollTrigger?.kill();
        this.masterScrollTimeline.kill();
      }

      // Ensure scrolling is left active
      this.gsapService.getLenis()?.start();
    }
  }
}
