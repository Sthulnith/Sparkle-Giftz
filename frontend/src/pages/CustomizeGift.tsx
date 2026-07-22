import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getEnabledInventoryItems } from '../lib/supabase';

export interface CustomProductItem {
  id: number | string;
  sku: string;
  name: string;
  category: string;
  price: number;
  costPrice?: number;
  stock: number;
  lowStockThreshold: number;
  enabled: boolean;
  image: string;
  description?: string;
}

export interface SelectedCustomItem extends CustomProductItem {
  quantity: number;
}

export interface CustomGiftDetails {
  boxSize: 'Small' | 'Medium' | 'Large';
  boxColor: string;
  ribbonColor: string;
  greetingCard: string;
  wrapping: string;
  giftMessage: string;
  items: SelectedCustomItem[];
  boxPrice: number;
  itemsSubtotal: number;
  totalPrice: number;
}

const BOX_SIZES = [
  {
    id: 'Small' as const,
    name: 'Small Luxury Box',
    capacity: 'Ideal for 2 - 4 luxury items',
    price: 1500,
    dimensions: '20 x 15 x 10 cm',
    icon: 'package_2',
  },
  {
    id: 'Medium' as const,
    name: 'Medium Executive Curation',
    capacity: 'Ideal for 5 - 7 luxury items',
    price: 2500,
    dimensions: '30 x 22 x 12 cm',
    badge: 'MOST POPULAR',
    icon: 'inventory_2',
  },
  {
    id: 'Large' as const,
    name: 'Large Grand Keepsake Curation',
    capacity: 'Ideal for 8 - 12+ luxury items',
    price: 3800,
    dimensions: '40 x 30 x 15 cm',
    icon: 'card_giftcard',
  },
];

const BOX_COLORS = [
  { name: 'Onyx Black', hex: '#111827', bgClass: 'bg-gray-900', borderHex: '#374151' },
  { name: 'Midnight Navy', hex: '#1e3a8a', bgClass: 'bg-blue-950', borderHex: '#2563eb' },
  { name: 'Royal Crimson', hex: '#991b1b', bgClass: 'bg-red-950', borderHex: '#dc2626' },
  { name: 'Charcoal Grey', hex: '#1f2937', bgClass: 'bg-gray-800', borderHex: '#4b5563' },
  { name: 'Emerald Sage', hex: '#065f46', bgClass: 'bg-emerald-950', borderHex: '#10b981' },
  { name: 'Champagne Gold', hex: '#d4af37', bgClass: 'bg-amber-700', borderHex: '#f59e0b' },
];

const WRAPPING_OPTIONS = [
  'Signature Matte Black & Gold Foil',
  'Satin Red & Gold Ribbon Curation',
  'Velvet Emerald & Gold Seal',
  'Minimalist Parchment & Wax Stamp',
];

const RIBBON_OPTIONS = ['Sparkle Gold', 'Crimson Velvet', 'Royal Navy', 'Metallic Silver', 'Emerald Green'];

const CARD_OPTIONS = ['Happy Birthday', 'Happy Anniversary', 'With Love & Best Wishes', 'Congratulations', 'Thank You', 'Just For You'];

