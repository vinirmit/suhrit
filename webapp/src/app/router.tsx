import { lazy, Suspense } from 'react';
import {
  Navigate,
  Outlet,
  RouterProvider,
  createBrowserRouter,
} from 'react-router-dom';

import { useAuth } from './auth';
import { AppLayout } from '../layouts/AppLayout';

const LandingPage = lazy(() => import('../pages/LandingPage'));
const SearchPage = lazy(() => import('../pages/SearchPage'));
const RegisterPage = lazy(() => import('../pages/RegisterPage'));
const EditPage = lazy(() => import('../pages/EditPage'));
const QueuePage = lazy(() => import('../pages/QueuePage'));
const OpdPage = lazy(() => import('../pages/OpdPage'));
const PrintPage = lazy(() => import('../pages/PrintPage'));
const ReportsPage = lazy(() => import('../pages/ReportsPage'));
const KarmaPage = lazy(() => import('../pages/KarmaPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));

function ProtectedRoute() {
  const auth = useAuth();

  if (auth.isLoading) {
    return <div className="app-loading">Loading application...</div>;
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <Suspense fallback={<div className="app-loading">Loading...</div>}>
        <LandingPage />
      </Suspense>
    ),
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/search',
        element: (
          <Suspense fallback={<div className="app-loading">Loading...</div>}>
            <SearchPage />
          </Suspense>
        ),
      },
      {
        path: '/register',
        element: (
          <Suspense fallback={<div className="app-loading">Loading...</div>}>
            <RegisterPage />
          </Suspense>
        ),
      },
      {
        path: '/edit',
        element: (
          <Suspense fallback={<div className="app-loading">Loading...</div>}>
            <EditPage />
          </Suspense>
        ),
      },
      {
        path: '/queue',
        element: (
          <Suspense fallback={<div className="app-loading">Loading...</div>}>
            <QueuePage />
          </Suspense>
        ),
      },
      {
        path: '/opd',
        element: (
          <Suspense fallback={<div className="app-loading">Loading...</div>}>
            <OpdPage />
          </Suspense>
        ),
      },
      {
        path: '/print',
        element: (
          <Suspense fallback={<div className="app-loading">Loading...</div>}>
            <PrintPage />
          </Suspense>
        ),
      },
      {
        path: '/reports',
        element: (
          <Suspense fallback={<div className="app-loading">Loading...</div>}>
            <ReportsPage />
          </Suspense>
        ),
      },
      {
        path: '/karma',
        element: (
          <Suspense fallback={<div className="app-loading">Loading...</div>}>
            <KarmaPage />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: '*',
    element: (
      <Suspense fallback={<div className="app-loading">Loading...</div>}>
        <NotFoundPage />
      </Suspense>
    ),
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
