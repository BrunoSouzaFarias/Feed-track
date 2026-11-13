import { useState, useEffect, useCallback } from 'react';
import type { Feedback } from '../types';
import { feedbackService } from '../services/feedbackService';
import { parseDate } from '../services/dateUtils';
import { friendlyError } from '../services/errors';

interface Loaded {
  key: string;
  feedbacks: Feedback[];
  error: string | null;
}

export function useFeedbacks(technicianId?: string) {
  const [refreshCount, setRefreshCount] = useState(0);
  const [loaded, setLoaded] = useState<Loaded>({ key: '', feedbacks: [], error: null });
  const key = `${technicianId ?? '*'}#${refreshCount}`;

  useEffect(() => {
    let cancelled = false;
    feedbackService.getFeedbacks(technicianId).then(
      (data) => {
        const sorted = [...data].sort((a, b) => parseDate(b.createdAt).getTime() - parseDate(a.createdAt).getTime());
        if (!cancelled) setLoaded({ key, feedbacks: sorted, error: null });
      },
      (err) => {
        console.error('Error loading feedbacks:', err);
        if (!cancelled) setLoaded({ key, feedbacks: [], error: friendlyError(err, 'Erro ao carregar feedbacks.') });
      }
    );
    return () => { cancelled = true; };
  }, [key, technicianId]);

  const refreshFeedbacks = useCallback(() => setRefreshCount((n) => n + 1), []);
  const done = loaded.key === key;
  return {
    feedbacks: loaded.feedbacks, // mantém os dados anteriores durante um refresh (sem piscar vazio)
    loading: !done,
    error: done ? loaded.error : null,
    refreshFeedbacks,
  };
}
