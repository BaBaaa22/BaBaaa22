import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, ClipboardList, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { label: 'Home', icon: Home, page: 'Home' },
  { label: 'Orders', icon: ClipboardList, page: 'OrderStatus' },
  { label: 'Profile', icon: User, page: 'Home' },
];

export default function MobileBottomNav({ currentPageName }) {
  const navigate = useNavigate();

  const handleNav = (page) => {
    // Save the current page's full URL so we can restore it when returning
    sessionStorage.setItem(`nav_last_${currentPageName}`, window.location.pathname + window.location.search);
    // Restore the last URL for the destination tab, or fall back to the default page URL
    const saved = sessionStorage.getItem(`nav_last_${page}`);
    navigate(saved || createPageUrl(page));
  };

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {NAV_ITEMS.map(({ label, icon: Icon, page }) => {
        const active = currentPageName === page;
        return (
          <button
            key={label}
            onClick={() => handleNav(page)}
            className={cn(
              'flex-1 flex flex-col items-center justify-center py-2.5 gap-1 select-none transition-colors',
              active ? 'text-red-600' : 'text-gray-400'
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}