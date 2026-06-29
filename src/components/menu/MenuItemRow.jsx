import React from 'react';

/**
 * A single menu item rendered as a text row: name left, price right.
 * Shows "From £X.XX" when the item has size/modifier options.
 */
export default function MenuItemRow({ item, onAdd }) {
  const hasSizes = item.modifier_groups?.some(g => g.options?.length > 1);
  const priceLabel = hasSizes
    ? `From £${item.base_price.toFixed(2)}`
    : `£${item.base_price.toFixed(2)}`;

  return (
    <button
      onClick={() => onAdd(item)}
      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors group flex items-center justify-between gap-3"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-800 group-hover:text-red-600 transition-colors leading-snug">{item.name}</p>
        {item.description && (
          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed line-clamp-1">{item.description}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-bold text-gray-700">{priceLabel}</span>
        <span className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center text-lg font-bold leading-none group-hover:bg-red-700 transition-colors">+</span>
      </div>
    </button>
  );
}