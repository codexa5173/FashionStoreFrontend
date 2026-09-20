import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Layout from "./components/Layout";
import AdminLayout from "./components/AdminLayout";
import { useAuth } from "./context/AuthContext";
import { StoreProvider } from "./context/StoreContext";
import { CartProvider } from "./context/CartContext";
const Home = lazy(() => import("./pages/Home"));
const Catalog = lazy(() => import("./pages/Catalog"));
const Categories = lazy(() => import("./pages/Categories"));
const Collections = lazy(() => import("./pages/Collections"));
const Collection = lazy(() => import("./pages/Collection"));
const Category = lazy(() => import("./pages/Category"));
const Product = lazy(() => import("./pages/Product"));
const Shop = lazy(() => import("./pages/Shop"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const ReturnPolicy = lazy(() => import("./pages/ReturnPolicy"));
const ShippingInformation = lazy(() => import("./pages/ShippingInformation"));
const Login = lazy(() => import("./pages/Login"));
const Store = lazy(() => import("./pages/Store"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderTracking = lazy(() => import("./pages/OrderTracking"));
const MyOrders = lazy(() => import("./pages/MyOrders"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const Products = lazy(() => import("./pages/admin/Products"));
const ProductForm = lazy(() => import("./pages/admin/ProductForm"));
const AdminCategories = lazy(() => import("./pages/admin/Categories"));
const AdminCollections = lazy(() => import("./pages/admin/Collections"));
const Settings = lazy(() => import("./pages/admin/Settings"));
const Notifications = lazy(() => import("./pages/admin/Notifications"));
const Campaigns = lazy(() => import("./pages/admin/Campaigns"));
const CreateOrder = lazy(() => import("./pages/admin/CreateOrder"));
const Orders = lazy(() => import("./pages/admin/Orders"));
const OnlineOrders = lazy(() => import("./pages/admin/OnlineOrders"));
const Bookings = lazy(() => import("./pages/admin/Bookings"));
const Customers = lazy(() => import("./pages/admin/Customers"));
const CustomerCRM = lazy(() => import("./pages/admin/CustomerCRM"));
const Returns = lazy(() => import("./pages/admin/Returns"));
const Suppliers = lazy(() => import("./pages/admin/Suppliers"));
const Purchases = lazy(() => import("./pages/admin/Purchases"));
const Inventory = lazy(() => import("./pages/admin/Inventory"));
const Staff = lazy(() => import("./pages/admin/Staff"));
const Reports = lazy(() => import("./pages/admin/Reports"));
const Expenses = lazy(() => import("./pages/admin/Expenses"));
const AuditLogs = lazy(() => import("./pages/admin/AuditLogs"));
const Usage = lazy(() => import("./pages/admin/Usage"));
const Sizes = lazy(() => import("./pages/admin/Sizes"));
const Loyalty = lazy(() => import("./pages/admin/Loyalty"));
const Billing = lazy(() => import("./pages/admin/Billing"));
const Domains = lazy(() => import("./pages/admin/Domains"));
const OfflineQueue = lazy(() => import("./pages/admin/OfflineQueue"));
const SecurityAudit = lazy(() => import("./pages/admin/SecurityAudit"));
const SuperBilling = lazy(() => import("./pages/super-admin/Billing"));
import SuperAdminLayout from "./components/SuperAdminLayout";
import FeedbackHost from "./components/FeedbackHost";
const SuperOverview = lazy(() => import("./pages/super-admin/Overview"));
const SuperTenants = lazy(() => import("./pages/super-admin/Tenants"));
const SuperPlans = lazy(() => import("./pages/super-admin/Plans"));

function Protected() {
  const { admin, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="p-10">Loading...</div>;
  if (admin?.role === "super_admin") return <Navigate to="/super-admin" replace />;
  return admin ? <AdminLayout /> : <Navigate to="/admin/login" state={{ from: loc.pathname }} replace />;
}

function SuperProtected() {
  const { admin, loading } = useAuth();
  if (loading) return <div className="p-10">Loading...</div>;
  return admin?.role === "super_admin" ? <SuperAdminLayout /> : <Navigate to="/admin/login?super=1" replace />;
}

function StoreRoutes() {
  return (
    <StoreProvider>
      <CartProvider><Layout /></CartProvider>
    </StoreProvider>
  );
}

export default function App() {
  return (
    <>
    <FeedbackHost />
    <Suspense fallback={<div className="min-h-screen p-10 text-center">Loading…</div>}>
      <Routes>
      <Route element={<StoreProvider><CartProvider><Layout /></CartProvider></StoreProvider>}>
        <Route path="/" element={<Home />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/categories/:slug" element={<Category />} />
        <Route path="/collections" element={<Collections />} />
        <Route path="/collections/:slug" element={<Collection />} />
        <Route path="/offers" element={<Catalog mode="offers" />} />
        <Route path="/most-demanded" element={<Catalog mode="popular" />} />
        <Route path="/search" element={<Catalog />} />
        <Route path="/products/:slug" element={<Product />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/return-policy" element={<ReturnPolicy />} />
        <Route path="/shipping-information" element={<ShippingInformation />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/track-order" element={<OrderTracking />} />
        <Route path="/track-order/:token" element={<OrderTracking />} />
        <Route path="/my-orders" element={<MyOrders />} />
      </Route>

      <Route path="/shop/:tenantSlug" element={<StoreRoutes />}>
        <Route index element={<Home />} />
        <Route path="categories" element={<Categories />} />
        <Route path="categories/:slug" element={<Category />} />
        <Route path="collections" element={<Collections />} />
        <Route path="collections/:slug" element={<Collection />} />
        <Route path="offers" element={<Catalog mode="offers" />} />
        <Route path="most-demanded" element={<Catalog mode="popular" />} />
        <Route path="search" element={<Catalog />} />
        <Route path="products/:slug" element={<Product />} />
        <Route path="shop" element={<Shop />} />
        <Route path="terms" element={<Terms />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="return-policy" element={<ReturnPolicy />} />
        <Route path="shipping-information" element={<ShippingInformation />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="track-order" element={<OrderTracking />} />
        <Route path="track-order/:token" element={<OrderTracking />} />
        <Route path="my-orders" element={<MyOrders />} />
      </Route>

      <Route path="/admin/login" element={<Login />} />
      <Route path="/super-admin" element={<SuperProtected />}>
        <Route index element={<SuperOverview />} />
        <Route path="tenants" element={<SuperTenants />} />
        <Route path="plans" element={<SuperPlans />} />
        <Route path="billing" element={<SuperBilling />} />
      </Route>

      <Route path="/admin" element={<Protected />}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="products/new" element={<ProductForm />} />
        <Route path="products/:id" element={<ProductForm />} />
        <Route path="orders" element={<Orders />} />
        <Route path="orders/new" element={<CreateOrder />} />
        <Route path="online-orders" element={<OnlineOrders />} />
        <Route path="online-orders/new" element={<CreateOrder />} />
        <Route path="bookings" element={<Bookings />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/crm" element={<CustomerCRM />} />
        <Route path="returns" element={<Returns />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="purchases" element={<Purchases />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="staff" element={<Staff />} />
        <Route path="reports" element={<Reports />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="audit-logs" element={<AuditLogs />} />
        <Route path="usage" element={<Usage />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="collections" element={<AdminCollections />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="settings" element={<Settings />} />
        <Route path="sizes" element={<Sizes />} />
        <Route path="loyalty" element={<Loyalty />} />
        <Route path="billing" element={<Billing />} />
        <Route path="offline-queue" element={<OfflineQueue />} />
        <Route path="security-audit" element={<SecurityAudit />} />
        <Route path="domains" element={<Domains />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
    </>
  );
}
