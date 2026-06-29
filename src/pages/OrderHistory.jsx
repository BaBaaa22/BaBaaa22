import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Clock, Package, RefreshCw, ChevronDown, ChevronUp, Truck, ShoppingBag } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_STYLES = {
  received:          { label: 'Received',          color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  in_kitchen:        { label: 'In Kitchen',         color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  out_for_delivery:  { label: 'Out for Delivery',   color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
  ready:             { label: 'Ready',              color: 'text-green-400 bg-green-400/10 border-green-400/20' },
  completed:         { label: 'Completed',          color: 'text-gray-400 bg-gray-400/10 border-gray-400/20' },
  cancelled:         { label: 'Cancelled',          color: 'text-red-400 bg-red-400/10 border-red-400/20' },
};

function OrderCard({ order }) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const status = STATUS_STYLES[order.status] || STATUS_STYLES.received;

  const handleReorder = () => {
    if (!order.items?.length) return;
    const cartData = encodeURIComponent(JSON.stringify(order.items));
    const orderType = order.order_type || 'collection';
    const charge = order.delivery_charge || 0;
    const postcode = order.delivery_postcode || '';
    navigate(createPageUrl('MenuPage') + `?type=${orderType}&postcode=${postcode}&charge=${charge}&cart=${cartData}`);
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      {/* Order header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white font-bold text-sm">#{order.order_number || order.id?.slice(-6).toUpperCase()}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${status.color}`}>
                {status.label}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {order.created_date ? format(new Date(order.created_date), 'dd MMM yyyy, HH:mm') : '—'}
              </span>
              <span className="flex items-center gap-1">
                {order.order_type === 'delivery' ? <Truck className="w-3 h-3" /> : <ShoppingBag className="w-3 h-3" />}
                <span className="capitalize">{order.order_type}</span>
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-white font-bold text-base">£{(order.total || 0).toFixed(2)}</p>
            <p className="text-gray-500 text-xs">{order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Item summary */}
        <p className="text-gray-400 text-xs mt-2 line-clamp-1">
          {order.items?.map(i => `${i.quantity}x ${i.item_name}`).join(', ')}
        </p>
      </div>

      {/* Actions */}
      <div className="flex border-t border-white/10">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? 'Hide Details' : 'View Details'}
        </button>
        <div className="w-px bg-white/10" />
        <button
          onClick={handleReorder}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-red-400 hover:text-white hover:bg-red-600/20 transition-colors font-semibold"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reorder
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-white/10 p-4 space-y-3">
          <div className="space-y-2">
            {order.items?.map((item, idx) => (
              <div key={idx} className="flex items-start justify-between gap-2 text-sm">
                <div className="flex-1 min-w-0">
                  <span className="text-white">{item.quantity}× {item.item_name}</span>
                  {item.modifiers?.length > 0 && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {item.modifiers.map(m => m.option_name).join(', ')}
                    </p>
                  )}
                </div>
                <span className="text-gray-300 shrink-0">£{(item.item_total || 0).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>Subtotal</span>
              <span>£{(order.subtotal || 0).toFixed(2)}</span>
            </div>
            {order.delivery_charge > 0 && (
              <div className="flex justify-between text-gray-400">
                <span>Delivery</span>
                <span>£{order.delivery_charge.toFixed(2)}</span>
              </div>
            )}
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-green-400">
                <span>Discount</span>
                <span>−£{order.discount_amount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-white font-bold pt-1 border-t border-white/10">
              <span>Total</span>
              <span>£{(order.total || 0).toFixed(2)}</span>
            </div>
          </div>

          {order.notes && (
            <div className="bg-white/5 rounded-lg px-3 py-2 text-xs text-gray-400">
              <span className="text-gray-500 font-medium">Notes: </span>{order.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function OrderHistory() {
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);
  const [authChecked, setAuthChecked] = React.useState(false);

  React.useEffect(() => {
    base44.auth.me().then(u => { setUser(u); setAuthChecked(true); }).catch(() => setAuthChecked(true));
  }, []);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => base44.entities.Order.list('-created_date', 50),
    enabled: !!user,
    initialData: [],
  });

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/10 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center px-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-600/20 flex items-center justify-center mb-4">
          <Package className="w-7 h-7 text-red-400" />
        </div>
        <h2 className="text-white font-bold text-xl mb-2">Sign in to view orders</h2>
        <p className="text-gray-400 text-sm mb-6">You need to be logged in to see your order history.</p>
        <button
          onClick={() => base44.auth.redirectToLogin(window.location.pathname)}
          className="bg-red-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-500 transition-colors"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#0f0f0f]/95 backdrop-blur border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate(createPageUrl('Home'))}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/40">
              <span className="text-xs font-black text-white">M</span>
            </div>
            <h1 className="font-bold text-white">Order History</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* User greeting */}
        <div className="mb-6">
          <p className="text-gray-400 text-sm">Welcome back,</p>
          <p className="text-white font-bold text-lg">{user.full_name || user.email}</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-28 bg-white/5 rounded-2xl animate-pulse" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-gray-600" />
            </div>
            <p className="text-gray-400 font-semibold text-base mb-1">No orders yet</p>
            <p className="text-gray-600 text-sm mb-6">Your order history will appear here.</p>
            <button
              onClick={() => navigate(createPageUrl('Home'))}
              className="bg-red-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-500 transition-colors text-sm"
            >
              Order Now
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-gray-500 text-xs uppercase tracking-widest mb-4">{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
            {orders.map(order => <OrderCard key={order.id} order={order} />)}
          </div>
        )}
      </div>
    </div>
  );
}