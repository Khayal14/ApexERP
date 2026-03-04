import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import LoadingSpinner from './components/common/LoadingSpinner';

const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const FinancePage = React.lazy(() => import('./pages/FinancePage'));
const HRPage = React.lazy(() => import('./pages/HRPage'));
const CRMPage = React.lazy(() => import('./pages/CRMPage'));
const InventoryPage = React.lazy(() => import('./pages/InventoryPage'));
const SalesPage = React.lazy(() => import('./pages/SalesPage'));
const ProjectsPage = React.lazy(() => import('./pages/ProjectsPage'));
const ManufacturingPage = React.lazy(() => import('./pages/ManufacturingPage'));
const MarketingPage = React.lazy(() => import('./pages/MarketingPage'));
const AnalyticsPage = React.lazy(() => import('./pages/AnalyticsPage'));
const EcommercePage = React.lazy(() => import('./pages/EcommercePage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <Toaster position="top-right" toastOptions={{
        className: 'dark:bg-gray-800 dark:text-white',
        duration: 4000,
      }} />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Suspense fallback={<LoadingSpinner />}><Dashboard /></Suspense>} />
          <Route path="finance/*" element={<Suspense fallback={<LoadingSpinner />}><FinancePage /></Suspense>} />
          <Route path="hr/*" element={<Suspense fallback={<LoadingSpinner />}><HRPage /></Suspense>} />
          <Route path="crm/*" element={<Suspense fallback={<LoadingSpinner />}><CRMPage /></Suspense>} />
          <Route path="inventory/*" element={<Suspense fallback={<LoadingSpinner />}><InventoryPage /></Suspense>} />
          <Route path="sales/*" element={<Suspense fallback={<LoadingSpinner />}><SalesPage /></Suspense>} />
          <Route path="projects/*" element={<Suspense fallback={<LoadingSpinner />}><ProjectsPage /></Suspense>} />
          <Route path="manufacturing/*" element={<Suspense fallback={<LoadingSpinner />}><ManufacturingPage /></Suspense>} />
          <Route path="marketing/*" element={<Suspense fallback={<LoadingSpinner />}><MarketingPage /></Suspense>} />
          <Route path="analytics/*" element={<Suspense fallback={<LoadingSpinner />}><AnalyticsPage /></Suspense>} />
          <Route path="ecommerce/*" element={<Suspense fallback={<LoadingSpinner />}><EcommercePage /></Suspense>} />
          <Route path="settings/*" element={<Suspense fallback={<LoadingSpinner />}><SettingsPage /></Suspense>} />
        </Route>
      </Routes>
    </>
  );
}
