import React from 'react';
import { Truck, Store } from 'lucide-react';

export default function OrderTypeSelector({ onSelect }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
      <button
        onClick={() => onSelect('delivery')}
        className="group flex flex-col items-center gap-4 p-8 bg-white rounded-2xl border-2 border-gray-100 hover:border-red-500 hover:shadow-xl hover:shadow-red-600/10 transition-all duration-300"
      >
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
          <Truck className="w-8 h-8 text-red-600" />
        </div>
        <div className="text-center">
          <h3 className="font-bold text-gray-900 text-lg">Delivery</h3>
          <p className="text-sm text-gray-400 mt-1">To your door</p>
        </div>
      </button>

      <button
        onClick={() => onSelect('collection')}
        className="group flex flex-col items-center gap-4 p-8 bg-white rounded-2xl border-2 border-gray-100 hover:border-red-500 hover:shadow-xl hover:shadow-red-600/10 transition-all duration-300"
      >
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
          <Store className="w-8 h-8 text-red-600" />
        </div>
        <div className="text-center">
          <h3 className="font-bold text-gray-900 text-lg">Collection</h3>
          <p className="text-sm text-gray-400 mt-1">Pick up in store</p>
        </div>
      </button>
    </div>
  );
}