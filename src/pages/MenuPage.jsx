import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import CustomizationModal from '../components/menu/CustomizationModal';
import SizePickerModal from '../components/menu/SizePickerModal';
import CartPanel from '../components/cart/CartPanel';
import CategoryAccordion from '../components/menu/CategoryAccordion';
import { ShoppingBag, ArrowLeft, Search, Sparkles, Loader2, X } from 'lucide-react';

const CATEGORY_ORDER = [
  'BASIC PIZZAS','HAM PIZZAS','CHICKEN PIZZAS','HOT & SPICY PIZZAS',
  'HOT AND SPICY PIZZAS','SPECIAL MIX PIZZAS','SEAFOOD PIZZAS',
  'HALF & HALF PIZZAS','GARLIC BREAD','KEBABS','BURGERS','PARMESAN',
  'WRAPS','POTATO DISHES','SIDE DISHES','SPECIAL DISHES','SAUCES',
  'TUB OF SAUCES','KIDS MEAL','KIDS MEALS','DESSERT','DESSERTS','DRINKS',
];

const CATEGORY_ICONS = {
  'BASIC PIZZAS': '🍕', 'HAM PIZZAS': '🍕', 'CHICKEN PIZZAS': '🍕',
  'HOT & SPICY PIZZAS': '🌶️', 'HOT AND SPICY PIZZAS': '🌶️',
  'SPECIAL MIX PIZZAS': '🍕', 'SEAFOOD PIZZAS': '🦐',
  'HALF & HALF PIZZAS': '🍕', 'GARLIC BREAD': '🥖', 'KEBABS': '🥙',
  'BURGERS': '🍔', 'PARMESAN': '🧀', 'WRAPS': '🌯',
  'POTATO DISHES': '🥔', 'SIDE DISHES': '🍟', 'SPECIAL DISHES': '⭐',
  'SAUCES': '🫙', 'TUB OF SAUCES': '🫙', 'KIDS MEAL': '👶',
  'KIDS MEALS': '👶', 'DESSERT': '🍨', 'DESSERTS': '🍨', 'DRINKS': '🥤',
};

const CART_STORAGE_KEY = 'marcos_cart_draft';

