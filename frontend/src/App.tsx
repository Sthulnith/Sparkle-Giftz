import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Home } from './pages/Home';
import { Shop } from './pages/Shop';
import { ProductDetail } from './pages/ProductDetail';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { Reviews } from './pages/Reviews';
import { Contact } from './pages/Contact';
import { Admin } from './pages/Admin';
import { Login } from './pages/Login';
import { MyOrders } from './pages/MyOrders';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Policies } from './pages/Policies';
import { CustomizeGift } from './pages/CustomizeGift';
import logo from './assets/logo.png';

const queryClient = new QueryClient();

function HeaderNav({ cartCount }: { cartCount: number }) {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const navigate = useNavigate();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsMenuOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <>
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-gold/20 transition-all duration-300 shadow-[0_2px_20px_rgba(212,175,55,0.08)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex justify-between items-center">
          
          {/* Mobile Hamburger Menu Icon (☰) matching Image 2 */}
          {/* Mobile Hamburger Menu Icon */}
          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            className="md:hidden p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-ivory hover:text-gold transition focus:outline-none"
            aria-label="Open Navigation Menu"
          >
            <span className="material-symbols-outlined text-2xl sm:text-3xl">menu</span>
          </button>

          {/* Brand Logo & Title */}
          <Link to="/" className="flex items-center gap-2 sm:gap-3 group">
            <img src={logo} alt="Sparkle Giftz Logo" className="h-10 sm:h-14 w-auto object-contain transition-transform duration-300 group-hover:scale-105 drop-shadow-[0_0_8px_rgba(212,175,55,0.5)]" />
            <span className="text-sm sm:text-2xl font-serif font-bold tracking-[0.12em] sm:tracking-[0.22em] gold-sparkle-text truncate" style={{ textShadow: '0 0 18px rgba(212,175,55,0.55), 0 1px 4px rgba(0,0,0,0.6)' }}>
              {["S", "P", "A", "R", "K", "L", "E", "\u00A0", "G", "I", "F", "T", "Z"].map((char, index) => (
                <span
                  key={index}
                  className="inline-block animate-letter-reveal"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  {char}
                </span>
              ))}
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex gap-8 text-sm font-medium tracking-wide">
            <Link to="/" className="hover:text-gold transition duration-200">Home</Link>
            <Link to="/shop" className="hover:text-gold transition duration-200">Shop</Link>
            <Link to="/customize-gift" className="hover:text-gold text-gold font-bold transition duration-200 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">auto_awesome</span>
              Customize Gift
            </Link>
            <Link to="/reviews" className="hover:text-gold transition duration-200">Reviews</Link>
            <Link to="/contact" className="hover:text-gold transition duration-200">Contact</Link>
            <Link to="/policies" className="hover:text-gold transition duration-200">Policies</Link>
          </nav>

          {/* Header Action Icons */}
          <div className="flex items-center gap-3 sm:gap-6">
            <Link to="/cart" className="relative hover:text-gold transition duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">shopping_bag</span>
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 bg-gold text-background font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow">
                  {cartCount}
                </span>
              )}
            </Link>
            <Link to="/login" className="hover:text-gold transition duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">person</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile Slide-Out Side Navigation Drawer */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Dark Translucent Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Drawer Container (Sliding from Left) */}
          <div className="relative w-[85%] max-w-[320px] bg-[#14171f] border-r border-gold/25 h-full flex flex-col justify-between z-50 overflow-y-auto shadow-2xl p-5">
            
            {/* Drawer Top Header & Search Bar */}
            <div>
              {/* Header & Close Button */}
              <div className="flex items-center justify-between pb-4 border-b border-gold/15 mb-5">
                <div className="flex items-center gap-2">
                  <img src={logo} alt="Sparkle Giftz" className="h-7 w-auto object-contain" />
                  <span className="font-serif text-sm font-bold text-gold tracking-wider">Sparkle Giftz</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted hover:text-gold transition"
                  aria-label="Close menu"
                >
                  <span className="material-symbols-outlined text-2xl">close</span>
                </button>
              </div>

              {/* Search Bar */}
              <form onSubmit={handleSearchSubmit} className="flex items-center mb-6">
                <input
                  type="text"
                  placeholder="Search gift boxes, watches, perfumes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-grow bg-background border border-gold/30 border-r-0 text-ivory text-xs px-3 py-2.5 rounded-l outline-none focus:border-gold placeholder:text-muted/60 min-h-[44px]"
                />
                <button
                  type="submit"
                  className="bg-[#e53935] hover:bg-red-600 text-white px-4 py-2.5 rounded-r font-bold transition flex items-center justify-center shadow min-h-[44px]"
                  aria-label="Search"
                >
                  <span className="material-symbols-outlined text-base">search</span>
                </button>
              </form>

              {/* Navigation Links */}
              <nav className="flex flex-col text-xs font-bold uppercase tracking-widest space-y-1">
                <Link
                  to="/"
                  onClick={() => setIsMenuOpen(false)}
                  className="py-3 px-3 border-b border-gold/10 text-ivory hover:text-gold hover:bg-gold/5 rounded transition flex items-center justify-between min-h-[44px]"
                >
                  <span>HOME</span>
                  <span className="material-symbols-outlined text-xs text-gold/50">chevron_right</span>
                </Link>
                <Link
                  to="/shop"
                  onClick={() => setIsMenuOpen(false)}
                  className="py-3 px-3 border-b border-gold/10 text-ivory hover:text-gold hover:bg-gold/5 rounded transition flex items-center justify-between min-h-[44px]"
                >
                  <span>SHOP</span>
                  <span className="material-symbols-outlined text-xs text-gold/50">chevron_right</span>
                </Link>
                <Link
                  to="/customize-gift"
                  onClick={() => setIsMenuOpen(false)}
                  className="py-3 px-3 border-b border-gold/10 text-gold hover:bg-gold/10 rounded transition flex items-center justify-between min-h-[44px] bg-gold/5"
                >
                  <span className="flex items-center gap-1.5 font-extrabold">
                    <span className="material-symbols-outlined text-sm">auto_awesome</span>
                    CUSTOMIZE YOUR OWN GIFT
                  </span>
                  <span className="material-symbols-outlined text-xs text-gold">chevron_right</span>
                </Link>
                <Link
                  to="/reviews"
                  onClick={() => setIsMenuOpen(false)}
                  className="py-3 px-3 border-b border-gold/10 text-ivory hover:text-gold hover:bg-gold/5 rounded transition flex items-center justify-between min-h-[44px]"
                >
                  <span>CUSTOMER REVIEWS</span>
                  <span className="material-symbols-outlined text-xs text-gold/50">chevron_right</span>
                </Link>
                <Link
                  to="/contact"
                  onClick={() => setIsMenuOpen(false)}
                  className="py-3 px-3 border-b border-gold/10 text-ivory hover:text-gold hover:bg-gold/5 rounded transition flex items-center justify-between min-h-[44px]"
                >
                  <span>CONTACT US</span>
                  <span className="material-symbols-outlined text-xs text-gold/50">chevron_right</span>
                </Link>
                <Link
                  to="/policies"
                  onClick={() => setIsMenuOpen(false)}
                  className="py-3 px-3 border-b border-gold/10 text-ivory hover:text-gold hover:bg-gold/5 rounded transition flex items-center justify-between min-h-[44px]"
                >
                  <span>POLICIES</span>
                  <span className="material-symbols-outlined text-xs text-gold/50">chevron_right</span>
                </Link>
                <Link
                  to="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="py-3 px-3 border-b border-gold/10 text-ivory hover:text-gold hover:bg-gold/5 rounded transition flex items-center justify-between min-h-[44px]"
                >
                  <span>LOGIN</span>
                  <span className="material-symbols-outlined text-xs text-gold/50">chevron_right</span>
                </Link>
              </nav>
            </div>

            {/* Drawer Bottom Section: Socials & Contact Info matching Image 1 */}
            <div className="pt-6 border-t border-gold/15 space-y-4">
              {/* Social Icons matching Image 1 */}
              <div className="flex items-center gap-4 text-gold/80">
                <a href="https://www.facebook.com/share/1BAPjxJXSv/?mibextid=wwXIfr" target="_blank" rel="noreferrer" className="hover:text-gold transition">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <a href="#" className="hover:text-gold transition">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
                <a href="#" className="hover:text-gold transition">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.82.57-1.31 1.54-1.37 2.52-.08 1.16.45 2.34 1.39 2.98.92.65 2.16.82 3.23.47 1.05-.33 1.89-1.17 2.23-2.22.25-.72.29-1.5.28-2.25V.02z"/></svg>
                </a>
              </div>

              {/* Address and Contact info matching Image 1 */}
              <div className="text-[11px] text-muted space-y-1 font-sans">
                <p>373, Pahala Bomiriya, Kaduwela</p>
                <p>+94 72 348 7062</p>
                <p className="text-gold/90 truncate">sparklegiftzz1@gmail.com</p>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}

