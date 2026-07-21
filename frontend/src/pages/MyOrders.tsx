import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import logo from '../assets/logo.png';

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

const STATUS_CONFIG: Record<Order['orderStatus'], { label: string; color: string; icon: string; step: number }> = {
  PENDING:   { label: 'Pending',    color: 'text-yellow-400 border-yellow-400/40 bg-yellow-950/30',  icon: 'schedule',         step: 0 },
  CONFIRMED: { label: 'Confirmed',  color: 'text-blue-400   border-blue-400/40   bg-blue-950/30',    icon: 'check_circle',     step: 1 },
  PACKED:    { label: 'Packed',     color: 'text-purple-400 border-purple-400/40 bg-purple-950/30',  icon: 'inventory_2',      step: 2 },
  SHIPPED:   { label: 'Shipped',    color: 'text-gold       border-gold/40       bg-gold/10',         icon: 'local_shipping',   step: 3 },
  DELIVERED: { label: 'Delivered',  color: 'text-green-400  border-green-400/40  bg-green-950/30',   icon: 'celebration',      step: 4 },
  CANCELLED: { label: 'Cancelled',  color: 'text-red-400    border-red-400/40    bg-red-950/30',      icon: 'cancel',           step: -1 },
};

const STEPS = ['Confirmed', 'Packed', 'Shipped', 'Delivered'];

