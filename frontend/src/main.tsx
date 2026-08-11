import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './components/AppLayout.js';
import { StubPage } from './components/StubPage.js';
import { AuthProvider } from './features/auth/AuthContext.js';
import { LoginPage } from './features/auth/LoginPage.js';
import { ProtectedRoute } from './features/auth/ProtectedRoute.js';
import { DashboardPage } from './features/dashboard/DashboardPage.js';
import { ApplicationsPage } from './features/applications/ApplicationsPage.js';
import { AgentDetailPage } from './features/applications/AgentDetailPage.js';
import './styles.css';

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'applications', element: <ApplicationsPage /> },
          { path: 'applications/:id', element: <AgentDetailPage /> },
          {
            path: 'agents',
            element: <StubPage title="Active Agents" description="Monitor performance and compliance of onboarded agents" />,
          },
          {
            path: 'collateral',
            element: <StubPage title="Marketing Collateral" description="Version-controlled library of approved materials" phase="Phase 3" />,
          },
          {
            path: 'compliance',
            element: <StubPage title="Compliance" description="Certifications, PRISMS & ASQAnet status" phase="Phase 3" />,
          },
          {
            path: 'reports',
            element: <StubPage title="Reports & Insights" description="Vendor master, compliance and risk analytics" phase="Phase 3" />,
          },
        ],
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>,
);
