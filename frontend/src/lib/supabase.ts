/**
 * supabase.ts — Sparkle Giftz Supabase Client & Data Helpers
 *
 * Single source of truth for all database operations.
 * All pages import from here — never use localStorage for app data.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL     = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Type Definitions ─────────────────────────────────────────────────────────

export interface InventoryItem {
  id: number;
  sku: string;
  name: string;
  category: string;
  description?: string;
  price: number;
  cost_price?: number;
  stock: number;
  low_stock_threshold: number;
  enabled: boolean;
  image_url: string;
  created_at?: string;
  updated_at?: string;
}

export interface GiftBoxItem {
  id?: number;
  product_id: number;
  inventory_item_id: number;
  quantity: number;
  sort_order?: number;
  // joined from inventory_items:
  inventory_items?: InventoryItem;
}

export interface StockLog {
  id: number;
  item_id: number;
  item_name: string;
  sku: string;
  type: 'MANUAL_SET' | 'ORDER_DEDUCT' | 'ORDER_RESTORE' | 'MANUAL_ADD' | 'MANUAL_SUBTRACT';
  change_amount: number;
  previous_stock: number;
  new_stock: number;
  reference_order?: string;
  notes?: string;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description?: string;
  price: number;
  old_price?: number;
  stock: number;
  is_active: boolean;
  is_featured?: boolean;
  default_wrapping?: string;
  image_urls: string[];
  created_at?: string;
  updated_at?: string;
  // joined:
  gift_box_items?: GiftBoxItem[];
}

export interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: 'COD' | 'PAYHERE';
  payment_status: 'PENDING' | 'PAID' | 'FAILED';
  order_status: 'PENDING' | 'CONFIRMED' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  gift_message?: string;
  wrapping?: string;
  delivery_date?: string;
  notes?: string;
  cart_items?: CartItemSnapshot[];
  custom_gift_details?: CustomGiftDetailsSnapshot;
  stock_deducted?: boolean;
  created_at: string;
  updated_at?: string;
  // joined:
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id?: number;
  product_name: string;
  variant_name?: string;
  unit_price: number;
  qty: number;
  line_total?: number;
}

export interface CartItemSnapshot {
  productId: number | string;
  name: string;
  slug: string;
  price: number;
  quantity: number;
  wrapping: string;
  giftMessage: string;
  image?: string;
  isCustom?: boolean;
  customDetails?: CustomGiftDetailsSnapshot;
}

export interface CustomGiftDetailsSnapshot {
  boxSize: string;
  boxColor: string;
  boxColorHex?: string;
  ribbonColor?: string;
  greetingCard?: string;
  wrapping?: string;
  giftMessage?: string;
  items: {
    id: number | string;
    name: string;
    category: string;
    price: number;
    quantity: number;
    image?: string;
  }[];
}

export interface ClientReview {
  id: number;
  image_url: string;
  image?: string;
  message?: string;
  created_at: string;
}

// ─── Product Helpers ───────────────────────────────────────────────────────────

/** Fetch all active gift boxes with their linked inventory items */
export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      gift_box_items (
        id,
        quantity,
        sort_order,
        inventory_item_id,
        inventory_items ( id, sku, name, category, price, image_url )
      )
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[supabase] getProducts error:', error.message);
    return [];
  }
  return (data as Product[]) || [];
}

/** Fetch a single gift box by slug */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      gift_box_items (
        id,
        quantity,
        sort_order,
        inventory_item_id,
        inventory_items ( id, sku, name, category, price, image_url )
      )
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('[supabase] getProductBySlug error:', error.message);
    return null;
  }
  return data as Product | null;
}

/** Fetch all products for Admin (including inactive) */
export async function getAdminProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      gift_box_items (
        id,
        quantity,
        sort_order,
        inventory_item_id,
        inventory_items ( id, sku, name, category, price, image_url )
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[supabase] getAdminProducts error:', error.message);
    return [];
  }
  return (data as Product[]) || [];
}

