import React, { useState, useEffect } from 'react';
import { X, Minus, Plus, Leaf, Flame, ShieldAlert, Sparkles, GlassWater, Candy } from 'lucide-react';
import { cn } from '@/lib/utils';

const DRINK_CATS = ['drinks', 'drink'];
const DESSERT_CATS = ['dessert', 'desserts'];

function getSuggestions(item, menuItems, cart) {
  if (!menuItems?.length || !item) return [];
  const cartNames = new Set(cart?.map(c => c.item_name) || []);
  const currentCat = item.category?.toLowerCase();

  const isDrink = (m) => DRINK_CATS.some(s => m.category?.toLowerCase().includes(s));
  const isDessert = (m) => DESSERT_CATS.some(s => m.category?.toLowerCase().includes(s));

  const eligible = menuItems.filter(m =>
    m.is_available &&
    m.id !== item.id &&
    !cartNames.has(m.name) &&
    !m.category?.toLowerCase().includes(currentCat) &&
    (isDrink(m) || isDessert(m))
  );

  // Pick up to 2 drinks + up to 2 desserts
  const drinks = eligible.filter(isDrink).slice(0, 2).map(m => ({ ...m, _type: 'drink' }));
  const desserts = eligible.filter(isDessert).slice(0, 2).map(m => ({ ...m, _type: 'dessert' }));
  return [...drinks, ...desserts];
}

function SuggestionButton({ item, onAdd }) {
  const [added, setAdded] = useState(false);
  const handleClick = () => {
    onAdd({ item_name: item.name, quantity: 1, base_price: item.base_price, modifiers: [], item_total: item.base_price });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex items-center justify-between rounded-xl px-3 py-2.5 transition-all text-left border",
        added
          ? "bg-green-50 border-green-300"
          : "bg-white border-orange-200 hover:border-red-400 hover:bg-red-50"
      )}
    >
      <div className="min-w-0 flex-1">
        <p className={cn("text-xs font-semibold truncate", added ? "text-green-700" : "text-gray-800")}>{item.name}</p>
        <p className="text-[10px] text-gray-400">£{item.base_price.toFixed(2)}</p>
      </div>
      <div className={cn(
        "w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ml-2 transition-colors",
        added ? "bg-green-500" : "bg-red-600"
      )}>
        {added ? '✓' : '+'}
      </div>
    </button>
  );
}

// Any group whose name contains "salad" (case-insensitive) gets the exclusive logic
const isSaladGroup = (groupName) => groupName?.toLowerCase().includes('salad');

// "All Salad" and "No Salad" are exclusive — selecting either clears all others in the group
const isSaladExclusive = (name) =>
  name?.toLowerCase() === 'no salad' || name?.toLowerCase().startsWith('all');

