import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Briefcase, Users, Loader2, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../../hooks/useAuth';
import { sessionHint } from '../../services/sessionHint';
import { friendlyError } from '../../services/errors';
import { validatePassword } from '../../services/passwordPolicy';
import { useSmoothScroll } from '../../hooks/useSmoothScroll';
import toast from 'react-hot-toast';
import Magnetic from '../shared/Magnetic';
import Tilt3D from '../shared/Tilt3D';

export default function RegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [team, setTeam] = useState<'back-office' | 'teleservice'>('back-office');
  const [position, setPosition] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading, register } = useAuth();
  const navigate = useNavigate();
  useSmoothScroll();

  React.useEffect(() => {
    if (user) {
      navigate(user.role === 'supervisor' ? '/supervisor' : '/technician', { replace: true });
    }
  }, [user, navigate]);

  if (authLoading && (sessionHint.get())) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword || !position) {
      toast.error('Preencha todos os campos.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }

    const policyError = validatePassword(password);
    if (policyError) {
      toast.error(policyError);
      return;
    }

    setLoading(true);
    try {
      // Self-registration is always as technician — supervisor accounts can only
      // be created by an existing supervisor (see useAuth.createTechnicianBySupervisor)
      // or promoted directly in Firestore, never chosen by the registrant.
      await register(name, email, password, team, position);
      toast.success('Cadastro realizado com sucesso!');
      navigate('/technician');
    } catch (error) {
      toast.error(friendlyError(error, 'Erro ao realizar cadastro.'));
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
        ease: [0.16, 1, 0.3, 1] as const,
        staggerChildren: 0.08
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
    <div className="min-h-screen flex flex-col items-center justify-between bg-[#f9f9fd] dark:bg-[#111316] relative overflow-hidden px-4 py-8 transition-colors duration-200 canvas-grain">
      
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
        className="w-full flex flex-col items-center z-10 my-4"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        
        {/* Header Logo */}
        <motion.div className="flex flex-col items-center mb-6" variants={itemVariants}>
          <Magnetic strength={0.2} cursorText="Click">
            <motion.div 
              className="p-2.5 rounded-xl bg-[#006c49] text-white shadow-md mb-3 cursor-pointer"
              whileHover={{ scale: 1.1, rotate: -5 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.div>
          </Magnetic>
          <h1 className="text-3xl text-[#006c49] dark:text-[#4bdfa1] tracking-widest uppercase brand-text">
            Crie sua conta
          </h1>
          <p className="text-[10px] text-zinc-550 dark:text-zinc-400 text-center tracking-widest mt-1 editorial-tag">
            Faça seu auto-registro no FEED-TRACK
          </p>
        </motion.div>

        {/* Register Card (Centered Box) */}
        <Tilt3D maxRotation={6} scaleOnHover={1.01} className="max-w-[440px] w-full">
          <motion.div 
            className="w-full bg-white/70 dark:bg-[#1e2023]/75 backdrop-blur-xl border border-zinc-200/60 dark:border-zinc-800/40 rounded-2xl shadow-[0px_24px_64px_rgba(0,0,0,0.06)] dark:shadow-[0px_24px_64px_rgba(0,0,0,0.4)] p-8 text-left transition-all duration-300"
            variants={itemVariants}
          >
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <motion.div variants={itemVariants}>
              <label htmlFor="register-name" className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-350 uppercase tracking-wider mb-1">
                Nome Completo
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  id="register-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Ex: Ana Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#0bbb81] transition-all text-xs"
                  required
                />
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <label htmlFor="register-email" className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-350 uppercase tracking-wider mb-1">
                E-mail corporativo
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  placeholder="nome.sobrenome@liberty.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#0bbb81] transition-all text-xs"
                  required
                />
              </div>
            </motion.div>

            <motion.div className="grid grid-cols-2 gap-4" variants={itemVariants}>
              <div>
                <label htmlFor="register-team" className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-350 uppercase tracking-wider mb-1">
                  Time
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none z-10" />
                  <select
                    id="register-team"
                    value={team}
                    onChange={(e) => setTeam(e.target.value as 'back-office' | 'teleservice')}
                    className="w-full pl-10 pr-8 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#0bbb81] transition-all text-xs cursor-pointer appearance-none"
                  >
                    <option value="back-office">Back-office</option>
                    <option value="teleservice">Teleservice</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="register-position" className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-350 uppercase tracking-wider mb-1">
                  Cargo
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <input
                    id="register-position"
                    type="text"
                    autoComplete="organization-title"
                    placeholder="Ex: Agente N1"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#0bbb81] transition-all text-xs"
                    required
                  />
                </div>
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <label htmlFor="register-password" className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-350 uppercase tracking-wider mb-1">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  id="register-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Mínimo 10 caracteres, com letras e números"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#0bbb81] transition-all text-xs"
                  required
                />
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <label htmlFor="register-confirm-password" className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-350 uppercase tracking-wider mb-1">
                Confirmar Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  id="register-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repita sua senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#0bbb81] transition-all text-xs"
                  required
                />
              </div>
            </motion.div>

            <Magnetic strength={0.12} cursorText="Cadastrar" className="w-full block">
              <motion.button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 mt-2 bg-[#0bbb81] hover:bg-[#0bbb81]/90 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2 text-xs disabled:opacity-50 cursor-pointer shadow-md"
                variants={itemVariants}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Cadastrar'
                )}
              </motion.button>
            </Magnetic>
          </form>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200 dark:border-zinc-800"></div>
            </div>
          </div>

          {/* Back link */}
          <div className="text-center text-xs">
            <Link
              to="/"
              className="inline-flex items-center gap-1 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white transition-colors font-semibold"
            >
              <ArrowLeft className="w-3 h-3" /> Já possui conta? Faça login
            </Link>
          </div>

          </motion.div>
        </Tilt3D>
      </motion.div>

      {/* Footer info */}
      <div className="text-center z-10">
        <p className="text-[10px] text-zinc-500 dark:text-zinc-550 tracking-wide font-medium">
          © 2024 FEED-TRACK System. All rights reserved.
        </p>
      </div>

    </div>
  );
}
