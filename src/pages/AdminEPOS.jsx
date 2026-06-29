import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import {
  Truck, ShoppingBag, UtensilsCrossed, Clock, X, Plus, Minus, Trash2,
  Phone, MapPin, Check, User, ChefHat, Package, CheckCircle2, XCircle,
  Search, ArrowLeft, Printer, Edit2, MoreVertical, Settings2, ChevronLeft,
  Link2, Bell, BellOff, UserX, CreditCard, Banknote
} from 'lucide-react';
import { differenceInMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const CATEGORY_ORDER = [
  'Special Offers','Basic Pizzas','Ham Pizzas','Chicken Pizzas','Hot & Spicy Pizzas',
  'Hot and Spicy Pizzas','Special Mix Pizzas','Seafood Pizzas','Half & Half Pizzas',
  'Garlic Bread','Kebabs','Burgers','Parmesan','Wraps','Potato Dishes','Side Dishes',
  'Special Dishes','Sauces','Tub of Sauces','Kids Meal','Kids Meals','Dessert','Desserts','Drinks',
];

const CATEGORY_COLORS = {
  'Special Offers': 'bg-orange-500 hover:bg-orange-600',
  'Basic Pizzas': 'bg-[#3a8fa0] hover:bg-[#2e7a8a]',
  'Ham Pizzas': 'bg-[#3a8fa0] hover:bg-[#2e7a8a]',
  'Chicken Pizzas': 'bg-[#3a8fa0] hover:bg-[#2e7a8a]',
  'Hot & Spicy Pizzas': 'bg-[#c0392b] hover:bg-red-700',
  'Hot and Spicy Pizzas': 'bg-[#c0392b] hover:bg-red-700',
  'Special Mix Pizzas': 'bg-[#3a8fa0] hover:bg-[#2e7a8a]',
  'Seafood Pizzas': 'bg-[#3a8fa0] hover:bg-[#2e7a8a]',
  'Half & Half Pizzas': 'bg-[#3a8fa0] hover:bg-[#2e7a8a]',
  'Garlic Bread': 'bg-[#3a8fa0] hover:bg-[#2e7a8a]',
  'Kebabs': 'bg-[#3a8fa0] hover:bg-[#2e7a8a]',
  'Burgers': 'bg-[#3a8fa0] hover:bg-[#2e7a8a]',
  'Parmesan': 'bg-[#3a8fa0] hover:bg-[#2e7a8a]',
  'Wraps': 'bg-[#3a8fa0] hover:bg-[#2e7a8a]',
  'Potato Dishes': 'bg-[#3a8fa0] hover:bg-[#2e7a8a]',
  'Side Dishes': 'bg-[#c0392b] hover:bg-red-700',
  'Special Dishes': 'bg-[#c0392b] hover:bg-red-700',
  'Sauces': 'bg-[#c0392b] hover:bg-red-700',
  'Tub of Sauces': 'bg-[#c0392b] hover:bg-red-700',
  'Kids Meal': 'bg-[#2ecc71] hover:bg-green-600',
  'Kids Meals': 'bg-[#2ecc71] hover:bg-green-600',
  'Dessert': 'bg-green-600 hover:bg-green-700',
  'Desserts': 'bg-green-600 hover:bg-green-700',
  'Drinks': 'bg-gray-800 hover:bg-gray-900',
};
const DEFAULT_COLOR = 'bg-[#3a8fa0] hover:bg-[#2e7a8a]';

const STATUS_FLOW = ['received', 'in_kitchen', 'ready', 'completed'];
const STATUS_CONFIG = {
  received:  { label: 'New',       bg: 'bg-blue-500',   icon: Clock },
  in_kitchen: { label: 'Preparing', bg: 'bg-orange-500', icon: ChefHat },
  ready:     { label: 'Ready',     bg: 'bg-green-600',  icon: Package },
  completed: { label: 'Done',      bg: 'bg-gray-400',   icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', bg: 'bg-red-400',    icon: XCircle },
};

// AI kitchen-station colours (written by the claudeAssist function, trigger T1)
const AI_STATION_COLORS = {
  pizza: 'bg-[#c0392b]', fryer: 'bg-amber-600', grill: 'bg-orange-700',
  cold: 'bg-teal-600', drinks: 'bg-gray-700', dessert: 'bg-green-600', unassigned: 'bg-slate-400',
};

function playOrderAlert() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const playBeep = (freq, start, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq; osc.type = 'sine';
      gain.gain.setValueAtTime(0.4, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      osc.start(ctx.currentTime + start); osc.stop(ctx.currentTime + start + duration);
    };
    playBeep(880, 0, 0.15); playBeep(1100, 0.18, 0.15); playBeep(1320, 0.36, 0.25);
  } catch (e) { console.warn('Audio alert failed', e); }
}

function PayByLinkModal({ onClose, onSend }) {
  const [phone, setPhone] = useState('');
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-sm mx-4 overflow-hidden shadow-2xl">
        <div className="bg-[#3a8fa0] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><Link2 className="w-5 h-5 text-white" /><h3 className="text-white font-bold">Send Pay by Link</h3></div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-500">Enter the customer's phone number to send them a payment link.</p>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
            <Phone className="w-4 h-4 text-gray-400 shrink-0" />
            <input autoFocus type="tel" placeholder="07700 900000" value={phone} onChange={e => setPhone(e.target.value)}
              className="bg-transparent text-gray-800 text-sm placeholder-gray-400 outline-none flex-1" />
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 font-medium text-sm">Cancel</button>
          <button onClick={() => { if (phone.trim()) { onSend(phone.trim()); onClose(); } }} disabled={!phone.trim()}
            className="flex-1 py-2.5 bg-[#3a8fa0] hover:bg-[#2e7a8a] text-white rounded-xl font-bold text-sm disabled:opacity-40">Send Link</button>
        </div>
      </div>
    </div>
  );
}

function NewOrderAlertBanner({ count, onAccept }) {
  if (count === 0) return null;
  return (
    <div className="fixed top-12 left-0 right-0 z-40 flex items-center justify-between bg-red-600 text-white px-4 py-2.5 shadow-lg animate-pulse">
      <div className="flex items-center gap-2 font-bold text-sm"><Bell className="w-4 h-4" />{count} new order{count > 1 ? 's' : ''} waiting to be accepted!</div>
      <button onClick={onAccept} className="flex items-center gap-1.5 bg-white text-red-600 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
        <Check className="w-3.5 h-3.5" /> Accept Orders
      </button>
    </div>
  );
}

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
  return <span className="text-sm font-semibold text-gray-600 tabular-nums">{format(time, 'HH:mm')}</span>;
}

