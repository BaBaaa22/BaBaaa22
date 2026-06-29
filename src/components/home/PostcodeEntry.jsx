import React, { useState } from 'react';
import { MapPin, ArrowRight, AlertCircle, CheckCircle2, Truck, Loader2, XCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function PostcodeEntry({ onConfirm }) {
  const [postcode, setPostcode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [matched, setMatched] = useState(null); // { in_range, charge, minimum, zone_name, distance_miles, postcode }

  const handleCheck = async (e) => {
    e.preventDefault();
    const cleaned = postcode.trim().toUpperCase();
    if (!cleaned || cleaned.length < 3) {
      setError('Please enter a valid postcode');
      setMatched(null);
      return;
    }
    setError('');
    setLoading(true);
    setMatched(null);
    try {
      const res = await base44.functions.invoke('getDeliveryFee', { customer_postcode: cleaned });
      const d = res.data;
      if (!d.in_range) {
        setError("Sorry, we don't deliver to this area.");
      } else {
        setMatched({
          postcode: cleaned,
          charge: d.delivery_charge ?? 2.5,
          minimum: d.minimum_order ?? 10,
          zone_name: d.zone_name,
          distance_miles: d.distance_miles,
          in_range: true,
        });
      }
    } catch {
      setError('Could not check postcode. Please try again.');
    }
    setLoading(false);
  };

  const handleConfirm = () => {
    if (!matched) return;
    onConfirm({
      postcode: matched.postcode,
      deliveryCharge: matched.charge,
      minimumOrder: matched.minimum,
      inZone: true,
    });
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <MapPin className="w-7 h-7 text-red-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Enter your postcode</h2>
        <p className="text-sm text-gray-400">We'll check if we deliver to your area</p>
      </div>

      <form onSubmit={handleCheck} className="space-y-3">
        <div className="relative">
          <input
            type="text"
            value={postcode}
            onChange={(e) => { setPostcode(e.target.value); setError(''); setMatched(null); }}
            placeholder="e.g. TS14 6AA"
            className="w-full px-5 py-4 rounded-xl border border-gray-200 text-center text-lg font-medium focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all uppercase tracking-wider placeholder:normal-case placeholder:tracking-normal placeholder:text-gray-300"
            autoFocus
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-500 text-sm justify-center">
            <XCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Zone result card */}
        {matched && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {matched.zone_name
                ? `We deliver to ${matched.zone_name}!`
                : `We deliver to ${matched.postcode}!`}
              {matched.distance_miles != null && (
                <span className="ml-auto text-xs text-gray-400 font-normal">{matched.distance_miles} mi</span>
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1.5 text-gray-600">
                <Truck className="w-3.5 h-3.5" />
                <span>Delivery charge</span>
              </div>
              <span className="font-bold text-gray-900">
                {matched.charge === 0 ? 'Free' : `£${Number(matched.charge).toFixed(2)}`}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Minimum order</span>
              <span className="font-bold text-gray-900">£{Number(matched.minimum).toFixed(2)}</span>
            </div>
          </div>
        )}

        {!matched ? (
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-600/25 disabled:opacity-60"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Checking…</> : <>Check Postcode <ArrowRight className="w-4 h-4" /></>}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full py-4 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-600/25"
          >
            Continue to Order
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </form>
    </div>
  );
}