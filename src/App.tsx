import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthRoleProvider } from './context/AuthRoleContext';
import { ThemeProvider } from './context/ThemeContext';
import { Layout } from './components/layout/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { PersonnelPage } from './pages/PersonnelPage';
import { ReportsPage } from './pages/ReportsPage';
import { OrdersPage } from './pages/OrdersPage';
import { AssignmentPage } from './pages/AssignmentPage';
import { EducationPage } from './pages/EducationPage';
import { PromotionPage } from './pages/PromotionPage';
import { ManagementPage } from './pages/ManagementPage';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthRoleProvider>
        <BrowserRouter>
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
              <Route path="*" element={<DashboardPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthRoleProvider>
    </ThemeProvider>
  );
};

export default App;