export default function CustomizationModal({ item, isOpen, onClose, onAddToCart, menuItems, cart }) {
  const [quantity, setQuantity] = useState(1);
  const [selections, setSelections] = useState({});

  useEffect(() => {
    if (item && isOpen) {
      setQuantity(1);
      const initial = {};
      (item.modifier_groups || []).forEach((g, gi) => {
        if (g.is_required && g.min_selections >= 1) {
          const first = g.options?.find(o => o.is_available !== false);
          if (first) initial[gi] = [first.name];
        } else {
          initial[gi] = [];
        }
      });
      setSelections(initial);
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const groups = item.modifier_groups || [];

  const toggleOption = (groupIndex, optionName, maxSel, groupName) => {
    setSelections(prev => {
      const current = prev[groupIndex] || [];

      if (isSaladGroup(groupName)) {
        if (isSaladExclusive(optionName)) {
          // Toggle exclusive: if already selected deselect, else select exclusively
          return { ...prev, [groupIndex]: current.includes(optionName) ? [] : [optionName] };
        } else {
          // Block if an exclusive option is active
          if (current.some(isSaladExclusive)) return prev;
          if (current.includes(optionName)) {
            return { ...prev, [groupIndex]: current.filter(n => n !== optionName) };
          }
          if (current.length >= maxSel) return prev;
          return { ...prev, [groupIndex]: [...current, optionName] };
        }
      }

      if (maxSel === 1) {
        return { ...prev, [groupIndex]: current[0] === optionName ? [] : [optionName] };
      }
      if (current.includes(optionName)) {
        return { ...prev, [groupIndex]: current.filter(n => n !== optionName) };
      }
      if (current.length >= maxSel) return prev;
      return { ...prev, [groupIndex]: [...current, optionName] };
    });
  };

  const calculatePrice = () => {
    let price = item.base_price;
    groups.forEach((g, gi) => {
      (selections[gi] || []).forEach(optName => {
        const opt = g.options?.find(o => o.name === optName);
        if (opt) price += opt.price_adjustment || 0;
      });
    });
    return price * quantity;
  };

  const isValid = () => {
    return groups.every((g, gi) => {
      if (!g.is_required) return true;
      return (selections[gi] || []).length >= (g.min_selections || 0);
    });
  };

  const handleAdd = () => {
    const modifiers = [];
    groups.forEach((g, gi) => {
      (selections[gi] || []).forEach(optName => {
        const opt = g.options?.find(o => o.name === optName);
        modifiers.push({ group_name: g.name, option_name: optName, price_adjustment: opt?.price_adjustment || 0 });
      });
    });
    onAddToCart({ item_name: item.name, quantity, base_price: item.base_price, modifiers, item_total: calculatePrice() });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div className="pr-8">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-bold text-gray-900">{item.name}</h2>
              {item.is_vegetarian && <Leaf className="w-4 h-4 text-green-500" />}
              {item.is_spicy && <Flame className="w-4 h-4 text-orange-500" />}
            </div>
            {item.description && <p className="text-sm text-gray-500">{item.description}</p>}
            <p className="text-lg font-bold text-red-600 mt-1">From £{item.base_price.toFixed(2)}</p>
          </div>
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Allergens */}
        {item.allergens?.length > 0 && (
          <div className="px-5 py-2 bg-amber-50 flex items-center gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-xs text-amber-700">Allergens: {item.allergens.join(', ')}</span>
          </div>
        )}

        {/* Modifier Groups */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {groups.map((group, gi) => {
            const currentSel = selections[gi] || [];
            const exclusiveActive = isSaladGroup(group.name) && currentSel.some(isSaladExclusive);
            const availableOptions = (group.options || []).filter(o => o.is_available !== false);

            return (
              <div key={gi}>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-semibold text-gray-900 text-sm">{group.name}</h3>
                  {group.is_required && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Required</span>
                  )}
                  {group.max_selections > 1 && (
                    <span className="text-[10px] text-gray-400">Select up to {group.max_selections}</span>
                  )}
                </div>
                <div className="space-y-1.5">
                  {availableOptions.map(opt => {
                    const selected = currentSel.includes(opt.name);
                    const isExclusive = isSaladGroup(group.name) && isSaladExclusive(opt.name);
                    const disabled = isSaladGroup(group.name) && !selected && exclusiveActive && !isExclusive;
                    const isRadio = group.max_selections === 1;

                    return (
                      <button
                        key={opt.name}
                        onClick={() => !disabled && toggleOption(gi, opt.name, group.max_selections, group.name)}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all duration-150 text-left",
                          selected
                            ? "border-red-400 bg-red-50"
                            : disabled
                            ? "border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed"
                            : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {/* Radio for single-select, checkbox for multi-select */}
                          <div className={cn(
                            "flex items-center justify-center transition-colors shrink-0",
                            isRadio
                              ? cn("w-4 h-4 rounded-full border-2", selected ? "border-red-500 bg-red-500" : "border-gray-300")
                              : cn("w-4 h-4 rounded border-2", selected ? "border-red-500 bg-red-500" : "border-gray-300")
                          )}>
                            {selected && (
                              isRadio
                                ? <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                : <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                                    <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                            )}
                          </div>
                          <span className={cn("text-sm", selected ? "font-medium text-gray-900" : "text-gray-600")}>{opt.name}</span>
                        </div>
                        {opt.price_adjustment > 0 && (
                          <span className="text-xs font-semibold text-gray-500 shrink-0">+£{opt.price_adjustment.toFixed(2)}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>



        {/* Footer */}
        <div className="border-t border-gray-100 p-5 space-y-3">
          <div className="flex items-center justify-center gap-4">
            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-lg font-bold w-8 text-center">{quantity}</span>
            <button onClick={() => setQuantity(q => q + 1)} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={handleAdd}
            disabled={!isValid()}
            className={cn(
              "w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-200",
              isValid() ? "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/25" : "bg-gray-100 text-gray-400 cursor-not-allowed"
            )}
          >
            Add to Order — £{calculatePrice().toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
}