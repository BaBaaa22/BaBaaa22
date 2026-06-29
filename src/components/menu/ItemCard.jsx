import React from 'react';
import { Leaf, Flame, Plus } from 'lucide-react';

export default function ItemCard({ item, onAdd }) {
  const hasModifiers = item.modifier_groups && item.modifier_groups.length > 0;

  return (
    <div
      onClick={() => onAdd(item)}
      className="group bg-white rounded-xl border border-gray-100 p-4 hover:border-red-200 hover:shadow-lg hover:shadow-red-600/5 transition-all duration-200 cursor-pointer"
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 text-sm truncate">{item.name}</h3>
            {item.is_vegetarian && <Leaf className="w-3.5 h-3.5 text-green-500 shrink-0" />}
            {item.is_spicy && <Flame className="w-3.5 h-3.5 text-orange-500 shrink-0" />}
          </div>
          {item.description && (
            <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{item.description}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className="text-sm font-bold text-gray-900">£{item.base_price.toFixed(2)}</span>
          <button className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center group-hover:bg-red-700 transition-colors shadow-sm">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}