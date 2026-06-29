import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import MobileBottomNav from './components/home/MobileBottomNav';
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronLeft,
  Shield,
  Monitor,
  BarChart2,
  Tag,
  Upload,
  CreditCard,
  Printer,
  Store
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ADMIN_PAGES = ['AdminDashboard', 'AdminOrders', 'AdminMenu', 'AdminSettings', 'AdminReports', 'AdminPromotions', 'AdminImport', 'AdminPayments', 'AdminPrinterSettings', 'AdminShops'];
const CUSTOMER_PAGES_WITH_NAV = ['Home', 'OrderStatus'];
const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};
const FULLSCREEN_PAGES = ['AdminEPOS'];

const ADMIN_NAV = [
  { name: 'AdminDashboard', label: 'Dashboard', icon: LayoutDashboard },
  { name: 'AdminEPOS', label: 'EPOS Screen', icon: Monitor },
  { name: 'AdminOrders', label: 'Orders', icon: ShoppingBag },
  { name: 'AdminReports', label: 'Reports', icon: BarChart2 },
  { name: 'AdminMenu', label: 'Menu Editor', icon: UtensilsCrossed },
  { name: 'AdminPromotions', label: 'Promotions', icon: Tag },
  { name: 'AdminSettings', label: 'Settings', icon: Settings },
  { name: 'AdminImport', label: 'Import Menu', icon: Upload },
  { name: 'AdminPayments', label: 'Payment Gateways', icon: CreditCard },
  { name: 'AdminPrinterSettings', label: 'Printer Settings', icon: Printer },
  { name: 'AdminShops', label: 'Shop Onboarding', icon: Store },
];

export default function Layout({ children, currentPageName }) {
  const navigate = useNavigate();
  const isAdmin = ADMIN_PAGES.includes(currentPageName);
  const isFullscreen = FULLSCREEN_PAGES.includes(currentPageName);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);

  // System dark mode
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (e) => document.documentElement.classList.toggle('dark', e.matches);
    apply(mq);
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (isAdmin) {
      base44.auth.me().then(setUser).catch(() => {});
    }
  }, [isAdmin]);

  // No layout for customer-facing pages or fullscreen EPOS
  if (!isAdmin || isFullscreen) {
    const showBottomNav = CUSTOMER_PAGES_WITH_NAV.includes(currentPageName);
    return (
      <>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPageName}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageVariants}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            style={{ paddingBottom: showBottomNav ? 'calc(56px + env(safe-area-inset-bottom))' : undefined }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
        {showBottomNav && <MobileBottomNav currentPageName={currentPageName} />}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-64 bg-gray-900 z-50 transition-transform duration-200 lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-600 flex items-center justify-center">
              <span className="text-sm font-black text-white">M</span>
            </div>
            <div>
              <h2 className="font-bold text-white text-sm">Marco's</h2>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Admin Panel</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-500 hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-3 space-y-1 mt-2">
          {ADMIN_NAV.map(item => {
            const Icon = item.icon;
            const active = currentPageName === item.name;
            return (
              <Link
                key={item.name}
                to={createPageUrl(item.name)}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                  active
                    ? "bg-red-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1 border-t border-gray-800">
          <Link
            to={createPageUrl('Home')}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            View Store
          </Link>
          <button
            onClick={() => base44.auth.logout()}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-white border-b border-gray-100 h-16 flex items-center justify-between px-4 lg:px-6" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="font-bold text-gray-900">
              {ADMIN_NAV.find(n => n.name === currentPageName)?.label || 'Admin'}
            </h1>
          </div>
          {user && (
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-red-500" />
              <span className="text-sm text-gray-500">{user.email}</span>
            </div>
          )}
        </div>

        <div className="p-4 lg:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}