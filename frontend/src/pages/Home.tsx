import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import heroBgVideo from '../assets/hero_bg.mp4';

interface ClientReview {
  id: number;
  image: string;
  message: string;
  time: string;
}

const DEFAULT_CLIENT_SHOWCASE: ClientReview[] = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=400&auto=format&fit=crop',
    message: 'Thank you so much! ❤️ I received the gift before the time. The wrapping looks so premium! He loved it.',
    time: '10:30 AM',
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?q=80&w=400&auto=format&fit=crop',
    message: 'Omg he is so happy with the Midnight Box! The champagne glasses are absolutely beautiful. Thanks a lot for the quick delivery! 🥰',
    time: '02:15 PM',
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1575384978132-c68e146747b0?q=80&w=400&auto=format&fit=crop',
    message: 'Highly satisfied with the executive curation. Gift boxes are solid wood-like cardboard feel, ribbon detail is neat. 10/10 service.',
    time: '05:45 PM',
  },
];

export const Home = () => {
  const [chatFeedbacks, setChatFeedbacks] = useState<ClientReview[]>([]);
  const [chatSlideIndex, setChatSlideIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const storedClientReviews = localStorage.getItem('sparkle_client_reviews');
    if (storedClientReviews) {
      try {
        const parsed = JSON.parse(storedClientReviews);
        if (parsed.length > 0) {
          setChatFeedbacks(parsed);
        } else {
          setChatFeedbacks(DEFAULT_CLIENT_SHOWCASE);
        }
      } catch (e) {
        setChatFeedbacks(DEFAULT_CLIENT_SHOWCASE);
      }
    } else {
      localStorage.setItem('sparkle_client_reviews', JSON.stringify(DEFAULT_CLIENT_SHOWCASE));
      setChatFeedbacks(DEFAULT_CLIENT_SHOWCASE);
    }
  }, []);

  // Auto-shuffle client showcase cards on mobile/desktop slider
  useEffect(() => {
    if (chatFeedbacks.length <= 1) return;
    const interval = setInterval(() => {
      setChatSlideIndex((prev) => (prev + 1) % chatFeedbacks.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [chatFeedbacks.length]);

  const handleNavigateToClientShowcase = () => {
    navigate('/reviews#client-showcase');
  };

  const visibleReviews = [];
  if (chatFeedbacks.length > 0) {
    for (let i = 0; i < 3; i++) {
      const item = chatFeedbacks[(chatSlideIndex + i) % chatFeedbacks.length];
      if (item) {
        visibleReviews.push({ ...item, uniqueKey: `${item.id}-${i}` });
      }
    }
  }

  return (
    <div className="bg-background min-h-screen relative overflow-hidden">
      
      {/* 1. HERO SECTION */}
      <section className="min-h-[calc(100vh-120px)] relative flex flex-col items-center justify-center py-12 px-4 border-b border-gold/10 overflow-hidden">
        {/* Background Video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0 opacity-30"
        >
          <source src={heroBgVideo} type="video/mp4" />
        </video>
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-background/60 z-0 pointer-events-none"></div>
        {/* Background Glow */}
        <div className="absolute right-0 top-1/4 w-[500px] h-[500px] bg-gold/5 rounded-full blur-[120px] pointer-events-none z-0"></div>
        
        <div className="max-w-4xl w-full text-center space-y-8 relative z-10 my-auto">
          {/* Crown & Subtitle */}
          <div className="space-y-3 pt-4">
            <svg viewBox="0 0 24 24" className="w-10 h-10 mx-auto text-gold fill-none stroke-current stroke-[1.5]">
              <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 20h18" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            
            <div className="space-y-2">
              <p className="text-[10px] md:text-xs font-sans uppercase tracking-[0.3em] text-gold font-medium">
                Premium Gifts. Lasting Impressions.
              </p>
              <div className="flex items-center justify-center gap-4 max-w-xs mx-auto">
                <div className="h-[1px] bg-gold/20 flex-grow"></div>
                <div className="w-1.5 h-1.5 bg-gold rotate-45"></div>
                <div className="h-[1px] bg-gold/20 flex-grow"></div>
              </div>
            </div>
          </div>

          {/* Main Headline */}
          <div className="space-y-1">
            <h1 className="text-5xl md:text-7xl font-serif tracking-[0.15em] text-gold uppercase leading-tight font-extralight">
              Luxury
            </h1>
            <h1 className="text-5xl md:text-7xl font-serif tracking-[0.15em] text-ivory uppercase leading-tight font-extralight">
              Gift Boxes
            </h1>
            <h2 className="text-2xl md:text-3xl font-serif tracking-[0.35em] text-gold uppercase mt-4 font-light">
              For Him
            </h2>
          </div>

          {/* Divider with Gift Icon */}
          <div className="relative flex items-center justify-center py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gold/15"></div>
            </div>
            <div className="relative px-4 bg-background">
              <span className="material-symbols-outlined text-gold text-xl block">redeem</span>
            </div>
          </div>

          {/* Subtitles & Descriptions */}
          <div className="space-y-4">
            <p className="text-xl md:text-2xl font-serif text-ivory tracking-wide font-light">
              Curated. Refined. Unforgettable.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/shop"
              className="inline-block w-full sm:w-auto px-10 py-3.5 rounded-full border border-gold bg-gold text-background font-sans font-semibold text-xs uppercase tracking-[0.2em] transition-all duration-300 hover:bg-transparent hover:text-gold hover:shadow-gold-glow hover:-translate-y-0.5 active:translate-y-0 text-center"
            >
              Explore Collection
            </Link>
            <button
              onClick={handleNavigateToClientShowcase}
              className="inline-block w-full sm:w-auto px-10 py-3.5 rounded-full border border-gold text-gold font-sans font-semibold text-xs uppercase tracking-[0.2em] transition-all duration-300 hover:text-background hover:bg-gold hover:shadow-gold-glow hover:-translate-y-0.5 active:translate-y-0 text-center cursor-pointer"
            >
              See Guest Feedback
            </button>
          </div>

          {/* 4 Premium Features Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-4 pt-6 max-w-3xl mx-auto border-t border-gold/5 mt-8">
            <div className="flex flex-col items-center p-2 space-y-2 border-r border-gold/10 last:border-0 md:border-r md:last:border-0">
              <span className="material-symbols-outlined text-gold text-2xl">diamond</span>
              <p className="text-[9px] md:text-[10px] font-sans font-medium uppercase tracking-[0.15em] text-ivory text-center">
                Handcrafted Curation
              </p>
            </div>
            <div className="flex flex-col items-center p-2 space-y-2 border-r border-gold/10 last:border-0 md:border-r md:last:border-0">
              <span className="material-symbols-outlined text-gold text-2xl">workspace_premium</span>
              <p className="text-[9px] md:text-[10px] font-sans font-medium uppercase tracking-[0.15em] text-ivory text-center">
                Bespoke Packaging
              </p>
            </div>
            <div className="flex flex-col items-center p-2 space-y-2 border-r border-gold/10 last:border-0 md:border-r md:last:border-0">
              <span className="material-symbols-outlined text-gold text-2xl">local_shipping</span>
              <p className="text-[9px] md:text-[10px] font-sans font-medium uppercase tracking-[0.15em] text-ivory text-center">
                Express Delivery
              </p>
            </div>
            <div className="flex flex-col items-center p-2 space-y-2">
              <span className="material-symbols-outlined text-gold text-2xl">support_agent</span>
              <p className="text-[9px] md:text-[10px] font-sans font-medium uppercase tracking-[0.15em] text-ivory text-center">
                Personal Concierge
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CHAT SPOTLIGHT / CLIENT SHOWCASE SECTION ON HOME */}
      <section className="py-20 px-6 max-w-7xl mx-auto border-b border-gold/10 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Text block (Left) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="space-y-2">
              <span className="text-[10px] text-gold uppercase tracking-[0.25em] font-semibold">Real Conversations</span>
              <h2 className="text-3xl md:text-4xl font-serif text-ivory leading-tight">
                Client Showcase
              </h2>
            </div>
            <p className="text-sm text-muted leading-relaxed font-light font-sans">
              Discover real experiences, delivery snapshots, and why so many choose Sparkle Giftz for their memorable moments.
            </p>
            <div className="pt-2">
              <button
                onClick={handleNavigateToClientShowcase}
                className="inline-block px-8 py-3 border border-gold text-gold hover:bg-gold hover:text-background font-semibold text-xs uppercase tracking-widest transition duration-300 cursor-pointer"
              >
                View Client Showcase
              </button>
            </div>
          </div>

          {/* Client Showcase Previews (Right) */}
          <div className="lg:col-span-8 relative">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {chatFeedbacks.length > 0 ? (
                visibleReviews.map((item, idx) => (
                  <div
                    key={item.uniqueKey}
                    className={`gold-gradient-border bg-charcoal/95 rounded-lg overflow-hidden relative shadow-2xl transition-all duration-500 p-2.5 ${
                      idx > 0 ? 'hidden md:block' : 'block'
                    }`}
                  >
                    <div className="w-full h-72 rounded bg-background overflow-hidden border border-gold/10 relative">
                      <img
                        src={item.image}
                        alt="client feedback snapshot"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-3 flex flex-col items-center justify-center py-20 text-muted text-xs uppercase tracking-wider">
                  No client moments uploaded yet.
                </div>
              )}
            </div>

            {/* Progress Indicators */}
            {chatFeedbacks.length > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                {chatFeedbacks.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setChatSlideIndex(idx)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      chatSlideIndex === idx ? 'w-5 bg-gold' : 'w-1.5 bg-gold/25'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

        </div>
      </section>

    </div>
  );
};
