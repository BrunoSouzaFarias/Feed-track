import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'motion/react';
import { ClipboardList, Star, AlertCircle, Loader2 } from 'lucide-react';
import type { User, SelfAssessment as SelfAssessmentType } from '../../types';
import { newId } from '../../services/ids';
import { userService } from '../../services/userService';
import { Timestamp } from '../../firebase';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import { friendlyError } from '../../services/errors';

interface SelfAssessmentProps {
  userProfile: User;
  onSuccess: () => void;
  onClose: () => void;
}

export default function SelfAssessment({ userProfile, onSuccess, onClose }: SelfAssessmentProps) {
  
  // Calculate current period programmatically: ex "2026-Q2"
  const currentPeriod = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-11
    const quarter = Math.floor(month / 3) + 1;
    return `${year}-Q${quarter}`;
  }, []);

  const [comm, setComm] = useState(3);
  const [team, setTeam] = useState(3);
  const [tech, setTech] = useState(3);
  const [pro, setPro] = useState(3);
  const [att, setAtt] = useState(3);
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [checking, setChecking] = useState(true);

  const checkSubmission = useCallback(async () => {
    setChecking(true);
    try {
      const list = await userService.getSelfAssessments(userProfile.uid);
      const submitted = list.some(a => a.period === currentPeriod);
      setAlreadySubmitted(submitted);
    } catch (err) {
      console.error(err);
    } finally {
      setChecking(false);
    }
  }, [userProfile.uid, currentPeriod]);

  useEffect(() => {
    void checkSubmission();
  }, [checkSubmission]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (alreadySubmitted) {
      toast.error('Você já preencheu a autoavaliação deste trimestre.');
      return;
    }

    setLoading(true);
    try {
      const assessment: SelfAssessmentType = {
        id: newId('sa'),
        technicianId: userProfile.uid,
        period: currentPeriod,
        scores: {
          communication: comm,
          teamwork: team,
          technical: tech,
          proactivity: pro,
          attendance: att
        },
        comments,
        createdAt: Timestamp.now()
      };

      await userService.submitSelfAssessment(assessment);
      
      // Fire confetti celebration
      confetti({
        particleCount: 120,
        spread: 80,
        colors: ['#2ECC71', '#00ABE7', '#004B8D', '#FFD700'],
        origin: { y: 0.65 }
      });

      toast.success('Autoavaliação enviada com sucesso! Continue brilhando! 🚀');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(friendlyError(err, 'Erro ao enviar autoavaliação.'));
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="p-10 flex justify-center items-center">
        <Loader2 className="w-8 h-8 text-liberty animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col text-left"
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-3 mb-4 shrink-0">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
            <ClipboardList className="w-5 h-5 text-liberty" /> Autoavaliação Individual
          </h3>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-liberty/10 text-liberty dark:text-liberty-sky">
            Período: {currentPeriod}
          </span>
        </div>

        {alreadySubmitted ? (
          <div className="flex-1 flex flex-col items-center justify-center py-10 text-center space-y-4">
            <div className="p-3 rounded-full bg-amber-500/10 text-amber-500">
              <AlertCircle className="w-10 h-10" />
            </div>
            <div>
              <h4 className="font-bold text-zinc-800 dark:text-zinc-200">Período Já Respondido</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 px-6">
                Você já realizou a sua autoavaliação para o trimestre atual ({currentPeriod}). Obrigado por manter seus indicadores atualizados!
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-350 hover:bg-zinc-200 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Fechar Janela
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-5 pr-1 py-1">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Avalie o seu desempenho de 1 (precisa melhorar bastante) a 5 (supera expectativas) em cada dimensão abaixo.
            </p>

            {/* Communication */}
            <div>
              <div className="flex justify-between items-center mb-1 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                <span>Comunicação (Clareza e empatia)</span>
                <span className="text-liberty dark:text-liberty-sky flex items-center gap-0.5">{comm} <Star className="w-3 h-3 fill-current" /></span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={comm}
                onChange={(e) => setComm(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-850 rounded-lg appearance-none cursor-pointer accent-liberty"
              />
            </div>

            {/* Teamwork */}
            <div>
              <div className="flex justify-between items-center mb-1 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                <span>Trabalho em Equipe (Colaboração direta)</span>
                <span className="text-liberty dark:text-liberty-sky flex items-center gap-0.5">{team} <Star className="w-3 h-3 fill-current" /></span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={team}
                onChange={(e) => setTeam(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-850 rounded-lg appearance-none cursor-pointer accent-liberty"
              />
            </div>

            {/* Technical */}
            <div>
              <div className="flex justify-between items-center mb-1 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                <span>Conhecimento Técnico (Sistemas e processos)</span>
                <span className="text-liberty dark:text-liberty-sky flex items-center gap-0.5">{tech} <Star className="w-3 h-3 fill-current" /></span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={tech}
                onChange={(e) => setTech(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-850 rounded-lg appearance-none cursor-pointer accent-liberty"
              />
            </div>

            {/* Proactivity */}
            <div>
              <div className="flex justify-between items-center mb-1 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                <span>Proatividade (Iniciativa em problemas)</span>
                <span className="text-liberty dark:text-liberty-sky flex items-center gap-0.5">{pro} <Star className="w-3 h-3 fill-current" /></span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={pro}
                onChange={(e) => setPro(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-850 rounded-lg appearance-none cursor-pointer accent-liberty"
              />
            </div>

            {/* Attendance */}
            <div>
              <div className="flex justify-between items-center mb-1 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                <span>Assiduidade e Comprometimento (Horários e prazos)</span>
                <span className="text-liberty dark:text-liberty-sky flex items-center gap-0.5">{att} <Star className="w-3 h-3 fill-current" /></span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={att}
                onChange={(e) => setAtt(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-850 rounded-lg appearance-none cursor-pointer accent-liberty"
              />
            </div>

            {/* Free text comments */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Como você se sente em relação ao seu trabalho hoje?
              </label>
              <textarea
                placeholder="Descreva de forma aberta seus sentimentos, conquistas ou dificuldades recentes..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm text-zinc-950 dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-650 resize-none focus:outline-none focus:ring-2 focus:ring-liberty"
                required
              />
            </div>

            {/* Form footer actions */}
            <div className="flex justify-end gap-3 border-t border-zinc-200 dark:border-zinc-800 pt-4 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-zinc-750 dark:text-zinc-350 hover:bg-zinc-100 dark:hover:bg-zinc-805 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !comments.trim()}
                className="px-5 py-2 text-xs font-semibold bg-gradient-to-r from-liberty to-liberty-sky text-white rounded-xl shadow-md cursor-pointer hover:opacity-95 disabled:opacity-50 transition-opacity"
              >
                {loading ? 'Enviando...' : 'Enviar Respostas'}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}
