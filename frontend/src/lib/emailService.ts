import type { Order } from './supabase';

export interface EmailParams {
  to_email: string;
  to_name: string;
  order_ref: string;
  order_status: string;
  total_price: string;
  delivery_date: string;
  items_summary: string;
  message_body: string;
  from_name?: string;
  reply_to?: string;
}

/** Helper to generate spam-safe prefilled mailto link for direct mail app opening */
export function generateOrderMailtoUrl(order: Order, status: 'CONFIRMED' | 'CANCELLED'): string {
  const isConfirmed = status === 'CONFIRMED';
  const orderRef = order.order_number || `SG-${order.id}`;
  const itemSummary = order.order_items && order.order_items.length > 0
    ? order.order_items.map(i => `${i.qty}x ${i.product_name}`).join(', ')
    : 'Curated Luxury Gift Box';

  // Spam-safe subject lines (avoid ALL-CAPS words & alert emojis)
  const subject = isConfirmed
    ? `Order Confirmation: #${orderRef} - Sparkle Giftz`
    : `Order Update for #${orderRef} - Sparkle Giftz`;

  // Spam-safe natural language body text with sender identity
  const body = isConfirmed
    ? `Dear ${order.customer_name},\n\nYour gift box order #${orderRef} has been confirmed by Sparkle Giftz.\n\nOrder Summary:\n• Reference Number: ${orderRef}\n• Total Amount: Rs.${order.total.toLocaleString()}.00\n• Delivery Date: ${order.delivery_date || 'Standard Delivery'}\n• Items: ${itemSummary}\n\nOur team is currently preparing your order. We will notify you when it is dispatched.\n\nIf you have any questions, feel free to reply to this email or contact our concierge desk.\n\nWarm regards,\nSparkle Giftz Team\nhttps://sparklegiftz.com`
    : `Dear ${order.customer_name},\n\nThis is an update regarding your order #${orderRef} with Sparkle Giftz.\n\nYour order #${orderRef} (Total: Rs.${order.total.toLocaleString()}.00) has been cancelled.\n\nIf you have any questions or would like to discuss alternative gift box curations, please reply to this email or reach out to our concierge desk.\n\nKind regards,\nSparkle Giftz Team\nhttps://sparklegiftz.com`;

  return `mailto:${encodeURIComponent(order.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Open default email client with prefilled order status message */
export function openMailClientForOrder(order: Order, status: 'CONFIRMED' | 'CANCELLED'): void {
  const mailtoUrl = generateOrderMailtoUrl(order, status);
  window.open(mailtoUrl, '_blank');
}

/**
 * Automatically sends order status update emails (CONFIRMED / CANCELLED) to customer.
 * Uses EmailJS API when VITE_EMAILJS_PUBLIC_KEY is configured, with mailto fallback.
 */
export async function sendOrderStatusEmail(
  order: Order,
  status: 'CONFIRMED' | 'CANCELLED'
): Promise<{ success: boolean; message: string; usedFallback?: boolean }> {
  if (!order.email) {
    console.warn('[EmailService] Customer email address is missing for order:', order.order_number || order.id);
    return { success: false, message: 'Customer email address is missing' };
  }

  const isConfirmed = status === 'CONFIRMED';
  const statusTitle = isConfirmed ? 'Confirmed' : 'Cancelled';
  const orderRef = order.order_number || `SG-${order.id}`;

  const emailSubject = isConfirmed
    ? `Order Confirmation: #${orderRef} - Sparkle Giftz`
    : `Order Update for #${orderRef} - Sparkle Giftz`;

  const itemSummary = order.order_items && order.order_items.length > 0
    ? order.order_items.map(i => `${i.qty}x ${i.product_name}`).join(', ')
    : 'Curated Luxury Gift Box';

  const messageBody = isConfirmed
    ? `Dear ${order.customer_name},\n\nYour gift box order #${orderRef} has been confirmed by Sparkle Giftz.\n\nOrder Summary:\n• Reference Number: ${orderRef}\n• Total Amount: Rs.${order.total.toLocaleString()}.00\n• Delivery Date: ${order.delivery_date || 'Standard Delivery'}\n• Items: ${itemSummary}\n\nOur team is currently preparing your order. We will notify you when it is dispatched.\n\nIf you have any questions, feel free to reply to this email or contact our concierge desk.\n\nWarm regards,\nSparkle Giftz Team\nhttps://sparklegiftz.com`
    : `Dear ${order.customer_name},\n\nThis is an update regarding your order #${orderRef} with Sparkle Giftz.\n\nYour order #${orderRef} (Total: Rs.${order.total.toLocaleString()}.00) has been cancelled.\n\nIf you have any questions or would like to discuss alternative gift box curations, please reply to this email or reach out to our concierge desk.\n\nKind regards,\nSparkle Giftz Team\nhttps://sparklegiftz.com`;

  const serviceId  = import.meta.env.VITE_EMAILJS_SERVICE_ID  || 'fywpymfldfjlznyc';
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_u8p17vr';
  const publicKey  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY  || 'mJHJigm4VSTq0o4ls';

  // If EmailJS env credentials are not provided, trigger mailto fallback
  if (!serviceId || !templateId || !publicKey) {
    console.info('[EmailService] EmailJS env credentials missing. Using mailto fallback.');
    openMailClientForOrder(order, status);
    return {
      success: true,
      message: `Opened mail client for ${order.email} (EmailJS keys not configured in environment)`,
      usedFallback: true,
    };
  }

  const payload = {
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    template_params: {
      to_email: order.email,
      to_name: order.customer_name,
      from_name: 'Sparkle Giftz Concierge',
      reply_to: 'support@sparklegiftz.com',
      order_ref: orderRef,
      order_status: statusTitle,
      total_price: `Rs.${order.total.toLocaleString()}.00`,
      delivery_date: order.delivery_date || 'N/A',
      items_summary: itemSummary,
      subject: emailSubject,
      message_body: messageBody,
    },
  };

  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      console.log(`[EmailService] Order ${statusTitle} email sent to ${order.email}`);
      return { success: true, message: `Email notification sent to ${order.email}` };
    } else {
      const errText = await response.text();
      console.warn(`[EmailService] EmailJS API error (${response.status}): ${errText}`);
      openMailClientForOrder(order, status);
      return {
        success: true,
        message: `Opened mail app for ${order.email} (EmailJS returned status ${response.status})`,
        usedFallback: true,
      };
    }
  } catch (err) {
    console.error('[EmailService] Error sending status email:', err);
    openMailClientForOrder(order, status);
    return {
      success: true,
      message: `Opened mail app for ${order.email}`,
      usedFallback: true,
    };
  }
}