export default function MenuPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const orderType = urlParams.get('type') || 'collection';
  const deliveryCharge = parseFloat(urlParams.get('charge') || '0');
  const postcode = urlParams.get('postcode') || '';

  // Restore saved cart from sessionStorage (when returning from checkout)
  const [cart, setCart] = useState(() => {
    try {
      const saved = sessionStorage.getItem(CART_STORAGE_KEY);
      if (saved) { sessionStorage.removeItem(CART_STORAGE_KEY); return JSON.parse(saved); }
    } catch {}
    return [];
  });

  // Accordion state: only ONE category is expanded at a time (null = all collapsed).
  // This is the core of the two-level hierarchy — subcategories stay hidden until
  // the user opens a category.
  const [openCategory, setOpenCategory] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [sizePicker, setSizePicker] = useState(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  // AI menu search (trigger T5). aiResults: null = browsing; array = showing results.
  const [aiQuery, setAiQuery] = useState('');
  const [aiResults, setAiResults] = useState(null);
  const [aiSearching, setAiSearching] = useState(false);

  const { data: settingsArr } = useQuery({
    queryKey: ['store-settings'],
    queryFn: () => base44.entities.StoreSettings.filter({ setting_key: 'main' }),
    initialData: [],
  });
  const store = settingsArr[0] || {};

  // Refs for scrolling a category accordion into view when its pill is tapped.
  const sectionRefs = useRef({});
  const categoryBarRef = useRef(null);

  const { data: menuItems, isLoading } = useQuery({
    queryKey: ['menu-items'],
    queryFn: () => base44.entities.MenuItem.list('sort_order', 500),
    initialData: [],
  });

  const available = [...menuItems.filter(i => i.is_available)].sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999));

  const uniqueCategories = [...new Set(available.map(i => i.category))];
  const categoryMinOrder = {};
  for (const item of available) {
    if (categoryMinOrder[item.category] === undefined) categoryMinOrder[item.category] = item.sort_order ?? 9999;
  }
  const sortedCategories = uniqueCategories.sort((a, b) => {
    const ai = CATEGORY_ORDER.findIndex(c => c === a.toUpperCase().trim());
    const bi = CATEGORY_ORDER.findIndex(c => c === b.toUpperCase().trim());
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return (categoryMinOrder[a] ?? 9999) - (categoryMinOrder[b] ?? 9999);
  });

  // Open the first category by default so the menu isn't an empty list on load.
  useEffect(() => {
    if (sortedCategories.length > 0 && !openCategory) {
      setOpenCategory(sortedCategories[0]);
    }
  }, [sortedCategories, openCategory]);

  // Tapping a top pill opens that category's accordion (closing any other) and
  // scrolls it into view beneath the sticky header.
  const handleCategoryClick = useCallback((cat) => {
    setOpenCategory(cat);
    setTimeout(() => {
      const el = sectionRefs.current[cat];
      if (el) {
        const offset = 130;
        const top = el.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    }, 60);
  }, []);

  // Tapping an accordion header toggles it open/closed (accordion: one at a time).
  const handleToggleCategory = useCallback((cat) => {
    setOpenCategory(prev => (prev === cat ? null : cat));
  }, []);

  // Scroll active category pill into view in the horizontal bar.
  useEffect(() => {
    if (categoryBarRef.current && openCategory) {
      const btn = categoryBarRef.current.querySelector(`[data-cat="${openCategory}"]`);
      if (btn) btn.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    }
  }, [openCategory]);

  const runSmartSearch = async () => {
    const q = aiQuery.trim();
    if (q.length < 2) { setAiResults(null); return; }
    setAiSearching(true);
    try {
      const res = await base44.functions.invoke('smartMenuSearch', { query: q });
      setAiResults(Array.isArray(res.data?.matches) ? res.data.matches : []);
    } catch {
      setAiResults([]);
    }
    setAiSearching(false);
  };
  const clearSmartSearch = () => { setAiQuery(''); setAiResults(null); };

  const handleAddToCart = (cartItem) => setCart(prev => [...prev, cartItem]);
  const handleUpdateQuantity = (idx, newQty) => {
    if (newQty <= 0) {
      setCart(prev => prev.filter((_, i) => i !== idx));
    } else {
      setCart(prev => prev.map((item, i) => {
        if (i !== idx) return item;
        const unitPrice = item.item_total / item.quantity;
        return { ...item, quantity: newQty, item_total: unitPrice * newQty };
      }));
    }
  };
  const handleRemove = (idx) => setCart(prev => prev.filter((_, i) => i !== idx));
  const handleCheckout = () => {
    // Save cart to sessionStorage so checkout can pass it back if user returns
    try { sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart)); } catch {}
    const cartData = encodeURIComponent(JSON.stringify(cart));
    navigate(createPageUrl('Checkout') + `?type=${orderType}&postcode=${postcode}&charge=${deliveryCharge}&cart=${cartData}`);
  };

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const cartTotal = cart.reduce((sum, i) => sum + i.item_total, 0) + (orderType === 'delivery' ? deliveryCharge : 0);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-200" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(createPageUrl('Home'))}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-gray-700" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/40">
                <span className="text-xs font-black text-white">M</span>
              </div>
              <div className="hidden sm:block">
                <span className="font-black text-gray-900 text-sm tracking-tight">Marco's</span>
                <span className="text-red-600 font-bold text-sm"> Pizzeria</span>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-sm">
            <span className="text-gray-600">Order type:</span>
            <span className="font-semibold text-gray-900 capitalize">{orderType}</span>
            {postcode && <span className="text-gray-500">• {postcode}</span>}
          </div>

          <button
            onClick={() => cart.length > 0 ? handleCheckout() : setMobileCartOpen(true)}
            className="relative flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg shadow-red-600/20 hover:bg-red-700 transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline">{cart.length > 0 ? 'Checkout' : 'Cart'}</span>
            {cartCount > 0 && (
              <span className="w-5 h-5 bg-white text-red-600 text-[10px] font-black rounded-full flex items-center justify-center">{cartCount}</span>
            )}
          </button>
        </div>

        {/* AI menu search (trigger T5) */}
        <div className="px-4 pb-2 pt-1">
          <div className="relative max-w-2xl">
            <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
            <input
              value={aiQuery}
              onChange={e => setAiQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') runSmartSearch(); }}
              placeholder="Try “spicy chicken under £8, no dairy”…"
              className="w-full pl-9 pr-28 py-2.5 rounded-full border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400"
            />
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {(aiQuery || aiResults !== null) && (
                <button onClick={clearSmartSearch} className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-200">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={runSmartSearch} disabled={aiSearching}
                className="flex items-center gap-1 bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-red-700 disabled:opacity-60">
                {aiSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                Search
              </button>
            </div>
          </div>
        </div>

        {/* Category quick-nav pills — tapping opens the matching accordion section */}
        <div ref={categoryBarRef} className="flex gap-2 overflow-x-auto px-4 pb-3 pt-1 no-scrollbar">
          {sortedCategories.map(cat => (
            <button
              key={cat}
              data-cat={cat}
              onClick={() => handleCategoryClick(cat)}
              aria-pressed={openCategory === cat}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 shrink-0 ${
                openCategory === cat
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              {CATEGORY_ICONS[cat.toUpperCase().trim()] || '🍽️'} {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Hero */}
      <div className="relative w-full h-40 sm:h-52 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1400&q=90"
          alt="Marco's Pizza"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-black/50" />
        <div className="absolute bottom-4 left-5">
          <h1 className="text-2xl font-black text-white tracking-tight drop-shadow-lg">Marco's Pizzeria</h1>
          <p className="text-sm text-gray-100 capitalize">{orderType}{postcode && ` • ${postcode}`}</p>
        </div>
      </div>

      {/* Main layout */}
      <div className="max-w-7xl mx-auto px-4 py-4 lg:py-6">
        <div className="flex gap-6">
          {/* Menu — two-level accordion: categories (collapsible) → subcategories/items */}
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <div className="space-y-3">
                {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
              </div>
            ) : aiResults !== null ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-red-500" />
                    {aiResults.length} result{aiResults.length === 1 ? '' : 's'} for “{aiQuery}”
                  </h2>
                  <button onClick={clearSmartSearch} className="text-xs font-semibold text-red-600 hover:underline">Clear</button>
                </div>
                {aiResults.length === 0 ? (
                  <p className="text-sm text-gray-500 py-8 text-center">No matches — try different words, or browse the full menu.</p>
                ) : (
                  <CategoryAccordion
                    category="Search results"
                    icon="✨"
                    items={aiResults.map(m => available.find(i => i.name === m.name)).filter(Boolean)}
                    subcategories={['']}
                    isOpen={true}
                    onToggle={() => {}}
                    onSelectItem={setSelectedItem}
                    registerRef={() => {}}
                  />
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {sortedCategories.map(cat => {
                  const items = available.filter(i => i.category === cat);
                  const subcategories = [...new Set(items.map(i => i.subcategory || ''))];
                  const icon = CATEGORY_ICONS[cat.toUpperCase().trim()] || '🍽️';

                  return (
                    <CategoryAccordion
                      key={cat}
                      category={cat}
                      icon={icon}
                      items={items}
                      subcategories={subcategories}
                      isOpen={openCategory === cat}
                      onToggle={() => handleToggleCategory(cat)}
                      onSelectItem={setSelectedItem}
                      registerRef={el => { sectionRefs.current[cat] = el; }}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Desktop cart */}
          <div className="hidden lg:flex flex-col gap-4 shrink-0 w-64">
            <div className="bg-gray-100 border border-gray-300 rounded-xl overflow-hidden text-center">
              <img
                src="https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=400&q=80"
                alt="Pizza"
                className="w-full h-28 object-cover"
              />
              <div className="p-4">
                <p className="text-xl font-black text-gray-900 tracking-tight">Marco's</p>
                <p className="text-xs text-red-600 font-bold uppercase tracking-widest">Pizzeria</p>
              </div>
            </div>
            <CartPanel
              items={cart}
              orderType={orderType}
              deliveryCharge={deliveryCharge}
              onUpdateQuantity={handleUpdateQuantity}
              onRemove={handleRemove}
              onCheckout={handleCheckout}
              isMobileOpen={mobileCartOpen}
              onMobileClose={() => setMobileCartOpen(false)}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 text-gray-400 mt-8">
        <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/40">
                <span className="text-xs font-black text-white">M</span>
              </div>
              <span className="font-black text-white text-sm">Marco's</span>
            </div>
            <p className="text-xs leading-relaxed text-gray-400">Fresh, delicious food made with love.</p>
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wide mb-3">Quick Links</h4>
            <ul className="space-y-1.5 text-xs">
              <li><button onClick={() => navigate(createPageUrl('Home'))} className="text-gray-400 hover:text-white transition-colors">Home</button></li>
              <li><span>Special Offers</span></li>
              <li><span>About Us</span></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wide mb-3">Support</h4>
            <ul className="space-y-1.5 text-xs">
              <li><span>Contact Us</span></li>
              <li><span>Allergy Info</span></li>
              <li><span>Terms & Conditions</span></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wide mb-3">Hours</h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between gap-2"><span>Mon–Fri</span><span className="text-gray-300">11:00–22:00</span></div>
              <div className="flex justify-between gap-2"><span>Saturday</span><span className="text-gray-300">11:00–23:00</span></div>
              <div className="flex justify-between gap-2"><span>Sunday</span><span className="text-gray-300">12:00–22:00</span></div>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-800 py-4 text-center text-xs text-gray-600">
          © {new Date().getFullYear()} Marco's Pizzeria. All rights reserved.
        </div>
      </footer>

      {/* Mobile cart bar */}
      {cart.length > 0 && !mobileCartOpen && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 p-4 z-40" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
          <button
            onClick={() => setMobileCartOpen(true)}
            className="w-full py-3.5 bg-red-600 text-white rounded-xl font-semibold text-sm flex items-center justify-between px-5 shadow-lg shadow-red-600/20 hover:bg-red-700 transition-colors"
          >
            <span className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              View Basket ({cartCount})
            </span>
            <span>£{cartTotal.toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* Mobile cart panel */}
      <div className="lg:hidden">
        <CartPanel
          items={cart}
          orderType={orderType}
          deliveryCharge={deliveryCharge}
          onUpdateQuantity={handleUpdateQuantity}
          onRemove={handleRemove}
          onCheckout={handleCheckout}
          isMobileOpen={mobileCartOpen}
          onMobileClose={() => setMobileCartOpen(false)}
        />
      </div>

      <SizePickerModal
        subcategoryName={sizePicker?.subcategoryName}
        items={sizePicker?.items}
        isOpen={!!sizePicker}
        onClose={() => setSizePicker(null)}
        onSelectItem={(item) => { setSizePicker(null); setSelectedItem(item); }}
      />

      <CustomizationModal
        item={selectedItem}
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onAddToCart={handleAddToCart}
        menuItems={available}
        cart={cart}
      />
    </div>
  );
}