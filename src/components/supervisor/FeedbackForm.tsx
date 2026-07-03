import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import type { User, Feedback } from '../../types';
import { FEEDBACK_AXES } from '../../types';
import { nowTimestamp } from '../../services/dateUtils';
import { feedbackService } from '../../services/feedbackService';
import { useAuth } from '../../hooks/useAuth';
import Avatar from '../shared/Avatar';
import toast from 'react-hot-toast';


interface FeedbackFormProps {
  technicians: User[];
  initialTechId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function FeedbackForm({ technicians, initialTechId, onClose, onSuccess }: FeedbackFormProps) {
  const { user: currentUser } = useAuth();
  const [techId, setTechId] = useState(initialTechId || '');
  const [type, setType] = useState<'positive' | 'development'>('positive');
  const [axis, setAxis] = useState(FEEDBACK_AXES[0]);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  // AI Assistant States
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiFramework, setAiFramework] = useState<'cnv' | 'sbi'>('cnv');
  const [cnvObservation, setCnvObservation] = useState('');
  const [cnvFeelingNeed, setCnvFeelingNeed] = useState('');
  const [cnvRequest, setCnvRequest] = useState('');
  const [sbiSituation, setSbiSituation] = useState('');
  const [sbiBehavior, setSbiBehavior] = useState('');
  const [sbiImpact, setSbiImpact] = useState('');

  const selectedTech = technicians.find(t => t.uid === techId);

  const handleGenerateAI = () => {
    if (!selectedTech) {
      toast.error('Selecione um colaborador primeiro.');
      return;
    }
    const name = selectedTech.name.split(' ')[0];
    let resultText = '';
    
    if (aiFramework === 'cnv') {
      if (!cnvObservation.trim() || !cnvFeelingNeed.trim() || !cnvRequest.trim()) {
        toast.error('Preencha todos os campos do assistente CNV.');
        return;
      }
      resultText = `Olá, ${name}!\n\nGostaria de compartilhar um feedback estruturado com base no nosso dia a dia:\n\n1. Observação: Quando analisei a situação em que ${cnvObservation.toLowerCase()},\n2. Sentimento & Necessidade: Percebi a importância de priorizarmos isso, pois nossa necessidade é ${cnvFeelingNeed.toLowerCase()}.\n3. Solicitação: Sendo assim, gostaria de te propor/solicitar que ${cnvRequest.toLowerCase()}.\n\nO que você acha dessa proposta? Vamos conversar sobre isso na nossa próxima 1:1.`;
    } else {
      if (!sbiSituation.trim() || !sbiBehavior.trim() || !sbiImpact.trim()) {
        toast.error('Preencha todos os campos do assistente SBI.');
        return;
      }
      resultText = `Olá, ${name}!\n\nTrago um feedback de alinhamento com base na metodologia SBI:\n\n• Situação: ${sbiSituation}\n• Comportamento: ${sbiBehavior}\n• Impacto: Como consequência direta, ${sbiImpact.toLowerCase()}\n\nEsse alinhamento é fundamental para o fortalecimento da nossa entrega no eixo de ${axis}. Parabéns por buscar o desenvolvimento constante!`;
    }
    setDescription(resultText);
    setShowAIAssistant(false);
    toast.success('Feedback estruturado e inserido na descrição!');
  };

  const sanitize = (str: string) =>
    str.replace(/[<>]/g, (c) => (c === '<' ? '&lt;' : '&gt;')).trim();

