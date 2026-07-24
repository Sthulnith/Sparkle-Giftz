import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  deleteOrder,
  getClientReviews,
  createMultipleClientReviews,
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








const ColorVariantUrlInput = ({ colorName, onAdd }: { colorName: string; onAdd: (url: string) => void }) => {
  const [val, setVal] = useState('');
  return (
    <div className="flex gap-1.5 font-sans">
      <input
        type="text"
        placeholder={`Paste ${colorName} photo URL...`}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="flex-1 bg-charcoal border border-gold/25 p-2 rounded text-xs text-ivory outline-none focus:border-gold min-h-[36px]"
      />
      <button
        type="button"
        onClick={() => {
          if (!val.trim()) return;
          onAdd(val.trim());
          setVal('');
        }}
        className="px-3.5 py-1.5 bg-gold/15 hover:bg-gold hover:text-background border border-gold/30 text-gold font-bold text-xs uppercase tracking-wider rounded transition min-h-[36px] shrink-0"
      >
        Add URL
      </button>
    </div>
  );
};

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

  // New review form states — supports MULTIPLE review images upload
  const [newReviewImages, setNewReviewImages] = useState<string[]>([]);
  const [reviewUrlInput, setReviewUrlInput] = useState<string>('');
  const [reviewProgress, setReviewProgress] = useState<{ current: number; total: number } | null>(null);

  // New Image inputs helper
  const [urlInput, setUrlInput] = useState<string>('');

  const [boxBuilderSearch, setBoxBuilderSearch] = useState<string>('');
  const [boxBuilderCategory, setBoxBuilderCategory] = useState<string>('All');

  // Order Filtering state
  const [orderStatusFilter, setOrderStatusFilter] = useState<'ALL' | 'PENDING' | 'CONFIRMED' | 'CANCELLED'>('ALL');
  const [orderDateFilter, setOrderDateFilter] = useState<string>('');

  // Stock Log View Tab state
  const [stockLogTab, setStockLogTab] = useState<'BY_ORDER' | 'BY_ITEM_SUMMARY' | 'DETAILED_LOGS'>('BY_ORDER');


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
    image_urls: [],
    colors: [],
  });

  const [invUrlInput, setInvUrlInput] = useState<string>('');
  const [colorNameInput, setColorNameInput] = useState<string>('');
  const [colorHexInput, setColorHexInput] = useState<string>('#000000');

  const handleAddColorOption = (isEdit: boolean) => {
    if (!colorNameInput.trim()) return;
    const names = colorNameInput.split(',').map(n => n.trim()).filter(Boolean);
    const newColors = names.map(name => ({
      name,
      hex: colorHexInput || '#000000',
    }));

    if (isEdit && editingInvItem) {
      setEditingInvItem(prev => {
        if (!prev) return null;
        return {
          ...prev,
          colors: [...(prev.colors || []), ...newColors],
        };
      });
    } else {
      setNewInvItem(prev => ({
        ...prev,
        colors: [...(prev.colors || []), ...newColors],
      }));
    }
    setColorNameInput('');
  };

  // Upload image file specifically for a color variant
  const handleColorVariantImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean, colorIdx: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setIsUploadingInvImage(true);
    const url = await uploadProductImage(file);
    setIsUploadingInvImage(false);

    if (!url) {
      alert('Failed to upload variant image to Supabase Storage. Please try again.');
      return;
    }

    if (isEdit && editingInvItem) {
      setEditingInvItem(prev => {
        if (!prev) return null;
        const colors = [...(prev.colors || [])];
        if (!colors[colorIdx]) return prev;
        const currentUrls = colors[colorIdx].image_urls || (colors[colorIdx].image_url ? [colors[colorIdx].image_url!] : []);
        const nextUrls = [...currentUrls, url];
        colors[colorIdx] = {
          ...colors[colorIdx],
          image_url: colors[colorIdx].image_url || url,
          image_urls: nextUrls,
        };
        return { ...prev, colors };
      });
    } else {
      setNewInvItem(prev => {
        const colors = [...(prev.colors || [])];
        if (!colors[colorIdx]) return prev;
        const currentUrls = colors[colorIdx].image_urls || (colors[colorIdx].image_url ? [colors[colorIdx].image_url!] : []);
        const nextUrls = [...currentUrls, url];
        colors[colorIdx] = {
          ...colors[colorIdx],
          image_url: colors[colorIdx].image_url || url,
          image_urls: nextUrls,
        };
        return { ...prev, colors };
      });
    }
  };

  // Add Image URL for a color variant
  const handleAddColorVariantImageUrl = (isEdit: boolean, colorIdx: number, urlInput: string) => {
    if (!urlInput.trim()) return;
    const url = urlInput.trim();

    if (isEdit && editingInvItem) {
      setEditingInvItem(prev => {
        if (!prev) return null;
        const colors = [...(prev.colors || [])];
        if (!colors[colorIdx]) return prev;
        const currentUrls = colors[colorIdx].image_urls || (colors[colorIdx].image_url ? [colors[colorIdx].image_url!] : []);
        const nextUrls = [...currentUrls, url];
        colors[colorIdx] = {
          ...colors[colorIdx],
          image_url: colors[colorIdx].image_url || url,
          image_urls: nextUrls,
        };
        return { ...prev, colors };
      });
    } else {
      setNewInvItem(prev => {
        const colors = [...(prev.colors || [])];
        if (!colors[colorIdx]) return prev;
        const currentUrls = colors[colorIdx].image_urls || (colors[colorIdx].image_url ? [colors[colorIdx].image_url!] : []);
        const nextUrls = [...currentUrls, url];
        colors[colorIdx] = {
          ...colors[colorIdx],
          image_url: colors[colorIdx].image_url || url,
          image_urls: nextUrls,
        };
        return { ...prev, colors };
      });
    }
  };

  // Remove photo from a color variant
  const handleRemoveColorVariantPhoto = (isEdit: boolean, colorIdx: number, photoIdx: number) => {
    const updater = (prevColors: import('../lib/supabase').InventoryColorOption[]) => {
      const colors = [...prevColors];
      if (!colors[colorIdx]) return colors;
      const currentUrls = [...(colors[colorIdx].image_urls || [])];
      currentUrls.splice(photoIdx, 1);
      colors[colorIdx] = {
        ...colors[colorIdx],
        image_url: currentUrls[0] || '',
        image_urls: currentUrls,
      };
      return colors;
    };

    if (isEdit && editingInvItem) {
      setEditingInvItem(prev => prev ? { ...prev, colors: updater(prev.colors || []) } : null);
    } else {
      setNewInvItem(prev => ({ ...prev, colors: updater(prev.colors || []) }));
    }
  };

  // Set primary thumbnail for a color variant
  const handleSetPrimaryColorVariantPhoto = (isEdit: boolean, colorIdx: number, url: string) => {
    const updater = (prevColors: import('../lib/supabase').InventoryColorOption[]) => {
      const colors = [...prevColors];
      if (!colors[colorIdx]) return colors;
      colors[colorIdx] = {
        ...colors[colorIdx],
        image_url: url,
      };
      return colors;
    };

    if (isEdit && editingInvItem) {
      setEditingInvItem(prev => prev ? { ...prev, colors: updater(prev.colors || []) } : null);
    } else {
      setNewInvItem(prev => ({ ...prev, colors: updater(prev.colors || []) }));
    }
  };

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

  // Review Image Upload Handler — supports uploading MULTIPLE files at once (e.g. 5, 8, 10 images)
  const handleReviewImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    e.target.value = '';

    setIsUploadingReviewImage(true);
    setReviewProgress({ current: 0, total: files.length });

    const uploadedUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      setReviewProgress({ current: i + 1, total: files.length });
      const url = await uploadReviewPhoto(files[i]);
      if (url) {
        uploadedUrls.push(url);
      }
    }

    setIsUploadingReviewImage(false);
    setReviewProgress(null);

    if (uploadedUrls.length > 0) {
      setNewReviewImages(prev => [...prev, ...uploadedUrls]);
    } else {
      alert('Failed to upload image(s) to Supabase Storage bucket "review-photos". Please verify your connection or file format.');
    }
  };

  const handleAddReviewUrl = () => {
    if (!reviewUrlInput || !reviewUrlInput.trim()) return;
    const urls = reviewUrlInput
      .split(/[\n,]+/)
      .map(u => u.trim())
      .filter(u => u.length > 0);

    if (urls.length > 0) {
      setNewReviewImages(prev => [...prev, ...urls]);
      setReviewUrlInput('');
    }
  };

  const handleRemoveQueuedReviewImage = (idx: number) => {
    setNewReviewImages(prev => prev.filter((_, i) => i !== idx));
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
    let finalUrls = [...newReviewImages];
    if (reviewUrlInput && reviewUrlInput.trim()) {
      const extra = reviewUrlInput.split(/[\n,]+/).map(u => u.trim()).filter(Boolean);
      finalUrls = [...finalUrls, ...extra];
    }

    if (finalUrls.length === 0) {
      alert('Please upload or enter at least one review image first.');
      return;
    }

    setIsUploadingReviewImage(true);
    const ok = await createMultipleClientReviews(finalUrls, '');
    setIsUploadingReviewImage(false);

    if (ok) {
      await loadData();
      window.dispatchEvent(new CustomEvent('sparkle_client_reviews_updated'));
      setIsAddingReview(false);
      setNewReviewImages([]);
      setReviewUrlInput('');
    } else {
      alert('Failed to save review images. Please try again.');
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
      const currentList = editingProduct.image_urls || [];
      const updatedImages = [...currentList];
      updatedImages.splice(index, 1);
      setEditingProduct({
        ...editingProduct,
        image_urls: updatedImages,
      });
    } else {
      const currentList = newProduct.image_urls || [];
      const updatedImages = [...currentList];
      updatedImages.splice(index, 1);
      setNewProduct(prev => ({
        ...prev,
        image_urls: updatedImages,
      }));
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
      image_urls: [],
      colors: [],
    });
    setInvUrlInput('');
    setColorNameInput('');
    setColorHexInput('#000000');
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
      image_urls: [],
      colors: [],
    });
    setInvUrlInput('');
    setColorNameInput('');
    setColorHexInput('#000000');
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
    const finalImgUrls = newInvItem.image_urls || [];
    if (newInvItem.image_url && !finalImgUrls.includes(newInvItem.image_url)) {
      finalImgUrls.unshift(newInvItem.image_url);
    }
    const primaryImg = newInvItem.image_url?.trim() || finalImgUrls[0] || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=600&auto=format&fit=crop';

    const result = await createInventoryItem({
      ...newInvItem,
      name: newInvItem.name.trim(),
      image_url: primaryImg,
      image_urls: finalImgUrls,
      colors: newInvItem.colors || [],
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
    const currentImgUrls = editingInvItem.image_urls || (editingInvItem.image_url ? [editingInvItem.image_url] : []);
    if (editingInvItem.image_url && !currentImgUrls.includes(editingInvItem.image_url)) {
      currentImgUrls.unshift(editingInvItem.image_url);
    }
    const primaryImg = editingInvItem.image_url?.trim() || currentImgUrls[0] || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=600&auto=format&fit=crop';

    const ok = await updateInventoryItem(editingInvItem.id as number, {
      ...editingInvItem,
      name: editingInvItem.name.trim(),
      image_url: primaryImg,
      image_urls: currentImgUrls,
      colors: editingInvItem.colors || [],
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
    const paymentStatus = status === 'CONFIRMED' ? 'PAID' as const : undefined;
    const ok = await updateOrderStatus(orderId, status, paymentStatus);
    if (ok) {
      await loadData();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => prev ? {
          ...prev,
          order_status: status,
          payment_status: status === 'CONFIRMED' ? 'PAID' as const : prev.payment_status
        } : null);
      }
    } else {
      alert('Failed to update order status. Please try again.');
    }
  };

  // Long press timer ref for order deletion
  const orderLongPressTimerRef = useRef<any>(null);

  // Order Delete Handler (triggered on long press or delete button click)
  const handleDeleteOrder = async (order: Order) => {
    const confirmMsg = `Are you sure you want to delete transaction/order "${order.order_number || order.id}" (${order.customer_name})?\n\nThis action will permanently delete this order record.`;
    if (window.confirm(confirmMsg)) {
      const ok = await deleteOrder(order.id);
      if (ok) {
        setOrders(prev => prev.filter(o => o.id !== order.id));
        if (selectedOrder && selectedOrder.id === order.id) {
          setSelectedOrder(null);
        }
      } else {
        alert('Failed to delete order. Please try again.');
      }
    }
  };

  const handleOrderPressStart = (order: Order) => {
    if (orderLongPressTimerRef.current) {
      clearTimeout(orderLongPressTimerRef.current);
    }
    orderLongPressTimerRef.current = setTimeout(() => {
      handleDeleteOrder(order);
    }, 500); // 500ms long press threshold
  };

  const handleOrderPressEnd = () => {
    if (orderLongPressTimerRef.current) {
      clearTimeout(orderLongPressTimerRef.current);
      orderLongPressTimerRef.current = null;
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
                    <span className="px-2 py-0.5 font-semibold rounded bg-gold/15 text-gold border border-gold/30">
                      Active Package
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
                          <span className="px-2.5 py-1 text-xs font-semibold rounded bg-gold/15 text-gold border border-gold/30">
                            Active Package
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
        {activeTab === 'orders' && (() => {
          const sortedAndFilteredOrders = orders
            .filter(order => {
              const matchStatus = orderStatusFilter === 'ALL' || order.order_status === orderStatusFilter;
              const createdDate = order.created_at ? new Date(order.created_at).toISOString().slice(0, 10) : '';
              const matchDate = !orderDateFilter || createdDate === orderDateFilter;
              return matchStatus && matchDate;
            })
            .sort((a, b) => {
              // PENDING orders always shown at the top of the list first
              if (a.order_status === 'PENDING' && b.order_status !== 'PENDING') return -1;
              if (a.order_status !== 'PENDING' && b.order_status === 'PENDING') return 1;
              // Secondary sort by date descending
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });

          return (
            <div className="space-y-6">
              {/* Header & Filter Controls Bar */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gold/15 pb-4">
                <div>
                  <h2 className="font-serif text-2xl text-gold">Recent Transactions</h2>
                  <p className="text-xs text-muted font-sans mt-0.5">
                    Pending orders appear at top. Confirming an order reduces stock for included box items.
                  </p>
                </div>

                {/* Filter Controls: Date Filter + Status Tabs */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Date Filter input */}
                  <div className="flex items-center gap-2 bg-background border border-gold/25 px-3 py-1.5 rounded">
                    <span className="material-symbols-outlined text-gold text-base">calendar_month</span>
                    <span className="text-xs text-muted font-sans uppercase font-bold">Filter Date:</span>
                    <input
                      type="date"
                      value={orderDateFilter}
                      onChange={(e) => setOrderDateFilter(e.target.value)}
                      className="bg-transparent text-ivory text-xs font-sans outline-none cursor-pointer"
                    />
                    {orderDateFilter && (
                      <button
                        type="button"
                        onClick={() => setOrderDateFilter('')}
                        className="text-muted hover:text-gold text-xs material-symbols-outlined ml-1"
                        title="Clear date filter"
                      >
                        close
                      </button>
                    )}
                  </div>

                  {/* Status Filter Tabs */}
                  <div className="flex items-center gap-1 bg-background/60 p-1 border border-gold/20 rounded">
                    {(['ALL', 'PENDING', 'CONFIRMED', 'CANCELLED'] as const).map((st) => {
                      const isActive = orderStatusFilter === st;
                      const count = st === 'ALL'
                        ? orders.length
                        : orders.filter(o => o.order_status === st).length;

                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setOrderStatusFilter(st)}
                          className={`px-3 py-1 text-[11px] font-sans font-bold uppercase tracking-wider rounded transition flex items-center gap-1 cursor-pointer ${
                            isActive
                              ? 'bg-gold text-background shadow-gold-glow'
                              : 'text-ivory/80 hover:text-gold hover:bg-gold/10'
                          }`}
                        >
                          <span>{st}</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                            isActive ? 'bg-background/25 text-background' : 'bg-gold/15 text-gold'
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Orders Mobile Card View */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {sortedAndFilteredOrders.map((order) => (
                  <div
                    key={order.id}
                    onTouchStart={() => handleOrderPressStart(order)}
                    onTouchEnd={handleOrderPressEnd}
                    onTouchCancel={handleOrderPressEnd}
                    onMouseDown={() => handleOrderPressStart(order)}
                    onMouseUp={handleOrderPressEnd}
                    onMouseLeave={handleOrderPressEnd}
                    className="gold-gradient-border bg-charcoal p-4 rounded-lg space-y-3 font-sans relative transition-all active:scale-[0.99] select-none cursor-pointer"
                  >
                    {order.order_status === 'PENDING' && (
                      <div className="absolute -top-2 -right-2 bg-yellow-400 text-background font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-full shadow-lg border border-yellow-300 animate-pulse">
                        PENDING APPROVAL
                      </div>
                    )}

                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-mono font-bold text-gold">{order.order_number}</span>
                        <h3 className="font-semibold text-ivory text-sm mt-0.5">{order.customer_name}</h3>
                        <p className="text-xs text-muted">{order.city} • {new Date(order.created_at).toLocaleDateString()}</p>
                      </div>
                      <select
                        value={order.order_status}
                        onChange={(e) => handleOrderStatusChange(order.id, e.target.value as any)}
                        className={`border text-[11px] font-bold p-1 rounded outline-none cursor-pointer ${
                          order.order_status === 'PENDING'
                            ? 'bg-yellow-950/60 text-yellow-300 border-yellow-500/40'
                            : order.order_status === 'CONFIRMED'
                            ? 'bg-green-950/60 text-green-300 border-green-500/40'
                            : 'bg-red-950/60 text-red-300 border-red-500/40'
                        }`}
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="CONFIRMED">CONFIRMED</option>
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
                        className="px-3.5 py-1.5 bg-gold hover:bg-gold-light text-background font-bold text-xs uppercase tracking-wider rounded transition shadow min-h-[44px] cursor-pointer"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                ))}

                {sortedAndFilteredOrders.length === 0 && (
                  <div className="py-12 text-center border border-dashed border-gold/20 rounded-lg">
                    <span className="material-symbols-outlined text-gold/40 text-4xl mb-2">inbox</span>
                    <p className="text-sm font-sans text-muted">No orders match the selected filters.</p>
                  </div>
                )}
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
                      {sortedAndFilteredOrders.map((order) => (
                        <tr
                          key={order.id}
                          onTouchStart={() => handleOrderPressStart(order)}
                          onTouchEnd={handleOrderPressEnd}
                          onTouchCancel={handleOrderPressEnd}
                          onMouseDown={() => handleOrderPressStart(order)}
                          onMouseUp={handleOrderPressEnd}
                          onMouseLeave={handleOrderPressEnd}
                          className={`transition duration-150 text-ivory ${order.order_status === 'PENDING' ? 'bg-yellow-950/20 hover:bg-yellow-950/30' : 'hover:bg-gold/5'}`}
                        >
                          <td className="p-4 font-mono font-bold text-gold text-xs">
                            <div className="flex items-center gap-2">
                              {order.order_status === 'PENDING' && (
                                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping shrink-0" title="Pending approval" />
                              )}
                              <span>{order.order_number}</span>
                            </div>
                          </td>
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
                              className={`border text-xs font-bold p-1.5 rounded focus:border-gold outline-none cursor-pointer ${
                                order.order_status === 'PENDING'
                                  ? 'bg-yellow-950/60 text-yellow-300 border-yellow-500/40'
                                  : order.order_status === 'CONFIRMED'
                                  ? 'bg-green-950/60 text-green-300 border-green-500/40'
                                  : 'bg-red-950/60 text-red-300 border-red-500/40'
                              }`}
                            >
                              <option value="PENDING">PENDING</option>
                              <option value="CONFIRMED">CONFIRMED</option>
                              <option value="CANCELLED">CANCELLED</option>
                            </select>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="px-3.5 py-1.5 border border-gold/30 hover:border-gold hover:text-gold text-xs font-sans uppercase tracking-wider transition-all duration-300 cursor-pointer"
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      ))}
                      {sortedAndFilteredOrders.length === 0 && (
                        <tr>
                          <td colSpan={8} className="p-12 text-center text-muted text-sm font-sans">
                            No orders found matching the selected filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}

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
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewInvItem({ ...newInvItem, price: val === '' ? 0 : parseFloat(val) || 0 });
                      }}
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
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewInvItem({ ...newInvItem, cost_price: val === '' ? 0 : parseFloat(val) || 0 });
                      }}
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

                {/* MULTIPLE ITEM PHOTOS / GALLERY */}
                <div className="border-t border-gold/15 pt-4 space-y-3 font-sans">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs uppercase text-gold font-bold tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">photo_camera</span>
                      Item Photo Gallery ({ (newInvItem.image_urls || []).length })
                    </label>
                    <span className="text-[10px] text-muted">First image is set as primary cover</span>
                  </div>

                  {/* Gallery Grid */}
                  <div className="flex flex-wrap gap-2.5">
                    {(newInvItem.image_urls || []).map((imgUrl, imgIdx) => (
                      <div key={imgIdx} className="relative w-20 h-20 rounded border border-gold/30 bg-background overflow-hidden group shadow">
                        <img src={imgUrl} alt={`Gallery ${imgIdx}`} className="w-full h-full object-cover" />
                        {newInvItem.image_url === imgUrl && (
                          <span className="absolute bottom-0 inset-x-0 bg-gold text-background font-extrabold text-[9px] uppercase text-center py-0.5 font-sans">
                            Primary
                          </span>
                        )}
                        <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition duration-200">
                          <button
                            type="button"
                            onClick={() => setNewInvItem(prev => ({ ...prev, image_url: imgUrl }))}
                            className="p-1 text-gold hover:text-white"
                            title="Set as Primary Cover"
                          >
                            <span className="material-symbols-outlined text-sm">star</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...(newInvItem.image_urls || [])];
                              updated.splice(imgIdx, 1);
                              setNewInvItem(prev => ({
                                ...prev,
                                image_urls: updated,
                                image_url: prev.image_url === imgUrl ? (updated[0] || '') : prev.image_url
                              }));
                            }}
                            className="p-1 text-red-400 hover:text-red-300"
                            title="Remove Photo"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}

                    {(newInvItem.image_urls || []).length === 0 && newInvItem.image_url && (
                      <div className="relative w-20 h-20 rounded border border-gold/30 bg-background overflow-hidden shadow">
                        <img src={newInvItem.image_url} alt="Cover" className="w-full h-full object-cover" />
                        <span className="absolute bottom-0 inset-x-0 bg-gold text-background font-extrabold text-[9px] uppercase text-center py-0.5 font-sans">
                          Primary
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Upload File & URL Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="flex items-center justify-center gap-2 px-3 py-2.5 bg-background border border-dashed border-gold/40 hover:border-gold hover:bg-gold/10 text-gold text-xs uppercase font-bold tracking-wider rounded cursor-pointer transition min-h-[44px]">
                      <span className="material-symbols-outlined text-base">{isUploadingInvImage ? 'sync' : 'cloud_upload'}</span>
                      <span>{isUploadingInvImage ? 'Uploading…' : 'Upload Image File'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingInvImage}
                        onChange={(e) => handleInvItemImageUpload(e, false)}
                        className="hidden"
                      />
                    </label>

                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Paste Image URL..."
                        value={invUrlInput}
                        onChange={(e) => setInvUrlInput(e.target.value)}
                        className="flex-1 bg-background border border-gold/25 p-2.5 rounded text-xs text-ivory outline-none focus:border-gold min-h-[44px]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!invUrlInput.trim()) return;
                          const url = invUrlInput.trim();
                          setNewInvItem(prev => {
                            const current = prev.image_urls || [];
                            return {
                              ...prev,
                              image_url: prev.image_url || url,
                              image_urls: [...current, url],
                            };
                          });
                          setInvUrlInput('');
                        }}
                        className="px-4 py-2.5 bg-gold/15 hover:bg-gold hover:text-background border border-gold/30 text-gold text-xs font-bold uppercase rounded transition min-h-[44px]"
                      >
                        Add Photo
                      </button>
                    </div>
                  </div>
                </div>

                {/* AVAILABLE ITEM COLOR VARIANTS (WITH PER-VARIANT IMAGES) */}
                <div className="border-t border-gold/15 pt-4 space-y-3.5 font-sans">
                  <div className="flex justify-between items-center">
                    <div>
                      <label className="block text-xs uppercase text-gold font-bold tracking-wider flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">palette</span>
                        Available Color Variants ({ (newInvItem.colors || []).length })
                      </label>
                      <p className="text-[11px] text-muted">Add color variants (e.g. Black, Brown, Red) and upload specific photos for each color.</p>
                    </div>
                  </div>

                  {/* List of Configured Color Variants Cards */}
                  <div className="space-y-3">
                    {(newInvItem.colors || []).map((color, colorIdx) => {
                      const variantPhotos = color.image_urls || (color.image_url ? [color.image_url] : []);
                      const currentPrimary = color.image_url || variantPhotos[0] || '';

                      return (
                        <div key={colorIdx} className="bg-background/80 border border-gold/25 rounded-lg p-3.5 space-y-3 shadow-md">
                          {/* Variant Header: Color Name, Hex Dot & Remove */}
                          <div className="flex items-center justify-between border-b border-gold/15 pb-2">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-4 h-4 rounded-full border border-white/30 shrink-0 shadow"
                                style={{ backgroundColor: color.hex || '#000000' }}
                              />
                              <span className="font-bold text-sm text-ivory">{color.name}</span>
                              <span className="text-[10px] font-mono text-muted uppercase bg-charcoal px-2 py-0.5 rounded border border-gold/10">
                                {color.hex || '#000000'}
                              </span>
                              <span className="text-[10px] font-sans text-gold/80 bg-gold/10 px-2 py-0.5 rounded-full border border-gold/20 font-bold">
                                {variantPhotos.length} Photo{variantPhotos.length !== 1 ? 's' : ''}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...(newInvItem.colors || [])];
                                updated.splice(colorIdx, 1);
                                setNewInvItem(prev => ({ ...prev, colors: updated }));
                              }}
                              className="p-1 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded transition flex items-center gap-1 text-xs"
                              title="Remove Color Variant"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                              <span className="text-[10px] uppercase font-bold">Remove</span>
                            </button>
                          </div>

                          {/* Per-Variant Photos Gallery */}
                          <div>
                            <p className="text-[10px] uppercase text-muted tracking-wider font-semibold mb-2 flex items-center justify-between">
                              <span>Photos for <strong className="text-gold">{color.name}</strong> Variant:</span>
                              <span className="text-[9px] text-gold/70">First photo automatically becomes thumbnail for this color</span>
                            </p>

                            <div className="flex flex-wrap gap-2 mb-2.5">
                              {variantPhotos.map((photoUrl, pIdx) => {
                                const isCover = currentPrimary === photoUrl;
                                return (
                                  <div key={pIdx} className="relative w-16 h-16 rounded border border-gold/30 bg-charcoal overflow-hidden group shadow">
                                    <img src={photoUrl} alt={`${color.name} ${pIdx}`} className="w-full h-full object-cover" />
                                    {isCover && (
                                      <span className="absolute bottom-0 inset-x-0 bg-gold text-background font-extrabold text-[8px] uppercase text-center py-0.2 font-sans">
                                        COVER
                                      </span>
                                    )}
                                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition duration-200">
                                      <button
                                        type="button"
                                        onClick={() => handleSetPrimaryColorVariantPhoto(false, colorIdx, photoUrl)}
                                        className="p-1 text-gold hover:text-white"
                                        title="Set as Thumbnail Cover for this Color"
                                      >
                                        <span className="material-symbols-outlined text-xs">star</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveColorVariantPhoto(false, colorIdx, pIdx)}
                                        className="p-1 text-red-400 hover:text-red-300"
                                        title="Delete Photo"
                                      >
                                        <span className="material-symbols-outlined text-xs">delete</span>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}

                              {variantPhotos.length === 0 && (
                                <p className="text-xs text-amber-300/80 italic py-1">No photos added for {color.name} yet. Upload or paste image URL below.</p>
                              )}
                            </div>

                            {/* Upload Controls for this specific Color Variant */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <label className="flex items-center justify-center gap-1.5 px-3 py-2 bg-charcoal border border-dashed border-gold/40 hover:border-gold hover:bg-gold/10 text-gold text-xs uppercase font-bold tracking-wider rounded cursor-pointer transition min-h-[36px]">
                                <span className="material-symbols-outlined text-sm">{isUploadingInvImage ? 'sync' : 'add_a_photo'}</span>
                                <span className="text-[11px]">Upload Photo for {color.name}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  disabled={isUploadingInvImage}
                                  onChange={(e) => handleColorVariantImageUpload(e, false, colorIdx)}
                                  className="hidden"
                                />
                              </label>

                              <ColorVariantUrlInput
                                colorName={color.name}
                                onAdd={(url) => handleAddColorVariantImageUrl(false, colorIdx, url)}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {(newInvItem.colors || []).length === 0 && (
                      <p className="text-xs text-muted/60 italic p-3 bg-background/50 rounded border border-dashed border-gold/15 text-center">
                        No color variants added yet. Add a color variant below.
                      </p>
                    )}
                  </div>

                  {/* Add New Color Variant Row */}
                  <div className="bg-background/40 p-3 rounded-lg border border-gold/20 space-y-2">
                    <p className="text-xs font-bold text-gold uppercase tracking-wider">Add New Color Variant</p>
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <input
                        type="text"
                        placeholder="Color Name (e.g. NY White, Black, Brown, Red)"
                        value={colorNameInput}
                        onChange={(e) => setColorNameInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddColorOption(false);
                          }
                        }}
                        className="flex-1 bg-background border border-gold/25 p-2.5 rounded text-xs text-ivory outline-none focus:border-gold min-h-[40px]"
                      />
                      <div className="flex items-center gap-1.5 bg-background border border-gold/25 p-1 rounded min-h-[40px] shrink-0">
                        <input
                          type="color"
                          value={colorHexInput || '#000000'}
                          onChange={(e) => setColorHexInput(e.target.value)}
                          className="w-7 h-7 rounded border-0 cursor-pointer bg-transparent"
                          title="Pick Color Swatch"
                        />
                        <span className="text-[10px] font-mono text-muted uppercase pr-2">{colorHexInput || '#000000'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddColorOption(false)}
                        className="px-4 py-2.5 bg-gold hover:bg-gold-light text-background font-bold text-xs uppercase tracking-wider rounded transition cursor-pointer min-h-[40px] shrink-0"
                      >
                        Add Variant
                      </button>
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
                      value={editingInvItem.price || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditingInvItem({ ...editingInvItem, price: val === '' ? 0 : parseFloat(val) || 0 });
                      }}
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
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditingInvItem({ ...editingInvItem, cost_price: val === '' ? 0 : parseFloat(val) || 0 });
                      }}
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

                {/* MULTIPLE ITEM PHOTOS / GALLERY */}
                <div className="border-t border-gold/15 pt-4 space-y-3 font-sans">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs uppercase text-gold font-bold tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">photo_camera</span>
                      Item Photo Gallery ({ (editingInvItem.image_urls || []).length })
                    </label>
                    <span className="text-[10px] text-muted">First image is set as primary cover</span>
                  </div>

                  {/* Gallery Grid */}
                  <div className="flex flex-wrap gap-2.5">
                    {(editingInvItem.image_urls || []).map((imgUrl, imgIdx) => (
                      <div key={imgIdx} className="relative w-20 h-20 rounded border border-gold/30 bg-background overflow-hidden group shadow">
                        <img src={imgUrl} alt={`Gallery ${imgIdx}`} className="w-full h-full object-cover" />
                        {editingInvItem.image_url === imgUrl && (
                          <span className="absolute bottom-0 inset-x-0 bg-gold text-background font-extrabold text-[9px] uppercase text-center py-0.5 font-sans">
                            Primary
                          </span>
                        )}
                        <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition duration-200">
                          <button
                            type="button"
                            onClick={() => setEditingInvItem(prev => prev ? { ...prev, image_url: imgUrl } : null)}
                            className="p-1 text-gold hover:text-white"
                            title="Set as Primary Cover"
                          >
                            <span className="material-symbols-outlined text-sm">star</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...(editingInvItem.image_urls || [])];
                              updated.splice(imgIdx, 1);
                              setEditingInvItem(prev => prev ? {
                                ...prev,
                                image_urls: updated,
                                image_url: prev.image_url === imgUrl ? (updated[0] || '') : prev.image_url
                              } : null);
                            }}
                            className="p-1 text-red-400 hover:text-red-300"
                            title="Remove Photo"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}

                    {(editingInvItem.image_urls || []).length === 0 && editingInvItem.image_url && (
                      <div className="relative w-20 h-20 rounded border border-gold/30 bg-background overflow-hidden shadow">
                        <img src={editingInvItem.image_url} alt="Cover" className="w-full h-full object-cover" />
                        <span className="absolute bottom-0 inset-x-0 bg-gold text-background font-extrabold text-[9px] uppercase text-center py-0.5 font-sans">
                          Primary
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Upload File & URL Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="flex items-center justify-center gap-2 px-3 py-2.5 bg-background border border-dashed border-gold/40 hover:border-gold hover:bg-gold/10 text-gold text-xs uppercase font-bold tracking-wider rounded cursor-pointer transition min-h-[44px]">
                      <span className="material-symbols-outlined text-base">{isUploadingInvImage ? 'sync' : 'cloud_upload'}</span>
                      <span>{isUploadingInvImage ? 'Uploading…' : 'Upload Image File'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingInvImage}
                        onChange={(e) => handleInvItemImageUpload(e, true)}
                        className="hidden"
                      />
                    </label>

                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Paste Image URL..."
                        value={invUrlInput}
                        onChange={(e) => setInvUrlInput(e.target.value)}
                        className="flex-1 bg-background border border-gold/25 p-2.5 rounded text-xs text-ivory outline-none focus:border-gold min-h-[44px]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!invUrlInput.trim()) return;
                          const url = invUrlInput.trim();
                          setEditingInvItem(prev => {
                            if (!prev) return null;
                            const current = prev.image_urls || [];
                            return {
                              ...prev,
                              image_url: prev.image_url || url,
                              image_urls: [...current, url],
                            };
                          });
                          setInvUrlInput('');
                        }}
                        className="px-4 py-2.5 bg-gold/15 hover:bg-gold hover:text-background border border-gold/30 text-gold text-xs font-bold uppercase rounded transition min-h-[44px]"
                      >
                        Add Photo
                      </button>
                    </div>
                  </div>
                </div>

                {/* AVAILABLE ITEM COLOR VARIANTS (WITH PER-VARIANT IMAGES) */}
                <div className="border-t border-gold/15 pt-4 space-y-3.5 font-sans">
                  <div className="flex justify-between items-center">
                    <div>
                      <label className="block text-xs uppercase text-gold font-bold tracking-wider flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">palette</span>
                        Available Color Variants ({ (editingInvItem.colors || []).length })
                      </label>
                      <p className="text-[11px] text-muted">Add color variants (e.g. Black, Brown, Red) and upload specific photos for each color.</p>
                    </div>
                  </div>

                  {/* List of Configured Color Variants Cards */}
                  <div className="space-y-3">
                    {(editingInvItem.colors || []).map((color, colorIdx) => {
                      const variantPhotos = color.image_urls || (color.image_url ? [color.image_url] : []);
                      const currentPrimary = color.image_url || variantPhotos[0] || '';

                      return (
                        <div key={colorIdx} className="bg-background/80 border border-gold/25 rounded-lg p-3.5 space-y-3 shadow-md">
                          {/* Variant Header: Color Name, Hex Dot & Remove */}
                          <div className="flex items-center justify-between border-b border-gold/15 pb-2">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-4 h-4 rounded-full border border-white/30 shrink-0 shadow"
                                style={{ backgroundColor: color.hex || '#000000' }}
                              />
                              <span className="font-bold text-sm text-ivory">{color.name}</span>
                              <span className="text-[10px] font-mono text-muted uppercase bg-charcoal px-2 py-0.5 rounded border border-gold/10">
                                {color.hex || '#000000'}
                              </span>
                              <span className="text-[10px] font-sans text-gold/80 bg-gold/10 px-2 py-0.5 rounded-full border border-gold/20 font-bold">
                                {variantPhotos.length} Photo{variantPhotos.length !== 1 ? 's' : ''}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...(editingInvItem.colors || [])];
                                updated.splice(colorIdx, 1);
                                setEditingInvItem(prev => prev ? { ...prev, colors: updated } : null);
                              }}
                              className="p-1 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded transition flex items-center gap-1 text-xs"
                              title="Remove Color Variant"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                              <span className="text-[10px] uppercase font-bold">Remove</span>
                            </button>
                          </div>

                          {/* Per-Variant Photos Gallery */}
                          <div>
                            <p className="text-[10px] uppercase text-muted tracking-wider font-semibold mb-2 flex items-center justify-between">
                              <span>Photos for <strong className="text-gold">{color.name}</strong> Variant:</span>
                              <span className="text-[9px] text-gold/70">First photo automatically becomes thumbnail for this color</span>
                            </p>

                            <div className="flex flex-wrap gap-2 mb-2.5">
                              {variantPhotos.map((photoUrl, pIdx) => {
                                const isCover = currentPrimary === photoUrl;
                                return (
                                  <div key={pIdx} className="relative w-16 h-16 rounded border border-gold/30 bg-charcoal overflow-hidden group shadow">
                                    <img src={photoUrl} alt={`${color.name} ${pIdx}`} className="w-full h-full object-cover" />
                                    {isCover && (
                                      <span className="absolute bottom-0 inset-x-0 bg-gold text-background font-extrabold text-[8px] uppercase text-center py-0.2 font-sans">
                                        COVER
                                      </span>
                                    )}
                                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition duration-200">
                                      <button
                                        type="button"
                                        onClick={() => handleSetPrimaryColorVariantPhoto(true, colorIdx, photoUrl)}
                                        className="p-1 text-gold hover:text-white"
                                        title="Set as Thumbnail Cover for this Color"
                                      >
                                        <span className="material-symbols-outlined text-xs">star</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveColorVariantPhoto(true, colorIdx, pIdx)}
                                        className="p-1 text-red-400 hover:text-red-300"
                                        title="Delete Photo"
                                      >
                                        <span className="material-symbols-outlined text-xs">delete</span>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}

                              {variantPhotos.length === 0 && (
                                <p className="text-xs text-amber-300/80 italic py-1">No photos added for {color.name} yet. Upload or paste image URL below.</p>
                              )}
                            </div>

                            {/* Upload Controls for this specific Color Variant */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <label className="flex items-center justify-center gap-1.5 px-3 py-2 bg-charcoal border border-dashed border-gold/40 hover:border-gold hover:bg-gold/10 text-gold text-xs uppercase font-bold tracking-wider rounded cursor-pointer transition min-h-[36px]">
                                <span className="material-symbols-outlined text-sm">{isUploadingInvImage ? 'sync' : 'add_a_photo'}</span>
                                <span className="text-[11px]">Upload Photo for {color.name}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  disabled={isUploadingInvImage}
                                  onChange={(e) => handleColorVariantImageUpload(e, true, colorIdx)}
                                  className="hidden"
                                />
                              </label>

                              <ColorVariantUrlInput
                                colorName={color.name}
                                onAdd={(url) => handleAddColorVariantImageUrl(true, colorIdx, url)}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {(editingInvItem.colors || []).length === 0 && (
                      <p className="text-xs text-muted/60 italic p-3 bg-background/50 rounded border border-dashed border-gold/15 text-center">
                        No color variants added yet. Add a color variant below.
                      </p>
                    )}
                  </div>

                  {/* Add New Color Variant Row */}
                  <div className="bg-background/40 p-3 rounded-lg border border-gold/20 space-y-2">
                    <p className="text-xs font-bold text-gold uppercase tracking-wider">Add New Color Variant</p>
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <input
                        type="text"
                        placeholder="Color Name (e.g. NY White, Black, Brown, Red)"
                        value={colorNameInput}
                        onChange={(e) => setColorNameInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddColorOption(true);
                          }
                        }}
                        className="flex-1 bg-background border border-gold/25 p-2.5 rounded text-xs text-ivory outline-none focus:border-gold min-h-[40px]"
                      />
                      <div className="flex items-center gap-1.5 bg-background border border-gold/25 p-1 rounded min-h-[40px] shrink-0">
                        <input
                          type="color"
                          value={colorHexInput || '#000000'}
                          onChange={(e) => setColorHexInput(e.target.value)}
                          className="w-7 h-7 rounded border-0 cursor-pointer bg-transparent"
                          title="Pick Color Swatch"
                        />
                        <span className="text-[10px] font-mono text-muted uppercase pr-2">{colorHexInput || '#000000'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddColorOption(true)}
                        className="px-4 py-2.5 bg-gold hover:bg-gold-light text-background font-bold text-xs uppercase tracking-wider rounded transition cursor-pointer min-h-[40px] shrink-0"
                      >
                        Add Variant
                      </button>
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
        {showStockHistoryDrawer && (() => {
          // Group stockLogs by Order (Order Ref + Customer Name)
          const groupedByOrder = (() => {
            const map = new Map<string, {
              orderRef: string;
              customerName: string;
              timestamp: string;
              type: string;
              isAddition: boolean;
              items: { itemName: string; sku: string; quantity: number }[];
              totalQuantity: number;
            }>();

            for (const log of stockLogs) {
              const refStr = log.reference_order || log.notes || 'Manual Adjustment';

              let orderNum = log.reference_order || '';
              let custName = '';

              const matchCust = refStr.match(/(SG-\d+-\d+)\s*\(([^)]+)\)/);
              if (matchCust) {
                orderNum = matchCust[1];
                custName = matchCust[2];
              } else {
                const matchingOrder = orders.find(o => refStr.includes(o.order_number) || o.order_number === refStr);
                if (matchingOrder) {
                  orderNum = matchingOrder.order_number;
                  custName = matchingOrder.customer_name;
                } else if (refStr.startsWith('SG-')) {
                  orderNum = refStr.split(' ')[0];
                } else {
                  orderNum = refStr;
                }
              }

              const isAddition = log.change_amount > 0 || log.type === 'MANUAL_ADD' || log.type === 'ORDER_RESTORE';
              const groupKey = `${orderNum}_${log.type}_${new Date(log.created_at).toISOString().slice(0, 16)}`;
              const qty = Math.abs(log.change_amount);
              const existing = map.get(groupKey);

              // Resolve human readable item name with multi-stage fallback
              const rawName = log.item_name || (log as any).itemName;
              const invMatch = customInventory.find(i => String(i.id) === String(log.item_id) || (log.sku && i.sku === log.sku));
              const resolvedName = (rawName && rawName.trim() !== '') 
                ? rawName 
                : (invMatch ? invMatch.name : (log.sku ? `Item (${log.sku})` : 'Inventory Item'));

              if (existing) {
                const itemExist = existing.items.find(i => i.itemName === resolvedName || (log.sku && i.sku === log.sku));
                if (itemExist) {
                  itemExist.quantity += qty;
                } else {
                  existing.items.push({ itemName: resolvedName, sku: log.sku, quantity: qty });
                }
                existing.totalQuantity += qty;
              } else {
                map.set(groupKey, {
                  orderRef: orderNum,
                  customerName: custName,
                  timestamp: log.created_at,
                  type: log.type,
                  isAddition,
                  items: [{ itemName: resolvedName, sku: log.sku, quantity: qty }],
                  totalQuantity: qty,
                });
              }
            }

            return Array.from(map.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          })();

          // Aggregate total inventory reduced across all orders
          const totalReducedSummary = (() => {
            const map = new Map<string, { itemName: string; sku: string; totalDeducted: number; totalRestored: number; netReduced: number }>();

            for (const log of stockLogs) {
              if (log.type !== 'ORDER_DEDUCT' && log.type !== 'ORDER_RESTORE') continue;
              const rawName = log.item_name || (log as any).itemName;
              const invMatch = customInventory.find(i => String(i.id) === String(log.item_id) || (log.sku && i.sku === log.sku));
              const resolvedName = (rawName && rawName.trim() !== '') 
                ? rawName 
                : (invMatch ? invMatch.name : (log.sku ? `Item (${log.sku})` : 'Inventory Item'));

              const key = resolvedName;
              const existing = map.get(key) || { itemName: resolvedName, sku: log.sku || '', totalDeducted: 0, totalRestored: 0, netReduced: 0 };
              if (log.type === 'ORDER_DEDUCT') {
                existing.totalDeducted += Math.abs(log.change_amount);
              } else if (log.type === 'ORDER_RESTORE') {
                existing.totalRestored += Math.abs(log.change_amount);
              }
              existing.netReduced = existing.totalDeducted - existing.totalRestored;
              map.set(key, existing);
            }

            return Array.from(map.values()).filter(i => i.totalDeducted > 0);
          })();

          const totalItemsDeductedOverall = totalReducedSummary.reduce((acc, curr) => acc + curr.netReduced, 0);

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 overflow-hidden font-sans">
              <div className="gold-gradient-border bg-charcoal rounded-xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Header & Close Button */}
                <div className="flex justify-between items-start px-4 py-3 sm:px-6 sm:py-4 border-b border-gold/15 shrink-0 bg-charcoal z-10">
                  <div>
                    <h3 className="font-serif text-lg sm:text-2xl text-gold truncate">Stock Audit Movement Logs</h3>
                    <p className="text-[11px] sm:text-xs text-muted font-sans mt-0.5">Order inventory reduction manifest & stock audit log</p>
                  </div>
                  <button
                    onClick={() => setShowStockHistoryDrawer(false)}
                    className="text-muted hover:text-gold transition p-1.5 rounded-full hover:bg-gold/10 material-symbols-outlined"
                  >
                    close
                  </button>
                </div>

                {/* View Switcher Tabs & Overview Banner */}
                <div className="px-4 sm:px-6 py-3 border-b border-gold/15 bg-background/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-1 bg-charcoal p-1 border border-gold/20 rounded">
                    <button
                      type="button"
                      onClick={() => setStockLogTab('BY_ORDER')}
                      className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition flex items-center gap-1.5 ${
                        stockLogTab === 'BY_ORDER'
                          ? 'bg-gold text-background shadow'
                          : 'text-ivory/80 hover:text-gold hover:bg-gold/10'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">receipt_long</span>
                      <span>By Order & Customer</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStockLogTab('BY_ITEM_SUMMARY')}
                      className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition flex items-center gap-1.5 ${
                        stockLogTab === 'BY_ITEM_SUMMARY'
                          ? 'bg-gold text-background shadow'
                          : 'text-ivory/80 hover:text-gold hover:bg-gold/10'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">inventory_2</span>
                      <span>Total Reduced Summary</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStockLogTab('DETAILED_LOGS')}
                      className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition flex items-center gap-1.5 ${
                        stockLogTab === 'DETAILED_LOGS'
                          ? 'bg-gold text-background shadow'
                          : 'text-ivory/80 hover:text-gold hover:bg-gold/10'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">list</span>
                      <span>Raw Item Logs</span>
                    </button>
                  </div>

                  {/* Summary Metric Badge */}
                  <div className="text-[11px] font-sans font-semibold text-gold bg-gold/10 px-3 py-1.5 border border-gold/30 rounded flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">analytics</span>
                    <span>Total Reduced Across Orders: <strong className="text-ivory font-mono text-xs">{totalItemsDeductedOverall} units</strong></span>
                  </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 custom-scrollbar">
                  {stockLogs.length === 0 ? (
                    <div className="bg-background/40 p-8 rounded text-center border border-dashed border-gold/15 text-xs text-muted">
                      No stock adjustment movements recorded yet.
                    </div>
                  ) : stockLogTab === 'BY_ORDER' ? (
                    /* TAB 1: GROUPED BY ORDER & CUSTOMER NAME */
                    <div className="space-y-3">
                      {groupedByOrder.map((group, idx) => (
                        <div key={idx} className="gold-gradient-border bg-charcoal p-4 rounded-lg space-y-2.5 font-sans">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gold/10 pb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-gold">{group.orderRef}</span>
                                {group.customerName && (
                                  <span className="text-xs font-bold text-ivory">
                                    — {group.customerName}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-muted font-mono mt-0.5">
                                Logged: {new Date(group.timestamp).toLocaleString()}
                              </p>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded border ${
                                group.type === 'ORDER_DEDUCT' || group.type === 'MANUAL_SUBTRACT' || (!group.isAddition && group.type === 'MANUAL_SET')
                                  ? 'bg-red-950/60 text-red-300 border-red-500/40'
                                  : group.type === 'ORDER_RESTORE' || group.type === 'MANUAL_ADD' || (group.isAddition && group.type === 'MANUAL_SET')
                                  ? 'bg-green-950/60 text-green-300 border-green-500/40'
                                  : 'bg-blue-950/60 text-blue-300 border-blue-500/40'
                              }`}>
                                {group.type.replace('_', ' ')}
                              </span>

                              <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded border ${
                                group.isAddition
                                  ? 'text-green-400 bg-green-950/30 border-green-500/20'
                                  : 'text-red-400 bg-red-950/30 border-red-500/20'
                              }`}>
                                {group.isAddition ? '+' : '-'}{group.totalQuantity} item{group.totalQuantity !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>

                          {/* Items List */}
                          <div>
                            <p className="text-[10px] uppercase text-gold/80 font-bold tracking-wider mb-1.5">
                              {group.isAddition ? 'Items Added / Stocked to Inventory:' : 'Items Purchased & Reduced from Inventory:'}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 bg-background/60 p-2.5 rounded border border-gold/15 text-xs">
                              {group.items.map((it, itIdx) => (
                                <div key={itIdx} className="flex items-center justify-between gap-2 text-ivory">
                                  <div className="flex items-center gap-1.5 truncate">
                                    <span className="text-gold font-bold text-xs">•</span>
                                    <span className="font-semibold text-ivory truncate">{it.itemName}</span>
                                    {it.sku && <span className="text-[10px] font-mono text-muted">({it.sku})</span>}
                                  </div>
                                  <span className="font-bold text-gold font-mono shrink-0 px-2 py-0.5 bg-gold/10 rounded border border-gold/20">
                                    {it.quantity}x
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}

                      {groupedByOrder.length === 0 && (
                        <div className="p-8 text-center text-xs text-muted border border-dashed border-gold/20 rounded">
                          No stock audit movements found in logs.
                        </div>
                      )}
                    </div>
                  ) : stockLogTab === 'BY_ITEM_SUMMARY' ? (
                    /* TAB 2: TOTAL INVENTORY REDUCED SUMMARY */
                    <div className="space-y-4">
                      <div className="bg-gold/10 p-3 rounded-lg border border-gold/25 text-xs text-ivory leading-relaxed">
                        <p className="font-bold text-gold flex items-center gap-1.5 mb-0.5">
                          <span className="material-symbols-outlined text-sm">info</span>
                          Total Inventory Reduced Summary:
                        </p>
                        Shows total quantity deducted across all confirmed orders for each item in stock.
                      </div>

                      <div className="overflow-x-auto border border-gold/15 rounded">
                        <table className="w-full text-left border-collapse text-xs min-w-[500px]">
                          <thead>
                            <tr className="border-b border-gold/15 text-gold uppercase tracking-wider bg-background/50">
                              <th className="p-3">Item Name</th>
                              <th className="p-3">SKU</th>
                              <th className="p-3">Total Deducted</th>
                              <th className="p-3">Total Restored</th>
                              <th className="p-3 text-right">Net Inventory Reduced</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gold/10 font-sans">
                            {totalReducedSummary.map((item, idx) => (
                              <tr key={idx} className="hover:bg-gold/5 text-ivory">
                                <td className="p-3 font-semibold text-ivory">{item.itemName}</td>
                                <td className="p-3 font-mono text-gold/80">{item.sku}</td>
                                <td className="p-3 font-mono text-red-400 font-bold">-{item.totalDeducted} units</td>
                                <td className="p-3 font-mono text-green-400">+{item.totalRestored} units</td>
                                <td className="p-3 text-right font-mono font-extrabold text-gold text-sm">
                                  -{item.netReduced} {item.netReduced === 1 ? 'unit' : 'units'}
                                </td>
                              </tr>
                            ))}

                            {totalReducedSummary.length === 0 && (
                              <tr>
                                <td colSpan={5} className="p-8 text-center text-muted text-xs font-sans">
                                  No item deductions recorded yet.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    /* TAB 3: RAW ITEM LOGS TABLE */
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
                          {stockLogs.map((log) => {
                            const rawName = log.item_name || (log as any).itemName;
                            const invMatch = customInventory.find(i => String(i.id) === String(log.item_id) || (log.sku && i.sku === log.sku));
                            const resolvedName = (rawName && rawName.trim() !== '')
                              ? rawName
                              : (invMatch ? invMatch.name : (log.sku ? `Item (${log.sku})` : 'Inventory Item'));

                            return (
                              <tr key={log.id} className="hover:bg-gold/5 text-ivory">
                                <td className="p-3 text-muted text-[11px] font-mono">
                                  {new Date(log.created_at).toLocaleString()}
                                </td>
                                <td className="p-3 font-semibold">
                                  <p className="text-ivory font-bold">{resolvedName}</p>
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
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-gold/15 flex justify-end shrink-0 bg-charcoal z-10">
                  <button
                    type="button"
                    onClick={() => setShowStockHistoryDrawer(false)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-gold hover:bg-gold-light text-background font-bold text-xs uppercase tracking-wider rounded min-h-[44px] cursor-pointer"
                  >
                    Close Log History
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-muted mb-1 font-semibold">Base Price (Rs.)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={newProduct.price || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewProduct({ ...newProduct, price: val === '' ? 0 : parseFloat(val) || 0, stock: 9999 });
                      }}
                      className="w-full bg-background border border-gold/25 p-2.5 rounded text-ivory focus:border-gold outline-none font-semibold text-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-muted mb-1 font-semibold">Discount / Old Price (Rs. optional)</label>
                    <input
                      type="number"
                      min="0"
                      value={newProduct.old_price || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewProduct({ ...newProduct, old_price: val === '' ? undefined : parseFloat(val) || undefined });
                      }}
                      className="w-full bg-background border border-gold/25 p-2.5 rounded text-ivory focus:border-gold outline-none"
                    />
                  </div>
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

                  {/* Category Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gold/30">
                    {['All', ...Array.from(new Set(customInventory.map(i => i.category).filter(Boolean)))].map((cat) => {
                      const isActive = boxBuilderCategory === cat;
                      const count = cat === 'All'
                        ? customInventory.filter(i => i.enabled !== false).length
                        : customInventory.filter(i => i.enabled !== false && i.category === cat).length;

                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setBoxBuilderCategory(cat)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-sans font-semibold transition-all duration-200 shrink-0 border flex items-center gap-1 cursor-pointer ${
                            isActive
                              ? 'bg-gold text-background border-gold shadow-xs font-bold'
                              : 'bg-background/70 text-ivory/80 border-gold/25 hover:border-gold/50 hover:text-gold'
                          }`}
                        >
                          <span>{cat}</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                            isActive ? 'bg-background/25 text-background' : 'bg-gold/15 text-gold'
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      placeholder={`Search ${boxBuilderCategory === 'All' ? 'inventory items' : boxBuilderCategory.toLowerCase()}...`}
                      value={boxBuilderSearch}
                      onChange={(e) => setBoxBuilderSearch(e.target.value)}
                      className="w-full bg-background border border-gold/25 text-xs text-ivory pl-8 pr-3 py-2 rounded outline-none focus:border-gold"
                    />
                    <span className="material-symbols-outlined absolute left-2.5 top-2 text-muted text-base">search</span>
                  </div>

                  {/* Scrollable Inventory Selector */}
                  <div className="max-h-56 overflow-y-auto border border-gold/15 rounded bg-background/40 divide-y divide-gold/10 pr-1">
                    {customInventory
                      .filter(item => {
                        if (item.enabled === false) return false;
                        const matchCat = boxBuilderCategory === 'All' || (item.category && item.category.toLowerCase() === boxBuilderCategory.toLowerCase());
                        const matchSearch = !boxBuilderSearch || 
                          item.name.toLowerCase().includes(boxBuilderSearch.toLowerCase()) || 
                          item.sku.toLowerCase().includes(boxBuilderSearch.toLowerCase()) || 
                          item.category.toLowerCase().includes(boxBuilderSearch.toLowerCase());
                        return matchCat && matchSearch;
                      })
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
                  {(() => {
                    const currentNewImages = newProduct.image_urls || [];
                    return (
                      <>
                        <h4 className="text-xs uppercase text-gold font-sans tracking-wide mb-3 font-semibold flex items-center justify-between">
                          <span>Gift Box Presentation Images ({currentNewImages.length})</span>
                          {currentNewImages.length > 0 && (
                            <span className="text-[10px] text-muted font-normal">Click top-right red "✕" to remove image</span>
                          )}
                        </h4>
                        
                        {currentNewImages.length > 0 && (
                          <div className="flex flex-wrap gap-3 mb-4">
                            {currentNewImages.map((img, idx) => (
                              <div key={idx} className="relative w-20 h-20 rounded-lg border border-gold/30 bg-charcoal overflow-hidden group shadow-md">
                                <img src={img} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                                
                                {/* Always-visible Top-Right Delete Button Badge */}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveImage(idx, false)}
                                  className="absolute top-1 right-1 bg-red-950/90 hover:bg-red-700 text-red-200 border border-red-500/60 rounded-full w-5 h-5 flex items-center justify-center transition cursor-pointer z-10 shadow"
                                  title="Remove this image"
                                >
                                  <span className="material-symbols-outlined text-xs font-bold">close</span>
                                </button>

                                {/* Full Overlay on Hover */}
                                <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition duration-200 z-0">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveImage(idx, false)}
                                    className="p-1 px-2 bg-red-600/90 text-white rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow hover:bg-red-700 transition"
                                    title="Delete Photo"
                                  >
                                    <span className="material-symbols-outlined text-xs">delete</span>
                                    <span>Remove</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}

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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-muted mb-1 font-semibold">Base Price (Rs.)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={editingProduct.price || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditingProduct({ ...editingProduct, price: val === '' ? 0 : parseFloat(val) || 0, stock: 9999 });
                      }}
                      className="w-full bg-background border border-gold/25 p-2.5 rounded text-ivory focus:border-gold outline-none font-semibold text-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-muted mb-1 font-semibold">Discount Price (Rs. optional)</label>
                    <input
                      type="number"
                      min="0"
                      value={editingProduct.old_price || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditingProduct({ ...editingProduct, old_price: val === '' ? undefined : parseFloat(val) || undefined });
                      }}
                      className="w-full bg-background border border-gold/25 p-2.5 rounded text-ivory focus:border-gold outline-none"
                    />
                  </div>
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

                  {/* Category Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gold/30">
                    {['All', ...Array.from(new Set(customInventory.map(i => i.category).filter(Boolean)))].map((cat) => {
                      const isActive = boxBuilderCategory === cat;
                      const count = cat === 'All'
                        ? customInventory.filter(i => i.enabled !== false).length
                        : customInventory.filter(i => i.enabled !== false && i.category === cat).length;

                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setBoxBuilderCategory(cat)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-sans font-semibold transition-all duration-200 shrink-0 border flex items-center gap-1 cursor-pointer ${
                            isActive
                              ? 'bg-gold text-background border-gold shadow-xs font-bold'
                              : 'bg-background/70 text-ivory/80 border-gold/25 hover:border-gold/50 hover:text-gold'
                          }`}
                        >
                          <span>{cat}</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                            isActive ? 'bg-background/25 text-background' : 'bg-gold/15 text-gold'
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      placeholder={`Search ${boxBuilderCategory === 'All' ? 'inventory items' : boxBuilderCategory.toLowerCase()}...`}
                      value={boxBuilderSearch}
                      onChange={(e) => setBoxBuilderSearch(e.target.value)}
                      className="w-full bg-background border border-gold/25 text-xs text-ivory pl-8 pr-3 py-2 rounded outline-none focus:border-gold"
                    />
                    <span className="material-symbols-outlined absolute left-2.5 top-2 text-muted text-base">search</span>
                  </div>

                  <div className="max-h-56 overflow-y-auto border border-gold/15 rounded bg-background/40 divide-y divide-gold/10 pr-1">
                    {customInventory
                      .filter(item => {
                        if (item.enabled === false) return false;
                        const matchCat = boxBuilderCategory === 'All' || (item.category && item.category.toLowerCase() === boxBuilderCategory.toLowerCase());
                        const matchSearch = !boxBuilderSearch || 
                          item.name.toLowerCase().includes(boxBuilderSearch.toLowerCase()) || 
                          item.sku.toLowerCase().includes(boxBuilderSearch.toLowerCase()) || 
                          item.category.toLowerCase().includes(boxBuilderSearch.toLowerCase());
                        return matchCat && matchSearch;
                      })
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
                  {(() => {
                    const currentEditingImages = editingProduct.image_urls || [];
                    return (
                      <>
                        <h4 className="text-xs uppercase text-gold font-sans tracking-wide mb-3 font-semibold flex items-center justify-between">
                          <span>Gift Box Images ({currentEditingImages.length})</span>
                          {currentEditingImages.length > 0 && (
                            <span className="text-[10px] text-muted font-normal">Click top-right red "✕" to remove image</span>
                          )}
                        </h4>
                        
                        {currentEditingImages.length > 0 && (
                          <div className="flex flex-wrap gap-3 mb-4">
                            {currentEditingImages.map((img, idx) => (
                              <div key={idx} className="relative w-20 h-20 rounded-lg border border-gold/30 bg-charcoal overflow-hidden group shadow-md">
                                <img src={img} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                                
                                {/* Always-visible Top-Right Delete Button Badge */}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveImage(idx, true)}
                                  className="absolute top-1 right-1 bg-red-950/90 hover:bg-red-700 text-red-200 border border-red-500/60 rounded-full w-5 h-5 flex items-center justify-center transition cursor-pointer z-10 shadow"
                                  title="Remove this image"
                                >
                                  <span className="material-symbols-outlined text-xs font-bold">close</span>
                                </button>

                                {/* Full Overlay on Hover */}
                                <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition duration-200 z-0">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveImage(idx, true)}
                                    className="p-1 px-2 bg-red-600/90 text-white rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow hover:bg-red-700 transition"
                                    title="Delete Photo"
                                  >
                                    <span className="material-symbols-outlined text-xs">delete</span>
                                    <span>Remove</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}

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
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleDeleteOrder(selectedOrder)}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-300 font-semibold text-xs font-sans uppercase tracking-wider transition min-h-[44px] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm font-bold">delete</span>
                    Delete Order
                  </button>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="flex-1 sm:flex-none px-5 py-2.5 bg-gold hover:bg-gold-light text-background font-semibold text-xs font-sans uppercase tracking-wider transition min-h-[44px] cursor-pointer"
                  >
                    Close Summary
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* MODAL: ADD CLIENT REVIEWS (MULTI-IMAGE BATCH UPLOAD) */}
      {isAddingReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 overflow-hidden">
          <div className="gold-gradient-border bg-charcoal rounded-xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center px-4 py-3 sm:px-6 sm:py-4 border-b border-gold/15 shrink-0 bg-charcoal z-10">
              <div>
                <h3 className="font-serif text-lg sm:text-2xl text-gold truncate">Add Client Review Images</h3>
                <p className="text-[11px] sm:text-xs text-muted font-sans mt-0.5">Upload multiple review screenshots at once</p>
              </div>
              <button
                onClick={() => { setIsAddingReview(false); setNewReviewImages([]); setReviewUrlInput(''); }}
                className="text-muted hover:text-gold transition p-1.5 rounded-full hover:bg-gold/10 material-symbols-outlined"
              >
                close
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-sm text-ivory custom-scrollbar">
              {/* Main Upload Dropzone / Button */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-gold font-sans font-bold mb-2 flex items-center justify-between">
                  <span>Choose Screenshot Images (Select Multiple Files)</span>
                  <span className="text-[10px] text-muted font-normal font-sans">Multi-file picker active</span>
                </label>
                
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-gold/30 hover:border-gold bg-background/50 p-6 rounded-lg cursor-pointer transition-all duration-200 group min-h-[110px] text-center">
                  <span className="material-symbols-outlined text-3xl text-gold group-hover:scale-110 transition-transform mb-1">
                    {isUploadingReviewImage ? 'sync' : 'add_photo_alternate'}
                  </span>
                  
                  <span className="text-xs text-gold uppercase font-sans tracking-wider font-extrabold">
                    {isUploadingReviewImage 
                      ? `Uploading Image ${reviewProgress?.current || 1} of ${reviewProgress?.total || 1}…` 
                      : 'CLICK TO SELECT MULTIPLE REVIEW SCREENSHOTS'}
                  </span>

                  <span className="text-[11px] text-muted font-sans mt-1">
                    Hold <kbd className="px-1 bg-gold/10 border border-gold/30 rounded text-[10px] text-gold font-mono">Ctrl</kbd> or <kbd className="px-1 bg-gold/10 border border-gold/30 rounded text-[10px] text-gold font-mono">Shift</kbd> in file window to select multiple photos at once
                  </span>

                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={isUploadingReviewImage}
                    onChange={handleReviewImagesUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Progress Bar while uploading */}
              {isUploadingReviewImage && reviewProgress && (
                <div className="bg-background/80 p-3 rounded-lg border border-gold/25 space-y-2 font-sans">
                  <div className="flex justify-between text-xs font-mono text-gold">
                    <span>Uploading reviews to Supabase Storage…</span>
                    <span>{reviewProgress.current} / {reviewProgress.total} ({Math.round((reviewProgress.current / reviewProgress.total) * 100)}%)</span>
                  </div>
                  <div className="w-full bg-charcoal h-2 rounded-full overflow-hidden border border-gold/20">
                    <div 
                      className="bg-gold h-full transition-all duration-300 rounded-full"
                      style={{ width: `${(reviewProgress.current / reviewProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Queued Images Gallery Preview */}
              {newReviewImages.length > 0 && (
                <div className="space-y-2.5 border-t border-gold/15 pt-4 font-sans">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gold uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">collections</span>
                      Queued Reviews ({newReviewImages.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setNewReviewImages([])}
                      className="text-[10px] text-red-400 hover:text-red-300 uppercase font-bold tracking-wider"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-48 overflow-y-auto p-2 bg-background/50 rounded-lg border border-gold/15 custom-scrollbar">
                    {newReviewImages.map((imgUrl, imgIdx) => (
                      <div key={imgIdx} className="relative group aspect-square rounded border border-gold/20 overflow-hidden bg-charcoal shadow">
                        <img src={imgUrl} alt={`Review Preview ${imgIdx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveQueuedReviewImage(imgIdx)}
                          className="absolute top-1 right-1 p-1 bg-black/80 text-red-400 hover:text-red-200 rounded-full transition opacity-90 group-hover:opacity-100"
                          title="Remove Image"
                        >
                          <span className="material-symbols-outlined text-xs block">close</span>
                        </button>
                        <span className="absolute bottom-1 left-1 px-1 bg-black/70 text-gold font-mono text-[9px] rounded">
                          #{imgIdx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Or Paste Image URLs */}
              <div className="space-y-2 border-t border-gold/15 pt-4 font-sans">
                <label className="block text-xs uppercase tracking-wider text-muted font-semibold">Or Paste Image URL(s)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={reviewUrlInput}
                    onChange={(e) => setReviewUrlInput(e.target.value)}
                    placeholder="https://example.com/screenshot.jpg (separate multiple with commas)"
                    className="flex-1 bg-background border border-gold/25 p-2.5 rounded text-xs text-ivory focus:border-gold outline-none min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={handleAddReviewUrl}
                    className="px-3.5 py-2.5 bg-gold/15 hover:bg-gold hover:text-background border border-gold/30 text-gold font-bold text-xs uppercase tracking-wider rounded transition min-h-[44px] shrink-0"
                  >
                    Add URL
                  </button>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="pt-4 border-t border-gold/15 flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => { setIsAddingReview(false); setNewReviewImages([]); setReviewUrlInput(''); }}
                  className="w-full sm:w-auto px-5 py-3 border border-gold/30 hover:border-gold hover:text-gold text-xs font-sans uppercase tracking-wider transition rounded min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isUploadingReviewImage || (newReviewImages.length === 0 && !reviewUrlInput.trim())}
                  onClick={(e) => handleReviewSubmit(e)}
                  className="w-full sm:w-auto px-6 py-3 bg-gold hover:bg-gold-light disabled:opacity-50 text-background font-bold text-xs font-sans uppercase tracking-wider transition cursor-pointer min-h-[44px] flex items-center justify-center gap-2 shadow-gold-glow"
                >
                  <span className="material-symbols-outlined text-base font-bold">done_all</span>
                  Save {newReviewImages.length > 0 ? `${newReviewImages.length} ` : ''}Review{newReviewImages.length > 1 ? 's' : ''}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
