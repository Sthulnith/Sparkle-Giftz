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
  const [extraCategoryFilter, setExtraCategoryFilter] = useState<string>('All');
  const [availableInventory, setAvailableInventory] = useState<InventoryItem[]>([]);
  const [selectedExtraColors, setSelectedExtraColors] = useState<Record<number | string, string>>({});

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

  const keptCount = keptIncludedItems.reduce((acc, i) => acc + i.quantity, 0);
  const extraCount = extraAddedItems.reduce((acc, i) => acc + i.quantity, 0);
  const totalBoxItemCount = keptCount + extraCount;

  const MIN_BOX_ITEMS_COUNT = 3;
  const MIN_BOX_TOTAL_VALUE = 1500;

  const isMinCountMet = totalBoxItemCount >= MIN_BOX_ITEMS_COUNT;
  const isMinPriceMet = finalCalculatedPrice >= MIN_BOX_TOTAL_VALUE;
  const canCheckoutBox = isMinCountMet && isMinPriceMet;

  const handleToggleIncludedItem = (itemId: string | number) => {
    setCheckedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const handleAddExtraItem = (item: InventoryItem) => {
    const selectedColorName = selectedExtraColors[item.id] || (item.colors && item.colors.length > 0 ? item.colors[0].name : undefined);
    const selectedColorOpt = item.colors?.find(c => c.name === selectedColorName);
    const imgToUse = selectedColorOpt?.image_url || selectedColorOpt?.image_urls?.[0] || item.image_url || (item as any).image;
    const finalItemName = selectedColorName ? `${item.name} (${selectedColorName})` : item.name;

    setExtraAddedItems(prev => {
      const existing = prev.find(i => String(i.itemId) === String(item.id) && (i as any).selectedColor === selectedColorName);
      if (existing) {
        return prev.map(i => String(i.itemId) === String(item.id) && (i as any).selectedColor === selectedColorName ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        itemId: item.id,
        sku: item.sku,
        name: finalItemName,
        category: item.category,
        price: item.price,
        quantity: 1,
        image: imgToUse,
        selectedColor: selectedColorName,
      } as any];
    });
  };

  const handleUpdateExtraQty = (itemId: string | number, delta: number, selectedColor?: string) => {
    setExtraAddedItems(prev => {
      let targetIndex = -1;
      if (selectedColor !== undefined) {
        targetIndex = prev.findIndex(i => String(i.itemId) === String(itemId) && (i as any).selectedColor === selectedColor);
      } else {
        targetIndex = prev.findIndex(i => String(i.itemId) === String(itemId));
      }

      if (targetIndex === -1) return prev;

      const target = prev[targetIndex];
      const nextQty = target.quantity + delta;

      if (nextQty <= 0) {
        return prev.filter((_, idx) => idx !== targetIndex);
      }

      return prev.map((item, idx) => idx === targetIndex ? { ...item, quantity: nextQty } : item);
    });
  };

  const handleRemoveExtraItem = (itemId: string | number, selectedColor?: string) => {
    setExtraAddedItems(prev => {
      return prev.filter(i => {
        const itemMatches = String(i.itemId) === String(itemId);
        const colorMatches = selectedColor !== undefined ? (i as any).selectedColor === selectedColor : true;
        return !(itemMatches && colorMatches);
      });
    });
  };

  const handleAddToCart = () => {
    if (!isMinCountMet) {
      alert(`Gift box package must contain at least ${MIN_BOX_ITEMS_COUNT} items to checkout (currently: ${totalBoxItemCount} item${totalBoxItemCount !== 1 ? 's' : ''}). Please select or add at least ${MIN_BOX_ITEMS_COUNT - totalBoxItemCount} more item(s) to your box.`);
      return;
    }

    if (!isMinPriceMet) {
      const needed = MIN_BOX_TOTAL_VALUE - finalCalculatedPrice;
      alert(`Gift box package total value must be at least Rs. ${MIN_BOX_TOTAL_VALUE.toLocaleString()}.00 to checkout (currently: Rs. ${finalCalculatedPrice.toLocaleString()}.00). Please add items worth Rs. ${needed.toLocaleString()}.00 more.`);
      return;
    }

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
              Personal Greeting Message
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
          </div>

          {/* LUXURY PACKAGE REQUIREMENTS STATUS PANEL (Appears ONLY when requirements are NOT succeeded) */}
          {!canCheckoutBox && (
            <div className="gold-gradient-border bg-[#14171f] p-4 rounded-xl space-y-3 font-sans shadow-xl animate-fadeIn">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gold/15 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-gold text-lg">verified</span>
                  <span className="font-serif text-sm font-bold text-gold tracking-wide">Package Requirements</span>
                </div>
                <span className="text-[10px] font-sans font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-amber-950/60 text-amber-300 border border-amber-500/30">
                  Customization Incomplete
                </span>
              </div>

              {/* Status Items */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {/* Item 1: Box Items Count */}
                <div className={`p-2.5 rounded-lg border transition-all flex items-center justify-between ${
                  isMinCountMet
                    ? 'bg-gold/5 border-gold/30 text-ivory'
                    : 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                }`}>
                  <div className="flex items-center gap-2.5 truncate">
                    <span className={`material-symbols-outlined text-base ${isMinCountMet ? 'text-gold' : 'text-amber-400/80'}`}>
                      {isMinCountMet ? 'check_circle' : 'inventory_2'}
                    </span>
                    <span className="font-sans text-xs">Included Items</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-xs">
                    <span className={isMinCountMet ? 'text-gold font-bold' : 'text-amber-300 font-bold'}>{totalBoxItemCount}</span>
                    <span className="text-muted text-[11px]">/ 3 Min</span>
                  </div>
                </div>

                {/* Item 2: Minimum Package Value */}
                <div className={`p-2.5 rounded-lg border transition-all flex items-center justify-between ${
                  isMinPriceMet
                    ? 'bg-gold/5 border-gold/30 text-ivory'
                    : 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                }`}>
                  <div className="flex items-center gap-2.5 truncate">
                    <span className={`material-symbols-outlined text-base ${isMinPriceMet ? 'text-gold' : 'text-amber-400/80'}`}>
                      {isMinPriceMet ? 'check_circle' : 'payments'}
                    </span>
                    <span className="font-sans text-xs">Package Value</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-xs">
                    <span className={isMinPriceMet ? 'text-gold font-bold' : 'text-amber-300 font-bold'}>
                      Rs. {finalCalculatedPrice.toLocaleString()}
                    </span>
                    <span className="text-muted text-[11px]">/ Rs. 1,500</span>
                  </div>
                </div>
              </div>

              {/* Helper Guidance Text */}
              <div className="text-[11px] text-muted font-sans flex items-center gap-1.5 pt-1.5 border-t border-gold/10">
                <span className="material-symbols-outlined text-gold text-sm shrink-0">info</span>
                <span>
                  {!isMinCountMet && !isMinPriceMet
                    ? 'Add at least 3 items totaling Rs. 1,500.00 or more to proceed.'
                    : !isMinCountMet
                    ? `Add ${3 - totalBoxItemCount} more item${(3 - totalBoxItemCount) !== 1 ? 's' : ''} to meet the 3-item requirement.`
                    : `Add items worth Rs. ${(1500 - finalCalculatedPrice).toLocaleString()}.00 more to unlock checkout.`}
                </span>
              </div>
            </div>
          )}

          {/* QUANTITY & ACTIONS */}
          {product.stock > 0 && (
            <div className="flex flex-col sm:flex-row items-stretch gap-4 pt-2">
              <div className="flex border border-gold/25 rounded overflow-hidden">
                <button
                  type="button"
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="px-4 py-2 hover:bg-gold/10 text-gold transition cursor-pointer"
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
                  className="px-4 py-2 hover:bg-gold/10 text-gold transition cursor-pointer"
                >
                  +
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={!canCheckoutBox}
                className={`flex-1 py-3 font-bold font-sans uppercase tracking-widest text-xs transition duration-300 rounded shadow-gold-glow cursor-pointer ${
                  canCheckoutBox
                    ? 'bg-gold hover:bg-gold-light text-background'
                    : 'bg-gold/30 text-background/60 cursor-not-allowed'
                }`}
              >
                {canCheckoutBox
                  ? `Add Customized Package to Cart • Rs. ${(finalCalculatedPrice * quantity).toLocaleString()}`
                  : !isMinCountMet
                  ? `ADD AT LEAST ${3 - totalBoxItemCount} MORE ITEM(S) TO CHECKOUT`
                  : `ADD RS. ${(1500 - finalCalculatedPrice).toLocaleString()} MORE TO CHECKOUT`}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: ADD EXTRA STORE ITEMS TO PACKAGE */}
      {showAddExtraModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="gold-gradient-border bg-charcoal p-6 rounded-xl max-w-2xl w-full my-8 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-gold/15 pb-3">
              <div>
                <h3 className="font-serif text-xl text-gold">Browse & Add Extra Items</h3>
                <p className="text-xs text-muted font-sans">Include additional luxury products into your gift box</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddExtraModal(false)}
                className="text-muted hover:text-gold transition material-symbols-outlined p-1 cursor-pointer"
                aria-label="Close"
              >
                close
              </button>
            </div>

            {/* Category Filter Bar */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-gold/30">
                {['All', ...Array.from(new Set(availableInventory.map(i => i.category).filter(Boolean)))].map((cat) => {
                  const isActive = extraCategoryFilter === cat;
                  const count = cat === 'All'
                    ? availableInventory.length
                    : availableInventory.filter(i => i.category === cat).length;

                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setExtraCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-full text-xs font-sans font-semibold transition-all duration-200 shrink-0 border flex items-center gap-1.5 cursor-pointer ${
                        isActive
                          ? 'bg-gold text-background border-gold shadow-gold-glow'
                          : 'bg-background/70 text-ivory/80 border-gold/25 hover:border-gold/60 hover:text-gold'
                      }`}
                    >
                      <span>{cat}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive ? 'bg-background/25 text-background' : 'bg-gold/15 text-gold'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder={`Search ${extraCategoryFilter === 'All' ? 'products' : extraCategoryFilter.toLowerCase()} (wallets, perfumes, watches, caps...)...`}
                  value={extraSearchQuery}
                  onChange={(e) => setExtraSearchQuery(e.target.value)}
                  className="w-full bg-background border border-gold/25 text-xs text-ivory pl-8 pr-3 py-2.5 rounded outline-none focus:border-gold"
                />
                <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-muted text-base">search</span>
              </div>
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-96 overflow-y-auto pr-1">
              {availableInventory
                .filter(i => {
                  const categoryMatch = extraCategoryFilter === 'All' || (i.category && i.category.toLowerCase() === extraCategoryFilter.toLowerCase());
                  const searchMatch = !extraSearchQuery || 
                    i.name.toLowerCase().includes(extraSearchQuery.toLowerCase()) || 
                    (i.category && i.category.toLowerCase().includes(extraSearchQuery.toLowerCase()));
                  return categoryMatch && searchMatch;
                })
                .map((item) => {
                  const activeColorName = selectedExtraColors[item.id] || (item.colors && item.colors.length > 0 ? item.colors[0].name : '');
                  const activeColorOpt = item.colors?.find(c => c.name === activeColorName);
                  const displayImage = activeColorOpt?.image_url || activeColorOpt?.image_urls?.[0] || item.image_url || (item as any).image;

                  const addedEntries = extraAddedItems.filter(i => String(i.itemId) === String(item.id));
                  const totalQtyForProduct = addedEntries.reduce((sum, i) => sum + i.quantity, 0);
                  const isOutOfStock = item.stock <= 0;

                  return (
                    <div
                      key={item.id}
                      className={`bg-background/90 border transition rounded-lg p-3 flex flex-col justify-between space-y-2.5 relative ${
                        isOutOfStock
                          ? 'opacity-60 border-red-900/30'
                          : totalQtyForProduct > 0
                          ? 'border-gold shadow-gold-glow bg-gold/5'
                          : 'border-gold/20 hover:border-gold/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="relative shrink-0">
                            <img src={displayImage} alt={item.name} className="w-12 h-12 object-cover rounded-md border border-gold/20 shrink-0 bg-charcoal shadow-sm" />
                            {totalQtyForProduct > 0 && (
                              <span className="absolute -top-1.5 -right-1.5 bg-gold text-background font-extrabold text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow border border-background">
                                {totalQtyForProduct}
                              </span>
                            )}
                          </div>
                          <div className="truncate">
                            <span className="inline-block text-[8px] font-sans font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-gold/15 text-gold mb-0.5">
                              {item.category || 'General'}
                            </span>
                            <p className="font-bold text-ivory text-xs truncate">{item.name}</p>
                            <p className="text-[10px] text-gold font-mono font-bold">Rs. {item.price.toLocaleString()}.00</p>
                          </div>
                        </div>

                        {/* Action buttons: + ADD or - qty + */}
                        {isOutOfStock ? (
                          <span className="px-2 py-1 bg-red-950/40 text-red-400 font-bold text-[9px] uppercase tracking-wider rounded font-sans border border-red-900/30 shrink-0">
                            Out of Stock
                          </span>
                        ) : totalQtyForProduct > 0 ? (
                          <div className="flex items-center gap-1 bg-charcoal border border-gold/40 rounded p-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleUpdateExtraQty(item.id, -1, activeColorName || undefined)}
                              className="w-6 h-6 bg-background text-gold hover:bg-gold hover:text-background rounded flex items-center justify-center font-bold text-xs transition cursor-pointer"
                              title="Decrease"
                            >
                              -
                            </button>
                            <span className="text-xs font-bold text-ivory font-sans px-1">{totalQtyForProduct}</span>
                            <button
                              type="button"
                              onClick={() => handleAddExtraItem(item)}
                              disabled={item.stock > 0 && totalQtyForProduct >= item.stock}
                              className={`w-6 h-6 bg-background text-gold rounded flex items-center justify-center font-bold text-xs transition ${
                                item.stock > 0 && totalQtyForProduct >= item.stock ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gold hover:text-background cursor-pointer'
                              }`}
                              title="Increase"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddExtraItem(item)}
                            className="px-3 py-1.5 bg-gold hover:bg-gold-light text-background font-bold text-[11px] uppercase tracking-wider rounded font-sans transition shrink-0 cursor-pointer shadow-gold-glow flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-xs font-bold">add</span>
                            Add
                          </button>
                        )}
                      </div>

                      {/* Color Options Selection Pills */}
                      {item.colors && item.colors.length > 0 && (
                        <div className="pt-2 border-t border-gold/10 font-sans">
                          <div className="flex items-center justify-between text-[9px] uppercase font-bold text-gold tracking-wider mb-1 font-sans">
                            <span>Color: <strong className="text-ivory font-extrabold">{activeColorName}</strong></span>
                            <span className="text-muted/70 font-normal">({item.colors.length} Available)</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {item.colors.map((cOpt, cIdx) => {
                              const isSelected = activeColorName === cOpt.name;
                              return (
                                <button
                                  key={cIdx}
                                  type="button"
                                  onClick={() => setSelectedExtraColors(prev => ({ ...prev, [item.id]: cOpt.name }))}
                                  className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold transition border flex items-center gap-1 cursor-pointer ${
                                    isSelected
                                      ? 'bg-gold text-background border-gold shadow-xs'
                                      : 'bg-charcoal text-ivory/80 border-gold/20 hover:border-gold/50'
                                  }`}
                                >
                                  {cOpt.hex && (
                                    <span
                                      className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0 shadow-xs"
                                      style={{ backgroundColor: cOpt.hex }}
                                    />
                                  )}
                                  <span>{cOpt.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

              {/* Empty state when no items match category filter / search */}
              {availableInventory.filter(i => {
                const categoryMatch = extraCategoryFilter === 'All' || (i.category && i.category.toLowerCase() === extraCategoryFilter.toLowerCase());
                const searchMatch = !extraSearchQuery || 
                  i.name.toLowerCase().includes(extraSearchQuery.toLowerCase()) || 
                  (i.category && i.category.toLowerCase().includes(extraSearchQuery.toLowerCase()));
                return categoryMatch && searchMatch;
              }).length === 0 && (
                <div className="col-span-full py-8 text-center border border-dashed border-gold/20 rounded-lg space-y-2">
                  <span className="material-symbols-outlined text-gold/50 text-3xl">inventory_2</span>
                  <p className="text-xs text-ivory/80 font-sans font-medium">No items found in "{extraCategoryFilter}" category</p>
                  {extraSearchQuery && <p className="text-[11px] text-muted font-sans">matching "{extraSearchQuery}"</p>}
                  <button
                    type="button"
                    onClick={() => { setExtraCategoryFilter('All'); setExtraSearchQuery(''); }}
                    className="inline-block px-3 py-1 bg-gold/15 hover:bg-gold/30 text-gold text-xs font-sans font-bold rounded transition mt-1 cursor-pointer"
                  >
                    Show All Categories
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Added Extra Items Summary Strip */}
            <div className="pt-3 border-t border-gold/15 space-y-2">
              <div className="flex items-center justify-between text-xs font-sans">
                <span className="font-bold text-gold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">shopping_bag</span>
                  <span>Added Extra Items ({extraAddedItems.reduce((acc, i) => acc + i.quantity, 0)})</span>
                </span>
                {extraAddedItems.length > 0 && (
                  <span className="font-mono text-gold font-bold text-xs">
                    Subtotal: +Rs. {extraAddedItems.reduce((sum, i) => sum + i.price * i.quantity, 0).toLocaleString()}.00
                  </span>
                )}
              </div>

              {extraAddedItems.length > 0 ? (
                <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-gold/30">
                  {extraAddedItems.map((addedItem, idx) => (
                    <div
                      key={`${addedItem.itemId}-${(addedItem as any).selectedColor || idx}`}
                      className="bg-background border border-gold/30 rounded-lg p-2 flex items-center gap-2.5 shrink-0 min-w-[210px] shadow-sm relative group"
                    >
                      <img
                        src={addedItem.image || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=600&auto=format&fit=crop'}
                        alt={addedItem.name}
                        className="w-10 h-10 object-cover rounded border border-gold/20 shrink-0 bg-charcoal"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-ivory text-xs truncate leading-tight">{addedItem.name}</p>
                        <p className="text-[10px] text-gold font-mono font-semibold">+Rs. {(addedItem.price * addedItem.quantity).toLocaleString()}.00</p>
                      </div>

                      {/* Quantity adjustment & Remove */}
                      <div className="flex items-center gap-1 bg-charcoal border border-gold/25 rounded p-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleUpdateExtraQty(addedItem.itemId, -1, (addedItem as any).selectedColor)}
                          className="w-5 h-5 bg-background text-gold hover:bg-gold hover:text-background rounded flex items-center justify-center font-bold text-[11px] transition cursor-pointer"
                          title="Decrease"
                        >
                          -
                        </button>
                        <span className="text-[11px] font-bold text-ivory font-sans px-1">{addedItem.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateExtraQty(addedItem.itemId, 1, (addedItem as any).selectedColor)}
                          className="w-5 h-5 bg-background text-gold hover:bg-gold hover:text-background rounded flex items-center justify-center font-bold text-[11px] transition cursor-pointer"
                          title="Increase"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveExtraItem(addedItem.itemId, (addedItem as any).selectedColor)}
                        className="text-muted/60 hover:text-red-400 transition material-symbols-outlined text-sm cursor-pointer p-0.5 ml-0.5"
                        title="Remove"
                      >
                        close
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted font-sans italic py-1">
                  No extra items added yet. Click "+ Add" on items above to include them into this gift package.
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-gold/15 flex items-center justify-between">
              <span className="text-xs text-muted font-sans">
                {extraAddedItems.length > 0
                  ? `${extraAddedItems.reduce((acc, i) => acc + i.quantity, 0)} extra item(s) selected`
                  : 'No extra items added'}
              </span>
              <button
                type="button"
                onClick={() => setShowAddExtraModal(false)}
                className="px-6 py-2 bg-gold hover:bg-gold-light text-background font-bold text-xs uppercase tracking-wider rounded cursor-pointer transition shadow-gold-glow"
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
