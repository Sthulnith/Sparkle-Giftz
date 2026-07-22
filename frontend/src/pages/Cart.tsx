import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface CustomItem {
  id: number | string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  image?: string;
}

interface CustomGiftDetails {
  boxSize: string;
  boxColor: string;
  boxColorHex?: string;
  ribbonColor?: string;
  greetingCard?: string;
  wrapping?: string;
  giftMessage?: string;
  items: CustomItem[];
}

interface CartItem {
  productId: number | string;
  name: string;
  slug: string;
  price: number;
  quantity: number;
  wrapping: string;
  giftMessage: string;
  image?: string;
  isCustom?: boolean;
  customDetails?: CustomGiftDetails;
}

export const Cart = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const cartStr = localStorage.getItem('sparkle_cart');
    if (cartStr) {
      try {
        setCartItems(JSON.parse(cartStr));
      } catch (e) {
        setCartItems([]);
      }
    }
  }, []);

  const saveCart = (items: CartItem[]) => {
    localStorage.setItem('sparkle_cart', JSON.stringify(items));
    setCartItems(items);
    window.dispatchEvent(new Event('sparkle_cart_updated'));
  };

  const handleUpdateQuantity = (idx: number, delta: number) => {
    const updated = [...cartItems];
    const newQty = updated[idx].quantity + delta;
    if (newQty <= 0) {
      updated.splice(idx, 1);
    } else {
      updated[idx].quantity = newQty;
    }
    saveCart(updated);
  };

  const handleRemoveItem = (idx: number) => {
    const updated = [...cartItems];
    updated.splice(idx, 1);
    saveCart(updated);
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = 0; // Complimentary
  const total = subtotal + deliveryFee;

  if (cartItems.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center py-16 px-4 max-w-4xl mx-auto">
        <h1 className="text-3xl font-serif mb-6 gold-text-gradient uppercase tracking-wider">Your Luxury Cart</h1>
        <div className="gold-gradient-border bg-charcoal p-12 rounded text-center w-full max-w-xl">
          <span className="material-symbols-outlined text-gold text-5xl mb-4">shopping_bag</span>
          <p className="text-ivory mb-6 font-sans text-sm font-light">Your luxury cart is currently empty.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/shop"
              className="inline-block px-6 py-3 bg-charcoal hover:bg-gold/10 border border-gold/40 text-gold font-semibold font-sans text-xs uppercase tracking-widest transition duration-300 rounded"
            >
              Browse Shop Collection
            </Link>
            <Link
              to="/customize-gift"
              className="inline-block px-6 py-3 bg-gold hover:bg-gold-light text-background font-bold font-sans text-xs uppercase tracking-widest transition duration-300 rounded shadow"
            >
              Customize Your Own Gift
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-16 px-4 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-serif gold-text-gradient uppercase tracking-widest">Your Luxury Cart</h1>
        <p className="text-muted mt-1 font-sans text-xs uppercase tracking-wider">Review your selected gift boxes and custom options.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* CART ITEMS LIST */}
        <div className="lg:col-span-2 space-y-6">
          {cartItems.map((item, idx) => (
            <div
              key={`${item.productId}-${idx}`}
              className="gold-gradient-border bg-charcoal p-5 rounded flex flex-col sm:flex-row gap-6 relative group"
            >
              {/* Product Image */}
              <div className="w-full sm:w-36 h-36 bg-background rounded overflow-hidden border border-gold/15 shrink-0 relative">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-muted uppercase">
                    No Image
                  </div>
                )}
                {item.isCustom && (
                  <span className="absolute top-2 left-2 bg-gold text-background text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow">
                    BESPOKE
                  </span>
                )}
              </div>

              {/* Product Info & personalization */}
              <div className="flex-grow space-y-2.5">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h3 className="font-serif text-lg text-ivory">{item.name}</h3>
                    {item.isCustom && (
                      <span className="text-[11px] text-gold font-sans font-bold flex items-center gap-1 mt-0.5">
                        <span className="material-symbols-outlined text-sm">auto_awesome</span>
                        Custom Curation
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveItem(idx)}
                    className="text-muted hover:text-red-400 transition"
                    title="Remove item"
                  >
                    <span className="material-symbols-outlined text-xl">delete</span>
                  </button>
                </div>

                {/* Custom Gift Breakdown if custom */}
                {item.isCustom && item.customDetails && item.customDetails.items && (
                  <div className="bg-background/60 p-3 rounded border border-gold/15 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-muted border-b border-gold/10 pb-1 text-[11px]">
                      <span>Box Size: <strong className="text-gold">{item.customDetails.boxSize}</strong></span>
                      <span>Color: <strong className="text-ivory">{item.customDetails.boxColor}</strong></span>
                    </div>

                    <p className="text-[10px] uppercase tracking-wider text-gold font-semibold">Included Items ({item.customDetails.items.length}):</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                      {item.customDetails.items.map((cItem, cIdx) => (
                        <div key={cIdx} className="flex items-center gap-1.5 text-muted">
                          <span className="text-gold font-bold">•</span>
                          <span className="truncate text-ivory">{cItem.name}</span>
                          <span className="text-muted text-[10px]">({cItem.quantity}x)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pre-Made Custom Box Breakdown */}
                {(item as any).isCustomPreMadeBox && (item as any).preMadeCustomDetails && (
                  <div className="bg-background/60 p-3 rounded border border-gold/15 space-y-2 text-xs">
                    <p className="text-[10px] uppercase tracking-wider text-gold font-semibold">Customized Package Manifest:</p>
                    <div className="space-y-1 text-[11px]">
                      {(item as any).preMadeCustomDetails.keptItems?.map((kItem: any, kIdx: number) => (
                        <div key={kIdx} className="flex items-center gap-1.5 text-ivory">
                          <span className="text-gold font-bold">✓</span>
                          <span className="truncate">{kItem.quantity}x {kItem.name}</span>
                        </div>
                      ))}
                      {(item as any).preMadeCustomDetails.removedItems?.map((rItem: any, rIdx: number) => (
                        <div key={rIdx} className="flex items-center gap-1.5 text-red-400/80 line-through">
                          <span>✗</span>
                          <span className="truncate">{rItem.quantity}x {rItem.name} (Removed)</span>
                        </div>
                      ))}
                      {(item as any).preMadeCustomDetails.extraAddedItems?.map((eItem: any, eIdx: number) => (
                        <div key={eIdx} className="flex items-center gap-1.5 text-green-400">
                          <span>+</span>
                          <span className="truncate">{eItem.quantity}x {eItem.name} (Extra Added)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-1 text-xs text-muted font-sans">
                  <p>
                    <span className="text-gold font-medium">Wrapping:</span> {item.wrapping}
                  </p>
                  {item.giftMessage ? (
                    <p className="bg-background/50 p-2 border-l border-gold/40 italic mt-1 text-[11px] rounded text-ivory">
                      "{item.giftMessage}"
                    </p>
                  ) : (
                    <p className="text-[10px] text-muted/65 italic">No greeting card message added</p>
                  )}
                </div>

                {/* Price & Quantity Controls */}
                <div className="flex justify-between items-center pt-2 border-t border-gold/10">
                  <p className="text-gold font-sans text-base font-bold">
                    LKR {item.price.toLocaleString()}.00
                  </p>

                  <div className="flex border border-gold/25 rounded overflow-hidden">
                    <button
                      onClick={() => handleUpdateQuantity(idx, -1)}
                      className="px-2.5 py-1 hover:bg-gold/10 text-gold text-xs transition font-bold"
                    >
                      -
                    </button>
                    <span className="bg-transparent w-8 text-center text-ivory text-xs flex items-center justify-center font-sans font-bold">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleUpdateQuantity(idx, 1)}
                      className="px-2.5 py-1 hover:bg-gold/10 text-gold text-xs transition font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ORDER SUMMARY */}
        <div>
          <div className="gold-gradient-border bg-charcoal p-6 rounded space-y-6 sticky top-28">
            <h2 className="text-xl font-serif text-gold border-b border-gold/15 pb-3 uppercase tracking-wider">
              Order Summary
            </h2>

            <div className="space-y-3 font-sans text-xs">
              <div className="flex justify-between text-muted">
                <span>Subtotal</span>
                <span className="text-ivory">LKR {subtotal.toLocaleString()}.00</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Premium Delivery</span>
                <span className="text-green-400 font-bold uppercase tracking-wide">Complimentary</span>
              </div>
            </div>

            <div className="border-t border-gold/20 pt-4 flex justify-between items-baseline">
              <span className="font-serif text-base text-ivory">Total</span>
              <span className="font-sans text-xl font-bold text-gold">LKR {total.toLocaleString()}.00</span>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              className="block text-center w-full py-3 bg-gold hover:bg-gold-light text-background font-semibold font-sans text-xs uppercase tracking-widest transition duration-300 shadow-gold-glow mt-4"
            >
              Proceed to Secure Checkout
            </button>

            <Link
              to="/shop"
              className="block text-center text-xs text-muted hover:text-gold transition font-sans uppercase tracking-wider mt-2"
            >
              Or Continue Curating
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};