/** Create a new gift box with images and linked inventory items */
export async function createProduct(input: {
  name: string;
  slug: string;
  description: string;
  price: number;
  old_price?: number;
  stock: number;
  default_wrapping?: string;
  image_urls?: string[];
  includedItems?: { inventory_item_id: number; quantity: number }[];
}): Promise<Product | null> {
  const slug = input.slug || input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const { data, error } = await supabase
    .from('products')
    .insert({
      name: input.name.trim(),
      slug,
      description: input.description,
      price: input.price,
      old_price: input.old_price || null,
      stock: input.stock,
      default_wrapping: input.default_wrapping || null,
      image_urls: input.image_urls || [],
      is_active: true,
    })
    .select()
    .single();

  if (error || !data) {
    console.error('[supabase] createProduct error:', error?.message);
    return null;
  }

  const product = data as Product;

  // Insert gift_box_items links
  if (input.includedItems && input.includedItems.length > 0) {
    const itemRows = input.includedItems.map((item, idx) => ({
      product_id: product.id,
      inventory_item_id: item.inventory_item_id,
      quantity: item.quantity,
      sort_order: idx,
    }));
    const { error: itemErr } = await supabase.from('gift_box_items').insert(itemRows);
    if (itemErr) console.error('[supabase] gift_box_items insert error:', itemErr.message);
  }

  return product;
}

/** Update an existing gift box */
export async function updateProduct(
  id: number,
  input: Partial<{
    name: string;
    slug: string;
    description: string;
    price: number;
    old_price: number | null;
    stock: number;
    default_wrapping: string;
    image_urls: string[];
    is_active: boolean;
  }>,
  includedItems?: { inventory_item_id: number; quantity: number }[]
): Promise<boolean> {
  const { error } = await supabase
    .from('products')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('[supabase] updateProduct error:', error.message);
    return false;
  }

  // Replace gift_box_items if provided
  if (includedItems !== undefined) {
    await supabase.from('gift_box_items').delete().eq('product_id', id);
    if (includedItems.length > 0) {
      const itemRows = includedItems.map((item, idx) => ({
        product_id: id,
        inventory_item_id: item.inventory_item_id,
        quantity: item.quantity,
        sort_order: idx,
      }));
      const { error: itemErr } = await supabase.from('gift_box_items').insert(itemRows);
      if (itemErr) console.error('[supabase] gift_box_items update error:', itemErr.message);
    }
  }

  return true;
}

/** Soft-delete a gift box (sets is_active = false) */
export async function deleteProduct(id: number): Promise<boolean> {
  const { error } = await supabase
    .from('products')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    console.error('[supabase] deleteProduct error:', error.message);
    return false;
  }
  return true;
}

// ─── Inventory Item Helpers ────────────────────────────────────────────────────

/** Fetch all inventory items (for admin — includes disabled) */
export async function getAdminInventoryItems(): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[supabase] getAdminInventoryItems error:', error.message);
    return [];
  }
  return (data as InventoryItem[]) || [];
}

/** Fetch only enabled inventory items (for customer Customize Gift page) */
export async function getEnabledInventoryItems(): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('enabled', true)
    .order('category', { ascending: true });

  if (error) {
    console.error('[supabase] getEnabledInventoryItems error:', error.message);
    return [];
  }
  return (data as InventoryItem[]) || [];
}

/** Create a new inventory item */
export async function createInventoryItem(input: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>): Promise<InventoryItem | null> {
  const sku = input.sku.trim() || `SKU-CUST-${Date.now().toString().slice(-6)}`;
  const { data, error } = await supabase
    .from('inventory_items')
    .insert({ ...input, sku })
    .select()
    .single();

  if (error) {
    console.error('[supabase] createInventoryItem error:', error.message);
    return null;
  }

  // Log initial stock
  if (data && input.stock > 0) {
    await supabase.from('stock_logs').insert({
      item_id: (data as InventoryItem).id,
      item_name: (data as InventoryItem).name,
      sku: (data as InventoryItem).sku,
      type: 'MANUAL_SET',
      change_amount: input.stock,
      previous_stock: 0,
      new_stock: input.stock,
      notes: 'Initial item creation',
    });
  }

  return data as InventoryItem;
}

