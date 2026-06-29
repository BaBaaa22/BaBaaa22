import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Search, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';

const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all placeholder:text-gray-400 bg-white";
const labelCls = "block text-sm font-medium text-gray-700 mb-1.5";

export default function AddressFields({ postcode: initialPostcode, onAddressChange }) {
  const [postcodeInput, setPostcodeInput] = useState(initialPostcode || '');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const [doorNumber, setDoorNumber] = useState('');
  const [flat, setFlat] = useState('');
  const [streetName, setStreetName] = useState('');
  const [postcodeField, setPostcodeField] = useState(initialPostcode || '');
  const [addressFound, setAddressFound] = useState(false);

  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  // Notify parent whenever address fields change
  useEffect(() => {
    const parts = [doorNumber, flat, streetName, postcodeField].filter(Boolean);
    onAddressChange(parts.join(', '));
  }, [doorNumber, flat, streetName, postcodeField]);

  // Auto-search as user types postcode
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = postcodeInput.trim();
    if (q.length < 3) { setSuggestions([]); setShowDropdown(false); return; }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await base44.functions.invoke('placesAutocomplete', { input: q });
        const preds = res.data?.predictions || [];
        setSuggestions(preds);
        setShowDropdown(preds.length > 0);
      } catch {
        setSuggestions([]);
        setShowDropdown(false);
      }
      setSearching(false);
    }, 400);
  }, [postcodeInput]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectSuggestion = async (prediction) => {
    setShowDropdown(false);
    setSuggestions([]);
    setSearching(true);
    try {
      const res = await base44.functions.invoke('placesDetails', { place_id: prediction.place_id });
      const d = res.data;
      if (d) {
        setDoorNumber(d.street_number || '');
        setStreetName(d.route || '');
        setPostcodeField(d.postcode || postcodeInput.toUpperCase());
        setPostcodeInput(d.postcode || postcodeInput.toUpperCase());
        setAddressFound(true);
      }
    } catch {}
    setSearching(false);
  };

  return (
    <div className="mt-4 space-y-3">
      {/* Postcode lookup */}
      <div>
        <label className={labelCls}>Postcode *</label>
        <div className="relative" ref={dropdownRef}>
          <div className="relative">
            {searching
              ? <Loader2 className="absolute left-3 top-3.5 w-4 h-4 text-orange-400 animate-spin" />
              : addressFound
                ? <CheckCircle2 className="absolute left-3 top-3.5 w-4 h-4 text-green-500" />
                : <Search className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
            }
            <input
              className={cn(inputCls, "pl-9")}
              value={postcodeInput}
              onChange={e => { setPostcodeInput(e.target.value.toUpperCase()); setAddressFound(false); }}
              placeholder="e.g. TS14 6AA — type to find your address"
              autoComplete="off"
              required
            />
          </div>

          {showDropdown && suggestions.length > 0 && (
            <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
              {suggestions.map((s, i) => (
                <button
                  key={s.place_id || i}
                  type="button"
                  onClick={() => selectSuggestion(s)}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50 flex items-start gap-2.5 transition-colors border-b border-gray-50 last:border-0"
                >
                  <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                  <span>
                    <span className="font-semibold text-gray-800">{s.main_text}</span>
                    {s.secondary_text && <span className="text-gray-400"> {s.secondary_text}</span>}
                  </span>
                </button>
              ))}
              <div className="px-4 py-1.5 text-right">
                <span className="text-[10px] text-gray-300">powered by Google</span>
              </div>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1">Type your postcode to find and select your address from the list.</p>
      </div>

      {/* Manual fields — shown after postcode typed or address selected */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Door / House Number *</label>
          <input className={inputCls} value={doorNumber}
            onChange={e => setDoorNumber(e.target.value)}
            placeholder="e.g. 12" required />
        </div>
        <div>
          <label className={labelCls}>Flat / Apt <span className="text-gray-400 font-normal">(optional)</span></label>
          <input className={inputCls} value={flat}
            onChange={e => setFlat(e.target.value)}
            placeholder="e.g. Flat 3B" />
        </div>
      </div>

      <div>
        <label className={labelCls}>Street Name *</label>
        <input className={inputCls} value={streetName}
          onChange={e => setStreetName(e.target.value)}
          placeholder="e.g. Main Street" required />
      </div>

      {/* Full address preview */}
      {(doorNumber || streetName) && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
          <span className="text-sm text-green-700 font-medium">
            {[doorNumber, flat, streetName, postcodeField].filter(Boolean).join(', ')}
          </span>
        </div>
      )}
    </div>
  );
}