export const MyOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customerEmail, setCustomerEmail] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    const email = sessionStorage.getItem('sg_customer_email');
    if (!email) {
      // Not logged in — redirect to login
      navigate('/login', { replace: true });
      return;
    }
    setCustomerEmail(email);

    const raw = localStorage.getItem('sparkle_orders');
    if (raw) {
      const all: Order[] = JSON.parse(raw);
      const mine = all
        .filter((o) => o.email.trim().toLowerCase() === email)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(mine);
    }
  }, [navigate]);

  const handleSignOut = () => {
    sessionStorage.removeItem('sg_customer_email');
    navigate('/login', { replace: true });
  };

  const getStepIndex = (status: Order['orderStatus']) => {
    const map: Record<string, number> = { CONFIRMED: 0, PACKED: 1, SHIPPED: 2, DELIVERED: 3 };
    return map[status] ?? -1;
  };

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gold/15 pb-6">
          <div className="flex items-center gap-4">
            <Link to="/">
              <img src={logo} alt="Sparkle Giftz" className="h-10 w-auto object-contain" />
            </Link>
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl text-gold">My Orders</h1>
              <p className="text-[11px] text-muted font-sans tracking-wider mt-0.5">{customerEmail}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-3 py-2 border border-gold/25 hover:border-gold hover:text-gold text-muted text-xs uppercase tracking-wider transition duration-200 rounded"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            Sign Out
          </button>
        </div>

        {/* Empty state */}
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <span className="material-symbols-outlined text-6xl text-gold/30">inbox</span>
            <h2 className="font-serif text-xl text-muted">No orders found</h2>
            <p className="text-xs text-muted/60 max-w-xs">
              We couldn't find any orders linked to <strong className="text-gold/70">{customerEmail}</strong>.
            </p>
            <Link
              to="/shop"
              className="mt-2 px-6 py-2.5 bg-gold hover:bg-gold-light text-background text-xs uppercase tracking-widest font-semibold rounded transition"
            >
              Browse Collection
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-muted/70 font-sans">
              {orders.length} order{orders.length !== 1 ? 's' : ''} found
            </p>

            {orders.map((order) => {
              const cfg     = STATUS_CONFIG[order.orderStatus];
              const stepIdx = getStepIndex(order.orderStatus);
              const isOpen  = expandedId === order.id;

              return (
                <div key={order.id} className="gold-gradient-border bg-charcoal rounded-xl overflow-hidden shadow-lg">

                  {/* Order summary row */}
                  <button
                    onClick={() => setExpandedId(isOpen ? null : order.id)}
                    className="w-full text-left px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-gold/5 transition"
                  >
                    <div className="flex items-center gap-4">
                      <span className={`material-symbols-outlined text-2xl ${cfg.color.split(' ')[0]}`}>
                        {cfg.icon}
                      </span>
                      <div>
                        <p className="font-mono text-gold font-bold text-sm tracking-wider">{order.orderNumber}</p>
                        <p className="text-xs text-muted mt-0.5">
                          {new Date(order.createdAt).toLocaleDateString('en-US', {
                            day: 'numeric', month: 'long', year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full border ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      <span className="text-gold font-semibold text-sm">
                        Rs.{order.total.toLocaleString()}.00
                      </span>
                      <span className={`material-symbols-outlined text-muted text-xl transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                        expand_more
                      </span>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div className="border-t border-gold/10 px-5 py-5 space-y-5">

                      {/* Progress tracker (not cancelled) */}
                      {order.orderStatus !== 'CANCELLED' && (
                        <div className="flex items-center gap-0">
                          {STEPS.map((step, i) => {
                            const done    = stepIdx >= i;
                            const current = stepIdx === i;
                            return (
                              <div key={step} className="flex-1 flex flex-col items-center">
                                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center mb-1 transition-all ${
                                  done
                                    ? 'bg-gold border-gold'
                                    : 'bg-background border-gold/20'
                                }`}>
                                  {done ? (
                                    <span className="material-symbols-outlined text-background text-sm font-bold">check</span>
                                  ) : (
                                    <div className={`w-2 h-2 rounded-full ${current ? 'bg-gold animate-pulse' : 'bg-gold/20'}`} />
                                  )}
                                </div>
                                <p className={`text-[10px] font-sans text-center ${done ? 'text-gold' : 'text-muted/50'}`}>
                                  {step}
                                </p>
                                {/* Connector line */}
                                {i < STEPS.length - 1 && (
                                  <div className="absolute" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Info grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-muted mb-0.5">Customer</p>
                          <p className="text-ivory font-medium">{order.customerName}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-muted mb-0.5">Phone</p>
                          <p className="text-ivory">{order.phone}</p>
                        </div>
                        <div className="sm:col-span-2">
                          <p className="text-[10px] uppercase tracking-widest text-muted mb-0.5">Delivery Address</p>
                          <p className="text-ivory">{order.address}, {order.city}</p>
                        </div>
                        {order.deliveryDate && (
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-muted mb-0.5">Required By</p>
                            <p className="text-gold font-semibold">
                              {new Date(order.deliveryDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long' })}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-muted mb-0.5">Payment</p>
                          <p className="text-ivory">
                            {order.paymentMethod}{' '}
                            <span className={`text-[10px] font-bold uppercase ${
                              order.paymentStatus === 'PAID' ? 'text-green-400' : 'text-yellow-400'
                            }`}>
                              · {order.paymentStatus}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Gift details */}
                      {(order.giftMessage || order.wrapping) && (
                        <div className="bg-background/50 rounded-lg border border-gold/10 p-4 space-y-2">
                          <p className="text-[10px] uppercase tracking-widest text-gold/70 mb-2">Gift Details</p>
                          {order.wrapping && (
                            <p className="text-xs text-muted flex items-center gap-2">
                              <span className="material-symbols-outlined text-sm text-gold/60">redeem</span>
                              {order.wrapping}
                            </p>
                          )}
                          {order.giftMessage && (
                            <p className="text-xs text-muted italic flex items-start gap-2">
                              <span className="material-symbols-outlined text-sm text-gold/60 mt-0.5">message</span>
                              "{order.giftMessage}"
                            </p>
                          )}
                        </div>
                      )}

                      {/* Totals */}
                      <div className="border-t border-gold/10 pt-4 space-y-1 text-sm">
                        <div className="flex justify-between text-muted">
                          <span>Subtotal</span>
                          <span>Rs.{order.subtotal.toLocaleString()}.00</span>
                        </div>
                        <div className="flex justify-between text-muted">
                          <span>Delivery</span>
                          <span>{order.deliveryFee === 0 ? 'Free' : `Rs.${order.deliveryFee.toLocaleString()}.00`}</span>
                        </div>
                        <div className="flex justify-between text-gold font-semibold text-base border-t border-gold/10 pt-2 mt-2">
                          <span>Total</span>
                          <span>Rs.{order.total.toLocaleString()}.00</span>
                        </div>
                      </div>

                      {/* Help link */}
                      <p className="text-[11px] text-muted/50 text-center">
                        Questions about your order?{' '}
                        <Link to="/contact" className="text-gold/70 hover:text-gold underline transition">
                          Contact us
                        </Link>
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Back to shopping */}
        <div className="text-center pt-4">
          <Link to="/shop" className="text-xs text-muted/50 hover:text-muted transition uppercase tracking-wider">
            ← Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
};
