import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, PLATFORM_ID, Inject, NgZone } from '@angular/core';
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
  
  // Custom travel trail spots
  attractions = [
    { name: 'Dowhill Pine Forest', desc: 'Mysterious, misty hiking trails surrounded by towering cryptomeria trees.', time: '5 mins away' },
    { name: 'Margaret\'s Hope Tea Garden', desc: 'Lush green valley estates producing fine Darjeeling tea.', time: '15 mins away' },
    { name: 'Darjeeling Himalayan Toy Train', desc: 'A UNESCO World Heritage steam engine winding through Kurseong.', time: '10 mins away' },
    { name: 'Eagle\'s Craig Viewpoint', desc: 'Spectacular panoramic sunset views over mountains and plains.', time: '12 mins away' }
  ];

  testimonials = [
    { name: 'Aarav Mehta', loc: 'Mumbai', text: 'Staying at White Sea was a dream. Waking up to the mist flowing into the pine trees from the balcony was therapeutic. The hospitality felt like family.', image: 'assets/images/rooms/pine-suite-1.jpg' },
    { name: 'Sarah Jenkins', loc: 'United Kingdom', text: 'Absolute luxury in the lap of nature. The room design was gorgeous, the home-cooked local thali was delicious, and the host’s secret guide was excellent.', image: 'assets/images/rooms/attic-1.jpg' },
    { name: 'Rohit & Neha', loc: 'Delhi', text: 'Cozy fireplace, warm hospitality, and pure silence. The Misty Attic room is perfect for couples. We will definitely come back!', image: 'assets/images/rooms/cottage-1.jpg' }
  ];

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
    }
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.ngZone.runOutsideAngular(() => {
        this.initScrollAnimations();
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
    this.scrollToScene(0.92);
  }

  prevBookingStep() {
    if (this.bookingStep > 1) {
      this.bookingStep--;
    }
    this.scrollToScene(0.92);
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
          this.scrollToScene(0.92);
        }, 2500);
      },
      error: (err) => {
        console.warn('Backend server not running, proceeding with frontend simulation...');
        setTimeout(() => {
          this.bookingResultId = 'WS-SIM-' + Math.floor(100000 + Math.random() * 900000);
          this.isProcessingPayment = false;
          this.bookingStep = 5;
          this.scrollToScene(0.92);
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
    this.scrollToScene(0.92);
  }

  navigateToBooking() {
    const selectedRoom = this.rooms[this.selectedRoomIndex];
    if (selectedRoom) {
      this.bookingService.selectedRoom.set(selectedRoom);
    }
    this.bookingStep = 1;
    this.scrollToScene(0.92);
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
          if (self.progress >= 0.80 && self.progress <= 0.96) {
            this.themeService.setTheme('night');
          } else {
            this.themeService.setTheme('day');
          }

          // Sync Web Audio ambient sounds
          if (self.progress >= 0.80 && self.progress <= 0.96) {
            this.audioService.updateSoundscape('night');
          } else {
            this.audioService.updateSoundscape('day');
          }
        }
      }
    });
    this.masterScrollTrigger = this.masterScrollTimeline.scrollTrigger;

    // Scrub timeline duration scale = 10
    this.masterScrollTimeline.duration(10);

    // 1. Camera track interpolation
    this.masterScrollTimeline
      // Scene 1 -> 2
      .to(this.threeService.cameraBasePosition, { x: -35, y: 45, z: 80, ease: 'sine.inOut' }, 0)
      .to(this.threeService.cameraBaseTarget, { x: 0, y: 20, z: -10, ease: 'sine.inOut' }, 0)
      
      // Scene 2 -> 3
      .to(this.threeService.cameraBasePosition, { x: 25, y: 18, z: 35, ease: 'sine.inOut' }, 1.5)
      .to(this.threeService.cameraBaseTarget, { x: 0, y: 6, z: 0, ease: 'sine.inOut' }, 1.5)

      // Scene 3 -> 4
      .to(this.threeService.cameraBasePosition, { x: 8, y: 7.5, z: 18, ease: 'sine.inOut' }, 3.5)
      .to(this.threeService.cameraBaseTarget, { x: 0, y: 6.5, z: 0, ease: 'sine.inOut' }, 3.5)

      // Scene 4 -> 5 (Zoom in window)
      .to(this.threeService.cameraBasePosition, { x: 0, y: 8.5, z: 12, ease: 'power2.in' }, 4.8)
      .to(this.threeService.cameraBaseTarget, { x: 0, y: 8.5, z: 0, ease: 'power2.in' }, 4.8)
      .to(this.threeService.cameraBasePosition, { x: 0, y: 8.5, z: 5, ease: 'power2.out' }, 5.2)
      .to(this.threeService.cameraBaseTarget, { x: 0, y: 8.5, z: -5, ease: 'power2.out' }, 5.2)

      // Scene 5 -> 6 (Exits back to forest)
      .to(this.threeService.cameraBasePosition, { x: -20, y: 15, z: 40, ease: 'sine.inOut' }, 6.5)
      .to(this.threeService.cameraBaseTarget, { x: 0, y: 10, z: 0, ease: 'sine.inOut' }, 6.5)

      // Scene 6 -> 7 (Reviews overview)
      .to(this.threeService.cameraBasePosition, { x: 35, y: 22, z: 60, ease: 'sine.inOut' }, 7.5)
      .to(this.threeService.cameraBaseTarget, { x: 0, y: 12, z: 0, ease: 'sine.inOut' }, 7.5)

      // Scene 7 -> 8 (Dusk to Night deck view)
      .to(this.threeService.cameraBasePosition, { x: 12, y: 8, z: 20, ease: 'sine.inOut' }, 8.4)
      .to(this.threeService.cameraBaseTarget, { x: 0, y: 6.5, z: 0, ease: 'sine.inOut' }, 8.4)

      // Scene 8 -> 9 (Booking view)
      .to(this.threeService.cameraBasePosition, { x: 6, y: 6.8, z: 14, ease: 'sine.inOut' }, 9.0)
      .to(this.threeService.cameraBaseTarget, { x: 0, y: 6.5, z: 0, ease: 'sine.inOut' }, 9.0)

      // Scene 9 -> 10 (Final rise to sunrise)
      .to(this.threeService.cameraBasePosition, { x: 0, y: 60, z: 120, ease: 'sine.inOut' }, 9.6)
      .to(this.threeService.cameraBaseTarget, { x: 0, y: 12, z: 0, ease: 'sine.inOut' }, 9.6);

    // 2. HTML Layers Transitions
    this.masterScrollTimeline
      .set('#scene1', { opacity: 1, pointerEvents: 'auto' }, 0)
      .set(['#scene2', '#scene3', '#scene4', '#scene5', '#scene6', '#scene7', '#scene8', '#scene9', '#scene10'], { opacity: 0, pointerEvents: 'none' }, 0)

      .to('#scene1', { opacity: 0, duration: 0.8 }, 0.8)
      
      .to('#scene2', { opacity: 1, duration: 0.6 }, 1.0)
      .set('#scene2', { pointerEvents: 'auto' }, 1.0)
      .to('#scene2', { opacity: 0, duration: 0.6 }, 2.0)
      .set('#scene2', { pointerEvents: 'none' }, 2.6)

      .to('#scene3', { opacity: 1, duration: 0.6 }, 2.4)
      .set('#scene3', { pointerEvents: 'auto' }, 2.4)
      .to('#scene3', { opacity: 0, duration: 0.6 }, 3.4)
      .set('#scene3', { pointerEvents: 'none' }, 3.9)

      .to('#scene4', { opacity: 1, duration: 0.6 }, 3.7)
      .set('#scene4', { pointerEvents: 'auto' }, 3.7)
      .to('#scene4', { opacity: 0, duration: 0.6 }, 4.7)
      .set('#scene4', { pointerEvents: 'none' }, 5.2)

      .to('#scene5', { opacity: 1, duration: 0.6 }, 5.0)
      .set('#scene5', { pointerEvents: 'auto' }, 5.0)
      .call(() => this.toggleCabinVisibility(true), [], 5.0)
      .call(() => this.toggleCabinVisibility(false), [], 4.99)
      
      .to('#scene5', { opacity: 0, duration: 0.6 }, 6.2)
      .set('#scene5', { pointerEvents: 'none' }, 6.7)
      .call(() => this.toggleCabinVisibility(false), [], 6.5)

      .to('#scene6', { opacity: 1, duration: 0.6 }, 6.5)
      .set('#scene6', { pointerEvents: 'auto' }, 6.5)
      .to('#scene6', { opacity: 0, duration: 0.6 }, 7.2)
      .set('#scene6', { pointerEvents: 'none' }, 7.7)

      .to('#scene7', { opacity: 1, duration: 0.6 }, 7.5)
      .set('#scene7', { pointerEvents: 'auto' }, 7.5)
      .to('#scene7', { opacity: 0, duration: 0.6 }, 8.2)
      .set('#scene7', { pointerEvents: 'none' }, 8.7)

      .to('#scene8', { opacity: 1, duration: 0.6 }, 8.4)
      .set('#scene8', { pointerEvents: 'auto' }, 8.4)
      .to('#scene8', { opacity: 0, duration: 0.6 }, 9.0)
      .set('#scene8', { pointerEvents: 'none' }, 9.4)

      .to('#scene9', { opacity: 1, duration: 0.6 }, 9.0)
      .set('#scene9', { pointerEvents: 'auto' }, 9.0)
      .to('#scene9', { opacity: 0, duration: 0.6 }, 9.6)
      .set('#scene9', { pointerEvents: 'none' }, 9.8)

      .to('#scene10', { opacity: 1, duration: 0.6 }, 9.7)
      .set('#scene10', { pointerEvents: 'auto' }, 9.7);
  }

  private toggleCabinVisibility(showInterior: boolean) {
    if (this.threeService.cabinExterior && this.threeService.cabinInterior) {
      this.threeService.cabinExterior.visible = !showInterior;
      this.threeService.cabinInterior.visible = showInterior;
    }
  }

  private initLookAroundListeners() {
    const handleDown = (clientX: number, clientY: number) => {
      const progress = this.masterScrollTrigger?.progress || 0;
      // Allow drag rotation look-around only in Scene 5 (progress 0.48 - 0.67) & no active hotspot
      if (progress < 0.48 || progress > 0.67 || this.activeHotspotObj) return;

      this.isDragging = true;
      this.previousMouse.x = clientX;
      this.previousMouse.y = clientY;
    };

    const handleMove = (clientX: number, clientY: number) => {
      if (!this.isDragging) return;

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

    // Project coordinates only when in room exploration phase (Scene 5 overlay is active)
    const progress = this.masterScrollTrigger?.progress || 0;
    if (progress < 0.47 || progress > 0.68) {
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
