import React, { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthRoleProvider } from './context/AuthRoleContext';
import { ThemeProvider } from './context/ThemeContext';
import { Layout } from './components/layout/Layout';
import { AppLoadingScreen } from './components/common/AppLoadingScreen';
import { LoginPage } from './pages/LoginPage';
import { useAuthRole } from './context/AuthRoleContext';

const loadDashboardPage = () => import('./pages/DashboardPage');
const loadPersonnelPage = () => import('./pages/PersonnelPage');
const loadReportsPage = () => import('./pages/ReportsPage');
const loadOrdersPage = () => import('./pages/OrdersPage');
const loadAssignmentPage = () => import('./pages/AssignmentPage');
const loadEducationPage = () => import('./pages/EducationPage');
const loadPromotionPage = () => import('./pages/PromotionPage');
const loadManagementPage = () => import('./pages/ManagementPage');
const loadAdminAccountsPage = () => import('./pages/AdminAccountsPage');

const DashboardPage = lazy(() => loadDashboardPage().then(module => ({ default: module.DashboardPage })));
const PersonnelPage = lazy(() => loadPersonnelPage().then(module => ({ default: module.PersonnelPage })));
const ReportsPage = lazy(() => loadReportsPage().then(module => ({ default: module.ReportsPage })));
const OrdersPage = lazy(() => loadOrdersPage().then(module => ({ default: module.OrdersPage })));
const AssignmentPage = lazy(() => loadAssignmentPage().then(module => ({ default: module.AssignmentPage })));
const EducationPage = lazy(() => loadEducationPage().then(module => ({ default: module.EducationPage })));
const PromotionPage = lazy(() => loadPromotionPage().then(module => ({ default: module.PromotionPage })));
const ManagementPage = lazy(() => loadManagementPage().then(module => ({ default: module.ManagementPage })));
const AdminAccountsPage = lazy(() => loadAdminAccountsPage().then(module => ({ default: module.AdminAccountsPage })));

const routeLoaders: Record<string, () => Promise<unknown>> = {
  '/': loadDashboardPage,
  '/personnel': loadPersonnelPage,
  '/reports': loadReportsPage,
  '/orders': loadOrdersPage,
  '/assignment': loadAssignmentPage,
  '/education': loadEducationPage,
  '/promotion': loadPromotionPage,
  '/management': loadManagementPage,
  '/admin-accounts': loadAdminAccountsPage
};

const AuthenticatedApplication: React.FC = () => {
  const { authReady, authUser, initialDataReady } = useAuthRole();
  const [initialRouteReady, setInitialRouteReady] = useState(false);

  useEffect(() => {
    if (!authReady || !authUser) {
      if (authReady) setInitialRouteReady(true);
      return;
    }

    let cancelled = false;
    setInitialRouteReady(false);
    const normalizedPath = window.location.pathname.replace(/\/$/, '') || '/';
    const loader = routeLoaders[normalizedPath] || loadDashboardPage;
    loader()
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setInitialRouteReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [authReady, authUser]);

  const applicationReady = authReady && (!authUser || (initialDataReady && initialRouteReady));
  const targetProgress = !authReady
    ? 24
    : !authUser
      ? 100
      : initialDataReady && initialRouteReady
        ? 100
        : initialDataReady || initialRouteReady
          ? 82
          : 58;
  const loadingStatus = !authReady
    ? 'Verifying secure session'
    : authUser && !initialDataReady
      ? 'Loading personnel data'
      : authUser && !initialRouteReady
        ? 'Preparing requested module'
        : 'Preparing secure workspace';

  return (
    <>
      <AppLoadingScreen
        active={!applicationReady}
        targetProgress={targetProgress}
        status={loadingStatus}
        variant={authUser ? 'session' : 'prelogin'}
      />
      {authReady && (
        authUser ? (
          <BrowserRouter>
            <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-semibold text-slate-600">Loading module…</div>}>
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
        ) : <LoginPage />
      )}
    </>
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
