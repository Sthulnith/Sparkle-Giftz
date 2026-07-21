import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  old_price?: number;
  category: string;
  occasion: string;
  color: string;
  stock: number;
  is_variable: boolean;
  images?: string[];
}

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 1,
    name: 'The Noir Classic',
    slug: 'the-noir-classic',
    description: 'A timeless statement of elegance, featuring curated artisanal chocolates, premium tea, and a customized greeting card.',
    price: 12500,
    old_price: 14000,
    category: 'Gift Boxes',
    occasion: 'Birthday',
    color: 'Black',
    stock: 25,
    is_variable: false,
    images: ['https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=600&auto=format&fit=crop'],
  },
  {
    id: 2,
    name: 'The Midnight Celebration',
    slug: 'the-midnight-celebration',
    description: 'Our signature matte navy box containing vintage champagne, crystal flutes, and hand-selected dark truffles.',
    price: 18900,
    category: 'Signature Collection',
    occasion: 'Anniversary',
    color: 'Navy',
    stock: 12,
    is_variable: false,
    images: ['https://images.unsplash.com/photo-1513201099705-a9746e1e201f?q=80&w=600&auto=format&fit=crop'],
  },
  {
    id: 3,
    name: 'Velvet Romance',
    slug: 'velvet-romance',
    description: 'A deep crimson box lined with velvet, presenting premium scent diffusers, soy candles, and gold-plated keepsakes.',
    price: 24500,
    old_price: 27000,
    category: 'Signature Collection',
    occasion: 'Romance',
    color: 'Crimson',
    stock: 8,
    is_variable: false,
    images: ['https://images.unsplash.com/photo-1575384978132-c68e146747b0?q=80&w=600&auto=format&fit=crop'],
  },
  {
    id: 4,
    name: 'The Executive Suite',
    slug: 'the-executive-suite',
    description: 'Sleek charcoal magnetic box containing a weighted pen, leather planner, and luxury coffee blend.',
    price: 28500,
    category: 'Custom Curations',
    occasion: 'Corporate Gifts',
    color: 'Charcoal',
    stock: 15,
    is_variable: false,
    images: ['https://images.unsplash.com/photo-1607344645866-009c320c5ab8?q=80&w=600&auto=format&fit=crop'],
  },
  {
    id: 5,
    name: 'Gentle Beginnings',
    slug: 'gentle-beginnings',
    description: 'An organic baby blanket, soft rattle, and hypoallergenic skincare products in a pastel sage box.',
    price: 15600,
    category: 'Gift Boxes',
    occasion: 'Newborn & Baby',
    color: 'Sage',
    stock: 5,
    is_variable: false,
    images: ['https://images.unsplash.com/photo-1512909006721-3d6018887383?q=80&w=600&auto=format&fit=crop'],
  },
  {
    id: 6,
    name: 'Golden Heritage Casing',
    slug: 'golden-heritage-casing',
    description: 'Gold-embossed keepsake wooden box filled with single-origin teas, honey, and artisanal biscuits.',
    price: 32000,
    old_price: 35000,
    category: 'Signature Collection',
    occasion: 'Corporate Gifts',
    color: 'Gold',
    stock: 10,
    is_variable: false,
    images: ['https://images.unsplash.com/photo-1513885535751-8b9238bd47d4?q=80&w=600&auto=format&fit=crop'],
  },
  {
    id: 7,
    name: 'Royal Rose & Champagne',
    slug: 'royal-rose-champagne',
    description: 'Preserved royal pink roses paired with sparkling wine and Belgian chocolate pralines.',
    price: 21500,
    old_price: 23500,
    category: 'Signature Collection',
    occasion: 'Romance',
    color: 'Crimson',
    stock: 0,
    is_variable: false,
    images: ['https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=600&auto=format&fit=crop'],
  },
  {
    id: 8,
    name: 'Artisanal Coffee & Truffles',
    slug: 'artisanal-coffee-truffles',
    description: 'Handcrafted ceramic mug, dark roast Arabica coffee, and gourmet dark chocolate truffles.',
    price: 14200,
    category: 'Gift Boxes',
    occasion: 'Birthday',
    color: 'Black',
    stock: 18,
    is_variable: false,
    images: ['https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=600&auto=format&fit=crop'],
  },
  {
    id: 9,
    name: 'Celestial Harmony Casing',
    slug: 'celestial-harmony-casing',
    description: 'Scented aromatherapy oils, crystal candle holder, and relaxing organic herbal tea infusions.',
    price: 19800,
    old_price: 22000,
    category: 'Custom Curations',
    occasion: 'Anniversary',
    color: 'Navy',
    stock: 7,
    is_variable: false,
    images: ['https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?q=80&w=600&auto=format&fit=crop'],
  },
  {
    id: 10,
    name: 'Blossom & Candle Keepsake',
    slug: 'blossom-candle-keepsake',
    description: 'Hand-poured soy candle with gold accents and everlasting floral arrangement.',
    price: 16500,
    category: 'Gift Boxes',
    occasion: 'Birthday',
    color: 'Sage',
    stock: 14,
    is_variable: false,
    images: ['https://images.unsplash.com/photo-1543294001-f7cd5d7fb516?q=80&w=600&auto=format&fit=crop'],
  },
  {
    id: 11,
    name: 'Luxe Leather & Watch Curation',
    slug: 'luxe-leather-watch-curation',
    description: 'Italian leather watch case, cufflinks, and a gold-accented minimalist timepiece.',
    price: 34000,
    old_price: 38000,
    category: 'Signature Collection',
    occasion: 'Corporate Gifts',
    color: 'Black',
    stock: 4,
    is_variable: false,
    images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=600&auto=format&fit=crop'],
  },
  {
    id: 12,
    name: 'Empress Botanical Velvet',
    slug: 'empress-botanical-velvet',
    description: 'Luxury botanical skincare set with silk eye mask inside a plush velvet casing.',
    price: 26000,
    category: 'Custom Curations',
    occasion: 'Romance',
    color: 'Crimson',
    stock: 0,
    is_variable: false,
    images: ['https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=600&auto=format&fit=crop'],
  },
  {
    id: 13,
    name: 'Vintage Wine & Cheese Set',
    slug: 'vintage-wine-cheese-set',
    description: 'Aged red wine, brass wine opener, stainless cheese knives, and gourmet crackers.',
    price: 29500,
    old_price: 32000,
    category: 'Signature Collection',
    occasion: 'Anniversary',
    color: 'Charcoal',
    stock: 9,
    is_variable: false,
    images: ['https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=600&auto=format&fit=crop'],
  },
  {
    id: 14,
    name: 'Modern Minimalist Monochrome',
    slug: 'modern-minimalist-monochrome',
    description: 'Sleek black thermos tumbler, matte journal, and stainless steel pen in matte box.',
    price: 13800,
    category: 'Gift Boxes',
    occasion: 'Birthday',
    color: 'Black',
    stock: 20,
    is_variable: false,
    images: ['https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=600&auto=format&fit=crop'],
  },
  {
    id: 15,
    name: 'Sweet Delight Birthday Box',
    slug: 'sweet-delight-birthday-box',
    description: 'Assorted macarons, chocolate bark, sparkling soda, and confetti party poppers.',
    price: 11500,
    old_price: 13000,
    category: 'Gift Boxes',
    occasion: 'Birthday',
    color: 'Gold',
    stock: 11,
    is_variable: false,
    images: ['https://images.unsplash.com/photo-1558961363-fa8fdf82db35?q=80&w=600&auto=format&fit=crop'],
  }
];

