import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthRoleProvider } from './context/AuthRoleContext';
import { ThemeProvider } from './context/ThemeContext';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './pages/LoginPage';
import { useAuthRole } from './context/AuthRoleContext';

const DashboardPage = lazy(() => import('./pages/DashboardPage').then(module => ({ default: module.DashboardPage })));
const PersonnelPage = lazy(() => import('./pages/PersonnelPage').then(module => ({ default: module.PersonnelPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then(module => ({ default: module.ReportsPage })));
const OrdersPage = lazy(() => import('./pages/OrdersPage').then(module => ({ default: module.OrdersPage })));
const AssignmentPage = lazy(() => import('./pages/AssignmentPage').then(module => ({ default: module.AssignmentPage })));
const EducationPage = lazy(() => import('./pages/EducationPage').then(module => ({ default: module.EducationPage })));
const PromotionPage = lazy(() => import('./pages/PromotionPage').then(module => ({ default: module.PromotionPage })));
const ManagementPage = lazy(() => import('./pages/ManagementPage').then(module => ({ default: module.ManagementPage })));
const AdminAccountsPage = lazy(() => import('./pages/AdminAccountsPage').then(module => ({ default: module.AdminAccountsPage })));

const AuthenticatedApplication: React.FC = () => {
  const { authReady, authUser } = useAuthRole();
  if (!authReady) return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-semibold text-slate-600">Checking session…</div>;
  if (!authUser) return <LoginPage />;

  return (
    <BrowserRouter>
      <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center text-sm font-semibold text-slate-600">Loading module…</div>}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="personnel" element={<PersonnelPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="assignment" element={<AssignmentPage />} />
          <Route path="education" element={<EducationPage />} />
          <Route path="promotion" element={<PromotionPage />} />
          <Route path="management" element={<ManagementPage />} />
          <Route path="admin-accounts" element={<AdminAccountsPage />} />
          <Route path="*" element={<DashboardPage />} />
        </Route>
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthRoleProvider>
        <AuthenticatedApplication />
      </AuthRoleProvider>
    </ThemeProvider>
  );
};

export default App;