export const CustomizeGift: React.FC = () => {
  const navigate = useNavigate();

  // Customization state
  const [selectedBoxSize, setSelectedBoxSize] = useState<'Small' | 'Medium' | 'Large'>('Medium');
  const [selectedBoxColor, setSelectedBoxColor] = useState<string>('Onyx Black');
  const [selectedItems, setSelectedItems] = useState<Record<string | number, SelectedCustomItem>>({});
  const [selectedWrapping, setSelectedWrapping] = useState<string>(WRAPPING_OPTIONS[0]);
  const [selectedRibbon, setSelectedRibbon] = useState<string>(RIBBON_OPTIONS[0]);
  const [selectedCard, setSelectedCard] = useState<string>(CARD_OPTIONS[0]);
  const [customMessage, setCustomMessage] = useState<string>('');

  // Catalog filtering
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [availableProducts, setAvailableProducts] = useState<CustomProductItem[]>([]);

  // Load custom inventory directly from Supabase
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const invItems = await getEnabledInventoryItems();
        const mapped: CustomProductItem[] = invItems.map(item => ({
          id: item.id,
          sku: item.sku,
          name: item.name,
          category: item.category,
          price: Number(item.price),
          stock: item.stock,
          lowStockThreshold: item.low_stock_threshold,
          enabled: item.enabled,
          image: item.image_url || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=600&auto=format&fit=crop',
          description: item.description || '',
        }));
        setAvailableProducts(mapped);
      } catch (err) {
        console.error('[CustomizeGift] Error loading inventory:', err);
      }
    };
    fetchInventory();
  }, []);

  // Compute categories
  const categories = ['All', ...Array.from(new Set(availableProducts.map(p => p.category)))];

  // Filtering products
  const filteredProducts = availableProducts.filter(p => {
    const categoryMatch = activeCategory === 'All' || p.category === activeCategory;
    const searchMatch = !searchQuery || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return categoryMatch && searchMatch;
  });

  // Calculate pricing
  const currentBoxConfig = BOX_SIZES.find(b => b.id === selectedBoxSize) || BOX_SIZES[1];
  const itemsList = Object.values(selectedItems);
  const itemsSubtotal = itemsList.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItemCount = itemsList.reduce((sum, item) => sum + item.quantity, 0);
  const grandTotal = currentBoxConfig.price + itemsSubtotal;

  // Handle adding / quantity modification with stock enforcement
  const handleAddItem = (product: CustomProductItem) => {
    if (product.stock <= 0) {
      alert(`Sorry, "${product.name}" is currently out of stock.`);
      return;
    }
    setSelectedItems(prev => {
      const existing = prev[product.id];
      const currentQty = existing ? existing.quantity : 0;
      if (currentQty >= product.stock) {
        alert(`Only ${product.stock} units of "${product.name}" are available in stock.`);
        return prev;
      }
      return {
        ...prev,
        [product.id]: {
          ...product,
          quantity: currentQty + 1,
        },
      };
    });
  };

  const handleUpdateQuantity = (productId: number | string, delta: number) => {
    setSelectedItems(prev => {
      const existing = prev[productId];
      if (!existing) return prev;
      const newQty = existing.quantity + delta;
      if (delta > 0 && newQty > existing.stock) {
        alert(`Only ${existing.stock} units of "${existing.name}" are available in stock.`);
        return prev;
      }
      if (newQty <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return {
        ...prev,
        [productId]: {
          ...existing,
          quantity: newQty,
        },
      };
    });
  };

  const handleRemoveItem = (productId: number | string) => {
    setSelectedItems(prev => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
  };

  // Add to cart & redirect to checkout
  const handleAddToCartAndCheckout = () => {
    if (itemsList.length === 0) {
      alert('Please add at least one luxury product to your gift box before proceeding.');
      return;
    }

    const boxColorObj = BOX_COLORS.find(c => c.name === selectedBoxColor);
    const boxColorHex = boxColorObj ? boxColorObj.hex : '#111827';
    
    // Choose representative image
    const customImage = itemsList[0]?.image || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=600&auto=format&fit=crop';

    const customCartItem = {
      productId: `custom-${Date.now()}`,
      name: `Customized ${selectedBoxSize} Gift Box (${selectedBoxColor})`,
      slug: 'customized-luxury-gift-box',
      price: grandTotal,
      quantity: 1,
      wrapping: `${selectedWrapping} · Ribbon: ${selectedRibbon}`,
      giftMessage: customMessage.trim() || `Card: ${selectedCard}`,
      image: customImage,
      isCustom: true,
      customDetails: {
        boxSize: selectedBoxSize,
        boxColor: selectedBoxColor,
        boxColorHex: boxColorHex,
        ribbonColor: selectedRibbon,
        greetingCard: selectedCard,
        wrapping: selectedWrapping,
        giftMessage: customMessage.trim(),
        boxPrice: currentBoxConfig.price,
        itemsSubtotal: itemsSubtotal,
        totalPrice: grandTotal,
        items: itemsList.map(item => ({
          id: item.id,
          name: item.name,
          category: item.category,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
        })),
      },
    };

    // Save to localStorage sparkle_cart
    const cartStr = localStorage.getItem('sparkle_cart');
    let existingCart = [];
    if (cartStr) {
      try {
        existingCart = JSON.parse(cartStr);
      } catch (e) {
        existingCart = [];
      }
    }

    existingCart.push(customCartItem);
    localStorage.setItem('sparkle_cart', JSON.stringify(existingCart));
    window.dispatchEvent(new Event('sparkle_cart_updated'));

    // Redirect straight to checkout
    navigate('/checkout');
  };

  return (
    <div className="min-h-screen py-8 sm:py-16 px-4 sm:px-6 max-w-7xl mx-auto space-y-8 sm:space-y-12">
      {/* Header Banner */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2 text-xs text-muted uppercase font-sans font-semibold tracking-widest">
          <Link to="/" className="hover:text-gold transition">HOME</Link>
          <span>/</span>
          <Link to="/shop" className="hover:text-gold transition">SHOP</Link>
          <span>/</span>
          <span className="text-gold">CUSTOMIZE GIFT</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-serif gold-text-gradient tracking-wide">
          Craft Your Bespoke Luxury Gift Box
        </h1>
        <p className="text-xs sm:text-sm text-muted max-w-2xl mx-auto font-sans">
          Hand-select your box casing, choose artisanal gift items, add bespoke wrapping, and write a personalized greeting card message.
        </p>
      </div>

      {/* Main Grid: Customizer Controls (Left) & Sticky Order Summary (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: CUSTOMIZER STEPS */}
        <div className="lg:col-span-8 space-y-8">

          {/* STEP 1: CHOOSE BOX SIZE */}
          <div className="gold-gradient-border bg-charcoal p-5 sm:p-7 rounded-xl space-y-5 shadow-xl">
            <div className="flex items-center gap-3 border-b border-gold/15 pb-4">
              <span className="w-8 h-8 rounded-full bg-gold text-background font-extrabold flex items-center justify-center font-sans text-sm shadow">
                1
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-serif text-gold">Choose Gift Box Size</h2>
                <p className="text-xs text-muted font-sans">Select the physical dimensions and capacity for your curated set</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {BOX_SIZES.map((size) => {
                const isSelected = selectedBoxSize === size.id;
                return (
                  <button
                    key={size.id}
                    type="button"
                    onClick={() => setSelectedBoxSize(size.id)}
                    className={`relative text-left p-4 rounded-lg border transition-all duration-300 flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'border-gold bg-gold/10 shadow-gold-glow scale-[1.02]'
                        : 'border-gold/20 bg-background/50 hover:border-gold/50 hover:bg-background/80'
                    }`}
                  >
                    {size.badge && (
                      <span className="absolute -top-2.5 right-3 bg-gold text-background text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider shadow">
                        {size.badge}
                      </span>
                    )}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`material-symbols-outlined text-xl ${isSelected ? 'text-gold' : 'text-muted'}`}>
                          {size.icon}
                        </span>
                        <h3 className="font-serif text-sm sm:text-base font-bold text-ivory">{size.id} Box</h3>
                      </div>
                      <p className="text-xs text-muted mb-2 font-sans">{size.capacity}</p>
                      <p className="text-[10px] text-muted/70 font-mono mb-3">{size.dimensions}</p>
                    </div>
                    <div className="pt-2 border-t border-gold/10 flex justify-between items-baseline font-sans">
                      <span className="text-[10px] text-muted uppercase">Box Fee</span>
                      <span className="text-sm font-bold text-gold">Rs. {size.price.toLocaleString()}.00</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 2: CHOOSE BOX COLOR */}
          <div className="gold-gradient-border bg-charcoal p-5 sm:p-7 rounded-xl space-y-5 shadow-xl">
            <div className="flex items-center gap-3 border-b border-gold/15 pb-4">
              <span className="w-8 h-8 rounded-full bg-gold text-background font-extrabold flex items-center justify-center font-sans text-sm shadow">
                2
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-serif text-gold">Select Box Color & Finish</h2>
                <p className="text-xs text-muted font-sans">Premium rigid magnetic casing wrapped in textured matte linen</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {BOX_COLORS.map((color) => {
                const isSelected = selectedBoxColor === color.name;
                return (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => setSelectedBoxColor(color.name)}
                    className={`p-3 rounded-lg border text-center transition-all duration-300 flex flex-col items-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'border-gold bg-gold/15 shadow-gold-glow scale-[1.05]'
                        : 'border-gold/20 bg-background/50 hover:border-gold/50'
                    }`}
                  >
                    <span
                      className="w-8 h-8 rounded-full border-2 border-gold/40 shadow-inner block"
                      style={{ backgroundColor: color.hex, borderColor: isSelected ? '#d4af37' : color.borderHex }}
                    />
                    <span className={`text-[11px] font-sans font-medium ${isSelected ? 'text-gold font-bold' : 'text-ivory'}`}>
                      {color.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 3: SELECT INDIVIDUAL PRODUCTS */}
          <div className="gold-gradient-border bg-charcoal p-5 sm:p-7 rounded-xl space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-gold/15 pb-4 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-gold text-background font-extrabold flex items-center justify-center font-sans text-sm shadow">
                  3
                </span>
                <div>
                  <h2 className="text-lg sm:text-xl font-serif text-gold">Add Items to Your Box</h2>
                  <p className="text-xs text-muted font-sans">Select items to include in your customized luxury gift set</p>
                </div>
              </div>
              <span className="bg-gold/15 border border-gold/30 text-gold text-xs px-3 py-1 rounded-full font-bold font-sans">
                {totalItemCount} Item{totalItemCount !== 1 ? 's' : ''} Selected
              </span>
            </div>

            {/* Category Filter Pills & Search */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                {/* Search input */}
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="Search luxury items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-background border border-gold/30 text-xs text-ivory pl-8 pr-3 py-2 rounded outline-none focus:border-gold placeholder:text-muted/60"
                  />
                  <span className="material-symbols-outlined absolute left-2.5 top-2 text-muted text-base">search</span>
                </div>

                {/* Filter count */}
                <span className="text-[11px] text-muted font-sans self-end sm:self-center">
                  Showing {filteredProducts.length} item{filteredProducts.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Category buttons */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-sans whitespace-nowrap transition cursor-pointer ${
                      activeCategory === cat
                        ? 'bg-gold text-background font-bold shadow'
                        : 'border border-gold/25 text-muted hover:text-gold hover:border-gold/50 bg-background/40'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto pr-1">
              {filteredProducts.map((product) => {
                const selected = selectedItems[product.id];
                const qty = selected ? selected.quantity : 0;
                const isOutOfStock = product.stock <= 0;
                const isLowStock = product.stock > 0 && product.stock <= (product.lowStockThreshold || 4);

                return (
                  <div
                    key={product.id}
                    className={`bg-background/80 border rounded-lg p-3 flex flex-col justify-between transition-all duration-200 hover:border-gold/50 relative ${
                      isOutOfStock ? 'opacity-60 border-red-900/30' : qty > 0 ? 'border-gold shadow-gold-glow bg-gold/5' : 'border-gold/20'
                    }`}
                  >
                    <div>
                      {/* Image Frame */}
                      <div className="aspect-square bg-charcoal rounded overflow-hidden mb-2.5 relative border border-gold/15">
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                        {qty > 0 && (
                          <span className="absolute top-2 right-2 bg-gold text-background font-extrabold text-[11px] w-6 h-6 rounded-full flex items-center justify-center shadow">
                            {qty}
                          </span>
                        )}
                        {isOutOfStock && (
                          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-black/80 text-center py-1 text-[10px] font-bold uppercase tracking-wider text-red-400 border-y border-red-500/30">
                            OUT OF STOCK
                          </div>
                        )}
                        {isLowStock && !isOutOfStock && (
                          <span className="absolute top-2 left-2 bg-amber-600/90 text-white text-[9px] font-extrabold px-2 py-0.5 rounded shadow uppercase font-sans">
                            Only {product.stock} left
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-[9px] uppercase tracking-wider text-muted font-sans truncate">
                          {product.category}
                        </span>
                        <span className="text-[9px] font-mono text-muted/60">
                          {product.sku}
                        </span>
                      </div>
                      <h4 className="font-serif text-xs sm:text-sm font-semibold text-ivory line-clamp-1 mb-1">
                        {product.name}
                      </h4>
                      <p className="text-gold font-bold text-xs font-sans mb-3">
                        Rs. {product.price.toLocaleString()}.00
                      </p>
                    </div>

                    {/* Action buttons */}
                    {isOutOfStock ? (
                      <button
                        type="button"
                        disabled
                        className="w-full py-2 bg-red-950/30 border border-red-900/40 text-red-400 text-xs font-sans uppercase font-bold tracking-wider rounded cursor-not-allowed"
                      >
                        OUT OF STOCK
                      </button>
                    ) : qty > 0 ? (
                      <div className="flex items-center justify-between bg-charcoal border border-gold/30 rounded p-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(product.id, -1)}
                          className="w-7 h-7 bg-background text-gold hover:bg-gold hover:text-background rounded flex items-center justify-center font-bold text-sm transition cursor-pointer"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold text-ivory font-sans">{qty}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(product.id, 1)}
                          disabled={qty >= product.stock}
                          className={`w-7 h-7 bg-background text-gold rounded flex items-center justify-center font-bold text-sm transition ${
                            qty >= product.stock ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gold hover:text-background cursor-pointer'
                          }`}
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAddItem(product)}
                        className="w-full py-2 bg-charcoal hover:bg-gold hover:text-background border border-gold/30 text-gold text-xs font-sans uppercase font-bold tracking-wider rounded transition duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">add</span>
                        Add to Box
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* STEP 4: WRAPPING & PERSONALIZATION */}
          <div className="gold-gradient-border bg-charcoal p-5 sm:p-7 rounded-xl space-y-6 shadow-xl">
            <div className="flex items-center gap-3 border-b border-gold/15 pb-4">
              <span className="w-8 h-8 rounded-full bg-gold text-background font-extrabold flex items-center justify-center font-sans text-sm shadow">
                4
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-serif text-gold">Gift Wrapping & Personal Message</h2>
                <p className="text-xs text-muted font-sans">Tailor the presentation ribbon and add your personal message</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Wrapping Selection */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-muted font-semibold mb-2 font-sans">
                  Gift Wrapping Theme
                </label>
                <select
                  value={selectedWrapping}
                  onChange={(e) => setSelectedWrapping(e.target.value)}
                  className="w-full bg-background border border-gold/30 text-xs text-ivory p-3 rounded outline-none focus:border-gold"
                >
                  {WRAPPING_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Ribbon Selection */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-muted font-semibold mb-2 font-sans">
                  Ribbon Accent Color
                </label>
                <select
                  value={selectedRibbon}
                  onChange={(e) => setSelectedRibbon(e.target.value)}
                  className="w-full bg-background border border-gold/30 text-xs text-ivory p-3 rounded outline-none focus:border-gold"
                >
                  {RIBBON_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Greeting Card & Custom Message */}
            <div className="space-y-4 pt-2 border-t border-gold/10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-muted font-semibold mb-2 font-sans">
                    Greeting Card Occasion
                  </label>
                  <select
                    value={selectedCard}
                    onChange={(e) => setSelectedCard(e.target.value)}
                    className="w-full bg-background border border-gold/30 text-xs text-ivory p-3 rounded outline-none focus:border-gold"
                  >
                    {CARD_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-muted font-semibold mb-2 font-sans">
                    Greeting Card Message (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Type your personal message to be handwritten inside the luxury card..."
                    className="w-full bg-background border border-gold/30 text-xs text-ivory p-3 rounded outline-none focus:border-gold resize-none placeholder:text-muted/60"
                  />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: STICKY LIVE ORDER SUMMARY */}
        <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
          <div className="gold-gradient-border bg-charcoal p-6 rounded-xl space-y-6 shadow-2xl">
            <h2 className="text-xl font-serif text-gold border-b border-gold/15 pb-3 uppercase tracking-wider flex items-center justify-between">
              <span>Order Summary</span>
              <span className="material-symbols-outlined text-2xl text-gold">auto_awesome</span>
            </h2>

            {/* Selected Curation Configuration */}
            <div className="bg-background/60 p-3.5 rounded border border-gold/15 space-y-2 text-xs text-ivory">
              <div className="flex justify-between items-center">
                <span className="text-muted uppercase text-[10px] font-sans">Box Size</span>
                <span className="font-serif font-bold text-gold">{selectedBoxSize}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted uppercase text-[10px] font-sans">Box Finish</span>
                <span className="font-bold flex items-center gap-1.5">
                  <span
                    className="w-3 h-3 rounded-full border border-gold/50 inline-block"
                    style={{ backgroundColor: BOX_COLORS.find(c => c.name === selectedBoxColor)?.hex }}
                  />
                  {selectedBoxColor}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted uppercase text-[10px] font-sans">Wrapping</span>
                <span className="text-[11px] text-ivory truncate max-w-[160px]">{selectedWrapping}</span>
              </div>
            </div>

            {/* Selected Items List */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs text-muted uppercase font-sans">
                <span>Selected Items ({totalItemCount})</span>
                {itemsList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedItems({})}
                    className="text-[10px] text-red-400 hover:underline uppercase"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {itemsList.length === 0 ? (
                <div className="bg-background/30 p-6 rounded text-center border border-dashed border-gold/15">
                  <span className="material-symbols-outlined text-gold/40 text-3xl mb-1">workspaces</span>
                  <p className="text-xs text-muted font-sans">Your custom gift box is empty.</p>
                  <p className="text-[10px] text-muted/60 mt-1">Select luxury items from Step 3 above.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {itemsList.map((item) => (
                    <div key={item.id} className="flex items-center justify-between bg-background/50 p-2 rounded border border-gold/10 text-xs">
                      <div className="flex items-center gap-2.5 overflow-hidden pr-2">
                        <img src={item.image} alt={item.name} className="w-9 h-9 object-cover rounded border border-gold/15 shrink-0" />
                        <div className="truncate">
                          <p className="font-semibold text-ivory truncate text-[11px]">{item.name}</p>
                          <p className="text-[10px] text-muted">
                            {item.quantity} x Rs. {item.price.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-bold text-gold text-xs">
                          Rs. {(item.price * item.quantity).toLocaleString()}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-muted hover:text-red-400 p-0.5 transition"
                          title="Remove item"
                        >
                          <span className="material-symbols-outlined text-sm block">close</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Financial Breakdown */}
            <div className="border-t border-gold/15 pt-4 space-y-2 font-sans text-xs">
              <div className="flex justify-between text-muted">
                <span>Box Casing Fee ({selectedBoxSize})</span>
                <span className="text-ivory">Rs. {currentBoxConfig.price.toLocaleString()}.00</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Selected Items Subtotal</span>
                <span className="text-ivory">Rs. {itemsSubtotal.toLocaleString()}.00</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Premium Gift Wrapping & Card</span>
                <span className="text-green-400 font-bold uppercase tracking-wide">Included</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Islandwide Delivery</span>
                <span className="text-green-400 font-bold uppercase tracking-wide">Complimentary</span>
              </div>

              <div className="border-t border-gold/20 pt-3 flex justify-between items-baseline">
                <span className="font-serif text-base text-ivory">Final Total</span>
                <span className="font-sans text-2xl font-bold text-gold">
                  Rs. {grandTotal.toLocaleString()}.00
                </span>
              </div>
            </div>

            {/* Action Button: Add Customized Gift to Cart */}
            <button
              type="button"
              onClick={handleAddToCartAndCheckout}
              disabled={itemsList.length === 0}
              className={`w-full py-4 rounded font-sans font-bold text-xs uppercase tracking-widest transition duration-300 shadow-gold-glow flex items-center justify-center gap-2 ${
                itemsList.length > 0
                  ? 'bg-gold hover:bg-gold-light text-background cursor-pointer'
                  : 'bg-gold/30 text-background/60 cursor-not-allowed'
              }`}
            >
              <span className="material-symbols-outlined text-base">shopping_bag</span>
              <span>ADD CUSTOMIZED GIFT TO CART</span>
            </button>

            <p className="text-[10px] text-muted text-center leading-relaxed">
              Adding this custom box will redirect you directly to checkout to complete your order.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CustomizeGift;
