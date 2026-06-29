import React from 'react';
import { ShoppingBag, Plus, Minus, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CartPanel({ items, orderType, deliveryCharge, onUpdateQuantity, onRemove, onCheckout, isMobileOpen, onMobileClose }) {
  const subtotal = items.reduce((sum, it) => sum + it.item_total, 0);
  const total = subtotal + (orderType === 'delivery' ? deliveryCharge : 0);

  const content = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-red-600" />
          <h3 className="font-bold text-gray-900">Your Order</h3>
          <span className="text-xs text-gray-400">({items.length} items)</span>
        </div>
        <button onClick={onMobileClose} className="lg:hidden w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Your basket is empty</p>
          </div>
        ) : items.map((item, idx) => (
          <div key={idx} className="bg-gray-50 rounded-xl p-3">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900 truncate">{item.item_name}</p>
                {item.modifiers?.map((m, mi) => (
                  <p key={mi} className="text-xs text-gray-400 ml-2">
                    + {m.option_name} {m.price_adjustment > 0 && `(+£${m.price_adjustment.toFixed(2)})`}
                  </p>
                ))}
              </div>
              <p className="font-semibold text-sm text-gray-900 ml-2">£{item.item_total.toFixed(2)}</p>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onUpdateQuantity(idx, item.quantity - 1)}
                  className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-white transition-colors"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-sm font-medium w-5 text-center">{item.quantity}</span>
                <button
                  onClick={() => onUpdateQuantity(idx, item.quantity + 1)}
                  className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-white transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <button
                onClick={() => onRemove(idx)}
                className="text-gray-300 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {items.length > 0 && (
        <div className="border-t border-gray-100 p-4 space-y-3">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>£{subtotal.toFixed(2)}</span>
            </div>
            {orderType === 'delivery' && (
              <div className="flex justify-between text-gray-500">
                <span>Delivery</span>
                <span>£{deliveryCharge.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-100">
              <span>Total</span>
              <span>£{total.toFixed(2)}</span>
            </div>
          </div>
          <button
            onClick={onCheckout}
            className="w-full py-3.5 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-700 transition-colors shadow-lg shadow-red-600/25"
          >
            Go to Checkout — £{total.toFixed(2)}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop — renders inline inside parent column */}
      <div className="hidden lg:block">
        <div className="sticky top-24 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" style={{ maxHeight: 'calc(100vh - 260px)' }}>
          {content}
        </div>
      </div>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={onMobileClose} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl" style={{ maxHeight: '85vh', paddingBottom: 'env(safe-area-inset-bottom)' }}>
            {content}
          </div>
        </div>
      )}
    </>
  );
}