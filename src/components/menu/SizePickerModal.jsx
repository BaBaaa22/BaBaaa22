import React from 'react';
import { X, ChevronRight } from 'lucide-react';

/**
 * Modal shown when a customer clicks a subcategory (e.g. "Margherita").
 * Lists all size variants (10", 12", 14"...) so they can pick one.
 */
export default function SizePickerModal({ subcategoryName, items, isOpen, onClose, onSelectItem }) {
  if (!isOpen || !items?.length) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">{subcategoryName}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Choose your size</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Size options */}
        <div className="overflow-y-auto max-h-[60vh]">
          {items.map(item => (
            <button
              key={item.id}
              onClick={() => onSelectItem(item)}
              className="w-full flex items-center justify-between px-5 py-4 border-b border-gray-50 hover:bg-gray-50 transition-colors last:border-0 group"
            >
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-800 group-hover:text-red-600 transition-colors">
                  {item.name}
                </p>
                {item.description && (
                  <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <span className="text-sm font-bold text-gray-900">£{item.base_price.toFixed(2)}</span>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-red-500 transition-colors" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}