  const handleDiscard = () => {
    if (description.trim().length > 0) {
      const confirmed = window.confirm('Descartar este feedback? O texto digitado será perdido permanentemente.');
      if (!confirmed) return;
    }
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!techId) {
      toast.error('Selecione um técnico.');
      return;
    }
    if (!axis) {
      toast.error('Selecione uma categoria estratégica (eixo).');
      return;
    }
    const sanitized = sanitize(description);
    if (sanitized.length < 50) {
      toast.error('A descrição do feedback deve ter no mínimo 50 caracteres.');
      return;
    }
    if (sanitized.length > 3000) {
      toast.error('A descrição não pode ultrapassar 3000 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const feedbackId = 'fb_' + Date.now();
      const newFeedback: Feedback = {
        id: feedbackId,
        technicianId: techId,
        technicianName: selectedTech?.name || 'Técnico',
        supervisorId: currentUser?.uid || '',
        type,
        axis,
        description: sanitized,
        status: 'pending',
        createdAt: nowTimestamp() as any
      };

      await feedbackService.addFeedback(newFeedback);
      toast.success('Feedback enviado com sucesso!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar feedback.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
        className="will-change-transform-opacity relative w-full max-w-[620px] bg-white dark:bg-[#1e2023]/95 dark:backdrop-blur-xl border border-zinc-200 dark:border-zinc-800/80 rounded-lg shadow-2xl overflow-hidden max-h-[95vh] flex flex-col font-sans"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-form-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-8 py-5 border-b border-zinc-150 dark:border-zinc-800">
          <div>
            <h2 id="feedback-form-title" className="text-lg font-bold text-[#1a1c1f] dark:text-[#e2e2e6] tracking-tight">
              Registrar Novo Feedback 1:1
            </h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Documente o desenvolvimento e performance da sua equipe.
            </p>
          </div>
          <button
            onClick={handleDiscard}
            className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer transition-colors"
            aria-label="Fechar formulário"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5 overflow-y-auto flex-1 text-left custom-scrollbar" aria-label="Formulário de Feedback 1:1">
          
          {/* Select Colaborador */}
          <div>
            <label htmlFor="tech-select" className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
              Colaborador (Technician)
            </label>
            <div className="relative">
              <select
                id="tech-select"
                value={techId}
                onChange={(e) => setTechId(e.target.value)}
                className="w-full px-4 py-3 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-850 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#006c49] text-xs appearance-none cursor-pointer"
                required
              >
                <option value="">Selecione um membro da equipe</option>
                {technicians.map((tech) => (
                  <option key={tech.uid} value={tech.uid}>
                    {tech.name} ({tech.position})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-400">
                <svg className="fill-current h-4 w-4" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
            {selectedTech && (
              <div className="mt-2.5 flex items-center gap-2.5 px-3 py-2 bg-zinc-50 dark:bg-zinc-900/50 rounded border border-zinc-150 dark:border-zinc-800">
                <Avatar name={selectedTech.name} photoURL={selectedTech.photoURL} size="sm" />
                <div className="text-[11px]">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-200">{selectedTech.name}</p>
                  <p className="text-zinc-500 capitalize">{selectedTech.position} ({selectedTech.team})</p>
                </div>
              </div>
            )}
          </div>

          {/* Type Select */}
          <div>
            <span className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
              Tipo de Feedback
            </span>
            <div className="grid grid-cols-2 gap-4" role="radiogroup" aria-label="Opções de tipo de feedback">
              <label className={`flex items-center justify-center gap-2 p-3.5 rounded border cursor-pointer transition-all ${
                type === 'positive'
                  ? 'border-[#006c49] bg-[#006c49]/5 text-[#006c49] dark:text-[#4bdfa1] font-semibold text-xs'
                  : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 bg-zinc-50 dark:bg-zinc-900/40 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-xs'
              }`}>
                <input
                  type="radio"
                  name="type"
                  checked={type === 'positive'}
                  onChange={() => setType('positive')}
                  className="sr-only"
                />
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                </svg>
                <span>Positivo</span>
              </label>

              <label className={`flex items-center justify-center gap-2 p-3.5 rounded border cursor-pointer transition-all ${
                type === 'development'
                  ? 'border-[#006c49] bg-[#006c49]/5 text-[#006c49] dark:text-[#4bdfa1] font-semibold text-xs'
                  : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 bg-zinc-50 dark:bg-zinc-900/40 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-xs'
              }`}>
                <input
                  type="radio"
                  name="type"
                  checked={type === 'development'}
                  onChange={() => setType('development')}
                  className="sr-only"
                />
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M23 6l-9.5 9.5-5-5L1 18" />
                  <path d="M17 6h6v6" />
                </svg>
                <span>Desenvolvimento</span>
              </label>
            </div>
          </div>

          {/* Axis Dropdown */}
          <div>
            <label htmlFor="axis-select" className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
              Categoria
            </label>
            <div className="relative">
              <select
                id="axis-select"
                value={axis}
                onChange={(e) => setAxis(e.target.value)}
                className="w-full px-4 py-3 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-850 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#006c49] text-xs appearance-none cursor-pointer"
              >
                <option value="">Escolha uma categoria estratégica</option>
                {FEEDBACK_AXES.map((ax) => (
                  <option key={ax} value={ax}>
                    {ax}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-400">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
            </div>
          </div>

          {/* Description Textarea */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label htmlFor="description-textarea" className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Descrição Detalhada
              </label>
              <span className={`text-[10px] font-bold ${
                description.length > 3000 ? 'text-rose-600' :
                description.length >= 50 ? 'text-[#006c49] dark:text-[#4bdfa1]' : 'text-rose-600'
              }`}>
                {description.length} / 3000 (mín. 50)
              </span>
            </div>
            {/* AI Assistant Toggle & Panel */}
            <div className="mb-3">
              <button
                type="button"
                onClick={() => setShowAIAssistant(!showAIAssistant)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-violet-50 text-violet-750 dark:bg-violet-950/35 dark:text-violet-300 font-bold rounded-lg border border-violet-200 dark:border-violet-850 hover:bg-violet-100/80 transition-colors cursor-pointer"
              >
                🪄 {showAIAssistant ? 'Fechar Assistente de Redação IA' : 'Abrir Assistente de Redação IA (CNV / SBI)'}
              </button>

              {showAIAssistant && (
                <div className="mt-3 p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-200 dark:border-zinc-800">
                    <span className="font-bold text-xs text-zinc-850 dark:text-zinc-200">Estruturação de Feedback Assistido</span>
                    <div className="flex bg-zinc-150 dark:bg-zinc-850 rounded p-0.5 text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setAiFramework('cnv')}
                        className={`px-2.5 py-1 rounded cursor-pointer ${
                          aiFramework === 'cnv'
                            ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        CNV (Não-Violenta)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAiFramework('sbi')}
                        className={`px-2.5 py-1 rounded cursor-pointer ${
                          aiFramework === 'sbi'
                            ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        SBI (Situação-Impacto)
                      </button>
                    </div>
                  </div>

                  {aiFramework === 'cnv' ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-zinc-450 uppercase mb-1">
                          1. Observação Factual (Sem julgamentos)
                        </label>
                        <input
                          type="text"
                          value={cnvObservation}
                          onChange={(e) => setCnvObservation(e.target.value)}
                          placeholder="Ex: identificamos falhas na validação do login no app..."
                          className="w-full px-2.5 py-1.5 border border-zinc-200 dark:border-zinc-750 bg-white dark:bg-zinc-950 rounded text-xs text-zinc-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-zinc-450 uppercase mb-1">
                          2. Necessidade / Impacto no time
                        </label>
                        <input
                          type="text"
                          value={cnvFeelingNeed}
                          onChange={(e) => setCnvFeelingNeed(e.target.value)}
                          placeholder="Ex: garantir a segurança dos dados do usuário e evitar bugs em produção..."
                          className="w-full px-2.5 py-1.5 border border-zinc-200 dark:border-zinc-750 bg-white dark:bg-zinc-950 rounded text-xs text-zinc-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-zinc-450 uppercase mb-1">
                          3. Solicitação Clara e Concreta
                        </label>
                        <input
                          type="text"
                          value={cnvRequest}
                          onChange={(e) => setCnvRequest(e.target.value)}
                          placeholder="Ex: inclua testes automatizados de integração nas próximas PRs..."
                          className="w-full px-2.5 py-1.5 border border-zinc-200 dark:border-zinc-750 bg-white dark:bg-zinc-950 rounded text-xs text-zinc-900 dark:text-white"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-zinc-450 uppercase mb-1">
                          1. Situação (Contexto temporal e espacial)
                        </label>
                        <input
                          type="text"
                          value={sbiSituation}
                          onChange={(e) => setSbiSituation(e.target.value)}
                          placeholder="Ex: Na reunião de entrega da Sprint 12 ontem de manhã..."
                          className="w-full px-2.5 py-1.5 border border-zinc-200 dark:border-zinc-750 bg-white dark:bg-zinc-950 rounded text-xs text-zinc-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-zinc-450 uppercase mb-1">
                          2. Comportamento (Ação observável)
                        </label>
                        <input
                          type="text"
                          value={sbiBehavior}
                          onChange={(e) => setSbiBehavior(e.target.value)}
                          placeholder="Ex: você apresentou o fluxo de arquitetura de forma didática e respondeu pacientemente..."
                          className="w-full px-2.5 py-1.5 border border-zinc-200 dark:border-zinc-750 bg-white dark:bg-zinc-950 rounded text-xs text-zinc-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-zinc-450 uppercase mb-1">
                          3. Impacto (Consequência no time/cliente)
                        </label>
                        <input
                          type="text"
                          value={sbiImpact}
                          onChange={(e) => setSbiImpact(e.target.value)}
                          placeholder="Ex: aumentou o alinhamento da equipe de suporte e gerou grande confiança do cliente..."
                          className="w-full px-2.5 py-1.5 border border-zinc-200 dark:border-zinc-750 bg-white dark:bg-zinc-950 rounded text-xs text-zinc-900 dark:text-white"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={handleGenerateAI}
                      className="px-3.5 py-1.5 bg-violet-650 hover:bg-violet-700 text-white rounded text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      🪄 Gerar e Aplicar Texto
                    </button>
                  </div>
                </div>
              )}
            </div>

            <textarea
              id="description-textarea"
              placeholder="Descreva os pontos observados com precisão executiva ou utilize o Assistente de IA..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="w-full px-4 py-3.5 rounded border border-zinc-250 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-850 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#006c49] text-xs resize-none"
              required
            />
          </div>

          {/* Preview Card */}
          {description.length >= 50 && (
            <div className="p-4 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 relative">
              <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 mb-1">
                Visualização Prévia
              </div>
              <div className="space-y-2 text-zinc-700 dark:text-zinc-300 text-xs italic font-serif leading-relaxed">
                <p>Olá, {selectedTech?.name || '[Colaborador]'}!</p>
                <p className="whitespace-pre-line">"{description}"</p>
                <p className="text-[9px] font-sans text-zinc-500 not-italic mt-3 border-t border-zinc-150 dark:border-zinc-800 pt-2">
                  Eixo: {axis} | Supervisor: {currentUser?.name}
                </p>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-5 mt-6">
            <button
              type="button"
              onClick={handleDiscard}
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-200 cursor-pointer bg-transparent border-none py-2 px-1 transition-colors"
            >
              Descartar
            </button>
            <button
              type="submit"
              disabled={loading || !techId || !axis || description.length < 50 || description.length > 3000}
              className="px-6 py-2.5 text-xs font-bold bg-[#006c49] hover:bg-[#005236] text-white rounded shadow-md disabled:opacity-50 transition-opacity cursor-pointer flex items-center gap-1.5"
            >
              {loading ? (
                'Enviando...'
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 rotate-45 -mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  Enviar Feedback
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