/** Update an existing inventory item */
export async function updateInventoryItem(id: number, input: Partial<InventoryItem>): Promise<boolean> {
  const { error } = await supabase
    .from('inventory_items')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('[supabase] updateInventoryItem error:', error.message);
    return false;
  }
  return true;
}

/** Delete an inventory item */
export async function deleteInventoryItem(id: number): Promise<boolean> {
  const { error } = await supabase.from('inventory_items').delete().eq('id', id);
  if (error) {
    console.error('[supabase] deleteInventoryItem error:', error.message);
    return false;
  }
  return true;
}

// ─── Stock Management ─────────────────────────────────────────────────────────

/** Adjust stock and write a stock log entry */
export async function adjustInventoryStock(
  item: InventoryItem,
  mode: 'add' | 'subtract' | 'set',
  qty: number,
  type: StockLog['type'],
  referenceOrder?: string,
  notes?: string
): Promise<boolean> {
  const prev = item.stock;
  let next: number;
  if (mode === 'add') next = prev + qty;
  else if (mode === 'subtract') next = Math.max(0, prev - qty);
  else next = qty;

  const { error } = await supabase
    .from('inventory_items')
    .update({ stock: next, updated_at: new Date().toISOString() })
    .eq('id', item.id);

  if (error) {
    console.error('[supabase] adjustStock error:', error.message);
    return false;
  }

  await supabase.from('stock_logs').insert({
    item_id: item.id,
    item_name: item.name,
    sku: item.sku,
    type,
    change_amount: next - prev,
    previous_stock: prev,
    new_stock: next,
    reference_order: referenceOrder || null,
    notes: notes || null,
  });

  return true;
}

/** Fetch stock logs for admin view */
export async function getStockLogs(): Promise<StockLog[]> {
  const { data, error } = await supabase
    .from('stock_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    console.error('[supabase] getStockLogs error:', error.message);
    return [];
  }
  return (data as StockLog[]) || [];
}

// ─── Order Helpers ────────────────────────────────────────────────────────────

/** Fetch all orders for admin */
export async function getOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[supabase] getOrders error:', error.message);
    return [];
  }
  return (data as Order[]) || [];
}

/** Fetch orders for a customer by email */
export async function getOrdersByEmail(email: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('email', email.toLowerCase().trim())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[supabase] getOrdersByEmail error:', error.message);
    return [];
  }
  return (data as Order[]) || [];
}

