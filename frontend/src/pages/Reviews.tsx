import { useState, useEffect, useRef } from 'react';
import { getClientReviews, type ClientReview } from '../lib/supabase';

interface Review {
  id: number;
  author: string;
  rating: number;
  text: string;
  time: string;
  avatar: string;
  verified: boolean;
}

const DEFAULT_REVIEWS: Review[] = [
  {
    id: 1,
    author: 'Pasan Karunanayake',
    rating: 5,
    text: "I recently bought a premium corporate curation box from Sparkle Giftz, and I must say, I'm thoroughly impressed! The export-quality selection, elegant gold formatting and presentation are masterclass.",
    time: '2 days ago',
    avatar: 'PK',
    verified: true,
  },
  {
    id: 2,
    author: 'Senuri Silva',
    rating: 5,
    text: "The Noir Classic was a massive hit for my anniversary. The premium chocolates, weighted pen, and velvet-lined casing made it feel extremely bespoke. Fast delivery to Colombo too!",
    time: '1 week ago',
    avatar: 'SS',
    verified: true,
  },
  {
    id: 3,
    author: 'Dilhara S.',
    rating: 5,
    text: "Absolutely exquisite gift box customization. The greeting card was handwritten beautifully. The attention to detail is gold standard.",
    time: '3 weeks ago',
    avatar: 'DS',
    verified: true,
  },
  {
    id: 4,
    author: 'Thilina Perera',
    rating: 5,
    text: "Top-notch customer support and delivery. The executive charcoal set was packed beautifully and handled with utmost care. Highly recommended for corporate gifts.",
    time: '1 month ago',
    avatar: 'TP',
    verified: true,
  },
  {
    id: 5,
    author: 'Nimanthi Abeyrathne',
    rating: 5,
    text: "Unmatched quality and swift doorstep delivery. Loved the luxury presentation!",
    time: '1 month ago',
    avatar: 'NA',
    verified: true,
  }
];

const REVIEW_PRESETS = [
  { aspect: 'aspect-[3/4]', rotate: '-rotate-1 sm:-rotate-1.5', rounded: 'rounded-[16px]' },
  { aspect: 'aspect-[4/5]', rotate: 'rotate-1 sm:rotate-1.5', rounded: 'rounded-[14px]' },
  { aspect: 'aspect-[3/4]', rotate: '-rotate-1', rounded: 'rounded-[16px]' },
  { aspect: 'aspect-[4/5]', rotate: 'rotate-1.5 sm:rotate-2', rounded: 'rounded-[18px]' },
  { aspect: 'aspect-[3/4]', rotate: '-rotate-1', rounded: 'rounded-[14px]' },
  { aspect: 'aspect-[4/5]', rotate: 'rotate-1', rounded: 'rounded-[16px]' },
  { aspect: 'aspect-[3/4]', rotate: '-rotate-1.5', rounded: 'rounded-[18px]' },
  { aspect: 'aspect-[4/5]', rotate: 'rotate-1', rounded: 'rounded-[16px]' },
];

interface AnimatedReviewCardProps {
  review: ClientReview;
  index: number;
  preset: { aspect: string; rotate: string; rounded: string };
  onClick: () => void;
}

