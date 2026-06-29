import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AppHeader({ title, onBack, rightSlot, className }) {
  const navigate = useNavigate();
  const handleBack = onBack ?? (() => navigate(-1));

  return (
    <div
      className={cn('sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100', className)}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="h-14 flex items-center px-4 relative">
        <button
          onClick={handleBack}
          className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 active:scale-95 transition-all select-none"
        >
          <ArrowLeft className="w-4 h-4 text-gray-700" />
        </button>
        <h1 className="absolute left-1/2 -translate-x-1/2 font-semibold text-gray-900 text-base truncate max-w-[58%] text-center">
          {title}
        </h1>
        {rightSlot && <div className="ml-auto">{rightSlot}</div>}
      </div>
    </div>
  );
}