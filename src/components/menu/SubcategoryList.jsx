import React, { useState } from 'react';

// SubcategoryList renders the items within a single category — the SECOND level
// of the menu hierarchy. Subcategories that have a name act as nested collapsible
// groups (so a size/flavour group can be opened to reveal its individual items),
// while items with no subcategory render directly as tappable rows.
export default function SubcategoryList({ items, subcategories, onSelectItem }) {
  // Tracks which subcategory group is currently expanded (null = all collapsed).
  const [openSub, setOpenSub] = useState(null);

  return (
    <div className="divide-y divide-gray-100">
      {subcategories.map(sub => {
        const subItems = items.filter(i => (i.subcategory || '') === sub);
        const isOpen = openSub === sub;

        // No subcategory → render items directly as add-to-cart rows.
        if (!sub) {
          return subItems.map(item => (
            <button
              key={item.id}
              onClick={() => onSelectItem(item)}
              className="w-full flex items-center justify-between px-4 py-3.5 bg-gray-50 hover:bg-gray-100 transition-colors group text-left"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 group-hover:text-red-600 transition-colors">{item.name}</p>
                {item.description && <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">{item.description}</p>}
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-4">
                <span className="text-sm font-bold text-red-600">£{item.base_price.toFixed(2)}</span>
                <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center text-white text-lg font-bold leading-none group-hover:bg-red-700 transition-colors">+</div>
              </div>
            </button>
          ));
        }

        const minPrice = Math.min(...subItems.map(i => i.base_price));
        return (
          <div key={sub}>
            {/* Subcategory group header — collapsible (second level) */}
            <button
              onClick={() => setOpenSub(isOpen ? null : sub)}
              aria-expanded={isOpen}
              className="w-full text-left px-4 py-3.5 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between gap-3 group"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 group-hover:text-red-600 transition-colors leading-snug">{sub}</p>
                {subItems[0]?.description && (
                  <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">{subItems[0].description}</p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-bold text-red-600">From £{minPrice.toFixed(2)}</span>
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-lg font-bold leading-none transition-all ${isOpen ? 'bg-gray-400 text-white rotate-45' : 'bg-red-600 text-white group-hover:bg-red-700'}`}>+</span>
              </div>
            </button>
            {isOpen && (
              <div className="bg-gray-50 px-4 py-3 space-y-2">
                {subItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { setOpenSub(null); onSelectItem(item); }}
                    className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-gray-300 hover:border-red-400 hover:bg-red-50 transition-all group"
                  >
                    <div className="text-left">
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-red-600">{item.name}</p>
                      {item.description && item.description !== subItems[0]?.description && (
                        <p className="text-xs text-gray-600 mt-0.5">{item.description}</p>
                      )}
                    </div>
                    <span className="text-sm font-bold text-red-600 shrink-0 ml-4">£{item.base_price.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}