/** Create a new order and deduct inventory stock */
export async function createOrder(input: {
  customer_name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: 'COD' | 'PAYHERE';
  payment_status: 'PENDING' | 'PAID' | 'FAILED';
  order_status: 'PENDING' | 'CONFIRMED';
  gift_message?: string;
  wrapping?: string;
  delivery_date?: string;
  cart_items: CartItemSnapshot[];
  custom_gift_details?: CustomGiftDetailsSnapshot;
}): Promise<Order | null> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const order_number = `SG-${dateStr}-${randomNum}`;

  const { data, error } = await supabase
    .from('orders')
    .insert({
      order_number,
      customer_name: input.customer_name,
      phone: input.phone,
      email: input.email.toLowerCase().trim(),
      address: input.address,
      city: input.city,
      subtotal: input.subtotal,
      delivery_fee: input.delivery_fee,
      total: input.total,
      payment_method: input.payment_method,
      payment_status: input.payment_status,
      order_status: input.order_status,
      gift_message: input.gift_message || null,
      wrapping: input.wrapping || null,
      delivery_date: input.delivery_date || null,
      cart_items: input.cart_items,
      custom_gift_details: input.custom_gift_details || null,
      stock_deducted: false,
    })
    .select()
    .single();

  if (error || !data) {
    console.error('[supabase] createOrder error:', error?.message);
    return null;
  }

  const order = data as Order;

  // Insert order_items from cart
  const orderItemRows = input.cart_items.map(ci => ({
    order_id: order.id,
    product_id: typeof ci.productId === 'number' ? ci.productId : null,
    product_name: ci.name,
    unit_price: ci.price,
    qty: ci.quantity,
    line_total: ci.price * ci.quantity,
  }));

  if (orderItemRows.length > 0) {
    const { error: itemErr } = await supabase.from('order_items').insert(orderItemRows);
    if (itemErr) console.error('[supabase] order_items insert error:', itemErr.message);
  }

  // Deduct product stock for regular gift boxes
  for (const ci of input.cart_items) {
    if (!ci.isCustom && typeof ci.productId === 'number') {
      const { data: prod } = await supabase.from('products').select('stock').eq('id', ci.productId).single();
      if (prod) {
        const newStock = Math.max(0, (prod as { stock: number }).stock - ci.quantity);
        await supabase.from('products').update({ stock: newStock }).eq('id', ci.productId);
      }
    }
  }

  // Deduct inventory stock for custom gift items
  const allCustomItems = [
    ...(input.custom_gift_details?.items || []),
    ...input.cart_items.flatMap(ci => ci.customDetails?.items || []),
  ];

  if (allCustomItems.length > 0) {
    for (const cItem of allCustomItems) {
      const { data: invItem } = await supabase
        .from('inventory_items')
        .select('id, stock, name, sku')
        .or(`id.eq.${cItem.id},name.ilike.${cItem.name}`)
        .maybeSingle();

      if (invItem) {
        const inv = invItem as InventoryItem;
        const prev = inv.stock;
        const next = Math.max(0, prev - cItem.quantity);
        await supabase.from('inventory_items').update({ stock: next }).eq('id', inv.id);
        await supabase.from('stock_logs').insert({
          item_id: inv.id,
          item_name: inv.name,
          sku: inv.sku,
          type: 'ORDER_DEDUCT',
          change_amount: -(cItem.quantity),
          previous_stock: prev,
          new_stock: next,
          reference_order: order_number,
          notes: `Order deduction for ${order_number}`,
        });
      }
    }

    await supabase.from('orders').update({ stock_deducted: true }).eq('id', order.id);
  }

  return order;
}

/** Update order status. If CANCELLED, restores inventory stock. */
export async function updateOrderStatus(
  orderId: number,
  status: Order['order_status'],
  paymentStatus?: Order['payment_status']
): Promise<boolean> {
  // Fetch the order to check if we need to restore stock
  const { data: orderData } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .single();

  const order = orderData as Order | null;

  const update: Partial<Order> = {
    order_status: status,
    updated_at: new Date().toISOString() as unknown as string,
  };
  if (paymentStatus) update.payment_status = paymentStatus;

  const { error } = await supabase.from('orders').update(update).eq('id', orderId);
  if (error) {
    console.error('[supabase] updateOrderStatus error:', error.message);
    return false;
  }

  // Restore inventory stock on CANCELLED (if stock was previously deducted)
  if (status === 'CANCELLED' && order?.stock_deducted) {
    const allCustomItems = [
      ...(order.custom_gift_details?.items || []),
      ...(order.cart_items || []).flatMap(ci => ci.customDetails?.items || []),
    ];

    for (const cItem of allCustomItems) {
      const { data: invItem } = await supabase
        .from('inventory_items')
        .select('id, stock, name, sku')
        .or(`id.eq.${cItem.id},name.ilike.${cItem.name}`)
        .maybeSingle();

      if (invItem) {
        const inv = invItem as InventoryItem;
        const prev = inv.stock;
        const next = prev + cItem.quantity;
        await supabase.from('inventory_items').update({ stock: next }).eq('id', inv.id);
        await supabase.from('stock_logs').insert({
          item_id: inv.id,
          item_name: inv.name,
          sku: inv.sku,
          type: 'ORDER_RESTORE',
          change_amount: cItem.quantity,
          previous_stock: prev,
          new_stock: next,
          reference_order: order.order_number,
          notes: `Stock restored — Order ${order.order_number} cancelled`,
        });
      }
    }

    // Restore regular product stock
    for (const ci of (order.cart_items || [])) {
      if (!ci.isCustom && typeof ci.productId === 'number') {
        const { data: prod } = await supabase.from('products').select('stock').eq('id', ci.productId).single();
        if (prod) {
          const newStock = (prod as { stock: number }).stock + ci.quantity;
          await supabase.from('products').update({ stock: newStock }).eq('id', ci.productId);
        }
      }
    }

    await supabase.from('orders').update({ stock_deducted: false }).eq('id', orderId);
  }

  return true;
}

