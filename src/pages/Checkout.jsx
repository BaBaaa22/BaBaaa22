import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import {
  CreditCard, Banknote, ShoppingBag, MapPin, Clock, Loader2, XCircle,
  Truck, Store, Tag, CheckCircle2, ArrowLeft, ChevronDown, ChevronUp,
  Plus, Minus, Sparkles, Moon, Shield, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import MobileSelect from '../components/common/MobileSelect';
import AddressFields from '../components/checkout/AddressFields';

const CART_STORAGE_KEY = 'marcos_cart_draft';

const UPSELL_MAP = {
  'PIZZA': ['GARLIC BREAD', 'SIDE DISHES', 'DESSERT', 'DRINKS'],
  'KEBAB': ['SIDE DISHES', 'POTATO DISHES', 'DRINKS', 'DESSERT'],
  'BURGER': ['POTATO DISHES', 'SIDE DISHES', 'DRINKS', 'DESSERT'],
  'WRAP': ['SIDE DISHES', 'POTATO DISHES', 'DRINKS'],
  'PARMESAN': ['SIDE DISHES', 'DRINKS', 'DESSERT'],
  'GARLIC BREAD': ['SAUCES', 'DRINKS', 'DESSERT'],
  'SIDE': ['DRINKS', 'SAUCES', 'DESSERT'],
  'POTATO': ['SAUCES', 'DRINKS'],
  'DESSERT': ['DRINKS'],
  'KIDS': ['DRINKS', 'DESSERT'],
};

export default function Checkout() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const [orderType, setOrderType] = useState(urlParams.get('type') || 'collection');
  const postcode = urlParams.get('postcode') || '';
  const urlCharge = parseFloat(urlParams.get('charge') || '0');
  const [deliveryCharge, setDeliveryCharge] = useState(urlCharge);

  const [cart, setCart] = useState(() => {
    try { return JSON.parse(decodeURIComponent(urlParams.get('cart') || '[]')); } catch(e) { return []; }
  });

  const [storeSettings, setStoreSettings] = useState({ accept_card: true, accept_cash: true });
  const [menuItems, setMenuItems] = useState([]);
  const [isPreOrder, setIsPreOrder] = useState(false);
  const [nextOpenInfo, setNextOpenInfo] = useState('');
  const [showMobileSummary, setShowMobileSummary] = useState(false);

  const [form, setForm] = useState({
    name: '', phone: '', email: '',
    address: '', paymentMethod: 'cash', notes: ''
  });

  useEffect(() => {
    base44.entities.StoreSettings.filter({ setting_key: 'main' }).then(res => {
    if (res[0]) {
      const s = res[0];
      setStoreSettings(s);

      if (orderType === 'delivery' && postcode) {
        base44.functions.invoke('getDeliveryFee', { customer_postcode: postcode }).then(r => {
          if (r.data?.delivery_charge != null) setDeliveryCharge(r.data.delivery_charge);
          else setDeliveryCharge(s.default_delivery_charge ?? 2.5);
        }).catch(() => setDeliveryCharge(s.default_delivery_charge ?? 2.5));
      }

        const now = new Date();
        const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
        const isClosed = s.is_open === false;

        if (isClosed) {
          if (s.allow_preorders) {
            setIsPreOrder(true);
            setScheduleType('scheduled');
            let found = '';
            const nowMins = now.getHours() * 60 + now.getMinutes();
            for (let d = 0; d <= 7; d++) {
              const checkDate = new Date(now);
              checkDate.setDate(now.getDate() + (d === 0 ? 0 : d));
              const checkDay = days[checkDate.getDay()];
              const h = s.opening_hours?.find(hr => hr.day === checkDay);
              if (!h || h.is_closed) continue;
              const [oh, om] = h.open.split(':').map(Number);
              const openMins = oh * 60 + om;
              if (d === 0 && nowMins >= openMins) continue;
              const fmt = checkDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
              found = `${d === 0 ? 'Today' : fmt} at ${h.open}`;
              break;
            }
            setNextOpenInfo(found);
          } else {
            navigate(createPageUrl('Home'));
          }
        }
      }
    }).catch(() => {});
    base44.entities.MenuItem.list('sort_order', 200).then(items => {
      setMenuItems(items.filter(i => i.is_available));
    }).catch(() => {});
  }, []);

  const [scheduleType, setScheduleType] = useState('asap');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [paymentStep, setPaymentStep] = useState(null);
  const [paymentError, setPaymentError] = useState('');

  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  const getTimeSlots = () => {
    const slots = [];
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const selected = scheduledDate ? new Date(scheduledDate + 'T12:00:00') : new Date();
    const isToday = selected.toDateString() === new Date().toDateString();
    let startHour = 11, startMin = 0, endHour = 23, endMin = 0;
    const dayName = days[selected.getDay()];
    const hours = storeSettings.opening_hours?.find(h => h.day === dayName);
    if (hours && !hours.is_closed && hours.open && hours.close) {
      const [oh, om] = hours.open.split(':').map(Number);
      const [ch, cm] = hours.close.split(':').map(Number);
      startHour = oh; startMin = om; endHour = ch; endMin = cm;
    }
    let startMins = startHour * 60 + startMin;
    if (isToday && !isPreOrder) {
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes() + 30;
      startMins = Math.max(startMins, Math.ceil(nowMins / 15) * 15);
    }
    const endMins = endHour * 60 + endMin;
    for (let m = startMins; m <= endMins; m += 15) {
      const h = String(Math.floor(m / 60)).padStart(2, '0');
      const min = String(m % 60).padStart(2, '0');
      slots.push(`${h}:${min}`);
    }
    return slots;
  };

  const getDateOptions = () => {
    const opts = [];
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dayName = days[d.getDay()];
      if (isPreOrder) {
        if (i === 0) continue;
        const hours = storeSettings.opening_hours?.find(h => h.day === dayName);
        if (hours?.is_closed) continue;
      }
      const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
      opts.push({ value: d.toISOString().slice(0, 10), label });
    }
    return opts;
  };

  const subtotal = cart.reduce((s, i) => s + i.item_total, 0);
  const baseDelivery = orderType === 'delivery' ? deliveryCharge : 0;
  const computeDiscount = (coupon, sub) => {
    if (!coupon) return 0;
    if (coupon.discount_type === 'percent') return parseFloat(((sub * coupon.discount_value) / 100).toFixed(2));
    return Math.min(coupon.discount_value, sub);
  };
  const discountAmount = computeDiscount(appliedCoupon, subtotal);
  const freeDelivery = appliedCoupon?.free_delivery;
  const deliveryAfterCoupon = freeDelivery ? 0 : baseDelivery;
  const total = Math.max(0, subtotal - discountAmount + deliveryAfterCoupon);

  const applyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true); setCouponError(''); setAppliedCoupon(null);
    const coupons = await base44.entities.Coupon.filter({ code: couponInput.trim().toUpperCase() });
    setCouponLoading(false);
    if (!coupons || coupons.length === 0) { setCouponError('Invalid coupon code.'); return; }
    const c = coupons[0];
    if (!c.is_active) { setCouponError('This coupon is no longer active.'); return; }
    if (c.expiry_date && new Date(c.expiry_date) < new Date()) { setCouponError('This coupon has expired.'); return; }
    if (c.min_order_value > 0 && subtotal < c.min_order_value) { setCouponError(`Minimum order of £${Number(c.min_order_value).toFixed(2)} required.`); return; }
    if (c.applies_to === 'delivery' && orderType !== 'delivery') { setCouponError('This coupon is only valid for delivery orders.'); return; }
    if (c.applies_to === 'collection' && orderType !== 'collection') { setCouponError('This coupon is only valid for collection orders.'); return; }
    setAppliedCoupon(c); setCouponError('');
  };
  const removeCoupon = () => { setAppliedCoupon(null); setCouponInput(''); setCouponError(''); };

  const placeOrderInDb = async () => {
    const orderNumber = 'MRC-' + Date.now().toString(36).toUpperCase();
    const scheduledTimeValue = scheduleType === 'scheduled' && scheduledDate && scheduledTime ? `${scheduledDate}T${scheduledTime}` : null;
    const order = await base44.entities.Order.create({
      order_number: orderNumber, order_type: orderType, status: 'received',
      customer_name: form.name, customer_phone: form.phone, customer_email: form.email,
      delivery_address: orderType === 'delivery' ? form.address : '',
      delivery_postcode: postcode, items: cart, subtotal,
      delivery_charge: deliveryAfterCoupon, discount_amount: discountAmount,
      coupon_code: appliedCoupon?.code || '', total,
      payment_method: form.paymentMethod, payment_status: 'pending',
      notes: form.notes + (scheduledTimeValue ? `\nScheduled for: ${scheduledDate} at ${scheduledTime}` : '')
    });
    base44.functions.invoke('sendOrderEmail', { data: order }).catch(() => {});
    navigate(createPageUrl('OrderStatus') + `?id=${order.id}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isPreOrder && (!scheduledDate || !scheduledTime)) {
      setPaymentError('Please select a future pickup/delivery time before placing your pre-order.');
      return;
    }
    setSubmitting(true); setPaymentError('');

    if (form.paymentMethod === 'cash') { await placeOrderInDb(); return; }

    if (total <= 0) {
      setPaymentError('Your cart appears to be empty.');
      setPaymentStep('failed'); setSubmitting(false); return;
    }

    if (total < 0.75) {
      setPaymentError('Card payments require a minimum order of £0.75. Please pay with cash or add more items.');
      setPaymentStep('failed'); setSubmitting(false); return;
    }

    setPaymentStep('processing');
    const reference = 'MRC-' + Date.now().toString(36).toUpperCase();
    const paymentWindow = window.open('about:blank', '_blank');
    let createdOrder = null;
    try {
      const scheduledTimeValue = scheduleType === 'scheduled' && scheduledDate && scheduledTime ? `${scheduledDate}T${scheduledTime}` : null;
      createdOrder = await base44.entities.Order.create({
        order_number: reference, order_type: orderType, status: 'received',
        customer_name: form.name, customer_phone: form.phone, customer_email: form.email,
        delivery_address: orderType === 'delivery' ? form.address : '',
        delivery_postcode: postcode, items: cart, subtotal,
        delivery_charge: deliveryAfterCoupon, discount_amount: discountAmount,
        coupon_code: appliedCoupon?.code || '', total, payment_method: 'card', payment_status: 'pending',
        notes: form.notes + (scheduledTimeValue ? `\nScheduled for: ${scheduledDate} at ${scheduledTime}` : '')
      });
    } catch (err) {
      paymentWindow?.close();
      setPaymentError('Could not create order: ' + (err?.response?.data?.detail || err?.message || 'Please try again.'));
      setPaymentStep('failed'); setSubmitting(false); return;
    }

    const successUrl = window.location.origin + '/OrderStatus?id=' + createdOrder.id;
    const cancelUrl = window.location.origin + '/Checkout?type=' + orderType + (postcode ? '&postcode=' + postcode : '') + '&charge=' + deliveryCharge;
    const ipnUrl = 'https://app-api.base44.com/api/apps/69ab3c5ee6dd34e24ec02946/functions/neropayIPN';

    let res = null;
    try {
      res = await base44.functions.invoke('neropayCreateCheckout', {
        amount: total, reference, description: `Marco's Order - ${form.name}`,
        success_url: successUrl, cancel_url: cancelUrl, ipn_url: ipnUrl,
      });
    } catch (err) {
      paymentWindow?.close();
      setPaymentError(err?.response?.data?.error || err?.response?.data?.debug?.message || err?.message || 'Could not initiate payment.');
      setPaymentStep('failed'); setSubmitting(false); return;
    }

    const hostedUrl = res?.data?.checkout_url;
    if (!hostedUrl) {
      paymentWindow?.close();
      setPaymentError(res?.data?.error || 'Could not initiate payment.');
      setPaymentStep('failed'); setSubmitting(false); return;
    }
    paymentWindow.location.href = hostedUrl;
  };

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleAddMoreItems = () => {
    try { sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart)); } catch {}
    navigate(createPageUrl('MenuPage') + `?type=${orderType}&postcode=${postcode}&charge=${deliveryCharge}`);
  };

  const addUpsellToCart = (menuItem) => {
    setCart(prev => {
      const existing = prev.findIndex(i => i.item_name === menuItem.name && (!i.modifiers || i.modifiers.length === 0));
      if (existing >= 0) {
        return prev.map((i, idx) => idx === existing
          ? { ...i, quantity: i.quantity + 1, item_total: parseFloat(((i.quantity + 1) * menuItem.base_price).toFixed(2)) }
          : i
        );
      }
      return [...prev, { item_name: menuItem.name, quantity: 1, base_price: menuItem.base_price, modifiers: [], item_total: menuItem.base_price }];
    });
  };

  const getUpsells = () => {
    if (!menuItems.length) return [];
    const cartItemNames = new Set(cart.map(i => i.item_name));
    const cartCategories = [...new Set(cart.map(i => {
      const found = menuItems.find(m => m.name === i.item_name);
      return found?.category?.toUpperCase() || '';
    }).filter(Boolean))];
    const suggestedCategories = [];
    cartCategories.forEach(cartCat => {
      Object.entries(UPSELL_MAP).forEach(([key, suggestions]) => {
        if (cartCat.includes(key) || key.includes(cartCat)) {
          suggestions.forEach(s => { if (!suggestedCategories.includes(s)) suggestedCategories.push(s); });
        }
      });
    });
    if (suggestedCategories.length === 0) ['SIDE DISHES', 'GARLIC BREAD', 'DRINKS', 'DESSERT'].forEach(s => suggestedCategories.push(s));
    const filteredSuggested = suggestedCategories.filter(sugCat =>
      !cartCategories.some(cartCat => cartCat.includes(sugCat) || sugCat.includes(cartCat))
    );
    const suggestions = [];
    filteredSuggested.forEach(cat => {
      const limit = cat.includes('DRINK') ? 2 : 1;
      const matches = menuItems.filter(m => m.category?.toUpperCase().includes(cat) && !cartItemNames.has(m.name));
      matches.slice(0, limit).forEach(item => { if (!suggestions.find(s => s.id === item.id)) suggestions.push(item); });
    });
    return suggestions.slice(0, 6);
  };

  const upsells = getUpsells();
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  // --- Overlays ---
  if (paymentStep === 'processing') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-10 max-w-sm w-full text-center shadow-sm">
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
          <h2 className="font-bold text-gray-900 text-lg mb-2">Setting Up Payment</h2>
          <p className="text-sm text-gray-500">Redirecting you to the payment page…</p>
        </div>
      </div>
    );
  }

  if (paymentStep === 'failed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-10 max-w-sm w-full text-center shadow-sm">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="font-bold text-gray-900 text-lg mb-2">Payment Failed</h2>
          <p className="text-sm text-gray-500 mb-6">{paymentError}</p>
          <button onClick={() => { setPaymentStep(null); setSubmitting(false); }}
            className="w-full py-3.5 bg-orange-500 text-white rounded-xl font-semibold text-sm hover:bg-orange-600 transition-colors">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all placeholder:text-gray-400 bg-white";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1.5";

  return (
    <div className="min-h-screen bg-gray-50" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 h-14 flex items-center gap-3 shadow-sm">
        <button onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center shadow">
            <span className="text-xs font-black text-white">M</span>
          </div>
          <span className="font-bold text-gray-900 text-sm">Checkout</span>
        </div>
        {/* Mobile cart pill */}
        <button onClick={() => setShowMobileSummary(s => !s)}
          className="ml-auto lg:hidden flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded-full px-3 py-1.5 text-orange-600 text-xs font-semibold">
          <ShoppingBag className="w-3.5 h-3.5" />
          {cartCount} item{cartCount !== 1 ? 's' : ''} · £{total.toFixed(2)}
          {showMobileSummary ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Pre-order banner */}
      {isPreOrder && (
        <div className="mx-4 mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <Moon className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-700 font-semibold text-sm">We are currently closed</p>
            {nextOpenInfo && <p className="text-amber-600 text-xs mt-0.5">Next opening: {nextOpenInfo}</p>}
            <p className="text-green-600 text-xs mt-1 font-medium">✓ Pre-orders accepted — select a future time below</p>
          </div>
        </div>
      )}

      {/* Mobile order summary slide-down */}
      {showMobileSummary && (
        <div className="lg:hidden mx-4 mt-3 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-3">
          {cart.map((item, idx) => (
            <div key={idx} className="flex justify-between items-start text-sm">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-[10px] font-bold flex items-center justify-center shrink-0">{item.quantity}</span>
                  <span className="font-medium text-gray-800 truncate">{item.item_name}</span>
                </div>
                {item.modifiers?.map((m, mi) => <p key={mi} className="text-xs text-gray-400 ml-7">+ {m.option_name}</p>)}
              </div>
              <span className="font-semibold text-gray-800 ml-3 shrink-0">£{item.item_total.toFixed(2)}</span>
            </div>
          ))}
          <div className="border-t border-gray-100 pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>£{subtotal.toFixed(2)}</span></div>
            {orderType === 'delivery' && (
              <div className="flex justify-between text-gray-500">
                <span>Delivery</span>
                <span>{freeDelivery ? <><s className="text-gray-400 mr-1">£{baseDelivery.toFixed(2)}</s><span className="text-green-600">Free</span></> : `£${deliveryAfterCoupon.toFixed(2)}`}</span>
              </div>
            )}
            {discountAmount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>−£{discountAmount.toFixed(2)}</span></div>}
            <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-100"><span>Total</span><span className="text-orange-500">£{total.toFixed(2)}</span></div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="max-w-5xl mx-auto px-4 py-5 grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* ── LEFT: Form ── */}
          <div className="lg:col-span-3 space-y-4">

            {/* Order Type */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h3 className="font-semibold text-gray-900 text-sm mb-4 flex items-center gap-2">
                <Truck className="w-4 h-4 text-orange-500" />
                How would you like to receive your order?
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'delivery', label: 'Delivery', sub: deliveryCharge > 0 ? `£${deliveryCharge.toFixed(2)} fee` : 'Fee varies', Icon: Truck },
                  { value: 'collection', label: 'Pickup', sub: 'Free', Icon: Store },
                ].map(({ value, label, sub, Icon }) => (
                  <button key={value} type="button" onClick={() => setOrderType(value)}
                    className={cn(
                      "relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left",
                      orderType === value ? "border-orange-400 bg-orange-50" : "border-gray-200 hover:border-gray-300 bg-white"
                    )}>
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", orderType === value ? "bg-orange-100" : "bg-gray-100")}>
                      <Icon className={cn("w-4 h-4", orderType === value ? "text-orange-500" : "text-gray-400")} />
                    </div>
                    <div>
                      <p className={cn("font-semibold text-sm", orderType === value ? "text-gray-900" : "text-gray-600")}>{label}</p>
                      <p className={cn("text-xs", orderType === value ? "text-orange-500" : "text-gray-400")}>{sub}</p>
                    </div>
                    {orderType === value && (
                      <CheckCircle2 className="absolute top-3 right-3 w-4 h-4 text-orange-500" />
                    )}
                  </button>
                ))}
              </div>

              {/* Delivery address fields */}
              {orderType === 'delivery' && (
                <AddressFields
                  postcode={postcode}
                  address={form.address}
                  onAddressChange={(addr) => update('address', addr)}
                />
              )}
            </div>

            {/* Your Details */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h3 className="font-semibold text-gray-900 text-sm mb-4">Your Details</h3>
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Full Name *</label>
                  <input className={inputCls} value={form.name} onChange={e => update('name', e.target.value)} required placeholder="John Smith" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Phone Number *</label>
                    <input className={inputCls} type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} required placeholder="07700 000000" />
                  </div>
                  <div>
                    <label className={labelCls}>Email <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input className={inputCls} type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="john@example.com" />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h3 className="font-semibold text-gray-900 text-sm mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-orange-500" />
                Payment Method
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {storeSettings.accept_card !== false && (
                  <button type="button" onClick={() => update('paymentMethod', 'card')}
                    className={cn("relative flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left",
                      form.paymentMethod === 'card' ? "border-orange-400 bg-orange-50" : "border-gray-200 hover:border-gray-300")}>
                    <div className={cn("w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center",
                      form.paymentMethod === 'card' ? "border-orange-500" : "border-gray-300")}>
                      {form.paymentMethod === 'card' && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-800">Card</p>
                      <p className="text-xs text-gray-500 mt-0.5">You will be redirected to complete payment securely.</p>
                    </div>
                    {form.paymentMethod === 'card' && <CheckCircle2 className="absolute top-3 right-3 w-4 h-4 text-orange-500" />}
                  </button>
                )}
                {storeSettings.accept_cash !== false && (
                  <button type="button" onClick={() => update('paymentMethod', 'cash')}
                    className={cn("relative flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left",
                      form.paymentMethod === 'cash' ? "border-orange-400 bg-orange-50" : "border-gray-200 hover:border-gray-300")}>
                    <div className={cn("w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center",
                      form.paymentMethod === 'cash' ? "border-orange-500" : "border-gray-300")}>
                      {form.paymentMethod === 'cash' && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-800">Cash</p>
                      <p className="text-xs text-gray-500 mt-0.5">Pay when you receive your order</p>
                    </div>
                    {form.paymentMethod === 'cash' && <CheckCircle2 className="absolute top-3 right-3 w-4 h-4 text-orange-500" />}
                  </button>
                )}
              </div>
            </div>

            {/* When? */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h3 className="font-semibold text-gray-900 text-sm mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                When?
              </h3>
              {isPreOrder ? (
                <div className="mb-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-600 font-semibold flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 shrink-0" /> Please select a future time — we are currently closed
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[{ value: 'asap', label: 'ASAP' }, { value: 'scheduled', label: 'Schedule' }].map(({ value, label }) => (
                    <button key={value} type="button" onClick={() => setScheduleType(value)}
                      className={cn("py-3 rounded-xl border-2 text-sm font-semibold transition-all",
                        scheduleType === value ? "border-orange-400 bg-orange-50 text-orange-600" : "border-gray-200 text-gray-500 hover:border-gray-300")}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
              {scheduleType === 'scheduled' && (
                <div className="space-y-3">
                  <div>
                    <label className={labelCls}>Date</label>
                    <MobileSelect value={scheduledDate} onChange={(v) => { setScheduledDate(v); setScheduledTime(''); }}
                      label="Select Date" placeholder="Select date…" options={getDateOptions()} className="mt-1 w-full" />
                  </div>
                  {scheduledDate && (
                    <div>
                      <label className={labelCls}>Time</label>
                      <MobileSelect value={scheduledTime} onChange={setScheduledTime}
                        label="Select Time" placeholder="Select time…"
                        options={getTimeSlots().map(t => ({ value: t, label: t }))} className="mt-1 w-full" />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Special Instructions */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h3 className="font-semibold text-gray-900 text-sm mb-3">Special Instructions</h3>
              <textarea className={cn(inputCls, "resize-none")}
                placeholder="Allergies, extra sauces, ring doorbell…"
                value={form.notes} onChange={e => update('notes', e.target.value)} rows={2} />
            </div>

            {/* Complete your meal — mobile upsells */}
            {upsells.length > 0 && (
              <div className="lg:hidden bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <h3 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orange-500" /> Complete your meal
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {upsells.map(item => {
                    const inCart = cart.some(i => i.item_name === item.name);
                    return (
                      <button key={item.id} type="button" onClick={() => addUpsellToCart(item)}
                        className={cn("flex items-center justify-between rounded-xl px-3 py-2.5 transition-all border text-left",
                          inCart ? "bg-green-50 border-green-200" : "bg-gray-50 hover:bg-orange-50 border-gray-200 hover:border-orange-200")}>
                        <div className="min-w-0 flex-1">
                          <p className={cn("text-xs font-semibold truncate", inCart ? "text-green-700" : "text-gray-700")}>{item.name}</p>
                          <p className="text-[10px] text-gray-400">£{item.base_price.toFixed(2)}</p>
                        </div>
                        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ml-2",
                          inCart ? "bg-green-500" : "bg-orange-500")}>
                          {inCart ? '✓' : '+'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mobile place order */}
            {paymentError && !submitting && (
              <div className="lg:hidden text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                {paymentError}
              </div>
            )}
            <div className="lg:hidden pb-6">
              <button type="submit" disabled={submitting}
                className="w-full py-4 bg-gray-800 text-white rounded-xl font-bold text-base hover:bg-gray-900 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting
                  ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing…</>
                  : <>{isPreOrder ? 'Pre-Order' : 'Place Order'} · £{total.toFixed(2)}</>
                }
              </button>
              <p className="text-center text-xs text-gray-400 mt-2 flex items-center justify-center gap-1">
                <Shield className="w-3 h-3" /> Secure Checkout
              </p>
            </div>
          </div>

          {/* ── RIGHT: Order Summary ── */}
          <div className="hidden lg:block lg:col-span-2">
            <div className="sticky top-20 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-orange-500" />
                  Order Summary
                </h2>
                <button type="button" onClick={handleAddMoreItems}
                  className="text-xs text-gray-400 hover:text-gray-600 font-medium transition-colors">Clear</button>
              </div>

              {/* Items */}
              <div className="px-5 py-4 space-y-3 max-h-52 overflow-y-auto border-b border-gray-100">
                {cart.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start text-sm">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button type="button" onClick={() => {
                          if (item.quantity <= 1) setCart(prev => prev.filter((_, i) => i !== idx));
                          else setCart(prev => prev.map((it, i) => i === idx ? { ...it, quantity: it.quantity - 1, item_total: parseFloat(((it.quantity - 1) * it.base_price).toFixed(2)) } : it));
                        }} className="w-5 h-5 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-100 text-xs">−</button>
                        <span className="text-gray-700 font-semibold w-4 text-center text-xs">{item.quantity}</span>
                        <button type="button" onClick={() => setCart(prev => prev.map((it, i) => i === idx ? { ...it, quantity: it.quantity + 1, item_total: parseFloat(((it.quantity + 1) * it.base_price).toFixed(2)) } : it))}
                          className="w-5 h-5 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-100 text-xs">+</button>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-gray-800 font-medium truncate">{item.item_name}</p>
                        {item.modifiers?.map((m, mi) => <p key={mi} className="text-xs text-gray-400">+ {m.option_name} {m.price_adjustment > 0 ? `+£${m.price_adjustment.toFixed(2)}` : ''}</p>)}
                      </div>
                    </div>
                    <span className="font-semibold text-gray-800 ml-2 shrink-0">£{item.item_total.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Add more */}
              <div className="px-5 py-3 border-b border-gray-100">
                <button type="button" onClick={handleAddMoreItems}
                  className="text-orange-500 hover:text-orange-600 text-sm font-semibold flex items-center gap-1.5 transition-colors">
                  <Plus className="w-4 h-4" /> Add more items
                </button>
              </div>

              {/* Promo Code */}
              <div className="px-5 py-4 border-b border-gray-100">
                <h4 className="text-sm font-semibold text-gray-700 mb-2.5 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-orange-500" /> Promo Code
                </h4>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-green-700">{appliedCoupon.code}</p>
                        <p className="text-xs text-green-600">
                          {appliedCoupon.discount_type === 'percent' ? `${appliedCoupon.discount_value}% off` : `£${appliedCoupon.discount_value} off`}
                          {appliedCoupon.free_delivery ? ' + Free delivery' : ''}
                        </p>
                      </div>
                    </div>
                    <button type="button" onClick={removeCoupon} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <input type="text" placeholder="Enter code"
                        value={couponInput}
                        onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), applyCoupon())}
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 uppercase placeholder:normal-case placeholder:text-gray-400" />
                      <button type="button" onClick={applyCoupon} disabled={couponLoading || !couponInput.trim()}
                        className="px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-gray-700 transition-colors">
                        {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                      </button>
                    </div>
                    {couponError && <p className="text-xs text-red-500 mt-1.5">{couponError}</p>}
                  </>
                )}
              </div>

              {/* Upsells */}
              {upsells.length > 0 && (
                <div className="px-5 py-3 border-b border-gray-100">
                  <p className="text-[10px] font-semibold text-orange-500 flex items-center gap-1 mb-1.5">
                    <Sparkles className="w-2.5 h-2.5" /> Complete your meal
                  </p>
                  <div className="space-y-1">
                    {upsells.map(item => {
                      const inCart = cart.some(i => i.item_name === item.name);
                      return (
                        <button key={item.id} type="button" onClick={() => addUpsellToCart(item)}
                          className={cn("w-full flex items-center justify-between rounded-lg px-2 py-1.5 transition-all border text-left text-xs",
                            inCart ? "bg-green-50 border-green-200" : "bg-gray-50 hover:bg-orange-50 border-gray-200 hover:border-orange-200")}>
                          <div className="min-w-0 flex-1">
                            <p className={cn("text-[11px] font-semibold truncate", inCart ? "text-green-700" : "text-gray-700")}>{item.name}</p>
                            <p className="text-[9px] text-gray-400">£{item.base_price.toFixed(2)}</p>
                          </div>
                          <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ml-1",
                            inCart ? "bg-green-500" : "bg-orange-500")}>
                            {inCart ? '✓' : '+'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Totals */}
              <div className="px-5 py-4 space-y-2 text-sm border-b border-gray-100">
                <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>£{subtotal.toFixed(2)}</span></div>
                {orderType === 'delivery' && (
                  <div className="flex justify-between text-gray-500">
                    <span>Delivery</span>
                    <span>{freeDelivery
                      ? <><s className="text-gray-400 mr-1">£{baseDelivery.toFixed(2)}</s><span className="text-green-600">Free</span></>
                      : `£${deliveryAfterCoupon.toFixed(2)}`}</span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>Discount ({appliedCoupon.code})</span>
                    <span>−£{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-100">
                  <span>Total</span>
                  <span className="text-orange-500">£{total.toFixed(2)}</span>
                </div>
              </div>

              {/* Place Order */}
              <div className="px-5 py-4 space-y-2">
                {paymentError && !submitting && (
                  <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{paymentError}</p>
                )}
                <button type="submit" disabled={submitting}
                  className="w-full py-3.5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm">
                  {submitting
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                    : <>{isPreOrder ? 'Pre-Order' : 'Place Order'} <Shield className="w-3.5 h-3.5 opacity-60" /></>
                  }
                </button>
                <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1">
                  <Shield className="w-3 h-3" /> Secure Checkout
                </p>
              </div>
            </div>
          </div>

        </div>
      </form>
    </div>
  );
}