import React, { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export default function PullToRefresh({ onRefresh, children, className }) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const pullDist = useRef(0);
  const THRESHOLD = 64;

  const onTouchStart = (e) => {
    const el = e.currentTarget;
    if (el.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
  };

  const onTouchMove = (e) => {
    if (startY.current === null) return;
    const el = e.currentTarget;
    if (el.scrollTop > 0) { startY.current = null; return; }
    const dy = e.touches[0].clientY - startY.current;
    if (dy <= 0) return;
    pullDist.current = Math.min(dy, THRESHOLD * 1.5);
    setPulling(pullDist.current > 8);
  };

  const onTouchEnd = async () => {
    if (pullDist.current >= THRESHOLD) {
      setRefreshing(true);
      setPulling(false);
      try { await onRefresh?.(); } finally { setRefreshing(false); }
    } else {
      setPulling(false);
    }
    startY.current = null;
    pullDist.current = 0;
  };

  return (
    <div
      className={cn('overflow-auto', className)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {(pulling || refreshing) && (
        <div className="flex justify-center py-3 text-gray-400">
          <Loader2 className={cn('w-5 h-5', refreshing && 'animate-spin')} />
        </div>
      )}
      {children}
    </div>
  );
}