const ITEMS_PER_PAGE = 10;

export const Shop = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedOccasions, setSelectedOccasions] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('default');
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [favorites, setFavorites] = useState<number[]>([]);
  const [showMobileFilter, setShowMobileFilter] = useState<boolean>(false);

  useEffect(() => {
    const stored = localStorage.getItem('sparkle_products');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Ensure we have ample products for 10-item pagination testing
      if (parsed.length < 10) {
        localStorage.setItem('sparkle_products', JSON.stringify(DEFAULT_PRODUCTS));
        setProducts(DEFAULT_PRODUCTS);
      } else {
        setProducts(parsed);
      }
    } else {
      localStorage.setItem('sparkle_products', JSON.stringify(DEFAULT_PRODUCTS));
      setProducts(DEFAULT_PRODUCTS);
    }

    const storedFavs = localStorage.getItem('sparkle_favs');
    if (storedFavs) {
      try {
        setFavorites(JSON.parse(storedFavs));
      } catch (e) {
        setFavorites([]);
      }
    }
  }, []);

  const toggleFavorite = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorites(prev => {
      const updated = prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id];
      localStorage.setItem('sparkle_favs', JSON.stringify(updated));
      return updated;
    });
  };

  // Get unique categories and occasions for filter lists
  const categories = Array.from(new Set(products.map((p) => p.category)));
  const occasions = Array.from(new Set(products.map((p) => p.occasion)));

  const handleCategoryChange = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
    setCurrentPage(1);
  };

  const handleOccasionChange = (occ: string) => {
    setSelectedOccasions(prev =>
      prev.includes(occ) ? prev.filter(o => o !== occ) : [...prev, occ]
    );
    setCurrentPage(1);
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    setCurrentPage(1);
  };

  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  // Filter & Sort logic
  const filteredProducts = products.filter(p => {
    const categoryMatch = selectedCategories.length === 0 || selectedCategories.includes(p.category);
    const occasionMatch = selectedOccasions.length === 0 || selectedOccasions.includes(p.occasion);
    const searchMatch = !searchQuery || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return categoryMatch && occasionMatch && searchMatch;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price-asc') return a.price - b.price;
    if (sortBy === 'price-desc') return b.price - a.price;
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return 0; // Default
  });

  // Pagination Logic (10 items per page)
  const totalItems = sortedProducts.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
  const currentProducts = sortedProducts.slice(startIndex, endIndex);

  // Map color names to Tailwind CSS color classes for swatches
  const getColorSwatches = (colorName: string) => {
    const name = colorName.toLowerCase();
    if (name.includes('black')) return ['#111827', '#374151', '#4b5563'];
    if (name.includes('navy')) return ['#1e3a8a', '#2563eb', '#3b82f6'];
    if (name.includes('crimson')) return ['#991b1b', '#dc2626', '#ef4444'];
    if (name.includes('charcoal')) return ['#1f2937', '#4b5563', '#6b7280'];
    if (name.includes('sage')) return ['#065f46', '#10b981', '#34d399'];
    return ['#c9a227', '#d4af37', '#fef08a'];
  };

  return (
    <div className="min-h-screen py-6 sm:py-16 px-3 sm:px-6 max-w-7xl mx-auto">
      {/* Top Header & Breadcrumbs matching Image 1 */}
      <div className="text-center mb-6 space-y-2">
        <div className="flex items-center justify-center gap-2 text-[11px] sm:text-xs text-muted uppercase font-sans font-semibold tracking-widest">
          <Link to="/" className="hover:text-gold transition">HOME</Link>
          <span>/</span>
          <span className="text-gold">SHOP</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-serif gold-text-gradient tracking-wide">The Signature Collection</h1>
      </div>

      {/* Premium Luxury Toolbar for Filter & Sort Controls */}
      <div className="gold-gradient-border bg-charcoal/90 backdrop-blur-md p-3 rounded-lg mb-8 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Left: Filter Toggle Button */}
        <button
          onClick={() => setShowMobileFilter(!showMobileFilter)}
          className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-5 py-2.5 bg-gradient-to-r from-gold/20 via-gold/10 to-transparent border border-gold/40 text-gold hover:border-gold hover:shadow-gold-glow transition-all duration-300 rounded font-sans text-xs font-bold uppercase tracking-widest group"
        >
          <span className="material-symbols-outlined text-base group-hover:rotate-180 transition-transform duration-300">tune</span>
          <span>FILTER</span>
          {(selectedCategories.length > 0 || selectedOccasions.length > 0) && (
            <span className="bg-gold text-background text-[10px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-extrabold ml-1 shadow">
              {selectedCategories.length + selectedOccasions.length}
            </span>
          )}
        </button>

        {/* Center: Items Count Info */}
        <div className="text-xs text-muted font-sans font-medium uppercase tracking-wider text-center">
          Showing <span className="text-gold font-bold">{totalItems > 0 ? startIndex + 1 : 0}–{endIndex}</span> of <span className="text-gold font-bold">{totalItems}</span> Luxury Curations
        </div>

        {/* Right: Sort By Dropdown */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="hidden md:inline-block text-[11px] uppercase tracking-wider text-muted font-sans font-medium">SORT BY:</span>
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className="w-full sm:w-auto bg-background border border-gold/30 text-xs text-ivory px-3.5 py-2.5 rounded focus:border-gold focus:ring-1 focus:ring-gold outline-none cursor-pointer tracking-wide font-sans shadow-inner"
          >
            <option value="default">Default sorting</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="name">Sort by name</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* FILTERS SIDEBAR */}
        <aside className={`${showMobileFilter ? 'block' : 'hidden md:block'} md:col-span-1 space-y-6 transition-all duration-300`}>
          <div className="gold-gradient-border p-5 rounded bg-charcoal">
            <div className="flex items-center justify-between mb-4 border-b border-gold/10 pb-2">
              <h2 className="text-base font-serif text-gold uppercase tracking-wider">Filter By</h2>
              {(selectedCategories.length > 0 || selectedOccasions.length > 0) && (
                <button
                  onClick={() => { setSelectedCategories([]); setSelectedOccasions([]); setCurrentPage(1); }}
                  className="text-[10px] text-muted hover:text-gold uppercase tracking-wider font-sans"
                >
                  Clear All
                </button>
              )}
            </div>
            
            {/* Category Filter */}
            <div className="mb-6">
              <span className="block text-xs uppercase tracking-wider text-muted mb-3 font-semibold">Category</span>
              <div className="space-y-2 text-sm text-ivory">
                {categories.map(cat => (
                  <label key={cat} className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(cat)}
                      onChange={() => handleCategoryChange(cat)}
                      className="accent-gold h-4 w-4 bg-background border border-gold/20 rounded cursor-pointer"
                    />
                    <span className="group-hover:text-gold transition text-xs font-sans font-medium">{cat}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Occasion Filter */}
            <div>
              <span className="block text-xs uppercase tracking-wider text-muted mb-3 font-semibold">Occasion</span>
              <div className="space-y-2 text-sm text-ivory">
                {occasions.map(occ => (
                  <label key={occ} className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedOccasions.includes(occ)}
                      onChange={() => handleOccasionChange(occ)}
                      className="accent-gold h-4 w-4 bg-background border border-gold/20 rounded cursor-pointer"
                    />
                    <span className="group-hover:text-gold transition text-xs font-sans font-medium">{occ}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* PRODUCTS GRID (10 ITEMS PER PAGE) */}
        <main className={`${showMobileFilter ? 'md:col-span-3' : 'md:col-span-4 lg:col-span-4'}`}>
          {currentProducts.length === 0 ? (
            <div className="gold-gradient-border bg-charcoal p-12 text-center rounded">
              <span className="material-symbols-outlined text-gold text-4xl mb-2">sentiment_dissatisfied</span>
              <h3 className="font-serif text-xl text-gold mb-1">No Gift Boxes Found</h3>
              <p className="text-xs text-muted font-sans">Try selecting a different filter combination.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-2.5 sm:gap-5">
                {currentProducts.map((product) => {
                  const isFav = favorites.includes(product.id);
                  const discountPercent = product.old_price && product.old_price > product.price
                    ? Math.round(((product.old_price - product.price) / product.old_price) * 100)
                    : 0;
                  const swatches = getColorSwatches(product.color || '');

                  return (
                    <div
                      key={product.id}
                      className="gold-gradient-border bg-charcoal p-2 sm:p-3.5 rounded flex flex-col justify-between hover:shadow-gold-glow transition-all duration-300 group relative"
                    >
                      <div>
                        {/* Image Frame with Badges */}
                        <div className="aspect-square bg-background overflow-hidden mb-2.5 rounded border border-gold/15 relative">
                          {product.images && product.images.length > 0 ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted uppercase font-sans text-[10px]">
                              No Image Available
                            </div>
                          )}

                          {/* Top-Left Discount Badge (-25% rounded badge) */}
                          {discountPercent > 0 && (
                            <div className="absolute top-2 left-2 z-10 bg-[#e53935] text-white text-[10px] sm:text-xs font-extrabold rounded-full w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center shadow-lg border border-white/20">
                              -{discountPercent}%
                            </div>
                          )}

                          {/* Top-Right Favorite Heart Icon */}
                          <button
                            type="button"
                            onClick={(e) => toggleFavorite(e, product.id)}
                            className={`absolute top-2 right-2 z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/50 backdrop-blur-xs border border-white/20 flex items-center justify-center transition ${
                              isFav ? 'text-red-500 bg-white/90' : 'text-ivory hover:text-red-400 hover:bg-black/80'
                            }`}
                            aria-label="Add to wishlist"
                          >
                            <span className="material-symbols-outlined text-sm sm:text-base">
                              {isFav ? 'favorite' : 'favorite_border'}
                            </span>
                          </button>

                          {/* Center OUT OF STOCK translucent overlay banner */}
                          {product.stock <= 0 && (
                            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-black/75 backdrop-blur-xs py-2 sm:py-3 text-center border-y border-white/10 z-10">
                              <span className="text-white text-[10px] sm:text-xs font-extrabold tracking-widest uppercase block">
                                OUT OF STOCK
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Category */}
                        <span className="text-[9px] sm:text-[10px] text-muted uppercase tracking-wider font-sans font-medium block mb-0.5 truncate">
                          {product.category}
                        </span>

                        {/* Product Title */}
                        <h3 className="font-serif text-xs sm:text-sm font-semibold text-ivory line-clamp-2 leading-tight mb-2 group-hover:text-gold transition min-h-[2rem] sm:min-h-[2.5rem]">
                          {product.name}
                        </h3>

                        {/* Pricing Display */}
                        <div className="flex flex-wrap items-baseline gap-1 mb-1.5 font-sans">
                          {product.old_price && (
                            <span className="text-[10px] sm:text-xs text-muted line-through">
                              Rs.{product.old_price.toLocaleString()}.00
                            </span>
                          )}
                          <span className="text-xs sm:text-sm text-gold font-bold">
                            Rs.{product.price.toLocaleString()}.00
                          </span>
                        </div>

                        {/* Installment & Cashback info */}
                        <div className="text-[9px] sm:text-[10px] text-muted/90 font-sans space-y-0.5 border-t border-gold/10 pt-1.5 mb-2">
                          <div className="flex items-center gap-1">
                            <span>3 X Rs. {(product.price / 3).toFixed(2)}</span>
                            <span className="bg-gold/15 text-gold text-[8px] px-1 rounded">KOKO</span>
                          </div>
                          <div className="text-[8px] sm:text-[9px] text-gold/80 truncate">
                            or up to 4 X Rs. {(product.price / 4).toFixed(2)} with PayZy
                          </div>
                        </div>

                        {/* Color swatches */}
                        <div className="flex items-center gap-1 mb-3">
                          {swatches.map((hex, idx) => (
                            <span
                              key={idx}
                              className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-sm border border-gold/30 shadow-xs inline-block"
                              style={{ backgroundColor: hex }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Bottom Action Button */}
                      <Link
                        to={`/product/${product.slug}`}
                        className="block text-center w-full py-1.5 sm:py-2.5 bg-[#1b2238] hover:bg-gold hover:text-background border border-gold/30 text-ivory font-semibold text-[10px] sm:text-xs font-sans uppercase tracking-wider transition duration-300 rounded-sm"
                      >
                        {product.stock > 0 ? 'SELECT OPTIONS' : 'READ MORE'}
                      </Link>
                    </div>
                  );
                })}
              </div>

              {/* PAGINATION NAVIGATOR CONTROLS MATCHING IMAGE 1 (< 1 2 3 >) */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10 pt-6 border-t border-gold/15">
                  {/* Previous Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPage(prev => Math.max(1, prev - 1));
                      window.scrollTo({ top: 180, behavior: 'smooth' });
                    }}
                    disabled={currentPage === 1}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center transition-all duration-300 ${
                      currentPage === 1
                        ? 'border-gold/10 text-muted/30 cursor-not-allowed'
                        : 'border-gold/30 text-gold hover:border-gold hover:bg-gold/10 hover:shadow-gold-glow cursor-pointer'
                    }`}
                    aria-label="Previous page"
                  >
                    <span className="material-symbols-outlined text-base">chevron_left</span>
                  </button>

                  {/* Page Number Buttons */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => {
                        setCurrentPage(page);
                        window.scrollTo({ top: 180, behavior: 'smooth' });
                      }}
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full font-sans font-semibold text-xs sm:text-sm transition-all duration-300 flex items-center justify-center cursor-pointer ${
                        currentPage === page
                          ? 'bg-[#1b2238] text-gold font-bold border-2 border-gold shadow-gold-glow scale-105'
                          : 'border border-gold/30 text-ivory hover:border-gold hover:text-gold hover:bg-gold/10'
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  {/* Next Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPage(prev => Math.min(totalPages, prev + 1));
                      window.scrollTo({ top: 180, behavior: 'smooth' });
                    }}
                    disabled={currentPage === totalPages}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center transition-all duration-300 ${
                      currentPage === totalPages
                        ? 'border-gold/10 text-muted/30 cursor-not-allowed'
                        : 'border-gold/30 text-gold hover:border-gold hover:bg-gold/10 hover:shadow-gold-glow cursor-pointer'
                    }`}
                    aria-label="Next page"
                  >
                    <span className="material-symbols-outlined text-base">chevron_right</span>
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};
