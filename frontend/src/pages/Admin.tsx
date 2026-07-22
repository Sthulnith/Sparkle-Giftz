import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import { clearSession, isAuthenticated } from '../lib/auth';
import {
  getAdminProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getAdminInventoryItems,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  adjustInventoryStock,
  getStockLogs,
  getOrders,
  updateOrderStatus,
  getClientReviews,
  createClientReview,
  deleteClientReview,
  uploadProductImage,
  uploadReviewPhoto,
  type Product,
  type InventoryItem,
  type StockLog,
  type Order,
  type ClientReview,
  type GiftBoxItem,
} from '../lib/supabase';

// Re-export legacy-compatible types for JSX that still uses old field names
export type CustomInventoryItem = InventoryItem & { image: string; low_stock_threshold: number; costPrice?: number; };
export type StockAdjustmentLog = StockLog & { itemId: number; itemName: string; timestamp: string; referenceOrder?: string; };
export interface GiftBoxIncludedItem {
  itemId: string | number;
  sku: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  image?: string;
}








// Admin component begins below


export const Admin = () => {
  const navigate = useNavigate();

  // ── Auth state ──────────────────────────────────────────────────────────────
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const [authed, setAuthed]           = useState<boolean>(false);
  const [adminEmail, setAdminEmail]   = useState<string>('');

  // Dashboard Tabs
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'reviews' | 'inventory'>('products');

  // Stateful Data
  const [products, setProducts]           = useState<Product[]>([]);
  const [orders, setOrders]               = useState<Order[]>([]);
  const [clientReviews, setClientReviews] = useState<ClientReview[]>([]);
  const [customInventory, setCustomInventory] = useState<CustomInventoryItem[]>([]);
  const [stockLogs, setStockLogs]         = useState<StockAdjustmentLog[]>([]);

  // Selected Item Modals
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState<boolean>(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isAddingReview, setIsAddingReview] = useState<boolean>(false);

  // Custom Inventory Modals
  const [isAddingInvItem, setIsAddingInvItem] = useState<boolean>(false);
  const [editingInvItem, setEditingInvItem] = useState<CustomInventoryItem | null>(null);
  const [adjustingStockItem, setAdjustingStockItem] = useState<CustomInventoryItem | null>(null);
  const [stockAdjustQty, setStockAdjustQty] = useState<number>(0);
  const [stockAdjustMode, setStockAdjustMode] = useState<'add' | 'subtract' | 'set'>('add');
  const [stockAdjustNote, setStockAdjustNote] = useState<string>('');
  const [showStockHistoryDrawer, setShowStockHistoryDrawer] = useState<boolean>(false);

  // Inventory Filter state
  const [invSearchQuery, setInvSearchQuery] = useState<string>('');
  const [invCategoryFilter, setInvCategoryFilter] = useState<string>('All');
  const [invStockFilter, setInvStockFilter] = useState<string>('All');

  // New review form states
  const [newReviewImage, setNewReviewImage] = useState<string>('');

  // New Image inputs helper
  const [urlInput, setUrlInput] = useState<string>('');

  const [boxBuilderSearch, setBoxBuilderSearch] = useState<string>('');


  // ── Loading state
  const [, setIsLoading] = useState<boolean>(false);

  // New Product Form State — uses image_urls array to match Supabase
  const [newProduct, setNewProduct] = useState<Omit<Product, 'id' | 'created_at' | 'updated_at'>>({
    name: '',
    slug: '',
    description: '',
    price: 0,
    old_price: undefined,
    stock: 10,
    is_active: true,
    default_wrapping: 'Signature Matte Black & Gold Foil',
    image_urls: [],
    gift_box_items: []
  });

  // New Custom Inventory Item Form State
  const [newInvItem, setNewInvItem] = useState<Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>>({
    sku: '',
    name: '',
    category: 'Wallets',
    description: '',
    price: 0,
    cost_price: 0,
    stock: 10,
    low_stock_threshold: 3,
    enabled: true,
    image_url: '',
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [prods, ords, inv, logs, reviews] = await Promise.all([
        getAdminProducts(),
        getOrders(),
        getAdminInventoryItems(),
        getStockLogs(),
        getClientReviews(),
      ]);
      setProducts(prods);
      setOrders(ords);
      setCustomInventory(inv as unknown as CustomInventoryItem[]);
      setStockLogs(logs as unknown as StockAdjustmentLog[]);
      setClientReviews(reviews);
    } catch (err) {
      console.error('[Admin] loadData error:', err);
    } finally {
      setIsLoading(false);
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

  // State flags for Supabase Storage uploads
  const [isUploadingReviewImage, setIsUploadingReviewImage] = useState(false);
  const [isUploadingInvImage, setIsUploadingInvImage] = useState(false);
  const [isUploadingProductImage, setIsUploadingProductImage] = useState(false);

  // Review Image Upload Handler — uploads directly to Supabase Storage ('review-photos' bucket)
  const handleReviewImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setIsUploadingReviewImage(true);
    const url = await uploadReviewPhoto(file);
    setIsUploadingReviewImage(false);

    if (url) {
      setNewReviewImage(url);
    } else {
      alert('Failed to upload image to Supabase Storage bucket "review-photos". Please verify your connection or file format.');
    }
  };

  // Custom Inventory Item Image Upload Handler — uploads directly to Supabase Storage ('product-images' bucket)
  const handleInvItemImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEditing: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setIsUploadingInvImage(true);
    const url = await uploadProductImage(file);
    setIsUploadingInvImage(false);

    if (url) {
      if (isEditing) {
        setEditingInvItem(prev => prev ? { ...prev, image_url: url, image: url } as unknown as CustomInventoryItem : null);
      } else {
        setNewInvItem(prev => ({ ...prev, image_url: url }));
      }
    } else {
      alert('Failed to upload item image to Supabase Storage. Please try again or select another image file.');
    }
  };

  const handleReviewSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!newReviewImage) {
      alert('Please upload or enter a review image first.');
      return;
    }
    const result = await createClientReview(newReviewImage, '');
    if (result) {
      await loadData();
      window.dispatchEvent(new CustomEvent('sparkle_client_reviews_updated'));
      setIsAddingReview(false);
      setNewReviewImage('');
    } else {
      alert('Failed to save review. Please try again.');
    }
  };

  const handleDeleteReview = async (id: number) => {
    if (window.confirm('Are you sure you want to remove this customer review?')) {
      const ok = await deleteClientReview(id);
      if (ok) {
        await loadData();
        window.dispatchEvent(new CustomEvent('sparkle_client_reviews_updated'));
      }
    }
  };

  // Gift Box Image Upload Handler — uploads directly to Supabase Storage ('product-images' bucket)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setIsUploadingProductImage(true);
    const url = await uploadProductImage(file);
    setIsUploadingProductImage(false);

    if (url) {
      if (isEdit && editingProduct) {
        setEditingProduct({
          ...editingProduct,
          image_urls: [...(editingProduct.image_urls || []), url]
        });
      } else {
        setNewProduct(prev => ({
          ...prev,
          image_urls: [...(prev.image_urls || []), url]
        }));
      }
    } else {
      alert('Failed to upload gift box image to Supabase Storage. Please try again or select another image file.');
    }
  };

  // Add Image via URL
  const handleAddImageUrl = (isEdit: boolean) => {
    if (!urlInput.trim()) return;
    if (isEdit && editingProduct) {
      setEditingProduct({
        ...editingProduct,
        image_urls: [...(editingProduct.image_urls || []), urlInput.trim()]
      });
    } else {
      setNewProduct(prev => ({
        ...prev,
        image_urls: [...(prev.image_urls || []), urlInput.trim()]
      }));
    }
    setUrlInput('');
  };

  // Remove Image from list
  const handleRemoveImage = (index: number, isEdit: boolean) => {
    if (isEdit && editingProduct) {
      const updatedImages = [...(editingProduct.image_urls || [])];
      updatedImages.splice(index, 1);
      setEditingProduct({ ...editingProduct, image_urls: updatedImages });
    } else {
      const updatedImages = [...(newProduct.image_urls || [])];
      updatedImages.splice(index, 1);
      setNewProduct(prev => ({ ...prev, image_urls: updatedImages }));
    }
  };



  // Gift Box Item toggling (uses gift_box_items + inventory_item_id)
  const handleToggleIncludeItemNew = (item: CustomInventoryItem) => {
    setNewProduct(prev => {
      const current = prev.gift_box_items || [];
      const exists = current.some(gi => Number(gi.inventory_item_id) === Number(item.id));
      let updatedItems: GiftBoxItem[];
      if (exists) {
        updatedItems = current.filter(gi => Number(gi.inventory_item_id) !== Number(item.id));
      } else {
        const newGi: GiftBoxItem = {
          product_id: 0,
          inventory_item_id: Number(item.id),
          quantity: 1,
          inventory_items: item as unknown as import('../lib/supabase').InventoryItem,
        };
        updatedItems = [...current, newGi];
      }
      const itemsText = updatedItems.map(gi => `• ${gi.quantity}x ${gi.inventory_items?.name || ''}`).join('\n');
      const baseParts = (prev.description || '').split(/\n\nIncluded Items:\n/);
      const baseDesc = baseParts[0]?.trim() || 'A curated luxury gift box containing hand-selected premium store items.';
      return {
        ...prev,
        gift_box_items: updatedItems,
        description: updatedItems.length > 0 ? `${baseDesc}\n\nIncluded Items:\n${itemsText}` : baseDesc,
      };
    });
  };

  const handleUpdateIncludeItemQtyNew = (itemId: string | number, delta: number) => {
    setNewProduct(prev => {
      const current = prev.gift_box_items || [];
      const updatedItems = current.map(gi => {
        if (Number(gi.inventory_item_id) === Number(itemId)) {
          return { ...gi, quantity: Math.max(1, gi.quantity + delta) };
        }
        return gi;
      });
      const itemsText = updatedItems.map(gi => `• ${gi.quantity}x ${gi.inventory_items?.name || ''}`).join('\n');
      const baseParts = (prev.description || '').split(/\n\nIncluded Items:\n/);
      const baseDesc = baseParts[0]?.trim() || 'A curated luxury gift box containing hand-selected premium store items.';
      return {
        ...prev,
        gift_box_items: updatedItems,
        description: `${baseDesc}\n\nIncluded Items:\n${itemsText}`,
      };
    });
  };

  const handleToggleIncludeItemEdit = (item: CustomInventoryItem) => {
    if (!editingProduct) return;
    const current = editingProduct.gift_box_items || [];
    const exists = current.some(gi => Number(gi.inventory_item_id) === Number(item.id));
    let updatedItems: GiftBoxItem[];
    if (exists) {
      updatedItems = current.filter(gi => Number(gi.inventory_item_id) !== Number(item.id));
    } else {
      const newGi: GiftBoxItem = {
        product_id: editingProduct.id,
        inventory_item_id: Number(item.id),
        quantity: 1,
        inventory_items: item as unknown as import('../lib/supabase').InventoryItem,
      };
      updatedItems = [...current, newGi];
    }
    const itemsText = updatedItems.map(gi => `• ${gi.quantity}x ${gi.inventory_items?.name || ''}`).join('\n');
    const baseParts = (editingProduct.description || '').split(/\n\nIncluded Items:\n/);
    const baseDesc = baseParts[0]?.trim() || 'A curated luxury gift box containing hand-selected premium store items.';
    setEditingProduct({
      ...editingProduct,
      gift_box_items: updatedItems,
      description: updatedItems.length > 0 ? `${baseDesc}\n\nIncluded Items:\n${itemsText}` : baseDesc,
    });
  };

  const handleUpdateIncludeItemQtyEdit = (itemId: string | number, delta: number) => {
    if (!editingProduct) return;
    const current = editingProduct.gift_box_items || [];
    const updatedItems = current.map(gi => {
      if (Number(gi.inventory_item_id) === Number(itemId)) {
        return { ...gi, quantity: Math.max(1, gi.quantity + delta) };
      }
      return gi;
    });
    const itemsText = updatedItems.map(gi => `• ${gi.quantity}x ${gi.inventory_items?.name || ''}`).join('\n');
    const baseParts = (editingProduct.description || '').split(/\n\nIncluded Items:\n/);
    const baseDesc = baseParts[0]?.trim() || '';
    setEditingProduct({
      ...editingProduct,
      gift_box_items: updatedItems,
      description: `${baseDesc}\n\nIncluded Items:\n${itemsText}`,
    });
  };

  // Modal Open & Reset Helpers
  const openAddInvItemModal = () => {
    setNewInvItem({
      sku: '',
      name: '',
      category: 'Wallets',
      description: '',
      price: 0,
      cost_price: 0,
      stock: 10,
      low_stock_threshold: 3,
      enabled: true,
      image_url: '',
    });
    setIsAddingInvItem(true);
  };

  const closeAddInvItemModal = () => {
    setIsAddingInvItem(false);
    setNewInvItem({
      sku: '',
      name: '',
      category: 'Wallets',
      description: '',
      price: 0,
      cost_price: 0,
      stock: 10,
      low_stock_threshold: 3,
      enabled: true,
      image_url: '',
    });
  };

  const openAddProductModal = () => {
    setNewProduct({
      name: '',
      slug: '',
      description: '',
      price: 0,
      old_price: undefined,
      stock: 10,
      is_active: true,
      default_wrapping: 'Signature Matte Black & Gold Foil',
      image_urls: [],
      gift_box_items: []
    });
    setIsAddingProduct(true);
  };

  const closeAddProductModal = () => {
    setIsAddingProduct(false);
    setNewProduct({
      name: '',
      slug: '',
      description: '',
      price: 0,
      old_price: undefined,
      stock: 10,
      is_active: true,
      default_wrapping: 'Signature Matte Black & Gold Foil',
      image_urls: [],
      gift_box_items: []
    });
  };

  // Product CRUD Handlers — Supabase backed
  const handleAddProductSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newProduct.name || !newProduct.name.trim()) {
      alert('Please enter a Gift Box Name before saving.');
      return;
    }
    const autoSlug = newProduct.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const includedItems = (newProduct.gift_box_items || []).map(gi => ({
      inventory_item_id: Number(gi.inventory_item_id),
      quantity: gi.quantity,
    }));
    const result = await createProduct({
      name: newProduct.name.trim(),
      slug: autoSlug,
      description: newProduct.description || '',
      price: newProduct.price,
      old_price: newProduct.old_price || undefined,
      stock: newProduct.stock,
      default_wrapping: newProduct.default_wrapping,
      image_urls: newProduct.image_urls || [],
      includedItems,
    });
    if (result) {
      await loadData();
      closeAddProductModal();
    } else {
      alert('Failed to save gift box. Please try again.');
    }
  };

  const handleUpdateProductSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingProduct) return;
    if (!editingProduct.name || !editingProduct.name.trim()) {
      alert('Please enter a Gift Box Name before saving.');
      return;
    }
    const includedItems = (editingProduct.gift_box_items || []).map(gi => ({
      inventory_item_id: Number(gi.inventory_item_id),
      quantity: gi.quantity,
    }));
    const ok = await updateProduct(
      editingProduct.id,
      {
        name: editingProduct.name.trim(),
        description: editingProduct.description,
        price: editingProduct.price,
        old_price: editingProduct.old_price ?? null,
        stock: editingProduct.stock,
        default_wrapping: editingProduct.default_wrapping,
        image_urls: editingProduct.image_urls || [],
      },
      includedItems
    );
    if (ok) {
      await loadData();
      setEditingProduct(null);
    } else {
      alert('Failed to update gift box. Please try again.');
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (window.confirm('Are you sure you want to remove this product?')) {
      const ok = await deleteProduct(id);
      if (ok) {
        await loadData();
      } else {
        alert('Failed to delete product. Please try again.');
      }
    }
  };

  // Custom Inventory CRUD Handlers — Supabase backed
  const handleAddInvItemSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newInvItem.name || !newInvItem.name.trim()) {
      alert('Please enter an Item Name before saving.');
      return;
    }
    const result = await createInventoryItem({
      ...newInvItem,
      name: newInvItem.name.trim(),
      image_url: newInvItem.image_url?.trim() || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=600&auto=format&fit=crop',
    });
    if (result) {
      await loadData();
      closeAddInvItemModal();
    } else {
      alert('Failed to save inventory item. SKU may already exist.');
    }
  };

  const handleUpdateInvItemSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingInvItem) return;
    if (!editingInvItem.name || !editingInvItem.name.trim()) {
      alert('Please enter an Item Name before saving.');
      return;
    }
    const ok = await updateInventoryItem(editingInvItem.id as number, {
      ...editingInvItem,
      name: editingInvItem.name.trim(),
      image_url: (editingInvItem as unknown as {image_url: string}).image_url?.trim() || editingInvItem.image_url || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=600&auto=format&fit=crop',
    } as unknown as InventoryItem);
    if (ok) {
      await loadData();
      setEditingInvItem(null);
    } else {
      alert('Failed to update inventory item. Please try again.');
    }
  };

  const handleDeleteInvItem = async (id: string | number) => {
    if (window.confirm('Are you sure you want to delete this custom inventory item?')) {
      const ok = await deleteInventoryItem(Number(id));
      if (ok) {
        await loadData();
      } else {
        alert('Failed to delete item. Please try again.');
      }
    }
  };

  const handleToggleInvItemEnabled = async (id: string | number) => {
    const item = customInventory.find(i => i.id === id);
    if (!item) return;
    const ok = await updateInventoryItem(Number(id), { enabled: !item.enabled } as unknown as InventoryItem);
    if (ok) await loadData();
  };

  const handleApplyStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingStockItem) return;
    const type = stockAdjustMode === 'add' ? 'MANUAL_ADD' :
                 stockAdjustMode === 'subtract' ? 'MANUAL_SUBTRACT' : 'MANUAL_SET';
    const ok = await adjustInventoryStock(
      adjustingStockItem as unknown as import('../lib/supabase').InventoryItem,
      stockAdjustMode,
      Math.max(0, stockAdjustQty),
      type as import('../lib/supabase').StockLog['type'],
      undefined,
      stockAdjustNote.trim() || 'Manual stock update via console'
    );
    if (ok) {
      await loadData();
    }
    setAdjustingStockItem(null);
    setStockAdjustQty(0);
    setStockAdjustNote('');
  };

  // Order Status Handler — Supabase backed
  const handleOrderStatusChange = async (orderId: number, status: Order['order_status']) => {
    const paymentStatus = status === 'DELIVERED' ? 'PAID' as const : undefined;
    const ok = await updateOrderStatus(orderId, status, paymentStatus);
    if (ok) {
      await loadData();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => prev ? {
          ...prev,
          order_status: status,
          payment_status: status === 'DELIVERED' ? 'PAID' as const : prev.payment_status
        } : null);
      }
    } else {
      alert('Failed to update order status. Please try again.');
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
        <div className="flex border-b border-gold/10 overflow-x-auto scrollbar-none whitespace-nowrap min-w-full">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 sm:px-6 py-3 font-serif text-base sm:text-lg tracking-wide border-b-2 transition duration-300 shrink-0 ${
              activeTab === 'products'
                ? 'border-gold text-gold font-semibold'
                : 'border-transparent text-muted hover:text-ivory'
            }`}
          >
            Product Catalog ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 sm:px-6 py-3 font-serif text-base sm:text-lg tracking-wide border-b-2 transition duration-300 shrink-0 ${
              activeTab === 'orders'
                ? 'border-gold text-gold font-semibold'
                : 'border-transparent text-muted hover:text-ivory'
            }`}
          >
            Client Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-4 sm:px-6 py-3 font-serif text-base sm:text-lg tracking-wide border-b-2 transition duration-300 shrink-0 ${
              activeTab === 'reviews'
                ? 'border-gold text-gold font-semibold'
                : 'border-transparent text-muted hover:text-ivory'
            }`}
          >
            Customer Reviews ({clientReviews.length})
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 sm:px-6 py-3 font-serif text-base sm:text-lg tracking-wide border-b-2 transition duration-300 shrink-0 flex items-center gap-2 ${
              activeTab === 'inventory'
                ? 'border-gold text-gold font-semibold'
                : 'border-transparent text-muted hover:text-ivory'
            }`}
          >
            <span>Custom Gift Inventory ({customInventory.length})</span>
            {customInventory.filter(i => i.stock <= (i.low_stock_threshold || 3)).length > 0 && (
              <span className="bg-amber-500 text-background font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase shadow">
                {customInventory.filter(i => i.stock <= (i.low_stock_threshold || 3)).length} Alerts
              </span>
            )}
          </button>
        </div>

        {/* PRODUCTS TAB CONTENT */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h2 className="font-serif text-2xl text-gold">Storefront Products</h2>
              <button
                onClick={openAddProductModal}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-gold hover:bg-gold-light text-background text-xs uppercase tracking-wider font-semibold font-sans transition duration-300 min-h-[44px]"
              >
                <span className="material-symbols-outlined text-sm font-bold">add</span>
                Add New Box
              </button>
            </div>

            {/* Products Mobile Card View */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {products.map((product) => (
                <div key={product.id} className="gold-gradient-border bg-charcoal p-4 rounded-lg space-y-3 font-sans">
                  <div className="flex gap-3">
                    {product.image_urls && product.image_urls.length > 0 ? (
                      <img src={product.image_urls[0]} alt={product.name} className="w-16 h-16 object-cover rounded border border-gold/25 shrink-0" />
                    ) : (
                      <div className="w-16 h-16 rounded border border-gold/15 bg-background flex items-center justify-center text-muted text-[10px] uppercase shrink-0">
                        No image
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-ivory text-sm truncate">{product.name}</h3>
                      <p className="text-xs text-muted mt-0.5">Gift Boxes</p>
                      <p className="text-sm font-bold text-gold mt-1">Rs. {product.price.toLocaleString()}.00</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-gold/10 pt-2 text-xs">
                    <span className={`px-2 py-0.5 font-semibold rounded ${
                      product.stock <= 5 ? 'bg-red-950/40 text-red-200 border border-red-500/20' : 'bg-green-950/40 text-green-200 border border-green-500/20'
                    }`}>
                      {product.stock} units left
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingProduct(product)}
                        className="px-3 py-1.5 border border-gold/30 hover:border-gold hover:text-gold text-xs text-ivory rounded font-semibold transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="px-3 py-1.5 border border-red-900/40 hover:border-red-500 text-xs text-red-400 rounded font-semibold transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Products Table View */}
            <div className="hidden md:block gold-gradient-border bg-charcoal overflow-hidden rounded-lg shadow-xl">
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
                          {product.image_urls && product.image_urls.length > 0 ? (
                            <img
                              src={product.image_urls[0]}
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
                        <td className="p-4 text-xs text-muted">Gift Boxes</td>
                        <td className="p-4 text-xs text-muted">All Occasions</td>
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

            {/* Orders Mobile Card View */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {orders.map((order) => (
                <div key={order.id} className="gold-gradient-border bg-charcoal p-4 rounded-lg space-y-3 font-sans">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-mono font-bold text-gold">{order.order_number}</span>
                      <h3 className="font-semibold text-ivory text-sm mt-0.5">{order.customer_name}</h3>
                      <p className="text-xs text-muted">{order.city} • {new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                    <select
                      value={order.order_status}
                      onChange={(e) => handleOrderStatusChange(order.id, e.target.value as any)}
                      className="bg-background border border-gold/25 text-[11px] font-bold text-gold p-1 rounded focus:border-gold outline-none cursor-pointer"
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="CONFIRMED">CONFIRMED</option>
                      <option value="PACKED">PACKED</option>
                      <option value="SHIPPED">SHIPPED</option>
                      <option value="DELIVERED">DELIVERED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between border-t border-gold/10 pt-2 text-xs">
                    <div>
                      <span className="text-gold font-bold">Rs. {order.total.toLocaleString()}.00</span>
                      <span className="text-muted text-[10px] block">{order.payment_method} • {order.payment_status}</span>
                    </div>
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="px-3.5 py-1.5 bg-gold hover:bg-gold-light text-background font-bold text-xs uppercase tracking-wider rounded transition shadow min-h-[44px]"
                    >
                      Details
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Orders Desktop Table View */}
            <div className="hidden md:block gold-gradient-border bg-charcoal overflow-hidden rounded-lg shadow-xl">
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
                        <td className="p-4 font-mono font-bold text-gold text-xs">{order.order_number}</td>
                        <td className="p-4">
                          <p className="font-semibold">{order.customer_name}</p>
                          <p className="text-[11px] text-muted">{order.city}</p>
                        </td>
                        <td className="p-4 text-xs text-muted">
                          {new Date(order.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-xs text-gold font-semibold">
                          {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : 'Standard'}
                        </td>
                        <td className="p-4 text-gold font-medium">Rs.{order.total.toLocaleString()}.00</td>
                        <td className="p-4 text-xs">
                          <span className="block font-medium">{order.payment_method}</span>
                          <span className={`text-[10px] uppercase font-bold tracking-wider ${
                            order.payment_status === 'PAID' ? 'text-green-400' : 'text-yellow-400'
                          }`}>
                            {order.payment_status}
                          </span>
                        </td>
                        <td className="p-4">
                          <select
                            value={order.order_status}
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h2 className="font-serif text-2xl text-gold">Customer Review Gallery</h2>
              <button
                onClick={() => setIsAddingReview(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-gold hover:bg-gold-light text-background text-xs uppercase tracking-wider font-semibold font-sans transition duration-300 min-h-[44px]"
              >
                <span className="material-symbols-outlined text-sm font-bold">add</span>
                Add Review Image
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
              {clientReviews.map((review) => (
                <div key={review.id} className="gold-gradient-border bg-charcoal p-2 sm:p-4 rounded relative space-y-2 sm:space-y-3 group">
                  <div className="w-full bg-background border border-gold/10 rounded overflow-hidden relative">
                    <img src={review.image_url} alt="review" className="w-full h-auto max-h-72 object-cover block" />
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
                  {review.created_at && (
                    <div className="text-[10px] text-gold/60 font-sans tracking-wide text-right">
                      {new Date(review.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CUSTOM INVENTORY TAB CONTENT */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            {/* Top Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-2xl text-gold">Customize Gift Inventory Module</h2>
                <p className="text-xs text-muted font-sans mt-0.5">
                  Manage individual products for the "Customize Your Own Gift" box builder
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowStockHistoryDrawer(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-background border border-gold/30 hover:border-gold text-gold text-xs uppercase tracking-wider font-semibold font-sans transition rounded"
                >
                  <span className="material-symbols-outlined text-sm">history</span>
                  Stock Audit Logs ({stockLogs.length})
                </button>
                <button
                  type="button"
                  onClick={openAddInvItemModal}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gold hover:bg-gold-light text-background text-xs uppercase tracking-wider font-extrabold font-sans transition rounded shadow-gold-glow cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm font-bold">add</span>
                  Add Inventory Item
                </button>
              </div>
            </div>

            {/* Low Stock Alerts Banner */}
            {customInventory.filter(i => i.stock <= (i.low_stock_threshold || 3)).length > 0 && (
              <div className="bg-gradient-to-r from-amber-950/60 via-charcoal to-amber-950/40 border border-amber-500/40 p-4 rounded-lg shadow-lg space-y-2">
                <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                  <div className="flex items-center gap-2 text-amber-400 font-sans font-bold text-xs uppercase tracking-wider">
                    <span className="material-symbols-outlined text-base animate-pulse">warning</span>
                    Low-Stock & Out-of-Stock Alert Warning ({customInventory.filter(i => i.stock <= (i.low_stock_threshold || 3)).length} Items)
                  </div>
                  <span className="text-[10px] text-amber-200/70 font-sans">Automatic customer storefront enforcement active</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-1">
                  {customInventory.filter(i => i.stock <= (i.low_stock_threshold || 3)).map(item => (
                    <div key={item.id} className="bg-background/80 border border-amber-500/30 p-2.5 rounded flex items-center justify-between text-xs">
                      <div className="truncate pr-2">
                        <p className="font-bold text-ivory truncate text-[11px]">{item.name}</p>
                        <p className="text-[10px] font-mono text-muted">{item.sku}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          item.stock <= 0 ? 'bg-red-950 text-red-400 border border-red-500/40' : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                        }`}>
                          {item.stock <= 0 ? 'OUT OF STOCK' : `${item.stock} left`}
                        </span>
                        <button
                          type="button"
                          onClick={() => { setAdjustingStockItem(item); setStockAdjustQty(10); setStockAdjustMode('add'); }}
                          className="block text-[10px] text-gold hover:underline mt-1 ml-auto font-sans font-semibold"
                        >
                          + Restock
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filter & Search Bar */}
            <div className="gold-gradient-border bg-charcoal p-4 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  placeholder="Search SKU or Product Name..."
                  value={invSearchQuery}
                  onChange={(e) => setInvSearchQuery(e.target.value)}
                  className="w-full bg-background border border-gold/25 text-xs text-ivory pl-8 pr-3 py-2 rounded outline-none focus:border-gold"
                />
                <span className="material-symbols-outlined absolute left-2.5 top-2 text-muted text-base">search</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <select
                  value={invCategoryFilter}
                  onChange={(e) => setInvCategoryFilter(e.target.value)}
                  className="bg-background border border-gold/25 text-xs text-ivory p-2 rounded focus:border-gold outline-none"
                >
                  <option value="All">All Categories</option>
                  {Array.from(new Set(customInventory.map(i => i.category))).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                <select
                  value={invStockFilter}
                  onChange={(e) => setInvStockFilter(e.target.value)}
                  className="bg-background border border-gold/25 text-xs text-ivory p-2 rounded focus:border-gold outline-none"
                >
                  <option value="All">All Stock Status</option>
                  <option value="LowStock">Low Stock Only</option>
                  <option value="OutOfStock">Out of Stock Only</option>
                  <option value="Enabled">Enabled Only</option>
                  <option value="Disabled">Disabled Only</option>
                </select>
              </div>
            </div>

            {/* Inventory Mobile Card View */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
              {customInventory
                .filter(item => {
                  const searchMatch = !invSearchQuery || 
                    item.name.toLowerCase().includes(invSearchQuery.toLowerCase()) || 
                    item.sku.toLowerCase().includes(invSearchQuery.toLowerCase());
                  const categoryMatch = invCategoryFilter === 'All' || item.category === invCategoryFilter;
                  let stockMatch = true;
                  if (invStockFilter === 'LowStock') stockMatch = item.stock <= (item.low_stock_threshold || 3);
                  if (invStockFilter === 'OutOfStock') stockMatch = item.stock <= 0;
                  if (invStockFilter === 'Enabled') stockMatch = item.enabled !== false;
                  if (invStockFilter === 'Disabled') stockMatch = item.enabled === false;
                  return searchMatch && categoryMatch && stockMatch;
                })
                .map((item) => {
                  const isLow = item.stock <= (item.low_stock_threshold || 3) && item.stock > 0;
                  const isOut = item.stock <= 0;

                  return (
                    <div key={item.id} className="gold-gradient-border bg-charcoal p-3.5 rounded-lg space-y-3 font-sans">
                      <div className="flex gap-3">
                        <img src={item.image_url} alt={item.name} className="w-14 h-14 object-cover rounded border border-gold/20 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-ivory text-xs truncate">{item.name}</h4>
                          <p className="text-[10px] font-mono text-gold/80">{item.sku}</p>
                          <p className="text-[10px] text-muted">{item.category}</p>
                          <p className="text-xs font-bold text-gold mt-0.5">Rs. {item.price.toLocaleString()}.00</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-gold/10 pt-2 text-xs">
                        <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded ${
                          isOut ? 'bg-red-950/60 text-red-300' : isLow ? 'bg-amber-950/60 text-amber-300' : 'bg-green-950/60 text-green-300'
                        }`}>
                          {item.stock} left
                        </span>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => { setAdjustingStockItem(item); setStockAdjustQty(1); setStockAdjustMode('add'); }}
                            className="px-2 py-1 border border-gold/30 text-gold text-[10px] font-bold rounded"
                          >
                            Stock
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingInvItem(item)}
                            className="px-2 py-1 border border-gold/20 text-ivory text-[10px] font-bold rounded"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteInvItem(item.id)}
                            className="px-2 py-1 border border-red-900/30 text-red-400 text-[10px] font-bold rounded"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Custom Inventory Desktop Table */}
            <div className="hidden md:block gold-gradient-border bg-charcoal overflow-hidden rounded-lg shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gold/15 text-gold text-xs uppercase tracking-wider font-sans bg-background/45">
                      <th className="p-4">Item Image</th>
                      <th className="p-4">SKU / Name</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Selling Price</th>
                      <th className="p-4">Cost Price</th>
                      <th className="p-4">Stock Level</th>
                      <th className="p-4">Low Threshold</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gold/10 font-sans">
                    {customInventory
                      .filter(item => {
                        const searchMatch = !invSearchQuery || 
                          item.name.toLowerCase().includes(invSearchQuery.toLowerCase()) || 
                          item.sku.toLowerCase().includes(invSearchQuery.toLowerCase());
                        const categoryMatch = invCategoryFilter === 'All' || item.category === invCategoryFilter;
                        let stockMatch = true;
                        if (invStockFilter === 'LowStock') stockMatch = item.stock <= (item.low_stock_threshold || 3);
                        if (invStockFilter === 'OutOfStock') stockMatch = item.stock <= 0;
                        if (invStockFilter === 'Enabled') stockMatch = item.enabled !== false;
                        if (invStockFilter === 'Disabled') stockMatch = item.enabled === false;
                        return searchMatch && categoryMatch && stockMatch;
                      })
                      .map((item) => {
                        const isLow = item.stock <= (item.low_stock_threshold || 3) && item.stock > 0;
                        const isOut = item.stock <= 0;

                        return (
                          <tr key={item.id} className="hover:bg-gold/5 transition duration-150 text-ivory">
                            <td className="p-4">
                              <img
                                src={item.image_url || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=200&auto=format&fit=crop'}
                                alt={item.name}
                                className="w-12 h-12 object-cover rounded border border-gold/20 bg-background"
                              />
                            </td>
                            <td className="p-4">
                              <p className="font-bold text-ivory text-sm">{item.name}</p>
                              <p className="text-xs font-mono text-gold/80">{item.sku}</p>
                            </td>
                            <td className="p-4 text-xs text-muted font-medium">{item.category}</td>
                            <td className="p-4 text-gold font-semibold">Rs. {item.price.toLocaleString()}.00</td>
                            <td className="p-4 text-xs text-muted">
                              {item.cost_price ? `Rs. ${item.cost_price.toLocaleString()}.00` : '—'}
                            </td>
                            <td className="p-4">
                              <span className={`px-2.5 py-1 text-xs font-extrabold rounded border ${
                                isOut
                                  ? 'bg-red-950/60 text-red-300 border-red-500/40'
                                  : isLow
                                  ? 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                                  : 'bg-green-950/60 text-green-300 border-green-500/40'
                              }`}>
                                {item.stock} units
                              </span>
                            </td>
                            <td className="p-4 text-xs text-muted">{item.low_stock_threshold || 3} units</td>
                            <td className="p-4">
                              <button
                                type="button"
                                onClick={() => handleToggleInvItemEnabled(item.id)}
                                className={`px-3 py-1 rounded text-[11px] font-bold uppercase tracking-wider border transition ${
                                  item.enabled !== false
                                    ? 'bg-green-950/40 text-green-400 border-green-500/30 hover:bg-red-950/40 hover:text-red-400 hover:border-red-500/30'
                                    : 'bg-red-950/40 text-red-400 border-red-500/30 hover:bg-green-950/40 hover:text-green-400 hover:border-green-500/30'
                                }`}
                              >
                                {item.enabled !== false ? 'ENABLED' : 'DISABLED'}
                              </button>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => { setAdjustingStockItem(item); setStockAdjustQty(1); setStockAdjustMode('add'); }}
                                  className="p-1.5 border border-gold/30 hover:border-gold hover:text-gold text-muted text-xs rounded transition flex items-center gap-1"
                                  title="Adjust Stock"
                                >
                                  <span className="material-symbols-outlined text-sm">swap_vert</span>
                                  Stock
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingInvItem(item)}
                                  className="p-1.5 border border-gold/20 hover:border-gold hover:text-gold text-muted text-xs rounded transition"
                                  title="Edit Item"
                                >
                                  <span className="material-symbols-outlined text-sm block">edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteInvItem(item.id)}
                                  className="p-1.5 border border-red-900/30 hover:border-red-500 hover:text-red-300 text-muted text-xs rounded transition"
                                  title="Delete Item"
                                >
                                  <span className="material-symbols-outlined text-sm block">delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: CREATE CUSTOM INVENTORY ITEM */}
        {isAddingInvItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 overflow-hidden">
            <div className="gold-gradient-border bg-charcoal rounded-xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="flex justify-between items-center px-4 py-3 sm:px-6 sm:py-4 border-b border-gold/15 shrink-0 bg-charcoal z-10">
                <h3 className="font-serif text-lg sm:text-2xl text-gold truncate">Create Custom Inventory Item</h3>
                <button
                  onClick={closeAddInvItemModal}
                  className="text-muted hover:text-gold transition p-1.5 rounded-full hover:bg-gold/10 material-symbols-outlined"
                >
                  close
                </button>
              </div>

              <form onSubmit={handleAddInvItemSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-sm text-ivory custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs uppercase text-muted tracking-wider mb-1 font-sans font-semibold">
                      Item Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Italian Leather Bifold Wallet"
                      value={newInvItem.name}
                      onChange={(e) => setNewInvItem({ ...newInvItem, name: e.target.value })}
                      className="w-full bg-background border border-gold/25 p-3 rounded text-sm text-ivory focus:border-gold outline-none min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase text-muted tracking-wider mb-1 font-sans font-semibold">
                      SKU Code (Auto-generated if empty)
                    </label>
                    <input
                      type="text"
                      placeholder="SKU-WLT-001"
                      value={newInvItem.sku}
                      onChange={(e) => setNewInvItem({ ...newInvItem, sku: e.target.value.toUpperCase() })}
                      className="w-full bg-background border border-gold/25 p-3 rounded text-sm text-ivory focus:border-gold outline-none font-mono min-h-[44px]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs uppercase text-muted tracking-wider mb-1 font-sans font-semibold">
                      Category
                    </label>
                    <select
                      value={newInvItem.category}
                      onChange={(e) => setNewInvItem({ ...newInvItem, category: e.target.value })}
                      className="w-full bg-background border border-gold/25 p-3 rounded text-sm text-ivory focus:border-gold outline-none min-h-[44px]"
                    >
                      {['Wallets', 'Perfumes', 'Watches', 'Caps', 'Water Bottles', 'Mugs', 'Chocolates', 'Flowers', 'Belts', 'Sunglasses', 'Greeting Cards', 'Candles', 'Teddy Bears', 'Key Holders', 'Phone Accessories', 'Custom Accessories'].map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs uppercase text-muted tracking-wider mb-1 font-sans font-semibold">
                      Selling Price (Rs.)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={newInvItem.price || ''}
                      onChange={(e) => setNewInvItem({ ...newInvItem, price: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-background border border-gold/25 p-3 rounded text-sm text-ivory focus:border-gold outline-none min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase text-muted tracking-wider mb-1 font-sans font-semibold">
                      Cost Price (Rs. Optional)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newInvItem.cost_price || ''}
                      onChange={(e) => setNewInvItem({ ...newInvItem, cost_price: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-background border border-gold/25 p-3 rounded text-sm text-ivory focus:border-gold outline-none min-h-[44px]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs uppercase text-muted tracking-wider mb-1 font-sans font-semibold">
                      Initial Stock Qty
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={newInvItem.stock}
                      onChange={(e) => setNewInvItem({ ...newInvItem, stock: parseInt(e.target.value) || 0 })}
                      className="w-full bg-background border border-gold/25 p-3 rounded text-sm text-ivory focus:border-gold outline-none min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase text-muted tracking-wider mb-1 font-sans font-semibold">
                      Low-Stock Threshold
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={newInvItem.low_stock_threshold}
                      onChange={(e) => setNewInvItem({ ...newInvItem, low_stock_threshold: parseInt(e.target.value) || 3 })}
                      className="w-full bg-background border border-gold/25 p-3 rounded text-sm text-ivory focus:border-gold outline-none min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase text-muted tracking-wider mb-1 font-sans font-semibold">
                      Item Status
                    </label>
                    <label className="flex items-center gap-2.5 p-3 bg-background border border-gold/25 rounded cursor-pointer min-h-[44px]">
                      <input
                        type="checkbox"
                        checked={newInvItem.enabled}
                        onChange={(e) => setNewInvItem({ ...newInvItem, enabled: e.target.checked })}
                        className="accent-gold h-4 w-4"
                      />
                      <span className="text-xs font-bold text-ivory">Enable for Customizer</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase text-muted tracking-wider mb-1 font-sans font-semibold">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={newInvItem.description}
                    onChange={(e) => setNewInvItem({ ...newInvItem, description: e.target.value })}
                    placeholder="Short description of custom gift product item..."
                    className="w-full bg-background border border-gold/25 p-3 rounded text-sm text-ivory focus:border-gold outline-none resize-none font-sans"
                  />
                </div>

                {/* INVENTORY ITEM IMAGE SELECTION */}
                <div className="border-t border-gold/15 pt-4 space-y-3">
                  <label className="block text-xs uppercase text-gold tracking-wider font-sans font-bold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">photo_camera</span>
                    Item Photo / Presentation Image
                  </label>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    {/* Live Preview */}
                    {newInvItem.image_url ? (
                      <div className="relative w-20 h-20 rounded border border-gold/40 bg-background overflow-hidden shrink-0 shadow-md">
                        <img src={newInvItem.image_url} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setNewInvItem({ ...newInvItem, image_url: '' })}
                          className="absolute top-1 right-1 bg-black/70 hover:bg-red-950 text-gold hover:text-red-300 p-1 rounded-full text-xs"
                          title="Remove photo"
                        >
                          <span className="material-symbols-outlined text-xs block">close</span>
                        </button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded border border-dashed border-gold/20 bg-background/50 flex flex-col items-center justify-center text-muted text-[10px] uppercase font-sans shrink-0">
                        <span className="material-symbols-outlined text-base mb-0.5 text-muted/60">image</span>
                        No Photo
                      </div>
                    )}

                    <div className="flex-1 space-y-2 w-full">
                      {/* Upload from Gallery Button */}
                      <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-background border border-dashed border-gold/40 hover:border-gold hover:bg-gold/10 text-gold text-xs font-sans uppercase font-bold tracking-wider rounded cursor-pointer transition min-h-[44px]">
                        <span className="material-symbols-outlined text-base">
                          {isUploadingInvImage ? 'sync' : 'cloud_upload'}
                        </span>
                        <span>{isUploadingInvImage ? 'Uploading to Supabase Storage (product-images)…' : 'Upload Photo to Supabase Storage (product-images)'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={isUploadingInvImage}
                          onChange={(e) => handleInvItemImageUpload(e, false)}
                          className="hidden"
                        />
                      </label>

                      <div className="flex items-center gap-2 text-[10px] text-muted uppercase font-sans">
                        <span className="h-px bg-gold/15 flex-1" />
                        <span>OR ENTER IMAGE URL</span>
                        <span className="h-px bg-gold/15 flex-1" />
                      </div>

                      {/* URL Input */}
                      <input
                        type="text"
                        placeholder="https://images.unsplash.com/photo-..."
                        value={newInvItem.image_url}
                        onChange={(e) => setNewInvItem({ ...newInvItem, image_url: e.target.value })}
                        className="w-full bg-background border border-gold/25 p-3 rounded text-sm text-ivory focus:border-gold outline-none font-sans min-h-[44px]"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gold/15 flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={closeAddInvItemModal}
                    className="w-full sm:w-auto px-5 py-3 border border-gold/30 hover:border-gold text-xs font-sans uppercase tracking-wider rounded min-h-[44px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddInvItemSubmit()}
                    className="w-full sm:w-auto px-6 py-3 bg-gold hover:bg-gold-light text-background font-bold text-xs font-sans uppercase tracking-wider transition shadow cursor-pointer min-h-[44px] flex items-center justify-center"
                  >
                    Save Inventory Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: EDIT CUSTOM INVENTORY ITEM */}
        {editingInvItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 overflow-hidden">
            <div className="gold-gradient-border bg-charcoal rounded-xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="flex justify-between items-center px-4 py-3 sm:px-6 sm:py-4 border-b border-gold/15 shrink-0 bg-charcoal z-10">
                <h3 className="font-serif text-lg sm:text-2xl text-gold truncate">Edit Custom Inventory Item</h3>
                <button
                  onClick={() => setEditingInvItem(null)}
                  className="text-muted hover:text-gold transition p-1.5 rounded-full hover:bg-gold/10 material-symbols-outlined"
                >
                  close
                </button>
              </div>

              <form onSubmit={handleUpdateInvItemSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-sm text-ivory custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs uppercase text-muted tracking-wider mb-1 font-sans font-semibold">
                      Item Name
                    </label>
                    <input
                      type="text"
                      required
                      value={editingInvItem.name}
                      onChange={(e) => setEditingInvItem({ ...editingInvItem, name: e.target.value })}
                      className="w-full bg-background border border-gold/25 p-3 rounded text-sm text-ivory focus:border-gold outline-none min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase text-muted tracking-wider mb-1 font-sans font-semibold">
                      SKU Code
                    </label>
                    <input
                      type="text"
                      value={editingInvItem.sku}
                      onChange={(e) => setEditingInvItem({ ...editingInvItem, sku: e.target.value.toUpperCase() })}
                      className="w-full bg-background border border-gold/25 p-3 rounded text-sm text-ivory focus:border-gold outline-none font-mono min-h-[44px]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs uppercase text-muted tracking-wider mb-1 font-sans font-semibold">
                      Category
                    </label>
                    <select
                      value={editingInvItem.category}
                      onChange={(e) => setEditingInvItem({ ...editingInvItem, category: e.target.value })}
                      className="w-full bg-background border border-gold/25 p-3 rounded text-sm text-ivory focus:border-gold outline-none min-h-[44px]"
                    >
                      {['Wallets', 'Perfumes', 'Watches', 'Caps', 'Water Bottles', 'Mugs', 'Chocolates', 'Flowers', 'Belts', 'Sunglasses', 'Greeting Cards', 'Candles', 'Teddy Bears', 'Key Holders', 'Phone Accessories', 'Custom Accessories'].map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs uppercase text-muted tracking-wider mb-1 font-sans font-semibold">
                      Selling Price (Rs.)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={editingInvItem.price}
                      onChange={(e) => setEditingInvItem({ ...editingInvItem, price: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-background border border-gold/25 p-3 rounded text-sm text-ivory focus:border-gold outline-none min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase text-muted tracking-wider mb-1 font-sans font-semibold">
                      Cost Price (Rs.)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editingInvItem.cost_price || ''}
                      onChange={(e) => setEditingInvItem({ ...editingInvItem, cost_price: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-background border border-gold/25 p-3 rounded text-sm text-ivory focus:border-gold outline-none min-h-[44px]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs uppercase text-muted tracking-wider mb-1 font-sans font-semibold">
                      Stock Qty
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={editingInvItem.stock}
                      onChange={(e) => setEditingInvItem({ ...editingInvItem, stock: parseInt(e.target.value) || 0 })}
                      className="w-full bg-background border border-gold/25 p-3 rounded text-sm text-ivory focus:border-gold outline-none min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase text-muted tracking-wider mb-1 font-sans font-semibold">
                      Low-Stock Threshold
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={editingInvItem.low_stock_threshold}
                      onChange={(e) => setEditingInvItem({ ...editingInvItem, low_stock_threshold: parseInt(e.target.value) || 3 })}
                      className="w-full bg-background border border-gold/25 p-3 rounded text-sm text-ivory focus:border-gold outline-none min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase text-muted tracking-wider mb-1 font-sans font-semibold">
                      Item Status
                    </label>
                    <label className="flex items-center gap-2.5 p-3 bg-background border border-gold/25 rounded cursor-pointer min-h-[44px]">
                      <input
                        type="checkbox"
                        checked={editingInvItem.enabled}
                        onChange={(e) => setEditingInvItem({ ...editingInvItem, enabled: e.target.checked })}
                        className="accent-gold h-4 w-4"
                      />
                      <span className="text-xs font-bold text-ivory">Enable for Customizer</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase text-muted tracking-wider mb-1 font-sans font-semibold">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={editingInvItem.description || ''}
                    onChange={(e) => setEditingInvItem({ ...editingInvItem, description: e.target.value })}
                    className="w-full bg-background border border-gold/25 p-3 rounded text-sm text-ivory focus:border-gold outline-none resize-none font-sans"
                  />
                </div>

                {/* EDIT INVENTORY ITEM IMAGE SELECTION */}
                <div className="border-t border-gold/15 pt-4 space-y-3">
                  <label className="block text-xs uppercase text-gold tracking-wider font-sans font-bold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">photo_camera</span>
                    Item Photo / Presentation Image
                  </label>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    {/* Live Preview */}
                    {editingInvItem.image_url ? (
                      <div className="relative w-20 h-20 rounded border border-gold/40 bg-background overflow-hidden shrink-0 shadow-md">
                        <img src={editingInvItem.image_url} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setEditingInvItem({ ...editingInvItem, image_url: '' })}
                          className="absolute top-1 right-1 bg-black/70 hover:bg-red-950 text-gold hover:text-red-300 p-1 rounded-full text-xs"
                          title="Remove photo"
                        >
                          <span className="material-symbols-outlined text-xs block">close</span>
                        </button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded border border-dashed border-gold/20 bg-background/50 flex flex-col items-center justify-center text-muted text-[10px] uppercase font-sans shrink-0">
                        <span className="material-symbols-outlined text-base mb-0.5 text-muted/60">image</span>
                        No Photo
                      </div>
                    )}

                    <div className="flex-1 space-y-2 w-full">
                      {/* Upload from Gallery Button */}
                      <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-background border border-dashed border-gold/40 hover:border-gold hover:bg-gold/10 text-gold text-xs font-sans uppercase font-bold tracking-wider rounded cursor-pointer transition min-h-[44px]">
                        <span className="material-symbols-outlined text-base">
                          {isUploadingInvImage ? 'sync' : 'cloud_upload'}
                        </span>
                        <span>{isUploadingInvImage ? 'Uploading to Supabase Storage (product-images)…' : 'Upload Photo to Supabase Storage (product-images)'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={isUploadingInvImage}
                          onChange={(e) => handleInvItemImageUpload(e, true)}
                          className="hidden"
                        />
                      </label>

                      <div className="flex items-center gap-2 text-[10px] text-muted uppercase font-sans">
                        <span className="h-px bg-gold/15 flex-1" />
                        <span>OR ENTER IMAGE URL</span>
                        <span className="h-px bg-gold/15 flex-1" />
                      </div>

                      {/* URL Input */}
                      <input
                        type="text"
                        placeholder="https://images.unsplash.com/photo-..."
                        value={editingInvItem.image_url}
                        onChange={(e) => setEditingInvItem({ ...editingInvItem, image_url: e.target.value })}
                        className="w-full bg-background border border-gold/25 p-3 rounded text-sm text-ivory focus:border-gold outline-none font-sans min-h-[44px]"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gold/15 flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingInvItem(null)}
                    className="w-full sm:w-auto px-5 py-3 border border-gold/30 hover:border-gold text-xs font-sans uppercase tracking-wider rounded min-h-[44px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateInvItemSubmit()}
                    className="w-full sm:w-auto px-6 py-3 bg-gold hover:bg-gold-light text-background font-bold text-xs font-sans uppercase tracking-wider transition shadow cursor-pointer min-h-[44px] flex items-center justify-center"
                  >
                    Update Inventory Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: ADJUST INVENTORY STOCK LEVEL */}
        {adjustingStockItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 overflow-hidden">
            <div className="gold-gradient-border bg-charcoal rounded-xl max-w-md w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="flex justify-between items-center px-4 py-3 sm:px-6 sm:py-4 border-b border-gold/15 shrink-0 bg-charcoal z-10">
                <h3 className="font-serif text-lg sm:text-xl text-gold truncate">Adjust Stock: {adjustingStockItem.name}</h3>
                <button
                  onClick={() => setAdjustingStockItem(null)}
                  className="text-muted hover:text-gold transition p-1.5 rounded-full hover:bg-gold/10 material-symbols-outlined"
                >
                  close
                </button>
              </div>

              <form onSubmit={handleApplyStockAdjustment} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-sm text-ivory font-sans custom-scrollbar">
                <div className="bg-background/50 p-3 rounded border border-gold/15 flex justify-between items-center text-xs">
                  <span>Current Available Stock:</span>
                  <span className="font-mono font-bold text-gold text-sm">{adjustingStockItem.stock} units</span>
                </div>

                <div>
                  <label className="block text-xs uppercase text-muted tracking-wider mb-2 font-semibold">Adjustment Action</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setStockAdjustMode('add')}
                      className={`py-2.5 text-xs font-bold rounded border transition min-h-[44px] flex items-center justify-center ${
                        stockAdjustMode === 'add' ? 'bg-gold text-background border-gold' : 'border-gold/30 text-ivory hover:border-gold'
                      }`}
                    >
                      + Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setStockAdjustMode('subtract')}
                      className={`py-2.5 text-xs font-bold rounded border transition min-h-[44px] flex items-center justify-center ${
                        stockAdjustMode === 'subtract' ? 'bg-amber-600 text-white border-amber-500' : 'border-gold/30 text-ivory hover:border-gold'
                      }`}
                    >
                      - Subtract
                    </button>
                    <button
                      type="button"
                      onClick={() => setStockAdjustMode('set')}
                      className={`py-2.5 text-xs font-bold rounded border transition min-h-[44px] flex items-center justify-center ${
                        stockAdjustMode === 'set' ? 'bg-blue-600 text-white border-blue-500' : 'border-gold/30 text-ivory hover:border-gold'
                      }`}
                    >
                      = Set Exact
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase text-muted tracking-wider mb-1 font-semibold">Quantity</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={stockAdjustQty}
                    onChange={(e) => setStockAdjustQty(parseInt(e.target.value) || 0)}
                    className="w-full bg-background border border-gold/25 p-3 rounded text-ivory focus:border-gold font-bold text-base outline-none min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase text-muted tracking-wider mb-1 font-semibold">Audit Reason / Note</label>
                  <input
                    type="text"
                    placeholder="e.g. Supplier Restock, Damaged Return, Manual Audit"
                    value={stockAdjustNote}
                    onChange={(e) => setStockAdjustNote(e.target.value)}
                    className="w-full bg-background border border-gold/25 p-3 rounded text-ivory focus:border-gold outline-none text-sm min-h-[44px]"
                  />
                </div>

                <div className="pt-4 border-t border-gold/15 flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setAdjustingStockItem(null)}
                    className="w-full sm:w-auto px-4 py-2.5 border border-gold/30 hover:border-gold text-xs uppercase tracking-wider rounded min-h-[44px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gold hover:bg-gold-light text-background font-bold text-xs uppercase tracking-wider transition shadow"
                  >
                    Apply Adjustment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL / DRAWER: STOCK HISTORY AUDIT LOG */}
        {showStockHistoryDrawer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 overflow-hidden">
            <div className="gold-gradient-border bg-charcoal rounded-xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="flex justify-between items-center px-4 py-3 sm:px-6 sm:py-4 border-b border-gold/15 shrink-0 bg-charcoal z-10">
                <div>
                  <h3 className="font-serif text-lg sm:text-2xl text-gold truncate">Stock Audit Movement Logs</h3>
                  <p className="text-[11px] sm:text-xs text-muted font-sans mt-0.5">Chronological record of stock deductions, restorations, and manual updates</p>
                </div>
                <button
                  onClick={() => setShowStockHistoryDrawer(false)}
                  className="text-muted hover:text-gold transition p-1.5 rounded-full hover:bg-gold/10 material-symbols-outlined"
                >
                  close
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 custom-scrollbar">
                {stockLogs.length === 0 ? (
                  <div className="bg-background/40 p-8 rounded text-center border border-dashed border-gold/15 text-xs text-muted">
                    No stock adjustment movements recorded yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-gold/15 rounded">
                    <table className="w-full text-left border-collapse text-xs min-w-[600px]">
                      <thead>
                        <tr className="border-b border-gold/15 text-gold uppercase tracking-wider bg-background/50">
                          <th className="p-3">Timestamp</th>
                          <th className="p-3">Item / SKU</th>
                          <th className="p-3">Movement Type</th>
                          <th className="p-3">Change</th>
                          <th className="p-3">Stock Before → After</th>
                          <th className="p-3">Notes / Ref Order</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gold/10 font-sans">
                        {stockLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-gold/5 text-ivory">
                            <td className="p-3 text-muted text-[11px] font-mono">
                              {new Date(log.created_at).toLocaleString()}
                            </td>
                            <td className="p-3 font-semibold">
                              <p className="text-ivory">{log.itemName}</p>
                              <p className="text-[10px] font-mono text-gold/80">{log.sku}</p>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 text-[10px] font-extrabold uppercase rounded border ${
                                log.type === 'ORDER_DEDUCT'
                                  ? 'bg-red-950/50 text-red-300 border-red-500/30'
                                  : log.type === 'ORDER_RESTORE'
                                  ? 'bg-green-950/50 text-green-300 border-green-500/30'
                                  : 'bg-blue-950/50 text-blue-300 border-blue-500/30'
                              }`}>
                                {log.type.replace('_', ' ')}
                              </span>
                            </td>
                            <td className={`p-3 font-bold font-mono ${log.change_amount > 0 ? 'text-green-400' : log.change_amount < 0 ? 'text-red-400' : 'text-ivory'}`}>
                              {log.change_amount > 0 ? `+${log.change_amount}` : log.change_amount}
                            </td>
                            <td className="p-3 font-mono text-muted text-[11px]">
                              {log.previous_stock} → <strong className="text-gold">{log.new_stock}</strong>
                            </td>
                            <td className="p-3 text-muted text-[11px] italic">
                              {log.reference_order ? `Order: ${log.reference_order}` : log.notes || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-gold/15 flex justify-end shrink-0 bg-charcoal z-10">
                <button
                  type="button"
                  onClick={() => setShowStockHistoryDrawer(false)}
                  className="w-full sm:w-auto px-5 py-2.5 bg-gold hover:bg-gold-light text-background font-bold text-xs uppercase tracking-wider rounded min-h-[44px]"
                >
                  Close Log History
                </button>
              </div>
            </div>
          </div>
        )}
        {/* MODAL: ADD PRODUCT (INVENTORY-BASED BUILDER) */}
        {isAddingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 overflow-hidden">
            <div className="gold-gradient-border bg-charcoal rounded-xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="flex justify-between items-center px-4 py-3 sm:px-6 sm:py-4 border-b border-gold/15 shrink-0 bg-charcoal z-10">
                <div>
                  <h3 className="font-serif text-lg sm:text-2xl text-gold truncate">Create Inventory-Based Gift Box</h3>
                  <p className="text-[11px] sm:text-xs text-muted font-sans mt-0.5">Build a gift package linked to custom inventory items</p>
                </div>
                <button
                  onClick={closeAddProductModal}
                  className="text-muted hover:text-gold transition p-1.5 rounded-full hover:bg-gold/10 material-symbols-outlined"
                >
                  close
                </button>
              </div>

              <form onSubmit={handleAddProductSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-sm text-ivory custom-scrollbar">
                {/* Name & Basic Info */}
                <div>
                  <label className="block text-xs uppercase tracking-wider text-muted mb-1 font-semibold">Gift Box Name</label>
                  <input
                    type="text"
                    required
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    placeholder="e.g. The Noir Classic Suite"
                    className="w-full bg-background border border-gold/25 p-3 rounded text-sm text-ivory focus:border-gold outline-none min-h-[44px]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-muted mb-1 font-semibold">Base Price (Rs.)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={newProduct.price || ''}
                      onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-background border border-gold/25 p-2.5 rounded text-ivory focus:border-gold outline-none font-semibold text-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-muted mb-1 font-semibold">Discount / Old Price (Rs. optional)</label>
                    <input
                      type="number"
                      min="0"
                      value={newProduct.old_price || ''}
                      onChange={(e) => setNewProduct({ ...newProduct, old_price: e.target.value ? parseFloat(e.target.value) : undefined })}
                      className="w-full bg-background border border-gold/25 p-2.5 rounded text-ivory focus:border-gold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-muted mb-1 font-semibold">Stock Quantity</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={newProduct.stock}
                      onChange={(e) => setNewProduct({ ...newProduct, stock: parseInt(e.target.value) || 0 })}
                      className="w-full bg-background border border-gold/25 p-2.5 rounded text-ivory focus:border-gold outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-muted mb-1 font-semibold">Default Gift Wrapping Style</label>
                  <select
                    value={newProduct.default_wrapping || 'Signature Matte Black & Gold Foil'}
                    onChange={(e) => setNewProduct({ ...newProduct, default_wrapping: e.target.value })}
                    className="w-full bg-background border border-gold/25 p-2.5 rounded text-ivory focus:border-gold outline-none"
                  >
                    <option value="Signature Matte Black & Gold Foil">Signature Matte Black & Gold Foil</option>
                    <option value="Satin Red & Gold Ribbon Curation">Satin Red & Gold Ribbon Curation</option>
                    <option value="Velvet Emerald & Gold Seal">Velvet Emerald & Gold Seal</option>
                    <option value="Minimalist Parchment & Wax Stamp">Minimalist Parchment & Wax Stamp</option>
                    <option value="Midnight Navy Sleek Casing">Midnight Navy Sleek Casing</option>
                  </select>
                </div>

                {/* GIFT BOX ITEMS (INVENTORY BUILDER) */}
                <div className="border-t border-gold/15 pt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-xs uppercase text-gold font-sans tracking-wide font-bold flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">inventory_2</span>
                        Gift Box Included Items (Linked Inventory)
                      </h4>
                      <p className="text-[11px] text-muted font-sans">Select inventory items and set default quantities included in this package</p>
                    </div>
                    <span className="text-xs font-bold text-gold font-mono bg-gold/10 border border-gold/30 px-2.5 py-1 rounded-full">
                      {(newProduct.gift_box_items || []).length} Item{(newProduct.gift_box_items || []).length !== 1 ? 's' : ''} Included
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search inventory items (wallets, perfumes, watches, chocolates, flowers...)..."
                      value={boxBuilderSearch}
                      onChange={(e) => setBoxBuilderSearch(e.target.value)}
                      className="w-full bg-background border border-gold/25 text-xs text-ivory pl-8 pr-3 py-2 rounded outline-none focus:border-gold"
                    />
                    <span className="material-symbols-outlined absolute left-2.5 top-2 text-muted text-base">search</span>
                  </div>

                  {/* Scrollable Inventory Selector */}
                  <div className="max-h-56 overflow-y-auto border border-gold/15 rounded bg-background/40 divide-y divide-gold/10 pr-1">
                    {customInventory
                      .filter(item => item.enabled !== false && (!boxBuilderSearch || item.name.toLowerCase().includes(boxBuilderSearch.toLowerCase()) || item.sku.toLowerCase().includes(boxBuilderSearch.toLowerCase()) || item.category.toLowerCase().includes(boxBuilderSearch.toLowerCase())))
                      .map(item => {
                        const isChecked = (newProduct.gift_box_items || []).some(i => String(i.inventory_item_id) === String(item.id));
                        const selectedObj = (newProduct.gift_box_items || []).find(i => String(i.inventory_item_id) === String(item.id));
                        const currentQty = selectedObj ? selectedObj.quantity : 1;

                        return (
                          <div key={item.id} className={`p-2.5 flex items-center justify-between transition ${isChecked ? 'bg-gold/10' : 'hover:bg-gold/5'}`}>
                            <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0 pr-3">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleIncludeItemNew(item)}
                                className="accent-gold h-4 w-4 shrink-0"
                              />
                              <img src={item.image_url || item.image_url} alt={item.name} className="w-9 h-9 object-cover rounded border border-gold/20 shrink-0" />
                              <div className="truncate">
                                <p className="text-xs font-bold text-ivory truncate">{item.name}</p>
                                <p className="text-[10px] text-muted font-mono">{item.sku} • {item.category} • Rs. {item.price.toLocaleString()}</p>
                              </div>
                            </label>

                            {isChecked && (
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] text-muted font-sans font-semibold uppercase">Qty:</span>
                                <div className="flex items-center bg-charcoal border border-gold/30 rounded">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateIncludeItemQtyNew(item.id, -1)}
                                    className="w-6 h-6 text-gold hover:bg-gold hover:text-background font-bold text-xs flex items-center justify-center transition"
                                  >
                                    -
                                  </button>
                                  <span className="w-6 text-center text-xs font-bold text-ivory font-mono">{currentQty}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateIncludeItemQtyNew(item.id, 1)}
                                    className="w-6 h-6 text-gold hover:bg-gold hover:text-background font-bold text-xs flex items-center justify-center transition"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-muted mb-1 font-semibold">
                    Description & Included Items Manifest (Auto-updated)
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    placeholder="Brief description of the gift package..."
                    className="w-full bg-background border border-gold/25 p-2.5 rounded text-ivory focus:border-gold outline-none resize-none font-sans text-xs"
                  />
                </div>

                {/* IMAGES MANAGEMENT */}
                <div className="border-t border-gold/15 pt-4">
                  <h4 className="text-xs uppercase text-gold font-sans tracking-wide mb-3 font-semibold">Gift Box Presentation Images</h4>
                  
                  {newProduct.image_urls && newProduct.image_urls.length > 0 && (
                    <div className="grid grid-cols-5 gap-3 mb-4">
                      {newProduct.image_urls.map((img, idx) => (
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div className="space-y-1">
                      <label className="block text-xs text-muted">Add Image via URL</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={urlInput}
                          onChange={(e) => setUrlInput(e.target.value)}
                          placeholder="https://example.com/image.jpg"
                          className="flex-1 bg-background border border-gold/25 p-2 rounded text-ivory focus:border-gold outline-none text-xs"
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

                    <div>
                      <label className="flex flex-col items-center justify-center border border-dashed border-gold/25 hover:border-gold bg-background/30 h-10 rounded cursor-pointer transition">
                        <span className="text-[11px] text-gold uppercase font-sans tracking-wider flex items-center gap-1.5 font-bold">
                          <span className="material-symbols-outlined text-sm">
                            {isUploadingProductImage ? 'sync' : 'cloud_upload'}
                          </span>
                          {isUploadingProductImage ? 'Uploading to Supabase (product-images)…' : 'Upload File to Supabase Storage'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={isUploadingProductImage}
                          onChange={(e) => handleImageUpload(e, false)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gold/15 flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={closeAddProductModal}
                    className="w-full sm:w-auto px-5 py-3 border border-gold/30 hover:border-gold hover:text-gold text-xs font-sans uppercase tracking-wider transition rounded min-h-[44px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddProductSubmit()}
                    className="w-full sm:w-auto px-6 py-3 bg-gold hover:bg-gold-light text-background font-bold text-xs font-sans uppercase tracking-wider transition shadow cursor-pointer min-h-[44px] flex items-center justify-center"
                  >
                    Save Gift Box
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: EDIT PRODUCT (INVENTORY-BASED BUILDER) */}
        {editingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 overflow-hidden">
            <div className="gold-gradient-border bg-charcoal rounded-xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="flex justify-between items-center px-4 py-3 sm:px-6 sm:py-4 border-b border-gold/15 shrink-0 bg-charcoal z-10">
                <div>
                  <h3 className="font-serif text-lg sm:text-2xl text-gold truncate">Edit Inventory-Based Gift Box</h3>
                  <p className="text-[11px] sm:text-xs text-muted font-sans mt-0.5 truncate max-w-xs sm:max-w-md">{editingProduct.name}</p>
                </div>
                <button
                  onClick={() => setEditingProduct(null)}
                  className="text-muted hover:text-gold transition p-1.5 rounded-full hover:bg-gold/10 material-symbols-outlined"
                >
                  close
                </button>
              </div>

              <form onSubmit={handleUpdateProductSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-sm text-ivory custom-scrollbar">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-muted mb-1 font-semibold">Gift Box Name</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full bg-background border border-gold/25 p-3 rounded text-sm text-ivory focus:border-gold outline-none min-h-[44px]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-muted mb-1 font-semibold">Base Price (Rs.)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={editingProduct.price}
                      onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-background border border-gold/25 p-2.5 rounded text-ivory focus:border-gold outline-none font-semibold text-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-muted mb-1 font-semibold">Discount Price (Rs. optional)</label>
                    <input
                      type="number"
                      min="0"
                      value={editingProduct.old_price || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, old_price: e.target.value ? parseFloat(e.target.value) : undefined })}
                      className="w-full bg-background border border-gold/25 p-2.5 rounded text-ivory focus:border-gold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-muted mb-1 font-semibold">Stock Quantity</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={editingProduct.stock}
                      onChange={(e) => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) || 0 })}
                      className="w-full bg-background border border-gold/25 p-2.5 rounded text-ivory focus:border-gold outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-muted mb-1 font-semibold">Default Gift Wrapping Style</label>
                  <select
                    value={editingProduct.default_wrapping || 'Signature Matte Black & Gold Foil'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, default_wrapping: e.target.value })}
                    className="w-full bg-background border border-gold/25 p-2.5 rounded text-ivory focus:border-gold outline-none"
                  >
                    <option value="Signature Matte Black & Gold Foil">Signature Matte Black & Gold Foil</option>
                    <option value="Satin Red & Gold Ribbon Curation">Satin Red & Gold Ribbon Curation</option>
                    <option value="Velvet Emerald & Gold Seal">Velvet Emerald & Gold Seal</option>
                    <option value="Minimalist Parchment & Wax Stamp">Minimalist Parchment & Wax Stamp</option>
                    <option value="Midnight Navy Sleek Casing">Midnight Navy Sleek Casing</option>
                  </select>
                </div>

                {/* GIFT BOX ITEMS (INVENTORY BUILDER) */}
                <div className="border-t border-gold/15 pt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-xs uppercase text-gold font-sans tracking-wide font-bold flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">inventory_2</span>
                        Gift Box Included Items (Linked Inventory)
                      </h4>
                      <p className="text-[11px] text-muted font-sans">Select inventory items and set default quantities included in this package</p>
                    </div>
                    <span className="text-xs font-bold text-gold font-mono bg-gold/10 border border-gold/30 px-2.5 py-1 rounded-full">
                      {(editingProduct.gift_box_items || []).length} Item{(editingProduct.gift_box_items || []).length !== 1 ? 's' : ''} Included
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search inventory items..."
                      value={boxBuilderSearch}
                      onChange={(e) => setBoxBuilderSearch(e.target.value)}
                      className="w-full bg-background border border-gold/25 text-xs text-ivory pl-8 pr-3 py-2 rounded outline-none focus:border-gold"
                    />
                    <span className="material-symbols-outlined absolute left-2.5 top-2 text-muted text-base">search</span>
                  </div>

                  <div className="max-h-56 overflow-y-auto border border-gold/15 rounded bg-background/40 divide-y divide-gold/10 pr-1">
                    {customInventory
                      .filter(item => item.enabled !== false && (!boxBuilderSearch || item.name.toLowerCase().includes(boxBuilderSearch.toLowerCase()) || item.sku.toLowerCase().includes(boxBuilderSearch.toLowerCase()) || item.category.toLowerCase().includes(boxBuilderSearch.toLowerCase())))
                      .map(item => {
                        const isChecked = (editingProduct.gift_box_items || []).some(i => String(i.inventory_item_id) === String(item.id));
                        const selectedObj = (editingProduct.gift_box_items || []).find(i => String(i.inventory_item_id) === String(item.id));
                        const currentQty = selectedObj ? selectedObj.quantity : 1;

                        return (
                          <div key={item.id} className={`p-2.5 flex items-center justify-between transition ${isChecked ? 'bg-gold/10' : 'hover:bg-gold/5'}`}>
                            <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0 pr-3">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleIncludeItemEdit(item)}
                                className="accent-gold h-4 w-4 shrink-0"
                              />
                              <img src={item.image_url} alt={item.name} className="w-9 h-9 object-cover rounded border border-gold/20 shrink-0" />
                              <div className="truncate">
                                <p className="text-xs font-bold text-ivory truncate">{item.name}</p>
                                <p className="text-[10px] text-muted font-mono">{item.sku} • {item.category} • Rs. {item.price.toLocaleString()}</p>
                              </div>
                            </label>

                            {isChecked && (
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] text-muted font-sans font-semibold uppercase">Qty:</span>
                                <div className="flex items-center bg-charcoal border border-gold/30 rounded">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateIncludeItemQtyEdit(item.id, -1)}
                                    className="w-6 h-6 text-gold hover:bg-gold hover:text-background font-bold text-xs flex items-center justify-center transition"
                                  >
                                    -
                                  </button>
                                  <span className="w-6 text-center text-xs font-bold text-ivory font-mono">{currentQty}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateIncludeItemQtyEdit(item.id, 1)}
                                    className="w-6 h-6 text-gold hover:bg-gold hover:text-background font-bold text-xs flex items-center justify-center transition"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-muted mb-1 font-semibold">
                    Description & Included Items Manifest
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={editingProduct.description}
                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                    className="w-full bg-background border border-gold/25 p-2.5 rounded text-ivory focus:border-gold outline-none resize-none font-sans text-xs"
                  />
                </div>

                {/* IMAGES MANAGEMENT */}
                <div className="border-t border-gold/15 pt-4">
                  <h4 className="text-xs uppercase text-gold font-sans tracking-wide mb-3 font-semibold">Gift Box Images</h4>
                  
                  {editingProduct.image_urls && editingProduct.image_urls.length > 0 && (
                    <div className="grid grid-cols-5 gap-3 mb-4">
                      {editingProduct.image_urls.map((img, idx) => (
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div className="space-y-1">
                      <label className="block text-xs text-muted">Add Image via URL</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={urlInput}
                          onChange={(e) => setUrlInput(e.target.value)}
                          placeholder="https://example.com/image.jpg"
                          className="flex-1 bg-background border border-gold/25 p-2 rounded text-ivory focus:border-gold outline-none text-xs"
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

                    <div>
                      <label className="flex flex-col items-center justify-center border border-dashed border-gold/25 hover:border-gold bg-background/30 h-10 rounded cursor-pointer transition">
                        <span className="text-[11px] text-gold uppercase font-sans tracking-wider flex items-center gap-1.5 font-bold">
                          <span className="material-symbols-outlined text-sm">
                            {isUploadingProductImage ? 'sync' : 'cloud_upload'}
                          </span>
                          {isUploadingProductImage ? 'Uploading to Supabase (product-images)…' : 'Upload File to Supabase Storage'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={isUploadingProductImage}
                          onChange={(e) => handleImageUpload(e, true)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gold/15 flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="w-full sm:w-auto px-5 py-3 border border-gold/30 hover:border-gold hover:text-gold text-xs font-sans uppercase tracking-wider transition rounded min-h-[44px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateProductSubmit()}
                    className="w-full sm:w-auto px-6 py-3 bg-gold hover:bg-gold-light text-background font-bold text-xs font-sans uppercase tracking-wider transition shadow cursor-pointer min-h-[44px] flex items-center justify-center"
                  >
                    Update Gift Box
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: ORDER DETAILS */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 overflow-hidden">
            <div className="gold-gradient-border bg-charcoal rounded-xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="flex justify-between items-center px-4 py-3 sm:px-6 sm:py-4 border-b border-gold/15 shrink-0 bg-charcoal z-10">
                <div>
                  <h3 className="font-serif text-lg sm:text-2xl text-gold truncate">Order Details</h3>
                  <p className="text-mono text-xs text-muted mt-0.5">{selectedOrder.order_number}</p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-muted hover:text-gold transition p-1.5 rounded-full hover:bg-gold/10 material-symbols-outlined"
                >
                  close
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-sm text-ivory custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs uppercase text-gold font-sans tracking-wide">Client Details</h4>
                    <p className="mt-1.5 font-bold text-base">{selectedOrder.customer_name}</p>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs uppercase text-gold font-sans tracking-wide">Order Metadata</h4>
                    <p className="mt-1.5 text-xs text-muted">Placed: {new Date(selectedOrder.created_at).toLocaleString()}</p>
                    <p className="text-xs text-gold font-bold">
                      Required Date: {selectedOrder.delivery_date ? new Date(selectedOrder.delivery_date).toLocaleDateString() : 'Standard (3+ Days)'}
                    </p>
                    <p className="text-xs text-muted">Method: {selectedOrder.payment_method}</p>
                    <p className="text-xs text-muted">
                      Status: <span className="font-bold text-gold">{selectedOrder.order_status}</span>
                    </p>
                  </div>
                  <div>
                    <h4 className="text-xs uppercase text-gold font-sans tracking-wide">Financials</h4>
                    <p className="mt-1.5 text-xs text-muted">Subtotal: Rs.{selectedOrder.subtotal.toLocaleString()}.00</p>
                    <p className="text-xs text-muted">Delivery: Rs.{selectedOrder.delivery_fee.toLocaleString()}.00</p>
                    <p className="text-sm font-bold text-gold mt-1">Total: Rs.{selectedOrder.total.toLocaleString()}.00</p>
                  </div>
                </div>

                {/* CUSTOM GIFT BOX CURATION BREAKDOWN FOR ADMIN */}
                {(selectedOrder.custom_gift_details || selectedOrder.cart_items?.some(i => i.isCustom || (i as any).isCustomPreMadeBox)) && (
                  <>
                    <div className="section-divider"></div>
                    <div className="bg-background/80 p-4 rounded-lg border border-gold/20 space-y-3">
                      <h4 className="text-xs uppercase text-gold font-bold font-sans tracking-wide flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">auto_awesome</span>
                        Custom Curation & Gift Box Manifest
                      </h4>
                      {selectedOrder.custom_gift_details && (
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between items-center border-b border-gold/10 pb-1.5">
                            <span>Box Size: <strong className="text-gold">{selectedOrder.custom_gift_details.boxSize}</strong></span>
                            <span>Box Finish: <strong className="text-ivory">{selectedOrder.custom_gift_details.boxColor}</strong></span>
                          </div>
                          {selectedOrder.custom_gift_details.items && selectedOrder.custom_gift_details.items.length > 0 && (
                            <div>
                              <p className="text-[10px] uppercase text-muted tracking-wider mb-1 font-semibold">Items to Pack ({selectedOrder.custom_gift_details.items.length}):</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] bg-charcoal p-2 rounded border border-gold/10">
                                {selectedOrder.custom_gift_details.items.map((cItem, cIdx) => (
                                  <div key={cIdx} className="flex items-center gap-1 text-ivory">
                                    <span className="text-gold font-bold">•</span>
                                    <span className="truncate">{cItem.name}</span>
                                    <span className="text-gold font-bold">x{cItem.quantity}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {selectedOrder.cart_items?.filter(i => (i as any).isCustomPreMadeBox && (i as any).preMadeCustomDetails).map((pmItem, pmIdx) => {
                        const pmDetails = (pmItem as any).preMadeCustomDetails;
                        return (
                          <div key={pmIdx} className="space-y-2 text-xs border-t border-gold/10 pt-2 font-sans">
                            <p className="font-bold text-ivory text-xs">{pmItem.name}</p>
                            <div className="space-y-1 text-[11px] bg-charcoal p-2 rounded border border-gold/10">
                              {pmDetails.keptItems?.map((kItem: any, kIdx: number) => (
                                <div key={kIdx} className="flex items-center gap-1.5 text-ivory">
                                  <span className="text-gold font-bold">✓</span>
                                  <span>{kItem.quantity}x {kItem.name}</span>
                                </div>
                              ))}
                              {pmDetails.removedItems?.map((rItem: any, rIdx: number) => (
                                <div key={rIdx} className="flex items-center gap-1.5 text-red-400/80 line-through">
                                  <span>✗</span>
                                  <span>{rItem.quantity}x {rItem.name} (Removed - Do NOT pack)</span>
                                </div>
                              ))}
                              {pmDetails.extraAddedItems?.map((eItem: any, eIdx: number) => (
                                <div key={eIdx} className="flex items-center gap-1.5 text-green-400">
                                  <span>+</span>
                                  <span>{eItem.quantity}x {eItem.name} (Extra Added - Pack item)</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {(selectedOrder.gift_message || selectedOrder.wrapping) && (
                  <>
                    <div className="section-divider"></div>
                    <div className="space-y-3">
                      {selectedOrder.wrapping && (
                        <div>
                          <h4 className="text-xs uppercase text-gold font-sans tracking-wide">Premium Wrapping Option</h4>
                          <p className="mt-1 text-xs text-muted italic">{selectedOrder.wrapping}</p>
                        </div>
                      )}
                      {selectedOrder.gift_message && (
                        <div>
                          <h4 className="text-xs uppercase text-gold font-sans tracking-wide">Personal Greeting Message</h4>
                          <div className="mt-1.5 p-3 bg-background border border-gold/10 rounded text-xs text-muted leading-relaxed italic">
                            "{selectedOrder.gift_message}"
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-gold/15 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0 bg-charcoal z-10">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label className="text-xs uppercase text-muted font-sans shrink-0">Set Status:</label>
                  <select
                    value={selectedOrder.order_status}
                    onChange={(e) => handleOrderStatusChange(selectedOrder.id, e.target.value as any)}
                    className="flex-1 bg-background border border-gold/25 text-xs text-ivory p-2 rounded focus:border-gold outline-none min-h-[44px]"
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
                  className="w-full sm:w-auto px-5 py-2.5 bg-gold hover:bg-gold-light text-background font-semibold text-xs font-sans uppercase tracking-wider transition min-h-[44px]"
                >
                  Close Summary
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* MODAL: ADD CLIENT REVIEW */}
      {isAddingReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 overflow-hidden">
          <div className="gold-gradient-border bg-charcoal rounded-xl max-w-md w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center px-4 py-3 sm:px-6 sm:py-4 border-b border-gold/15 shrink-0 bg-charcoal z-10">
              <h3 className="font-serif text-lg sm:text-2xl text-gold truncate">Add Client Review Image</h3>
              <button
                onClick={() => setIsAddingReview(false)}
                className="text-muted hover:text-gold transition p-1.5 rounded-full hover:bg-gold/10 material-symbols-outlined"
              >
                close
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-sm text-ivory custom-scrollbar">
              <div className="space-y-1">
                <label className="block text-xs uppercase tracking-wider text-muted mb-1 font-sans font-semibold">Image URL</label>
                <input
                  type="text"
                  value={newReviewImage}
                  onChange={(e) => setNewReviewImage(e.target.value)}
                  placeholder="https://example.com/screenshot.jpg"
                  className="w-full bg-background border border-gold/25 p-3 rounded text-sm text-ivory focus:border-gold outline-none min-h-[44px]"
                />
              </div>

              <div className="relative flex items-center justify-center py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gold/10"></div>
                </div>
                <span className="relative px-3 bg-charcoal text-[10px] uppercase text-muted tracking-widest font-sans">Or Upload File</span>
              </div>

              <div>
                <label className="flex flex-col items-center justify-center border border-dashed border-gold/25 hover:border-gold bg-background/30 h-16 rounded cursor-pointer transition min-h-[44px]">
                  <span className="text-xs text-gold uppercase font-sans tracking-wider flex items-center gap-1.5 font-bold">
                    <span className="material-symbols-outlined text-base">
                      {isUploadingReviewImage ? 'sync' : 'cloud_upload'}
                    </span>
                    {isUploadingReviewImage ? 'Uploading to Supabase Storage (review-photos)…' : 'Choose Screenshot Image'}
                  </span>
                  {newReviewImage && newReviewImage.includes('supabase.co/storage') && (
                    <span className="text-[10px] text-green-400 mt-1 font-mono flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">check_circle</span>
                      Stored in Supabase bucket: review-photos
                    </span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploadingReviewImage}
                    onChange={handleReviewImageUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="pt-4 border-t border-gold/15 flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddingReview(false)}
                  className="w-full sm:w-auto px-5 py-3 border border-gold/30 hover:border-gold hover:text-gold text-xs font-sans uppercase tracking-wider transition rounded min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={(e) => handleReviewSubmit(e)}
                  className="w-full sm:w-auto px-6 py-3 bg-gold hover:bg-gold-light text-background font-semibold text-xs font-sans uppercase tracking-wider transition cursor-pointer min-h-[44px] flex items-center justify-center"
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
