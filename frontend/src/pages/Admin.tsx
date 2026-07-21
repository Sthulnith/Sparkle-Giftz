import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import {
  clearSession,
  isAuthenticated,
} from '../lib/auth';


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

interface Order {
  id: number;
  orderNumber: string;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: 'COD' | 'PAYHERE';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED';
  orderStatus: 'PENDING' | 'CONFIRMED' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  giftMessage?: string;
  wrapping?: string;
  createdAt: string;
  deliveryDate?: string;
}

interface ClientReview {
  id: number;
  image: string;
  message: string;
  time: string;
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

const DEFAULT_ORDERS: Order[] = [
  {
    id: 1,
    orderNumber: 'SG-20260717-0001',
    customerName: 'Julian Ross',
    phone: '+94 77 987 6543',
    email: 'julian.ross@email.com',
    address: '45 Parliament Road, Kotte',
    city: 'Colombo',
    subtotal: 28500,
    deliveryFee: 0,
    total: 28500,
    paymentMethod: 'COD',
    paymentStatus: 'PENDING',
    orderStatus: 'CONFIRMED',
    giftMessage: 'Thanks for the outstanding collaboration.',
    wrapping: 'Premium Gold Foil & Black Ribbon',
    createdAt: '2026-07-17T08:12:00Z',
  },
  {
    id: 2,
    orderNumber: 'SG-20260716-0002',
    customerName: 'Sara Jenkins',
    phone: '+94 71 234 5678',
    email: 'sara.j@email.com',
    address: '12 Marine Drive, Kollupitiya',
    city: 'Colombo',
    subtotal: 24500,
    deliveryFee: 0,
    total: 24500,
    paymentMethod: 'PAYHERE',
    paymentStatus: 'PAID',
    orderStatus: 'DELIVERED',
    giftMessage: 'Happy Anniversary, my love! To many more years together.',
    wrapping: 'Velvet Wrap with Dried Florals',
    createdAt: '2026-07-16T14:45:00Z',
  },
  {
    id: 3,
    orderNumber: 'SG-20260717-0003',
    customerName: 'Eleanor Vance',
    phone: '+94 77 111 2222',
    email: 'eleanor@vance.com',
    address: '78 Flower Road',
    city: 'Colombo',
    subtotal: 12500,
    deliveryFee: 0,
    total: 12500,
    paymentMethod: 'PAYHERE',
    paymentStatus: 'PENDING',
    orderStatus: 'PENDING',
    giftMessage: 'Wishing you a magnificent birthday full of sparkle.',
    wrapping: 'Classic Matte Black Ribbon',
    createdAt: '2026-07-17T09:02:00Z',
  }
];

export const Admin = () => {
  const navigate = useNavigate();

  // ── Auth state ──────────────────────────────────────────────────────────────
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const [authed, setAuthed]           = useState<boolean>(false);
  const [adminEmail, setAdminEmail]   = useState<string>('');

  // Dashboard Tabs
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'reviews'>('products');

  // Stateful Data
  const [products, setProducts]           = useState<Product[]>([]);
  const [orders, setOrders]               = useState<Order[]>([]);
  const [clientReviews, setClientReviews] = useState<ClientReview[]>([]);

  // Selected Item Modals
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState<boolean>(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isAddingReview, setIsAddingReview] = useState<boolean>(false);

  // New review form states
  const [newReviewImage, setNewReviewImage] = useState<string>('');

  // New Image inputs helper
  const [urlInput, setUrlInput] = useState<string>('');

  // New Product Form State
  const [newProduct, setNewProduct] = useState<Omit<Product, 'id'>>({
    name: '',
    slug: '',
    description: '',
    price: 0,
    old_price: undefined,
    category: 'Gift Boxes',
    occasion: 'Birthday',
    color: 'Black',
    stock: 10,
    is_variable: false,
    images: []
  });

  const loadData = useCallback(() => {
    // Seed products
    const storedProducts = localStorage.getItem('sparkle_products');
    if (storedProducts) {
      setProducts(JSON.parse(storedProducts));
    } else {
      localStorage.setItem('sparkle_products', JSON.stringify(DEFAULT_PRODUCTS));
      setProducts(DEFAULT_PRODUCTS);
    }

    // Seed orders
    const storedOrders = localStorage.getItem('sparkle_orders');
    if (storedOrders) {
      setOrders(JSON.parse(storedOrders));
    } else {
      localStorage.setItem('sparkle_orders', JSON.stringify(DEFAULT_ORDERS));
      setOrders(DEFAULT_ORDERS);
    }

    // Seed client reviews
    const storedClientReviews = localStorage.getItem('sparkle_client_reviews');
    if (storedClientReviews) {
      setClientReviews(JSON.parse(storedClientReviews));
    } else {
      const defaultReviews: ClientReview[] = [
        {
          id: 1,
          image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=400&auto=format&fit=crop',
          message: 'Thank you so much! ❤️ I received the gift before the time. The wrapping looks so premium! He loved it.',
          time: '10:30 AM',
        },
        {
          id: 2,
          image: 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?q=80&w=400&auto=format&fit=crop',
          message: 'Omg he is so happy with the Midnight Box! The champagne glasses are absolutely beautiful. Thanks a lot for the quick delivery! 🥰',
          time: '02:15 PM',
        },
        {
          id: 3,
          image: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?q=80&w=400&auto=format&fit=crop',
          message: 'Highly satisfied with the executive curation. Gift boxes are solid wood-like cardboard feel, ribbon detail is neat. LKR 100% worth it.',
          time: '07:45 PM',
        },
      ];
      localStorage.setItem('sparkle_client_reviews', JSON.stringify(defaultReviews));
      setClientReviews(defaultReviews);
    }
  }, []);

  // ── Session check on mount ───────────────────────────────────────────────────
  useEffect(() => {
    isAuthenticated().then((ok) => {
      setAuthed(ok);
      setAuthChecked(true);
      if (!ok) {
        navigate('/login?expired=1', { replace: true });
        return;
      }
      setAdminEmail('admin@sparklegiftz.com');
      loadData();
    });
  }, [navigate, loadData]);

  // ── Logout handler ───────────────────────────────────────────────────────────
  const handleLogout = () => {
    clearSession();
    sessionStorage.removeItem('sg_api_token');
    setAuthed(false);
    setAdminEmail('');
    navigate('/login', { replace: true });
  };

  // Review Image Upload Handler
  const handleReviewImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setNewReviewImage(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleReviewSubmit = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!newReviewImage) {
      alert('Please upload or enter a review image first.');
      return;
    }
    const created: ClientReview = {
      id: Date.now(),
      image: newReviewImage,
      message: '',
      time: 'Just now'
    };
    const updated = [created, ...clientReviews];
    setClientReviews(updated);
    localStorage.setItem('sparkle_client_reviews', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));
    
