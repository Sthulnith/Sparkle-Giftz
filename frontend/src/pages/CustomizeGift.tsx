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
  giftMessage: string;
  items: SelectedCustomItem[];
  itemsSubtotal: number;
  totalPrice: number;
}

export const CustomizeGift: React.FC = () => {
  const navigate = useNavigate();

  // Customization state
  const [selectedItems, setSelectedItems] = useState<Record<string | number, SelectedCustomItem>>({});
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

  const MIN_CUSTOM_ORDER_VALUE = 1500;

  // Calculate pricing
  const itemsList = Object.values(selectedItems);
  const itemsSubtotal = itemsList.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItemCount = itemsList.reduce((sum, item) => sum + item.quantity, 0);
  const grandTotal = itemsSubtotal;
  const isMinOrderMet = grandTotal >= MIN_CUSTOM_ORDER_VALUE;
  const amountNeeded = Math.max(0, MIN_CUSTOM_ORDER_VALUE - grandTotal);

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
      alert('Please add at least one item to your custom gift package before proceeding.');
      return;
    }

    if (!isMinOrderMet) {
      alert(`Minimum custom gift package order value is Rs. ${MIN_CUSTOM_ORDER_VALUE.toLocaleString()}.00. Please add items worth Rs. ${amountNeeded.toLocaleString()}.00 more to proceed.`);
      return;
    }

    // Choose representative image
    const customImage = itemsList[0]?.image || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=600&auto=format&fit=crop';

    const customCartItem = {
      productId: `custom-${Date.now()}`,
      name: `Custom Gift Package (${itemsList.length} Items)`,
      slug: 'customized-luxury-gift-box',
      price: grandTotal,
      quantity: 1,
      wrapping: 'Signature Premium Gift Packaging',
      giftMessage: customMessage.trim() || 'Personalized Greeting Card Included',
      image: customImage,
      isCustom: true,
      customDetails: {
        giftMessage: customMessage.trim(),
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
          Craft Your Customized Gift Package
        </h1>
        <p className="text-xs sm:text-sm text-muted max-w-2xl mx-auto font-sans">
          Select artisanal gift items (minimum order value Rs. 1,500.00) and include your personalized greeting card message.
        </p>
      </div>

      {/* Main Grid: Customizer Controls (Left) & Sticky Order Summary (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: CUSTOMIZER STEPS */}
        <div className="lg:col-span-8 space-y-8">

          {/* STEP 1: SELECT INDIVIDUAL PRODUCTS */}
          <div className="gold-gradient-border bg-charcoal p-5 sm:p-7 rounded-xl space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-gold/15 pb-4 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-gold text-background font-extrabold flex items-center justify-center font-sans text-sm shadow">
                  1
                </span>
                <div>
                  <h2 className="text-lg sm:text-xl font-serif text-gold">Choose Items for Your Custom Gift Set</h2>
                  <p className="text-xs text-muted font-sans">Select luxury artisanal products to build your personalized gift box</p>
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

          {/* STEP 2: GREETING CARD MESSAGE */}
          <div className="gold-gradient-border bg-charcoal p-5 sm:p-7 rounded-xl space-y-5 shadow-xl">
            <div className="flex items-center gap-3 border-b border-gold/15 pb-4">
              <span className="w-8 h-8 rounded-full bg-gold text-background font-extrabold flex items-center justify-center font-sans text-sm shadow">
                2
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-serif text-gold">Greeting Card Message (Optional)</h2>
                <p className="text-xs text-muted font-sans">Add a custom note to be handwritten inside your luxury gift box</p>
              </div>
            </div>

            <div>
              <textarea
                rows={4}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Type your personal greeting message to be handwritten inside the luxury card (e.g. Wishing you a happy birthday!)..."
                className="w-full bg-background border border-gold/30 text-xs text-ivory p-3.5 rounded-lg outline-none focus:border-gold resize-none placeholder:text-muted/60 font-sans leading-relaxed"
              />
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
                  <p className="text-[10px] text-muted/60 mt-1">Select items from Step 1 above.</p>
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

            {/* Minimum Order Value Alert Banner */}
            {itemsList.length > 0 && !isMinOrderMet && (
              <div className="bg-amber-950/50 border border-amber-500/40 p-3 rounded-lg text-amber-200 text-xs font-sans flex items-start gap-2.5 shadow font-sans">
                <span className="material-symbols-outlined text-amber-400 text-lg shrink-0 mt-0.5">info</span>
                <div>
                  <p className="font-bold text-amber-300">Minimum Order Value: Rs. 1,500.00</p>
                  <p className="text-[11px] text-amber-200/90 mt-0.5 leading-relaxed">
                    Please add items worth <strong>Rs. {amountNeeded.toLocaleString()}.00</strong> more to proceed with checkout.
                  </p>
                </div>
              </div>
            )}

            {/* Financial Breakdown */}
            <div className="border-t border-gold/15 pt-4 space-y-2 font-sans text-xs">
              <div className="flex justify-between text-muted">
                <span>Selected Items Subtotal</span>
                <span className="text-ivory font-semibold">Rs. {itemsSubtotal.toLocaleString()}.00</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Premium Gift Packaging & Card</span>
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
              disabled={itemsList.length === 0 || !isMinOrderMet}
              className={`w-full py-4 rounded font-sans font-bold text-xs uppercase tracking-widest transition duration-300 shadow-gold-glow flex items-center justify-center gap-2 ${
                itemsList.length > 0 && isMinOrderMet
                  ? 'bg-gold hover:bg-gold-light text-background cursor-pointer'
                  : 'bg-gold/30 text-background/60 cursor-not-allowed'
              }`}
            >
              <span className="material-symbols-outlined text-base">shopping_bag</span>
              <span>
                {itemsList.length === 0
                  ? 'ADD CUSTOMIZED GIFT TO CART'
                  : !isMinOrderMet
                  ? `ADD RS. ${amountNeeded.toLocaleString()} MORE TO PROCEED`
                  : 'ADD CUSTOMIZED GIFT TO CART'}
              </span>
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
