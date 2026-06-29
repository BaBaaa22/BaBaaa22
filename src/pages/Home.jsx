import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Phone, MapPin, Clock, ChevronRight, Truck, ShoppingBag, History } from 'lucide-react';
import PostcodeEntry from '../components/home/PostcodeEntry';

export default function Home() {
  const navigate = useNavigate();
  const [orderType, setOrderType] = useState(null); // null | 'delivery' | 'collection'

  const { data: settings } = useQuery({
    queryKey: ['store-settings'],
    queryFn: () => base44.entities.StoreSettings.filter({ setting_key: 'main' }),
    initialData: [],
  });
  const store = settings[0] || {};

  const handlePostcodeConfirm = (data) => {
    navigate(createPageUrl('MenuPage') + `?type=delivery&postcode=${data.postcode}&charge=${data.deliveryCharge}&min=${data.minimumOrder}`);
  };

  const handleCollection = () => {
    navigate(createPageUrl('MenuPage') + '?type=collection&charge=0&min=0');
  };

  const now = new Date();
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const todayName = days[now.getDay()];
  const todayHours = store.opening_hours?.find(h => h.day === todayName);

  // Check if currently within opening hours
  const isWithinOpeningHours = () => {
    if (!todayHours || todayHours.is_closed) return false;
    const [openH, openM] = todayHours.open.split(':').map(Number);
    const [closeH, closeM] = todayHours.close.split(':').map(Number);
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const openMins = openH * 60 + openM;
    const closeMins = closeH * 60 + closeM;
    return nowMins >= openMins && nowMins < closeMins;
  };
  const canOrder = store.is_open && isWithinOpeningHours();

  // Auto-redirect to menu (collection) on load when store is open
  useEffect(() => {
    if (canOrder && store.setting_key) {
      navigate(createPageUrl('MenuPage') + '?type=collection&charge=0&min=0');
    }
  }, [canOrder, store.setting_key]);

  return (
    <div className="min-h-screen bg-[#111111] text-white">
      {/* Offer Banner */}
      {store.offer_banner_active && store.offer_banner_text && (
        <div className="bg-red-600 text-white text-center py-2 px-4 text-sm font-medium">
          {store.offer_banner_text}
        </div>
      )}

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1400&q=80')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-[#111111]/70 to-[#111111]" />

        <div className="relative z-10 flex flex-col items-center justify-center px-4 pt-14 pb-10 text-center">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69ab3c5ee6dd34e24ec02946/1590bd894_1646650230phpNSMmxN.jpg"
            alt="Marco's Pizzeria"
            className="h-36 object-contain mb-4 drop-shadow-2xl"
          />
          <p className="text-gray-400 text-sm tracking-widest uppercase mb-2">Pizza · Kebabs · Burgers · Parmesan</p>

          {/* Open/Closed badge */}
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-8 ${store.is_open ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${store.is_open ? 'bg-green-400' : 'bg-red-400'}`} />
            {store.is_open ? `Open Now${todayHours ? ` · Closes ${todayHours.close}` : ''}` : 'Currently Closed'}
          </div>

          {/* Order Type Selection */}
          {!canOrder ? (
            <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-center">
              <p className="text-red-400 font-semibold text-base mb-1">We're currently closed</p>
              <p className="text-gray-400 text-sm">
                {todayHours && !todayHours.is_closed
                  ? `We open today at ${todayHours.open}`
                  : 'Please check back during opening hours'}
              </p>
              <p className="text-gray-500 text-xs mt-2">Mon–Sun · 15:30 – 22:00</p>
              <button
                onClick={() => navigate(createPageUrl('MenuPage') + '?type=collection&charge=0&min=0')}
                className="mt-4 w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-semibold text-sm transition-colors"
              >
                Browse Menu
              </button>
            </div>
          ) : !orderType ? (
            <div className="w-full max-w-sm space-y-3">
              <p className="text-gray-400 text-sm mb-4">How would you like your order?</p>
              <button
                onClick={() => setOrderType('delivery')}
                className="w-full flex items-center justify-between bg-red-600 hover:bg-red-700 active:scale-95 transition-all rounded-2xl px-6 py-4 font-bold text-lg shadow-lg shadow-red-900/40"
              >
                <div className="flex items-center gap-3">
                  <Truck className="w-6 h-6" />
                  <div className="text-left">
                    <div>Delivery</div>
                    <div className="text-xs font-normal text-red-200">Min. £{store.minimum_delivery_order || 10}</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 opacity-70" />
              </button>

              <button
                onClick={handleCollection}
                className="w-full flex items-center justify-between bg-white/10 hover:bg-white/20 active:scale-95 transition-all border border-white/20 rounded-2xl px-6 py-4 font-bold text-lg"
              >
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-6 h-6" />
                  <div className="text-left">
                    <div>Collection</div>
                    <div className="text-xs font-normal text-gray-400">Free · Pick up yourself</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 opacity-70" />
              </button>
            </div>
          ) : (
            <div className="w-full max-w-sm">
              <button
                onClick={() => setOrderType(null)}
                className="text-gray-400 hover:text-white text-sm mb-4 flex items-center gap-1 mx-auto transition-colors"
              >
                ← Back
              </button>
              <PostcodeEntry
                onConfirm={handlePostcodeConfirm}
              />
            </div>
          )}
        </div>
      </div>

      {/* Order History shortcut */}
      <div className="max-w-sm mx-auto px-4 mt-2">
        <button
          onClick={() => navigate(createPageUrl('OrderHistory'))}
          className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 transition-colors border border-white/10 rounded-xl px-4 py-3 mb-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-red-600/20 flex items-center justify-center">
              <History className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-left">
              <p className="text-white font-semibold text-sm">My Orders</p>
              <p className="text-gray-500 text-xs">View history & reorder</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Store Info */}
      <div className="max-w-sm mx-auto px-4 pb-10 space-y-3 mt-2">
        <div className="h-px bg-white/10 mb-6" />

        {store.phone && (
          <a href={`tel:${store.phone}`} className="flex items-center gap-4 bg-white/5 hover:bg-white/10 transition-colors rounded-xl px-4 py-3 border border-white/10">
            <div className="w-9 h-9 rounded-full bg-red-600/20 flex items-center justify-center flex-shrink-0">
              <Phone className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Call Us</p>
              <p className="font-semibold text-white">{store.phone}</p>
            </div>
          </a>
        )}

        {store.address && (
          <div className="flex items-center gap-4 bg-white/5 rounded-xl px-4 py-3 border border-white/10">
            <div className="w-9 h-9 rounded-full bg-red-600/20 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Find Us</p>
              <p className="font-semibold text-white">{store.address}</p>
            </div>
          </div>
        )}

        {todayHours && (
          <div className="flex items-center gap-4 bg-white/5 rounded-xl px-4 py-3 border border-white/10">
            <div className="w-9 h-9 rounded-full bg-red-600/20 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Today's Hours</p>
              <p className="font-semibold text-white">{todayHours.open} – {todayHours.close}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}