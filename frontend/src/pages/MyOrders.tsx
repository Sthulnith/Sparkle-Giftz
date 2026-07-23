import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import logo from '../assets/logo.png';
import { getOrdersByEmail, type Order } from '../lib/supabase';

const STATUS_CONFIG: Record<Order['order_status'], { label: string; color: string; icon: string; step: number }> = {
  PENDING:   { label: 'Pending',    color: 'text-yellow-400 border-yellow-400/40 bg-yellow-950/30',  icon: 'schedule',     step: 0 },
  CONFIRMED: { label: 'Confirmed',  color: 'text-green-400 border-green-400/40 bg-green-950/30',   icon: 'check_circle', step: 1 },
  CANCELLED: { label: 'Cancelled',  color: 'text-red-400    border-red-400/40    bg-red-950/30',      icon: 'cancel',       step: -1 },
};

const STEPS = ['Pending', 'Confirmed'];

export const MyOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customerEmail, setCustomerEmail] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    const email = sessionStorage.getItem('sg_customer_email');
    if (!email) {
      navigate('/login', { replace: true });
      return;
    }
    setCustomerEmail(email);

    const fetchMyOrders = async () => {
      try {
        const mine = await getOrdersByEmail(email);
        setOrders(mine);
      } catch (err) {
        console.error('[MyOrders] Error fetching orders:', err);
      }
    };
    fetchMyOrders();
  }, [navigate]);

  const handleSignOut = () => {
    sessionStorage.removeItem('sg_customer_email');
    navigate('/login', { replace: true });
  };

  const getStepIndex = (status: Order['order_status']) => {
    const map: Record<string, number> = { PENDING: 0, CONFIRMED: 1 };
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
              const cfg     = STATUS_CONFIG[order.order_status];
              const stepIdx = getStepIndex(order.order_status);
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
                        <p className="font-mono text-gold font-bold text-sm tracking-wider">{order.order_number}</p>
                        <p className="text-xs text-muted mt-0.5">
                          {new Date(order.created_at).toLocaleDateString('en-US', {
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
                      {order.order_status !== 'CANCELLED' && (
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
                          <p className="text-ivory font-medium">{order.customer_name}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-muted mb-0.5">Phone</p>
                          <p className="text-ivory">{order.phone}</p>
                        </div>
                        <div className="sm:col-span-2">
                          <p className="text-[10px] uppercase tracking-widest text-muted mb-0.5">Delivery Address</p>
                          <p className="text-ivory">{order.address}, {order.city}</p>
                        </div>
                        {order.delivery_date && (
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-muted mb-0.5">Required By</p>
                            <p className="text-gold font-semibold">
                              {new Date(order.delivery_date).toLocaleDateString('en-US', { day: 'numeric', month: 'long' })}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-muted mb-0.5">Payment</p>
                          <p className="text-gold font-bold">
                            {order.payment_method === 'PAYHERE' ? 'Bank Transfer' : 'Cash on Delivery (COD)'}{' '}
                            <span className={`text-[10px] font-bold uppercase ${
                              order.payment_status === 'PAID' ? 'text-green-400' : 'text-yellow-400'
                            }`}>
                              · {order.payment_status}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Bank Details & WhatsApp Slip Upload Callout for PAYHERE orders */}
                      {order.payment_method === 'PAYHERE' && (
                        <div className="bg-background/90 rounded-lg border border-gold/30 p-4 space-y-3 font-sans text-xs">
                          <div className="flex items-center gap-2 text-gold border-b border-gold/15 pb-2">
                            <span className="material-symbols-outlined text-base">account_balance</span>
                            <span className="font-serif font-bold text-xs uppercase tracking-wider">Bank Transfer Details</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-charcoal p-3 rounded border border-gold/10">
                            <div>
                              <p className="text-[9px] text-muted uppercase">Bank</p>
                              <p className="font-semibold text-ivory">Bank of Ceylon</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-muted uppercase">Branch</p>
                              <p className="font-semibold text-ivory">Makola</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-muted uppercase">Account No</p>
                              <p className="font-bold font-mono text-gold">95939553</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-muted uppercase">Account Name</p>
                              <p className="font-semibold text-ivory">N V S Sathsarani</p>
                            </div>
                          </div>
                          <p className="text-[10px] text-amber-300 italic">
                            * Please send your bank transfer slip via WhatsApp to verify your payment.
                          </p>
                          <a
                            href={`https://wa.me/94723487062?text=${encodeURIComponent(
                              `Hi Sparkle Giftz! I am sending my bank transfer slip for Order [${order.order_number || order.id}] (Total: LKR ${order.total.toLocaleString()}.00).`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs uppercase tracking-wider rounded transition shadow cursor-pointer min-h-[40px]"
                          >
                            <span className="material-symbols-outlined text-sm">chat</span>
                            <span>Send Bank Slip on WhatsApp (+94 72 348 7062)</span>
                          </a>
                        </div>
                      )}

                      {/* Custom Gift Breakdown */}
                      {(order.custom_gift_details || order.cart_items?.some(i => i.isCustom || (i as any).isCustomPreMadeBox)) && (
                        <div className="bg-background/80 rounded-lg border border-gold/20 p-4 space-y-3 font-sans">
                          <p className="text-[11px] uppercase tracking-wider text-gold font-bold flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm">auto_awesome</span>
                            Custom Gift Box Curation Manifest
                          </p>
                          {order.custom_gift_details && (
                            <div className="space-y-2 text-xs">
                              <div className="flex items-center gap-4 text-muted border-b border-gold/10 pb-2">
                                <span>Box Size: <strong className="text-gold">{order.custom_gift_details.boxSize}</strong></span>
                                <span>Box Color: <strong className="text-ivory">{order.custom_gift_details.boxColor}</strong></span>
                              </div>
                              {order.custom_gift_details.items && order.custom_gift_details.items.length > 0 && (
                                <div>
                                  <p className="text-[10px] uppercase text-muted tracking-wider mb-1">Chosen Products:</p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
                                    {order.custom_gift_details.items.map((item, iIdx) => (
                                      <div key={iIdx} className="flex items-center gap-1.5 text-ivory">
                                        <span className="text-gold font-bold">•</span>
                                        <span>{item.name}</span>
                                        <span className="text-muted text-[10px]">({item.quantity}x)</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {order.cart_items?.filter(i => (i as any).isCustomPreMadeBox && (i as any).preMadeCustomDetails).map((pmItem, pmIdx) => {
                            const pmDetails = (pmItem as any).preMadeCustomDetails;
                            return (
                              <div key={pmIdx} className="space-y-2 text-xs border-t border-gold/10 pt-2">
                                <p className="font-bold text-ivory text-xs">{pmItem.name}</p>
                                <div className="space-y-1 text-[11px]">
                                  {pmDetails.keptItems?.map((kItem: any, kIdx: number) => (
                                    <div key={kIdx} className="flex items-center gap-1.5 text-ivory">
                                      <span className="text-gold font-bold">✓</span>
                                      <span>{kItem.quantity}x {kItem.name}</span>
                                    </div>
                                  ))}
                                  {pmDetails.removedItems?.map((rItem: any, rIdx: number) => (
                                    <div key={rIdx} className="flex items-center gap-1.5 text-red-400/80 line-through">
                                      <span>✗</span>
                                      <span>{rItem.quantity}x {rItem.name} (Removed)</span>
                                    </div>
                                  ))}
                                  {pmDetails.extraAddedItems?.map((eItem: any, eIdx: number) => (
                                    <div key={eIdx} className="flex items-center gap-1.5 text-green-400">
                                      <span>+</span>
                                      <span>{eItem.quantity}x {eItem.name} (Extra Added)</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Gift details */}
                      {(order.gift_message || order.wrapping) && (
                        <div className="bg-background/50 rounded-lg border border-gold/10 p-4 space-y-2">
                          <p className="text-[10px] uppercase tracking-widest text-gold/70 mb-2">Presentation & Message</p>
                          {order.wrapping && (
                            <p className="text-xs text-muted flex items-center gap-2">
                              <span className="material-symbols-outlined text-sm text-gold/60">redeem</span>
                              {order.wrapping}
                            </p>
                          )}
                          {order.gift_message && (
                            <p className="text-xs text-muted italic flex items-start gap-2">
                              <span className="material-symbols-outlined text-sm text-gold/60 mt-0.5">message</span>
                              "{order.gift_message}"
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
                          <span>{order.delivery_fee === 0 ? 'Free' : `Rs.${order.delivery_fee.toLocaleString()}.00`}</span>
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
