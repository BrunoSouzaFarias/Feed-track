import { LogOut, Shield, User as UserIcon, WifiOff, RefreshCw } from 'lucide-react';
import { motion, useMotionValue, useTransform, useSpring } from 'motion/react';
import { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import ThemeToggle from './ThemeToggle';
import Avatar from './Avatar';
import Magnetic from './Magnetic';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import NotificationCenter from './NotificationCenter';
import { useScrollDirection } from '../../hooks/useScrollDirection';

export default function Header() {
  const { user, logout } = useAuth();
  const { online, pendingCount, syncing } = useOfflineSync();
  const { direction, scrollY } = useScrollDirection();

  // Progressive blur: 0px at top, 16px at 200px scroll
  const blurRaw = useMotionValue(0);
  const blurSpring = useSpring(blurRaw, { stiffness: 400, damping: 35 });
  const backdropBlur = useTransform(blurSpring, (v) => `blur(${v}px)`);

  useEffect(() => {
    const target = Math.min((scrollY / 200) * 16, 16);
    blurRaw.set(target);
  }, [scrollY, blurRaw]);

  // Determine header visibility
  const isHidden = direction === 'down' && scrollY > 80;

  if (!user) return null;

  return (
    <motion.header
      className="sticky top-0 z-45 w-full border-b border-outline-variant/30 bg-surface-container-lowest/80 dark:bg-surface-container/80 transition-colors duration-200"
      style={{ backdropFilter: backdropBlur }}
      animate={{
        y: isHidden ? '-100%' : '0%',
        opacity: isHidden ? 0.5 : 1,
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Magnetic strength={0.15}>
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="p-1.5 rounded-xl bg-gradient-to-tr from-[#10b981]/10 to-[#059669]/5 dark:from-[#34d399]/15 dark:to-[#059669]/5 border border-emerald-500/10 shadow-inner flex items-center justify-center shrink-0 animate-float-slow">
                <svg className="h-5 w-5 animate-pulse" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M 48.5 14.3 L 48.5 15.7 L 48.5 18.6 L 48.5 21.4 L 50.0 24.3 L 51.6 27.1 L 53.1 30.0 L 56.2 32.8 L 59.3 35.7 L 62.3 38.6 L 65.4 41.4 L 67.0 44.3 L 70.0 47.1 L 71.6 50.0 L 73.1 52.8 L 74.6 55.7 L 74.6 58.6 L 74.6 61.4 L 73.1 64.3 L 71.6 67.1 L 68.5 70.0 L 65.4 72.8 L 62.3 75.7 L 59.3 77.1 L 60.8 74.3 L 60.8 71.4 L 59.3 68.6 L 57.7 65.7 L 56.2 62.8 L 53.1 60.0 L 50.0 58.6 L 47.0 55.7 L 43.9 54.3 L 40.8 51.4 L 37.7 48.6 L 36.2 45.7 L 34.6 42.8 L 34.6 40.0 L 34.6 37.1 L 34.6 34.3 L 34.6 31.4 L 36.2 28.6 L 36.2 25.7 L 39.3 22.8 L 40.8 20.0 L 43.9 17.1 L 47.0 15.7 L 48.5 14.3 Z" fill="url(#libertyHealthLogoHeader)" />
                  <path d="M 30.0 48.6 L 30.0 50.0 L 33.1 52.8 L 34.6 55.7 L 37.7 58.6 L 40.8 60.0 L 43.9 62.8 L 47.0 64.3 L 50.0 67.1 L 53.1 70.0 L 53.1 72.8 L 53.1 75.7 L 53.1 78.6 L 51.6 81.4 L 48.5 84.3 L 45.4 85.7 L 45.4 82.8 L 43.9 80.0 L 40.8 77.1 L 37.7 74.3 L 34.6 72.8 L 31.6 71.4 L 28.5 68.6 L 27.0 65.7 L 25.4 62.8 L 25.4 60.0 L 25.4 57.1 L 25.4 54.3 L 27.0 51.4 L 30.0 48.6 Z" fill="url(#libertyHealthLogoHeader)" />
                  <defs>
                    <linearGradient id="libertyHealthLogoHeader" x1="20" y1="15" x2="80" y2="95" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#6ee7b7" />
                      <stop offset="50%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#047857" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <span className="font-extrabold text-xl tracking-wider text-[#006c49] dark:text-[#4bdfa1]">
                FEED-TRACK
              </span>
            </div>
          </Magnetic>

          {/* User info & controls */}
          <div className="flex items-center gap-3 sm:gap-6">
            {/* Connection Indicator */}
            <div className="flex items-center text-xs font-semibold transition-all duration-300">
              {syncing ? (
                <div className="flex items-center gap-1.5 text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  <span className="hidden sm:inline">Sincronizando...</span>
                </div>
              ) : online ? (
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  <span>Conectado</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full">
                  <WifiOff className="h-3 w-3" />
                  <span>Offline - Salvando Localmente</span>
                  {pendingCount > 0 && (
                    <span className="flex items-center justify-center bg-amber-500 text-white rounded-full h-4 min-w-4 px-1 text-[9px] font-bold leading-none">
                      {pendingCount}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <Magnetic strength={0.25}>
              <div>
                <ThemeToggle />
              </div>
            </Magnetic>

            {/* Notification Center */}
            <NotificationCenter />

            {/* Profile Info */}
            <div className="flex items-center gap-3 border-l border-outline-variant/30 pl-3 sm:pl-6">
              <Avatar name={user.name} photoURL={user.photoURL} size="sm" />
              <div className="hidden md:flex flex-col text-left">
                <span className="text-sm font-semibold text-on-surface">
                  {user.name}
                </span>
                <span className="text-xs text-on-surface-variant flex items-center gap-1 capitalize">
                  {user.role === 'supervisor' ? (
                    <Shield className="w-3 h-3 text-primary-container" />
                  ) : (
                    <UserIcon className="w-3 h-3 text-primary" />
                  )}
                  {user.position} ({user.team})
                </span>
              </div>

              {/* Logout Button */}
              <Magnetic strength={0.3} cursorText="LogOut">
                <button
                  onClick={logout}
                  className="p-2 rounded text-on-surface-variant hover:text-rose-600 dark:hover:text-rose-400 hover:bg-surface-container-high transition-colors cursor-pointer"
                  title="Sair"
                  aria-label="Sair da conta"
                >
                  <LogOut className="h-5 w-5" aria-hidden="true" />
                </button>
              </Magnetic>
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
