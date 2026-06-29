import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Check } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';

/**
 * A select that renders a native <select> on desktop and a bottom Drawer on mobile.
 * Props:
 *   value       – current value
 *   onChange    – (value: string) => void
 *   options     – Array<{ value: string, label: string }>
 *   placeholder – text shown when no value selected
 *   label       – optional drawer title
 *   className   – extra classes for the trigger / select
 */
export default function MobileSelect({ value, onChange, options = [], placeholder = 'Select...', className, label }) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    setIsMobile(mq.matches);
    const handler = e => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const selectedLabel = options.find(o => o.value === value)?.label;

  if (!isMobile) {
    return (
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={cn(
          "px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500",
          className
        )}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white text-left focus:outline-none",
          className
        )}
      >
        <span className={selectedLabel ? "text-gray-900" : "text-gray-400"}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          {label && (
            <DrawerHeader className="pb-2">
              <DrawerTitle>{label}</DrawerTitle>
            </DrawerHeader>
          )}
          <div className="px-4 pb-8 space-y-1 max-h-[60vh] overflow-y-auto">
            {options.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm transition-colors",
                  o.value === value
                    ? "bg-red-50 text-red-700 font-semibold"
                    : "text-gray-700 hover:bg-gray-50 active:bg-gray-100"
                )}
              >
                <span>{o.label}</span>
                {o.value === value && <Check className="w-4 h-4 text-red-600 shrink-0" />}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}