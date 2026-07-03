import { useEffect, useMemo } from 'react';
import { Award, Lock, Sparkles, Star, Milestone, MessageSquare, Flame, BookOpen } from 'lucide-react';
import type { User, Badge, Feedback } from '../../types';
import { userService } from '../../services/userService';
import { parseDate } from '../../services/dateUtils';
import { Timestamp } from 'firebase/firestore';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';

interface BadgesPanelProps {
  userProfile: User;
  feedbacks: Feedback[];
  hasAssessments: boolean;
  onRefresh: () => void;
}

export default function BadgesPanel({ userProfile, feedbacks, hasAssessments, onRefresh }: BadgesPanelProps) {
  
  const currentBadges = userProfile.badges || [];

  // Definition of all possible badges in the system
  const badgeDefinitions = useMemo(() => [
    {
      id: 'badge_first_read',
      title: 'Primeiro Feedback Lido',
      description: 'Leste a tua primeira carta de feedback no sistema.',
      icon: 'BookOpen',
      condition: () => feedbacks.some(f => f.status === 'read')
    },
    {
      id: 'badge_pdi_started',
      title: 'PDI Iniciado',
      description: 'Iniciaste o teu plano de desenvolvimento individual.',
      icon: 'Star',
      condition: () => (userProfile.structuredPDI || []).length > 0
    },
    {
      id: 'badge_pdi_completed',
      title: 'PDI Concluído',
      description: 'Concluíste com sucesso o teu primeiro objetivo PDI.',
      icon: 'Milestone',
      condition: () => (userProfile.structuredPDI || []).some(g => g.status === 'completed')
    },
    {
      id: 'badge_assessment_done',
      title: 'Autoavaliação Completa',
      description: 'Registaste a tua primeira autoavaliação trimestral.',
      icon: 'MessageSquare',
      condition: () => hasAssessments
    },
    {
      id: 'badge_30_days',
      title: '30 Dias Ativos',
      description: 'Pertences à equipa há mais de 30 dias.',
      icon: 'Flame',
      condition: () => {
        const createdDate = parseDate(userProfile.createdAt);
        const days = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
        return days >= 30 || userProfile.uid === 'tech1'; // Make it unlocked for default demo tech
      }
    }
  ], [feedbacks, userProfile, hasAssessments]);

  // Run auto scanner on render
  useEffect(() => {
    let cancelled = false;

    (async () => {
      let unlockedAny = false;

      // Sequential (not forEach+async): each addBadge is a read-modify-write
      // of userProfile.badges, so awaiting one before starting the next
      // avoids two concurrent writes silently clobbering each other.
      for (const b of badgeDefinitions) {
        const alreadyEarned = currentBadges.some(cb => cb.id === b.id);
        if (!alreadyEarned && b.condition()) {
          const newBadge: Badge = {
            id: b.id,
            title: b.title,
            description: b.description,
            icon: b.icon,
            earnedAt: Timestamp.now()
          };
          await userService.addBadge(userProfile.uid, newBadge);
          unlockedAny = true;

          toast(() => (
            <span className="flex items-center gap-2 font-semibold">
              <Sparkles className="w-5 h-5 text-amber-500 animate-bounce" />
              Nova Conquista Desbloqueada: {b.title}!
            </span>
          ), { duration: 4000 });
        }
      }

      if (cancelled) return;

      if (unlockedAny) {
        confetti({
          particleCount: 100,
          spread: 70,
          colors: ['#004B8D', '#00ABE7', '#2ECC71'], // Liberty Blue, Liberty Sky, Green
          origin: { y: 0.6 }
        });
        onRefresh();
      }
    })();

    return () => { cancelled = true; };
  }, [badgeDefinitions, currentBadges, userProfile.uid, onRefresh]);

  const iconMapper = (iconName: string) => {
    switch (iconName) {
      case 'BookOpen': return BookOpen;
      case 'Star': return Star;
      case 'Milestone': return Milestone;
      case 'MessageSquare': return MessageSquare;
      case 'Flame': return Flame;
      default: return Award;
    }
  };

  return (
    <div className="text-left bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-md">
      <div className="flex items-center gap-2 mb-6">
        <Award className="w-6 h-6 text-amber-500" />
        <h2 className="text-xl font-bold text-zinc-950 dark:text-zinc-50">
          Minhas Conquistas (Badges)
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
        {badgeDefinitions.map((b) => {
          const isUnlocked = currentBadges.some(cb => cb.id === b.id) || b.condition();
          const Icon = iconMapper(b.icon);

          return (
            <div
              key={b.id}
              className={`p-4 rounded-xl border flex flex-col items-center text-center transition-all ${
                isUnlocked
                  ? 'bg-gradient-to-b from-amber-50/50 to-white dark:from-zinc-850 dark:to-zinc-900 border-amber-250 dark:border-zinc-800 shadow-md scale-100'
                  : 'bg-zinc-50/30 dark:bg-zinc-950/20 border-zinc-200 dark:border-zinc-850 opacity-60'
              }`}
            >
              <div className={`p-3 rounded-full mb-3 shadow relative ${
                isUnlocked 
                  ? 'bg-gradient-to-tr from-amber-400 to-amber-500 text-white' 
                  : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600'
              }`}>
                <Icon className="w-6 h-6" />
                {!isUnlocked && (
                  <div className="absolute -bottom-1.5 -right-1.5 p-0.5 rounded-full bg-zinc-400 text-white border-2 border-white dark:border-zinc-900">
                    <Lock className="w-3 h-3" />
                  </div>
                )}
              </div>

              <h3 className={`text-xs font-bold ${isUnlocked ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-505 dark:text-zinc-500'}`}>
                {b.title}
              </h3>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 leading-normal">
                {b.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
