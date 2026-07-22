import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getProductBySlug, getEnabledInventoryItems, type Product, type InventoryItem } from '../lib/supabase';

export interface GiftBoxIncludedItem {
  itemId: string | number;
  sku: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  image?: string;
}

export const ProductDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'details' | 'wrapping'>('details');

  // Customer customization state
  const [checkedItems, setCheckedItems] = useState<Record<string | number, boolean>>({});
  const [extraAddedItems, setExtraAddedItems] = useState<GiftBoxIncludedItem[]>([]);
  const [showAddExtraModal, setShowAddExtraModal] = useState<boolean>(false);
  const [extraSearchQuery, setExtraSearchQuery] = useState<string>('');
  const [availableInventory, setAvailableInventory] = useState<InventoryItem[]>([]);

  // Gift options
  const [giftMessage, setGiftMessage] = useState<string>('');
  const [wrappingOption, setWrappingOption] = useState<string>('Signature Matte Black & Gold Foil');

  useEffect(() => {
    if (!slug) return;
    const loadProductAndInventory = async () => {
      setIsLoading(true);
      try {
        const found = await getProductBySlug(slug);
        if (found) {
          setProduct(found);
          setWrappingOption(found.default_wrapping || 'Signature Matte Black & Gold Foil');
          setActiveImageIndex(0);

          // Pre-check all included items by default
          const initialChecked: Record<string | number, boolean> = {};
          if (found.gift_box_items) {
            found.gift_box_items.forEach(gbi => {
              initialChecked[gbi.inventory_item_id] = true;
            });
          }
          setCheckedItems(initialChecked);
        } else {
          setProduct(null);
        }

        const invItems = await getEnabledInventoryItems();
        setAvailableInventory(invItems);
      } catch (err) {
        console.error('[ProductDetail] Error loading product:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadProductAndInventory();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-4">
        <div className="w-10 h-10 border-2 border-gold/30 border-t-gold rounded-full animate-spin mb-3" />
        <p className="text-xs text-muted uppercase tracking-widest font-sans">Loading Gift Box Details…</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-4">
        <span className="material-symbols-outlined text-gold text-5xl mb-3">error</span>
        <h2 className="font-serif text-2xl text-gold mb-2">Gift Box Not Found</h2>
        <p className="text-sm text-muted font-sans mb-6">The collection you requested is unavailable or has been removed.</p>
        <Link
          to="/shop"
          className="px-6 py-3 border border-gold text-gold hover:bg-gold hover:text-background font-semibold text-xs font-sans uppercase tracking-widest transition duration-300"
        >
          Return to Shop
        </Link>
      </div>
    );
  }

  const includedList: GiftBoxIncludedItem[] = (product.gift_box_items && product.gift_box_items.length > 0)
    ? product.gift_box_items.map(gbi => ({
        itemId: gbi.inventory_item_id,
        sku: gbi.inventory_items?.sku || '',
        name: gbi.inventory_items?.name || 'Included Item',
        category: gbi.inventory_items?.category || '',
        price: Number(gbi.inventory_items?.price) || 0,
        quantity: gbi.quantity,
        image: gbi.inventory_items?.image_url || '',
      }))
    : (product as any).includedItems || [];

  const displayImages = product.image_urls && product.image_urls.length > 0
    ? product.image_urls
    : (product as any).images && (product as any).images.length > 0
    ? (product as any).images
    : ['https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=600&auto=format&fit=crop'];
  const keptIncludedItems = includedList.filter(i => checkedItems[i.itemId] !== false);
  const removedIncludedItems = includedList.filter(i => checkedItems[i.itemId] === false);

  const removedItemsTotal = removedIncludedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const extraItemsTotal = extraAddedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const finalCalculatedPrice = Math.max(0, product.price - removedItemsTotal + extraItemsTotal);

  const handleToggleIncludedItem = (itemId: string | number) => {
    setCheckedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const handleAddExtraItem = (item: InventoryItem) => {
    setExtraAddedItems(prev => {
      const existing = prev.find(i => String(i.itemId) === String(item.id));
      if (existing) {
        return prev.map(i => String(i.itemId) === String(item.id) ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        itemId: item.id,
        sku: item.sku,
        name: item.name,
        category: item.category,
        price: item.price,
        quantity: 1,
        image: item.image_url || (item as any).image
      }];
    });
  };

  const handleUpdateExtraQty = (itemId: string | number, delta: number) => {
    setExtraAddedItems(prev => {
      return prev.map(i => {
        if (String(i.itemId) === String(itemId)) {
          const nextQty = i.quantity + delta;
          return nextQty > 0 ? { ...i, quantity: nextQty } : null;
        }
        return i;
      }).filter(Boolean) as GiftBoxIncludedItem[];
    });
  };

  const handleAddToCart = () => {
    const cartStr = localStorage.getItem('sparkle_cart');
    const cart = cartStr ? JSON.parse(cartStr) : [];

    const customPayload = {
      productId: `pmb-${product.id}-${Date.now()}`,
      name: `${product.name} ${removedIncludedItems.length > 0 || extraAddedItems.length > 0 ? '(Customized)' : ''}`,
      slug: product.slug,
      price: finalCalculatedPrice,
      quantity: quantity,
      wrapping: wrappingOption,
      giftMessage: giftMessage,
      image: product.image_urls?.[0] || (product as any).images?.[0],
      isCustomPreMadeBox: true,
      preMadeCustomDetails: {
        boxId: product.id,
        boxName: product.name,
        basePrice: product.price,
        finalPrice: finalCalculatedPrice,
        keptItems: keptIncludedItems,
        removedItems: removedIncludedItems,
        extraAddedItems: extraAddedItems,
        wrapping: wrappingOption,
        giftMessage: giftMessage,
      }
    };

    cart.push(customPayload);
    localStorage.setItem('sparkle_cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('sparkle_cart_updated'));
    navigate('/cart');
  };

  return (
    <div className="min-h-screen py-16 px-4 max-w-7xl mx-auto space-y-12">
      {/* Back to collection */}
      <div className="text-sm">
        <Link to="/shop" className="text-muted hover:text-gold transition flex items-center gap-1.5 font-sans text-xs uppercase tracking-wider">
          <span className="material-symbols-outlined text-xs">arrow_back</span>
          Back to collection
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* PRODUCT GALLERY */}
        <div className="space-y-4">
          <div className="gold-gradient-border bg-charcoal h-72 sm:h-[450px] aspect-square overflow-hidden rounded relative">
            {displayImages.length > 0 ? (
              <img
                src={displayImages[activeImageIndex] || displayImages[0]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted uppercase font-sans">
                No Image Available
              </div>
            )}
            {product.stock <= 0 && (
              <div className="absolute inset-0 bg-black/75 flex items-center justify-center">
                <span className="border border-red-500/30 bg-red-950/60 text-red-200 text-sm px-4 py-2 font-sans font-bold uppercase tracking-widest">
                  Out of Stock
                </span>
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {displayImages.length > 1 && (
            <div className="flex gap-3">
              {displayImages.map((img: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-20 h-20 rounded overflow-hidden border transition ${
                    activeImageIndex === idx ? 'border-gold' : 'border-gold/15 hover:border-gold/50'
                  }`}
                >
                  <img src={img} alt="thumbnail" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* PRODUCT DETAILS & CUSTOMIZER */}
        <div className="space-y-6">
          <div>
            <span className="text-gold tracking-widest text-[10px] uppercase font-sans font-semibold">
              PREMIUM CURATED GIFT BOX
            </span>
            <h1 className="text-4xl font-serif mt-1 mb-2 text-ivory">{product.name}</h1>
            
            <div className="flex items-center gap-4 mt-2">
              <p className="text-3xl text-gold font-serif font-bold">
                Rs. {finalCalculatedPrice.toLocaleString()}.00
              </p>
              {product.price !== finalCalculatedPrice && (
                <p className="text-sm text-muted line-through font-sans">
                  Base: Rs. {product.price.toLocaleString()}.00
                </p>
              )}
              {product.old_price && product.price === finalCalculatedPrice && (
                <p className="text-sm text-muted line-through font-sans">
                  Rs. {product.old_price.toLocaleString()}.00
                </p>
              )}
            </div>
          </div>

          <p className="text-muted leading-relaxed text-sm font-sans">
            {product.description}
          </p>

          {/* BOX CONTENTS & CUSTOMIZATION BUILDER */}
          <div className="gold-gradient-border bg-charcoal p-5 rounded-xl space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-gold/15 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-gold text-lg">tune</span>
                <h3 className="text-xs uppercase text-gold font-sans tracking-widest font-extrabold">
                  Customize Box Contents
                </h3>
              </div>
              <span className="text-[10px] text-muted font-sans">
                Uncheck items to remove or add extra store items
              </span>
            </div>

            {/* Included Items Checklist */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-ivory uppercase tracking-wider font-sans">
                Default Included Items ({keptIncludedItems.length} / {includedList.length} Kept):
              </p>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {includedList.map((item) => {
                  const isChecked = checkedItems[item.itemId] !== false;
                  return (
                    <div
                      key={item.itemId}
                      className={`p-2.5 rounded border transition flex items-center justify-between ${
                        isChecked ? 'bg-gold/10 border-gold/30' : 'bg-background/40 border-gold/10 opacity-60'
                      }`}
                    >
                      <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0 pr-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleIncludedItem(item.itemId)}
                          className="accent-gold h-4 w-4 shrink-0"
                        />
                        {item.image && (
                          <img src={item.image} alt={item.name} className="w-9 h-9 object-cover rounded border border-gold/20 shrink-0" />
                        )}
                        <div className="truncate">
                          <p className={`text-xs font-bold ${isChecked ? 'text-ivory' : 'text-muted line-through'}`}>
                            {item.quantity}x {item.name}
                          </p>
                          <p className="text-[10px] text-muted font-mono">{item.category} • Rs. {item.price.toLocaleString()}</p>
                        </div>
                      </label>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        isChecked ? 'text-gold bg-gold/15' : 'text-red-400 bg-red-950/40'
                      }`}>
                        {isChecked ? 'INCLUDED' : 'REMOVED (-Rs.' + (item.price * item.quantity).toLocaleString() + ')'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Extra Added Items */}
            {extraAddedItems.length > 0 && (
              <div className="space-y-2 border-t border-gold/15 pt-3">
                <p className="text-xs font-bold text-gold uppercase tracking-wider font-sans">
                  Additional Items Added ({extraAddedItems.length}):
                </p>
                <div className="space-y-2">
                  {extraAddedItems.map((item) => (
                    <div key={item.itemId} className="p-2.5 bg-gold/10 border border-gold/40 rounded flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate pr-2">
                        {item.image && (
                          <img src={item.image} alt={item.name} className="w-8 h-8 object-cover rounded border border-gold/30 shrink-0" />
                        )}
                        <div className="truncate">
                          <p className="font-bold text-ivory text-xs">{item.name}</p>
                          <p className="text-[10px] text-gold font-mono">+Rs. {(item.price * item.quantity).toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="flex items-center bg-background border border-gold/30 rounded">
                          <button
                            type="button"
                            onClick={() => handleUpdateExtraQty(item.itemId, -1)}
                            className="w-5 h-5 text-gold hover:bg-gold hover:text-background font-bold text-xs flex items-center justify-center transition"
                          >
                            -
                          </button>
                          <span className="w-5 text-center text-xs font-bold text-ivory font-mono">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateExtraQty(item.itemId, 1)}
                            className="w-5 h-5 text-gold hover:bg-gold hover:text-background font-bold text-xs flex items-center justify-center transition"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Button to open Add Extra Products modal */}
            <button
              type="button"
              onClick={() => setShowAddExtraModal(true)}
              className="w-full py-2.5 bg-background hover:bg-gold/15 border border-gold/30 text-gold text-xs font-sans uppercase font-bold tracking-wider rounded transition duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">add_circle</span>
              Add Extra Store Items to Package
            </button>
          </div>

          {/* GIFT PERSONALIZATION OPTIONS */}
          <div className="gold-gradient-border bg-charcoal p-5 rounded-xl space-y-4">
            <h3 className="text-xs uppercase text-gold font-sans tracking-widest font-semibold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">redeem</span>
              Presentation & Gift Message
            </h3>

            {/* Custom greeting card */}
            <div className="space-y-1">
              <label className="block text-xs text-muted font-medium uppercase font-sans tracking-wide">
                Custom Personal Greeting Message (Optional)
              </label>
              <textarea
                value={giftMessage}
                onChange={(e) => setGiftMessage(e.target.value)}
                maxLength={250}
                placeholder="Write your greeting message here to print on our signature gold card..."
                className="w-full bg-background border border-gold/25 p-2.5 rounded text-xs text-ivory placeholder-muted/50 focus:border-gold outline-none h-20 resize-none font-sans"
              />
            </div>

            {/* Premium Wrapping Selector */}
            <div className="space-y-1">
              <label className="block text-xs text-muted font-medium uppercase font-sans tracking-wide">
                Presentation Wrapping Style
              </label>
              <select
                value={wrappingOption}
                onChange={(e) => setWrappingOption(e.target.value)}
                className="w-full bg-background border border-gold/25 p-2.5 rounded text-xs text-ivory focus:border-gold outline-none cursor-pointer"
              >
                <option value="Signature Matte Black & Gold Foil">Signature Matte Black & Gold Foil (Included)</option>
                <option value="Satin Red & Gold Ribbon Curation">Satin Red & Gold Ribbon Curation (+Rs.500.00)</option>
                <option value="Velvet Emerald & Gold Seal">Velvet Emerald & Gold Seal (+Rs.1,200.00)</option>
                <option value="Minimalist Parchment & Wax Stamp">Minimalist Parchment & Wax Stamp (+Rs.600.00)</option>
                <option value="Midnight Navy Sleek Casing">Midnight Navy Sleek Casing (+Rs.800.00)</option>
              </select>
            </div>
          </div>

          {/* QUANTITY & ACTIONS */}
          {product.stock > 0 && (
            <div className="flex flex-col sm:flex-row items-stretch gap-4 pt-2">
              <div className="flex border border-gold/25 rounded overflow-hidden">
                <button
                  type="button"
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="px-4 py-2 hover:bg-gold/10 text-gold transition"
                >
                  -
                </button>
                <input
                  type="number"
                  readOnly
                  value={quantity}
                  className="bg-transparent w-12 text-center text-ivory text-sm font-sans focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}
                  className="px-4 py-2 hover:bg-gold/10 text-gold transition"
                >
                  +
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                className="flex-1 py-3 bg-gold hover:bg-gold-light text-background font-bold font-sans uppercase tracking-widest text-xs transition duration-300 shadow-gold-glow cursor-pointer"
              >
                Add Customized Package to Cart • Rs. {(finalCalculatedPrice * quantity).toLocaleString()}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: ADD EXTRA STORE ITEMS TO PACKAGE */}
      {showAddExtraModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="gold-gradient-border bg-charcoal p-6 rounded-xl max-w-2xl w-full my-8 space-y-4">
            <div className="flex justify-between items-center border-b border-gold/15 pb-3">
              <div>
                <h3 className="font-serif text-xl text-gold">Browse & Add Extra Items</h3>
                <p className="text-xs text-muted font-sans">Include additional luxury products into your gift box</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddExtraModal(false)}
                className="text-muted hover:text-gold transition material-symbols-outlined"
              >
                close
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Search products (wallets, perfumes, watches, caps, bottles, candles...)..."
                value={extraSearchQuery}
                onChange={(e) => setExtraSearchQuery(e.target.value)}
                className="w-full bg-background border border-gold/25 text-xs text-ivory pl-8 pr-3 py-2 rounded outline-none focus:border-gold"
              />
              <span className="material-symbols-outlined absolute left-2.5 top-2 text-muted text-base">search</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
              {availableInventory
                .filter(i => !extraSearchQuery || i.name.toLowerCase().includes(extraSearchQuery.toLowerCase()) || i.category.toLowerCase().includes(extraSearchQuery.toLowerCase()))
                .map((item) => (
                  <div key={item.id} className="bg-background/80 border border-gold/20 rounded p-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 truncate pr-2">
                      <img src={item.image_url || (item as any).image} alt={item.name} className="w-10 h-10 object-cover rounded border border-gold/15 shrink-0" />
                      <div className="truncate">
                        <p className="font-bold text-ivory text-xs truncate">{item.name}</p>
                        <p className="text-[10px] text-gold font-mono">Rs. {item.price.toLocaleString()}.00</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddExtraItem(item)}
                      className="px-3 py-1.5 bg-gold hover:bg-gold-light text-background font-bold text-[11px] uppercase tracking-wider rounded font-sans transition shrink-0"
                    >
                      + Add
                    </button>
                  </div>
                ))}
            </div>

            <div className="pt-3 border-t border-gold/15 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAddExtraModal(false)}
                className="px-5 py-2 bg-gold text-background font-bold text-xs uppercase tracking-wider rounded"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADDITIONAL DETAILS TABS */}
      <div className="border-t border-gold/15 pt-8">
        <div className="flex border-b border-gold/10 mb-6">
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-3 font-serif text-lg tracking-wide border-b-2 mr-8 transition ${
              activeTab === 'details' ? 'border-gold text-gold font-medium' : 'border-transparent text-muted hover:text-ivory'
            }`}
          >
            Product details
          </button>
          <button
            onClick={() => setActiveTab('wrapping')}
            className={`pb-3 font-serif text-lg tracking-wide border-b-2 transition ${
              activeTab === 'wrapping' ? 'border-gold text-gold font-medium' : 'border-transparent text-muted hover:text-ivory'
            }`}
          >
            Premium presentation details
          </button>
        </div>

        <div className="text-sm text-muted leading-relaxed font-sans max-w-3xl">
          {activeTab === 'details' && (
            <div className="space-y-4">
              <p>Each gift box is handcrafted by our curators in Colombo using only premium materials and sourced items. We prioritize local artisans and organic materials to deliver gifts that make a lasting impression.</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Includes handwritten personalization card.</li>
                <li>Free premium delivery included.</li>
              </ul>
            </div>
          )}
          {activeTab === 'wrapping' && (
            <div className="space-y-4">
              <p>Presentation is half of the gifting experience. Every Sparkle Giftz item is delivered inside our signature matte black casing adorned with micro-textured gold foils.</p>
              <p>You can choose custom wrappings like French-style luxury linen cords, velvet wrappings, or dried botanicals from the customization options above.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
