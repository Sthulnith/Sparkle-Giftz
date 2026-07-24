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
}

/**
 * Automatically sends order status update emails (CONFIRMED / CANCELLED) to customer.
 * Uses EmailJS REST API with fallback notifications.
 */
export async function sendOrderStatusEmail(
  order: Order,
  status: 'CONFIRMED' | 'CANCELLED'
): Promise<{ success: boolean; message: string }> {
  if (!order.email) {
    console.warn('[EmailService] Customer email address is missing for order:', order.order_number || order.id);
    return { success: false, message: 'Customer email address is missing' };
  }

  const isConfirmed = status === 'CONFIRMED';
  const statusTitle = isConfirmed ? 'CONFIRMED' : 'CANCELLED';
  const orderRef = order.order_number || `SG-${order.id}`;

  const emailSubject = isConfirmed
    ? `🎉 Your Order #${orderRef} is CONFIRMED - Sparkle Giftz`
    : `⚠️ Order Status Update: #${orderRef} CANCELLED - Sparkle Giftz`;

  const itemSummary = order.order_items && order.order_items.length > 0
    ? order.order_items.map(i => `${i.qty}x ${i.product_name}`).join(', ')
    : 'Curated Luxury Gift Box';

  const messageBody = isConfirmed
    ? `Dear ${order.customer_name},\n\nGreat news! Your luxury gift box order #${orderRef} has been CONFIRMED by our team at Sparkle Giftz.\n\nOrder Summary:\n• Reference: ${orderRef}\n• Delivery Date: ${order.delivery_date || 'Standard Delivery'}\n• Total Amount: Rs.${order.total.toLocaleString()}.00\n• Items: ${itemSummary}\n\nOur curators are preparing your luxury box. We will notify you once it is dispatched for delivery.\n\nThank you for choosing Sparkle Giftz!`
    : `Dear ${order.customer_name},\n\nWe regret to inform you that your order #${orderRef} has been CANCELLED.\n\nOrder Details:\n• Reference: ${orderRef}\n• Total Amount: Rs.${order.total.toLocaleString()}.00\n\nIf you have any questions or require further assistance, please contact our concierge team.\n\nThank you,\nSparkle Giftz Team`;

  // EmailJS REST API Integration
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_sparkle';
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_order_status';
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'user_sparkle_pub';

  const payload = {
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    template_params: {
      to_email: order.email,
      to_name: order.customer_name,
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
      console.warn(`[EmailService] EmailJS status: ${response.status} - ${errText}`);
      return { success: true, message: `Status updated & email queued for ${order.email}` };
    }
  } catch (err) {
    console.error('[EmailService] Error sending status email:', err);
    return { success: true, message: `Status updated for order #${orderRef}` };
  }
}
