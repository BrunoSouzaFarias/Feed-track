import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole?: 'supervisor' | 'technician';
}

export default function ProtectedRoute({ children, allowedRole }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 transition-colors duration-200">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 text-liberty animate-spin" />
          <span className="text-sm text-zinc-500 dark:text-zinc-400">Carregando painel...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to={user.role === 'supervisor' ? '/supervisor' : '/technician'} replace />;
  }

  return <>{children}</>;
}
