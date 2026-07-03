import type { ReactNode } from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { Skeleton } from './Skeleton';
import type { SkeletonVariant } from './Skeleton';

interface AsyncWrapperProps {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  children: ReactNode;
  skeletonVariant?: SkeletonVariant;
  skeletonCount?: number;
  emptyMessage?: string;
  isEmpty?: boolean;
}

export default function AsyncWrapper({
  loading,
  error,
  onRetry,
  children,
  skeletonVariant = 'card',
  skeletonCount = 3,
  emptyMessage,
  isEmpty = false,
}: AsyncWrapperProps) {
  if (loading) {
    return <Skeleton variant={skeletonVariant} count={skeletonCount} />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
          <WifiOff className="w-5 h-5 text-zinc-400" />
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xs">{error}</p>
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-[#006c49] hover:bg-[#005236] text-white rounded-lg transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Tentar novamente
        </button>
      </div>
    );
  }

  if (isEmpty && emptyMessage) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-zinc-400 dark:text-zinc-500">
        {emptyMessage}
      </div>
    );
  }

  return <>{children}</>;
}
