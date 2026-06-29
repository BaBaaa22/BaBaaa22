import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { CheckCircle2, Clock, ChefHat, Package, CircleDot, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUSES = [
  { key: 'received', label: 'Order Received', icon: Clock, color: 'text-blue-500' },
  { key: 'in_kitchen', label: 'Preparing', icon: ChefHat, color: 'text-orange-500' },
  { key: 'ready', label: 'Ready', icon: Package, color: 'text-green-500' },
  { key: 'completed', label: 'Completed', icon: CheckCircle2, color: 'text-green-600' },
];

export default function OrderStatus() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('id');
  const [order, setOrder] = useState(null);

  useEffect(() => {
    if (!orderId) return;
    base44.functions.invoke('getOrderById', { order_id: orderId })
      .then(res => { if (res?.data?.order) setOrder(res.data.order); })
      .catch(() => {});
  }, [orderId]);

  // Poll for updates every 15s (real-time subscription requires auth)
  useEffect(() => {
    if (!orderId) return;
    const interval = setInterval(() => {
      base44.functions.invoke('getOrderById', { order_id: orderId })
        .then(res => { if (res?.data?.order) setOrder(res.data.order); })
        .catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [orderId]);

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentIdx = STATUSES.findIndex(s => s.key === order.status);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-12">
        {/* Success header */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-1">Order Placed!</h1>
          <p className="text-gray-400 text-sm">Order #{order.order_number}</p>
        </div>

        {/* Status Timeline */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 mb-6">
          <h2 className="font-bold text-gray-900 mb-6">Order Status</h2>
          <div className="space-y-0">
            {STATUSES.map((status, idx) => {
              const isActive = idx <= currentIdx;
              const isCurrent = idx === currentIdx;
              const Icon = status.icon;
              return (
                <div key={status.key} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                      isActive ? "bg-red-600" : "bg-gray-100",
                      isCurrent && "ring-4 ring-red-100"
                    )}>
                      <Icon className={cn("w-5 h-5", isActive ? "text-white" : "text-gray-300")} />
                    </div>
                    {idx < STATUSES.length - 1 && (
                      <div className={cn("w-0.5 h-8", isActive ? "bg-red-600" : "bg-gray-100")} />
                    )}
                  </div>
                  <div className="pt-2 pb-4">
                    <p className={cn("font-medium text-sm", isActive ? "text-gray-900" : "text-gray-400")}>{status.label}</p>
                    {isCurrent && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <CircleDot className="w-3 h-3 text-red-500 animate-pulse" />
                        <span className="text-xs text-red-500 font-medium">Current</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Details */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 mb-6">
          <h2 className="font-bold text-gray-900 mb-4">Order Details</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Type</span>
              <span className="font-medium text-gray-700 capitalize">{order.order_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Payment</span>
              <span className="font-medium text-gray-700 capitalize">{order.payment_method}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Payment Status</span>
              <span className={cn("font-medium capitalize", order.payment_status === 'paid' ? 'text-green-600' : 'text-amber-500')}>
                {order.payment_status === 'paid' ? '✓ Paid' : 'Awaiting Payment'}
              </span>
            </div>
            <div className="border-t border-gray-100 pt-3 space-y-2">
              {order.items?.map((item, idx) => (
                <div key={idx} className="flex justify-between">
                  <span className="text-gray-600">{item.quantity}x {item.item_name}</span>
                  <span className="font-medium">£{item.item_total?.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-gray-900">
              <span>Total</span>
              <span>£{order.total?.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate(createPageUrl('Home'))}
          className="w-full py-3.5 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
        >
          <Home className="w-4 h-4" />
          Back to Home
        </button>
      </div>
    </div>
  );
}