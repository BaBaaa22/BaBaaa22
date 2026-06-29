/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AdminDashboard from './pages/AdminDashboard';
import AdminEPOS from './pages/AdminEPOS';
import AdminImport from './pages/AdminImport';
import AdminMenu from './pages/AdminMenu';
import AdminOrders from './pages/AdminOrders';
import AdminPayments from './pages/AdminPayments';
import AdminPromotions from './pages/AdminPromotions';
import AdminReports from './pages/AdminReports';
import AdminSettings from './pages/AdminSettings';
import Checkout from './pages/Checkout';
import Home from './pages/Home';
import MenuPage from './pages/MenuPage';
import OrderStatus from './pages/OrderStatus';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminDashboard": AdminDashboard,
    "AdminEPOS": AdminEPOS,
    "AdminImport": AdminImport,
    "AdminMenu": AdminMenu,
    "AdminOrders": AdminOrders,
    "AdminPayments": AdminPayments,
    "AdminPromotions": AdminPromotions,
    "AdminReports": AdminReports,
    "AdminSettings": AdminSettings,
    "Checkout": Checkout,
    "Home": Home,
    "MenuPage": MenuPage,
    "OrderStatus": OrderStatus,
}

export const pagesConfig = {
    mainPage: "MenuPage",
    Pages: PAGES,
    Layout: __Layout,
};