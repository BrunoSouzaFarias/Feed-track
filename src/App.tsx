import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import { CursorProvider } from './components/shared/CustomCursor';
import ProtectedRoute from './components/shared/ProtectedRoute';
import ErrorBoundary from './components/shared/ErrorBoundary';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import SupervisorDashboard from './components/supervisor/SupervisorDashboard';
import TechnicianDashboard from './components/technician/TechnicianDashboard';
import Preloader from './components/shared/Preloader';
import InstallPrompt from './components/shared/InstallPrompt';

export default function App() {
  const [showPreloader, setShowPreloader] = useState(() => {
    return sessionStorage.getItem('feed_track_logged_in') !== 'true' &&
      localStorage.getItem('feed_track_logged_in') !== 'true';
  });

  return (
    <ThemeProvider>
      {showPreloader && (
        <Preloader onComplete={() => setShowPreloader(false)} />
      )}
      <CursorProvider>
        <div className="noise-overlay" />
        <InstallPrompt />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<LoginForm />} />
              <Route path="/register" element={<RegisterForm />} />

            {/* Protected Supervisor routes */}
            <Route
              path="/supervisor"
              element={
                <ProtectedRoute allowedRole="supervisor">
                  <ErrorBoundary fallbackTitle="Erro no Dashboard do Supervisor">
                    <SupervisorDashboard />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />

            {/* Protected Technician routes */}
            <Route
              path="/technician"
              element={
                <ProtectedRoute allowedRole="technician">
                  <ErrorBoundary fallbackTitle="Erro no Dashboard do Técnico">
                    <TechnicianDashboard />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />

            {/* Fallback to login */}
            <Route path="*" element={<LoginForm />} />
          </Routes>
          <Toaster
            position="top-right"
            gutter={8}
            containerStyle={{ top: 16, right: 16 }}
            toastOptions={{
              className: 'dark:bg-zinc-900 dark:text-zinc-50 border dark:border-zinc-800 text-sm',
              duration: 3500,
              style: { maxWidth: 380 },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
      </CursorProvider>
    </ThemeProvider>
  );
}
