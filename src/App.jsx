import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import AdminPrinterSettings from './pages/AdminPrinterSettings';
import OrderHistory from './pages/OrderHistory';
import ShopSignup from './pages/ShopSignup';
import AdminShops from './pages/AdminShops';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

// Detect which "face" of the app to show based on the hostname.
// If the hostname contains "admin" → admin-facing app (root redirects to AdminDashboard)
// Otherwise → customer-facing app (root shows MenuPage)
const isAdminDomain = typeof window !== 'undefined' && window.location.hostname.includes('admin');

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'auth_required') { navigateToLogin(); return null; }
  }

  return (
    <Routes>
      {/* Root: admin domain → AdminDashboard, customer domain → MenuPage */}
      <Route path="/" element={
        isAdminDomain
          ? <Navigate to="/AdminDashboard" replace />
          : <LayoutWrapper currentPageName={mainPageKey}><MainPage /></LayoutWrapper>
      } />

      {/* Printer Settings page */}
      <Route path="/AdminPrinterSettings" element={<LayoutWrapper currentPageName="AdminPrinterSettings"><AdminPrinterSettings /></LayoutWrapper>} />

      {/* Order History page */}
      <Route path="/OrderHistory" element={<LayoutWrapper currentPageName="OrderHistory"><OrderHistory /></LayoutWrapper>} />

      {/* Shop onboarding */}
      <Route path="/ShopSignup" element={<ShopSignup />} />
      <Route path="/AdminShops" element={<LayoutWrapper currentPageName="AdminShops"><AdminShops /></LayoutWrapper>} />

      {/* All other pages */}
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App