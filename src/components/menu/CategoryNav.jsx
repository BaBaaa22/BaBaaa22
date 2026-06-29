import React from 'react';
import { cn } from '@/lib/utils';
import { Menu, ChevronRight } from 'lucide-react';

export default function CategoryNav({ categories, activeCategory, onCategoryClick }) {
  return (
    <>
      {/* Desktop - vertical sticky sidebar */}
      <div className="hidden lg:block w-52 shrink-0">
        <div className="sticky top-20 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-gray-50">
            <Menu className="w-4 h-4 text-gray-600" />
            <span className="font-bold text-gray-800 text-sm">Menu</span>
          </div>
          {/* Categories */}
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 160px)' }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => onCategoryClick(cat)}
                className={cn(
                  "w-full text-left px-4 py-2.5 text-sm font-medium transition-all flex items-center justify-between border-b border-gray-100 last:border-0",
                  activeCategory === cat
                    ? "bg-[#2d5a27] text-white"
                    : "text-gray-700 hover:bg-gray-50"
                )}
              >
                <span>{cat}</span>
                {activeCategory === cat && <ChevronRight className="w-4 h-4 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile - horizontal scroll */}
      <div className="lg:hidden sticky top-16 z-30 bg-white border-b border-gray-100 -mx-4 px-4">
        <div className="flex gap-2 overflow-x-auto py-3 no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => onCategoryClick(cat)}
              className={cn(
                "whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 shrink-0",
                activeCategory === cat
                  ? "bg-[#2d5a27] text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}