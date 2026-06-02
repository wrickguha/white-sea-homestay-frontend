import { Component, OnInit, ElementRef, ViewChild, AfterViewChecked, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { GsapService } from '../../core/services/gsap.service';

interface Message {
  sender: 'user' | 'concierge';
  text: string;
  timestamp: Date;
}

@Component({
  selector: 'app-concierge',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './concierge.component.html',
  styles: [`
    .chat-bubble {
      max-width: 80%;
      animation: popIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes popIn {
      0% { opacity: 0; transform: scale(0.9) translateY(10px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
  `]
})
export class ConciergeComponent implements OnInit, AfterViewChecked {
  // Planner states
  days = 3;
  budget = 'medium';
  interest = 'nature';
  generatedItinerary: string[] = [];
  
  // Chat states
  userInput = '';
  chatHistory: Message[] = [];
  isTyping = false;

  @ViewChild('chatScrollContainer') private chatScrollContainer!: ElementRef<HTMLDivElement>;

  constructor(
    private gsapService: GsapService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    // Initial welcome message
    this.chatHistory.push({
      sender: 'concierge',
      text: "Hello! I am Prakash, your virtual AI concierge. I can help you plan your itinerary, describe our food menu, suggest local secret viewpoints, or tell you more about our rooms. What is on your mind today?",
      timestamp: new Date()
    });

    this.generateItinerary();

    // Reset scroll to top
    if (isPlatformBrowser(this.platformId)) {
      this.gsapService.scrollTo(0);
    }
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  generateItinerary() {
    const plans: Record<string, string[]> = {
      'nature': [
        "Day 1: Arrive at White Sea Homestay, settle in, enjoy organic chamomile tea. Take a sunset stroll through Dowhill Pine Forest right beside the grounds.",
        "Day 2: Morning trek (5:30 AM) to Kettle Valley Sunrise point. Return for fresh local Thapa thali breakfast. Afternoon visit to the Margaret's Hope Tea Garden. Bonfire evening at the homestay.",
        "Day 3: Take a slow stroll to the chimney trail, ride the Himalayan Toy Train in the afternoon, dinner by the cozy living room fire."
      ],
      'trekking': [
        "Day 1: Arrival & Gear Check. Gentle acclimation trek along the historical old cart road through silent pine stands. Welcome soup at the bonfire.",
        "Day 2: Full-day trek along the Ridge Trail towards Eagle's Craig. Pack lunch of traditional flatbreads. View the evening sunset over the Kurseong peaks.",
        "Day 3: Morning descent through the tea terraces to the river stream. Local thali lunch, then departure."
      ],
      'relaxation': [
        "Day 1: Settle into your cozy glass-ceiling Misty Attic room. Read a book in the evening listening to ambient rain and pine breezes.",
        "Day 2: Enjoy high-speed Wi-Fi with an absolute nature view. Relish traditional hot steamed momos. Evening tea ceremony showcasing premium Darjeeling leaves.",
        "Day 3: Wake up late to the mountain sun. Meditation session on the wooden deck, local honey pancakes, checkout."
      ],
      'food': [
        "Day 1: Warm welcome thali. Afternoon kitchen garden tour to hand-pick organic herbs. Savor local fire-roasted snacks.",
        "Day 2: Cooking workshop with the host (learn the secret spices of the hills). Enjoy fresh steaming thukpa. Late evening barbecue session under the stars.",
        "Day 3: Tea garden estate visit with premium leaf tasting session, followed by traditional sweet pancakes before check out."
      ]
    };

    const interestKey = this.interest as keyof typeof plans;
    let basePlan = plans[interestKey] || plans['nature'];

    // Adjust length
    if (this.days === 2) {
      this.generatedItinerary = basePlan.slice(0, 2);
    } else if (this.days === 1) {
      this.generatedItinerary = [basePlan[0]];
    } else {
      this.generatedItinerary = [...basePlan];
      // Add extra days if user requests more
      for (let i = 4; i <= this.days; i++) {
        this.generatedItinerary.push(`Day ${i}: Customized local adventure exploration—visit hidden temples, waterfalls, and dine at the local Kurseong markets.`);
      }
    }
  }

  sendMessage() {
    const text = this.userInput.trim();
    if (!text) return;

    this.chatHistory.push({
      sender: 'user',
      text: text,
      timestamp: new Date()
    });

    this.userInput = '';
    this.isTyping = true;

    // Simulate AI response
    setTimeout(() => {
      const response = this.getAIResponse(text);
      this.chatHistory.push({
        sender: 'concierge',
        text: response,
        timestamp: new Date()
      });
      this.isTyping = false;
    }, 1200);
  }

  private getAIResponse(query: string): string {
    const q = query.toLowerCase();

    if (q.includes('food') || q.includes('eat') || q.includes('menu') || q.includes('dinner') || q.includes('lunch')) {
      return "We serve organic, home-cooked local thalis, hand-rolled steamed momos, cozy thukpa noodle soups, and fresh pancakes. All ingredients are sourced from our organic kitchen garden and local valley farms. Meals are prepared fresh daily!";
    }
    
    if (q.includes('room') || q.includes('stay') || q.includes('suite') || q.includes('attic') || q.includes('price') || q.includes('cost')) {
      return "We offer three room categories: the luxurious Pine View Suite (₹6,500/night with fireplace & private deck), the cozy Misty Attic Room (₹5,500/night with glass stargazing ceiling), and the spacious Forest Canopy Cottage (₹9,500/night, ideal for families). You can book them instantly on our homepage booking section!";
    }

    if (q.includes('attraction') || q.includes('places') || q.includes('visit') || q.includes('see') || q.includes('explore') || q.includes('viewpoint')) {
      return "Dow Hill is famous for its misty Pine Forests, historical Chimney, Eagle's Craig viewpoint (perfect sunset), Margaret's Hope Tea Garden, and the heritage Himalayan Steam Toy Train. I can guide you to each of these spots during your stay!";
    }

    if (q.includes('weather') || q.includes('best time') || q.includes('season') || q.includes('cold')) {
      return "Kurseong is beautiful year-round! The best times are Sept-Nov for clear Himalayan peaks, and March-May for rhododendron blooms. Winters (Dec-Feb) are chilly and cozy (4-12°C), perfect for fireplaces, while monsoons (June-August) bring lush rolling green mists.";
    }

    if (q.includes('wifi') || q.includes('internet') || q.includes('remote') || q.includes('work')) {
      return "Yes! We have high-speed Wi-Fi throughout the homestay grounds, and power backups. It is highly recommended for remote workers who want to code or write surrounded by silent pine trees.";
    }

    if (q.includes('hello') || q.includes('hi') || q.includes('hey')) {
      return "Hello there! How can I help you plan your mountain retreat today?";
    }

    // Default response
    return "That sounds like a wonderful plan. At White Sea Homestay, we tailor the experience to your needs. If you would like to verify specific arrangements, click 'Book Stay' to see details, or let me know if you want to know about our foods, weather, or trails!";
  }

  private scrollToBottom() {
    if (this.chatScrollContainer) {
      try {
        const element = this.chatScrollContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      } catch (err) {}
    }
  }
}
