import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { differenceInMinutes, format } from 'date-fns';
import {
  Truck, ShoppingBag, Clock, Check, Printer, Edit2,
  MoreVertical, Phone, ChefHat, Bell, CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import PullToRefresh from '../components/common/PullToRefresh';
import ReceiptPrinter from '../components/receipts/ReceiptPrinter';
import { toast } from 'sonner';

// Status flow: received → in_kitchen → out_for_delivery (delivery) or ready (collection) → completed
const STATUS_CONFIG = {
  received:          { label: 'Received',           color: 'bg-yellow-500' },
  in_kitchen:        { label: 'In Kitchen',          color: 'bg-orange-500' },
  out_for_delivery:  { label: 'Out for Delivery',    color: 'bg-blue-500' },
  ready:             { label: 'Ready for Collection', color: 'bg-green-500' },
  completed:         { label: 'Completed',           color: 'bg-gray-400' },
  cancelled:         { label: 'Cancelled',           color: 'bg-red-400' },
};

// ── Live MM:SS timer ──────────────────────────────────────────────────────────
function LiveTimer({ createdDate }) {
  const [display, setDisplay] = useState('0:00');
  useEffect(() => {
    const update = () => {
      if (!createdDate) return;
      const totalSecs = Math.floor((Date.now() - new Date(createdDate).getTime()) / 1000);
      const m = Math.floor(totalSecs / 60);
      const s = totalSecs % 60;
      setDisplay(`${m}:${s.toString().padStart(2, '0')}`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [createdDate]);
  return <span className="text-[#3a8fa0] font-bold text-xl tabular-nums">{display}</span>;
}

// ── Minutes badge for list ────────────────────────────────────────────────────
function MinsBadge({ createdDate }) {
  const [mins, setMins] = useState(0);
  useEffect(() => {
    const update = () => {
      if (!createdDate) return;
      setMins(differenceInMinutes(new Date(), new Date(createdDate)));
    };
    update();
    const t = setInterval(update, 30000);
    return () => clearInterval(t);
  }, [createdDate]);
  const bg = mins < 20 ? 'bg-red-500' : mins < 40 ? 'bg-orange-500' : 'bg-gray-400';
  return (
    <div className={cn('flex items-center gap-0.5 px-2 py-1 rounded text-white text-[11px] font-bold min-w-[42px] justify-center', bg)}>
      <Clock className="w-2.5 h-2.5 mr-0.5" />{mins}
    </div>
  );
}

// ── Order Detail Panel ────────────────────────────────────────────────────────
function OrderDetail({ order, onSetStatus, onCancel }) {
  const [showDetails, setShowDetails] = useState(false);
  const [notifying, setNotifying] = useState(false);

  const notifyCustomer = async (status) => {
    if (!order?.customer_email) {
      toast.error('No email on file for this customer');
      return;
    }
    setNotifying(true);
    try {
      await base44.functions.invoke('notifyCustomerStatusUpdate', { order_id: order.id, status });
      toast.success('Customer notified by email!');
    } catch {
      toast.error('Failed to send notification');
    } finally {
      setNotifying(false);
    }
  };

  const syncPaymentStatus = async () => {
    try {
      const res = await base44.functions.invoke('syncPaymentStatus', { order_id: order.id });
      if (res?.data?.synced) {
        toast.success(`Payment status updated: ${res.data.payment_status.toUpperCase()}`);
      } else {
        toast.info(res?.data?.message || 'Payment status synced');
      }
    } catch {
      toast.error('Failed to sync payment status');
    }
  };

  if (!order) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-200 bg-gray-50">
        <ShoppingBag className="w-16 h-16 mb-4" />
        <p className="text-sm text-gray-400">Select an order to view details</p>
      </div>
    );
  }

  const isPaid = order.payment_status === 'paid' || order.payment_method === 'card';
  const isDelivery = order.order_type === 'delivery';
  const isDone = ['completed', 'cancelled'].includes(order.status);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* Status buttons */}
      <div className="border-b border-gray-200 bg-gray-50 shrink-0 p-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Update Status &amp; Notify Customer</p>
        <div className="flex flex-wrap gap-2">
          {/* In Kitchen */}
          <button
            disabled={isDone || order.status === 'in_kitchen'}
            onClick={() => { onSetStatus(order, 'in_kitchen'); notifyCustomer('in_kitchen'); }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all border",
              order.status === 'in_kitchen'
                ? "bg-orange-500 text-white border-orange-500"
                : "bg-white text-gray-600 border-gray-200 hover:border-orange-400 hover:text-orange-600 disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            <ChefHat className="w-4 h-4" />
            In Kitchen
            {order.customer_email && <Bell className="w-3 h-3 opacity-60" />}
          </button>

          {/* Out for Delivery (delivery orders only) */}
          {isDelivery && (
            <button
              disabled={isDone || order.status === 'out_for_delivery'}
              onClick={() => { onSetStatus(order, 'out_for_delivery'); notifyCustomer('out_for_delivery'); }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all border",
                order.status === 'out_for_delivery'
                  ? "bg-blue-500 text-white border-blue-500"
                  : "bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed"
              )}
            >
              <Truck className="w-4 h-4" />
              Out for Delivery
              {order.customer_email && <Bell className="w-3 h-3 opacity-60" />}
            </button>
          )}

          {/* Ready for Collection (collection orders only) */}
          {!isDelivery && (
            <button
              disabled={isDone || order.status === 'ready'}
              onClick={() => { onSetStatus(order, 'ready'); notifyCustomer('ready'); }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all border",
                order.status === 'ready'
                  ? "bg-green-500 text-white border-green-500"
                  : "bg-white text-gray-600 border-gray-200 hover:border-green-400 hover:text-green-600 disabled:opacity-40 disabled:cursor-not-allowed"
              )}
            >
              <CheckCircle2 className="w-4 h-4" />
              Ready for Collection
              {order.customer_email && <Bell className="w-3 h-3 opacity-60" />}
            </button>
          )}

          {/* Complete */}
          {!isDone && (
            <button
              onClick={() => onSetStatus(order, 'completed')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all border bg-white text-green-600 border-gray-200 hover:border-green-500 hover:bg-green-50"
            >
              <Check className="w-4 h-4" />
              Complete
            </button>
          )}

          {/* Cancel */}
          {!isDone && (
            <button
              onClick={() => onCancel(order)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all border bg-white text-red-500 border-gray-200 hover:border-red-400 hover:bg-red-50 ml-auto"
            >
              Cancel Order
            </button>
          )}

          {/* Print Receipt */}
          <ReceiptPrinter order={order} />
          </div>

        {/* Current status badge */}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[10px] text-gray-400 uppercase tracking-wide">Current status:</span>
          <span className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded text-white",
            STATUS_CONFIG[order.status]?.color || 'bg-gray-400'
          )}>
            {STATUS_CONFIG[order.status]?.label || order.status}
          </span>
          {order.customer_email && notifying && (
            <span className="text-[10px] text-blue-500 animate-pulse">Sending notification...</span>
          )}
          {!order.customer_email && (
            <span className="text-[10px] text-gray-400">(no email — notifications disabled)</span>
          )}
        </div>
      </div>

      {/* Customer header */}
      <div className="px-6 py-4 border-b border-gray-100 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-orange-600 text-sm font-bold">{order.customer_name?.[0]?.toUpperCase()}</span>
            </div>
            <div>
              <p className="font-bold text-gray-900 text-base">{order.customer_name}</p>
              {order.delivery_address && <p className="text-gray-500 text-sm">{order.delivery_address}</p>}
              {order.customer_phone && <p className="text-gray-400 text-xs mt-1">{order.customer_phone}</p>}
              {order.customer_email && <p className="text-gray-400 text-xs">{order.customer_email}</p>}
              {order.order_number && <p className="text-gray-400 text-xs">Order ID : {order.order_number}</p>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <LiveTimer createdDate={order.created_date} />
            {order.customer_phone && (
              <a href={`tel:${order.customer_phone}`} className="flex items-center gap-1 text-xs text-[#3a8fa0] border border-[#3a8fa0] rounded-md px-2.5 py-1 hover:bg-blue-50 transition-colors">
                <Phone className="w-3 h-3" /> Call
              </a>
            )}
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-0 mt-3 border-b border-gray-100">
          {['Order Items', 'Details'].map((label, i) => (
            <button
              key={label}
              onClick={() => setShowDetails(i === 1)}
              className={cn(
                'mr-6 pb-2 text-sm border-b-2 transition-colors',
                showDetails === (i === 1)
                  ? 'border-[#3a8fa0] text-[#3a8fa0] font-medium'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {showDetails ? (
          <div className="px-6 py-4 space-y-3 text-sm">
            {[
              ['Customer', order.customer_name],
              ['Customer no', order.customer_phone],
              ['Customer Email', order.customer_email],
              ['Order #', order.order_number],
              ['Placed At', order.created_date ? format(new Date(order.created_date), 'dd/MM/yyyy, HH:mm') : ''],
              ['Ordered Through', isDelivery ? 'Online - Delivery' : 'In-Store / Pickup'],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={label} className="flex">
                <span className="text-gray-400 w-40 shrink-0">{label}</span>
                <span className="text-gray-800 font-medium">: {value}</span>
              </div>
            ))}
            {isDelivery && order.delivery_address && (
              <div className="pt-3 mt-3 border-t border-gray-100">
                <p className="font-semibold text-gray-700 mb-2">Delivery Details</p>
                <div className="flex">
                  <span className="text-gray-400 w-40 shrink-0">Address</span>
                  <span className="text-gray-800">: {order.delivery_address}</span>
                </div>
                {order.delivery_postcode && (
                  <div className="flex mt-1">
                    <span className="text-gray-400 w-40 shrink-0">Postcode</span>
                    <span className="text-gray-800">: {order.delivery_postcode}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="px-6 py-4 relative min-h-full">
            {/* PAID watermark */}
            {isPaid && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="opacity-[0.05] rotate-[-22deg] border-[5px] border-green-800 rounded-xl px-8 py-3">
                  <span className="text-8xl font-black text-green-800 tracking-widest">PAID</span>
                </div>
              </div>
            )}
            <div className="relative z-10 space-y-4">
              {order.items?.map((item, idx) => (
                <div key={idx}>
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-gray-800">{item.quantity} x {item.item_name}</span>
                    <span className="text-gray-700 font-medium ml-6 shrink-0">£ {item.item_total?.toFixed(2)}</span>
                  </div>
                  {item.modifiers?.map((m, mi) => (
                    <p key={mi} className="text-gray-400 text-sm ml-4 mt-0.5">{m.option_name}</p>
                  ))}
                </div>
              ))}
              {order.notes && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Notes</p>
                  <p className="text-gray-600 text-sm">{order.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Payment Status Section */}
      {!showDetails && (
        <div className="border-t border-gray-200 px-6 py-3 bg-gray-50 space-y-2 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Payment Status</span>
            <button
              onClick={syncPaymentStatus}
              className="text-[10px] text-blue-600 hover:text-blue-700 font-medium"
              title="Sync payment status from gateway"
            >
              Refresh
            </button>
          </div>
          <div className={cn(
            "px-3 py-2 rounded-lg text-sm font-bold flex items-center justify-between",
            order.payment_status === 'paid' 
              ? 'bg-green-100 text-green-700 border border-green-300'
              : order.payment_status === 'refunded'
              ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
              : 'bg-red-100 text-red-700 border border-red-300'
          )}>
            <span>{order.payment_status === 'paid' ? '✓ PAID' : order.payment_status === 'refunded' ? '↩ REFUNDED' : '⏳ PENDING'}</span>
            <span className="text-xs font-normal opacity-75">{order.payment_method === 'card' ? '💳 Card' : '💵 Cash'}</span>
          </div>
        </div>
      )}

      {/* Totals footer */}
      {!showDetails && (
        <div className="border-t border-gray-200 px-6 py-3 space-y-1.5 bg-gray-50 shrink-0">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Sub Total</span><span>£ {(order.subtotal || 0).toFixed(2)}</span>
          </div>
          {isDelivery && (
            <div className="flex justify-between text-sm text-gray-500">
              <span>Delivery Charge</span><span>£ {(order.delivery_charge || 0).toFixed(2)}</span>
            </div>
          )}
          {order.discount_amount > 0 && (
            <div className="flex justify-between text-sm text-red-500">
              <span>Discount</span><span>- £ {order.discount_amount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
            <span className="font-bold text-gray-900 text-base">Grand Total</span>
            <span className="font-bold text-gray-900 text-base">£ {(order.total || 0).toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Beep sound ───────────────────────────────────────────────────────────────
function playOrderBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const beep = (freq, start, dur) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0.6, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur);
    };
    beep(880, 0, 0.2);
    beep(1100, 0.25, 0.2);
    beep(880, 0.5, 0.3);
  } catch (e) {}
}

// ── Main AdminOrders ──────────────────────────────────────────────────────────
export default function AdminOrders() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('current');
  const [selected, setSelected] = useState(null);
  const knownOrderIds = useRef(new Set());

  const { data: orders = [] } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => base44.entities.Order.list('-created_date', 200),
    initialData: [],
    refetchInterval: 8000,
  });

  // Initialise known IDs from first load
  useEffect(() => {
    base44.entities.Order.list('-created_date', 200).then(orders => {
      orders.forEach(o => knownOrderIds.current.add(o.id));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const unsub = base44.entities.Order.subscribe((event) => {
      if (event.type === 'create' && !knownOrderIds.current.has(event.id)) {
        knownOrderIds.current.add(event.id);
        playOrderBeep();
      }
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    });
    return unsub;
  }, [queryClient]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Order.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['admin-orders'] });
      const prev = queryClient.getQueryData(['admin-orders']);
      queryClient.setQueryData(['admin-orders'], (old = []) =>
        old.map(o => o.id === id ? { ...o, ...data } : o)
      );
      if (selected?.id === id) setSelected(s => ({ ...s, ...data }));
      return { prev };
    },
    onError: (_, __, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['admin-orders'], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['admin-orders'] }),
  });

  const setStatus = (order, status) => {
    updateMutation.mutate({ id: order.id, data: { status } });
  };

  const tabConfig = [
    { key: 'current',    label: 'CURRENT',    filter: o => ['received', 'in_kitchen'].includes(o.status) },
    { key: 'on_the_way', label: 'ON THE WAY', filter: o => ['out_for_delivery', 'ready'].includes(o.status) },
    { key: 'completed',  label: 'COMPLETED',  filter: o => ['completed', 'cancelled'].includes(o.status) },
  ];

  const currentTab = tabConfig.find(t => t.key === tab);
  const visibleOrders = orders.filter(currentTab.filter);

  return (
    <div className="-m-4 lg:-m-6 h-[calc(100vh-4rem)] flex overflow-hidden">

      {/* ── LEFT: Detail ── */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-200">
        <OrderDetail
          order={selected}
          onSetStatus={setStatus}
          onCancel={(o) => updateMutation.mutate({ id: o.id, data: { status: 'cancelled' } })}
        />
      </div>

      {/* ── RIGHT: Order List ── */}
      <div className="w-[390px] flex flex-col bg-white shrink-0 overflow-hidden">

        {/* Tabs */}
        <div className="flex border-b border-gray-200 shrink-0">
          {tabConfig.map(t => {
            const count = orders.filter(t.filter).length;
            return (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setSelected(null); }}
                className={cn(
                  'flex-1 py-3.5 text-[11px] font-bold tracking-wide transition-colors border-b-2',
                  tab === t.key
                    ? 'text-[#3a8fa0] border-[#3a8fa0]'
                    : 'text-gray-400 border-transparent hover:text-gray-600'
                )}
              >
                {t.label}
                {t.key !== 'completed' && count > 0 && (
                  <span className="ml-1 text-[9px] bg-red-500 text-white rounded-full px-1.5 py-0.5 align-middle">{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Completed table header */}
        {tab === 'completed' && (
          <div className="flex items-center px-3 py-2 border-b border-gray-100 bg-gray-50 text-[10px] font-bold text-gray-500 uppercase shrink-0">
            <span className="w-8">#</span>
            <span className="w-8">Type</span>
            <span className="flex-1">Address</span>
            <span className="w-14 text-right">Time</span>
            <span className="w-16 text-right">Amt</span>
            <span className="w-8 ml-1 text-center">Mode</span>
          </div>
        )}

        {/* List */}
        <PullToRefresh onRefresh={() => queryClient.invalidateQueries({ queryKey: ['admin-orders'] })} className="flex-1">
          {visibleOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-300">
              <ShoppingBag className="w-10 h-10 mb-2" />
              <p className="text-sm">No orders</p>
            </div>
          ) : tab === 'completed' ? (
            visibleOrders.map(order => (
              <div
                key={order.id}
                className="flex items-center px-3 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer text-sm"
                onClick={() => setSelected(order)}
              >
                <span className="w-8 font-bold text-gray-700 text-xs">{order.order_number?.slice(-4)}</span>
                <span className="w-8">
                  {order.order_type === 'delivery'
                    ? <Truck className="w-3.5 h-3.5 text-gray-400" />
                    : <ShoppingBag className="w-3.5 h-3.5 text-gray-400" />}
                </span>
                <span className="flex-1 text-gray-600 text-xs truncate pr-2">
                  {order.order_type === 'delivery' ? (order.delivery_address || order.delivery_postcode) : 'Pickup : ' + order.customer_name}
                </span>
                <span className="w-14 text-gray-400 text-xs text-right">
                  {order.created_date ? format(new Date(order.created_date), 'HH:mm') : ''}
                </span>
                <span className="w-16 font-semibold text-gray-800 text-xs text-right">£{(order.total || 0).toFixed(2)}</span>
                <span className="w-8 ml-1 text-center text-sm">
                  {order.payment_method === 'card' ? '💳' : '💵'}
                </span>
              </div>
            ))
          ) : (
            visibleOrders.map(order => (
              <div
                key={order.id}
                onClick={() => setSelected(order)}
                className={cn(
                  'flex items-center gap-3 px-4 py-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors border-l-[3px]',
                  selected?.id === order.id
                    ? 'bg-[#3a8fa0]/5 border-l-[#3a8fa0]'
                    : 'border-l-transparent'
                )}
              >
                <span className="font-black text-gray-800 text-sm w-6 shrink-0 text-center">
                  {order.order_number?.slice(-2)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">{order.customer_name}</p>
                  <p className="text-gray-400 text-xs truncate mt-0.5">
                    {order.order_type === 'delivery'
                      ? (order.delivery_address || order.delivery_postcode || 'Delivery')
                      : 'PICKUP : ' + order.customer_name}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                  {order.order_type === 'delivery'
                    ? <Truck className="w-4 h-4 text-gray-300" />
                    : <ShoppingBag className="w-4 h-4 text-gray-300" />}
                  <MinsBadge createdDate={order.created_date} />
                  {/* Quick Ready button */}
                  {order.status !== 'ready' && order.status !== 'out_for_delivery' && (
                    <button
                      onClick={() => setStatus(order, order.order_type === 'delivery' ? 'out_for_delivery' : 'ready')}
                      className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-500 hover:bg-green-600 text-white text-[10px] font-bold transition-colors"
                      title={order.order_type === 'delivery' ? 'Mark Out for Delivery' : 'Mark Ready for Pickup'}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      {order.order_type === 'delivery' ? 'Dispatch' : 'Ready'}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </PullToRefresh>
      </div>
    </div>
  );
}