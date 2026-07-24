import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getProducts, type Product } from '../lib/supabase';

const ITEMS_PER_PAGE = 10;

export const Shop = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedOccasions, setSelectedOccasions] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('default');
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [favorites, setFavorites] = useState<number[]>([]);
  const [showMobileFilter, setShowMobileFilter] = useState<boolean>(false);

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const data = await getProducts();
        setProducts(data);
      } catch (err) {
        console.error('[Shop] Error fetching products:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();

    const loadFavs = () => {
      const storedFavs = localStorage.getItem('sparkle_favs');
      if (storedFavs) {
        try {
          setFavorites(JSON.parse(storedFavs));
        } catch (e) {
          setFavorites([]);
        }
      }
    };
    loadFavs();

    window.addEventListener('sparkle_products_updated', fetchProducts);
    return () => {
      window.removeEventListener('sparkle_products_updated', fetchProducts);
    };
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
  const categories = Array.from(new Set(products.map((p: any) => p.category).filter((c): c is string => Boolean(c))));
  const occasions = Array.from(new Set(products.map((p: any) => p.occasion).filter((o): o is string => Boolean(o))));

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
    const pCat = (p as any).category;
    const pOcc = (p as any).occasion;
    const categoryMatch = selectedCategories.length === 0 || (pCat ? selectedCategories.includes(pCat) : false);
    const occasionMatch = selectedOccasions.length === 0 || (pOcc ? selectedOccasions.includes(pOcc) : false);
    const searchMatch = !searchQuery || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (p.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (pCat || '').toLowerCase().includes(searchQuery.toLowerCase());
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



  return (
    <div className="min-h-screen py-6 sm:py-16 px-3 sm:px-6 max-w-7xl mx-auto">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 pb-4 border-b border-gold/15">
        <div>
          <div className="flex items-center gap-2 text-[11px] sm:text-xs text-muted uppercase font-sans font-semibold tracking-widest mb-1">
            <Link to="/" className="hover:text-gold transition">HOME</Link>
            <span>/</span>
            <span className="text-gold">SHOP</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-serif gold-text-gradient tracking-wide">The Signature Collection</h1>
        </div>

        {/* TOP-RIGHT PRODUCT CONTROLS: Customize Gift & Filter Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full md:w-auto">
          {/* Prominent "Customize Your Own Gift" Primary CTA */}
          <Link
            to="/customize-gift"
            className="cta-btn-primary !py-2.5 !px-5 shrink-0"
          >
            <span className="material-symbols-outlined text-[#D4AF37] text-base">auto_awesome</span>
            <span>Customize Your Own Gift</span>
          </Link>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Small "Filter" Button */}
            <button
              type="button"
              onClick={() => setShowMobileFilter(!showMobileFilter)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-charcoal border border-gold/40 text-gold hover:border-gold hover:bg-gold/10 transition-all duration-300 rounded-md font-sans text-xs font-bold uppercase tracking-wider group shrink-0 min-h-[44px]"
            >
              <span className="material-symbols-outlined text-base group-hover:rotate-180 transition-transform duration-300">tune</span>
              <span>Filter</span>
              {(selectedCategories.length > 0 || selectedOccasions.length > 0) && (
                <span className="bg-gold text-background text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-extrabold shadow ml-0.5">
                  {selectedCategories.length + selectedOccasions.length}
                </span>
              )}
            </button>

            {/* Sort By Selector */}
            <div className="flex-1 sm:flex-none">
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                className="w-full bg-background border border-gold/30 text-xs text-ivory px-3 py-2.5 rounded-md focus:border-gold outline-none cursor-pointer tracking-wide font-sans shadow-inner min-h-[44px]"
              >
                <option value="default">Default Sort</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name">Sort by Name</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Item Count Banner */}
      <div className="flex items-center justify-between text-xs text-muted font-sans font-medium uppercase tracking-wider mb-6 bg-charcoal/40 p-2.5 rounded border border-gold/10">
        <div>
          Showing <span className="text-gold font-bold">{totalItems > 0 ? startIndex + 1 : 0}–{endIndex}</span> of <span className="text-gold font-bold">{totalItems}</span> Luxury Curations
        </div>
        {(selectedCategories.length > 0 || selectedOccasions.length > 0) && (
          <button
            type="button"
            onClick={() => { setSelectedCategories([]); setSelectedOccasions([]); setCurrentPage(1); }}
            className="text-gold hover:underline text-[11px] font-bold"
          >
            Clear Active Filters ({selectedCategories.length + selectedOccasions.length})
          </button>
        )}
      </div>

      {/* FILTER PANEL (SLIDE-IN ON MOBILE, DROPDOWN/SIDEBAR ON DESKTOP) */}
      {showMobileFilter && (
        <div className="mb-8 gold-gradient-border p-5 rounded-lg bg-charcoal shadow-2xl relative animate-fadeIn">
          <div className="flex items-center justify-between mb-4 border-b border-gold/15 pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-gold">tune</span>
              <h2 className="text-base font-serif text-gold uppercase tracking-wider">Filter Luxury Curations</h2>
            </div>
            <button
              type="button"
              onClick={() => setShowMobileFilter(false)}
              className="text-muted hover:text-gold transition p-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Category Filter */}
            <div>
              <span className="block text-xs uppercase tracking-wider text-gold mb-3 font-semibold font-sans">
                Filter by Category
              </span>
              <div className="space-y-2.5 text-sm text-ivory max-h-48 overflow-y-auto pr-2 scrollbar-thin">
                {categories.map(cat => (
                  <label key={cat} className="flex items-center gap-2.5 cursor-pointer group hover:text-gold transition">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(cat)}
                      onChange={() => handleCategoryChange(cat)}
                      className="accent-gold h-4 w-4 bg-background border border-gold/30 rounded cursor-pointer"
                    />
                    <span className="text-xs font-sans font-medium">{cat}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Occasion Filter */}
            <div>
              <span className="block text-xs uppercase tracking-wider text-gold mb-3 font-semibold font-sans">
                Filter by Occasion
              </span>
              <div className="space-y-2.5 text-sm text-ivory max-h-48 overflow-y-auto pr-2 scrollbar-thin">
                {occasions.map(occ => (
                  <label key={occ} className="flex items-center gap-2.5 cursor-pointer group hover:text-gold transition">
                    <input
                      type="checkbox"
                      checked={selectedOccasions.includes(occ)}
                      onChange={() => handleOccasionChange(occ)}
                      className="accent-gold h-4 w-4 bg-background border border-gold/30 rounded cursor-pointer"
                    />
                    <span className="text-xs font-sans font-medium">{occ}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gold/15 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => { setSelectedCategories([]); setSelectedOccasions([]); setCurrentPage(1); }}
              className="px-4 py-2 text-xs text-muted hover:text-gold uppercase tracking-wider font-sans"
            >
              Reset Filters
            </button>
            <button
              type="button"
              onClick={() => setShowMobileFilter(false)}
              className="px-5 py-2 bg-gold hover:bg-gold-light text-background font-bold text-xs uppercase tracking-wider font-sans rounded transition shadow min-h-[44px]"
            >
              Apply & Close
            </button>
          </div>
        </div>
      )}

      <div>
        {/* PRODUCTS GRID (10 ITEMS PER PAGE) */}
        <main className="w-full">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
              <p className="text-xs text-muted uppercase tracking-widest font-sans">Loading Gift Boxes…</p>
            </div>
          ) : currentProducts.length === 0 ? (
            <div className="gold-gradient-border bg-charcoal p-12 text-center rounded">
              <span className="material-symbols-outlined text-gold text-4xl mb-2">inventory_2</span>
              <h3 className="font-serif text-xl text-gold mb-1">No Gift Boxes Available Yet</h3>
              <p className="text-xs text-muted font-sans">Check back soon or create your own custom gift box!</p>
              <Link
                to="/customize-gift"
                className="cta-btn-primary inline-flex mt-4"
              >
                <span className="material-symbols-outlined text-[#D4AF37] text-base">auto_awesome</span>
                <span>Customize Your Own Gift</span>
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-6">
                {currentProducts.map((product) => {
                  const isFav = favorites.includes(product.id);
                  const discountPercent = product.old_price && product.old_price > product.price
                    ? Math.round(((product.old_price - product.price) / product.old_price) * 100)
                    : 0;
                  const boxItems: string[] = (product.gift_box_items && product.gift_box_items.length > 0)
                    ? product.gift_box_items.map((gbi): string => {
                        const name = gbi.inventory_items?.name || 'Included Item';
                        return gbi.quantity > 1 ? `${gbi.quantity}x ${name}` : name;
                      })
                    : (product as any).includedItems && (product as any).includedItems.length > 0
                    ? (product as any).includedItems.map((item: any): string => item.quantity > 1 ? `${item.quantity}x ${item.name}` : item.name)
                    : [];

                  return (
                    <div
                      key={product.id}
                      className="gold-gradient-border bg-charcoal p-2 sm:p-3.5 rounded flex flex-col justify-between hover:shadow-gold-glow transition-all duration-300 group relative"
                    >
                      <div>
                        {/* Image Frame with Badges */}
                        <div className="aspect-square bg-background overflow-hidden mb-2.5 rounded border border-gold/15 relative">
                          {(product.image_urls && product.image_urls.length > 0) || (product as any).images?.length > 0 ? (
                            <img
                              src={(product.image_urls && product.image_urls[0]) || (product as any).images?.[0]}
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
                          {(product as any).category || 'Gift Boxes'}
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

                        {/* Included Items in the Box */}
                        <div className="border-t border-gold/15 pt-2 mt-1.5 mb-3 min-h-[3.5rem] flex flex-col justify-start">
                          <div className="flex items-center gap-1.5 text-[10px] font-sans font-bold text-gold uppercase tracking-wider mb-1">
                            <span className="material-symbols-outlined text-[13px] text-gold">inventory_2</span>
                            <span>Items in the box:</span>
                          </div>
                          {boxItems.length > 0 ? (
                            <ul className="text-[10px] sm:text-[11px] text-ivory/85 space-y-0.5 font-sans">
                              {boxItems.slice(0, 3).map((item, idx) => (
                                <li key={idx} className="flex items-center gap-1.5 truncate">
                                  <span className="w-1 h-1 rounded-full bg-gold shrink-0" />
                                  <span className="truncate">{item}</span>
                                </li>
                              ))}
                              {boxItems.length > 3 && (
                                <li className="text-[9px] text-muted italic pl-2.5">
                                  +{boxItems.length - 3} more items...
                                </li>
                              )}
                            </ul>
                          ) : (
                            <div className="text-[10px] text-muted italic flex items-center gap-1 font-sans">
                              <span className="w-1 h-1 rounded-full bg-gold/50 shrink-0" />
                              <span className="truncate">Curated luxury items included</span>
                            </div>
                          )}
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
