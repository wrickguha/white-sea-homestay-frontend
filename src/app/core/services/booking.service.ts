import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';

export interface Room {
  id: string;
  name: string;
  slug: string;
  description: string;
  capacity: number;
  pricePerNight: number;
  amenities: string[]; // parsed from JSON string list
  images: string[];
  viewType: string;
  totalRooms: number;
}

export interface BookingDetails {
  roomId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkIn: string;
  checkOut: string;
  numGuests: number;
  specialRequests?: string;
  promoCode?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  private apiUrl = 'http://localhost:3000/api';

  // Booking signals for managing wizard state
  checkIn = signal<string>('');
  checkOut = signal<string>('');
  selectedRoom = signal<Room | null>(null);
  guestsCount = signal<number>(1);
  promoCode = signal<string>('');
  specialRequests = signal<string>('');

  // Computed properties
  nightsCount = computed(() => {
    const startStr = this.checkIn();
    const endStr = this.checkOut();
    if (!startStr || !endStr) return 0;

    const start = new Date(startStr);
    const end = new Date(endStr);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return isNaN(diffDays) ? 0 : diffDays;
  });

  subtotal = computed(() => {
    const room = this.selectedRoom();
    const nights = this.nightsCount();
    if (!room || nights <= 0) return 0;
    return room.pricePerNight * nights;
  });

  gstTax = computed(() => {
    // 12% GST on luxury homestay lodging in India
    return Math.round(this.subtotal() * 0.12 * 100) / 100;
  });

  discount = computed(() => {
    const code = this.promoCode().toUpperCase();
    const sub = this.subtotal();
    if (code === 'HIMALAYAS' || code === 'WHITESTAY') {
      // 15% discount code
      return Math.round(sub * 0.15 * 100) / 100;
    }
    return 0;
  });

  totalAmount = computed(() => {
    return this.subtotal() + this.gstTax() - this.discount();
  });

  constructor(private http: HttpClient) {}

  /**
   * Fetches all room categories from the backend.
   */
  getRooms(): Observable<Room[]> {
    return this.http.get<Room[]>(`${this.apiUrl}/rooms`).pipe(
      catchError(err => {
        console.error('Error fetching rooms, returning mock fallback:', err);
        return of(this.getMockRooms());
      })
    );
  }

  /**
   * Fetches details of a specific room category by its slug.
   */
  getRoomBySlug(slug: string): Observable<Room> {
    return this.http.get<Room>(`${this.apiUrl}/rooms/${slug}`).pipe(
      catchError(err => {
        console.error(`Error fetching room slug: ${slug}, returning mock:`, err);
        const match = this.getMockRooms().find(r => r.slug === slug);
        return match ? of(match) : of(this.getMockRooms()[0]);
      })
    );
  }

  /**
   * Submits booking information to the backend to create a database record and start Razorpay order.
   */
  createBooking(details: BookingDetails): Observable<any> {
    return this.http.post<any>(`${`${this.apiUrl}/bookings`}`, {
      ...details,
      totalAmount: this.totalAmount()
    });
  }

  /**
   * Verifies Razorpay signature and payment status.
   */
  verifyPayment(paymentData: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    bookingId: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/payments/verify`, paymentData);
  }

  /**
   * Clean/reset booking wizard variables.
   */
  resetWizard() {
    this.checkIn.set('');
    this.checkOut.set('');
    this.selectedRoom.set(null);
    this.guestsCount.set(1);
    this.promoCode.set('');
    this.specialRequests.set('');
  }

  /**
   * Static mock rooms for frontend isolation or backend failure fallbacks.
   */
  private getMockRooms(): Room[] {
    return [
      {
        id: 'pine-view-suite-id',
        name: 'Pine View Suite',
        slug: 'pine-view-suite',
        description: 'A sanctuary of luxury nestled high above the forest floor. The Pine View Suite features expansive glass walls offering uninterrupted views of the Dowhill pine forests, a private wooden deck, a cozy fireplace, and an elegant stone bathroom. Ideal for couples seeking a tranquil mountain retreat.',
        capacity: 2,
        pricePerNight: 6500.00,
        amenities: [
          'Himalayan Pine Forest View',
          'Private Balcony & Deck',
          'Stone Fireplace',
          'King-size Luxury Bed',
          'High-speed Wi-Fi',
          'Organic Mountain Teas & Coffee Station',
          'Premium Bathrobes & Toiletries'
        ],
        images: [
          'assets/images/rooms/pine-suite-1.jpg',
          'assets/images/rooms/pine-suite-2.jpg'
        ],
        viewType: 'Pine Forest & Valley View',
        totalRooms: 2
      },
      {
        id: 'misty-attic-room-id',
        name: 'Misty Attic Room',
        slug: 'misty-attic-room',
        description: 'Perched at the highest peak of the homestay, the Misty Attic is a dream come true for nature lovers and stargazers. It features a sloping wooden roof with large skylight windows, letting you watch the morning mist roll in and fall asleep under a canopy of stars. Features premium cozy linens and cabin aesthetics.',
        capacity: 2,
        pricePerNight: 5500.00,
        amenities: [
          'Glass Skylight Ceiling',
          '360° Mountain Mist Views',
          'Premium Floor Cushion Seating',
          'Queen-size Plush Bed',
          'Wi-Fi',
          'Fresh Local Orchids Display',
          'Cozy Room Heater'
        ],
        images: [
          'assets/images/rooms/attic-1.jpg',
          'assets/images/rooms/attic-2.jpg'
        ],
        viewType: 'Himalayan Peak & Skylight View',
        totalRooms: 1
      },
      {
        id: 'forest-canopy-cottage-id',
        name: 'Forest Canopy Cottage',
        slug: 'forest-canopy-cottage',
        description: 'A spacious, private wooden cottage designed for families or small groups. Tucked away under giant old pine trees, it offers absolute seclusion, a large dining area, an outdoor bonfire sit-out, and two master bedrooms with attached modern bathrooms. Experience the raw sounds of nature in absolute comfort.',
        capacity: 4,
        pricePerNight: 9500.00,
        amenities: [
          'Private Forest Garden',
          'Outdoor Fire Pit & Seating',
          'Two Luxury Master Beds',
          'Spacious Living & Dining Area',
          'Kitchenette with Microwave & Kettle',
          'High-speed Wi-Fi',
          'Complimentary Evening Snacks'
        ],
        images: [
          'assets/images/rooms/cottage-1.jpg',
          'assets/images/rooms/cottage-2.jpg'
        ],
        viewType: 'Deep Pine Forest View',
        totalRooms: 1
      }
    ];
  }
}
