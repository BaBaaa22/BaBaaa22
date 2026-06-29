import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import SubcategoryList from './SubcategoryList';

// CategoryAccordion is the FIRST level of the two-level menu hierarchy.
//
// Each category is a collapsible header. The parent controls which single
// category is open at a time (accordion behaviour) via `isOpen` / `onToggle`.
// Expanding a category reveals its SubcategoryList (the second level) with a
// smooth height + opacity transition.
//
// Visual feedback for the expandable/expanded state:
//   - Chevron rotates 180° when open
//   - Header tint shifts to red-50 and the title turns red
//   - Card border highlights red and gains a soft shadow
// Accessibility:
//   - Native <button> header → keyboard (Enter/Space) + screen-reader support
//   - aria-expanded / aria-controls link header ↔ panel
//   - role="region" + aria-labelledby on the panel
export default function CategoryAccordion({ category, icon, items, subcategories, isOpen, onToggle, onSelectItem, registerRef }) {
  const slug = category.replace(/\s+/g, '-').toLowerCase();
  const headerId = `cat-header-${slug}`;
  const panelId = `cat-panel-${slug}`;

  return (
    <div
      ref={registerRef}
      className={cn(
        "border rounded-xl overflow-hidden bg-white transition-colors duration-200",
        isOpen ? "border-red-300 shadow-sm" : "border-gray-200"
      )}
    >
      {/* Clickable category header — signals "expandable" via the chevron */}
      <button
        id={headerId}
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className={cn(
          "w-full flex items-center justify-between gap-3 px-4 py-4 text-left transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 rounded-xl",
          isOpen ? "bg-red-50" : "bg-white hover:bg-gray-50"
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl shrink-0">{icon}</span>
          <h2 className={cn(
            "text-sm font-bold uppercase tracking-widest truncate transition-colors",
            isOpen ? "text-red-600" : "text-gray-900 group-hover:text-red-600"
          )}>{category}</h2>
          <span className="text-xs text-gray-400 shrink-0 hidden sm:inline">{items.length} items</span>
        </div>
        <ChevronDown
          className={cn(
            "w-5 h-5 shrink-0 transition-all duration-300",
            isOpen ? "text-red-600 rotate-180" : "text-gray-400 group-hover:text-gray-600"
          )}
          aria-hidden="true"
        />
      </button>

      {/* Smooth expand/collapse panel — height animates from 0 → auto */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={headerId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-red-200">
              <SubcategoryList items={items} subcategories={subcategories} onSelectItem={onSelectItem} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}