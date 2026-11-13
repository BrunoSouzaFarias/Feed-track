import { lazy, Suspense, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import { CursorProvider } from './components/shared/CustomCursor';
import ProtectedRoute from './components/shared/ProtectedRoute';
import ErrorBoundary from './components/shared/ErrorBoundary';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
const SupervisorDashboard = lazy(() => import('./components/supervisor/SupervisorDashboard'));
const TechnicianDashboard = lazy(() => import('./components/technician/TechnicianDashboard'));
import Preloader from './components/shared/Preloader';
import InstallPrompt from './components/shared/InstallPrompt';
import { sessionHint } from './services/sessionHint';

export default function App() {
  const [showPreloader, setShowPreloader] = useState(() => {
    return !sessionHint.get();
  });

  return (
    <ThemeProvider>
      {showPreloader && (
        <Preloader onComplete={() => setShowPreloader(false)} />
      )}
      <CursorProvider>
        <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded focus:bg-white focus:text-zinc-900 focus:shadow-lg">Pular para o conteúdo</a>
        <div className="noise-overlay" />
        <InstallPrompt />
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-zinc-500">Carregando...</div>}>
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

            {/* Rota desconhecida → volta ao início (login ou dashboard, conforme a sessão) */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
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
