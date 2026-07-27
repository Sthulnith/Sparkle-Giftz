import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createOrder } from '../lib/supabase';
import { sendOrderPlacementEmail } from '../lib/emailService';

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
  cartItems?: CartItem[];
  customGiftDetails?: CustomGiftDetails;
}

// Validation helpers for Phone and Email
const validatePhone = (phoneStr: string): string => {
  const trimmed = phoneStr.trim();
  if (!trimmed) return 'Phone number is required.';

  // Local number starting with '0' (e.g., 0771234567)
  if (trimmed.startsWith('0')) {
    const digitsOnly = trimmed.replace(/[^0-9]/g, '');
    if (digitsOnly.length < 10) {
      return `Phone number starting with '0' must be exactly 10 digits (${digitsOnly.length}/10 digits entered).`;
    }
    if (!/^0[0-9]{9}$/.test(digitsOnly)) {
      return 'Please enter a valid 10-digit local phone number (e.g., 0771234567).';
    }
    return '';
  }

  // International number starting with '+' (e.g., +94771234567)
  if (trimmed.startsWith('+')) {
    const digitsOnly = trimmed.replace(/[^0-9]/g, '');
    if (digitsOnly.length < 11 || digitsOnly.length > 15) {
      return 'Please enter a valid international phone number with country code (e.g., +94771234567).';
    }
    return '';
  }

  // Fallback if user enters 9 or 10 digits without leading 0
  const digitsOnly = trimmed.replace(/[^0-9]/g, '');
  if (digitsOnly.length !== 10) {
    return 'Please enter a valid 10-digit phone number starting with 0 (e.g., 0771234567).';
  }

  return '';
};

const validateEmail = (emailStr: string): string => {
  const trimmed = emailStr.trim();
  if (!trimmed) return 'Email address is required.';

  // Check for uppercase letters
  if (/[A-Z]/.test(trimmed)) {
    return 'Email address must be in lowercase only (no capital letters allowed).';
  }

  // Check for common domain typos like .vom, .con, .cmo
  if (/\.(vom|con|cmo|gmal|gmai)$/i.test(trimmed)) {
    return 'Invalid email extension (did you mean .com or .lk?).';
  }

  // Valid lowercase email regex with proper TLD (e.g., @gmail.com, @yahoo.com, .lk)
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.(com|lk|org|net|edu|co|io|biz|info|gov|me)$/;
  if (!emailRegex.test(trimmed)) {
    return 'Please enter a valid lowercase email address ending with a valid domain (e.g., name@gmail.com or name@domain.lk).';
  }

  return '';
};