function ModifierModal({ item, onAdd, onClose }) {
  const [qty, setQty] = useState(1);
  const [sel, setSel] = useState(() => {
    const init = {};
    (item.modifier_groups || []).forEach((g, gi) => {
      if (g.is_required && g.min_selections >= 1) {
        const first = g.options?.find(o => o.is_available !== false);
        if (first) init[gi] = [first.name];
      } else init[gi] = [];
    });
    return init;
  });
  const groups = item.modifier_groups || [];
  const toggle = (gi, name, max) => {
    setSel(prev => {
      const cur = prev[gi] || [];
      if (max === 1) return { ...prev, [gi]: cur[0] === name ? [] : [name] };
      if (cur.includes(name)) return { ...prev, [gi]: cur.filter(n => n !== name) };
      if (cur.length >= max) return prev;
      return { ...prev, [gi]: [...cur, name] };
    });
  };
  const price = () => {
    let p = item.base_price;
    groups.forEach((g, gi) => { (sel[gi] || []).forEach(n => { const o = g.options?.find(x => x.name === n); if (o) p += o.price_adjustment || 0; }); });
    return p * qty;
  };
  const valid = groups.every((g, gi) => !g.is_required || (sel[gi] || []).length >= (g.min_selections || 0));
  const commit = () => {
    const mods = [];
    groups.forEach((g, gi) => { (sel[gi] || []).forEach(n => { const o = g.options?.find(x => x.name === n); mods.push({ group_name: g.name, option_name: n, price_adjustment: o?.price_adjustment || 0 }); }); });
    onAdd({ item_name: item.name, quantity: qty, base_price: item.base_price, modifiers: mods, item_total: price() });
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-lg mx-4 overflow-hidden shadow-2xl">
        <div className="bg-gray-50 px-5 py-4 flex items-center justify-between border-b">
          <div><h3 className="text-gray-900 font-bold text-lg">{item.name}</h3><p className="text-gray-500 text-sm">From £{item.base_price.toFixed(2)}</p></div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-300"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-5 max-h-[50vh] overflow-y-auto">
          {groups.map((g, gi) => (
            <div key={gi}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-gray-800 font-semibold text-sm">{g.name}</span>
                {g.is_required && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded uppercase">Required</span>}
                {g.max_selections > 1 && <span className="text-gray-400 text-xs">up to {g.max_selections}</span>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {g.options?.filter(o => o.is_available !== false).map(opt => {
                  const active = (sel[gi] || []).includes(opt.name);
                  return (
                    <button key={opt.name} onClick={() => toggle(gi, opt.name, g.max_selections)}
                      className={cn("flex items-center justify-between px-3 py-2.5 rounded-xl text-sm border transition-all",
                        active ? "bg-[#3a8fa0] border-[#3a8fa0] text-white" : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100")}>
                      <span>{opt.name}</span>
                      <span className={active ? "text-white/80" : "text-gray-400"}>{opt.price_adjustment > 0 ? `+£${opt.price_adjustment.toFixed(2)}` : active ? <Check className="w-3.5 h-3.5" /> : ''}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="bg-gray-50 px-5 py-4 flex items-center gap-4 border-t">
          <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-3 py-2">
            <button onClick={() => setQty(q => Math.max(1, q - 1))} className="text-gray-400 hover:text-gray-700"><Minus className="w-4 h-4" /></button>
            <span className="text-gray-900 font-bold w-6 text-center">{qty}</span>
            <button onClick={() => setQty(q => q + 1)} className="text-gray-400 hover:text-gray-700"><Plus className="w-4 h-4" /></button>
          </div>
          <button onClick={commit} disabled={!valid}
            className={cn("flex-1 py-3 rounded-xl font-bold text-sm transition-all", valid ? "bg-[#3a8fa0] hover:bg-[#2e7a8a] text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed")}>
            Add to Order — £{price().toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
}

function OrderBasket({ basket, orderType, setOrderType, onRemove, onQtyChange, onClear, onPlaceOrder, deliveryCharge }) {
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '', notes: '' });
  const [payment, setPayment] = useState('cash');
  const [skipDetails, setSkipDetails] = useState(false);
  const [showPayLink, setShowPayLink] = useState(false);
  const subtotal = basket.reduce((s, i) => s + i.item_total, 0);
  const charge = orderType === 'delivery' ? deliveryCharge : 0;
  const total = subtotal + charge;
  const effectiveCustomer = skipDetails ? { name: 'Walk-in', phone: '', address: '', notes: customer.notes } : customer;
  const canPlace = basket.length > 0 && (skipDetails || (customer.name && customer.phone));
  const doCheckout = () => { if (!canPlace) return; onPlaceOrder(effectiveCustomer, payment, total, subtotal, charge); setCustomer({ name: '', phone: '', address: '', notes: '' }); };
  const handlePayByLink = (phone) => {
    const c = skipDetails ? { name: 'Walk-in', phone, address: '', notes: customer.notes } : { ...customer, phone };
    onPlaceOrder(c, 'card', total, subtotal, charge);
    setCustomer({ name: '', phone: '', address: '', notes: '' });
  };
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="grid grid-cols-3 gap-0 border-b">
        <button onClick={() => setPayment('cash')} className={cn("py-3 text-sm font-semibold transition-all border-r", payment === 'cash' ? "bg-[#5cb85c] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200")}>💵 CASH</button>
        <button onClick={() => setPayment('card')} className={cn("py-3 text-sm font-semibold transition-all border-r", payment === 'card' ? "bg-[#5cb85c] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200")}>💳 CARD</button>
        <button onClick={doCheckout} className={cn("py-3 text-sm font-bold transition-all", canPlace ? "bg-[#5cb85c] text-white hover:bg-green-600" : "bg-[#5cb85c] text-white opacity-50 cursor-not-allowed")}>CHECKOUT</button>
      </div>
      <div className="border-b">
        <button onClick={() => basket.length > 0 && setShowPayLink(true)} disabled={basket.length === 0}
          className={cn("w-full py-2.5 flex items-center justify-center gap-2 text-sm font-semibold transition-all", basket.length > 0 ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-gray-100 text-gray-400 cursor-not-allowed")}>
          <Link2 className="w-4 h-4" /> PAY BY LINK
        </button>
      </div>
      <div className="px-4 py-2.5 flex items-center justify-between border-b">
        <span className="text-gray-700 font-semibold text-sm">Total</span>
        <span className="text-gray-900 font-bold text-lg">£{total.toFixed(2)}</span>
      </div>
      <div className="grid grid-cols-3 gap-1 px-3 py-2 border-b bg-gray-50">
        {[{ key: 'delivery', label: 'Delivery', icon: Truck }, { key: 'collection', label: 'Collection', icon: ShoppingBag }, { key: 'eat_in', label: 'Eat In', icon: UtensilsCrossed }].map(t => (
          <button key={t.key} onClick={() => setOrderType(t.key)}
            className={cn("py-2 rounded-lg text-xs font-semibold transition-all", orderType === t.key ? "bg-[#3a8fa0] text-white" : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-100")}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="px-3 py-2 border-b flex items-center justify-between bg-amber-50">
        <div className="flex items-center gap-2 text-xs text-amber-700 font-medium"><UserX className="w-3.5 h-3.5" />Skip customer details</div>
        <button onClick={() => setSkipDetails(s => !s)} className={cn("w-10 h-5 rounded-full transition-colors relative", skipDetails ? "bg-amber-500" : "bg-gray-200")}>
          <span className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform", skipDetails ? "translate-x-5" : "translate-x-0.5")} />
        </button>
      </div>
      {!skipDetails && (
        <div className="px-3 py-2 space-y-2 border-b">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <User className="w-4 h-4 text-gray-400 shrink-0" />
            <input placeholder="Customer name *" value={customer.name} onChange={e => setCustomer(c => ({ ...c, name: e.target.value }))}
              className="bg-transparent text-gray-800 text-sm placeholder-gray-400 outline-none flex-1 min-w-0" />
          </div>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <Phone className="w-4 h-4 text-gray-400 shrink-0" />
            <input placeholder="Phone number *" value={customer.phone} onChange={e => setCustomer(c => ({ ...c, phone: e.target.value }))}
              className="bg-transparent text-gray-800 text-sm placeholder-gray-400 outline-none flex-1 min-w-0" />
          </div>
          {orderType === 'delivery' && (
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
              <input placeholder="Delivery address" value={customer.address} onChange={e => setCustomer(c => ({ ...c, address: e.target.value }))}
                className="bg-transparent text-gray-800 text-sm placeholder-gray-400 outline-none flex-1 min-w-0" />
            </div>
          )}
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {basket.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400">
            <ShoppingBag className="w-8 h-8 mb-2 opacity-30" /><p className="text-sm">Your basket is empty!!</p>
            <p className="text-xs text-gray-400">Please add items to place order</p>
          </div>
        ) : basket.map((item, idx) => (
          <div key={idx} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-gray-800 text-sm font-medium">{item.item_name}</p>
                {item.modifiers?.map((m, mi) => <p key={mi} className="text-gray-400 text-xs">↳ {m.option_name}</p>)}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-gray-900 text-sm font-semibold">£{item.item_total.toFixed(2)}</span>
                <button onClick={() => onRemove(idx)} className="text-gray-300 hover:text-red-500 transition-colors"><X className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <button onClick={() => onQtyChange(idx, item.quantity - 1)} className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-300"><Minus className="w-3 h-3" /></button>
              <span className="text-gray-800 text-sm font-medium w-5 text-center">{item.quantity}</span>
              <button onClick={() => onQtyChange(idx, item.quantity + 1)} className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-300"><Plus className="w-3 h-3" /></button>
            </div>
          </div>
        ))}
      </div>
      {basket.length > 0 && (
        <div className="border-t px-3 py-2 space-y-1">
          <div className="flex justify-between text-sm text-gray-500"><span>Subtotal</span><span>£{subtotal.toFixed(2)}</span></div>
          {orderType === 'delivery' && <div className="flex justify-between text-sm text-gray-500"><span>Delivery</span><span>£{charge.toFixed(2)}</span></div>}
          <div className="flex justify-between text-gray-900 font-bold text-base pt-1"><span>Total</span><span>£{total.toFixed(2)}</span></div>
        </div>
      )}
      <div className="px-3 pb-3 space-y-2">
        <input placeholder="Order notes..." value={customer.notes} onChange={e => setCustomer(c => ({ ...c, notes: e.target.value }))}
          className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-xs placeholder-gray-400 rounded-lg px-3 py-2 outline-none" />
        <button onClick={onClear} disabled={basket.length === 0}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs text-gray-400 hover:text-red-500 bg-gray-50 border border-gray-200 rounded-lg transition-colors disabled:opacity-30">
          <Trash2 className="w-3.5 h-3.5" /> Clear Order
        </button>
      </div>
      {showPayLink && <PayByLinkModal onClose={() => setShowPayLink(false)} onSend={handlePayByLink} />}
    </div>
  );
}

function TimerBadge({ createdDate }) {
  const [mins, setMins] = useState(0);
  useEffect(() => {
    const update = () => { if (createdDate) setMins(differenceInMinutes(new Date(), new Date(createdDate))); };
    update();
    const t = setInterval(update, 30000);
    return () => clearInterval(t);
  }, [createdDate]);
  const bg = mins < 20 ? 'bg-red-500' : mins < 40 ? 'bg-orange-500' : 'bg-gray-400';
  return (
    <div className={cn('flex items-center gap-0.5 px-2 py-1 rounded text-white text-[11px] font-bold min-w-[40px] justify-center', bg)}>
      <Clock className="w-2.5 h-2.5 mr-0.5" />{mins}
    </div>
  );
}

function printReceipt(order) {
  const cfg = (() => { try { return JSON.parse(localStorage.getItem('printConfig') || '{}'); } catch { return {}; } })();
  const storeName = cfg.storeName || "Marco's Pizzeria";
  const storeAddress = cfg.storeAddress || '';
  const storePhone = cfg.storePhone || '';
  const footer = cfg.receiptFooter || 'Thank you for your order!';
  const width = cfg.printerWidth === '58mm' ? '58mm' : cfg.printerWidth === 'A4' ? '210mm' : '80mm';
  const isDelivery = order.order_type === 'delivery';
  const itemRows = (order.items || []).map(item => `
    <tr><td style="padding:2px 0">${item.quantity} x ${item.item_name}</td><td style="text-align:right;padding:2px 0">£${(item.item_total || 0).toFixed(2)}</td></tr>
    ${(item.modifiers || []).map(m => `<tr><td colspan="2" style="padding-left:8px;color:#555;font-size:11px">↳ ${m.group_name ? m.group_name + ': ' : ''}${m.option_name}${m.price_adjustment > 0 ? ' (+£' + m.price_adjustment.toFixed(2) + ')' : ''}</td></tr>`).join('')}
  `).join('');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt</title>
  <style>* { margin:0; padding:0; box-sizing:border-box; } body { font-family: 'Courier New', monospace; font-size: 13px; width: ${width}; padding: 8px; } .center { text-align: center; } .bold { font-weight: bold; } .divider { border-top: 1px dashed #000; margin: 6px 0; } table { width: 100%; border-collapse: collapse; } td { vertical-align: top; } .total-row td { font-weight: bold; font-size: 15px; padding-top: 4px; } .footer { text-align: center; margin-top: 10px; font-size: 11px; } @media print { @page { margin: 0; size: ${width} auto; } }</style></head><body>
  <div class="center bold" style="font-size:16px">${storeName}</div>
  ${storeAddress ? `<div class="center" style="font-size:11px">${storeAddress}</div>` : ''}
  ${storePhone ? `<div class="center" style="font-size:11px">Tel: ${storePhone}</div>` : ''}
  <div class="divider"></div>
  <div class="bold">${isDelivery ? 'DELIVERY' : 'COLLECTION'}</div>
  <div>Order: ${order.order_number || ''}</div>
  <div>Date: ${order.created_date ? format(new Date(order.created_date), 'dd/MM/yyyy HH:mm') : new Date().toLocaleString()}</div>
  <div class="divider"></div>
  <div class="bold">Customer: ${order.customer_name}</div>
  <div>Phone: ${order.customer_phone || ''}</div>
  ${isDelivery && order.delivery_address ? `<div>Address: ${order.delivery_address}</div>` : ''}
  <div class="divider"></div>
  <table>${itemRows}</table>
  <div class="divider"></div>
  <table>
    <tr><td>Subtotal</td><td style="text-align:right">£${(order.subtotal || 0).toFixed(2)}</td></tr>
    ${isDelivery ? `<tr><td>Delivery</td><td style="text-align:right">£${(order.delivery_charge || 0).toFixed(2)}</td></tr>` : ''}
    ${order.discount_amount > 0 ? `<tr><td>Discount</td><td style="text-align:right">-£${order.discount_amount.toFixed(2)}</td></tr>` : ''}
    <tr class="total-row"><td>TOTAL</td><td style="text-align:right">£${(order.total || 0).toFixed(2)}</td></tr>
    <tr><td>Payment</td><td style="text-align:right">${(order.payment_method || '').toUpperCase()}</td></tr>
  </table>
  ${order.notes ? `<div class="divider"></div><div style="font-size:11px">Note: ${order.notes}</div>` : ''}
  <div class="divider"></div>
  <div class="footer">${footer}</div>
  </body></html>`;
  const win = window.open('', '_blank', `width=400,height=600`);
  win.document.write(html); win.document.close(); win.focus();
  setTimeout(() => { win.print(); win.close(); }, 300);
}

// ─── Order Detail (left panel) ────────────────────────────────────────────────
function OrderDetail({ order, onAdvance, onCancel }) {
  const [showDetails, setShowDetails] = useState(false);
  if (!order) return (
    <div className="flex-1 flex flex-col items-center justify-center text-gray-300 bg-gray-50">
      <ShoppingBag className="w-14 h-14 mb-3" />
      <p className="text-sm text-gray-400">Select an order to view details</p>
    </div>
  );
  const isPaid = order.payment_status === 'paid' || order.payment_method === 'card';
  const isDelivery = order.order_type === 'delivery';
  const canAdvance = !['completed', 'cancelled'].includes(order.status);
  const advanceLabel = order.status === 'received' ? 'On the way' : order.status === 'in_kitchen' ? 'Mark Ready' : 'Complete';

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* Action bar — matches image: Reassign | Print | Cancel and Refund | Partial Refund | Options */}
      <div className="flex items-center border-b border-gray-200 shrink-0 bg-white overflow-x-auto">
        <button className="flex items-center gap-1.5 px-4 py-3 text-xs text-gray-500 hover:bg-gray-50 border-r border-gray-200 shrink-0">
          <Edit2 className="w-3.5 h-3.5" /> Reassign
        </button>
        <button onClick={() => printReceipt(order)} className="flex items-center gap-1.5 px-4 py-3 text-xs text-gray-500 hover:bg-gray-50 border-r border-gray-200 shrink-0">
          <Printer className="w-3.5 h-3.5" /> Print
        </button>
        {canAdvance && (
          <button onClick={() => onCancel(order)} className="flex items-center gap-1.5 px-4 py-3 text-xs text-gray-500 hover:bg-red-50 border-r border-gray-200 shrink-0">
            <X className="w-3.5 h-3.5" /> Cancel and Refund
          </button>
        )}
        {canAdvance && (
          <button onClick={() => onAdvance(order)} className="flex items-center gap-1.5 px-4 py-3 text-xs text-gray-500 hover:bg-gray-50 border-r border-gray-200 shrink-0">
            <Minus className="w-3.5 h-3.5" /> Partial Refund
          </button>
        )}
        <button className="flex items-center gap-1.5 px-4 py-3 text-xs text-gray-500 hover:bg-gray-50 shrink-0">
          <MoreVertical className="w-3.5 h-3.5" /> Options
        </button>
      </div>

      {/* AI enrichment strip — claudeAssist (T1). Renders nothing until ai_* fields are set. */}
      {(order.ai_station || order.ai_prep_time > 0 || order.ai_allergen_flags?.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 px-5 py-2 border-b border-gray-100 shrink-0 bg-gray-50">
          {order.ai_station && (
            <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide text-white', AI_STATION_COLORS[order.ai_station] || 'bg-slate-500')}>
              {order.ai_station}
            </span>
          )}
          {order.ai_prep_time > 0 && (() => {
            const elapsed = order.created_date ? differenceInMinutes(new Date(), new Date(order.created_date)) : 0;
            const remaining = order.ai_prep_time - elapsed;
            return (
              <span className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold',
                remaining < 0 ? 'bg-red-100 text-red-700' : remaining <= 5 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700')}>
                <Clock className="w-3 h-3" />
                {remaining < 0 ? `Overdue ${Math.abs(remaining)}m` : `ETA ~${remaining}m`}
              </span>
            );
          })()}
          {order.ai_allergen_flags?.length > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white">
              ⚠ Allergen: {order.ai_allergen_flags.join(', ')}
            </span>
          )}
        </div>
      )}

      {/* Customer / address block */}
      <div className="px-5 py-4 border-b border-gray-100 shrink-0">
        <div className="flex items-start gap-2 mb-2">
          <div className="w-5 h-5 mt-0.5 shrink-0 text-orange-500">
            {isDelivery ? <Truck className="w-5 h-5" /> : <ShoppingBag className="w-5 h-5" />}
          </div>
          <div className="flex-1">
            {isDelivery && order.delivery_address && (
              <p className="font-bold text-gray-900 text-sm leading-snug">{order.delivery_address}{order.delivery_postcode ? `, ${order.delivery_postcode}` : ''}</p>
            )}
            {!isDelivery && <p className="font-bold text-gray-900 text-sm">Pickup : {order.customer_name}</p>}
          </div>
        </div>
        {order.customer_phone && (
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-0.5">
            <Phone className="w-3.5 h-3.5 text-gray-400" />
            {order.customer_phone}
          </div>
        )}
        {order.order_number && (
          <div className="text-xs text-gray-400 mb-2">Order ID : {order.order_number}</div>
        )}
        {/* Directions / Details / Call */}
        <div className="flex items-center gap-3 mt-1">
          {isDelivery && (
            <button className="flex items-center gap-1 text-xs text-[#3a8fa0] hover:underline">
              <MapPin className="w-3 h-3" /> Directions
            </button>
          )}
          <button onClick={() => setShowDetails(s => !s)} className="flex items-center gap-1 text-xs text-[#3a8fa0] hover:underline">
            <Settings2 className="w-3 h-3" /> Details
          </button>
          {order.customer_phone && (
            <a href={`tel:${order.customer_phone}`} className="ml-auto flex items-center gap-1 text-xs text-gray-500 border border-gray-300 rounded px-2 py-0.5 hover:bg-gray-50">
              <Phone className="w-2.5 h-2.5" /> Call
            </a>
          )}
        </div>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto px-5 py-4 relative">
        {isPaid && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="opacity-[0.04] rotate-[-22deg] border-[5px] border-green-800 rounded-xl px-6 py-2">
              <span className="text-7xl font-black text-green-800 tracking-widest">PAID</span>
            </div>
          </div>
        )}
        {showDetails ? (
          <div className="space-y-2 text-xs">
            {[['Customer', order.customer_name], ['Phone', order.customer_phone], ['Order #', order.order_number], ['Type', order.order_type], ['Payment', order.payment_method], ['Placed', order.created_date ? format(new Date(order.created_date), 'dd/MM/yyyy HH:mm') : ''], ['Address', isDelivery ? order.delivery_address : null]].filter(([, v]) => v).map(([label, value]) => (
              <div key={label} className="flex"><span className="text-gray-400 w-24 shrink-0">{label}</span><span className="text-gray-800 font-medium">: {value}</span></div>
            ))}
          </div>
        ) : (
          <div className="relative z-10 space-y-2">
            {order.items?.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start">
                <div>
                  <p className="text-gray-800 text-sm">
                    <span className="text-gray-500 mr-1">{item.quantity} x</span>
                    <span className="font-semibold">{item.item_name}</span>
                  </p>
                  {item.modifiers?.map((m, mi) => <p key={mi} className="text-gray-400 text-xs ml-4 mt-0.5">{m.option_name}</p>)}
                </div>
                <span className="text-gray-700 font-medium text-sm ml-4 shrink-0">£ {item.item_total?.toFixed(2)}</span>
              </div>
            ))}
            {order.notes && <p className="text-xs text-gray-400 italic mt-2 pt-2 border-t border-gray-100">Note: {order.notes}</p>}
          </div>
        )}
      </div>

      {/* Totals footer */}
      {!showDetails && (
        <div className="border-t border-gray-200 px-5 py-3 space-y-1 bg-white shrink-0 text-sm">
          <div className="flex justify-between text-gray-500"><span>Sub Total</span><span>£ {(order.subtotal || 0).toFixed(2)}</span></div>
          {isDelivery && <div className="flex justify-between text-gray-500"><span>Delivery Charge</span><span>£ {(order.delivery_charge || 0).toFixed(2)}</span></div>}
          {order.discount_amount > 0 && <div className="flex justify-between text-red-500"><span>Discount</span><span>- £ {order.discount_amount.toFixed(2)}</span></div>}
          <div className="flex justify-between items-center pt-1.5 border-t border-gray-200">
            <span className="font-bold text-gray-900 text-base">Grand Total</span>
            <div className="flex items-center gap-2">
              <span className={cn("text-xs px-2 py-0.5 rounded font-bold text-white", isPaid ? "bg-green-600" : "bg-gray-500")}>
                {order.payment_method?.toUpperCase() || 'CASH'}
              </span>
              <span className="font-bold text-gray-900 text-base">£ {(order.total || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Large order number watermark at bottom */}
      <div className="shrink-0 px-5 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50">
        <span className="text-xs text-gray-400">Powered by Marco's</span>
        <span className="text-3xl font-black text-gray-300">#{order.order_number?.slice(-2)}</span>
      </div>
    </div>
  );
}

// ─── Orders Panel ─────────────────────────────────────────────────────────────
function OrdersPanel({ unacknowledgedIds, onAcknowledge }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('current');
  const [selected, setSelected] = useState(null);
  const seenIds = React.useRef(null);

  const { data: orders = [] } = useQuery({
    queryKey: ['epos-orders'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getEposOrders', {});
      return res.data?.orders || [];
    },
    initialData: [],
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (orders.length === 0) return;
    const currentIds = new Set(orders.map(o => o.id));
    if (seenIds.current === null) { seenIds.current = currentIds; return; }
    const newOrders = orders.filter(o => !seenIds.current.has(o.id) && o.status === 'received');
    if (newOrders.length > 0) {
      playOrderAlert();
      const cfg = (() => { try { return JSON.parse(localStorage.getItem('printConfig') || '{}'); } catch { return {}; } })();
      if (cfg.autoPrint) newOrders.forEach(o => printReceipt(o));
    }
    seenIds.current = currentIds;
  }, [orders]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Order.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['epos-orders'] }),
  });

  const advance = (order) => {
    const idx = STATUS_FLOW.indexOf(order.status);
    if (idx < STATUS_FLOW.length - 1) updateMutation.mutate({ id: order.id, data: { status: STATUS_FLOW[idx + 1] } });
  };
  const cancel = (order) => updateMutation.mutate({ id: order.id, data: { status: 'cancelled' } });

  const tabConfig = [
    { key: 'current',   label: 'CURRENT',    filter: o => ['received', 'in_kitchen'].includes(o.status) },
    { key: 'on_way',    label: 'ON THE WAY',  filter: o => o.status === 'ready' },
    { key: 'completed', label: 'COMPLETED',   filter: o => ['completed', 'cancelled'].includes(o.status) },
  ];

  const shown = orders.filter(tabConfig.find(t => t.key === tab).filter);

  return (
    <div className="h-full flex overflow-hidden bg-white">
      {/* LEFT: Order detail */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-200 min-w-0">
        <OrderDetail order={selected} onAdvance={advance} onCancel={cancel} />
      </div>

      {/* RIGHT: Order list */}
      <div className="w-[500px] flex flex-col bg-white shrink-0 overflow-hidden border-l border-gray-200">
        {/* Tabs row — all grey, only COMPLETED gets green underline */}
        <div className="flex items-center border-b border-gray-200 shrink-0 bg-white">
          {tabConfig.map(t => {
            const count = orders.filter(t.filter).length;
            const isActive = tab === t.key;
            return (
              <button key={t.key} onClick={() => { setTab(t.key); setSelected(null); }}
                className={cn(
                  'flex-1 py-3.5 text-[11px] font-semibold tracking-widest uppercase transition-colors relative',
                  isActive
                    ? t.key === 'completed'
                      ? 'text-gray-700 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-green-600'
                      : 'text-gray-700'
                    : 'text-gray-400 hover:text-gray-600'
                )}>
                {t.label}
                {count > 0 && t.key !== 'completed' && (
                  <span className="ml-1 text-[9px] bg-red-500 text-white rounded-full px-1.5 py-0.5">{count}</span>
                )}
              </button>
            );
          })}
          <div className="flex items-center px-3 gap-1 shrink-0">
            <button className="p-1.5 text-gray-400 hover:text-gray-600"><Search className="w-4 h-4" /></button>
            <button className="p-1.5 text-gray-400 hover:text-gray-600"><MoreVertical className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Column headers */}
        <div className="grid border-b border-gray-200 bg-white shrink-0 text-xs font-bold text-gray-700"
          style={{ gridTemplateColumns: '52px 52px 1fr 64px 70px 56px' }}>
          <span className="px-3 py-2.5">#</span>
          <span className="px-2 py-2.5">Type</span>
          <span className="px-2 py-2.5">Address</span>
          <span className="px-2 py-2.5">Time</span>
          <span className="px-2 py-2.5">Amt</span>
          <span className="px-2 py-2.5">Mode</span>
        </div>

        {/* Order rows */}
        <div className="flex-1 overflow-y-auto">
          {shown.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-300">
              <Package className="w-8 h-8 mb-2" /><p className="text-xs">No orders</p>
            </div>
          ) : (
            shown.map(order => {
              const isSelected = selected?.id === order.id;
              const isNew = order.status === 'received';
              const time = order.created_date ? format(new Date(order.created_date), 'HH:mm') : '';
              const addressLine = order.order_type === 'delivery'
                ? [order.delivery_address, order.delivery_postcode].filter(Boolean).join(', ')
                : `Pickup : ${order.customer_name}`;

              return (
                <div key={order.id}
                  className={cn('border-b border-gray-100 transition-colors cursor-pointer',
                    isSelected ? 'bg-gray-100' : isNew ? 'hover:bg-gray-50' : 'hover:bg-gray-50'
                  )}>
                  <div className="grid items-start py-3"
                    style={{ gridTemplateColumns: '52px 52px 1fr 64px 70px 56px' }}
                    onClick={() => setSelected(order)}>
                    {/* # — large bold number */}
                    <span className="px-3 font-bold text-gray-800 text-base self-center">
                      {order.order_number?.replace(/\D/g, '').slice(-2) || order.order_number?.slice(-2)}
                    </span>
                    {/* Type icon */}
                    <span className="px-2 self-center text-gray-500">
                      {order.order_type === 'delivery' ? (
                        <svg viewBox="0 0 48 48" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          {/* Scooter/moped */}
                          <circle cx="12" cy="36" r="5" /><circle cx="36" cy="36" r="5" />
                          <path d="M17 36h14" />
                          <path d="M28 14h6l4 10h-4" />
                          <path d="M28 14l-4 10H12l2-6" />
                          <path d="M14 18h8" />
                          {/* Helmet */}
                          <path d="M30 10a6 6 0 016 6" /><path d="M24 10h6" />
                          <path d="M24 10c0-3 2-5 4-5s4 2 4 5" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 48 48" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          {/* Shopping bag */}
                          <path d="M14 18h20l-3 22H17L14 18z" />
                          <path d="M18 18v-4a6 6 0 1112 0v4" />
                        </svg>
                      )}
                    </span>
                    {/* Address */}
                    <div className="px-2 min-w-0 self-center">
                      <p className="text-[12px] text-gray-700 leading-snug">{addressLine}</p>
                      {isNew && <span className="inline-block mt-1 text-[9px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded uppercase">New</span>}
                    </div>
                    {/* Time */}
                    <span className="px-2 text-[12px] text-gray-600 self-center">{time}</span>
                    {/* Amt */}
                    <span className="px-2 text-[12px] font-semibold text-gray-800 self-center">
                      £{(order.total || 0).toFixed(2)}
                    </span>
                    {/* Mode — CASH or CARD */}
                    <div className="px-2 flex items-center justify-center self-center">
                      {order.payment_method === 'card' ? (
                        <div className="w-10 h-8 border border-gray-300 rounded bg-white flex items-center justify-center">
                          {/* Credit card: rectangle with stripe and chip */}
                          <svg viewBox="0 0 40 28" className="w-7 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="2" width="36" height="24" rx="3" />
                            <line x1="2" y1="9" x2="38" y2="9" strokeWidth="3" />
                            <rect x="6" y="14" width="8" height="6" rx="1" />
                            <line x1="22" y1="16" x2="34" y2="16" />
                            <line x1="22" y1="20" x2="30" y2="20" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-10 h-8 border border-gray-300 rounded bg-white flex items-center justify-center">
                          {/* Cash note: rectangle with oval/circle in center and lines */}
                          <svg viewBox="0 0 44 30" className="w-7 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="4" width="40" height="22" rx="2" />
                            <rect x="6" y="8" width="32" height="14" rx="1" />
                            <circle cx="22" cy="15" r="4" />
                            <line x1="6" y1="15" x2="13" y2="15" />
                            <line x1="31" y1="15" x2="38" y2="15" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Accept / Reject for new orders */}
                  {isNew && (
                    <div className="px-3 pb-2.5 flex gap-2">
                      <button onClick={(e) => { e.stopPropagation(); advance(order); setSelected(order); }}
                        className="flex-1 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded flex items-center justify-center gap-1">
                        <Check className="w-3 h-3" /> Accept
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); cancel(order); }}
                        className="px-3 py-1.5 bg-white hover:bg-red-50 text-red-500 text-xs font-bold rounded border border-red-200 flex items-center gap-1">
                        <X className="w-3 h-3" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Print Config Modal ───────────────────────────────────────────────────────
function PrintConfigModal({ onClose }) {
  const [config, setConfig] = useState(() => { try { return JSON.parse(localStorage.getItem('printConfig') || '{}'); } catch { return {}; } });
  const set = (k, v) => setConfig(c => ({ ...c, [k]: v }));
  const save = () => { localStorage.setItem('printConfig', JSON.stringify(config)); onClose(); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-md mx-4 overflow-hidden shadow-2xl">
        <div className="bg-gray-800 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><Printer className="w-5 h-5 text-white" /><h3 className="text-white font-bold">Print Configuration</h3></div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4 text-sm">
          {[
            { key: 'storeName', label: 'Store Name', type: 'text', placeholder: "Marco's Pizzeria" },
            { key: 'storeAddress', label: 'Store Address', type: 'text', placeholder: '123 High Street' },
            { key: 'storePhone', label: 'Store Phone', type: 'text', placeholder: '01234 567890' },
            { key: 'receiptFooter', label: 'Receipt Footer', type: 'text', placeholder: 'Thank you for your order!' },
            { key: 'printerWidth', label: 'Printer Width', type: 'select', options: ['58mm', '80mm', 'A4'] },
            { key: 'copies', label: 'Receipt Copies', type: 'select', options: ['1', '2', '3'] },
          ].map(({ key, label, type, placeholder, options }) => (
            <div key={key}>
              <label className="block text-gray-600 font-medium mb-1">{label}</label>
              {type === 'select' ? (
                <select value={config[key] || ''} onChange={e => set(key, e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-800 bg-gray-50 outline-none focus:border-[#3a8fa0]">
                  <option value="">Select...</option>
                  {options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input type="text" value={config[key] || ''} onChange={e => set(key, e.target.value)} placeholder={placeholder}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-800 bg-gray-50 outline-none focus:border-[#3a8fa0]" />
              )}
            </div>
          ))}
          <div className="flex items-center gap-3 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!config.autoPrint} onChange={e => set('autoPrint', e.target.checked)} className="rounded" />
              <span className="text-gray-700">Auto-print on new order</span>
            </label>
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 font-medium">Cancel</button>
          <button onClick={save} className="flex-1 py-2.5 bg-[#3a8fa0] hover:bg-[#2e7a8a] text-white rounded-xl font-bold">Save</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main EPOS ────────────────────────────────────────────────────────────────
export default function AdminEPOS() {
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState('');
  const [basket, setBasket] = useState([]);
  const [orderType, setOrderType] = useState('collection');
  const [modalItem, setModalItem] = useState(null);
  const [mainTab, setMainTab] = useState('pos');
  const [orderPlaced, setOrderPlaced] = useState(null);
  const [search, setSearch] = useState('');
  const [showPrintConfig, setShowPrintConfig] = useState(false);
  const [showItems, setShowItems] = useState(false);
  const [unacknowledgedOnlineOrders, setUnacknowledgedOnlineOrders] = useState(new Set());
  const seenIdsMain = React.useRef(null);
  const alertIntervalRef = React.useRef(null);

  const { data: menuItems = [] } = useQuery({
    queryKey: ['epos-menu'],
    queryFn: () => base44.entities.MenuItem.list('sort_order', 500),
    initialData: [],
  });

  const { data: settingsArr = [] } = useQuery({
    queryKey: ['store-settings'],
    queryFn: () => base44.entities.StoreSettings.filter({ setting_key: 'main' }),
    initialData: [],
  });
  const deliveryCharge = settingsArr[0]?.default_delivery_charge || 2.5;

  const { data: liveOrders = [] } = useQuery({
    queryKey: ['epos-orders'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getEposOrders', {});
      return res.data?.orders || [];
    },
    initialData: [],
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (liveOrders.length === 0) return;
    const currentIds = new Set(liveOrders.map(o => o.id));
    if (seenIdsMain.current === null) { seenIdsMain.current = currentIds; return; }
    const newOnlineOrders = liveOrders.filter(o => !seenIdsMain.current.has(o.id) && o.status === 'received');
    if (newOnlineOrders.length > 0) {
      setUnacknowledgedOnlineOrders(prev => { const updated = new Set(prev); newOnlineOrders.forEach(o => updated.add(o.id)); return updated; });
      setMainTab('orders');
    }
    seenIdsMain.current = currentIds;
  }, [liveOrders]);

  useEffect(() => {
    if (unacknowledgedOnlineOrders.size > 0) {
      playOrderAlert();
      alertIntervalRef.current = setInterval(playOrderAlert, 3000);
    } else {
      clearInterval(alertIntervalRef.current);
    }
    return () => clearInterval(alertIntervalRef.current);
  }, [unacknowledgedOnlineOrders.size]);

  useEffect(() => {
    const unsub = base44.entities.Order.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['epos-orders'] });
    });
    return unsub;
  }, [queryClient]);

  const acknowledgeOrders = () => { setUnacknowledgedOnlineOrders(new Set()); setMainTab('orders'); };
  const newOrderCount = liveOrders.filter(o => o.status === 'received').length;

  const available = menuItems.filter(i => i.is_available);
  const rawCategories = [...new Set(available.map(i => i.category))];
  const categories = rawCategories.sort((a, b) => {
    const ai = CATEGORY_ORDER.findIndex(c => c.toLowerCase() === a.toLowerCase());
    const bi = CATEGORY_ORDER.findIndex(c => c.toLowerCase() === b.toLowerCase());
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  useEffect(() => { if (categories.length > 0 && !activeCategory) setActiveCategory(categories[0]); }, [categories.length]);

  const gridItems = search
    ? available.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    : activeCategory ? available.filter(i => i.category === activeCategory) : available;

  const handleItemClick = (item) => {
    if ((item.modifier_groups || []).length > 0) { setModalItem(item); }
    else { addToBasket({ item_name: item.name, quantity: 1, base_price: item.base_price, modifiers: [], item_total: item.base_price }); }
  };

  const addToBasket = (entry) => setBasket(prev => [...prev, entry]);
  const removeFromBasket = (idx) => setBasket(prev => prev.filter((_, i) => i !== idx));
  const updateQty = (idx, newQty) => {
    if (newQty <= 0) { removeFromBasket(idx); return; }
    setBasket(prev => prev.map((item, i) => { if (i !== idx) return item; const unit = item.item_total / item.quantity; return { ...item, quantity: newQty, item_total: unit * newQty }; }));
  };

  const placeOrderMutation = useMutation({
    mutationFn: (orderData) => base44.entities.Order.create(orderData),
    onSuccess: (order) => {
      setOrderPlaced(order.order_number); setBasket([]);
      queryClient.invalidateQueries({ queryKey: ['epos-orders'] });
      setTimeout(() => setOrderPlaced(null), 3000);
      const cfg = (() => { try { return JSON.parse(localStorage.getItem('printConfig') || '{}'); } catch { return {}; } })();
      if (cfg.autoPrint) printReceipt(order);
    },
  });

  const handlePlaceOrder = (customer, payment, total, subtotal, charge) => {
    placeOrderMutation.mutate({
      order_number: 'MRC-' + Date.now().toString(36).toUpperCase(),
      order_type: orderType === 'eat_in' ? 'collection' : orderType,
      status: 'received',
      customer_name: customer.name, customer_phone: customer.phone,
      delivery_address: customer.address, items: basket,
      subtotal, delivery_charge: charge, total,
      payment_method: payment, payment_status: 'pending', notes: customer.notes,
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-100 flex flex-col overflow-hidden" style={{ fontFamily: 'system-ui, sans-serif' }}>
      <NewOrderAlertBanner count={unacknowledgedOnlineOrders.size} onAccept={acknowledgeOrders} />

      {/* Top Bar */}
      <div className="h-12 bg-white border-b border-gray-200 flex items-center px-3 gap-3 shrink-0 shadow-sm">
        <div className="flex items-center gap-0.5">
          <button onClick={() => setMainTab('pos')}
            className={cn("flex flex-col items-center px-4 py-1 text-xs font-semibold rounded transition-colors min-w-[60px]",
              mainTab === 'pos' ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100")}>
            <ShoppingBag className="w-4 h-4 mb-0.5" />Menu
          </button>
          <button onClick={() => setMainTab('orders')}
            className={cn("flex flex-col items-center px-4 py-1 text-xs font-semibold rounded transition-colors min-w-[60px] relative",
              mainTab === 'orders' ? "bg-[#2e7d32] text-white" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100")}>
            <UtensilsCrossed className="w-4 h-4 mb-0.5" />Orders
            {newOrderCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{newOrderCount}</span>}
          </button>
        </div>
        <div className="flex-1 text-center"><span className="text-sm font-semibold text-gray-700">Marco's Pizzeria</span></div>
        <div className="flex items-center gap-3">
          <LiveClock />
          <button onClick={() => setShowPrintConfig(true)} className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors"><Printer className="w-4 h-4" /></button>
          <Link to={createPageUrl('AdminDashboard')} className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors"><ArrowLeft className="w-4 h-4" /></Link>
        </div>
      </div>

      {/* Body */}
      {mainTab === 'pos' ? (
        <div className="flex-1 flex overflow-hidden" style={{ marginTop: unacknowledgedOnlineOrders.size > 0 ? '40px' : 0 }}>
          <div className="flex-1 flex flex-col overflow-hidden bg-gray-100">
            <div className="px-3 pt-2 pb-2 bg-white border-b border-gray-200 flex items-center gap-2">
              {showItems && !search && (
                <button onClick={() => setShowItems(false)} className="text-gray-400 hover:text-gray-700 shrink-0"><ChevronLeft className="w-5 h-5" /></button>
              )}
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1.5 flex-1">
                <Search className="w-4 h-4 text-gray-400" />
                <input placeholder="Search menu..." value={search} onChange={e => { setSearch(e.target.value); if (e.target.value) setShowItems(true); }}
                  className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none flex-1" />
                {search && <button onClick={() => { setSearch(''); setShowItems(false); }} className="text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>}
              </div>
            </div>
            {!showItems && !search ? (
              <div className="flex-1 overflow-y-auto p-3">
                <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
                  {categories.map(cat => (
                    <button key={cat} onClick={() => { setActiveCategory(cat); setShowItems(true); }}
                      className={cn("py-6 px-3 rounded-lg text-white text-sm font-bold text-center uppercase tracking-wide leading-tight transition-all active:scale-95", CATEGORY_COLORS[cat] || DEFAULT_COLOR)}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-3">
                {!search && <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{activeCategory}</p>}
                {gridItems.length === 0 ? (
                  <div className="flex items-center justify-center h-24 text-gray-400 text-sm">No items found</div>
                ) : (
                  <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
                    {gridItems.map(item => (
                      <button key={item.id} onClick={() => handleItemClick(item)}
                        className="group bg-[#3a8fa0] hover:bg-[#2e7a8a] rounded-lg text-white text-sm font-bold text-center py-6 px-2 uppercase leading-tight transition-all active:scale-95 relative">
                        <span className="block">{item.name}</span>
                        <span className="block text-white/70 text-xs mt-1 font-normal">£{item.base_price.toFixed(2)}</span>
                        {item.modifier_groups?.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-white/40 rounded-full" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="w-72 border-l border-gray-200 flex flex-col overflow-hidden shrink-0 bg-white">
            <div className="flex-1 overflow-hidden flex flex-col">
              <OrderBasket basket={basket} orderType={orderType} setOrderType={setOrderType} onRemove={removeFromBasket}
                onQtyChange={updateQty} onClear={() => setBasket([])} onPlaceOrder={handlePlaceOrder} deliveryCharge={deliveryCharge} />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden" style={{ marginTop: unacknowledgedOnlineOrders.size > 0 ? '40px' : 0 }}>
          <OrdersPanel unacknowledgedIds={unacknowledgedOnlineOrders} onAcknowledge={acknowledgeOrders} />
        </div>
      )}

      {orderPlaced && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-green-600 text-white px-5 py-3 rounded-xl text-sm font-semibold shadow-xl z-50 animate-bounce">
          <Check className="w-4 h-4" /> Order #{orderPlaced} placed!
        </div>
      )}
      {modalItem && <ModifierModal item={modalItem} onAdd={addToBasket} onClose={() => setModalItem(null)} />}
      {showPrintConfig && <PrintConfigModal onClose={() => setShowPrintConfig(false)} />}
    </div>
  );
}