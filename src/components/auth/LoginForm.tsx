import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../../hooks/useAuth';
import { useSmoothScroll } from '../../hooks/useSmoothScroll';
import toast from 'react-hot-toast';
import Magnetic from '../shared/Magnetic';
import Tilt3D from '../shared/Tilt3D';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading, login, sendPasswordReset } = useAuth();
  const navigate = useNavigate();
  useSmoothScroll();

  React.useEffect(() => {
    if (user) {
      navigate(user.role === 'supervisor' ? '/supervisor' : '/technician', { replace: true });
    }
  }, [user, navigate]);

  if (authLoading && (sessionStorage.getItem('feed_track_logged_in') === 'true' || localStorage.getItem('feed_track_logged_in') === 'true')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 transition-colors duration-200">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 text-liberty animate-spin" />
          <span className="text-sm text-zinc-500 dark:text-zinc-400">Verificando sessão...</span>
        </div>
      </div>
    );
  }

  if (user) {
    return null;
  }

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error('Por favor, digite seu e-mail corporativo no campo de e-mail para solicitar a recuperação.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordReset(email);
      toast.success('E-mail de recuperação de senha enviado! Verifique sua caixa de entrada.');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar e-mail de recuperação.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Preencha todos os campos.');
      return;
    }

    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Bem-vindo, ${user.name}!`);
      if (user.role === 'supervisor') {
        navigate('/supervisor');
      } else {
        navigate('/technician');
      }
    } catch (error: any) {
      toast.error(error.message || 'Falha ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1] as const, // premium easeOutExposition
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between bg-[#f9f9fd] dark:bg-[#111316] relative overflow-hidden px-4 py-12 transition-colors duration-200 canvas-grain">
      
      {/* Premium Vignette Texture Filter */}
      <div className="atmospheric-vignette" />

      {/* Background glow effects to match the luxury executive look, synchronized with smooth scroll */}
      <div 
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] pointer-events-none"
        style={{
          transform: 'translate3d(calc(var(--scroll-y, 0) * -0.05px), calc(var(--scroll-y, 0) * 0.08px), 0)',
          opacity: 'calc(1 - var(--scroll-progress, 0) * 0.45)',
          willChange: 'transform, opacity'
        }}
      >
        <div className="w-full h-full bg-primary/8 rounded-full blur-[140px] animate-float-slow" />
      </div>
      <div 
        className="absolute bottom-1/4 left-1/3 w-[350px] h-[350px] pointer-events-none"
        style={{
          transform: 'translate3d(calc(var(--scroll-y, 0) * 0.08px), calc(var(--scroll-y, 0) * -0.05px), 0)',
          opacity: 'calc(1 - var(--scroll-progress, 0) * 0.3)',
          willChange: 'transform, opacity'
        }}
      >
        <div className="w-full h-full bg-secondary-container/15 rounded-full blur-[100px] animate-float-medium" />
      </div>

      {/* Top spacer */}
      <div />

      <motion.div 
        className="w-full flex flex-col items-center z-10"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        
        {/* Header Logo — Cinematic Typography */}
        {(() => {
          const chars = Array.from('FEED-TRACK');
          const charAnimDuration = chars.length * 0.04;
          return (
            <div className="flex flex-col items-center mb-6">
              <Magnetic strength={0.2} cursorText="Click">
                <motion.div 
                  className="p-1.5 rounded-2xl bg-gradient-to-tr from-[#10b981]/10 to-[#059669]/5 dark:from-[#34d399]/15 dark:to-[#059669]/5 border border-emerald-500/10 shadow-inner mb-3 cursor-pointer flex items-center justify-center animate-float-slow"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <svg className="h-10 w-10 animate-pulse" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M 48.5 14.3 L 48.5 15.7 L 48.5 18.6 L 48.5 21.4 L 50.0 24.3 L 51.6 27.1 L 53.1 30.0 L 56.2 32.8 L 59.3 35.7 L 62.3 38.6 L 65.4 41.4 L 67.0 44.3 L 70.0 47.1 L 71.6 50.0 L 73.1 52.8 L 74.6 55.7 L 74.6 58.6 L 74.6 61.4 L 73.1 64.3 L 71.6 67.1 L 68.5 70.0 L 65.4 72.8 L 62.3 75.7 L 59.3 77.1 L 60.8 74.3 L 60.8 71.4 L 59.3 68.6 L 57.7 65.7 L 56.2 62.8 L 53.1 60.0 L 50.0 58.6 L 47.0 55.7 L 43.9 54.3 L 40.8 51.4 L 37.7 48.6 L 36.2 45.7 L 34.6 42.8 L 34.6 40.0 L 34.6 37.1 L 34.6 34.3 L 34.6 31.4 L 36.2 28.6 L 36.2 25.7 L 39.3 22.8 L 40.8 20.0 L 43.9 17.1 L 47.0 15.7 L 48.5 14.3 Z" fill="url(#libertyHealthLogoLoginGlow)" />
                    <path d="M 30.0 48.6 L 30.0 50.0 L 33.1 52.8 L 34.6 55.7 L 37.7 58.6 L 40.8 60.0 L 43.9 62.8 L 47.0 64.3 L 50.0 67.1 L 53.1 70.0 L 53.1 72.8 L 53.1 75.7 L 53.1 78.6 L 51.6 81.4 L 48.5 84.3 L 45.4 85.7 L 45.4 82.8 L 43.9 80.0 L 40.8 77.1 L 37.7 74.3 L 34.6 72.8 L 31.6 71.4 L 28.5 68.6 L 27.0 65.7 L 25.4 62.8 L 25.4 60.0 L 25.4 57.1 L 25.4 54.3 L 27.0 51.4 L 30.0 48.6 Z" fill="url(#libertyHealthLogoLoginGlow)" />
                    
                    <path d="M 48.5 14.3 L 48.5 15.7 L 48.5 18.6 L 48.5 21.4 L 50.0 24.3 L 51.6 27.1 L 53.1 30.0 L 56.2 32.8 L 59.3 35.7 L 62.3 38.6 L 65.4 41.4 L 67.0 44.3 L 70.0 47.1 L 71.6 50.0 L 73.1 52.8 L 74.6 55.7 L 74.6 58.6 L 74.6 61.4 L 73.1 64.3 L 71.6 67.1 L 68.5 70.0 L 65.4 72.8 L 62.3 75.7 L 59.3 77.1 L 60.8 74.3 L 60.8 71.4 L 59.3 68.6 L 57.7 65.7 L 56.2 62.8 L 53.1 60.0 L 50.0 58.6 L 47.0 55.7 L 43.9 54.3 L 40.8 51.4 L 37.7 48.6 L 36.2 45.7 L 34.6 42.8 L 34.6 40.0 L 34.6 37.1 L 34.6 34.3 L 34.6 31.4 L 36.2 28.6 L 36.2 25.7 L 39.3 22.8 L 40.8 20.0 L 43.9 17.1 L 47.0 15.7 L 48.5 14.3 Z" fill="url(#libertyHealthLogoLogin)" />
                    <path d="M 30.0 48.6 L 30.0 50.0 L 33.1 52.8 L 34.6 55.7 L 37.7 58.6 L 40.8 60.0 L 43.9 62.8 L 47.0 64.3 L 50.0 67.1 L 53.1 70.0 L 53.1 72.8 L 53.1 75.7 L 53.1 78.6 L 51.6 81.4 L 48.5 84.3 L 45.4 85.7 L 45.4 82.8 L 43.9 80.0 L 40.8 77.1 L 37.7 74.3 L 34.6 72.8 L 31.6 71.4 L 28.5 68.6 L 27.0 65.7 L 25.4 62.8 L 25.4 60.0 L 25.4 57.1 L 25.4 54.3 L 27.0 51.4 L 30.0 48.6 Z" fill="url(#libertyHealthLogoLogin)" />
                    <defs>
                      <linearGradient id="libertyHealthLogoLogin" x1="20" y1="15" x2="80" y2="95" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#6ee7b7" />
                        <stop offset="50%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#047857" />
                      </linearGradient>
                      <radialGradient id="libertyHealthLogoLoginGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                      </radialGradient>
                    </defs>
                  </svg>
                </motion.div>
              </Magnetic>

              {/* Cinematic char-by-char title */}
              <h1
                className="text-3xl text-[#006c49] dark:text-[#4bdfa1] tracking-widest uppercase brand-text"
                style={{ perspective: '400px' }}
              >
                {chars.map((char, index) => (
                  <motion.span
                    key={index}
                    style={{ display: 'inline-block' }}
                    initial={{ opacity: 0, y: 40, rotateX: -90 }}
                    animate={{ opacity: 1, y: 0, rotateX: 0 }}
                    transition={{
                      delay: index * 0.04,
                      duration: 0.6,
                      ease: [0.25, 0.46, 0.45, 0.94],
                    }}
                  >
                    {char === '-' ? <span style={{ display: 'inline-block' }}>-</span> : char}
                  </motion.span>
                ))}
              </h1>

              {/* Subtitle — enters after all chars */}
              <motion.p
                className="text-[10px] text-zinc-500 dark:text-zinc-400 text-center tracking-widest mt-1 editorial-tag"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: charAnimDuration + 0.2,
                  duration: 0.5,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
              >
                Análise de Desempenho de Precisão
              </motion.p>
            </div>
          );
        })()}

        {/* Login Card (Centered Box) — delayed entry */}
        <Tilt3D maxRotation={6} scaleOnHover={1.01} className="max-w-[420px] w-full">
          <motion.div 
            className="w-full bg-white/70 dark:bg-[#1e2023]/75 backdrop-blur-xl border border-zinc-200/60 dark:border-zinc-800/40 rounded-2xl shadow-[0px_24px_64px_rgba(0,0,0,0.06)] dark:shadow-[0px_24px_64px_rgba(0,0,0,0.4)] p-8 text-left transition-all duration-300"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: Array.from('FEED-TRACK').length * 0.04 + 0.5,
              duration: 0.6,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
          >
          
          <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-white mb-1 editorial-title">
            Bem-vindo
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 font-medium">
            Acesse sua conta corporativa
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <motion.div variants={itemVariants}>
              <label htmlFor="login-email" className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-350 uppercase tracking-wider mb-1.5">
                E-mail Corporativo
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="nome@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#0bbb81] transition-all text-xs"
                  required
                />
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <label htmlFor="login-password" className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-350 uppercase tracking-wider mb-1.5">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#0bbb81] transition-all text-xs"
                  required
                />
              </div>
            </motion.div>

            <motion.div className="flex justify-end" variants={itemVariants}>
              <button 
                type="button"
                onClick={handleForgotPassword}
                className="text-[11px] text-[#0bbb81] font-semibold hover:underline bg-transparent border-none cursor-pointer"
              >
                Esqueci minha senha
              </button>
            </motion.div>

            <Magnetic strength={0.12} cursorText="Entrar" className="w-full block">
              <motion.button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#0bbb81] hover:bg-[#0bbb81]/90 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2 text-xs disabled:opacity-50 cursor-pointer shadow-md"
                variants={itemVariants}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Entrar <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </motion.button>
            </Magnetic>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200 dark:border-zinc-800"></div>
            </div>
          </div>

          {/* Register Link */}
          <div className="text-center text-xs text-zinc-500 dark:text-zinc-400 mt-6">
            Não possui uma conta?{' '}
            <Link
              to="/register"
              className="text-[#0bbb81] font-semibold hover:underline"
            >
              Solicite acesso
            </Link>
          </div>

        </motion.div>
        </Tilt3D>
      </motion.div>

      {/* Footer info */}
      <div className="text-center z-10">
        <p className="text-[10px] text-zinc-500 dark:text-zinc-550 tracking-wide">
          © 2025 Sistema FEED-TRACK. Todos os direitos reservados.
        </p>
        <p className="text-[8px] text-zinc-400/60 dark:text-zinc-600/50 mt-1 tracking-wider font-light">
          desenvolvido por Bruno Farias
        </p>
      </div>

    </div>
  );
}