function App() {
  const [cartCount, setCartCount] = useState<number>(0);

  const updateCartCount = () => {
    const cartStr = localStorage.getItem('sparkle_cart');
    if (cartStr) {
      try {
        const cart = JSON.parse(cartStr);
        const total = cart.reduce((sum: number, item: any) => sum + item.quantity, 0);
        setCartCount(total);
      } catch (e) {
        setCartCount(0);
      }
    } else {
      setCartCount(0);
    }
  };

  useEffect(() => {
    updateCartCount();
    window.addEventListener('sparkle_cart_updated', updateCartCount);
    return () => window.removeEventListener('sparkle_cart_updated', updateCartCount);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="flex flex-col min-h-screen bg-background text-ivory selection:bg-gold selection:text-background">
          {/* Announcement Bar */}
          <div className="bg-gold text-background text-center py-2 text-xs font-semibold tracking-wider uppercase">
            Complimentary Premium Delivery for Colombo & Suburbs
          </div>

          {/* Header Navigation with Mobile Drawer */}
          <HeaderNav cartCount={cartCount} />

          {/* Page Routing */}
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/customize-gift" element={<CustomizeGift />} />
              <Route path="/product/:slug" element={<ProductDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/reviews" element={<Reviews />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/admin"     element={<ProtectedRoute><Admin /></ProtectedRoute>} />
              <Route path="/login"     element={<Login />} />
              <Route path="/my-orders" element={<MyOrders />} />
              <Route path="/policies" element={<Policies />} />
            </Routes>
          </main>

          {/* Footer */}
          <footer className="bg-charcoal border-t border-gold/15 py-8 sm:py-12 px-4 sm:px-6">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6 sm:gap-8 mb-6 sm:mb-8 text-sm">
              {/* Brand & Address */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <img src={logo} alt="Sparkle Giftz Logo" className="h-7 sm:h-8 w-auto object-contain" />
                  <h3 className="font-serif text-base sm:text-lg text-gold">Sparkle Giftz</h3>
                </div>
                <div className="space-y-2 text-xs text-muted">
                  <p className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-sm text-gold mt-0.5 shrink-0">location_on</span>
                    <span>373, Pahala Bomiriya, Kaduwela</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                    <p className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-gold shrink-0">phone</span>
                      <span>+94 72 348 7062</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-gold shrink-0">mail</span>
                      <a href="mailto:sparklegiftzz1@gmail.com" className="hover:text-gold transition">sparklegiftzz1@gmail.com</a>
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Links & Support Policies */}
              <div className="grid grid-cols-2 gap-4 md:col-span-2 md:grid-cols-2">
                <div>
                  <h4 className="font-semibold text-gold mb-2.5 text-xs uppercase tracking-wider font-sans">Quick Links</h4>
                  <ul className="space-y-2 text-xs">
                    <li><Link to="/" className="text-muted hover:text-gold transition">Home</Link></li>
                    <li><Link to="/shop" className="text-muted hover:text-gold transition">Shop</Link></li>
                    <li><Link to="/reviews" className="text-muted hover:text-gold transition">Guest Reviews</Link></li>
                    <li><Link to="/contact" className="text-muted hover:text-gold transition">Get in Touch</Link></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gold mb-2.5 text-xs uppercase tracking-wider font-sans">Support & Policies</h4>
                  <ul className="space-y-2 text-xs">
                    <li><Link to="/policies" className="text-muted hover:text-gold transition">Terms & Privacy</Link></li>
                    <li><Link to="/policies" className="text-muted hover:text-gold transition">Returns & Refunds</Link></li>
                    <li><Link to="/policies" className="text-muted hover:text-gold transition">Delivery Information</Link></li>
                  </ul>
                </div>
              </div>

              {/* Concierge Desk */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gold text-xs uppercase tracking-wider font-sans">Concierge Desk</h4>
                <p className="text-xs text-muted leading-tight">Want to chat first? Get in touch via WhatsApp or Facebook.</p>
                <div className="grid grid-cols-2 sm:grid-cols-1 gap-2.5">
                  <a
                    href="https://wa.me/94723487062"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 w-full py-2 bg-[#25D366] hover:bg-[#20ba59] text-white font-semibold text-[11px] sm:text-xs rounded transition duration-300 font-sans tracking-wider"
                  >
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current shrink-0">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.449 5.4 0 9.794-4.394 9.797-9.793.001-2.614-1.015-5.07-2.863-6.92s-4.307-2.863-6.918-2.863c-5.399 0-9.796 4.395-9.799 9.796-.002 1.542.41 3.01 1.194 4.269l-1.018 3.716 3.829-.998c1.22.664 2.502.999 3.352.999z" />
                    </svg>
                    <span className="truncate">072 348 7062</span>
                  </a>

                  <a
                    href="https://www.facebook.com/share/1BAPjxJXSv/?mibextid=wwXIfr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full py-2 bg-[#1877F2] hover:bg-[#166fe5] text-white font-semibold text-[11px] sm:text-xs rounded transition duration-300 font-sans tracking-wider"
                  >
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current shrink-0">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                    <span className="truncate">Facebook Page</span>
                  </a>
                </div>
              </div>
            </div>
            <div className="section-divider mb-4 sm:mb-6"></div>
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center text-[11px] sm:text-xs text-muted gap-1 text-center sm:text-left">
              <p>&copy; {new Date().getFullYear()} Sparkle Giftz (Pvt) Ltd. All Rights Reserved.</p>
              <p className="tracking-wider">SPARKLE GIFTZ LUXURY</p>
            </div>
          </footer>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