const AnimatedReviewCard: React.FC<AnimatedReviewCardProps> = ({ review, index, preset, onClick }) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -20px 0px',
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const staggerDelay = (index % 4) * 100; // 0ms, 100ms, 200ms, 300ms stagger

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      style={{ transitionDelay: isVisible ? `${staggerDelay}ms` : '0ms' }}
      className={`break-inside-avoid mb-2.5 sm:mb-4 relative group cursor-pointer review-card-reveal ${
        isVisible ? 'is-visible' : ''
      } ${preset.rotate}`}
    >
      <div className={`gold-gradient-border bg-[#14171f] p-1.5 sm:p-2 ${preset.rounded} shadow-xl review-card-hover relative`}>
        <div className={`relative overflow-hidden ${preset.rounded} ${preset.aspect} bg-charcoal`}>
          <img
            src={review.image_url || (review as any).image}
            alt={`Customer review ${index + 1}`}
            className="w-full h-full object-cover review-image-zoom"
            loading="lazy"
          />

          {/* Hover Zoom & Tap Indicator Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-end p-2.5">
            <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gold text-background flex items-center justify-center shadow-gold-glow mb-1 transition-transform group-hover:scale-110">
              <span className="material-symbols-outlined text-lg font-bold">zoom_in</span>
            </span>
            <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-ivory drop-shadow">
              Tap to Enlarge
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface AnimatedGuestCardProps {
  item: Review & { uniqueKey: string };
  idx: number;
}

const AnimatedGuestCard: React.FC<AnimatedGuestCardProps> = ({ item, idx }) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.08 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const staggerDelay = idx * 120;

  return (
    <div
      ref={cardRef}
      style={{ transitionDelay: isVisible ? `${staggerDelay}ms` : '0ms' }}
      className={`gold-gradient-border bg-[#14171f] p-5 rounded-md space-y-3 relative review-card-reveal review-card-hover ${
        isVisible ? 'is-visible' : ''
      } ${idx > 0 ? 'hidden md:block' : 'block'}`}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center text-xs font-extrabold text-gold">
            {item.avatar}
          </div>
          <div>
            <h3 className="font-sans font-bold text-sm text-ivory leading-none">{item.author}</h3>
            <span className="text-[10px] text-muted font-sans mt-1 block">{item.time}</span>
          </div>
        </div>

        {item.verified && (
          <span className="text-[9px] text-[#00c853] font-sans font-bold uppercase tracking-widest border border-[#00c853]/30 bg-[#00c853]/10 px-2 py-0.5 rounded">
            VERIFIED
          </span>
        )}
      </div>

      <div className="flex text-gold text-xs gap-0.5">
        {Array.from({ length: item.rating }).map((_, i) => (
          <span key={i}>★</span>
        ))}
      </div>

      <p className="text-xs text-muted leading-relaxed font-sans italic">
        "{item.text}"
      </p>
    </div>
  );
};

export const Reviews = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [clientReviews, setClientReviews] = useState<ClientReview[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  // Auto-shuffle 3 guest reviews every 3 seconds state
  const [guestSlideIndex, setGuestSlideIndex] = useState(0);
  const [isGuestPaused, setIsGuestPaused] = useState(false);

  const [newAuthor, setNewAuthor] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [newText, setNewText] = useState('');

  useEffect(() => {
    const loadAllReviews = async () => {
      // 1. Guest Text Testimonials
      const stored = localStorage.getItem('sparkle_reviews');
      if (stored) {
        setReviews(JSON.parse(stored));
      } else {
        localStorage.setItem('sparkle_reviews', JSON.stringify(DEFAULT_REVIEWS));
        setReviews(DEFAULT_REVIEWS);
      }

      // 2. Live Supabase Admin Customer Screenshot Reviews
      const liveReviews = await getClientReviews();
      if (liveReviews && liveReviews.length > 0) {
        setClientReviews(liveReviews);
      } else {
        setClientReviews([]);
      }
    };

    loadAllReviews();
    window.addEventListener('storage', loadAllReviews);
    window.addEventListener('sparkle_client_reviews_updated', loadAllReviews);

    // Scroll to #client-showcase if URL hash is present
    if (window.location.hash === '#client-showcase') {
      setTimeout(() => {
        const el = document.getElementById('client-showcase');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 150);
    }

    return () => {
      window.removeEventListener('storage', loadAllReviews);
      window.removeEventListener('sparkle_client_reviews_updated', loadAllReviews);
    };
  }, []);

  // Shuffle 3 guest reviews every 3 seconds
  useEffect(() => {
    if (isGuestPaused || reviews.length <= 3) return;
    const timer = setInterval(() => {
      setGuestSlideIndex((prev) => (prev + 1) % reviews.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [reviews.length, isGuestPaused]);

  const handleAddReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAuthor || !newText) {
      alert('Please fill out all fields.');
      return;
    }

    const newReview: Review = {
      id: Date.now(),
      author: newAuthor,
      rating: newRating,
      text: newText,
      time: 'Just now',
      avatar: newAuthor.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
      verified: true
    };

    const updated = [newReview, ...reviews];
    localStorage.setItem('sparkle_reviews', JSON.stringify(updated));
    setReviews(updated);

    // Reset Form
    setNewAuthor('');
    setNewRating(5);
    setNewText('');
    setShowReviewModal(false);
    alert('Thank you for submitting your review!');
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedImageIndex !== null) {
      setSelectedImageIndex((prev) => (prev === 0 ? clientReviews.length - 1 : (prev ?? 0) - 1));
    }
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedImageIndex !== null) {
      setSelectedImageIndex((prev) => (prev === clientReviews.length - 1 ? 0 : (prev ?? 0) + 1));
    }
  };

  // Compute 3 visible guest reviews for 3-second shuffle rotation
  const visibleGuestReviews = reviews.length <= 3
    ? reviews.map((r, i) => ({ ...r, uniqueKey: `review-${r.id}-${i}` }))
    : Array.from({ length: 3 }).map((_, i) => {
        const itemIndex = (guestSlideIndex + i) % reviews.length;
        return {
          ...reviews[itemIndex],
          uniqueKey: `review-${reviews[itemIndex].id}-${guestSlideIndex}-${i}`
        };
      });

  return (
    <div className="min-h-screen py-8 sm:py-16 px-4 max-w-5xl mx-auto space-y-12">
      
      {/* HEADER MATCHING REFERENCE IMAGE */}
      <div id="client-showcase" className="text-center space-y-3 pt-2 font-sans">
        <h1 className="text-3xl sm:text-5xl font-serif font-bold text-gold tracking-wide">
          Customer Reviews
        </h1>
        {/* Accent pink/gold divider line under title matching reference image */}
        <div className="w-24 h-1.5 bg-gradient-to-r from-pink-500 via-gold to-pink-500 mx-auto rounded-full shadow-gold-glow"></div>
        <p className="text-xs sm:text-sm text-muted max-w-xl mx-auto font-sans tracking-wide mt-2">
          Real unboxing moments, feedback screenshots & client stories.
        </p>
      </div>

      {/* ARTISTIC MASONRY GALLERY WITH INTERSECTION OBSERVER SCROLL ANIMATION */}
      <div className="columns-2 sm:columns-2 md:columns-3 gap-2.5 sm:gap-4 max-w-4xl mx-auto py-2 font-sans">
        {clientReviews.map((review, index) => {
          const preset = REVIEW_PRESETS[index % REVIEW_PRESETS.length];
          return (
            <AnimatedReviewCard
              key={review.id}
              review={review}
              index={index}
              preset={preset}
              onClick={() => setSelectedImageIndex(index)}
            />
          );
        })}
      </div>

      {/* FULLSCREEN IMAGE LIGHTBOX MODAL */}
      {selectedImageIndex !== null && clientReviews[selectedImageIndex] && (
        <div 
          onClick={() => setSelectedImageIndex(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fadeIn"
        >
          {/* Close Button */}
          <button
            onClick={() => setSelectedImageIndex(null)}
            className="absolute top-4 right-4 z-50 text-white/80 hover:text-white p-2 rounded-full bg-black/50 hover:bg-black/80 transition"
            title="Close Lightbox"
          >
            <span className="material-symbols-outlined text-2xl block">close</span>
          </button>

          {/* Previous Arrow */}
          {clientReviews.length > 1 && (
            <button
              onClick={handlePrevImage}
              className="absolute left-2 sm:left-6 z-50 text-white/80 hover:text-white p-3 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 transition cursor-pointer"
              title="Previous Screenshot"
            >
              <span className="material-symbols-outlined text-2xl block">chevron_left</span>
            </button>
          )}

          {/* Image Container */}
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="relative max-w-3xl max-h-[85vh] flex flex-col items-center justify-center space-y-3"
          >
            <img
              src={clientReviews[selectedImageIndex].image_url || clientReviews[selectedImageIndex].image}
              alt="Customer review full view"
              className="max-w-full max-h-[78vh] object-contain rounded-lg shadow-2xl border border-gold/30 bg-black"
            />

            {/* Image Counter Badge */}
            <div className="bg-black/75 backdrop-blur border border-gold/30 text-gold text-xs font-sans font-semibold px-4 py-1.5 rounded-full shadow-lg">
              {selectedImageIndex + 1} of {clientReviews.length}
            </div>
          </div>

          {/* Next Arrow */}
          {clientReviews.length > 1 && (
            <button
              onClick={handleNextImage}
              className="absolute right-2 sm:right-6 z-50 text-white/80 hover:text-white p-3 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 transition cursor-pointer"
              title="Next Screenshot"
            >
              <span className="material-symbols-outlined text-2xl block">chevron_right</span>
            </button>
          )}
        </div>
      )}

      {/* GUEST REVIEWS SECTION (3 AT A TIME SHUFFLING EVERY 3 SECONDS) */}
      <div className="border-t border-gold/15 pt-12 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-serif text-gold uppercase tracking-widest font-bold">
              Guest Feedback
            </h2>
            <p className="text-muted text-xs font-sans uppercase tracking-wider mt-1">
              Direct text testimonials from our verified buyers (Auto-rotates every 3s).
            </p>
          </div>
          <button
            onClick={() => setShowReviewModal(true)}
            className="px-6 py-3 bg-gold hover:bg-gold-light text-background font-bold font-sans text-xs uppercase tracking-widest transition duration-300 shadow-md rounded-xs cursor-pointer self-start sm:self-auto"
          >
            WRITE A REVIEW
          </button>
        </div>

        {/* 3 Guest Feedback Cards Grid (Shuffling every 3 seconds) */}
        <div 
          onMouseEnter={() => setIsGuestPaused(true)}
          onMouseLeave={() => setIsGuestPaused(false)}
          className="grid grid-cols-1 md:grid-cols-3 gap-5 min-h-[160px]"
        >
          {visibleGuestReviews.map((item, idx) => (
            <AnimatedGuestCard key={item.uniqueKey} item={item} idx={idx} />
          ))}
        </div>

        {/* Progress Carousel Dots for Guest Feedback */}
        {reviews.length > 3 && (
          <div className="flex justify-center gap-2 pt-2">
            {reviews.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setGuestSlideIndex(idx)}
                title={`Go to review ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  guestSlideIndex === idx ? 'w-6 bg-gold' : 'w-1.5 bg-gold/25 hover:bg-gold/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* WRITE A REVIEW MODAL */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="gold-gradient-border bg-charcoal p-6 rounded-lg max-w-md w-full shadow-2xl">
            
            <div className="flex justify-between items-center border-b border-gold/15 pb-4 mb-6">
              <h3 className="font-serif text-xl text-gold uppercase tracking-wider font-bold">Write Guest Review</h3>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="text-muted hover:text-gold transition duration-200 material-symbols-outlined"
              >
                close
              </button>
            </div>

            <form onSubmit={handleAddReviewSubmit} className="space-y-4 text-xs text-ivory">
              <div className="space-y-1.5">
                <label className="block text-xs uppercase text-muted tracking-wider font-sans font-semibold">Your Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dilhan Perera"
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  className="w-full bg-background border border-gold/25 p-2.5 rounded text-sm text-ivory focus:border-gold outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs uppercase text-muted tracking-wider font-sans font-semibold">Star Rating</label>
                <select
                  value={newRating}
                  onChange={(e) => setNewRating(parseInt(e.target.value))}
                  className="w-full bg-background border border-gold/25 p-2.5 rounded text-sm text-ivory focus:border-gold outline-none cursor-pointer"
                >
                  <option value={5}>★★★★★ (5 Stars - Exceptional)</option>
                  <option value={4}>★★★★☆ (4 Stars - Very Good)</option>
                  <option value={3}>★★★☆☆ (3 Stars - Average)</option>
                  <option value={2}>★★☆☆☆ (2 Stars - Below Average)</option>
                  <option value={1}>★☆☆☆☆ (1 Star - Poor)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs uppercase text-muted tracking-wider font-sans font-semibold">Your Review Comment</label>
                <textarea
                  required
                  placeholder="Share details of your packaging presentation, custom greetings, shipping or concierge support..."
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  maxLength={500}
                  className="w-full bg-background border border-gold/25 p-2.5 rounded text-sm text-ivory focus:border-gold outline-none h-28 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gold hover:bg-gold-light text-background font-bold font-sans text-xs uppercase tracking-widest transition duration-300 shadow-gold-glow mt-4 cursor-pointer"
              >
                Submit Review
              </button>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