export const Checkout = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  
  // Validation states
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [touchedPhone, setTouchedPhone] = useState(false);
  const [touchedEmail, setTouchedEmail] = useState(false);

  // Calculate minimum delivery date (at least 3 days from today)
  const minDeliveryDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [deliveryDate, setDeliveryDate] = useState(minDeliveryDate);
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'PAYHERE'>('COD');
  
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

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

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = 0; // Complimentary
  const total = subtotal + deliveryFee;

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    const pErr = validatePhone(phone);
    const eErr = validateEmail(email);

    setPhoneError(pErr);
    setEmailError(eErr);
    setTouchedPhone(true);
    setTouchedEmail(true);

    if (!fullName || !phone || !email || !address || !city || !deliveryDate) {
      alert('Please fill in all required shipping details.');
      return;
    }

    if (pErr || eErr) {
      alert(`Please fix the errors in your contact details before submitting:\n${pErr ? '• ' + pErr + '\n' : ''}${eErr ? '• ' + eErr : ''}`);
      return;
    }

    if (cartItems.length === 0) {
      alert('Your cart is empty.');
      return;
    }

    setIsSubmitting(true);

    try {
      const firstItem = cartItems[0];
      const itemDetailsWrapping = cartItems.length > 1
        ? `${firstItem?.name || 'Gift Box'} +${cartItems.length - 1} more (${firstItem?.wrapping || 'Signature Matte Black'})`
        : `${firstItem?.name || 'Gift Box'} (${firstItem?.wrapping || 'Signature Matte Black'})`;
      const itemDetailsMessage = cartItems.map(item => item.giftMessage).filter(Boolean).join(' | ');
      const customGift = cartItems.find(i => i.isCustom && i.customDetails)?.customDetails;

      const createdOrder = await createOrder({
        customer_name: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        city: city.trim(),
        subtotal,
        delivery_fee: deliveryFee,
        total,
        payment_method: paymentMethod,
        payment_status: paymentMethod === 'PAYHERE' ? 'PAID' : 'PENDING',
        order_status: 'PENDING',
        gift_message: itemDetailsMessage || firstItem?.giftMessage || undefined,
        wrapping: itemDetailsWrapping.length > 90 ? itemDetailsWrapping.slice(0, 87) + '...' : itemDetailsWrapping,
        delivery_date: deliveryDate,
        cart_items: cartItems as any,
        custom_gift_details: customGift as any,
      });

      if (!createdOrder) {
        alert('Failed to place order. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Automatically send order placement confirmation email to customer ONLY
      try {
        const emailResult = await sendOrderPlacementEmail({
          id: createdOrder.id,
          order_number: createdOrder.order_number,
          customer_name: createdOrder.customer_name,
          email: createdOrder.email,
          total: createdOrder.total,
          delivery_date: createdOrder.delivery_date,
          payment_method: createdOrder.payment_method === 'PAYHERE' ? 'Bank Transfer' : 'Cash on Delivery (COD)',
          cart_items: cartItems.map(i => ({ quantity: i.quantity, name: i.name })),
        });
        console.log('[Checkout] Email result:', emailResult);
      } catch (emailErr) {
        console.error('[Checkout] Email sending error:', emailErr);
      }


      // Notify other windows/components
      window.dispatchEvent(new Event('sparkle_products_updated'));
      window.dispatchEvent(new Event('storage'));

      // Clear Cart
      localStorage.removeItem('sparkle_cart');
      window.dispatchEvent(new Event('sparkle_cart_updated'));

      // Save confirmation snapshot to sessionStorage for OrderSuccess page
      const formattedOrder = {
        ...createdOrder,
        orderNumber: createdOrder.order_number,
        customerName: createdOrder.customer_name,
        createdAt: createdOrder.created_at,
        deliveryDate: createdOrder.delivery_date,
        paymentMethod: createdOrder.payment_method === 'PAYHERE' ? 'Bank Transfer' : 'Cash on Delivery (COD)',
        paymentStatus: createdOrder.payment_status,
      };

      sessionStorage.setItem('sparkle_last_order', JSON.stringify(formattedOrder));

      // Redirect to Confirmation
      setPlacedOrder(formattedOrder as any);
    } catch (err) {
      console.error('[Checkout] Error placing order:', err);
      alert('An error occurred while placing your order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // SUCCESS SCREEN STATE
  if (placedOrder) {
    const isBankPayment = (placedOrder as any).payment_method === 'PAYHERE' || (placedOrder as any).paymentMethod === 'Bank Transfer' || (placedOrder as any).paymentMethod === 'PAYHERE';
    const paymentLabel = isBankPayment ? 'Bank Transfer' : 'Cash on Delivery (COD)';

    return (
      <div className="min-h-[80vh] flex items-center justify-center py-16 px-4 max-w-2xl mx-auto font-sans">
        <div className="gold-gradient-border bg-charcoal p-8 sm:p-10 rounded text-center space-y-6 w-full shadow-gold-glow">
          <span className="material-symbols-outlined text-gold text-6xl">check_circle</span>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-serif text-gold uppercase tracking-widest">Order Placed</h1>
            <p className="text-xs text-muted font-sans uppercase tracking-wider">Thank you for curating with Sparkle Giftz</p>
          </div>

          <div className="section-divider my-4"></div>

          <div className="space-y-3 text-sm text-ivory text-left bg-background/60 p-6 rounded-lg border border-gold/20 shadow">
            <p className="font-sans text-xs text-muted">
              Order Reference: <span className="text-gold font-bold font-mono text-sm tracking-wide">{placedOrder.orderNumber || (placedOrder as any).order_number}</span>
            </p>
            <p className="font-sans text-xs text-muted">
              Client Name: <span className="text-ivory font-semibold">{placedOrder.customerName || (placedOrder as any).customer_name}</span>
            </p>
            <p className="font-sans text-xs text-muted">
              Shipping Address: <span className="text-ivory font-semibold">{placedOrder.address}, {placedOrder.city}</span>
            </p>
            <p className="font-sans text-xs text-muted">
              Required Delivery Date: <span className="text-gold font-bold">{placedOrder.deliveryDate || (placedOrder as any).delivery_date || 'Standard Delivery'}</span>
            </p>
            <p className="font-sans text-xs text-muted">
              Total Amount: <span className="text-gold font-bold font-mono text-sm">LKR {Number(placedOrder.total || 0).toLocaleString()}.00</span>
            </p>
            <p className="font-sans text-xs text-muted">
              Payment Option: <span className="text-gold font-bold">{paymentLabel}</span> <span className="text-ivory/80 text-[11px] font-normal">({(placedOrder as any).payment_status || (placedOrder as any).paymentStatus || 'Pending'})</span>
            </p>
          </div>

          {/* ONLINE PAYMENT BANK DETAILS & WHATSAPP BUTTON FOR PLACED ORDER */}
          {isBankPayment && (
            <div className="gold-gradient-border bg-charcoal p-5 rounded-lg space-y-4 font-sans text-xs border border-gold/30 text-left my-4">
              <div className="flex items-center gap-2 text-gold border-b border-gold/15 pb-2">
                <span className="material-symbols-outlined text-lg">account_balance</span>
                <span className="font-serif font-bold text-sm tracking-wider uppercase">Bank Transfer Instructions</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-ivory bg-background/60 p-4 rounded border border-gold/15">
                <div>
                  <p className="text-[10px] text-muted uppercase tracking-wider font-semibold">Bank Name</p>
                  <p className="font-bold text-ivory text-sm">Bank of Ceylon</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted uppercase tracking-wider font-semibold">Branch</p>
                  <p className="font-bold text-ivory text-sm">Makola</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted uppercase tracking-wider font-semibold">Account Number</p>
                  <p className="font-bold font-mono text-gold text-base tracking-widest">95939553</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted uppercase tracking-wider font-semibold">Account Holder Name</p>
                  <p className="font-bold text-ivory text-sm">N V S Sathsarani</p>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded text-amber-200 text-[11px] leading-relaxed flex items-start gap-2">
                <span className="material-symbols-outlined text-amber-400 text-sm shrink-0 mt-0.5">info</span>
                <div>
                  <strong>Action Required:</strong> After completed transfer, please send your bank slip via WhatsApp so our team can verify your payment and confirm order <strong>[{placedOrder.orderNumber}]</strong>.
                </div>
              </div>

              <a
                href={`https://wa.me/94723487062?text=${encodeURIComponent(
                  `Hi Sparkle Giftz! I have transferred the payment for my order [${placedOrder.orderNumber}] (Total: LKR ${placedOrder.total.toLocaleString()}.00). Here is my bank transfer slip.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 w-full py-3.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs uppercase tracking-wider rounded transition shadow-lg cursor-pointer min-h-[44px]"
              >
                <span className="material-symbols-outlined text-base">chat</span>
                <span>Send Bank Slip on WhatsApp (+94 72 348 7062)</span>
              </a>
            </div>
          )}

          {/* EMAIL NOTIFICATION & SPAM ALERT BANNER */}
          <div className="bg-gold/10 border border-gold/40 p-4 sm:p-5 rounded-lg text-left space-y-2.5 my-5 shadow-md animate-fadeIn font-sans">
            <div className="flex items-center gap-2.5 text-gold font-bold text-xs uppercase tracking-wider">
              <span className="material-symbols-outlined text-xl text-gold">mark_email_unread</span>
              <span>Order Details Sent to Your Email</span>
            </div>
            <p className="text-xs text-ivory/90 leading-relaxed">
              We've dispatched your order receipt & curation details to <strong className="text-gold font-semibold">{placedOrder.email || (placedOrder as any).email}</strong>.
            </p>
            <div className="bg-background/80 border border-gold/20 p-3 rounded text-[11px] text-muted space-y-1.5">
              <p className="flex items-center gap-1.5 text-amber-300 font-semibold">
                <span className="material-symbols-outlined text-sm text-amber-400">info</span>
                <span>Important: Check Spam / Junk Folder</span>
              </p>
              <p className="text-ivory/80 leading-relaxed">
                If you don't see our message in your primary inbox, please check your <strong>Spam / Junk</strong> folder and mark it as <strong className="text-gold font-semibold">"Not Spam"</strong> or <strong className="text-gold font-semibold">"Mark as Safe"</strong> to receive continuous status updates on your order.
              </p>
            </div>
          </div>

          <p className="text-xs text-muted leading-relaxed font-sans max-w-md mx-auto">
            A luxury curation desk representative will contact you shortly on your provided telephone number to coordinate shipment delivery timings.
          </p>

          <div className="pt-4">
            <Link
              to="/shop"
              className="inline-block px-8 py-3 bg-gold hover:bg-gold-light text-background font-semibold font-sans text-xs uppercase tracking-widest transition duration-300"
            >
              Return to Catalog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // EMPTY CHECKOUT REDIRECT STATE
  if (cartItems.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center py-16 px-4 max-w-4xl mx-auto">
        <h1 className="text-3xl font-serif mb-6 gold-text-gradient uppercase tracking-widest">Secure Checkout</h1>
        <div className="gold-gradient-border bg-charcoal p-12 rounded text-center w-full max-w-xl">
          <span className="material-symbols-outlined text-gold text-5xl mb-4">shopping_bag</span>
          <p className="text-ivory mb-6 font-sans text-sm font-light">Your shopping cart must contain items to proceed to checkout.</p>
          <Link
            to="/shop"
            className="inline-block px-8 py-3 bg-gold hover:bg-gold-light text-background font-semibold font-sans text-xs uppercase tracking-widest transition duration-300"
          >
            Go to Shop
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-16 px-4 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-serif gold-text-gradient uppercase tracking-widest">Secure Checkout</h1>
        <p className="text-muted mt-1 font-sans text-xs uppercase tracking-wider">Enter details to complete your bespoke order presentation.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* SHIPPING FORM */}
        <form onSubmit={handlePlaceOrder} className="space-y-6 gold-gradient-border p-8 rounded bg-charcoal">
          <h2 className="text-xl font-serif text-gold border-b border-gold/15 pb-3 uppercase tracking-wider">
            Shipping Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5 col-span-2">
              <label className="block text-xs uppercase text-muted tracking-wider font-medium font-sans">Full Name</label>
              <input
                type="text"
                required
                placeholder="Julian Ross"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full bg-background border border-gold/25 p-3 rounded text-sm text-ivory placeholder-muted/40 focus:border-gold outline-none font-sans"
              />
            </div>

            <div className="space-y-1.5 col-span-2">
              <label className="block text-xs uppercase text-muted tracking-wider font-medium font-sans">Phone Number</label>
              <input
                type="tel"
                required
                placeholder="0771234567 or +94771234567"
                value={phone}
                maxLength={phone.startsWith('0') ? 10 : 16}
                onChange={e => {
                  let val = e.target.value;
                  // If starting with '0', restrict strictly to digits only and max 10 digits length
                  if (val.startsWith('0')) {
                    val = val.replace(/[^0-9]/g, '').slice(0, 10);
                  } else if (val.startsWith('+')) {
                    val = '+' + val.slice(1).replace(/[^0-9\s-]/g, '').slice(0, 14);
                  } else {
                    val = val.replace(/[^0-9+\s-]/g, '').slice(0, 15);
                  }
                  setPhone(val);
                  if (touchedPhone) setPhoneError(validatePhone(val));
                }}
                onBlur={() => {
                  setTouchedPhone(true);
                  setPhoneError(validatePhone(phone));
                }}
                className={`w-full bg-background border p-3 rounded text-sm text-ivory placeholder-muted/40 outline-none font-sans transition ${
                  phoneError ? 'border-red-500/80 focus:border-red-400 bg-red-950/10' : 'border-gold/25 focus:border-gold'
                }`}
              />
              {phoneError ? (
                <p className="text-[11px] text-red-400 font-sans flex items-center gap-1 mt-1">
                  <span className="material-symbols-outlined text-xs">error</span>
                  {phoneError}
                </p>
              ) : (
                <p className="text-[10px] text-muted/70 font-sans italic mt-0.5">
                  * Local numbers starting with 0 are capped at exactly 10 digits (e.g. 0771234567).
                </p>
              )}
            </div>

            <div className="space-y-1.5 col-span-2">
              <label className="block text-xs uppercase text-muted tracking-wider font-medium font-sans">Email Address</label>
              <input
                type="email"
                required
                placeholder="client@gmail.com"
                value={email}
                onChange={e => {
                  // Automatically force lowercase input to prevent capital letters
                  const lowerVal = e.target.value.toLowerCase();
                  setEmail(lowerVal);
                  if (touchedEmail) setEmailError(validateEmail(lowerVal));
                }}
                onBlur={() => {
                  setTouchedEmail(true);
                  setEmailError(validateEmail(email));
                }}
                className={`w-full bg-background border p-3 rounded text-sm text-ivory placeholder-muted/40 outline-none font-sans transition ${
                  emailError ? 'border-red-500/80 focus:border-red-400 bg-red-950/10' : 'border-gold/25 focus:border-gold'
                }`}
              />
              {emailError ? (
                <p className="text-[11px] text-red-400 font-sans flex items-center gap-1 mt-1">
                  <span className="material-symbols-outlined text-xs">error</span>
                  {emailError}
                </p>
              ) : (
                <p className="text-[10px] text-muted/70 font-sans italic mt-0.5">
                  * Must be in lowercase ending with a valid domain (e.g. name@gmail.com or name@domain.lk).
                </p>
              )}
            </div>

            <div className="space-y-1.5 col-span-2">
              <label className="block text-xs uppercase text-muted tracking-wider font-medium font-sans">Delivery Address</label>
              <input
                type="text"
                required
                placeholder="Street Address, Apartment, Suite"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full bg-background border border-gold/25 p-3 rounded text-sm text-ivory placeholder-muted/40 focus:border-gold outline-none font-sans"
              />
            </div>

            <div className="space-y-1.5 col-span-2">
              <label className="block text-xs uppercase text-muted tracking-wider font-medium font-sans">City / Suburb</label>
              <input
                type="text"
                required
                placeholder="Colombo 07"
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full bg-background border border-gold/25 p-3 rounded text-sm text-ivory placeholder-muted/40 focus:border-gold outline-none font-sans"
              />
            </div>

            <div className="space-y-1.5 col-span-2">
              <label className="block text-xs uppercase text-gold tracking-wider font-semibold font-sans">
                Delivery Required Date
              </label>
              <input
                type="date"
                required
                min={minDeliveryDate}
                value={deliveryDate}
                onChange={e => setDeliveryDate(e.target.value)}
                className="w-full bg-background border border-gold/40 p-3 rounded text-sm text-ivory placeholder-muted/40 focus:border-gold outline-none font-sans cursor-pointer"
              />
              <p className="text-[10px] text-muted font-sans italic">
                * Note: Sparkle Giftz curations require orders to be placed at least 3 days before your required delivery date.
              </p>
            </div>
          </div>

          <div className="section-divider my-6"></div>

          {/* PAYMENT METHOD */}
          <div className="space-y-4">
            <h3 className="text-xs uppercase text-gold font-sans tracking-widest font-semibold">
              Select Payment Method
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className={`flex items-center gap-3 p-4 border rounded cursor-pointer transition ${
                paymentMethod === 'COD' ? 'border-gold bg-gold/5' : 'border-gold/20 hover:border-gold/45'
              }`}>
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'COD'}
                  onChange={() => setPaymentMethod('COD')}
                  className="accent-gold"
                />
                <div className="font-sans">
                  <p className="text-xs font-semibold uppercase text-ivory tracking-wide">Cash on Delivery (COD)</p>
                  <p className="text-[10px] text-muted">Pay with cash upon package receipt</p>
                </div>
              </label>

              <label className={`flex items-center gap-3 p-4 border rounded cursor-pointer transition ${
                paymentMethod === 'PAYHERE' ? 'border-gold bg-gold/5' : 'border-gold/20 hover:border-gold/45'
              }`}>
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'PAYHERE'}
                  onChange={() => setPaymentMethod('PAYHERE')}
                  className="accent-gold"
                />
                <div className="font-sans">
                  <p className="text-xs font-semibold uppercase text-ivory tracking-wide">Online Payment / Bank Transfer</p>
                  <p className="text-[10px] text-muted">Pay via Bank Transfer or Online Banking</p>
                </div>
              </label>
            </div>

            {/* ONLINE PAYMENT / BANK TRANSFER DETAILS CARD */}
            {paymentMethod === 'PAYHERE' && (
              <div className="gold-gradient-border bg-background/80 p-5 rounded-lg space-y-4 font-sans text-xs border border-gold/30 mt-3 animate-fadeIn">
                <div className="flex items-center gap-2 text-gold border-b border-gold/15 pb-2">
                  <span className="material-symbols-outlined text-lg">account_balance</span>
                  <span className="font-serif font-bold text-sm tracking-wider uppercase">Bank Transfer Account Details</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-ivory bg-charcoal/90 p-4 rounded border border-gold/15">
                  <div>
                    <p className="text-[10px] text-muted uppercase tracking-wider font-semibold">Bank Name</p>
                    <p className="font-bold text-ivory text-sm">Bank of Ceylon</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted uppercase tracking-wider font-semibold">Branch</p>
                    <p className="font-bold text-ivory text-sm">Makola</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted uppercase tracking-wider font-semibold">Account Number</p>
                    <p className="font-bold font-mono text-gold text-base tracking-widest">95939553</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted uppercase tracking-wider font-semibold">Account Holder Name</p>
                    <p className="font-bold text-ivory text-sm">N V S Sathsarani</p>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded text-amber-200 text-[11px] leading-relaxed flex items-start gap-2">
                  <span className="material-symbols-outlined text-amber-400 text-sm shrink-0 mt-0.5">info</span>
                  <div>
                    <strong>Action Required:</strong> After completed transfer, please send your bank slip via WhatsApp so our desk can verify & confirm your order.
                  </div>
                </div>

                <a
                  href={`https://wa.me/94723487062?text=${encodeURIComponent(
                    `Hi Sparkle Giftz! I am placing an Online Payment / Bank Transfer order (Total: LKR ${total.toLocaleString()}.00). Here is my bank transfer slip.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2.5 w-full py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs uppercase tracking-wider rounded transition shadow-lg cursor-pointer min-h-[44px]"
                >
                  <span className="material-symbols-outlined text-base">chat</span>
                  <span>Send Bank Slip via WhatsApp (+94 72 348 7062)</span>
                </a>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-gold hover:bg-gold-light text-background font-semibold font-sans text-xs uppercase tracking-widest transition duration-300 shadow-gold-glow mt-6 disabled:opacity-50"
          >
            {isSubmitting ? 'Processing Order…' : 'Confirm & Place Order'}
          </button>
        </form>

        {/* ORDER REVIEW SUMMARY */}
        <div className="gold-gradient-border p-8 rounded bg-charcoal h-fit space-y-6">
          <h2 className="text-xl font-serif text-gold border-b border-gold/15 pb-3 uppercase tracking-wider">
            Review Your Items
          </h2>

          <div className="divide-y divide-gold/10 max-h-[350px] overflow-y-auto pr-2 space-y-4">
            {cartItems.map((item, idx) => (
              <div key={`${item.productId}-${idx}`} className="flex gap-4 pt-4 first:pt-0">
                <div className="w-16 h-16 rounded overflow-hidden bg-background border border-gold/10 shrink-0">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[8px] text-muted">NO IMAGE</div>
                  )}
                </div>
                <div className="flex-grow min-w-0">
                  <h4 className="font-serif text-sm text-ivory truncate">{item.name}</h4>
                  <p className="text-[10px] text-muted font-sans uppercase tracking-wider">
                    Qty: {item.quantity} • {item.wrapping}
                  </p>
                  {item.giftMessage && (
                    <p className="text-[10px] text-gold italic font-sans truncate mt-0.5">
                      Card: "{item.giftMessage}"
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-ivory font-sans">
                    LKR {(item.price * item.quantity).toLocaleString()}.00
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-gold/20 pt-4 space-y-3 font-sans text-xs">
            <div className="flex justify-between text-muted">
              <span>Subtotal</span>
              <span className="text-ivory">LKR {subtotal.toLocaleString()}.00</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Premium Delivery</span>
              <span className="text-green-400 font-bold uppercase tracking-wide">Complimentary</span>
            </div>
            <div className="border-t border-gold/20 pt-3 flex justify-between items-baseline">
              <span className="font-serif text-sm text-ivory">Total Due</span>
              <span className="font-sans text-lg font-bold text-gold">LKR {total.toLocaleString()}.00</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