    // Explicitly close the modal popup immediately
    setIsAddingReview(false);
    
    // Reset state values
    setNewReviewImage('');
  };

  const handleDeleteReview = (id: number) => {
    if (window.confirm('Are you sure you want to remove this customer review?')) {
      const updated = clientReviews.filter(r => r.id !== id);
      setClientReviews(updated);
      localStorage.setItem('sparkle_client_reviews', JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));
    }
  };

  // Image Upload Handler (reads image files as base64 string)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (isEdit && editingProduct) {
        setEditingProduct({
          ...editingProduct,
          images: [...(editingProduct.images || []), base64String]
        });
      } else {
        setNewProduct(prev => ({
          ...prev,
          images: [...(prev.images || []), base64String]
        }));
      }
    };
    reader.readAsDataURL(file);
    // Reset file input value so same file can be uploaded again if needed
    e.target.value = '';
  };

  // Add Image via URL
  const handleAddImageUrl = (isEdit: boolean) => {
    if (!urlInput.trim()) return;
    if (isEdit && editingProduct) {
      setEditingProduct({
        ...editingProduct,
        images: [...(editingProduct.images || []), urlInput.trim()]
      });
    } else {
      setNewProduct(prev => ({
        ...prev,
        images: [...(prev.images || []), urlInput.trim()]
      }));
    }
    setUrlInput('');
  };

  // Remove Image from list
  const handleRemoveImage = (index: number, isEdit: boolean) => {
    if (isEdit && editingProduct) {
      const updatedImages = [...(editingProduct.images || [])];
      updatedImages.splice(index, 1);
      setEditingProduct({
        ...editingProduct,
        images: updatedImages
      });
    } else {
      const updatedImages = [...(newProduct.images || [])];
      updatedImages.splice(index, 1);
      setNewProduct(prev => ({
        ...prev,
        images: updatedImages
      }));
    }
  };

  // Product CRUD Handlers
  const handleAddProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
    const finalSlug = newProduct.slug || newProduct.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const created: Product = {
      ...newProduct,
      id: nextId,
      slug: finalSlug
    };
    const updated = [...products, created];
    setProducts(updated);
    localStorage.setItem('sparkle_products', JSON.stringify(updated));
    setIsAddingProduct(false);
    // Reset Form
    setNewProduct({
      name: '',
      slug: '',
      description: '',
      price: 0,
      old_price: undefined,
      category: 'Gift Boxes',
      occasion: 'Birthday',
      color: 'Black',
      stock: 10,
      is_variable: false,
      images: []
    });
  };

  const handleUpdateProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    const updated = products.map(p => p.id === editingProduct.id ? editingProduct : p);
    setProducts(updated);
    localStorage.setItem('sparkle_products', JSON.stringify(updated));
    setEditingProduct(null);
  };

  const handleDeleteProduct = (id: number) => {
    if (window.confirm('Are you sure you want to remove this product?')) {
      const updated = products.filter(p => p.id !== id);
      setProducts(updated);
      localStorage.setItem('sparkle_products', JSON.stringify(updated));
    }
  };

  // Order Status Handler
  const handleOrderStatusChange = (orderId: number, status: Order['orderStatus']) => {
    const updated = orders.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          orderStatus: status,
          paymentStatus: status === 'DELIVERED' ? 'PAID' as const : o.paymentStatus
        };
      }
      return o;
    });
    setOrders(updated);
    localStorage.setItem('sparkle_orders', JSON.stringify(updated));
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({
        ...selectedOrder,
        orderStatus: status,
        paymentStatus: status === 'DELIVERED' ? 'PAID' as const : selectedOrder.paymentStatus
      });
    }
  };

  // ── Session check spinner ───────────────────────────────────────────────────
  if (!authChecked || !authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          <p className="text-xs text-muted uppercase tracking-widest font-sans">Verifying session…</p>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-background py-10 px-4 md:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center border-b border-gold/15 pb-6 gap-4">
          <div className="flex items-center gap-4">
            <img src={logo} alt="Sparkle Giftz Logo" className="h-12 w-auto object-contain" />
            <div>
              <h1 className="text-4xl font-serif gold-text-gradient">Console Desk</h1>
              <p className="text-xs font-sans uppercase tracking-[0.25em] text-muted mt-1">Manage Products & Client Requests</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-muted">Signed in as</p>
              <p className="text-sm text-gold font-medium">{adminEmail}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 border border-gold/30 hover:border-gold hover:text-gold text-xs font-sans uppercase tracking-wider transition-all duration-300"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              Logout
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-gold/10">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-6 py-3 font-serif text-lg tracking-wide border-b-2 transition duration-300 ${
              activeTab === 'products'
                ? 'border-gold text-gold font-semibold'
                : 'border-transparent text-muted hover:text-ivory'
            }`}
          >
            Product Catalog ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-6 py-3 font-serif text-lg tracking-wide border-b-2 transition duration-300 ${
              activeTab === 'orders'
                ? 'border-gold text-gold font-semibold'
                : 'border-transparent text-muted hover:text-ivory'
            }`}
          >
            Client Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-6 py-3 font-serif text-lg tracking-wide border-b-2 transition duration-300 ${
              activeTab === 'reviews'
                ? 'border-gold text-gold font-semibold'
                : 'border-transparent text-muted hover:text-ivory'
            }`}
          >
            Customer Reviews ({clientReviews.length})
          </button>
        </div>

        {/* PRODUCTS TAB CONTENT */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="font-serif text-2xl text-gold">Storefront Products</h2>
              <button
                onClick={() => setIsAddingProduct(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-gold hover:bg-gold-light text-background text-xs uppercase tracking-wider font-semibold font-sans transition duration-300"
              >
                <span className="material-symbols-outlined text-sm font-bold">add</span>
                Add New Box
              </button>
            </div>

            <div className="gold-gradient-border bg-charcoal overflow-hidden rounded-lg shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gold/15 text-gold text-xs uppercase tracking-wider font-sans bg-background/45">
                      <th className="p-4">Image</th>
                      <th className="p-4">Name</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Occasion</th>
                      <th className="p-4">Stock</th>
                      <th className="p-4">Price</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gold/10">
                    {products.map((product) => (
                      <tr key={product.id} className="hover:bg-gold/5 transition duration-150 text-ivory">
                        <td className="p-4">
                          {product.images && product.images.length > 0 ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded border border-gold/25"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded border border-gold/15 bg-background flex items-center justify-center text-muted text-[10px] uppercase font-sans">
                              No image
                            </div>
                          )}
                        </td>
                        <td className="p-4 font-semibold">{product.name}</td>
                        <td className="p-4 text-xs text-muted">{product.category}</td>
                        <td className="p-4 text-xs text-muted">{product.occasion}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 text-xs font-semibold rounded ${
                            product.stock <= 5 ? 'bg-red-950/40 text-red-200 border border-red-500/20' : 'bg-green-950/40 text-green-200 border border-green-500/20'
                          }`}>
                            {product.stock} units
                          </span>
                        </td>
                        <td className="p-4 text-gold font-medium">Rs.{product.price.toLocaleString()}.00</td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingProduct(product)}
                              className="p-2 border border-gold/20 hover:border-gold hover:text-gold transition text-muted rounded"
                              title="Edit product"
                            >
                              <span className="material-symbols-outlined text-sm block">edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="p-2 border border-red-900/30 hover:border-red-500 hover:text-red-300 transition text-muted rounded"
                              title="Delete product"
                            >
                              <span className="material-symbols-outlined text-sm block">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ORDERS TAB CONTENT */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <h2 className="font-serif text-2xl text-gold">Recent Transactions</h2>

            <div className="gold-gradient-border bg-charcoal overflow-hidden rounded-lg shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gold/15 text-gold text-xs uppercase tracking-wider font-sans bg-background/45">
                      <th className="p-4">Order Ref</th>
                      <th className="p-4">Client</th>
                      <th className="p-4">Placed Date</th>
                      <th className="p-4">Required Date</th>
                      <th className="p-4">Total</th>
                      <th className="p-4">Payment</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gold/10">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gold/5 transition duration-150 text-ivory">
                        <td className="p-4 font-mono font-bold text-gold text-xs">{order.orderNumber}</td>
                        <td className="p-4">
                          <p className="font-semibold">{order.customerName}</p>
                          <p className="text-[11px] text-muted">{order.city}</p>
                        </td>
                        <td className="p-4 text-xs text-muted">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-xs text-gold font-semibold">
                          {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : 'Standard'}
                        </td>
                        <td className="p-4 text-gold font-medium">Rs.{order.total.toLocaleString()}.00</td>
                        <td className="p-4 text-xs">
                          <span className="block font-medium">{order.paymentMethod}</span>
                          <span className={`text-[10px] uppercase font-bold tracking-wider ${
                            order.paymentStatus === 'PAID' ? 'text-green-400' : 'text-yellow-400'
                          }`}>
                            {order.paymentStatus}
                          </span>
                        </td>
                        <td className="p-4">
                          <select
                            value={order.orderStatus}
                            onChange={(e) => handleOrderStatusChange(order.id, e.target.value as any)}
                            className="bg-background border border-gold/25 text-xs text-ivory p-1.5 rounded focus:border-gold outline-none cursor-pointer"
                          >
                            <option value="PENDING">PENDING</option>
                            <option value="CONFIRMED">CONFIRMED</option>
                            <option value="PACKED">PACKED</option>
                            <option value="SHIPPED">SHIPPED</option>
                            <option value="DELIVERED">DELIVERED</option>
                            <option value="CANCELLED">CANCELLED</option>
                          </select>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="px-3.5 py-1.5 border border-gold/30 hover:border-gold hover:text-gold text-xs font-sans uppercase tracking-wider transition-all duration-300"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* REVIEWS TAB CONTENT */}
        {activeTab === 'reviews' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="font-serif text-2xl text-gold">Customer Review Gallery</h2>
              <button
                onClick={() => setIsAddingReview(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-gold hover:bg-gold-light text-background text-xs uppercase tracking-wider font-semibold font-sans transition duration-300"
              >
                <span className="material-symbols-outlined text-sm font-bold">add</span>
                Add Review Image
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
              {clientReviews.map((review) => (
                <div key={review.id} className="gold-gradient-border bg-charcoal p-2 sm:p-4 rounded relative space-y-2 sm:space-y-3 group">
                  <div className="w-full bg-background border border-gold/10 rounded overflow-hidden relative">
                    <img src={review.image} alt="review" className="w-full h-auto max-h-72 object-cover block" />
                    <button
                      onClick={() => handleDeleteReview(review.id)}
                      className="absolute top-2 right-2 p-1.5 sm:p-2 bg-black/70 hover:bg-red-950/85 border border-gold/20 hover:border-red-500 text-gold hover:text-red-300 rounded transition duration-200"
                      title="Delete Review"
                    >
                      <span className="material-symbols-outlined text-sm block">delete</span>
                    </button>
                  </div>
                  {review.message && (
                    <div className="bg-background/50 p-3 rounded border border-gold/5 text-xs text-muted leading-relaxed font-sans">
                      "{review.message}"
                    </div>
                  )}
                  {review.time && (
                    <div className="text-[10px] text-gold/60 font-sans tracking-wide text-right">
                      {review.time}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODAL: ADD PRODUCT */}
        {isAddingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="gold-gradient-border bg-charcoal p-6 rounded-lg max-w-2xl w-full my-8">
              <div className="flex justify-between items-center border-b border-gold/15 pb-4 mb-6">
                <h3 className="font-serif text-2xl text-gold">Create Premium Gift Box</h3>
                <button
                  onClick={() => setIsAddingProduct(false)}
                  className="text-muted hover:text-gold transition duration-200 material-symbols-outlined"
                >
                  close
                </button>
              </div>

              <form onSubmit={handleAddProductSubmit} className="space-y-4 text-sm text-ivory">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-muted mb-1">Product Name</label>
                    <input
                      type="text"
                      required
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                      placeholder="e.g. Lavender Meadows"
                      className="w-full bg-background border border-gold/25 p-2.5 rounded text-ivory focus:border-gold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-muted mb-1">Custom Slug (optional)</label>
                    <input
                      type="text"
                      value={newProduct.slug}
                      onChange={(e) => setNewProduct({ ...newProduct, slug: e.target.value })}
                      placeholder="e.g. lavender-meadows"
                      className="w-full bg-background border border-gold/25 p-2.5 rounded text-ivory focus:border-gold outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-muted mb-1">Description</label>
                  <textarea
                    required
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    placeholder="Handcrafted organic soaps, premium essential oils..."
                    className="w-full bg-background border border-gold/25 p-2.5 rounded text-ivory focus:border-gold outline-none h-24 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-muted mb-1">Price (Rs.)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) })}
                      className="w-full bg-background border border-gold/25 p-2.5 rounded text-ivory focus:border-gold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-muted mb-1">Old Price (Rs. optional)</label>
                    <input
                      type="number"
                      min="0"
                      value={newProduct.old_price || ''}
                      onChange={(e) => setNewProduct({ ...newProduct, old_price: e.target.value ? parseFloat(e.target.value) : undefined })}
                      className="w-full bg-background border border-gold/25 p-2.5 rounded text-ivory focus:border-gold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-muted mb-1">Stock Quantity</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={newProduct.stock}
                      onChange={(e) => setNewProduct({ ...newProduct, stock: parseInt(e.target.value) })}
                      className="w-full bg-background border border-gold/25 p-2.5 rounded text-ivory focus:border-gold outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-muted mb-1">Category</label>
                    <select
                      value={newProduct.category}
                      onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                      className="w-full bg-background border border-gold/25 p-2.5 rounded text-ivory focus:border-gold outline-none"
                    >
                      <option value="Gift Boxes">Gift Boxes</option>
                      <option value="Signature Collection">Signature Collection</option>
                      <option value="Custom Curations">Custom Curations</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-muted mb-1">Occasion</label>
                    <select
                      value={newProduct.occasion}
                      onChange={(e) => setNewProduct({ ...newProduct, occasion: e.target.value })}
                      className="w-full bg-background border border-gold/25 p-2.5 rounded text-ivory focus:border-gold outline-none"
                    >
                      <option value="Birthday">Birthday</option>
                      <option value="Anniversary">Anniversary</option>
                      <option value="Newborn & Baby">Newborn & Baby</option>
                      <option value="Corporate Gifts">Corporate Gifts</option>
                      <option value="Romance">Romance</option>
                      <option value="Get Well">Get Well</option>
                      <option value="Congratulations">Congratulations</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-muted mb-1">Color Palette</label>
                    <input
                      type="text"
                      value={newProduct.color}
                      onChange={(e) => setNewProduct({ ...newProduct, color: e.target.value })}
                      placeholder="e.g. Sage, Crimson"
                      className="w-full bg-background border border-gold/25 p-2.5 rounded text-ivory focus:border-gold outline-none"
                    />
                  </div>
                </div>

                {/* IMAGES MANAGEMENT */}
                <div className="border-t border-gold/15 pt-4">
                  <h4 className="text-xs uppercase text-gold font-sans tracking-wide mb-3">Product Images</h4>
                  
                  {/* Preview grid */}
                  {newProduct.images && newProduct.images.length > 0 && (
                    <div className="grid grid-cols-5 gap-3 mb-4">
                      {newProduct.images.map((img, idx) => (
                        <div key={idx} className="relative w-full h-16 rounded border border-gold/20 bg-background overflow-hidden group">
                          <img src={img} alt="preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx, false)}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-400 hover:text-red-300 transition duration-200"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    {/* Add URL */}
                    <div className="space-y-1">
                      <label className="block text-xs text-muted">Add Image via URL</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={urlInput}
                          onChange={(e) => setUrlInput(e.target.value)}
                          placeholder="https://example.com/image.jpg"
                          className="flex-1 bg-background border border-gold/25 p-2.5 rounded text-ivory focus:border-gold outline-none text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddImageUrl(false)}
                          className="px-4 py-2 border border-gold hover:bg-gold hover:text-background text-xs uppercase tracking-wider font-semibold font-sans transition duration-200"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {/* File Dropzone */}
                    <div>
                      <label className="flex flex-col items-center justify-center border border-dashed border-gold/25 hover:border-gold bg-background/30 h-10 rounded cursor-pointer transition">
                        <span className="text-[11px] text-gold uppercase font-sans tracking-wider flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm">upload_file</span>
                          Upload Local Image
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, false)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gold/15 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddingProduct(false)}
                    className="px-5 py-2.5 border border-gold/30 hover:border-gold hover:text-gold text-xs font-sans uppercase tracking-wider transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-gold hover:bg-gold-light text-background font-semibold text-xs font-sans uppercase tracking-wider transition"
                  >
                    Add Product
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: EDIT PRODUCT */}
        {editingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="gold-gradient-border bg-charcoal p-6 rounded-lg max-w-2xl w-full my-8">
              <div className="flex justify-between items-center border-b border-gold/15 pb-4 mb-6">
                <h3 className="font-serif text-2xl text-gold">Edit Premium Gift Box</h3>
                <button
                  onClick={() => setEditingProduct(null)}
                  className="text-muted hover:text-gold transition duration-200 material-symbols-outlined"
                >
                  close
                </button>
              </div>

              <form onSubmit={handleUpdateProductSubmit} className="space-y-4 text-sm text-ivory">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-muted mb-1">Product Name</label>
                    <input
                      type="text"
                      required
                      value={editingProduct.name}
                      onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                      className="w-full bg-background border border-gold/25 p-2.5 rounded text-ivory focus:border-gold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-muted mb-1">Slug</label>
                    <input
                      type="text"
                      required
                      value={editingProduct.slug}
                      onChange={(e) => setEditingProduct({ ...editingProduct, slug: e.target.value })}
                      className="w-full bg-background border border-gold/25 p-2.5 rounded text-ivory focus:border-gold outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-muted mb-1">Description</label>
                  <textarea
                    required
                    value={editingProduct.description}
                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                    className="w-full bg-background border border-gold/25 p-2.5 rounded text-ivory focus:border-gold outline-none h-24 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-muted mb-1">Price (Rs.)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={editingProduct.price}
                      onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })}
                      className="w-full bg-background border border-gold/25 p-2.5 rounded text-ivory focus:border-gold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-muted mb-1">Old Price (Rs. optional)</label>
                    <input
                      type="number"
                      min="0"
                      value={editingProduct.old_price || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, old_price: e.target.value ? parseFloat(e.target.value) : undefined })}
                      className="w-full bg-background border border-gold/25 p-2.5 rounded text-ivory focus:border-gold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-muted mb-1">Stock Quantity</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={editingProduct.stock}
                      onChange={(e) => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) })}
                      className="w-full bg-background border border-gold/25 p-2.5 rounded text-ivory focus:border-gold outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-muted mb-1">Category</label>
                    <select
                      value={editingProduct.category}
                      onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                      className="w-full bg-background border border-gold/25 p-2.5 rounded text-ivory focus:border-gold outline-none"
                    >
                      <option value="Gift Boxes">Gift Boxes</option>
                      <option value="Signature Collection">Signature Collection</option>
                      <option value="Custom Curations">Custom Curations</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-muted mb-1">Occasion</label>
                    <select
                      value={editingProduct.occasion}
                      onChange={(e) => setEditingProduct({ ...editingProduct, occasion: e.target.value })}
                      className="w-full bg-background border border-gold/25 p-2.5 rounded text-ivory focus:border-gold outline-none"
                    >
                      <option value="Birthday">Birthday</option>
                      <option value="Anniversary">Anniversary</option>
                      <option value="Newborn & Baby">Newborn & Baby</option>
                      <option value="Corporate Gifts">Corporate Gifts</option>
                      <option value="Romance">Romance</option>
                      <option value="Get Well">Get Well</option>
                      <option value="Congratulations">Congratulations</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-muted mb-1">Color Palette</label>
                    <input
                      type="text"
                      value={editingProduct.color}
                      onChange={(e) => setEditingProduct({ ...editingProduct, color: e.target.value })}
                      className="w-full bg-background border border-gold/25 p-2.5 rounded text-ivory focus:border-gold outline-none"
                    />
                  </div>
                </div>

                {/* IMAGES MANAGEMENT (EDIT MODE) */}
                <div className="border-t border-gold/15 pt-4">
                  <h4 className="text-xs uppercase text-gold font-sans tracking-wide mb-3">Product Images</h4>
                  
                  {/* Preview grid */}
                  {editingProduct.images && editingProduct.images.length > 0 && (
                    <div className="grid grid-cols-5 gap-3 mb-4">
                      {editingProduct.images.map((img, idx) => (
                        <div key={idx} className="relative w-full h-16 rounded border border-gold/20 bg-background overflow-hidden group">
                          <img src={img} alt="preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx, true)}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-400 hover:text-red-300 transition duration-200"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    {/* Add URL */}
                    <div className="space-y-1">
                      <label className="block text-xs text-muted">Add Image via URL</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={urlInput}
                          onChange={(e) => setUrlInput(e.target.value)}
                          placeholder="https://example.com/image.jpg"
                          className="flex-1 bg-background border border-gold/25 p-2.5 rounded text-ivory focus:border-gold outline-none text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddImageUrl(true)}
                          className="px-4 py-2 border border-gold hover:bg-gold hover:text-background text-xs uppercase tracking-wider font-semibold font-sans transition duration-200"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {/* File Dropzone */}
                    <div>
                      <label className="flex flex-col items-center justify-center border border-dashed border-gold/25 hover:border-gold bg-background/30 h-10 rounded cursor-pointer transition">
                        <span className="text-[11px] text-gold uppercase font-sans tracking-wider flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm">upload_file</span>
                          Upload Local Image
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, true)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gold/15 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="px-5 py-2.5 border border-gold/30 hover:border-gold hover:text-gold text-xs font-sans uppercase tracking-wider transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-gold hover:bg-gold-light text-background font-semibold text-xs font-sans uppercase tracking-wider transition"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: ORDER DETAILS */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="gold-gradient-border bg-charcoal p-6 rounded-lg max-w-lg w-full">
              <div className="flex justify-between items-center border-b border-gold/15 pb-4 mb-6">
                <div>
                  <h3 className="font-serif text-2xl text-gold">Order Details</h3>
                  <p className="text-mono text-xs text-muted mt-1">{selectedOrder.orderNumber}</p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-muted hover:text-gold transition duration-200 material-symbols-outlined"
                >
                  close
                </button>
              </div>

              <div className="space-y-6 text-sm text-ivory">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs uppercase text-gold font-sans tracking-wide">Client Details</h4>
                    <p className="mt-1.5 font-bold text-base">{selectedOrder.customerName}</p>
                    <p className="text-xs text-muted mt-1">{selectedOrder.phone}</p>
                    <p className="text-xs text-muted">{selectedOrder.email}</p>
                  </div>
                  <div>
                    <h4 className="text-xs uppercase text-gold font-sans tracking-wide">Shipping Address</h4>
                    <p className="mt-1.5 text-xs text-muted leading-relaxed">
                      {selectedOrder.address},<br />
                      {selectedOrder.city}, Sri Lanka
                    </p>
                  </div>
                </div>

                <div className="section-divider"></div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs uppercase text-gold font-sans tracking-wide">Order Metadata</h4>
                    <p className="mt-1.5 text-xs text-muted">Placed: {new Date(selectedOrder.createdAt).toLocaleString()}</p>
                    <p className="text-xs text-gold font-bold">
                      Required Date: {selectedOrder.deliveryDate ? new Date(selectedOrder.deliveryDate).toLocaleDateString() : 'Standard (3+ Days)'}
                    </p>
                    <p className="text-xs text-muted">Method: {selectedOrder.paymentMethod}</p>
                    <p className="text-xs text-muted">
                      Status: <span className="font-bold text-gold">{selectedOrder.orderStatus}</span>
                    </p>
                  </div>
                  <div>
                    <h4 className="text-xs uppercase text-gold font-sans tracking-wide">Financials</h4>
                    <p className="mt-1.5 text-xs text-muted">Subtotal: Rs.{selectedOrder.subtotal.toLocaleString()}.00</p>
                    <p className="text-xs text-muted">Delivery: Rs.{selectedOrder.deliveryFee.toLocaleString()}.00</p>
                    <p className="text-sm font-bold text-gold mt-1">Total: Rs.{selectedOrder.total.toLocaleString()}.00</p>
                  </div>
                </div>

                {(selectedOrder.giftMessage || selectedOrder.wrapping) && (
                  <>
                    <div className="section-divider"></div>
                    <div className="space-y-3">
                      {selectedOrder.wrapping && (
                        <div>
                          <h4 className="text-xs uppercase text-gold font-sans tracking-wide">Premium Wrapping Option</h4>
                          <p className="mt-1 text-xs text-muted italic">{selectedOrder.wrapping}</p>
                        </div>
                      )}
                      {selectedOrder.giftMessage && (
                        <div>
                          <h4 className="text-xs uppercase text-gold font-sans tracking-wide">Personal Greeting Message</h4>
                          <div className="mt-1.5 p-3 bg-background border border-gold/10 rounded text-xs text-muted leading-relaxed italic">
                            "{selectedOrder.giftMessage}"
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="pt-4 border-t border-gold/15 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <label className="text-xs uppercase text-muted font-sans">Set Status:</label>
                    <select
                      value={selectedOrder.orderStatus}
                      onChange={(e) => handleOrderStatusChange(selectedOrder.id, e.target.value as any)}
                      className="bg-background border border-gold/25 text-xs text-ivory p-1 rounded focus:border-gold outline-none"
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="CONFIRMED">CONFIRMED</option>
                      <option value="PACKED">PACKED</option>
                      <option value="SHIPPED">SHIPPED</option>
                      <option value="DELIVERED">DELIVERED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </div>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="px-5 py-2.5 bg-gold hover:bg-gold-light text-background font-semibold text-xs font-sans uppercase tracking-wider transition"
                  >
                    Close Summary
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* MODAL: ADD CLIENT REVIEW */}
      {isAddingReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="gold-gradient-border bg-charcoal p-6 rounded-lg max-w-md w-full my-8">
            <div className="flex justify-between items-center border-b border-gold/15 pb-4 mb-6">
              <h3 className="font-serif text-2xl text-gold">Add Client Review Image</h3>
              <button
                onClick={() => setIsAddingReview(false)}
                className="text-muted hover:text-gold transition duration-200 material-symbols-outlined"
              >
                close
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-4 text-sm text-ivory">
              <div className="space-y-1">
                <label className="block text-xs uppercase tracking-wider text-muted mb-1 font-sans">Image URL</label>
                <input
                  type="text"
                  value={newReviewImage}
                  onChange={(e) => setNewReviewImage(e.target.value)}
                  placeholder="https://example.com/screenshot.jpg"
                  className="w-full bg-background border border-gold/25 p-2.5 rounded text-ivory focus:border-gold outline-none"
                />
              </div>

              <div className="relative flex items-center justify-center py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gold/10"></div>
                </div>
                <span className="relative px-3 bg-charcoal text-[10px] uppercase text-muted tracking-widest font-sans">Or Upload File</span>
              </div>

              <div>
                <label className="flex flex-col items-center justify-center border border-dashed border-gold/25 hover:border-gold bg-background/30 h-16 rounded cursor-pointer transition">
                  <span className="text-xs text-gold uppercase font-sans tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">upload_file</span>
                    Choose Screenshot Image
                  </span>
                  {newReviewImage && newReviewImage.startsWith('data:') && (
                    <span className="text-[10px] text-green-400 mt-1 font-mono">Image Loaded Successfully</span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleReviewImageUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="pt-4 border-t border-gold/15 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddingReview(false)}
                  className="px-5 py-2.5 border border-gold/30 hover:border-gold hover:text-gold text-xs font-sans uppercase tracking-wider transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={(e) => handleReviewSubmit(e)}
                  className="px-6 py-2.5 bg-gold hover:bg-gold-light text-background font-semibold text-xs font-sans uppercase tracking-wider transition cursor-pointer"
                >
                  Save Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