/**
 * Automatically sends email notifications ONLY when a customer places a new order.
 * Uses @emailjs/browser SDK when VITE_EMAILJS_PUBLIC_KEY is configured.
 */
export async function sendOrderPlacementEmail(
  order: {
    id?: number;
    order_number?: string;
    customer_name: string;
    email: string;
    total: number;
    delivery_date?: string;
    payment_method?: string;
    order_items?: { qty: number; product_name: string }[];
    cart_items?: { quantity: number; name: string }[];
  }
): Promise<{ success: boolean; message: string }> {
  if (!order.email) {
    console.warn('[EmailService] Customer email address missing for order placement');
    return { success: false, message: 'Customer email missing' };
  }

  const orderRef = order.order_number || `SG-${order.id || Date.now()}`;
  const emailSubject = `Order Placed Successfully: #${orderRef} - Sparkle Giftz`;

  // Format item summary list
  let itemSummary = 'Curated Luxury Gift Box';
  if (order.order_items && order.order_items.length > 0) {
    itemSummary = order.order_items.map(i => `${i.qty}x ${i.product_name}`).join(', ');
  } else if (order.cart_items && order.cart_items.length > 0) {
    itemSummary = order.cart_items.map(i => `${i.quantity}x ${i.name}`).join(', ');
  }

  const messageBody = `Dear ${order.customer_name},\n\nThank you for placing your luxury gift box order with Sparkle Giftz!\n\nOrder Details:\n• Order Reference: ${orderRef}\n• Total Amount: Rs.${order.total.toLocaleString()}.00\n• Payment Option: ${order.payment_method || 'Standard Payment'}\n• Delivery Date: ${order.delivery_date || 'Standard Delivery'}\n• Items: ${itemSummary}\n\nWe have received your order and our concierge team is currently preparing your gift set.\n\nWarm regards,\nSparkle Giftz Concierge\nhttps://sparklegiftz.com`;

  const serviceId  = import.meta.env.VITE_EMAILJS_SERVICE_ID  || 'fywpymfldfjlznyc';
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_u8p17vr';
  const publicKey  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY  || 'mJHJigm4VSTq0o4ls';

  // Debug: log masked credentials to confirm .env is loaded correctly
  console.log('[EmailService] Credentials check — serviceId:', serviceId, '| templateId:', templateId, '| publicKey:', publicKey ? publicKey.slice(0, 6) + '...' : 'MISSING');

  if (!serviceId || !templateId || !publicKey) {
    console.info('[EmailService] EmailJS env credentials missing. Order placement logged for:', order.email);
    return {
      success: true,
      message: `Order placement email recorded for ${order.email} (EmailJS keys not configured)`,
    };
  }

  try {
    // Use official @emailjs/browser SDK — more reliable than raw fetch
    const emailjs = await import('@emailjs/browser');

    const result = await emailjs.send(
      serviceId,
      templateId,
      {
        to_email:     order.email,
        to_name:      order.customer_name,
        from_name:    'Sparkle Giftz Concierge',
        reply_to:     'sparklegiftzz1@gmail.com',
        order_ref:    orderRef,
        order_status: 'Order Placed',
        total_price:  `Rs.${order.total.toLocaleString()}.00`,
        delivery_date: order.delivery_date || 'N/A',
        items_summary: itemSummary,
        subject:       emailSubject,
        message_body:  messageBody,
      },
      publicKey
    );

    console.log(`[EmailService] Order placement email sent to ${order.email}. Status:`, result.status, result.text);
    return { success: true, message: `Email notification sent to ${order.email}` };

  } catch (err: any) {
    console.error('[EmailService] EmailJS SDK error:', err);
    return { success: false, message: `EmailJS error: ${err?.text || err?.message || 'Unknown error'}` };
  }
}

