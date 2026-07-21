import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

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
  }
];

export const ProductDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'details' | 'wrapping'>('details');

  // Gift options
  const [giftMessage, setGiftMessage] = useState<string>('');
  const [wrappingOption, setWrappingOption] = useState<string>('Standard Premium Box');

  useEffect(() => {
    const stored = localStorage.getItem('sparkle_products');
    const productList: Product[] = stored ? JSON.parse(stored) : DEFAULT_PRODUCTS;
    const found = productList.find(p => p.slug === slug);
    setProduct(found || null);
    setActiveImageIndex(0);
  }, [slug]);

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

  const handleAddToCart = () => {
    const cartStr = localStorage.getItem('sparkle_cart');
    const cart = cartStr ? JSON.parse(cartStr) : [];
    
    // Check if item already exists in cart with same wrapping & message
    const existingIndex = cart.findIndex((item: any) => 
      item.productId === product.id && 
      item.wrapping === wrappingOption && 
      item.giftMessage === giftMessage
    );

    if (existingIndex > -1) {
      cart[existingIndex].quantity = Math.min(product.stock, cart[existingIndex].quantity + quantity);
    } else {
      cart.push({
        productId: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        quantity: quantity,
        wrapping: wrappingOption,
        giftMessage: giftMessage,
        image: product.images?.[0]
      });
    }

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
          <div className="gold-gradient-border bg-charcoal h-[450px] overflow-hidden rounded relative">
            {product.images && product.images.length > 0 ? (
              <img
                src={product.images[activeImageIndex]}
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

          {/* Image Thumbnails list */}
          {product.images && product.images.length > 1 && (
            <div className="flex gap-3">
              {product.images.map((img, idx) => (
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

        {/* PRODUCT DETAILS */}
        <div className="space-y-6">
          <div>
            <span className="text-gold tracking-widest text-[10px] uppercase font-sans font-semibold">
              {product.category} • {product.occasion}
            </span>
            <h1 className="text-4xl font-serif mt-1 mb-2 text-ivory">{product.name}</h1>
            
            <div className="flex items-center gap-4 mt-2">
              <p className="text-2xl text-gold font-serif">
                LKR {product.price.toLocaleString()}.00
              </p>
              {product.old_price && (
                <p className="text-sm text-muted line-through">
                  LKR {product.old_price.toLocaleString()}.00
                </p>
              )}
            </div>
          </div>

          <p className="text-muted leading-relaxed text-sm">
            {product.description}
          </p>

          <div className="space-y-2 border-t border-b border-gold/10 py-4 text-xs font-sans uppercase tracking-wider text-muted">
            <p>Color Palette: <span className="text-ivory font-semibold">{product.color}</span></p>
            <p>Availability: <span className={product.stock > 0 ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
              {product.stock > 0 ? `${product.stock} units left` : 'Sold Out'}
            </span></p>
          </div>

          {/* GIFT PERSONALIZATION OPTIONS */}
          <div className="gold-gradient-border bg-charcoal p-5 rounded space-y-4">
            <h3 className="text-xs uppercase text-gold font-sans tracking-widest font-semibold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">redeem</span>
              Personalize Your Gift Box
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
                className="w-full bg-background border border-gold/25 p-2.5 rounded text-xs text-ivory placeholder-muted/50 focus:border-gold outline-none h-20 resize-none"
              />
            </div>

            {/* Premium Wrapping Selector */}
            <div className="space-y-1">
              <label className="block text-xs text-muted font-medium uppercase font-sans tracking-wide">
                Premium Wrapping & presentation
              </label>
              <select
                value={wrappingOption}
                onChange={(e) => setWrappingOption(e.target.value)}
                className="w-full bg-background border border-gold/25 p-2.5 rounded text-xs text-ivory focus:border-gold outline-none cursor-pointer"
              >
                <option value="Standard Premium Box">Standard Premium Box (complimentary)</option>
                <option value="Premium Gold Foil & Black Ribbon">Premium Gold Foil & Black Ribbon (+Rs.500.00)</option>
                <option value="Velvet Wrap with Dried Florals">Velvet Wrap with Dried Florals (+Rs.1,200.00)</option>
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
                className="flex-1 py-3 bg-gold hover:bg-gold-light text-background font-semibold font-sans uppercase tracking-widest text-xs transition duration-300 shadow-gold-glow"
              >
                Add to Luxury Cart
              </button>
            </div>
          )}
        </div>
      </div>

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
              <p>Each box is handcrafted by our curators in Colombo using only premium materials and sourced items. We prioritize local artisans and organic materials to deliver gifts that make a lasting impression.</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Dimensions: 30cm x 22cm x 11cm signature keepsake magnetic box.</li>
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