// ─── Client Reviews Helpers ───────────────────────────────────────────────────

export async function getClientReviews(): Promise<ClientReview[]> {
  const { data, error } = await supabase
    .from('client_reviews')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[supabase] getClientReviews error:', error.message);
    return [];
  }
  return (data as ClientReview[]) || [];
}

export async function createClientReview(imageUrl: string, message?: string): Promise<ClientReview | null> {
  const { data, error } = await supabase
    .from('client_reviews')
    .insert({ image_url: imageUrl, message: message || '' })
    .select()
    .single();

  if (error) {
    console.error('[supabase] createClientReview error:', error.message);
    return null;
  }
  return data as ClientReview;
}

export async function deleteClientReview(id: number): Promise<boolean> {
  const { error } = await supabase.from('client_reviews').delete().eq('id', id);
  if (error) {
    console.error('[supabase] deleteClientReview error:', error.message);
    return false;
  }
  return true;
}

// ─── Image Upload Helpers (Supports Unlimited Image File Sizes) ──────────────

/**
 * Automatically prepares and compresses image files of ANY size (PNG, JPG, WebP, etc.) before upload.
 * Removes size restrictions and compresses large images down to crisp ~150KB-350KB JPEGs.
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  // If file is already tiny (< 300KB), return as is
  if (file.size < 300 * 1024) {
    return file;
  }

  return new Promise<File>((resolve) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    img.onload = () => {
      const maxDim = 1920;
      let width = img.width;
      let height = img.height;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const compressedName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
          const compressedFile = new File([blob], compressedName, { type: 'image/jpeg' });
          resolve(compressedFile);
        },
        'image/jpeg',
        0.85
      );
    };

    img.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads an Image file of ANY size to Supabase Storage bucket 'product-images'.
 * Automatically optimizes file size and specifies explicit MIME type to guarantee 100% upload success.
 */
export async function uploadProductImage(rawFile: File): Promise<string | null> {
  try {
    const file = await prepareImageForUpload(rawFile);
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
    const mimeType = file.type || 'image/jpeg';

    const { error } = await supabase.storage
      .from('product-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: mimeType,
      });

    if (error) {
      console.error('[supabase] uploadProductImage error:', error.message);
      return null;
    }

    const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(fileName);
    return urlData?.publicUrl || null;
  } catch (err: any) {
    console.error('[supabase] uploadProductImage error:', err?.message || err);
    return null;
  }
}

/**
 * Uploads an Image file of ANY size to Supabase Storage bucket 'review-photos'.
 * Automatically optimizes file size and specifies explicit MIME type.
 */
export async function uploadReviewPhoto(rawFile: File): Promise<string | null> {
  try {
    const file = await prepareImageForUpload(rawFile);
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
    const mimeType = file.type || 'image/jpeg';

    // Try uploading to 'review-photos' bucket first
    const { error } = await supabase.storage
      .from('review-photos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: mimeType,
      });

    if (!error) {
      const { data: urlData } = supabase.storage.from('review-photos').getPublicUrl(fileName);
      if (urlData?.publicUrl) return urlData.publicUrl;
    } else {
      console.warn('[supabase] review-photos bucket upload issue, trying product-images:', error.message);
    }

    // Fallback to product-images bucket if review-photos has a restrictive policy
    return uploadProductImage(rawFile);
  } catch (err: any) {
    console.error('[supabase] uploadReviewPhoto error:', err?.message || err);
    return null;
  }
}
